import React from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { STATUSES, LABELS } from "@/components/constants/attendance";
import DutyRosterModal from "@/components/models/DutyRosterModal";
import OffDaysModal from "@/components/models/OffDaysModal";
import { Settings2 } from "lucide-react";

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
const fmtMoney = (v) =>
  v == null ? "—" : new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v);

export default function AttendanceTable({
  rows = [],
  persisted = {},
  changes = {},
  onStatusChange,
  onSubStatusChange,
  onActionChange,
  onNoteChange,
  onCheckInChange,
  onCheckOutChange,
  onMark,
  dateYmd,
  onUpdateEmployee,
  onUpdateEmployeeSalary,
}) {
  /* ===== NOTE modal ===== */
  const [noteModal, setNoteModal] = React.useState({ open: false, id: null, value: "", name: "" });
  function openNoteModal(user, merged) {
    setNoteModal({ open: true, id: user._id, value: merged.note || "", name: user.fullName || "" });
  }
  function closeNoteModal() {
    setNoteModal({ open: false, id: null, value: "", name: "" });
  }
  async function saveNote() {
    if (noteModal.id != null) onNoteChange?.(noteModal.id, noteModal.value);
    closeNoteModal();
  }

  /* ===== shared modals (duty & off days) ===== */
  const [dutyState, setDutyState] = React.useState({ open: false, id: null, name: "", roster: "" });
  const [offState, setOffState] = React.useState({ open: false, id: null, name: "", days: [] });

  function openDuty(u, merged) {
    setDutyState({ open: true, id: u._id, name: u.fullName || "", roster: merged.dutyRoster || u.dutyRoster || "" });
  }
  async function saveDuty(rosterString) {
    try {
      await onUpdateEmployee?.(dutyState.id, { dutyRoster: rosterString }, { silent: true });
      toast.success("Duty roster updated");
      setDetails((s) => (s.open && s.id === dutyState.id ? { ...s, duty: rosterString } : s));
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
      await onUpdateEmployee?.(offState.id, { officialOffDays: daysArray }, { silent: true });
      toast.success("Off days updated");
      setDetails((s) => (s.open && s.id === offState.id ? { ...s, offDays: daysArray } : s));
      setOffState((s) => ({ ...s, open: false }));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update off days");
    }
  }

  /* ===== SUB-STATUS modal ===== */
  const [subModal, setSubModal] = React.useState({
    open: false, id: null, name: "", subStatus: "", action: "", monthlyCounts: { short_leave: 0, half_day: 0 },
  });
  function openSubStatusModal(u, merged) {
    setSubModal({
      open: true,
      id: u._id,
      name: u.fullName || "",
      subStatus: merged.subStatus || "",
      action: merged.action || "",
      monthlyCounts: merged.monthlyCounts || { short_leave: 0, half_day: 0 },
    });
  }
  function closeSubStatusModal() {
    setSubModal((s) => ({ ...s, open: false }));
  }
  const handleSubModalStatusChange = React.useCallback(
    (value) => {
      if (!subModal.id) return;
      const normalized = value === "__clear__" ? "" : value;
      onSubStatusChange?.(subModal.id, normalized);
      if (!normalized) onActionChange?.(subModal.id, "");
      setSubModal((s) => ({ ...s, subStatus: normalized, action: normalized ? s.action : "" }));
    },
    [subModal.id, onSubStatusChange, onActionChange]
  );
  const handleSubModalActionChange = React.useCallback(
    (value) => {
      if (!subModal.id) return;
      const normalized = value === "__clear__" ? "" : value;
      onActionChange?.(subModal.id, normalized);
      setSubModal((s) => ({ ...s, action: normalized }));
    },
    [subModal.id, onActionChange]
  );
  React.useEffect(() => {
    if (!subModal.open || !subModal.id) return;
    const merged = { ...(persisted[subModal.id] || {}), ...(changes[subModal.id] || {}) };
    setSubModal((s) => ({
      ...s,
      subStatus: merged.subStatus || "",
      action: merged.action || "",
      monthlyCounts: merged.monthlyCounts || { short_leave: 0, half_day: 0 },
    }));
  }, [subModal.open, subModal.id, persisted, changes]);
  const subModalCounts = subModal.monthlyCounts || { short_leave: 0, half_day: 0 };

  /* ===== SALARY modal ===== */
  const [salaryModal, setSalaryModal] = React.useState({ open: false, id: null, name: "", value: "" });
  function openSalaryModal(u) {
    setSalaryModal({ open: true, id: u._id, name: u.fullName || "", value: u.salary ?? "" });
  }
  function closeSalaryModal() {
    setSalaryModal((s) => ({ ...s, open: false }));
  }
  async function saveSalary() {
    const raw = String(salaryModal.value).trim();
    const num = raw === "" ? null : Number(raw);
    if (!(num === null || (Number.isFinite(num) && num >= 0))) {
      return toast.error("Enter a non-negative number (or leave blank to clear).");
    }
    try {
      if (onUpdateEmployeeSalary) {
        await onUpdateEmployeeSalary(salaryModal.id, num, { silent: true });
      } else {
        await onUpdateEmployee?.(salaryModal.id, { salary: num });
      }
      toast.success("Salary updated");
      setDetails((s) => (s.open && s.id === salaryModal.id ? { ...s, salary: num } : s));
      closeSalaryModal();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update salary");
    }
  }

  /* ✅ ALWAYS compute values + run hooks BEFORE any conditional UI */
  const todayWeekday = weekdayFromYmd(dateYmd);

  const OFF_STATUS = React.useMemo(() => {
    const CANDIDATES = ["official_off", "official-off", "off", "holiday", "officialOff"];
    return (
      STATUSES.find((s) => CANDIDATES.includes(s)) ||
      STATUSES.find((s) => s.toLowerCase().includes("off")) ||
      STATUSES[0]
    );
  }, []);

  React.useEffect(() => {
    if (!todayWeekday) return;
    (rows || []).forEach((u) => {
      const offDays = Array.isArray(u.officialOffDays) ? u.officialOffDays : [];
      if (!offDays.includes(todayWeekday)) return;

      const draftStatus = changes[u._id]?.status;
      const savedStatus = persisted[u._id]?.status;
      const hasAnyStatus =
        (draftStatus != null && draftStatus !== "") ||
        (savedStatus != null && savedStatus !== "");

      if (!hasAnyStatus) onStatusChange?.(u._id, OFF_STATUS);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, todayWeekday, persisted, changes, OFF_STATUS]);

  /* ===== Details modal state & sync (hooks must always run) ===== */
  const [details, setDetails] = React.useState({ open: false, id: null, name: "", salary: null, duty: "", offDays: [] });
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
  React.useEffect(() => {
    if (!details.open || !details.id) return;
    const u = (rows || []).find((r) => r._id === details.id);
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

  const hasRows = Array.isArray(rows) && rows.length > 0;

  /* ===== RENDER ===== */
  return (
    <div className="rounded-xl border bg-card">
      <div className="overflow-x-auto">
        {!hasRows ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No employees found.</div>
        ) : (
          <Table className="w-full text-sm">
            <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <TableRow className="[&>*]:py-2">
                <TableHead className="w-[260px] uppercase tracking-wide text-xs text-muted-foreground">Name</TableHead>
                <TableHead className="w-[120px] uppercase tracking-wide text-xs text-muted-foreground">ID</TableHead>
                <TableHead className="w-[160px] uppercase tracking-wide text-xs text-muted-foreground">Department</TableHead>
                <TableHead className="w-[160px] uppercase tracking-wide text-xs text-muted-foreground">Status</TableHead>
                <TableHead className="w-[120px] uppercase tracking-wide text-xs text-muted-foreground">Check-in</TableHead>
                <TableHead className="w-[120px] uppercase tracking-wide text-xs text-muted-foreground">Check-out</TableHead>
                <TableHead className="w-[120px] uppercase tracking-wide text-xs text-muted-foreground">Total</TableHead>
                <TableHead className="w-[120px] uppercase tracking-wide text-xs text-muted-foreground">Details</TableHead>
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
                const todayIsOff = !!(weekdayFromYmd(dateYmd) && offDays.includes(weekdayFromYmd(dateYmd)));

                const isRowCurrentlyOff =
                  (merged.status || "").toLowerCase().includes("off") ||
                  merged.status === "absent" ||
                  merged.status === "leave";

                const hasDraft = !!(draft.status || draft.note || draft.checkIn || draft.checkOut);
                const checkInVal = merged.checkIn || "";
                const checkOutVal = merged.checkOut || "";

                // ==== FIXED total calculation precedence ====
                const inMin = hhmmToMinutes(checkInVal);
                const outMin = hhmmToMinutes(checkOutVal);
                const hasBoth = inMin != null && outMin != null;

                // Detect if user has edited time fields in this session
                const timesEdited = Object.prototype.hasOwnProperty.call(draft, "checkIn") ||
                                    Object.prototype.hasOwnProperty.call(draft, "checkOut");

                // Only show "Invalid" when the user is actively editing and out < in
                const invalidOrder = timesEdited && hasBoth && outMin < inMin;

                // Client-side duration (same-day only; we deliberately treat out<in as invalid while editing)
                const clientDur = hasBoth && !invalidOrder ? (outMin - inMin) : null;

                // Server authoritative minutes (from backend snapshot)
                const serverDur = merged.workedMinutes ?? null;

                // Precedence:
                // - If times were edited, prefer client calc (even if server has old value)
                // - Otherwise prefer serverDur, falling back to clientDur
                const durationMin = timesEdited
                  ? clientDur
                  : (serverDur != null ? serverDur : clientDur);

                const durationStr = durationMin == null ? "—" : minutesToHHMM(durationMin);

                const hasNote = !!(merged.note && merged.note.trim().length);
                const subStatusVal = merged.status === "present" ? merged.subStatus || "" : "";
                const actionVal = merged.status === "present" && subStatusVal ? merged.action || "" : "";
                const monthlyCounts = merged.monthlyCounts || saved.monthlyCounts || { short_leave: 0, half_day: 0 };
                const monthlyShort = Number.isFinite(monthlyCounts?.short_leave) ? monthlyCounts.short_leave : 0;
                const monthlyHalf = Number.isFinite(monthlyCounts?.half_day) ? monthlyCounts.half_day : 0;
                const showSubControls = merged.status === "present";
                const subSummary = subStatusVal
                  ? `${subStatusVal.replace(/_/g, " ")}` + (actionVal ? ` · ${actionVal.replace(/_/g, " ")}` : "")
                  : "";

                return (
                  <TableRow key={u._id} className={`odd:bg-muted/40 hover:bg-muted/60 transition-colors ${todayIsOff ? "opacity-95" : ""} [&>*]:py-2`}>
                    <TableCell className="font-medium">
                      <div className="max-w-[220px] truncate">{u.fullName}</div>
                      {todayIsOff && (
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

                    {/* Status */}
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Select
                          value={merged.status || ""}
                          onValueChange={(val) => onStatusChange?.(u._id, val === "__clear__" ? "" : val)}
                        >
                          <SelectTrigger className="h-8 w-[160px] text-sm">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent align="start" className="w-[160px] p-1">
                            <SelectItem value="__clear__" className="text-sm h-8 py-1.5 text-muted-foreground">
                              Clear selection
                            </SelectItem>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="text-sm h-8 py-1.5">
                                {LABELS[s] ?? s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {showSubControls && (
                          <div className="flex items-center gap-3">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => openSubStatusModal(u, merged)}
                              title="Configure sub status"
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                            <div className="flex flex-col leading-4">
                              <span className="text-xs text-muted-foreground">{subSummary || "No sub-status"}</span>
                              <span className="text-[10px] text-muted-foreground">
                                Short leave: {monthlyShort} | Half day: {monthlyHalf}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Check-in */}
                    <TableCell>
                      <Input
                        type="time"
                        value={checkInVal}
                        onChange={(e) => onCheckInChange?.(u._id, e.target.value)}
                        className="h-8 text-sm font-mono"
                        disabled={todayIsOff && isRowCurrentlyOff}
                        title={todayIsOff && isRowCurrentlyOff ? "Official off day — time entry disabled" : ""}
                      />
                    </TableCell>

                    {/* Check-out */}
                    <TableCell>
                      <Input
                        type="time"
                        value={checkOutVal}
                        onChange={(e) => onCheckOutChange?.(u._id, e.target.value)}
                        className="h-8 text-sm font-mono"
                        disabled={todayIsOff && isRowCurrentlyOff}
                        title={todayIsOff && isRowCurrentlyOff ? "Official off day — time entry disabled" : ""}
                      />
                    </TableCell>

                    <TableCell>
                      <div
                        className={`inline-flex min-w-[80px] items-center justify-center rounded-md border px-2 py-1 text-xs font-medium ${
                          invalidOrder ? "border-destructive text-destructive" : "text-foreground"
                        } font-mono`}
                        title={invalidOrder ? "Check-out is earlier than check-in" : ""}
                      >
                        {invalidOrder ? "Invalid" : durationStr}
                      </div>
                    </TableCell>

                    {/* Details */}
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
                        <Button variant="outline" size="sm" className="h-8" onClick={() => openNoteModal(u, merged)}>
                          {hasNote ? "Edit Note" : "Add Note"}
                        </Button>
                        {hasNote && (
                          <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide">Attached</span>
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
        )}
      </div>

      {/* Sub-status Modal */}
      <Dialog open={subModal.open} onOpenChange={(o) => (o ? null : closeSubStatusModal())}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Sub status {subModal.name ? `— ${subModal.name}` : ""}</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="space-y-1">
              <label className="text-xs uppercase text-muted-foreground">Sub-status</label>
              <Select value={subModal.subStatus || "__clear__"} onValueChange={handleSubModalStatusChange}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose sub-status" /></SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="__clear__" className="text-sm h-8 py-1.5 text-muted-foreground">None</SelectItem>
                  <SelectItem value="short_leave" className="text-sm h-8 py-1.5">Short Leave</SelectItem>
                  <SelectItem value="half_day" className="text-sm h-8 py-1.5">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase text-muted-foreground">Action</label>
              <Select
                value={subModal.subStatus ? subModal.action || "__clear__" : "__clear__"}
                onValueChange={handleSubModalActionChange}
                disabled={!subModal.subStatus}
              >
                <SelectTrigger className="h-9 text-sm" disabled={!subModal.subStatus}>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="__clear__" className="text-sm h-8 py-1.5 text-muted-foreground">
                    {subModal.subStatus ? "Clear action" : "Select action"}
                  </SelectItem>
                  <SelectItem value="paid" className="text-sm h-8 py-1.5">Paid</SelectItem>
                  <SelectItem value="unpaid" className="text-sm h-8 py-1.5">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-xs uppercase text-muted-foreground">Monthly usage</p>
              <p>Short leave: <span className="font-medium">{Number.isFinite(subModalCounts.short_leave) ? subModalCounts.short_leave : 0}</span></p>
              <p>Half day: <span className="font-medium">{Number.isFinite(subModalCounts.half_day) ? subModalCounts.half_day : 0}</span></p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeSubStatusModal}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Details Modal */}
      <Dialog open={details.open} onOpenChange={(o) => (o ? null : closeDetails())}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle>Details {details.name ? `— ${details.name}` : ""}</DialogTitle></DialogHeader>

          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Salary</div>
                <div className="text-sm font-medium">{fmtMoney(details.salary)}</div>
              </div>
              <Button variant="outline" onClick={() => {
                setSalaryModal({ open: true, id: details.id, name: details.name, value: details.salary ?? "" });
              }}>Edit Salary</Button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Duty</div>
                <div className="text-sm font-medium">{details.duty || "—"}</div>
              </div>
              <Button variant="outline" onClick={() => {
                setDutyState({ open: true, id: details.id, name: details.name, roster: details.duty || "" });
              }}>Edit Duty</Button>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Off Days</div>
                {details.offDays?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {details.offDays.map((d) => (
                      <span key={d} className="rounded-md border px-2 py-0.5 text-xs" title={d}>
                        {d.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm">—</div>
                )}
              </div>
              <Button variant="outline" onClick={() => {
                setOffState({ open: true, id: details.id, name: details.name, days: Array.isArray(details.offDays) ? details.offDays : [] });
              }}>Edit Off Days</Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDetails}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
