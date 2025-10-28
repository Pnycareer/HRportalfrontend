export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function toMinutes(value) {
  if (!value || typeof value !== "string") return null;
  const [hourStr, minuteStr] = value.split(":");
  if (hourStr === undefined || minuteStr === undefined) return null;
  const hours = Number(hourStr);
  const minutes = Number(minuteStr);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function minutesToHuman(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 min";
  return `${minutes} min`;
}

export function hhmmTo12hLabel(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return "--";
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return hhmm;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatClockLabel(value) {
  if (!value) return "--";

  // If it's "HH:mm", keep using the local 12h label logic
  if (typeof value === "string" && /^\d{1,2}:\d{2}$/.test(value)) {
    return hhmmTo12hLabel(value);
  }

  // Try parsing as a date (ISO string, timestamp, etc.)
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  // If the string looks timezone-aware (ends with Z or has an offset),
  // render it in UTC to avoid local-time shifting.
  const isTZAware =
    typeof value === "string" && (/Z$/.test(value) || /[+-]\d{2}:\d{2}$/.test(value));

  const opts = { hour: "numeric", minute: "2-digit", hour12: true };
  return date.toLocaleTimeString([], isTZAware ? { ...opts, timeZone: "UTC" } : opts);
}

export function formatDateLabel(value) {
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

export function createSlotId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export const makeInitialSlot = () => ({ id: createSlotId(), start: "", end: "" });

// ISO -> "YYYY-MM-DD"
export function isoToDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

// ISO -> "HH:mm" (stored UTC in backend)
export function isoToHHmmUTC(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

// Find city by branch (best effort)
export function guessCityByBranch(branch, cityBranches) {
  if (!branch) return "";
  for (const city of Object.keys(cityBranches)) {
    if ((cityBranches[city] || []).includes(branch)) return city;
  }
  return "";
}
