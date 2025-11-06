// utils/time.js

import { BRANCHES_BY_CITY } from "@/components/constants/locations";

/* ===================== basics you already had ===================== */

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

// alias to satisfy imports that expect `toMinutes`
export function toMinutes(hhmm) {
  return hhmmToMinutes(hhmm);
}

// minutes -> "HH:mm" (keeps sign if negatives)
export function minutesToHHMM(mins) {
  if (mins == null || Number.isNaN(mins)) return "";
  const sign = mins < 0 ? "-" : "";
  const abs = Math.abs(mins);
  const h = pad2(Math.floor(abs / 60));
  const m = pad2(abs % 60);
  return `${sign}${h}:${m}`;
}

// human label like "45 min"
export function minutesToHuman(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 min";
  return `${minutes} min`;
}

// simple local YYYY-MM-DD
export function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/* ===================== helpers you referenced elsewhere ===================== */

// "HH:mm" -> "h:mm AM/PM"
export function hhmmTo12hLabel(hhmm) {
  const mins = hhmmToMinutes(hhmm);
  if (mins == null) return "--";
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad2(m)} ${ampm}`;
}

export function formatClockLabel(value) {
  if (!value) return "--";

  // If it's "HH:mm", format locally as 12h
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

/* ===================== new exports your build expects ===================== */

// ISO -> "YYYY-MM-DD" (UTC safe for input[type=date])
export function isoToDateInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  return `${y}-${m}-${day}`;
}

// ISO -> "HH:mm" in UTC
export function isoToHHmmUTC(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

// determinstic id for a slot
export function createSlotId(dateYmd, startHHmm, endHHmm) {
  return [dateYmd || "", startHHmm || "", endHHmm || ""].join("|");
}

// guess city by branch using your BRANCHES_BY_CITY
export function guessCityByBranch(branch) {
  if (!branch) return "";
  for (const [city, list] of Object.entries(BRANCHES_BY_CITY || {})) {
    if ((list || []).includes(branch)) return city;
  }
  return "";
}

export function makeInitialSlot(dateYmd = "", opts = {}) {
  const {
    start = "",
    end = "",
    branch = "",
    city = guessCityByBranch(branch) || "",
    note = "",
  } = opts;

  return {
    id: crypto.randomUUID(),   // unique per slot
    date: dateYmd,
    start: normalizeHHmm(start),
    end: normalizeHHmm(end),
    note,
    branch,
    city,
  };
}

