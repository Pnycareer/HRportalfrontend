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
    fetchMonthlyReport,
  } = useInstructorOvertime();

  // filters: month (YYYY-MM) + instructor
  const [filters, setFilters] = React.useState({ month: "", instructorId: "" });

  // keep a stable, "all employees" list that DOESN'T get nuked by filtering
  const [instructorOptions, setInstructorOptions] = React.useState([]);

  // -------- utils --------
  const buildInstructorOptions = React.useCallback((rows = []) => {
    const map = new Map();
    for (const c of rows) {
      const id =
        c.instructorId ||
        c.instructor?._id ||
        c.instructorIdStr ||
        c.instructor?.id;
      const name = c.instructorName || c.instructor?.fullName || "Unknown";
      if (id && !map.has(id)) map.set(id, name);
    }
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, []);

  const loadAllClaims = React.useCallback(async () => {
    const data = await fetchClaims({});
    // only update dropdown from the UNFILTERED payload
    setInstructorOptions(buildInstructorOptions(Array.isArray(data) ? data : []));
  }, [fetchClaims, buildInstructorOptions]);

  // initial fetch for table + dropdown
  React.useEffect(() => {
    loadAllClaims().catch(() => {});
  }, [loadAllClaims]);

  const parseMonth = React.useCallback((monthStr) => {
    if (!monthStr) return null;
    const [yyyy, mm] = monthStr.split("-");
    const year = Number(yyyy);
    const monthNum = Number(mm);
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(monthNum) ||
      monthNum < 1 ||
      monthNum > 12
    ) {
      return null;
    }
    return { year, month: monthNum };
  }, []);

  const applyFilters = React.useCallback(async () => {
    const { instructorId, month } = filters;
    if (!instructorId || !month) return;
    const parsed = parseMonth(month);
    if (!parsed) return;
    try {
      await fetchMonthlyReport({ ...parsed, instructorId });
    } catch {}
  }, [filters, parseMonth, fetchMonthlyReport]);

  const handleFilterChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      // auto-apply when both fields are present
      const hasInstructor = !!next.instructorId;
      const hasMonth = !!next.month;
      if ((field === "instructorId" || field === "month") && hasInstructor && hasMonth) {
        // fire-and-forget; UI already shows spinners via `loading`
        applyFilters();
      }
      return next;
    });
  };

  const resetFilters = async () => {
    setFilters({ month: "", instructorId: "" });
    // if you want table to show all claims again on reset, uncomment:
    // await loadAllClaims();
  };

  const totalPayoutForSelection = React.useMemo(() => {
    return claims.reduce((sum, c) => {
      const p = calcOvertimePayout(c);
      return sum + (Number.isFinite(p) ? p : 0);
    }, 0);
  }, [claims]);

  // IMPORTANT: don't let hook auto-refresh to "all". We control refresh here.
  const setVerified = async (id, next) => {
    try {
      await updateClaim(id, { verified: !!next });
      // re-run the *same* view user is on
      if (filters.instructorId && filters.month) {
        await applyFilters();
      } else {
        const data = await fetchClaims({});
        setInstructorOptions(buildInstructorOptions(Array.isArray(data) ? data : []));
      }
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
        onApply={applyFilters}     // still there, but now optional
        onReset={resetFilters}
        onRefresh={loadAllClaims}  // makes sure dropdown stays full
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
