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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { STATUSES, LABELS } from "@/components/constants/attendance";

import DutyRosterModal from "@/components/models/DutyRosterModal";
import OffDaysModal from "@/components/models/OffDaysModal";

/* ===== time utils for total column ===== */
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
function weekdayFromYmd(ymd) {
  if (!ymd) return null;
  const d = new Date(`${ymd}T00:00:00Z`);
  if (isNaN(d)) return null;
  return d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

/* simple number formatter without currency symbol */
const fmtMoney = (v) => (v == null ? "—" : new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v));

export default function AttendanceTable({
  rows = [],
  persisted = {},
  changes = {},
  onStatusChange,
  onNoteChange,
  onCheckInChange,
  onCheckOutChange,
  onMark,
  dateYmd,
  onUpdateEmployee,           // (id, patch) => Promise
  onUpdateEmployeeSalary,     // (id, salary|null) => Promise
}) {
  /* ===== NOTE modal ===== */
  const [noteModal, setNoteModal] = React.useState({ open: false, id: null, value: "", name: "" });
  function openNoteModal(user, merged) {
    setNoteModal({ open: true, id: user._id, value: merged.note || "", name: user.fullName || "" });
  }
  function closeNoteModal() { setNoteModal({ open: false, id: null, value: "", name: "" }); }
  async function saveNote() {
    if (noteModal.id != null) onNoteChange?.(noteModal.id, noteModal.value);
    closeNoteModal();
  }

  /* ===== shared modals (duty & off days) ===== */
  const [dutyState, setDutyState] = React.useState({ open: false, id: null, name: "", roster: "" });
  const [offState, setOffState]   = React.useState({ open: false, id: null, name: "", days: [] });

  function openDuty(u, merged) {
    setDutyState({ open: true, id: u._id, name: u.fullName || "", roster: merged.dutyRoster || "" });
  }
  async function saveDuty(rosterString) {
    try {
      await onUpdateEmployee?.(dutyState.id, { dutyRoster: rosterString });
      toast.success("Duty roster updated");
      setDutyState((s) => ({ ...s, open: false }));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update duty roster");
    }
  }

  function openOff(u) {
    const days = Array.isArray(u.officialOffDays) ? u.officialOffDays.slice() : [];
    setOffState({ open: true, id: u._id, name: u.fullName || "", days });
  }
  async function saveOffDays(daysArray) {
    try {
      await onUpdateEmployee?.(offState.id, { officialOffDays: daysArray });
      toast.success("Off days updated");
      setOffState((s) => ({ ...s, open: false }));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update off days");
    }
  }

  /* ===== SALARY modal ===== */
  const [salaryModal, setSalaryModal] = React.useState({ open: false, id: null, name: "", value: "" });
  function openSalaryModal(u) {
    setSalaryModal({ open: true, id: u._id, name: u.fullName || "", value: u.salary ?? "" });
  }
  function closeSalaryModal() { setSalaryModal((s) => ({ ...s, open: false })); }
  async function saveSalary() {
    const raw = String(salaryModal.value).trim();
    const num = raw === "" ? null : Number(raw);
    if (!(num === null || (Number.isFinite(num) && num >= 0))) {
      return toast.error("Enter a non-negative number (or leave blank to clear).");
    }
    try {
      if (onUpdateEmployeeSalary) {
        await onUpdateEmployeeSalary(salaryModal.id, num);
      } else {
        await onUpdateEmployee?.(salaryModal.id, { salary: num });
      }
      toast.success("Salary updated");
      closeSalaryModal();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update salary");
    }
  }

  if (!rows.length) {
    return <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">No employees found.</div>;
  }

  const todayWeekday = weekdayFromYmd(dateYmd);

  /* === Determine the "official off" status key from your STATUSES array === */
  const OFF_STATUS = React.useMemo(() => {
    const CANDIDATES = ["official_off", "official-off", "off", "holiday", "officialOff"];
    return (
      STATUSES.find((s) => CANDIDATES.includes(s)) ||
      STATUSES.find((s) => s.toLowerCase().includes("off")) ||
      STATUSES[0] // safe fallback
    );
  }, []);

  /* === Auto-mark employees whose officialOffDays include today === */
  React.useEffect(() => {
    if (!todayWeekday) return;
    rows.forEach((u) => {
      const offDays = Array.isArray(u.officialOffDays) ? u.officialOffDays : [];
      if (!offDays.includes(todayWeekday)) return;

      // current status considering drafts/persisted
      const current = (changes[u._id]?.status ?? persisted[u._id]?.status ?? "");
      if (current !== OFF_STATUS) {
        onStatusChange?.(u._id, OFF_STATUS);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, todayWeekday, persisted, changes, OFF_STATUS]);

  return (
    <div className="rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <Table className="w-full text-sm">
          <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <TableRow className="[&>*]:py-2">
              <TableHead className="w-[220px] uppercase tracking-wide text-xs text-muted-foreground">Name</TableHead>
              <TableHead className="w-[110px] uppercase tracking-wide text-xs text-muted-foreground">ID</TableHead>
              <TableHead className="w-[140px] uppercase tracking-wide text-xs text-muted-foreground">Department</TableHead>
              <TableHead className="w-[140px] uppercase tracking-wide text-xs text-muted-foreground">Salary</TableHead>
              <TableHead className="w-[200px] uppercase tracking-wide text-xs text-muted-foreground">Duty</TableHead>
              <TableHead className="w-[220px] uppercase tracking-wide text-xs text-muted-foreground">Off Days</TableHead>
              <TableHead className="w-[160px] uppercase tracking-wide text-xs text-muted-foreground">Status</TableHead>
              <TableHead className="w-[120px] uppercase tracking-wide text-xs text-muted-foreground">Check-in</TableHead>
              <TableHead className="w-[120px] uppercase tracking-wide text-xs text-muted-foreground">Check-out</TableHead>
              <TableHead className="w-[120px] uppercase tracking-wide text-xs text-muted-foreground">Total</TableHead>
              <TableHead className="w-[180px] uppercase tracking-wide text-xs text-muted-foreground">Note</TableHead>
              <TableHead className="w-[100px] text-right uppercase tracking-wide text-xs text-muted-foreground">Mark</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((u) => {
              const draft = changes[u._id] || {};
              const saved = persisted[u._id] || {};
              const merged = { ...saved, ...draft };

              const offDays = Array.isArray(u.officialOffDays) ? u.officialOffDays : [];
              const isOfficialOffToday = !!(todayWeekday && offDays.includes(todayWeekday));

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

              const hasNote = !!(merged.note && merged.note.trim().length);

              return (
                <TableRow key={u._id} className={`odd:bg-muted/40 hover:bg-muted/60 transition-colors ${isOfficialOffToday ? "opacity-95" : ""} [&>*]:py-2`}>
                  <TableCell className="font-medium">
                    <div className="max-w-[200px] truncate">{u.fullName}</div>
                    {isOfficialOffToday && (
                      <div className="mt-1 inline-flex items-center gap-2">
                        <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide">Off today</span>
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-muted-foreground">{u.employeeId}</TableCell>

                  <TableCell>
                    <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium">
                      {u.department || "—"}
                    </span>
                  </TableCell>

                  {/* Salary */}
                  <TableCell>
                    {u.salary != null ? (
                      <button
                        type="button"
                        onClick={() => openSalaryModal(u)}
                        className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition"
                        title="Edit salary"
                      >
                        {fmtMoney(u.salary)}
                      </button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => openSalaryModal(u)} className="h-8" title="Add salary">
                        Add
                      </Button>
                    )}
                  </TableCell>

                  {/* Duty */}
                  <TableCell>
                    {u.dutyRoster ? (
                      <button
                        type="button"
                        onClick={() => openDuty(u, merged)}
                        className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition"
                        title="Edit duty roster"
                      >
                        {u.dutyRoster}
                      </button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => openDuty(u, merged)} className="h-8" title="Add duty roster">
                        Add
                      </Button>
                    )}
                  </TableCell>

                  {/* Off Days */}
                  <TableCell>
                    {offDays.length ? (
                      <button
                        type="button"
                        onClick={() => openOff(u)}
                        className="flex gap-1 rounded-md px-1 py-0.5 hover:bg-accent hover:text-accent-foreground transition"
                        title="Edit off days"
                      >
                        {offDays.map((d) => (
                          <span key={d} className="rounded-md border px-2 py-0.5 text-xs">
                            {d.slice(0,3)}
                          </span>
                        ))}
                      </button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => openOff(u)} className="h-8" title="Add off days">
                        Add
                      </Button>
                    )}
                  </TableCell>

                  <TableCell>
                    <Select
                      value={merged.status || ""}
                      onValueChange={(val) => onStatusChange?.(u._id, val)}
                    >
                      <SelectTrigger className="h-8 w-[160px] text-sm">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent align="start" className="w-[160px] p-1">
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-sm h-8 py-1.5">
                            {LABELS[s] ?? s}
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
                      className="h-8 text-sm font-mono"
                      disabled={isOfficialOffToday}
                      title={isOfficialOffToday ? "Official off day — time entry disabled" : ""}
                    />
                  </TableCell>

                  <TableCell>
                    <Input
                      type="time"
                      value={checkOutVal}
                      onChange={(e) => onCheckOutChange?.(u._id, e.target.value)}
                      className="h-8 text-sm font-mono"
                      disabled={isOfficialOffToday}
                      title={isOfficialOffToday ? "Official off day — time entry disabled" : ""}
                    />
                  </TableCell>

                  <TableCell>
                    <div
                      className={`inline-flex min-w-[80px] items-center justify-center rounded-md border px-2 py-1 text-xs font-medium ${invalidOrder ? "border-destructive text-destructive" : "text-foreground"} font-mono`}
                      title={invalidOrder ? "Check-out is earlier than check-in" : ""}
                    >
                      {invalidOrder ? "Invalid" : durationStr}
                    </div>
                  </TableCell>

                  {/* NOTE */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => openNoteModal(u, merged)}>
                        {hasNote ? "Edit Note" : "Add Note"}
                      </Button>
                      {hasNote && <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide">Attached</span>}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => onMark?.(u._id)}
                      disabled={!hasDraft}
                      title={hasDraft ? "Save this row" : "Already saved"}
                      className="h-8"
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

      {/* Note Modal */}
      <Dialog open={noteModal.open} onOpenChange={(o) => (o ? null : closeNoteModal())}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Note {noteModal.name ? `— ${noteModal.name}` : ""}</DialogTitle></DialogHeader>
          <Textarea
            value={noteModal.value}
            onChange={(e) => setNoteModal((s) => ({ ...s, value: e.target.value }))}
            placeholder="Type a note..."
            rows={6}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeNoteModal}>Cancel</Button>
            <Button onClick={saveNote}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shared Modals */}
      <DutyRosterModal
        open={dutyState.open}
        onOpenChange={(o) => setDutyState((s) => ({ ...s, open: o }))}
        title={`Duty roster${dutyState.name ? ` — ${dutyState.name}` : ""}`}
        initialRoster={dutyState.roster}
        onSave={saveDuty}
      />

      <OffDaysModal
        open={offState.open}
        onOpenChange={(o) => setOffState((s) => ({ ...s, open: o }))}
        title={`Off days${offState.name ? ` — ${offState.name}` : ""}`}
        initialDays={offState.days}
        onSave={saveOffDays}
      />

      {/* Salary Modal */}
      <Dialog open={salaryModal.open} onOpenChange={(o) => (o ? null : closeSalaryModal())}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Salary {salaryModal.name ? `— ${salaryModal.name}` : ""}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Amount</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 1200"
              value={salaryModal.value}
              onChange={(e) => setSalaryModal((s) => ({ ...s, value: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Enter a non-negative number. Leave blank to clear.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeSalaryModal}>Cancel</Button>
            <Button onClick={saveSalary}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
