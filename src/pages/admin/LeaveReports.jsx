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
  const { monthly, yearly, loading, fetchMonthly, fetchYearly } = useLeaveReports();

  const now = React.useMemo(() => new Date(), []);
  const [year, setYear] = React.useState(String(now.getUTCFullYear()));
  const [month, setMonth] = React.useState(String(now.getUTCMonth() + 1));
  const [activeTab, setActiveTab] = React.useState("monthly");
  const [selectedUserId, setSelectedUserId] = React.useState(null);
  const reportRef = React.useRef(null);

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

