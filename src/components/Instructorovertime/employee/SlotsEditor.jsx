import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SlotsEditor({
  slots,
  onChangeSlot,      // (slotId, field, value)
  onAddSlot,         // ()
  onRemoveSlot,      // (slotId)
  disabled = false,
  title = "Overtime slots",
  description = "Add one or more time ranges you worked beyond your roster.",
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button type="button" variant="outline" onClick={onAddSlot} disabled={disabled}>
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
                onChange={(e) => onChangeSlot(slot.id, "start", e.target.value)}
                required
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>End time</Label>
              <Input
                type="time"
                value={slot.end}
                onChange={(e) => onChangeSlot(slot.id, "end", e.target.value)}
                required
                disabled={disabled}
              />
            </div>
            <div className="flex items-end justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onRemoveSlot(slot.id)}
                disabled={disabled || slots.length === 1}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
