import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useEmployees from "@/hooks/useEmployees";
import { useLeaveReports } from "@/hooks/useLeaveReports";
import { MonthlyLeaveReport, YearlyLeaveReport } from "@/components/leaves/LeaveReportSheets";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function AdminLeaveReports() {
  const {
    filtered: employees,
    loading: loadingEmployees,
    branch,
    setBranch,
    branches,
    dept,
    setDept,
    departments,
    q,
    setQ,
  } = useEmployees();
  const {
    monthly,
    yearly,
    loading,
    savingAllowance,
    fetchMonthly,
    fetchYearly,
    updateAllowance,
    setMonthly,
    setYearly,
  } = useLeaveReports();

  const now = React.useMemo(() => new Date(), []);
  const [year, setYear] = React.useState(String(now.getUTCFullYear()));
  const [month, setMonth] = React.useState(String(now.getUTCMonth() + 1));
  const [activeTab, setActiveTab] = React.useState("monthly");
  const [selectedUserId, setSelectedUserId] = React.useState(null);
  const reportRef = React.useRef(null);
  const [allowanceDraft, setAllowanceDraft] = React.useState({
    allowed: "",
    remaining: "",
  });
  const [allowanceDirty, setAllowanceDirty] = React.useState(false);

  React.useEffect(() => {
    if (!loadingEmployees && employees.length > 0 && !selectedUserId) {
      setSelectedUserId(employees[0]?._id || null);
    }
  }, [employees, loadingEmployees, selectedUserId]);

  const loadReports = React.useCallback(async () => {
    if (!selectedUserId) return;
    const payload = { userId: selectedUserId, year, month };
    await Promise.all([
      fetchMonthly(payload),
      fetchYearly({ userId: selectedUserId, year }),
    ]);
  }, [fetchMonthly, fetchYearly, month, selectedUserId, year]);

  React.useEffect(() => {
    loadReports().catch(() => {});
  }, [loadReports]);

  React.useEffect(() => {
    if (monthly?.allowance) {
      setAllowanceDraft({
        allowed:
          monthly.allowance.allowed !== undefined
            ? String(monthly.allowance.allowed)
            : "",
        remaining:
          monthly.allowance.remaining !== undefined
            ? String(monthly.allowance.remaining)
            : "",
      });
      setAllowanceDirty(false);
    } else {
      setAllowanceDraft({ allowed: "", remaining: "" });
      setAllowanceDirty(false);
    }
  }, [monthly?.allowance?.allowed, monthly?.allowance?.remaining]);

  const handleDownload = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imageData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imageData, "PNG", 0, 0, width, height);
    pdf.save(
      `${selectedUserId || "employee"}-${
        activeTab === "monthly" ? `${month}-${year}` : year
      }-leave-report.pdf`
    );
  };

  const handleAllowanceChange = (field) => (event) => {
    const value = event.target.value;
    setAllowanceDraft((prev) => ({ ...prev, [field]: value }));
    setAllowanceDirty(true);
  };

  const handleResetAllowance = () => {
    if (monthly?.allowance) {
      setAllowanceDraft({
        allowed:
          monthly.allowance.allowed !== undefined
            ? String(monthly.allowance.allowed)
            : "",
        remaining:
          monthly.allowance.remaining !== undefined
            ? String(monthly.allowance.remaining)
            : "",
      });
    } else {
      setAllowanceDraft({ allowed: "", remaining: "" });
    }
    setAllowanceDirty(false);
  };

  const handleSaveAllowance = async () => {
    if (!selectedUserId) return;
    const allowedValue = Number(allowanceDraft.allowed);
    const remainingValue = Number(allowanceDraft.remaining);
    if (!Number.isFinite(allowedValue) || allowedValue < 0) {
      toast.error("Annual allowance must be a non-negative number");
      return;
    }
    if (!Number.isFinite(remainingValue) || remainingValue < 0) {
      toast.error("Remaining balance must be a non-negative number");
      return;
    }
    if (remainingValue > allowedValue) {
      toast.error("Remaining balance cannot exceed annual allowance");
      return;
    }
    const usageCandidates = [
      monthly?.allowance?.actualUsed,
      yearly?.totals?.approved,
      monthly?.allowance?.used,
    ].filter((value) => Number.isFinite(value));
    const actualUsage = usageCandidates.length
      ? Math.max(...usageCandidates)
      : 0;
    const maxRemaining = Math.max(allowedValue - actualUsage, 0);
    const epsilon = 0.0001;
    if (remainingValue - maxRemaining > epsilon) {
      const formatDays = (value) =>
        Number.isInteger(value) ? String(value) : value.toFixed(2);
      const approvedText =
        actualUsage === 1
          ? "1 day has already been approved this year"
          : `${formatDays(actualUsage)} days have already been approved this year`;
      toast.error(
        `Remaining balance cannot exceed ${formatDays(maxRemaining)} day(s) because ${approvedText}.`
      );
      return;
    }
    try {
      const updated = await updateAllowance({
        userId: selectedUserId,
        year: parseInt(year, 10),
        allowed: allowedValue,
        remaining: remainingValue,
      });

      setMonthly((prev) => {
        if (!prev) return prev;
        const allowance = {
          allowed: updated.allowed,
          remaining: updated.remaining,
          used: updated.used,
        };
        if (Number.isFinite(updated.actualUsed)) {
          allowance.actualUsed = updated.actualUsed;
        }
        if (Number.isFinite(updated.maxRemaining)) {
          allowance.maxRemaining = updated.maxRemaining;
        }
        const totals = prev.totals
          ? { ...prev.totals, remaining: updated.remaining }
          : prev.totals;
        if (totals && Number.isFinite(updated.actualUsed)) {
          totals.approved = Number.isFinite(totals.approved)
            ? Math.max(totals.approved, updated.actualUsed)
            : updated.actualUsed;
        }
        return {
          ...prev,
          allowance: prev.allowance ? { ...prev.allowance, ...allowance } : allowance,
          totals,
        };
      });

      setYearly((prev) => {
        if (!prev) return prev;
        if (String(prev.user?.id) !== String(selectedUserId)) return prev;
        if (parseInt(prev.year, 10) !== parseInt(year, 10)) return prev;
        return {
          ...prev,
          totals: {
            ...prev.totals,
            allowed: updated.allowed,
            remaining: updated.remaining,
            approved: Number.isFinite(updated.actualUsed)
              ? Math.max(prev.totals?.approved ?? 0, updated.actualUsed)
              : prev.totals?.approved,
          },
        };
      });

      setAllowanceDraft({
        allowed: String(updated.allowed),
        remaining: String(updated.remaining),
      });
      setAllowanceDirty(false);
    } catch {
      // errors handled in hook toast
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Employee Leave Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate monthly or yearly leave summaries for any team member.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48">
            <LabelInput id="branch" label="Branch">
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger id="branch">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === "all" ? "All branches" : item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabelInput>
          </div>
          <div className="w-48">
            <LabelInput id="dept" label="Department">
              <Select value={dept} onValueChange={setDept}>
                <SelectTrigger id="dept">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === "all" ? "All departments" : item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabelInput>
          </div>
          <div className="w-56">
            <LabelInput id="search" label="Search">
              <Input
                id="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Name, email, ID..."
              />
            </LabelInput>
          </div>
          <div className="w-64">
            <LabelInput id="employee" label="Employee">
              <Select
                value={selectedUserId || undefined}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabelInput>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-32">
          <LabelInput id="year" label="Year">
            <Input
              id="year"
              type="number"
              min="2000"
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </LabelInput>
        </div>
        <div className="w-40">
          <LabelInput id="month" label="Month">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger id="month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LabelInput>
        </div>
        <Button onClick={loadReports} disabled={loading || loadingEmployees}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "monthly" ? "default" : "outline"}
            onClick={() => setActiveTab("monthly")}
          >
            Monthly report
          </Button>
          <Button
            variant={activeTab === "yearly" ? "default" : "outline"}
            onClick={() => setActiveTab("yearly")}
          >
            Yearly summary
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={loading || (!monthly && !yearly)}
          >
            Download PDF
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">Allowance override</h2>
          <p className="text-sm text-muted-foreground">
            Update annual allowance and remaining balance for the selected employee.
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <LabelInput id="annual-allowance" label="Annual allowance">
            <Input
              id="annual-allowance"
              type="number"
              min="0"
              value={allowanceDraft.allowed}
              onChange={handleAllowanceChange("allowed")}
              disabled={savingAllowance || !selectedUserId}
            />
          </LabelInput>
          <LabelInput id="remaining-balance" label="Remaining balance">
            <Input
              id="remaining-balance"
              type="number"
              min="0"
              value={allowanceDraft.remaining}
              onChange={handleAllowanceChange("remaining")}
              disabled={savingAllowance || !selectedUserId}
            />
          </LabelInput>
          <LabelInput id="approved-days" label="Approved days (auto)">
            <Input
              id="approved-days"
              readOnly
              value={
                allowanceDraft.allowed && allowanceDraft.remaining
                  ? Math.max(
                      Number(allowanceDraft.allowed || 0) -
                        Number(allowanceDraft.remaining || 0),
                      0
                    )
                  : monthly?.allowance?.used ?? ""
              }
            />
          </LabelInput>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleSaveAllowance}
            disabled={
              savingAllowance ||
              !selectedUserId ||
              !allowanceDirty ||
              allowanceDraft.allowed === "" ||
              allowanceDraft.remaining === ""
            }
          >
            {savingAllowance ? "Saving..." : "Save allowance"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleResetAllowance}
            disabled={savingAllowance || !allowanceDirty}
          >
            Reset
          </Button>
        </div>
      </div>

  <div className="rounded-xl border bg-card p-4">
        {activeTab === "monthly" ? (
          <MonthlyLeaveReport data={monthly} ref={reportRef} />
        ) : (
          <YearlyLeaveReport data={yearly} ref={reportRef} />
        )}
      </div>
    </div>
  );
}

function LabelInput({ id, label, children }) {
  return (
    <div className="space-y-1 text-sm">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
