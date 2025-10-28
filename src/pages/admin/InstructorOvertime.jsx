// src/pages/AdminInstructorOvertime.jsx
import React from "react";
import { useInstructorOvertime } from "@/hooks/useInstructorOvertime";
import AdminFilters from "@/components/Instructorovertime/admin/AdminFilters";
import PayoutSummary from "@/components/Instructorovertime/admin/PayoutSummary";
import ClaimsAdminTable from "@/components/Instructorovertime/admin/ClaimsAdminTable";
import { calcOvertimePayout } from "@/utils/overtime";

export default function AdminInstructorOvertime() {
  const {
    claims,
    loading,
    saving,
    fetchClaims,
    updateClaim,
    fetchMonthlyReport, // ✅ new method
  } = useInstructorOvertime();

  // filters: month (YYYY-MM) + instructor
  const [filters, setFilters] = React.useState({ month: "", instructorId: "" });

  // optional: initial fetch; you can remove if you prefer a blank screen before Apply
  React.useEffect(() => {
    fetchClaims().catch(() => {});
  }, [fetchClaims]);

  // instructor dropdown options
  const instructorOptions = React.useMemo(() => {
    const map = new Map();
    for (const c of claims || []) {
      const id =
        c.instructorId ||
        c.instructor?._id ||
        c.instructorIdStr ||
        c.instructor?.id;
      const name = c.instructorName || c.instructor?.fullName || "Unknown";
      if (id && !map.has(id)) map.set(id, name);
    }
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [claims]);

  const handleFilterChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const applyFilters = async () => {
    const { instructorId, month } = filters;
    if (!instructorId || !month) return;

    // month is "YYYY-MM" → parse to year & 1-based month
    const [yyyy, mm] = month.split("-");
    const year = Number(yyyy);
    const monthNum = Number(mm); // already 1-12

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(monthNum) ||
      monthNum < 1 ||
      monthNum > 12
    )
      return;

    try {
      await fetchMonthlyReport({ year, month: monthNum, instructorId });
    } catch {}
  };

  const resetFilters = async () => {
    setFilters({ month: "", instructorId: "" });
    // optional: clear table or show all again
    // await fetchClaims({});  // <- uncomment if you want "all claims" after reset
  };

  const totalPayoutForSelection = React.useMemo(() => {
    return claims.reduce((sum, c) => {
      const p = calcOvertimePayout(c);
      return sum + (Number.isFinite(p) ? p : 0);
    }, 0);
  }, [claims]);

  const setVerified = async (id, next) => {
    try {
      await updateClaim(id, { verified: !!next });
    } catch {}
  };

  const canShowSummary = Boolean(filters.instructorId && filters.month);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">
          Instructor Overtime Claims
        </h1>
        <p className="text-sm text-muted-foreground">
          Review, verify, and see payouts.
        </p>
      </header>

      <AdminFilters
        filters={filters}
        instructorOptions={instructorOptions}
        loading={loading}
        onChange={handleFilterChange}
        onApply={applyFilters}
        onReset={resetFilters}
        onRefresh={() => fetchClaims()}
      />

      <PayoutSummary show={canShowSummary} total={totalPayoutForSelection} />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Submitted claims</h2>
          {loading && (
            <span className="text-sm text-muted-foreground">Loading…</span>
          )}
        </div>

        <ClaimsAdminTable
          claims={claims}
          loading={loading}
          saving={saving}
          onToggleVerified={setVerified}
        />
      </section>
    </div>
  );
}
