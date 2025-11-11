import React from "react";
import SalarySheetViewer from "@/components/salarysheet/SalarySheetViewer";

export default function SalarySheetViewerPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="mb-3 text-2xl font-bold tracking-tight">Salary Viewer</h1>
        <p className="text-sm text-muted-foreground">
          Pick any employee and month to review or update their salary sheet with a modern paper-style view.
        </p>
      </div>
      <SalarySheetViewer />
    </div>
  );
}
