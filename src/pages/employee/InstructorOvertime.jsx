import React from "react";
import { useAuth } from "@/context/AuthContext";
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

function toMinutes(value) {
  if (!value || typeof value !== "string") return null;
  const [hourStr, minuteStr] = value.split(":");
  if (hourStr === undefined || minuteStr === undefined) return null;
  const hours = Number(hourStr);
  const minutes = Number(minuteStr);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToHuman(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0h";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hrs}h`;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

function formatClockLabel(dateInput) {
  if (!dateInput) return "--";
  const value = new Date(dateInput);
  if (Number.isNaN(value.getTime())) return "--";
  return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(dateInput) {
  if (!dateInput) return "--";
  const value = new Date(dateInput);
  if (Number.isNaN(value.getTime())) return "--";
  return value.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function createSlotId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

const initialSlot = () => ({ id: createSlotId(), start: "", end: "" });

export default function InstructorOvertime() {
  const { user } = useAuth();
  const { claims, loading, saving, fetchClaims, createClaim } = useInstructorOvertime();

  const [form, setForm] = React.useState(() => {
    const today = new Date();
    const dateValue = today.toISOString().slice(0, 10);
    return {
      date: dateValue,
      branchName: "",
      notes: "",
    };
  });
  const [slots, setSlots] = React.useState(() => [initialSlot()]);

  React.useEffect(() => {
    fetchClaims().catch(() => {});
  }, [fetchClaims]);

  React.useEffect(() => {
    if (!user?.branch) return;
    setForm((prev) => {
      if (prev.branchName) return prev;
      return { ...prev, branchName: user.branch };
    });
  }, [user?.branch]);

  const totalMinutes = React.useMemo(() => {
    return slots.reduce((sum, slot) => {
      const start = toMinutes(slot.start);
      const end = toMinutes(slot.end);
      if (start === null || end === null || end <= start) return sum;
      return sum + (end - start);
    }, 0);
  }, [slots]);

  const handleFormChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSlotChange = (id, field, value) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot))
    );
  };

  const handleAddSlot = () => {
    setSlots((prev) => [...prev, initialSlot()]);
  };

  const handleRemoveSlot = (id) => {
    setSlots((prev) => (prev.length === 1 ? prev : prev.filter((slot) => slot.id !== id)));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.date) {
      toast.error("Please select a date for your overtime.");
      return;
    }
    if (!form.branchName.trim()) {
      toast.error("Please confirm your branch name.");
      return;
    }
    const preparedSlots = [];
    for (const slot of slots) {
      const start = toMinutes(slot.start);
      const end = toMinutes(slot.end);
      if (start === null || end === null) {
        toast.error("Please use HH:MM for all overtime slots.");
        return;
      }
      if (end <= start) {
        toast.error("Each overtime slot must end after it starts.");
        return;
      }
      preparedSlots.push({
        start: slot.start,
        end: slot.end,
      });
    }
    if (!preparedSlots.length) {
      toast.error("Add at least one overtime slot.");
      return;
    }

    try {
      await createClaim({
        date: form.date,
        branchName: form.branchName.trim(),
        overtimeSlots: preparedSlots,
        notes: form.notes.trim(),
      });
      setForm((prev) => ({ ...prev, notes: "" }));
      setSlots([initialSlot()]);
    } catch {
      // handled in hook
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Instructor Overtime</h2>
        <p className="text-sm text-muted-foreground">
          Log your overtime sessions so the admin team can review and compensate accordingly.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="overtime-date">Overtime Date</Label>
            <Input
              id="overtime-date"
              type="date"
              value={form.date}
              onChange={handleFormChange("date")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch-name">Branch</Label>
            <Input
              id="branch-name"
              value={form.branchName}
              onChange={handleFormChange("branchName")}
              placeholder="e.g. Clifton Campus"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Total Duration (preview)</Label>
            <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm font-medium text-foreground/80">
              {minutesToHuman(totalMinutes)}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Overtime Slots</h3>
              <p className="text-sm text-muted-foreground">
                Add one or more slots covering the hours you instructed beyond your roster.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={handleAddSlot}>
              Add slot
            </Button>
          </div>

          <div className="space-y-3">
            {slots.map((slot, index) => (
              <div
                key={slot.id}
                className="grid gap-3 rounded-lg border border-dashed p-4 md:grid-cols-[repeat(2,minmax(0,220px))_auto]"
              >
                <div className="space-y-2">
                  <Label>Start time</Label>
                  <Input
                    type="time"
                    value={slot.start}
                    onChange={(event) => handleSlotChange(slot.id, "start", event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>End time</Label>
                  <Input
                    type="time"
                    value={slot.end}
                    onChange={(event) => handleSlotChange(slot.id, "end", event.target.value)}
                    required
                  />
                </div>
                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleRemoveSlot(slot.id)}
                    disabled={slots.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes for admin (optional)</Label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={handleFormChange("notes")}
            className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            placeholder="Share context, class details, or any follow-up needed."
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Submitting..." : "Submit overtime claim"}
          </Button>
        </div>
      </form>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Past overtime claims</h3>
          {loading && <span className="text-sm text-muted-foreground">Loading…</span>}
        </div>

        {claims.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No overtime submissions yet. Log your first slot above.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Total time</TableHead>
                  <TableHead>Salary status</TableHead>
                  <TableHead>Slots</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim._id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {formatDateLabel(claim.date)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{claim.branchName || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {minutesToHuman(claim.totalDurationMinutes)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {Number.isFinite(claim.salary) && claim.salary > 0
                        ? `Rs ${new Intl.NumberFormat().format(claim.salary)}`
                        : "Pending"}
                    </TableCell>
                    <TableCell className="space-y-1">
                      {Array.isArray(claim.overtimeSlots) && claim.overtimeSlots.length > 0 ? (
                        claim.overtimeSlots.map((slot, index) => (
                          <div key={index} className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                            {formatClockLabel(slot.from)} → {formatClockLabel(slot.to)} (
                            {minutesToHuman(slot.durationMinutes)})
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No slots found</span>
                      )}
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
