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

// --- branch presets ---------------------------------------------------------
const CITY_BRANCHES = {
  Lahore: ["Arfa Tower", "Johar Town", "Iqbal Town", "Shahdrah"],
  Multan: ["Multan"],
  Sargodha: ["Sargodha"],
  Rawalpindi: ["Rawalpindi"],
};

// --- helpers ----------------------------------------------------------------
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
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 min";
  return `${minutes} min`;
}

function hhmmTo12hLabel(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return "--";
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return hhmm;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatClockLabel(value) {
  if (!value) return "--";
  if (typeof value === "string" && /^\d{1,2}:\d{2}$/.test(value)) {
    return hhmmTo12hLabel(value);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDateLabel(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString([], {
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

const makeInitialSlot = () => ({ id: createSlotId(), start: "", end: "" });

// --- component --------------------------------------------------------------
export default function InstructorOvertime() {
  const { user } = useAuth();
  const { claims, loading, saving, fetchClaims, createClaim } = useInstructorOvertime();

  const [form, setForm] = React.useState(() => {
    const today = new Date();
    const defaultDate = today.toISOString().slice(0, 10);
    return {
      date: defaultDate,
      city: "",
      branchName: "",
      notes: "",
    };
  });

  const [slots, setSlots] = React.useState(() => [makeInitialSlot()]);

  React.useEffect(() => {
    fetchClaims().catch(() => {});
  }, [fetchClaims]);

  // Reset branch if it no longer exists for the picked city
  React.useEffect(() => {
    if (!form.city) return;
    const allowedBranches = CITY_BRANCHES[form.city] || [];
    if (!allowedBranches.includes(form.branchName)) {
      setForm((prev) => ({ ...prev, branchName: "" }));
    }
  }, [form.city, form.branchName]);

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

  const handleSlotChange = (slotId, field, value) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === slotId ? { ...slot, [field]: value } : slot))
    );
  };

  const handleAddSlot = () => {
    setSlots((prev) => [...prev, makeInitialSlot()]);
  };

  const handleRemoveSlot = (slotId) => {
    setSlots((prev) => (prev.length <= 1 ? prev : prev.filter((slot) => slot.id !== slotId)));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.date) {
      toast.error("Please select a date.");
      return;
    }
    if (!form.city) {
      toast.error("Please select a city.");
      return;
    }
    if (!form.branchName) {
      toast.error("Please select a branch.");
      return;
    }

    const preparedSlots = [];
    for (const slot of slots) {
      const start = toMinutes(slot.start);
      const end = toMinutes(slot.end);
      if (start === null || end === null) {
        toast.error("Please provide valid start and end times for each slot.");
        return;
      }
      if (end <= start) {
        toast.error("Each overtime slot must end after it starts.");
        return;
      }
      preparedSlots.push({ start: slot.start, end: slot.end });
    }

    if (!preparedSlots.length) {
      toast.error("Add at least one overtime slot.");
      return;
    }

    try {
      await createClaim({
        date: form.date,
        branchName: form.branchName,
        notes: form.notes,
        overtimeSlots: preparedSlots,
      });

      setSlots([makeInitialSlot()]);
      setForm((prev) => ({ ...prev, notes: "" }));
    } catch {
      // errors surfaced via toast in the hook
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Instructor Overtime</h1>
        <p className="text-sm text-muted-foreground">
          Submit overtime claims and keep track of what has been reviewed by HR.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={handleFormChange("date")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <select
              id="city"
              value={form.city}
              onChange={handleFormChange("city")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
            >
              <option value="">Select city</option>
              {Object.keys(CITY_BRANCHES).map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch">Branch</Label>
            <select
              id="branch"
              value={form.branchName}
              onChange={handleFormChange("branchName")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
            >
              <option value="">Select branch</option>
              {(CITY_BRANCHES[form.city] || []).map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Total overtime minutes</Label>
            <Input value={minutesToHuman(totalMinutes)} readOnly />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Overtime slots</h3>
              <p className="text-sm text-muted-foreground">
                Add one or more time ranges you worked beyond your roster.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={handleAddSlot}>
              Add slot
            </Button>
          </div>

          <div className="space-y-3">
            {slots.map((slot) => (
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
          {loading && <span className="text-sm text-muted-foreground">Loading...</span>}
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
                  <TableHead>Slots</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim._id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {formatDateLabel(claim.date)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {claim.branchName || "--"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {minutesToHuman(claim.totalDurationMinutes)}
                    </TableCell>
                    <TableCell className="space-y-1">
                      {Array.isArray(claim.overtimeSlots) && claim.overtimeSlots.length > 0 ? (
                        claim.overtimeSlots.map((slot, index) => (
                          <div
                            key={`${claim._id}-slot-${index}`}
                            className="rounded-md bg-muted px-2 py-1 text-xs font-medium"
                          >
                            {formatClockLabel(slot.from)} to {formatClockLabel(slot.to)} (
                            {minutesToHuman(slot.durationMinutes)})
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No slots found</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal">
                      {claim.notes?.trim() || "--"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {claim.verified ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Verified
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-amber-600">
                          Pending review
                        </span>
                      )}
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
