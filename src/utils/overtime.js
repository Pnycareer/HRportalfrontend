// src/utils/overtime.js
import { numberOrNull } from "@/utils/money";

export function getDaysInMonthFromDate(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

// per-minute-rate = (monthly / days / 9 / 60)
export function calcOvertimePayout(claim) {
  if (!claim) return null;
  const monthly =
    numberOrNull(claim?.salary) ?? numberOrNull(claim?.instructor?.salary);
  const minutes = numberOrNull(claim?.totalDurationMinutes);
  const days = getDaysInMonthFromDate(claim?.date);
  if (monthly === null || minutes === null || !Number.isFinite(days) || days <= 0) {
    return null;
  }
  return (monthly / days / 9 / 60) * minutes;
}
