// components/attendance/AttendanceTable.jsx
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
const fmtMoney = (v) =>
  v == null
    ? "—"
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v);

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
  onUpdateEmployee,
  onUpdateEmployeeSalary,
}) {
  /* ===== NOTE modal ===== */
  const [noteModal, setNoteModal] = React.useState({
    open: false,
    id: null,
    value: "",
    name: "",
  });
  function openNoteModal(user, merged) {
    setNoteModal({
      open: true,
      id: user._id,
      value: merged.note || "",
      name: user.fullName || "",
    });
  }
  function closeNoteModal() {
    setNoteModal({ open: false, id: null, value: "", name: "" });
  }
  async function saveNote() {
    if (noteModal.id != null) onNoteChange?.(noteModal.id, noteModal.value);
    closeNoteModal();
  }

  /* ===== shared modals (duty & off days) ===== */
  const [dutyState, setDutyState] = React.useState({
    open: false,
    id: null,
    name: "",
    roster: "",
  });
  const [offState, setOffState] = React.useState({
    open: false,
    id: null,
    name: "",
    days: [],
  });

  function openDuty(u, merged) {
    setDutyState({
      open: true,
      id: u._id,
      name: u.fullName || "",
      roster: merged.dutyRoster || u.dutyRoster || "",
    });
  }
  async function saveDuty(rosterString) {
    try {
      await onUpdateEmployee?.(dutyState.id, { dutyRoster: rosterString } , { silent: true });
      toast.success("Duty roster updated");
      // 🔥 reflect instantly in Details modal if it's open for this user
      setDetails((s) =>
        s.open && s.id === dutyState.id ? { ...s, duty: rosterString } : s
      );
      setDutyState((s) => ({ ...s, open: false }));
    } catch (e) {
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to update duty roster"
      );
    }
  }

  function openOff(u) {
    const days = Array.isArray(u.officialOffDays)
      ? u.officialOffDays.slice()
      : [];
    setOffState({ open: true, id: u._id, name: u.fullName || "", days });
  }
  async function saveOffDays(daysArray) {
    try {
      await onUpdateEmployee?.(offState.id, { officialOffDays: daysArray } ,  { silent: true });
      toast.success("Off days updated");
      // 🔥 reflect instantly in Details modal
      setDetails((s) =>
        s.open && s.id === offState.id ? { ...s, offDays: daysArray } : s
      );
      setOffState((s) => ({ ...s, open: false }));
    } catch (e) {
      toast.error(
        e?.response?.data?.message || e?.message || "Failed to update off days"
      );
    }
  }

  /* ===== SALARY modal ===== */
  const [salaryModal, setSalaryModal] = React.useState({
    open: false,
    id: null,
    name: "",
    value: "",
  });
  function openSalaryModal(u) {
    setSalaryModal({
      open: true,
      id: u._id,
      name: u.fullName || "",
      value: u.salary ?? "",
    });
  }
  function closeSalaryModal() {
    setSalaryModal((s) => ({ ...s, open: false }));
  }
  async function saveSalary() {
    const raw = String(salaryModal.value).trim();
    const num = raw === "" ? null : Number(raw);
    if (!(num === null || (Number.isFinite(num) && num >= 0))) {
      return toast.error(
        "Enter a non-negative number (or leave blank to clear)."
      );
    }
    try {
      if (onUpdateEmployeeSalary) {
        await onUpdateEmployeeSalary(salaryModal.id, num , { silent: true });
      } else {
        await onUpdateEmployee?.(salaryModal.id, { salary: num });
      }
      toast.success("Salary updated");
      // 🔥 reflect instantly in Details modal
      setDetails((s) =>
        s.open && s.id === salaryModal.id ? { ...s, salary: num } : s
      );
      closeSalaryModal();
    } catch (e) {
      toast.error(
        e?.response?.data?.message || e?.message || "Failed to update salary"
      );
    }
  }

  if (!rows.length) {
    return (
      <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
        No employees found.
      </div>
    );
  }

  const todayWeekday = weekdayFromYmd(dateYmd);

  /* === Determine the "official off" status key from your STATUSES array === */
  const OFF_STATUS = React.useMemo(() => {
    const CANDIDATES = [
      "official_off",
      "official-off",
      "off",
      "holiday",
      "officialOff",
    ];
    return (
      STATUSES.find((s) => CANDIDATES.includes(s)) ||
      STATUSES.find((s) => s.toLowerCase().includes("off")) ||
      STATUSES[0]
    );
  }, []);

  /* === Auto-mark employees whose officialOffDays include today (default only) === */
  React.useEffect(() => {
    if (!todayWeekday) return;
    rows.forEach((u) => {
      const offDays = Array.isArray(u.officialOffDays) ? u.officialOffDays : [];
      if (!offDays.includes(todayWeekday)) return;

      // only set OFF if there's NO status yet (neither saved nor draft)
      const draftStatus = changes[u._id]?.status;
      const savedStatus = persisted[u._id]?.status;
      const hasAnyStatus =
        (draftStatus != null && draftStatus !== "") ||
        (savedStatus != null && savedStatus !== "");

      if (!hasAnyStatus) {
        onStatusChange?.(u._id, OFF_STATUS);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, todayWeekday, persisted, changes, OFF_STATUS]);

  /* ===== Details modal (edit entry point) ===== */
  const [details, setDetails] = React.useState({
    open: false,
    id: null,
    name: "",
    salary: null,
    duty: "",
    offDays: [],
  });
  function openDetails(u, merged) {
    setDetails({
      open: true,
      id: u._id,
      name: u.fullName || "",
      salary: u.salary ?? null,
      duty: u.dutyRoster || merged.dutyRoster || "",
      offDays: Array.isArray(u.officialOffDays) ? u.officialOffDays : [],
    });
  }
  function closeDetails() {
    setDetails((s) => ({ ...s, open: false }));
  }

  /* 🔄 Auto-sync Details modal with latest row data (if open) */
  React.useEffect(() => {
    if (!details.open || !details.id) return;
    const u = rows.find((r) => r._id === details.id);
    if (!u) return;
    setDetails((s) => ({
      ...s,
      name: u.fullName || s.name,
      salary: u.salary ?? s.salary,
      duty: u.dutyRoster ?? s.duty,
      offDays: Array.isArray(u.officialOffDays) ? u.officialOffDays : s.offDays,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, details.open, details.id]);

  return (
    <div className="rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <Table className="w-full text-sm">
          <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <TableRow className="[&>*]:py-2">
              <TableHead className="w-[260px] uppercase tracking-wide text-xs text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="w-[120px] uppercase tracking-wide text-xs text-muted-foreground">
                ID
              </TableHead>
              <TableHead className="w-[160px] uppercase tracking-wide text-xs text-muted-foreground">
                Department
              </TableHead>
              <TableHead className="w-[160px] uppercase tracking-wide text-xs text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="w-[120px] uppercase tracking-wide text-xs text-muted-foreground">
                Check-in
              </TableHead>
              <TableHead className="w-[120px] uppercase tracking-wide text-xs text-muted-foreground">
                Check-out
              </TableHead>
              <TableHead className="w-[120px] uppercase tracking-wide text-xs text-muted-foreground">
                Total
              </TableHead>
              {/* Details column only (we removed Salary/Duty/OffDays from table) */}
              <TableHead className="w-[120px] uppercase tracking-wide text-xs text-muted-foreground">
                Details
              </TableHead>
              <TableHead className="w-[180px] uppercase tracking-wide text-xs text-muted-foreground">
                Note
              </TableHead>
              <TableHead className="w-[100px] text-right uppercase tracking-wide text-xs text-muted-foreground">
                Mark
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((u) => {
              const draft = changes[u._id] || {};
              const saved = persisted[u._id] || {};
              const merged = { ...saved, ...draft };

              const offDays = Array.isArray(u.officialOffDays)
                ? u.officialOffDays
                : [];
              const isOfficialOffToday = !!(
                todayWeekday && offDays.includes(todayWeekday)
              );

              // current status OFF/ABSENT/LEAVE?
              const isRowCurrentlyOff =
                (merged.status || "").toLowerCase().includes("off") ||
                merged.status === "absent" ||
                merged.status === "leave";

              const hasDraft = !!(
                draft.status ||
                draft.note ||
                draft.checkIn ||
                draft.checkOut
              );
              const checkInVal = merged.checkIn || "";
              const checkOutVal = merged.checkOut || "";

              const inMin = hhmmToMinutes(checkInVal);
              const outMin = hhmmToMinutes(checkOutVal);
              const hasBoth = inMin != null && outMin != null;
              const clientDur =
                hasBoth && outMin >= inMin ? outMin - inMin : null;
              const serverDur = merged.workedMinutes ?? null;
              const durationMin = serverDur ?? clientDur;
              const durationStr =
                durationMin == null ? "—" : minutesToHHMM(durationMin);
              const invalidOrder = hasBoth && outMin < inMin;

              const hasNote = !!(merged.note && merged.note.trim().length);

              return (
                <TableRow
                  key={u._id}
                  className={`odd:bg-muted/40 hover:bg-muted/60 transition-colors ${
                    isOfficialOffToday ? "opacity-95" : ""
                  } [&>*]:py-2`}
                >
                  <TableCell className="font-medium">
                    <div className="max-w-[220px] truncate">{u.fullName}</div>
                    {isOfficialOffToday && (
                      <div className="mt-1 inline-flex items-center gap-2">
                        <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide">
                          Off today
                        </span>
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {u.employeeId}
                  </TableCell>

                  <TableCell>
                    <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium">
                      {u.department || "—"}
                    </span>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Select
                      value={merged.status || ""}
                      onValueChange={(val) =>
                        onStatusChange?.(u._id, val === "__clear__" ? "" : val)
                      }
                    >
                      <SelectTrigger className="h-8 w-[160px] text-sm">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent align="start" className="w-[160px] p-1">
                        <SelectItem
                          value="__clear__"
                          className="text-sm h-8 py-1.5 text-muted-foreground"
                        >
                          Clear selection
                        </SelectItem>
                        {STATUSES.map((s) => (
                          <SelectItem
                            key={s}
                            value={s}
                            className="text-sm h-8 py-1.5"
                          >
                            {LABELS[s] ?? s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Check-in (disabled only if it's official off today AND status remains an off-type) */}
                  <TableCell>
                    <Input
                      type="time"
                      value={checkInVal}
                      onChange={(e) => onCheckInChange?.(u._id, e.target.value)}
                      className="h-8 text-sm font-mono"
                      disabled={isOfficialOffToday && isRowCurrentlyOff}
                      title={
                        isOfficialOffToday && isRowCurrentlyOff
                          ? "Official off day — time entry disabled"
                          : ""
                      }
                    />
                  </TableCell>

                  {/* Check-out */}
                  <TableCell>
                    <Input
                      type="time"
                      value={checkOutVal}
                      onChange={(e) =>
                        onCheckOutChange?.(u._id, e.target.value)
                      }
                      className="h-8 text-sm font-mono"
                      disabled={isOfficialOffToday && isRowCurrentlyOff}
                      title={
                        isOfficialOffToday && isRowCurrentlyOff
                          ? "Official off day — time entry disabled"
                          : ""
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div
                      className={`inline-flex min-w-[80px] items-center justify-center rounded-md border px-2 py-1 text-xs font-medium ${
                        invalidOrder
                          ? "border-destructive text-destructive"
                          : "text-foreground"
                      } font-mono`}
                      title={
                        invalidOrder ? "Check-out is earlier than check-in" : ""
                      }
                    >
                      {invalidOrder ? "Invalid" : durationStr}
                    </div>
                  </TableCell>

                  {/* Details entry point */}
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => openDetails(u, merged)}
                      title="View & edit details"
                    >
                      Details
                    </Button>
                  </TableCell>

                  {/* NOTE */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => openNoteModal(u, merged)}
                      >
                        {hasNote ? "Edit Note" : "Add Note"}
                      </Button>
                      {hasNote && (
                        <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide">
                          Attached
                        </span>
                      )}
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
      <Dialog
        open={noteModal.open}
        onOpenChange={(o) => (o ? null : closeNoteModal())}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              Note {noteModal.name ? `— ${noteModal.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteModal.value}
            onChange={(e) =>
              setNoteModal((s) => ({ ...s, value: e.target.value }))
            }
            placeholder="Type a note..."
            rows={6}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeNoteModal}>
              Cancel
            </Button>
            <Button onClick={saveNote}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shared Modals (used by Details) */}
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

      <Dialog
        open={salaryModal.open}
        onOpenChange={(o) => (o ? null : closeSalaryModal())}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              Salary {salaryModal.name ? `— ${salaryModal.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Amount
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 1200"
              value={salaryModal.value}
              onChange={(e) =>
                setSalaryModal((s) => ({ ...s, value: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Enter a non-negative number. Leave blank to clear.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeSalaryModal}>
              Cancel
            </Button>
            <Button onClick={saveSalary}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal: shows + routes to editors, and reflects instantly */}
      <Dialog
        open={details.open}
        onOpenChange={(o) => (o ? null : closeDetails())}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              Details {details.name ? `— ${details.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Salary */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Salary</div>
                <div className="text-sm font-medium">
                  {fmtMoney(details.salary)}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSalaryModal({
                    open: true,
                    id: details.id,
                    name: details.name,
                    value: details.salary ?? "",
                  });
                }}
              >
                Edit Salary
              </Button>
            </div>

            {/* Duty */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Duty</div>
                <div className="text-sm font-medium">
                  {details.duty || "—"}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setDutyState({
                    open: true,
                    id: details.id,
                    name: details.name,
                    roster: details.duty || "",
                  });
                }}
              >
                Edit Duty
              </Button>
            </div>

            {/* Off Days */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  Off Days
                </div>
                {details.offDays?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {details.offDays.map((d) => (
                      <span
                        key={d}
                        className="rounded-md border px-2 py-0.5 text-xs"
                        title={d}
                      >
                        {d.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm">—</div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setOffState({
                    open: true,
                    id: details.id,
                    name: details.name,
                    days: Array.isArray(details.offDays)
                      ? details.offDays
                      : [],
                  });
                }}
              >
                Edit Off Days
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDetails}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
