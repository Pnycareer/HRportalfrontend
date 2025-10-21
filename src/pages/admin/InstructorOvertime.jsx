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
import { toast } from "sonner";

function minutesToHuman(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0h";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hrs}h`;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
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
  if (!slot?.from || !slot?.to) return "—";
  const from = new Date(slot.from);
  const to = new Date(slot.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "—";
  const formatter = new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatter.format(from)} → ${formatter.format(to)} (${minutesToHuman(
    slot.durationMinutes
  )})`;
}

export default function AdminInstructorOvertime() {
  const { claims, loading, saving, fetchClaims, updateClaim } = useInstructorOvertime();
  const [filters, setFilters] = React.useState({ date: "" });
  const [salaryDrafts, setSalaryDrafts] = React.useState({});
  const [updatingId, setUpdatingId] = React.useState(null);

  React.useEffect(() => {
    fetchClaims().catch(() => {});
  }, [fetchClaims]);

  // Prefill salary from claim.salary, else fallback to instructor.salary (profile)
  React.useEffect(() => {
    if (!Array.isArray(claims)) return;
    setSalaryDrafts((prev) => {
      const next = { ...prev };
      claims.forEach((claim) => {
        if (next[claim._id] === undefined) {
          const claimNum = Number(claim?.salary);
          const profileNum = Number(claim?.instructor?.salary);
          const fromClaim = Number.isFinite(claimNum) ? claimNum : null;
          const fromProfile = Number.isFinite(profileNum) ? profileNum : null;
          const value = fromClaim !== null ? fromClaim : fromProfile !== null ? fromProfile : null;
          next[claim._id] = value !== null ? String(value) : "";
        }
      });
      return next;
    });
  }, [claims]);

  const handleFilterChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const applyFilters = async () => {
    try {
      await fetchClaims({
        date: filters.date || undefined,
      });
    } catch {
      // toast handled in hook
    }
  };

  const resetFilters = async () => {
    setFilters({ date: "" });
    try {
      await fetchClaims({});
    } catch {
      // handled in hook
    }
  };

  const handleSalaryChange = (id, value) => {
    setSalaryDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const handleSalarySave = async (claim) => {
    const raw = salaryDrafts[claim._id];
    if (raw === undefined) {
      toast.error("Enter salary before saving.");
      return;
    }
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < 0) {
      toast.error("Salary must be a non-negative number.");
      return;
    }
    setUpdatingId(claim._id);
    try {
      await updateClaim(claim._id, { salary: numeric });
    } catch {
      // handled inside hook
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Instructor Overtime Claims</h1>
        <p className="text-sm text-muted-foreground">
          Review submitted overtime logs, validate the hours, and set the agreed payout.
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
            />
          </div>
          <div className="flex items-center gap-3 pb-1">
            <Button type="button" onClick={applyFilters} disabled={loading}>
              Apply
            </Button>
            <Button type="button" variant="outline" onClick={resetFilters} disabled={loading}>
              Reset
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-3 pb-1">
            <Button type="button" variant="ghost" onClick={() => fetchClaims()} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Submitted claims</h2>
          {loading && <span className="text-sm text-muted-foreground">Loading…</span>}
        </div>

        {claims.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No overtime claims found for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Total duration</TableHead>
                  <TableHead>Slots</TableHead>
                  <TableHead className="min-w-[160px]">Salary (auto from profile)</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim._id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {claim.instructorName || claim.instructor?.fullName || "—"}
                    </TableCell>
                    <TableCell>{formatDateLabel(claim.date)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {claim.designation || claim.instructor?.designation || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{claim.branchName || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {minutesToHuman(claim.totalDurationMinutes)}
                    </TableCell>
                    <TableCell className="space-y-1 min-w-[200px]">
                      {Array.isArray(claim.overtimeSlots) && claim.overtimeSlots.length ? (
                        claim.overtimeSlots.map((slot, index) => (
                          <div key={index} className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                            {formatTimeRange(slot)}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No slots recorded</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={salaryDrafts[claim._id] ?? ""}
                          onChange={(event) => handleSalaryChange(claim._id, event.target.value)}
                          placeholder="0.00"
                        />
                        {!Number.isFinite(Number(claim?.salary)) &&
                        Number.isFinite(Number(claim?.instructor?.salary)) ? (
                          <p className="text-[11px] text-muted-foreground">Prefilled from profile</p>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSalarySave(claim)}
                          disabled={saving || updatingId === claim._id}
                        >
                          {updatingId === claim._id ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal">
                      {claim.notes?.trim() || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
