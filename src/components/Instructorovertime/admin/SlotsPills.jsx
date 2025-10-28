// src/components/overtime/SlotsPills.jsx
import React from "react";
import { minutesToHuman, formatClockLabel } from "@/utils/time";

function formatTimeRange(slot) {
  if (!slot?.from || !slot?.to) return "--";
  const label = `${formatClockLabel(slot.from)} -> ${formatClockLabel(slot.to)}`;
  const mins = Number(slot.durationMinutes);
  return Number.isFinite(mins) ? `${label} (${minutesToHuman(mins)})` : label;
}

export default function SlotsPills({ slots }) {
  if (!Array.isArray(slots) || slots.length === 0) {
    return <span className="text-xs text-muted-foreground">No slots recorded</span>;
  }
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {slots.map((slot, i) => (
        <span
          key={i}
          className="inline-flex items-center truncate rounded-md bg-muted px-2 py-1 text-xs font-medium"
          title={formatTimeRange(slot)}
        >
          {formatTimeRange(slot)}
        </span>
      ))}
    </div>
  );
}
