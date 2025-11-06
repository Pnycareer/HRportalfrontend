export const YEARLY_ALLOWANCE = 12;
export const DEFAULT_ALLOWANCE = {
  allowed: YEARLY_ALLOWANCE,
  used: 0,
  remaining: YEARLY_ALLOWANCE,
};

export const LEAVE_TYPE_LABELS = { full: "Full", short: "Short", half: "Half" };
export const LEAVE_CATEGORY_LABELS = {
  casual: "Casual",
  medical: "Medical",
  annual: "Annual",
  sick: "Sick",
  unpaid: "Unpaid",
  other: "Other",
};

export function formatDate(value) {
  if (!value) return "N/A";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "N/A";
  return dt.toLocaleDateString();
}

export function formatDateTime(value) {
  if (!value) return "N/A";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "N/A";
  return dt.toLocaleString();
}

export function formatDurationText(leave) {
  if (Number.isFinite(leave?.durationDays) && leave.durationDays) {
    return `${leave.durationDays} day(s)`;
  }
  if (Number.isFinite(leave?.durationHours) && leave.durationHours) {
    return `${leave.durationHours} hour(s)`;
  }
  return "N/A";
}

export function toDurationValue(leave) {
  if (Number.isFinite(leave?.durationDays) && leave.durationDays) {
    return leave.durationDays;
  }
  if (Number.isFinite(leave?.durationHours) && leave.durationHours) {
    return leave.durationHours / 8;
  }
  return 0;
}

export function formatMetric(value) {
  if (value === null || value === undefined) return "N/A";
  const num = Number(value);
  if (!Number.isFinite(num)) return "N/A";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

export function formatTeamLeadStatus(value) {
  switch (value) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "pending":
    case undefined:
    case null:
      return "Pending review";
    default:
      return String(value);
  }
}

export function normalizeTypeLabel(map, raw) {
  if (!raw) return "N/A";
  if (map[raw]) return map[raw];
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function getEntryId(entry) {
  const raw =
    entry?.id ??
    entry?._id ??
    entry?.leaveId ??
    entry?.leave?._id ??
    entry?.applicationId;
  return raw !== undefined && raw !== null ? String(raw) : null;
}