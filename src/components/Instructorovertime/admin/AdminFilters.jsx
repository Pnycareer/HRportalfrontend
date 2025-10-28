// src/components/overtime/AdminFilters.jsx  ✅ REPLACE file with this
import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function AdminFilters({
  filters,                // { month: "YYYY-MM", instructorId: "" }
  instructorOptions,      // [{ value, label }]
  loading,
  onChange,               // (field) => (e) => void
  onApply,                // () => void|Promise
  onReset,                // () => void|Promise
  onRefresh,              // () => void|Promise
}) {
  const canApply = Boolean(filters?.instructorId && filters?.month);

  return (
    <section className="space-y-4 rounded-xl border p-4 md:p-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="filter-instructor">Employee</Label>
          <select
            id="filter-instructor"
            value={filters.instructorId}
            onChange={onChange("instructorId")}
            className="h-10 w-[260px] rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select employee</option>
            {instructorOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-month">Month</Label>
          <input
            id="filter-month"
            type="month"
            value={filters.month || ""}
            onChange={onChange("month")}
            className="h-10 w-[200px] rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>

        <div className="flex items-center gap-3 pb-1">
          <Button type="button" onClick={onApply} disabled={!canApply || loading}>
            Apply
          </Button>
          <Button type="button" variant="outline" onClick={onReset} disabled={loading}>
            Reset
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-3 pb-1">
          <Button type="button" variant="ghost" onClick={onRefresh} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>
    </section>
  );
}
