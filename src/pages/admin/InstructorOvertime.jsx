import React from "react";
import { useInstructorOvertime } from "@/hooks/useInstructorOvertime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------- helpers -----------------------------------------------------------
function minutesToHuman(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 min";
  return `${minutes} min`;
}

function formatDateLabel(value) {
  if (!value) return "--";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "--";
  return dt.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeRange(slot) {
  if (!slot?.from || !slot?.to) return "--";
  const from = new Date(slot.from);
  const to = new Date(slot.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "--";
  const formatter = new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${formatter.format(from)} -> ${formatter.format(to)} (${minutesToHuman(
    Number(slot.durationMinutes)
  )})`;
}

function getDaysInMonthFromDate(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = d.getMonth();
  return new Date(y, m + 1, 0).getDate();
}

function numberOrNull(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

function formatRs(amount) {
  if (!Number.isFinite(amount)) return "--";
  return `Rs ${new Intl.NumberFormat().format(Math.round(amount))}`;
}

// per-minute-rate = (monthlySalary / daysInMonth) / 9 / 60
function calcOvertimePayout(claim) {
  if (!claim) return null;
  const monthlyFromClaim = numberOrNull(claim?.salary);
  const monthlyFromProfile = numberOrNull(claim?.instructor?.salary);
  const monthly = monthlyFromClaim ?? monthlyFromProfile;
  const minutes = numberOrNull(claim?.totalDurationMinutes);
  const days = getDaysInMonthFromDate(claim?.date);
  if (
    monthly === null ||
    minutes === null ||
    !Number.isFinite(days) ||
    days <= 0
  ) {
    return null;
  }
  const perMinute = monthly / days / 9 / 60;
  return perMinute * minutes;
}
// -----------------------------------------------------------------------------

export default function AdminInstructorOvertime() {
  const { claims, loading, saving, fetchClaims, updateClaim } =
    useInstructorOvertime();

  // filters: date + instructor
  const [filters, setFilters] = React.useState({ date: "", instructorId: "" });

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
    try {
      await fetchClaims({
        date: filters.date || undefined,
        instructorId: filters.instructorId || undefined,
      });
    } catch {}
  };

  const resetFilters = async () => {
    setFilters({ date: "", instructorId: "" });
    try {
      await fetchClaims({});
    } catch {}
  };

  // Sum of payouts for visible table (used when instructor selected)
  const totalPayoutForSelection = React.useMemo(() => {
    return claims.reduce((sum, c) => {
      const p = calcOvertimePayout(c);
      return sum + (Number.isFinite(p) ? p : 0);
    }, 0);
  }, [claims]);

  const verifyRow = async (claim) => {
    // server enforces admin-only; UI just calls patch
    try {
      await updateClaim(claim._id, { verified: true });
    } catch {}
  };

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

      <section className="space-y-4 rounded-xl border p-4 md:p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="filter-date">Filter by date</Label>
            <Input
              id="filter-date"
              type="date"
              value={filters.date}
              onChange={handleFilterChange("date")}
              className="w-[220px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter-instructor">Filter by instructor</Label>
            <select
              id="filter-instructor"
              value={filters.instructorId}
              onChange={handleFilterChange("instructorId")}
              className="h-10 w-[260px] rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All instructors</option>
              {instructorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pb-1">
            <Button type="button" onClick={applyFilters} disabled={loading}>
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              disabled={loading}
            >
              Reset
            </Button>
          </div>

          <div className="ml-auto flex items-center gap-3 pb-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => fetchClaims()}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Total payout summary shown when an instructor is selected */}
        {filters.instructorId ? (
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <span className="font-medium">
              Total Calculated Payout for selection:{" "}
            </span>
            <span className="font-semibold">
              {formatRs(totalPayoutForSelection)}
            </span>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Submitted claims</h2>
          {loading && (
            <span className="text-sm text-muted-foreground">Loading…</span>
          )}
        </div>

        {claims.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No overtime claims found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border flex justify-center">
            <Table className="table-fixed w-full text-center">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[140px] text-center">
                    Instructor
                  </TableHead>
                  <TableHead className="w-[140px] text-center">Date</TableHead>
                  <TableHead className="w-[120px] text-center">
                    Designation
                  </TableHead>
                  <TableHead className="w-[140px] text-center">
                    Branch
                  </TableHead>
                  <TableHead className="w-[110px] text-center">
                    Total min
                  </TableHead>
                  <TableHead className="w-[280px] text-center">Slots</TableHead>
                  <TableHead className="w-[140px] text-center">
                    Monthly Salary
                  </TableHead>
                  <TableHead className="w-[140px] text-center">
                    Calculated Payout
                  </TableHead>
                  <TableHead className="w-[220px] text-center">Notes</TableHead>
                  <TableHead className="w-[120px] text-center">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {claims.map((claim) => {
                  const monthlyFromClaim = numberOrNull(claim?.salary);
                  const monthlyFromProfile = numberOrNull(
                    claim?.instructor?.salary
                  );
                  const monthly = monthlyFromClaim ?? monthlyFromProfile;
                  const payout = calcOvertimePayout(claim);
                  const isVerified = !!claim.verified;

                  return (
                    <TableRow
                      key={claim._id}
                      className="align-middle text-center"
                    >
                      <TableCell className="font-medium">
                        {claim.instructorName ||
                          claim.instructor?.fullName ||
                          "--"}
                      </TableCell>
                      <TableCell>{formatDateLabel(claim.date)}</TableCell>
                      <TableCell>
                        {claim.designation ||
                          claim.instructor?.designation ||
                          "--"}
                      </TableCell>
                      <TableCell>{claim.branchName || "--"}</TableCell>

                      <TableCell className="font-medium tabular-nums">
                        {minutesToHuman(claim.totalDurationMinutes)}
                      </TableCell>

                      <TableCell>
                        {Array.isArray(claim.overtimeSlots) &&
                        claim.overtimeSlots.length ? (
                          <div className="flex flex-wrap justify-center gap-1">
                            {claim.overtimeSlots.map((slot, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center truncate rounded-md bg-muted px-2 py-1 text-xs font-medium"
                                title={formatTimeRange(slot)}
                              >
                                {formatTimeRange(slot)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No slots recorded
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="tabular-nums font-medium">
                        {monthly != null ? formatRs(monthly) : "--"}
                      </TableCell>

                      <TableCell className="font-semibold tabular-nums">
                        {formatRs(payout)}
                      </TableCell>

                      <TableCell className="whitespace-normal">
                        {claim.notes?.trim() || "--"}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {isVerified ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                            Verified
                          </span>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => verifyRow(claim)}
                            disabled={saving}
                          >
                            Verify
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
