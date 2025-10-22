import React from "react";
import jsPDF from "jspdf";

/* ======= shared styles & helpers (web UI) ======= */
const SECTION_CLASS =
  "border border-black/50 rounded-md p-4 space-y-3 text-xs text-slate-900";
const HEADING_CLASS = "text-sm font-semibold tracking-wide text-black";
const LABEL_CLASS = "font-semibold text-black";
const YEARLY_ALLOWANCE = 12;
const DEFAULT_ALLOWANCE = { allowed: YEARLY_ALLOWANCE, used: 0, remaining: YEARLY_ALLOWANCE };

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
  if (Number.isFinite(leave?.durationDays) && leave.durationDays) return `${leave.durationDays} day(s)`;
  if (Number.isFinite(leave?.durationHours) && leave.durationHours) return `${leave.durationHours} hour(s)`;
  return "N/A";
};

const toDurationValue = (leave) => {
  if (Number.isFinite(leave?.durationDays) && leave.durationDays) return leave.durationDays;
  if (Number.isFinite(leave?.durationHours) && leave.durationHours) return leave.durationHours / 8;
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
    case "approved": return "Approved";
    case "rejected": return "Rejected";
    case "pending":
    case undefined:
    case null: return "Pending review";
    default: return String(value);
  }
};

const LEAVE_TYPE_LABELS = { full: "Full", short: "Short", half: "Half" };
const LEAVE_CATEGORY_LABELS = { casual: "Casual", medical: "Medical", annual: "Annual", sick: "Sick", unpaid: "Unpaid", other: "Other" };

const SummaryCard = ({ label, value }) => (
  <div className="rounded border border-black/40 p-3 text-center">
    <p className="text-[10px] uppercase text-slate-500">{label}</p>
    <p className="text-lg font-bold text-black">{formatMetric(value)}</p>
  </div>
);

const getEntryId = (entry) => {
  const raw = entry?.id ?? entry?._id ?? entry?.leaveId ?? entry?.leave?._id ?? entry?.applicationId;
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
const PADDING_X = 40;
const PADDING_Y = 36;
const GAP_Y = 10;
const COL_GAP = 20;

const setLabelFont = (doc) => { doc.setFont("helvetica", "bold"); doc.setFontSize(10); };
const setValueFont = (doc) => { doc.setFont("helvetica", "normal"); doc.setFontSize(10); };

function calcTextHeight(doc, text, width) {
  const lines = doc.splitTextToSize(toText(text), width);
  const lineHeight = 12; // for 10pt font
  return { lines, height: lines.length * lineHeight };
}

function ensureSpace(doc, y, needed, pageH) {
  if (y + needed <= pageH - PADDING_Y) return y;
  doc.addPage();
  return PADDING_Y;
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
  let yL = y;
  let yR = y;

  leftPairs.forEach(([label, value]) => {
    const labelText = `${toText(label)}:`;
    const labelW = doc.getTextWidth(labelText + " ");
    const valueW = Math.max(10, colW - labelW - 4);
    const { lines, height } = calcTextHeight(doc, value, valueW);
    yL = ensureSpace(doc, yL, height, pageH);
    setLabelFont(doc); doc.text(labelText, colX, yL);
    setValueFont(doc); doc.text(lines, colX + labelW + 2, yL);
    yL += Math.max(12, height) + 2;
  });

  rightPairs.forEach(([label, value]) => {
    const x = colX + colW + COL_GAP;
    const labelText = `${toText(label)}:`;
    const labelW = doc.getTextWidth(labelText + " ");
    const valueW = Math.max(10, colW - labelW - 4);
    const { lines, height } = calcTextHeight(doc, value, valueW);
    yR = ensureSpace(doc, yR, height, pageH);
    setLabelFont(doc); doc.text(labelText, x, yR);
    setValueFont(doc); doc.text(lines, x + labelW + 2, yR);
    yR += Math.max(12, height) + 2;
  });

  return Math.max(yL, yR) + 2;
}

function drawTextArea(doc, y, x, w, label, value, minBoxH = 48) {
  const pageH = doc.internal.pageSize.getHeight();
  setLabelFont(doc);
  y = ensureSpace(doc, y, 14, pageH);
  doc.text(`${toText(label)}:`, x, y);

  setValueFont(doc);
  const { lines, height } = calcTextHeight(doc, value && String(value).trim() ? value : "N/A", w - 10);
  const contentH = Math.max(minBoxH - 12, height);
  const boxH = contentH + 12;

  y += 4;
  y = ensureSpace(doc, y, boxH, pageH);
  doc.setDrawColor(0); doc.setLineWidth(0.6);
  doc.rect(x, y, w, boxH);
  doc.text(lines, x + 6, y + 14);

  return y + boxH + GAP_Y;
}

function drawBadgeBlock(doc, x, y, w, title, value) {
  doc.setDrawColor(0); doc.setLineWidth(0.6);
  doc.rect(x, y, w, 48);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text(toText(title).toUpperCase(), x + 8, y + 14);
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(toText(value), x + 8, y + 32);
}

function normalizeTypeLabel(map, raw) {
  if (!raw) return "N/A";
  if (map[raw]) return map[raw];
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/* ======= single accepted form per page (properly aligned) ======= */
function drawAcceptedFormPage(doc, pageIndex, user, leave, index, annualAllowance) {
  if (pageIndex > 0) doc.addPage();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - PADDING_X * 2;
  const colW = Math.floor((contentW - COL_GAP) / 2);
  let y = PADDING_Y;

  // Header
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(`Leave Application Form #${toText(index)}`, PADDING_X, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const submitted = `Submitted: ${formatDateTime(leave?.createdAt)}`;
  const submittedW = doc.getTextWidth(submitted);
  doc.text(submitted, pageW - PADDING_X - submittedW, y);

  y += 8;
  doc.setDrawColor(0); doc.setLineWidth(0.8);
  doc.line(PADDING_X, y, pageW - PADDING_X, y);
  y += GAP_Y;

  // Employee & meta
  y = drawTwoColFields(
    doc,
    y,
    PADDING_X,
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
      ["Leave Days", `${formatDate(leave?.fromDate)} to ${formatDate(leave?.toDate)}`],
      ["No. of days/hours", formatDurationText(leave)],
    ]
  );

  // Type / Category boxes
  const typeLabel = normalizeTypeLabel(LEAVE_TYPE_LABELS, leave?.leaveType);
  const catLabel = normalizeTypeLabel(LEAVE_CATEGORY_LABELS, leave?.leaveCategory);

  setLabelFont(doc);
  y = ensureSpace(doc, y, 14, pageH);
  doc.text("Leave Type", PADDING_X, y);
  doc.text("Leave Category", PADDING_X + colW + COL_GAP, y);

  const boxTop = y + 4;
  const boxH = 28;
  const leftX = PADDING_X - 4;
  const rightX = PADDING_X + colW + COL_GAP - 4;
  const boxW = colW + 8;

  y = ensureSpace(doc, boxTop, boxH, pageH);
  doc.setDrawColor(0); doc.setLineWidth(0.6);
  doc.rect(leftX, boxTop, boxW, boxH);
  doc.rect(rightX, boxTop, boxW, boxH);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(toText(typeLabel), PADDING_X, boxTop + 18);
  doc.text(toText(catLabel), PADDING_X + colW + COL_GAP, boxTop + 18);
  y = boxTop + boxH + GAP_Y;

  // Reason (full width)
  y = drawTextArea(doc, y, PADDING_X, contentW, "Leave Application", leave?.reason, 56);

  // Tasks + Backup aligned row
  const tasksW = colW;
  const backupW = colW;
  y = ensureSpace(doc, y, 14, pageH);
  setLabelFont(doc); doc.text("Tasks During Absence:", PADDING_X, y);
  setLabelFont(doc); doc.text("Back up Staff Name:", PADDING_X + colW + COL_GAP, y);

  const tasksTop = y + 4;
  const { lines: taskLines, height: taskH } = calcTextHeight(doc, leave?.tasksDuringAbsence || "N/A", tasksW - 10);
  const taskBoxH = Math.max(48, taskH + 12);

  const backupTop = y + 4;
  const { lines: backLines, height: backH } = calcTextHeight(doc, leave?.backupStaff?.name || "N/A", backupW - 10);
  const backupBoxH = Math.max(24, backH + 12);

  const rowBoxH = Math.max(taskBoxH, backupBoxH);
  y = ensureSpace(doc, Math.min(tasksTop, backupTop), rowBoxH, pageH);

  doc.setDrawColor(0); doc.setLineWidth(0.6);
  doc.rect(PADDING_X, tasksTop, tasksW, rowBoxH);
  doc.rect(PADDING_X + colW + COL_GAP, backupTop, backupW, rowBoxH);
  setValueFont(doc);
  doc.text(taskLines, PADDING_X + 6, tasksTop + 14);
  doc.text(backLines, PADDING_X + colW + COL_GAP + 6, backupTop + 14);
  y = Math.max(tasksTop + rowBoxH, backupTop + rowBoxH) + GAP_Y;

  // Team lead row
  y = ensureSpace(doc, y, 14, pageH);
  setLabelFont(doc); doc.text("Team Lead Remarks:", PADDING_X, y);
  setLabelFont(doc); doc.text("Team Lead Decision:", PADDING_X + colW + COL_GAP, y);

  const tlTop = y + 4;
  const { lines: tlLines, height: tlH } = calcTextHeight(doc, leave?.teamLead?.remarks || "N/A", colW - 10);
  const tlBoxH = Math.max(40, tlH + 12);

  const decisionText = formatTeamLeadStatus(leave?.teamLead?.status);
  const { lines: decLines, height: decH } = calcTextHeight(doc, decisionText, colW - 10);
  const decBoxH = Math.max(40, decH + 12);

  const tlRowH = Math.max(tlBoxH, decBoxH);
  y = ensureSpace(doc, tlTop, tlRowH, pageH);
  doc.setDrawColor(0); doc.setLineWidth(0.6);
  doc.rect(PADDING_X, tlTop, colW, tlRowH);
  doc.rect(PADDING_X + colW + COL_GAP, tlTop, colW, tlRowH);
  setValueFont(doc);
  doc.text(tlLines, PADDING_X + 6, tlTop + 14);
  doc.text(decLines, PADDING_X + colW + COL_GAP + 6, tlTop + 14);
  y = tlTop + tlRowH + GAP_Y;

  // Timestamps (two col)
  y = drawTwoColFields(
    doc,
    y,
    PADDING_X,
    colW,
    [["Employee Submission Timestamp", formatDateTime(leave?.applicantSignedAt || leave?.createdAt)]],
    [["Team Lead Decision Timestamp", leave?.teamLead?.status === "pending" ? "Pending review" : formatDateTime(leave?.teamLead?.reviewedAt)]]
  );

  // HR section
  y = ensureSpace(doc, y, 20, pageH);
  setLabelFont(doc); doc.text("HR Office Use Only", PADDING_X, y);
  y += 6;
  doc.setDrawColor(0); doc.setLineWidth(0.6);
  doc.line(PADDING_X, y, pageW - PADDING_X, y);
  y += GAP_Y;

  y = drawTwoColFields(
    doc,
    y,
    PADDING_X,
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

  // Summary cards
  const allowanceInfo = leave?.hrSection?.annualAllowance || annualAllowance || DEFAULT_ALLOWANCE;
  const cardW = Math.floor((contentW - COL_GAP * 2) / 3);
  const cardsH = 48;

  y = ensureSpace(doc, y, cardsH, pageH);
  drawBadgeBlock(doc, PADDING_X, y, cardW, "Annual allowance", allowanceInfo.allowed);
  drawBadgeBlock(doc, PADDING_X + cardW + COL_GAP, y, cardW, "Approved days", toDurationValue(leave));
  drawBadgeBlock(doc, PADDING_X + (cardW + COL_GAP) * 2, y, cardW, "Remaining balance", allowanceInfo.remaining);
  y += cardsH + GAP_Y;

  // Footer
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text(`Generated on ${new Date().toLocaleString()}`, PADDING_X, pageH - PADDING_Y + 10);
}

function buildAcceptedFormsPdf(acceptedEntries, user, allowance) {
  const doc = new jsPDF("p", "pt", "a4");
  acceptedEntries.forEach((leave, i) => {
    drawAcceptedFormPage(doc, i, user, leave, i + 1, allowance);
  });
  return doc;
}

/* ======= mini UI renderer for one accepted leave (used in web list) ======= */
function LeaveFormView({ user, leave, index, annualAllowance }) {
  const allowanceInfo = annualAllowance || DEFAULT_ALLOWANCE;
  return (
    <div className="rounded border border-black/50 p-4 text-xs text-slate-900">
      <div className="mb-2 flex items-center justify-between border-b border-black/40 pb-1">
        <h3 className="font-semibold text-black">Leave Application Form #{index}</h3>
        <span className="text-[10px] text-slate-500">
          Submitted: {formatDateTime(leave?.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Employee Name" value={user?.fullName} />
        <Field label="Employee ID" value={user?.employeeId} />
        <Field label="Department" value={user?.department} />
        <Field label="Branch" value={user?.branch} />
        <Field label="Leave Days" value={`${formatDate(leave?.fromDate)} to ${formatDate(leave?.toDate)}`} />
        <Field label="Duration" value={formatDurationText(leave)} />
      </div>

      <div className="mt-2 space-y-2">
        <TextAreaField label="Leave Application" value={leave?.reason} />
        <TextAreaField label="Tasks During Absence" value={leave?.tasksDuringAbsence} />
        <TextAreaField label="Team Lead Remarks" value={leave?.teamLead?.remarks} />
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
  const acceptedEntries = entries.filter((entry) => entry.status === "accepted");
  const approvedThisMonth = acceptedEntries.reduce((sum, entry) => sum + toDurationValue(entry), 0);

  const [selectedIds, setSelectedIds] = React.useState([]);

  const toggleId = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const selectAll = () => setSelectedIds(acceptedEntries.map((e) => getEntryId(e)).filter(Boolean));
  const clearAll = () => setSelectedIds([]);

  const handleDownloadSelected = () => {
    const idSet = new Set(selectedIds);
    const chosen = acceptedEntries.filter((e) => idSet.has(getEntryId(e)));
    if (chosen.length === 0) return;
    const doc = buildAcceptedFormsPdf(chosen, data.user, allowance);
    const monthLabel = `${data.period?.month ?? ""}-${data.period?.year ?? ""}`;
    doc.save(`${data.user?.employeeId || "employee"}-${monthLabel}-accepted-forms.pdf`);
  };

  return (
    <div ref={ref} className="mx-auto w-[794px] bg-white p-8 text-slate-900 shadow-sm">
      <header className="border-b border-black/60 pb-4">
        <h1 className="text-lg font-bold tracking-wide text-black">Leave Application Summary</h1>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <Field label="Employee Name" value={data.user.fullName} />
            <Field label="Employee ID" value={data.user.employeeId} />
            <Field label="Department" value={data.user.department} />
          </div>
          <div>
            <Field label="Branch" value={data.user.branch} />
            <Field label="City" value={data.user.city} />
            <Field label="Report Period" value={`${data.period.month}/${data.period.year}`} />
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
                <th className="border-r border-black/50 px-3 py-2 text-left font-semibold">Dates</th>
                <th className="border-r border-black/50 px-3 py-2 text-left font-semibold">Type</th>
                <th className="border-r border-black/50 px-3 py-2 text-left font-semibold">Category</th>
                <th className="border-r border-black/50 px-3 py-2 text-left font-semibold">Status</th>
                <th className="border-r border-black/50 px-3 py-2 text-left font-semibold">Duration</th>
                <th className="px-3 py-2 text-left font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-center text-slate-500">
                    No requests submitted for this month.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={getEntryId(entry)} className="border-t border-black/10 odd:bg-slate-50">
                    <td className="border-r border-black/20 px-3 py-2">
                      {formatDate(entry.fromDate)} - {formatDate(entry.toDate)}
                    </td>
                    <td className="border-r border-black/20 px-3 py-2 capitalize">{entry.leaveType || "N/A"}</td>
                    <td className="border-r border-black/20 px-3 py-2 capitalize">{entry.leaveCategory || "N/A"}</td>
                    <td className="border-r border-black/20 px-3 py-2 capitalize">{entry.status || "N/A"}</td>
                    <td className="border-r border-black/20 px-3 py-2">{formatDurationText(entry)}</td>
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
              <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={selectAll}>
                Select all
              </button>
              <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={clearAll}>
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
          <p className="text-xs text-muted-foreground">No approved leave applications for this month.</p>
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
                        Select Form #{index + 1} — {formatDate(leave.fromDate)} to {formatDate(leave.toDate)}
                      </span>
                    </label>
                    {card}
                  </div>
                );
              }

              return card;
            })}

            {acceptedEntries.length > 0 && acceptedEntries.length <= 2 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const doc = buildAcceptedFormsPdf(acceptedEntries, data.user, allowance);
                    const monthLabel = `${data.period?.month ?? ""}-${data.period?.year ?? ""}`;
                    doc.save(`${data.user?.employeeId || "employee"}-${monthLabel}-accepted-forms.pdf`);
                  }}
                  className="rounded-md border bg-black px-3 py-1 text-xs font-semibold text-white"
                >
                  Download accepted forms (PDF)
                </button>
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
  const totals = data.totals || { requested: 0, approved: 0, allowed: YEARLY_ALLOWANCE, remaining: YEARLY_ALLOWANCE };

  return (
    <div ref={ref} className="mx-auto w-[794px] bg-white p-8 text-slate-900 shadow-sm">
      <header className="border-b border-black/60 pb-4">
        <h1 className="text-lg font-bold tracking-wide text-black">Annual Leave Summary</h1>
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
                <th className="border-r border-black/50 px-3 py-2 text-left font-semibold">Month</th>
                <th className="border-r border-black/50 px-3 py-2 text-left font-semibold">Requested days</th>
                <th className="px-3 py-2 text-left font-semibold">Approved days</th>
              </tr>
            </thead>
            <tbody>
              {months.map((row) => (
                <tr key={row.month} className="border-t border-black/10 odd:bg-slate-50">
                  <td className="border-r border-black/20 px-3 py-2">
                    {new Date(0, row.month - 1).toLocaleString("default", { month: "short" })}
                  </td>
                  <td className="border-r border-black/20 px-3 py-2">{formatMetric(row.requested)}</td>
                  <td className="px-3 py-2">{formatMetric(row.approved)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-black/50 bg-slate-100 font-semibold">
                <td className="border-r border-black/50 px-3 py-2 text-left">Totals</td>
                <td className="border-r border-black/50 px-3 py-2">{formatMetric(totals.requested)}</td>
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
