import React from "react";

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
  if (Number.isFinite(leave?.durationDays) && leave.durationDays) {
    return `${leave.durationDays} day(s)`;
  }
  if (Number.isFinite(leave?.durationHours) && leave.durationHours) {
    return `${leave.durationHours} hour(s)`;
  }
  return "N/A";
};

const toDurationValue = (leave) => {
  if (Number.isFinite(leave?.durationDays) && leave.durationDays) {
    return leave.durationDays;
  }
  if (Number.isFinite(leave?.durationHours) && leave.durationHours) {
    return leave.durationHours / 8;
  }
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
      return value;
  }
};

const LEAVE_TYPE_LABELS = {
  full: "Full",
  short: "Short",
  half: "Half",
};

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

function LeaveFormView({ user, leave, index, annualAllowance }) {
  const hrSection = leave.hrSection || {};
  const allowanceInfo =
    hrSection.annualAllowance || annualAllowance || DEFAULT_ALLOWANCE;
  const durationValue = toDurationValue(leave);

  return (
    <div className="border border-black/60 p-4 text-xs text-black">
      <div className="flex items-center justify-between border-b border-black/60 pb-2">
        <h3 className="text-sm font-semibold">
          Leave Application Form #{index}
        </h3>
        <p className="text-xs text-slate-600">
          Submitted: {formatDateTime(leave.createdAt)}
        </p>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Field label="Employee Name" value={user.fullName} />
        <Field label="Employee ID" value={user.employeeId} />
        <Field label="Designation" value={leave.designation} />
        <Field label="Contact" value={leave.contactNumber} />
        <Field label="Department" value={user.department} />
        <Field label="Branch" value={user.branch} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border border-black/50 p-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase text-slate-700">
            Leave Type
          </p>
          <p className="text-sm font-semibold text-black">
            {LEAVE_TYPE_LABELS[leave.leaveType] ||
              (leave.leaveType
                ? leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)
                : "N/A")}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase text-slate-700">
            Leave Category
          </p>
          <p className="text-sm font-semibold text-black">
            {LEAVE_CATEGORY_LABELS[leave.leaveCategory] ||
              (leave.leaveCategory
                ? leave.leaveCategory.charAt(0).toUpperCase() + leave.leaveCategory.slice(1)
                : "N/A")}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Field
          label="Leave Days"
          value={`${formatDate(leave.fromDate)} to ${formatDate(
            leave.toDate
          )}`}
        />
        <Field label="No. of days/hours" value={formatDurationText(leave)} />
      </div>

      <TextAreaField label="Leave Application" value={leave.reason} />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <TextAreaField
          label="Tasks During Absence"
          value={leave.tasksDuringAbsence}
        />
        <div className="space-y-2">
          <Field label="Back up Staff Name" value={leave.backupStaff?.name} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <TextAreaField
          label="Team Lead Remarks"
          value={leave.teamLead?.remarks}
        />
        <Field
          label="Team Lead Decision"
          value={formatTeamLeadStatus(leave.teamLead?.status)}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Field
          label="Employee Submission Timestamp"
          value={formatDateTime(leave.applicantSignedAt || leave.createdAt)}
        />
        <Field
          label="Team Lead Decision Timestamp"
          value={
            leave.teamLead?.status === "pending"
              ? "Pending review"
              : formatDateTime(leave.teamLead?.reviewedAt)
          }
        />
      </div>

      <div className="mt-4 border-t border-black/60 pt-3">
        <h4 className="text-xs font-semibold uppercase text-slate-700">
          HR Office Use Only
        </h4>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Field
            label="Leave form received by"
            value={hrSection.receivedBy}
          />
          <Field label="Received date" value={formatDate(hrSection.receivedAt)} />
          <Field
            label="Employment status"
            value={hrSection.employmentStatus}
          />
          <Field label="Decision" value={hrSection.decisionForForm} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Annual allowance"
            value={allowanceInfo.allowed}
          />
          <SummaryCard
            label="Approved days"
            value={durationValue}
          />
          <SummaryCard
            label="Remaining balance"
            value={allowanceInfo.remaining}
          />
        </div>

      </div>
    </div>
  );
}

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

  return (
    <div ref={ref} className="mx-auto w-[794px] bg-white p-8 text-slate-900 shadow-sm">
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
                    key={entry.id}
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

      <section className="mt-6 space-y-6">
        <h2 className={HEADING_CLASS}>Accepted leave forms</h2>
        {acceptedEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No approved leave applications for this month.
          </p>
        ) : (
          acceptedEntries.map((leave, index) => (
            <LeaveFormView
              key={leave.id}
              user={data.user}
              leave={leave}
              index={index + 1}
              annualAllowance={allowance}
            />
          ))
        )}
      </section>
    </div>
  );
});

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
    <div ref={ref} className="mx-auto w-[794px] bg-white p-8 text-slate-900 shadow-sm">
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




