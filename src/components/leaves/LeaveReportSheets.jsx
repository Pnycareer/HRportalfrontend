import React from "react";
import jsPDF from "jspdf";

/* ======= shared styles & helpers (web UI) ======= */
const SECTION_CLASS =
  "border border-black/50 rounded-md p-4 space-y-3 text-xs text-slate-900";
const HEADING_CLASS = "text-sm font-semibold tracking-wide text-black";
const LABEL_CLASS = "font-semibold text-black";
const YEARLY_ALLOWANCE = 12;
const DEFAULT_ALLOWANCE = {
  allowed: YEARLY_ALLOWANCE,
  used: 0,
  remaining: YEARLY_ALLOWANCE,
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "N/A";
  return dt.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "N/A";
  return dt.toLocaleString();
};

const formatDurationText = (leave) => {
  if (Number.isFinite(leave?.durationDays) && leave.durationDays)
    return `${leave.durationDays} day(s)`;
  if (Number.isFinite(leave?.durationHours) && leave.durationHours)
    return `${leave.durationHours} hour(s)`;
  return "N/A";
};

const toDurationValue = (leave) => {
  if (Number.isFinite(leave?.durationDays) && leave.durationDays)
    return leave.durationDays;
  if (Number.isFinite(leave?.durationHours) && leave.durationHours)
    return leave.durationHours / 8;
  return 0;
};

const formatMetric = (value) => {
  if (value === null || value === undefined) return "N/A";
  const num = Number(value);
  if (!Number.isFinite(num)) return "N/A";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

const formatTeamLeadStatus = (value) => {
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
};

const LEAVE_TYPE_LABELS = { full: "Full", short: "Short", half: "Half" };
const LEAVE_CATEGORY_LABELS = {
  casual: "Casual",
  medical: "Medical",
  annual: "Annual",
  sick: "Sick",
  unpaid: "Unpaid",
  other: "Other",
};

const SummaryCard = ({ label, value }) => (
  <div className="rounded border border-black/40 p-3 text-center">
    <p className="text-[10px] uppercase text-slate-500">{label}</p>
    <p className="text-lg font-bold text-black">{formatMetric(value)}</p>
  </div>
);

const getEntryId = (entry) => {
  const raw =
    entry?.id ??
    entry?._id ??
    entry?.leaveId ??
    entry?.leave?._id ??
    entry?.applicationId;
  return raw !== undefined && raw !== null ? String(raw) : null;
};

const Field = ({ label, value }) => (
  <p>
    <span className={LABEL_CLASS}>{label}:</span> {value || "N/A"}
  </p>
);

const TextAreaField = ({ label, value }) => (
  <div>
    <p className={LABEL_CLASS}>{label}:</p>
    <p className="min-h-[48px] whitespace-pre-line rounded border border-black/40 p-2">
      {value ? value : "N/A"}
    </p>
  </div>
);

/* ========= STRING COERCION FOR jsPDF ========= */
const toText = (v) => {
  if (v === undefined || v === null) return "N/A";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "N/A";
  return String(v);
};

/* ======= jsPDF layout constants & helpers ======= */
const LAYOUT_PRESETS = [
  {
    paddingX: 60,
    paddingY: 64,
    gapY: 18,
    colGap: 34,
    headerFontSize: 22,
    labelFontSize: 11.6,
    valueFontSize: 12.6,
    smallFontSize: 10,
    footnoteFontSize: 8,
    lineHeight: 1.24,
    labelSpacing: 5,
    blockGap: 14,
    panelPadding: 14,
    panelRadius: 8,
    typeBoxHeight: 42,
    badgeHeight: 68,
    minHeights: {
      reason: 64,
      tasks: 34,
      backup: 28,
      teamLead: 34,
      decision: 34,
      remarks: 60,
    },
    textColor: [28, 31, 36],
    mutedColor: [118, 124, 133],
    borderColor: [205, 210, 218],
    fillColor: [248, 249, 251],
    lineWidth: 0.65,
  },
  {
    paddingX: 52,
    paddingY: 58,
    gapY: 16,
    colGap: 30,
    headerFontSize: 20,
    labelFontSize: 11,
    valueFontSize: 12,
    smallFontSize: 9.5,
    footnoteFontSize: 7.5,
    lineHeight: 1.2,
    labelSpacing: 4,
    blockGap: 12,
    panelPadding: 12,
    panelRadius: 7,
    typeBoxHeight: 38,
    badgeHeight: 64,
    minHeights: {
      reason: 60,
      tasks: 30,
      backup: 26,
      teamLead: 32,
      decision: 32,
      remarks: 56,
    },
    textColor: [34, 34, 36],
    mutedColor: [124, 129, 136],
    borderColor: [210, 214, 220],
    fillColor: [249, 250, 252],
    lineWidth: 0.6,
  },
  {
    paddingX: 48,
    paddingY: 52,
    gapY: 14,
    colGap: 26,
    headerFontSize: 18,
    labelFontSize: 10.5,
    valueFontSize: 11.2,
    smallFontSize: 9,
    footnoteFontSize: 7,
    lineHeight: 1.16,
    labelSpacing: 4,
    blockGap: 10,
    panelPadding: 10,
    panelRadius: 6,
    typeBoxHeight: 34,
    badgeHeight: 60,
    minHeights: {
      reason: 54,
      tasks: 26,
      backup: 22,
      teamLead: 28,
      decision: 28,
      remarks: 50,
    },
    textColor: [42, 43, 46],
    mutedColor: [128, 132, 139],
    borderColor: [214, 217, 222],
    fillColor: [252, 252, 253],
    lineWidth: 0.55,
  },
];

let ACTIVE_STYLE = LAYOUT_PRESETS[0];

const setLabelFont = (doc) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(ACTIVE_STYLE.labelFontSize);
};
const setValueFont = (doc) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(ACTIVE_STYLE.valueFontSize);
};

function calcTextHeight(doc, text, width) {
  const lines = doc.splitTextToSize(toText(text), width);
  const lineHeight = doc.getLineHeightFactor() * doc.getFontSize();
  return { lines, height: lines.length * lineHeight };
}

function ensureSpace(doc, y, needed, pageH) {
  if (y + needed <= pageH - ACTIVE_STYLE.paddingY) return y;
  doc.addPage();
  return ACTIVE_STYLE.paddingY;
}

function drawLabelValue(doc, x, y, maxW, label, value) {
  setLabelFont(doc);
  const labelText = `${toText(label)}:`;
  const labelW = doc.getTextWidth(labelText + " ");

  setValueFont(doc);
  const valueMaxW = Math.max(10, maxW - labelW - 4);
  const { lines, height } = calcTextHeight(doc, value, valueMaxW);

  const needed = Math.max(12, height);
  const pageH = doc.internal.pageSize.getHeight();
  y = ensureSpace(doc, y, needed, pageH);

  setLabelFont(doc);
  doc.text(labelText, x, y);
  setValueFont(doc);
  doc.text(lines, x + labelW + 2, y);

  return y + needed;
}

function drawTwoColFields(doc, y, colX, colW, leftPairs, rightPairs) {
  const pageH = doc.internal.pageSize.getHeight();
  const style = ACTIVE_STYLE;
  const labelHeight = style.labelFontSize * style.lineHeight;
  const valueSpacing = style.labelSpacing;
  const blockGap = style.blockGap;

  const renderColumn = (pairs = [], startX, startY) => {
    let cursor = startY;
    pairs.forEach(([label, rawValue]) => {
      setValueFont(doc);
      const { lines, height } = calcTextHeight(doc, rawValue, colW);
      const needed = labelHeight + valueSpacing + height;
      cursor = ensureSpace(doc, cursor, needed, pageH);

      setLabelFont(doc);
      doc.setTextColor(...style.textColor);
      doc.text(toText(label), startX, cursor);
      cursor += labelHeight + valueSpacing;

      setValueFont(doc);
      doc.setTextColor(...style.textColor);
      doc.text(lines, startX, cursor);
      cursor += height + blockGap;
    });
    return cursor;
  };

  const leftEnd = renderColumn(leftPairs, colX, y);
  const rightEnd = renderColumn(rightPairs, colX + colW + style.colGap, y);

  return Math.max(leftEnd, rightEnd);
}

function drawTextArea(
  doc,
  y,
  x,
  w,
  label,
  value,
  minBoxH = ACTIVE_STYLE.minHeights.reason
) {
  const pageH = doc.internal.pageSize.getHeight();
  const style = ACTIVE_STYLE;
  const boxPadding = style.panelPadding;
  const labelHeight = style.labelFontSize * style.lineHeight;
  const safeValue = value && String(value).trim() ? value : "N/A";

  setValueFont(doc);
  const { lines, height } = calcTextHeight(doc, safeValue, w - boxPadding * 2);
  const contentH = Math.max(minBoxH - labelHeight - boxPadding * 2, height);
  const needed = labelHeight + boxPadding * 2 + contentH;
  y = ensureSpace(doc, y, needed, pageH);

  setLabelFont(doc);
  doc.setTextColor(...style.textColor);
  doc.text(toText(label), x, y);

  const boxY = y + labelHeight;
  doc.setDrawColor(...style.borderColor);
  doc.setLineWidth(style.lineWidth);
  doc.setFillColor(...style.fillColor);
  doc.roundedRect(
    x,
    boxY,
    w,
    contentH + boxPadding * 2,
    style.panelRadius,
    style.panelRadius,
    "FD"
  );

  setValueFont(doc);
  doc.setTextColor(...style.textColor);
  doc.text(lines, x + boxPadding, boxY + boxPadding + style.valueFontSize);

  return boxY + contentH + boxPadding * 2 + style.gapY;
}

function drawBadgeBlock(doc, x, y, w, title, value) {
  const style = ACTIVE_STYLE;
  const blockH = style.badgeHeight;
  doc.setDrawColor(...style.borderColor);
  doc.setLineWidth(style.lineWidth);
  doc.setFillColor(...style.fillColor);
  doc.roundedRect(x, y, w, blockH, style.panelRadius, style.panelRadius, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(style.smallFontSize);
  doc.setTextColor(...style.mutedColor);
  doc.text(
    toText(title).toUpperCase(),
    x + style.panelPadding,
    y + style.panelPadding + style.smallFontSize / 2
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(style.valueFontSize + 4);
  doc.setTextColor(...style.textColor);
  const valueY = y + blockH - style.panelPadding;
  doc.text(formatMetric(value), x + style.panelPadding, valueY);
}

function normalizeTypeLabel(map, raw) {
  if (!raw) return "N/A";
  if (map[raw]) return map[raw];
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/* ======= single accepted form per page (properly aligned) ======= */
function drawAcceptedFormPage(
  doc,
  pageIndex,
  user,
  leave,
  index,
  annualAllowance
) {
  if (pageIndex > 0) doc.addPage();
  const style = ACTIVE_STYLE;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const paddingX = style.paddingX;
  const paddingY = style.paddingY;
  const gapY = style.gapY;
  const colGap = style.colGap;
  const contentW = pageW - paddingX * 2;
  const colW = Math.floor((contentW - colGap) / 2);
  let y = paddingY;

  // Header
  doc.setTextColor(...style.textColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(style.headerFontSize);
  doc.text(`Leave Application Form #${toText(index)}`, paddingX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(style.smallFontSize);
  doc.setTextColor(...style.mutedColor);
  const submitted = `Submitted: ${formatDateTime(leave?.createdAt)}`;
  const submittedW = doc.getTextWidth(submitted);
  doc.text(submitted, pageW - paddingX - submittedW, y);

  y += style.smallFontSize + 6;
  doc.setDrawColor(...style.borderColor);
  doc.setLineWidth(style.lineWidth);
  doc.line(paddingX, y, pageW - paddingX, y);
  y += gapY;
  doc.setTextColor(...style.textColor);

  // Employee & meta
  y = drawTwoColFields(
    doc,
    y,
    paddingX,
    colW,
    [
      ["Employee Name", user?.fullName],
      ["Employee ID", user?.employeeId],
      ["Designation", leave?.designation],
      ["Contact", leave?.contactNumber],
    ],
    [
      ["Department", user?.department],
      ["Branch", user?.branch],
      [
        "Leave Days",
        `${formatDate(leave?.fromDate)} to ${formatDate(leave?.toDate)}`,
      ],
      ["No. of days/hours", formatDurationText(leave)],
    ]
  );

  // Type / Category boxes
  const typeLabel = normalizeTypeLabel(LEAVE_TYPE_LABELS, leave?.leaveType);
  const catLabel = normalizeTypeLabel(
    LEAVE_CATEGORY_LABELS,
    leave?.leaveCategory
  );

  setLabelFont(doc);
  doc.setTextColor(...style.textColor);
  y = ensureSpace(doc, y, 18, pageH);
  doc.text("Leave Type", paddingX, y);
  doc.text("Leave Category", paddingX + colW + colGap, y);

  const boxTop = y + 6;
  const boxHeight = style.typeBoxHeight;
  const typePadding = style.panelPadding;
  y = ensureSpace(doc, boxTop, boxHeight, pageH);

  doc.setDrawColor(...style.borderColor);
  doc.setFillColor(...style.fillColor);
  doc.setLineWidth(style.lineWidth);
  doc.roundedRect(
    paddingX,
    boxTop,
    colW,
    boxHeight,
    style.panelRadius,
    style.panelRadius,
    "FD"
  );
  doc.roundedRect(
    paddingX + colW + colGap,
    boxTop,
    colW,
    boxHeight,
    style.panelRadius,
    style.panelRadius,
    "FD"
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(style.valueFontSize + 1);
  doc.setTextColor(...style.textColor);
  const labelY = boxTop + boxHeight / 2 + style.valueFontSize / 2;
  doc.text(toText(typeLabel), paddingX + typePadding, labelY);
  doc.text(toText(catLabel), paddingX + colW + colGap + typePadding, labelY);
  y = boxTop + boxHeight + gapY;

  // Reason (full width)
  y = drawTextArea(
    doc,
    y,
    paddingX,
    contentW,
    "Leave Application",
    leave?.reason,
    style.minHeights.reason
  );

  // Tasks + Backup aligned row
  const tasksW = colW;
  const backupW = colW;
  y = ensureSpace(doc, y, 18, pageH);
  setLabelFont(doc);
  doc.setTextColor(...style.textColor);
  doc.text("Tasks During Absence", paddingX, y);
  setLabelFont(doc);
  doc.setTextColor(...style.textColor);
  doc.text("Back-up Staff Name", paddingX + colW + colGap, y);

  const rowTop = y + 6;
  const panelPadding = style.panelPadding;
  setValueFont(doc);
  doc.setTextColor(...style.textColor);
  const { lines: taskLines, height: taskH } = calcTextHeight(
    doc,
    leave?.tasksDuringAbsence || "N/A",
    tasksW - panelPadding * 2
  );
  const { lines: backLines, height: backH } = calcTextHeight(
    doc,
    leave?.backupStaff?.name || "N/A",
    backupW - panelPadding * 2
  );
  const rowContentH = Math.max(
    Math.max(taskH, style.minHeights.tasks),
    Math.max(backH, style.minHeights.backup)
  );
  const rowBoxH = rowContentH + panelPadding * 2;

  y = ensureSpace(doc, rowTop, rowBoxH, pageH);

  doc.setDrawColor(...style.borderColor);
  doc.setFillColor(...style.fillColor);
  doc.setLineWidth(style.lineWidth);
  doc.roundedRect(
    paddingX,
    rowTop,
    tasksW,
    rowBoxH,
    style.panelRadius,
    style.panelRadius,
    "FD"
  );
  doc.roundedRect(
    paddingX + colW + colGap,
    rowTop,
    backupW,
    rowBoxH,
    style.panelRadius,
    style.panelRadius,
    "FD"
  );

  doc.text(
    taskLines,
    paddingX + panelPadding,
    rowTop + panelPadding + style.valueFontSize
  );
  doc.text(
    backLines,
    paddingX + colW + colGap + panelPadding,
    rowTop + panelPadding + style.valueFontSize
  );

  y = rowTop + rowBoxH + gapY;

  // Team lead row
  y = ensureSpace(doc, y, 18, pageH);
  setLabelFont(doc);
  doc.setTextColor(...style.textColor);
  doc.text("Team Lead Remarks", paddingX, y);
  setLabelFont(doc);
  doc.setTextColor(...style.textColor);
  doc.text("Team Lead Decision", paddingX + colW + colGap, y);

  const leaderRowTop = y + 6;
  const leaderPadding = Math.max(style.panelPadding - 2, 10);
  setValueFont(doc);
  doc.setTextColor(...style.textColor);
  const { lines: tlLines, height: tlH } = calcTextHeight(
    doc,
    leave?.teamLead?.remarks || "N/A",
    colW - leaderPadding * 2
  );
  const decisionText = formatTeamLeadStatus(leave?.teamLead?.status);
  const { lines: decLines, height: decH } = calcTextHeight(
    doc,
    decisionText,
    colW - leaderPadding * 2
  );
  const leaderContentH = Math.max(
    Math.max(tlH, style.minHeights.teamLead),
    Math.max(decH, style.minHeights.decision)
  );
  const leaderBoxH = leaderContentH + leaderPadding * 2;

  y = ensureSpace(doc, leaderRowTop, leaderBoxH, pageH);
  doc.setDrawColor(...style.borderColor);
  doc.setFillColor(...style.fillColor);
  doc.setLineWidth(style.lineWidth);
  doc.roundedRect(
    paddingX,
    leaderRowTop,
    colW,
    leaderBoxH,
    style.panelRadius,
    style.panelRadius,
    "FD"
  );
  doc.roundedRect(
    paddingX + colW + colGap,
    leaderRowTop,
    colW,
    leaderBoxH,
    style.panelRadius,
    style.panelRadius,
    "FD"
  );

  doc.text(
    tlLines,
    paddingX + leaderPadding,
    leaderRowTop + leaderPadding + style.valueFontSize
  );
  doc.text(
    decLines,
    paddingX + colW + colGap + leaderPadding,
    leaderRowTop + leaderPadding + style.valueFontSize
  );
  y = leaderRowTop + leaderBoxH + gapY;

  // Timestamps (two col)
  y = drawTwoColFields(
    doc,
    y,
    paddingX,
    colW,
    [
      [
        "Employee Submission Timestamp",
        formatDateTime(leave?.applicantSignedAt || leave?.createdAt),
      ],
    ],
    [
      [
        "Team Lead Decision Timestamp",
        leave?.teamLead?.status === "pending"
          ? "Pending review"
          : formatDateTime(leave?.teamLead?.reviewedAt),
      ],
    ]
  );

  // HR section
  y = ensureSpace(doc, y, 24, pageH);
  setLabelFont(doc);
  doc.setTextColor(...style.textColor);
  doc.text("HR Office Use Only", paddingX, y);
  y += 8;
  doc.setDrawColor(...style.borderColor);
  doc.setLineWidth(style.lineWidth);
  doc.line(paddingX, y, pageW - paddingX, y);
  y += gapY;

  y = drawTwoColFields(
    doc,
    y,
    paddingX,
    colW,
    [
      ["Leave form received by", leave?.hrSection?.receivedBy],
      ["Employment status", leave?.hrSection?.employmentStatus],
    ],
    [
      ["Received date", formatDate(leave?.hrSection?.receivedAt)],
      ["Decision", leave?.hrSection?.decisionForForm],
    ]
  );

  const hrRemarks =
    leave?.hrSection?.remarks ??
    leave?.hrSection?.hrRemarks ??
    leave?.hrRemarks;
  y = drawTextArea(
    doc,
    y,
    paddingX,
    contentW,
    "HR Remarks",
    hrRemarks,
    style.minHeights.remarks
  );

  // Summary cards
  const allowanceInfo =
    leave?.hrSection?.annualAllowance || annualAllowance || DEFAULT_ALLOWANCE;
  const cardW = Math.floor((contentW - colGap * 2) / 3);
  const cardsH = style.badgeHeight;

  y = ensureSpace(doc, y, cardsH, pageH);
  drawBadgeBlock(
    doc,
    paddingX,
    y,
    cardW,
    "Annual allowance",
    allowanceInfo.allowed
  );
  drawBadgeBlock(
    doc,
    paddingX + cardW + colGap,
    y,
    cardW,
    "Approved days",
    toDurationValue(leave)
  );
  drawBadgeBlock(
    doc,
    paddingX + (cardW + colGap) * 2,
    y,
    cardW,
    "Remaining balance",
    allowanceInfo.remaining
  );
  y += cardsH + gapY;

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(style.footnoteFontSize);
  doc.setTextColor(...style.mutedColor);
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    paddingX,
    pageH - paddingY + style.footnoteFontSize + 2
  );
}

function buildAcceptedFormsPdf(acceptedEntries, user, allowance) {
  let lastDoc = null;
  const expectedPages = Math.max(acceptedEntries.length, 1);

  for (let i = 0; i < LAYOUT_PRESETS.length; i += 1) {
    ACTIVE_STYLE = LAYOUT_PRESETS[i];
    const doc = new jsPDF("p", "pt", "a4");
    acceptedEntries.forEach((leave, index) => {
      drawAcceptedFormPage(doc, index, user, leave, index + 1, allowance);
    });
    lastDoc = doc;
    if (
      acceptedEntries.length === 0 ||
      doc.getNumberOfPages() === expectedPages
    ) {
      return doc;
    }
  }

  return lastDoc;
}

/* ======= filename helpers (NEW) ======= */
const slug = (s) =>
  String(s || "employee")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const formatDateForFile = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "unknown-date";
  // 11-06-2025 style (MM-DD-YYYY) to keep it FS-safe
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
};

const singleFormFilename = (user, entry) => {
  const name = slug(user?.fullName);
  const start = formatDateForFile(entry?.fromDate);
  return `${name}-${start}-leave-form.pdf`;
};

const multiFormFilename = (user, period) => {
  const name = slug(user?.fullName);
  const month = String(period?.month ?? "").padStart(2, "0");
  const year = period?.year ?? "";
  return `${name}-${month}-${year}-accepted-forms.pdf`;
};

/* ======= mini UI renderer for one accepted leave (used in web list) ======= */
function LeaveFormView({ user, leave, index, annualAllowance }) {
  const allowanceInfo = annualAllowance || DEFAULT_ALLOWANCE;
  return (
    <div className="rounded border border-black/50 p-4 text-xs text-slate-900">
      <div className="mb-2 flex items-center justify-between border-b border-black/40 pb-1">
        <h3 className="font-semibold text-black">
          Leave Application Form #{index}
        </h3>
        <span className="text-[10px] text-slate-500">
          Submitted: {formatDateTime(leave?.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Employee Name" value={user?.fullName} />
        <Field label="Employee ID" value={user?.employeeId} />
        <Field label="Department" value={user?.department} />
        <Field label="Branch" value={user?.branch} />
        <Field
          label="Leave Days"
          value={`${formatDate(leave?.fromDate)} to ${formatDate(
            leave?.toDate
          )}`}
        />
        <Field label="Duration" value={formatDurationText(leave)} />
      </div>

      <div className="mt-2 space-y-2">
        <TextAreaField label="Leave Application" value={leave?.reason} />
        <TextAreaField
          label="Tasks During Absence"
          value={leave?.tasksDuringAbsence}
        />
        <TextAreaField
          label="Team Lead Remarks"
          value={leave?.teamLead?.remarks}
        />
        <TextAreaField
          label="HR Remarks"
          value={
            leave?.hrSection?.remarks ??
            leave?.hrSection?.hrRemarks ??
            leave?.hrRemarks
          }
        />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <SummaryCard label="Annual Allowance" value={allowanceInfo.allowed} />
        <SummaryCard label="Approved Days" value={toDurationValue(leave)} />
        <SummaryCard label="Remaining" value={allowanceInfo.remaining} />
      </div>
    </div>
  );
}

/* ======= Monthly (selection + jsPDF export) ======= */
export const MonthlyLeaveReport = React.forwardRef(function MonthlyLeaveReport(
  { data },
  ref
) {
  if (!data) return null;

  const allowance = data.allowance || DEFAULT_ALLOWANCE;
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const acceptedEntries = entries.filter(
    (entry) => entry.status === "accepted"
  );
  const approvedThisMonth = acceptedEntries.reduce(
    (sum, entry) => sum + toDurationValue(entry),
    0
  );

  const [selectedIds, setSelectedIds] = React.useState([]);

  const toggleId = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const selectAll = () =>
    setSelectedIds(acceptedEntries.map((e) => getEntryId(e)).filter(Boolean));
  const clearAll = () => setSelectedIds([]);

  const handleDownloadSelected = () => {
    const idSet = new Set(selectedIds);
    const chosen = acceptedEntries.filter((e) => idSet.has(getEntryId(e)));
    if (chosen.length === 0) return;

    // if user picked exactly one form => name: <employee>-<start>-leave-form.pdf
    if (chosen.length === 1) {
      const doc = buildAcceptedFormsPdf(chosen, data.user, allowance);
      doc.save(singleFormFilename(data.user, chosen[0]));
      return;
    }

    // else: keep a grouped name per month/year
    const doc = buildAcceptedFormsPdf(chosen, data.user, allowance);
    doc.save(multiFormFilename(data.user, data.period));
  };

  return (
    <div
      ref={ref}
      className="mx-auto w-[794px] bg-white p-8 text-slate-900 shadow-sm"
    >
      <header className="border-b border-black/60 pb-4">
        <h1 className="text-lg font-bold tracking-wide text-black">
          Leave Application Summary
        </h1>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <Field label="Employee Name" value={data.user.fullName} />
            <Field label="Employee ID" value={data.user.employeeId} />
            <Field label="Department" value={data.user.department} />
          </div>
          <div>
            <Field label="Branch" value={data.user.branch} />
            <Field label="City" value={data.user.city} />
            <Field
              label="Report Period"
              value={`${data.period.month}/${data.period.year}`}
            />
          </div>
        </div>
      </header>

      <section className={`${SECTION_CLASS} mt-4`}>
        <h2 className={HEADING_CLASS}>Annual allowance status</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Annual allowance" value={allowance.allowed} />
          <SummaryCard label="Approved this year" value={allowance.used} />
          <SummaryCard label="Approved this month" value={approvedThisMonth} />
          <SummaryCard label="Remaining balance" value={allowance.remaining} />
        </div>

        <div className="mt-4 overflow-hidden rounded border border-black/50">
          <table className="min-w-full table-fixed border-collapse text-xs">
            <thead className="bg-slate-100 text-black">
              <tr className="border-b border-black/50">
                <th className="border-r border-black/50 px-3 py-2 text-left font-semibold">
                  Dates
                </th>
                <th className="border-r border-black/50 px-3 py-2 text-left font-semibold">
                  Type
                </th>
                <th className="border-r border-black/50 px-3 py-2 text-left font-semibold">
                  Category
                </th>
                <th className="border-r border-black/50 px-3 py-2 text-left font-semibold">
                  Status
                </th>
                <th className="border-r border-black/50 px-3 py-2 text-left font-semibold">
                  Duration
                </th>
                <th className="px-3 py-2 text-left font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-3 text-center text-slate-500"
                  >
                    No requests submitted for this month.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={getEntryId(entry)}
                    className="border-t border-black/10 odd:bg-slate-50"
                  >
                    <td className="border-r border-black/20 px-3 py-2">
                      {formatDate(entry.fromDate)} - {formatDate(entry.toDate)}
                    </td>
                    <td className="border-r border-black/20 px-3 py-2 capitalize">
                      {entry.leaveType || "N/A"}
                    </td>
                    <td className="border-r border-black/20 px-3 py-2 capitalize">
                      {entry.leaveCategory || "N/A"}
                    </td>
                    <td className="border-r border-black/20 px-3 py-2 capitalize">
                      {entry.status || "N/A"}
                    </td>
                    <td className="border-r border-black/20 px-3 py-2">
                      {formatDurationText(entry)}
                    </td>
                    <td className="px-3 py-2">{entry.reason || "N/A"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className={HEADING_CLASS}>Accepted leave forms</h2>

          {acceptedEntries.length > 2 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border px-2 py-1 text-xs"
                onClick={selectAll}
              >
                Select all
              </button>
              <button
                type="button"
                className="rounded-md border px-2 py-1 text-xs"
                onClick={clearAll}
              >
                Clear
              </button>
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={handleDownloadSelected}
                className="rounded-md border bg-black px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Download selected (PDF)
              </button>
            </div>
          )}
        </div>

        {acceptedEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No approved leave applications for this month.
          </p>
        ) : (
          <div className="space-y-6">
            {acceptedEntries.map((leave, index) => {
              const id = getEntryId(leave);
              const card = (
                <LeaveFormView
                  key={id}
                  user={data.user}
                  leave={leave}
                  index={index + 1}
                  annualAllowance={allowance}
                />
              );

              if (acceptedEntries.length > 2) {
                return (
                  <div key={id} className="relative">
                    <label className="mb-2 flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-black"
                        checked={selectedIds.includes(id)}
                        onChange={() => toggleId(id)}
                      />
                      <span className="text-slate-700">
                        Select Form #{index + 1} — {formatDate(leave.fromDate)}{" "}
                        to {formatDate(leave.toDate)}
                      </span>
                    </label>
                    {card}
                  </div>
                );
              }

              return card;
            })}

            {acceptedEntries.length > 0 && acceptedEntries.length <= 2 && (
              <div className="flex flex-wrap gap-2 justify-end">
                {/* Download all shown (<=2) as one doc — name falls back to month */}
                <button
                  type="button"
                  onClick={() => {
                    const doc = buildAcceptedFormsPdf(
                      acceptedEntries,
                      data.user,
                      allowance
                    );
                    doc.save(
                      acceptedEntries.length === 1
                        ? singleFormFilename(data.user, acceptedEntries[0])
                        : multiFormFilename(data.user, data.period)
                    );
                  }}
                  className="rounded-md border bg-black px-3 py-1 text-xs font-semibold text-white"
                >
                  Download accepted forms (PDF)
                </button>

                {/* Optional: quick per-card single download buttons */}
                {acceptedEntries.length === 2 &&
                  acceptedEntries.map((entry) => (
                    <button
                      key={getEntryId(entry)}
                      type="button"
                      onClick={() => {
                        const doc = buildAcceptedFormsPdf(
                          [entry],
                          data.user,
                          allowance
                        );
                        doc.save(singleFormFilename(data.user, entry));
                      }}
                      className="rounded-md border px-3 py-1 text-xs"
                    >
                      Download Form: {formatDate(entry.fromDate)}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
});

/* ======= Yearly (unchanged) ======= */
export const YearlyLeaveReport = React.forwardRef(function YearlyLeaveReport(
  { data },
  ref
) {
  if (!data) return null;

  const months = Array.isArray(data.months) ? data.months : [];
  const totals = data.totals || {
    requested: 0,
    approved: 0,
    allowed: YEARLY_ALLOWANCE,
    remaining: YEARLY_ALLOWANCE,
  };

  return (
    <div
      ref={ref}
      className="mx-auto w-[794px] bg-white p-8 text-slate-900 shadow-sm"
    >
      <header className="border-b border-black/60 pb-4">
        <h1 className="text-lg font-bold tracking-wide text-black">
          Annual Leave Summary
        </h1>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <Field label="Employee Name" value={data.user.fullName} />
            <Field label="Employee ID" value={data.user.employeeId} />
            <Field label="Department" value={data.user.department} />
          </div>
          <div>
            <Field label="Branch" value={data.user.branch} />
            <Field label="City" value={data.user.city} />
            <Field label="Year" value={data.year} />
          </div>
        </div>
      </header>

      <section className={`${SECTION_CLASS} mt-4`}>
        <h2 className={HEADING_CLASS}>Monthly utilisation</h2>
        <div className="overflow-hidden rounded border border-black/50">
          <table className="min-w-full table-fixed border-collapse text-xs text-black">
            <thead className="bg-slate-100">
              <tr className="border-b border-black/50">
                <th className="border-r border-black/50 px-3 py-2 text-left font-semibold">
                  Month
                </th>
                <th className="border-r border-black/50 px-3 py-2 text-left font-semibold">
                  Requested days
                </th>
                <th className="px-3 py-2 text-left font-semibold">
                  Approved days
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map((row) => (
                <tr
                  key={row.month}
                  className="border-t border-black/10 odd:bg-slate-50"
                >
                  <td className="border-r border-black/20 px-3 py-2">
                    {new Date(0, row.month - 1).toLocaleString("default", {
                      month: "short",
                    })}
                  </td>
                  <td className="border-r border-black/20 px-3 py-2">
                    {formatMetric(row.requested)}
                  </td>
                  <td className="px-3 py-2">{formatMetric(row.approved)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-black/50 bg-slate-100 font-semibold">
                <td className="border-r border-black/50 px-3 py-2 text-left">
                  Totals
                </td>
                <td className="border-r border-black/50 px-3 py-2">
                  {formatMetric(totals.requested)}
                </td>
                <td className="px-3 py-2">{formatMetric(totals.approved)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className={`${SECTION_CLASS} mt-4`}>
        <h2 className={HEADING_CLASS}>Allowance overview</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <SummaryCard label="Yearly quota" value={totals.allowed} />
          <SummaryCard label="Approved days" value={totals.approved} />
          <SummaryCard label="Remaining balance" value={totals.remaining} />
        </div>
      </section>
    </div>
  );
});
