import React from "react";
import { Button } from "@/components/ui/button";
import useEmployees from "@/hooks/useEmployees";
import { useLeaveReports } from "@/hooks/useLeaveReports";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

import ReportFilters from "@/components/leaves/admin-leave-reports/ReportFilters";
import PeriodBar from "@/components/leaves/admin-leave-reports/PeriodBar";
import AllowanceOverride from "@/components/leaves/admin-leave-reports/AllowanceOverride";
import ReportViewer from "@/components/leaves/admin-leave-reports/ReportViewer";
import { months } from "@/components/constants/leavereport";

export default function AdminLeaveReports() {
  // ——— data hooks ———
  const {
    filtered: employees,
    loading: loadingEmployees,
    branch, setBranch, branches,
    dept, setDept, departments,
    q, setQ,
  } = useEmployees();

  const {
    monthly, yearly, loading,
    savingAllowance, fetchMonthly, fetchYearly,
    updateAllowance, setMonthly, setYearly,
  } = useLeaveReports();

  // ——— local state ———
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

  // auto-select first employee
  React.useEffect(() => {
    if (!loadingEmployees && employees.length > 0 && !selectedUserId) {
      setSelectedUserId(employees[0]?._id || null);
    }
  }, [employees, loadingEmployees, selectedUserId]);

  // fetch data
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

  // keep allowance draft in sync
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

  // download as PDF
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

    const monthLabel = (months.find((m) => m.value === String(month)) || {}).label || month;
    pdf.save(
      `${selectedUserId || "employee"}-${
        activeTab === "monthly" ? `${monthLabel}-${year}` : year
      }-leave-report.pdf`
    );
  };

  // save allowance (same logic you had, unchanged)
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
    ].filter((v) => Number.isFinite(v));
    const actualUsage = usageCandidates.length ? Math.max(...usageCandidates) : 0;
    const maxRemaining = Math.max(allowedValue - actualUsage, 0);
    const epsilon = 0.0001;
    if (remainingValue - maxRemaining > epsilon) {
      const formatDays = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2));
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
      // hook handles toasts
    }
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Employee Leave Reports</h1>
          <p className="text-sm text-muted-foreground">
            Generate monthly or yearly leave summaries for any team member.
          </p>
        </div>

        <ReportFilters
          branch={branch} setBranch={setBranch} branches={branches}
          dept={dept} setDept={setDept} departments={departments}
          q={q} setQ={setQ}
          employees={employees}
          selectedUserId={selectedUserId}
          setSelectedUserId={setSelectedUserId}
        />
      </header>

      <PeriodBar
        year={year} setYear={setYear}
        month={month} setMonth={setMonth}
        activeTab={activeTab} setActiveTab={setActiveTab}
        loading={loading} loadingEmployees={loadingEmployees}
        onRefresh={loadReports}
        onDownload={handleDownload}
        monthly={monthly} yearly={yearly}
      />

      <AllowanceOverride
        monthly={monthly}
        yearly={yearly}
        allowanceDraft={allowanceDraft}
        setAllowanceDraft={setAllowanceDraft}
        allowanceDirty={allowanceDirty}
        setAllowanceDirty={setAllowanceDirty}
        savingAllowance={savingAllowance}
        selectedUserId={selectedUserId}
        onSave={handleSaveAllowance}
        onReset={handleResetAllowance}
      />

      <ReportViewer
        ref={reportRef}
        activeTab={activeTab}
        monthly={monthly}
        yearly={yearly}
      />
    </div>
  );
}
