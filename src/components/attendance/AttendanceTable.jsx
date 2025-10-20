// components/attendance/AttendanceTable.jsx
import React from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { STATUSES, LABELS } from "@/components/constants/attendance";

function hhmmToMinutes(hhmm) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function minutesToHHMM(mins) {
  if (mins == null || isNaN(mins)) return "";
  const sign = mins < 0 ? "-" : "";
  const abs = Math.abs(mins);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `${sign}${h}:${m}`;
}

export default function AttendanceTable({
  rows = [],
  persisted = {},
  changes = {},
  onStatusChange,
  onNoteChange,
  onCheckInChange,
  onCheckOutChange,
  onMark,
}) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
        No employees found.
      </div>
    );
  }

  // compute durations (prefer server `workedMinutes` if available)
  const computed = rows.map((u) => {
    const draft = changes[u._id] || {};
    const saved = persisted[u._id] || {};
    const merged = { ...saved, ...draft };
    const inMin = hhmmToMinutes(merged.checkIn || "");
    const outMin = hhmmToMinutes(merged.checkOut || "");
    const clientDur = (inMin != null && outMin != null && outMin >= inMin) ? (outMin - inMin) : null;
    const duration = merged.workedMinutes ?? clientDur; // prefer server value
    return { id: u._id, merged, duration };
  });
  const totalMinutes = computed.reduce((acc, r) => acc + (r.duration ?? 0), 0);

  return (
    <div className="rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <TableRow>
              <TableHead className="w-[260px]">Full Name</TableHead>
              <TableHead className="w-[120px]">Employee ID</TableHead>
              <TableHead className="w-[160px]">Department</TableHead>
              <TableHead className="w-[220px]">Status</TableHead>
              <TableHead className="w-[160px]">Check-in</TableHead>
              <TableHead className="w-[160px]">Check-out</TableHead>
              <TableHead className="w-[160px]">Total Hours</TableHead>
              <TableHead className="w-[280px]">Note</TableHead>
              <TableHead className="w-[140px] text-right">Mark</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((u) => {
              const draft = changes[u._id] || {};
              const saved = persisted[u._id] || {};
              const merged = { ...saved, ...draft };
              const hasDraft = !!(draft.status || draft.note || draft.checkIn || draft.checkOut);

              const checkInVal = merged.checkIn || "";
              const checkOutVal = merged.checkOut || "";

              const inMin = hhmmToMinutes(checkInVal);
              const outMin = hhmmToMinutes(checkOutVal);
              const hasBoth = inMin != null && outMin != null;
              const clientDur = hasBoth && outMin >= inMin ? (outMin - inMin) : null;
              const serverDur = merged.workedMinutes ?? null;
              const durationMin = serverDur ?? clientDur;
              const durationStr = durationMin == null ? "—" : minutesToHHMM(durationMin);

              const invalidOrder = hasBoth && outMin < inMin;

              return (
                <TableRow key={u._id} className="odd:bg-muted/40 hover:bg-muted/60 transition-colors">
                  <TableCell className="font-medium">
                    <div className="max-w-[240px] truncate">{u.fullName}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.employeeId}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium">
                      {u.department || "—"}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Select
                      value={merged.status || ""}
                      onValueChange={(val) => onStatusChange?.(u._id, val)}
                    >
                      <SelectTrigger className="h-9 w-[220px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent align="start">
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell>
                    <Input
                      type="time"
                      value={checkInVal}
                      onChange={(e) => onCheckInChange?.(u._id, e.target.value)}
                    />
                  </TableCell>

                  <TableCell>
                    <Input
                      type="time"
                      value={checkOutVal}
                      onChange={(e) => onCheckOutChange?.(u._id, e.target.value)}
                    />
                  </TableCell>

                  <TableCell>
                    <div
                      className={`inline-flex min-w-[88px] items-center justify-center rounded-md border px-2 py-1 text-xs font-medium ${
                        invalidOrder ? "border-destructive text-destructive" : "text-foreground"
                      }`}
                      title={invalidOrder ? "Check-out is earlier than check-in" : ""}
                    >
                      {invalidOrder ? "Invalid" : durationStr}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Input
                      placeholder="Note (optional)…"
                      value={merged.note || ""}
                      onChange={(e) => onNoteChange?.(u._id, e.target.value)}
                    />
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => onMark?.(u._id)}
                      disabled={!hasDraft}
                      title={hasDraft ? "Save this row" : "Already saved"}
                    >
                      {hasDraft ? "Mark" : "Saved"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

           
           
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
