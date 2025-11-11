import React from "react";
import SalarySheetForm from "@/components/salarysheet/SalarySheetForm";

export default function SalarySheetPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="mb-3 text-2xl font-bold tracking-tight">Create Salary Sheet</h1>
        <p className="text-sm text-muted-foreground">
          Auto-snapshots core user fields on the backend. Just provide the{" "}
          <b>userId</b>, period, and amounts.
        </p>
      </div>
      <SalarySheetForm onCreated={() => {}} />
    </div>
  );
}
