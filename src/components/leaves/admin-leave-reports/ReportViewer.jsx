import React from "react";
import { MonthlyLeaveReport, YearlyLeaveReport } from "@/components/leaves/LeaveReportSheets";

// forward the ref so html2canvas grabs the exact root
const ReportViewer = React.forwardRef(function ReportViewer(
  { activeTab, monthly, yearly },
  ref
) {
  return (
    <div className="rounded-xl border bg-card p-4">
      {activeTab === "monthly" ? (
        <MonthlyLeaveReport data={monthly} ref={ref} />
      ) : (
        <YearlyLeaveReport data={yearly} ref={ref} />
      )}
    </div>
  );
});

export default React.memo(ReportViewer);
