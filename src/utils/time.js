// utils/time.js

// zero-pad
export function pad2(n) {
  return String(n).padStart(2, "0");
}

// "h:m" / "HH:mm" -> "HH:mm" or ""
export function normalizeHHmm(value) {
  if (!value || typeof value !== "string") return "";
  const [h, m] = value.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return "";
  if (h < 0 || h > 23 || m < 0 || m > 59) return "";
  return `${pad2(h)}:${pad2(m)}`;
}

// "HH:mm" -> minutes since midnight (0..1439) or null
export function hhmmToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

// minutes -> "HH:mm" (keeps sign if you pass negatives, but you shouldn't here)
export function minutesToHHMM(mins) {
  if (mins == null || Number.isNaN(mins)) return "";
  const sign = mins < 0 ? "-" : "";
  const abs = Math.abs(mins);
  const h = pad2(Math.floor(abs / 60));
  const m = pad2(abs % 60);
  return `${sign}${h}:${m}`;
}

// simple local YYYY-MM-DD
export function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}



// checking needed

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


export function minutesToHuman(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 min";
  return `${minutes} min`;
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
