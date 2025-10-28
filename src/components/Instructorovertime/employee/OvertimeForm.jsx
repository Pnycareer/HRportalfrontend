import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SlotsEditor from "./SlotsEditor";
import { minutesToHuman, toMinutes } from "@/utils/time";
import { toast } from "sonner";

export default function OvertimeForm({
  form,
  onChangeField,     // (field) => (eventOrValue)
  slots,
  onChangeSlot,      // (slotId, field, value)
  onAddSlot,
  onRemoveSlot,
  totalMinutes,
  onSubmit,          // (payload) => Promise<void>  (will be called if validations pass)
  saving = false,
  cityBranches,
}) {
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.date) return toast.error("Please select a date.");
    if (!form.city) return toast.error("Please select a city.");
    if (!form.branchName) return toast.error("Please select a branch.");

    const preparedSlots = [];
    for (const slot of slots) {
      const start = toMinutes(slot.start);
      const end = toMinutes(slot.end);
      if (start === null || end === null) return toast.error("Please provide valid start and end times for each slot.");
      if (end <= start) return toast.error("Each overtime slot must end after it starts.");
      preparedSlots.push({ start: slot.start, end: slot.end });
    }
    if (!preparedSlots.length) return toast.error("Add at least one overtime slot.");

    await onSubmit({
      date: form.date,
      branchName: form.branchName,
      notes: form.notes,
      overtimeSlots: preparedSlots,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={form.date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={onChangeField("date")}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <select
            id="city"
            value={form.city}
            onChange={onChangeField("city")}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            required
          >
            <option value="">Select city</option>
            {Object.keys(cityBranches).map((city) => (
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
            onChange={onChangeField("branchName")}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            required
          >
            <option value="">Select branch</option>
            {(cityBranches[form.city] || []).map((branch) => (
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

      <SlotsEditor
        slots={slots}
        onChangeSlot={onChangeSlot}
        onAddSlot={onAddSlot}
        onRemoveSlot={onRemoveSlot}
      />

      <div className="space-y-2">
        <Label htmlFor="notes">Notes for admin (optional)</Label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={onChangeField("notes")}
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
  );
}
