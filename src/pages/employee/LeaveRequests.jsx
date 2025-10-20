import React from "react";
import { useAuth } from "@/context/AuthContext";
import {
  useLeaves,
  leaveTypeOptions,
  leaveCategoryOptions,
  leaveStatusOptions,
} from "@/hooks/useLeaves";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";
import { toast } from "sonner";

const statusTone = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  accepted: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border border-rose-200",
  on_hold: "bg-sky-100 text-sky-800 border border-sky-200",
};

const teamLeadStatusTone = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border border-rose-200",
};

const teamLeadStatusLabel = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function parseTimeToMinutes(value) {
  if (!value || typeof value !== "string") {
    return null;
  }
  const [hourStr, minuteStr] = value.split(":");
  if (hourStr === undefined || minuteStr === undefined) {
    return null;
  }
  const hours = Number(hourStr);
  const minutes = Number(minuteStr);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

const halfDaySessionOptions = [
  { value: "first_half", label: "First Half" },
  { value: "second_half", label: "Second Half" },
];

const initialForm = {
  leaveType: "full",
  leaveCategory: "casual",
  fromDate: "",
  toDate: "",
  leaveReason: "",
  durationHours: "",
  shortLeaveStartTime: "",
  shortLeaveEndTime: "",
  halfDaySession: "",
  teamLeadId: "",
  tasksDuringAbsence: "",
  backupStaffName: "",
};

export default function LeaveRequests() {
  const { user } = useAuth();
  const { leaves, loading, saving, fetchLeaves, applyLeave } = useLeaves();
  const [form, setForm] = React.useState(initialForm);
  const [durationDays, setDurationDays] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [teamLeads, setTeamLeads] = React.useState([]);
  const [loadingTeamLeads, setLoadingTeamLeads] = React.useState(false);

  React.useEffect(() => {
    fetchLeaves().catch(() => {});
  }, [fetchLeaves]);

  React.useEffect(() => {
    let active = true;
    setLoadingTeamLeads(true);
    api
      .get("/api/users/team-leads")
      .then(({ data }) => {
        if (!active) {
          return;
        }
        const list = Array.isArray(data) ? data : [];
        setTeamLeads(list);
      })
      .catch((error) => {
        const message =
          error?.response?.data?.message || error?.message || "Failed to load team leads";
        toast.error(message);
      })
      .finally(() => {
        if (active) {
          setLoadingTeamLeads(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (loadingTeamLeads) return;
    if (!teamLeads.length) return;
    setForm((prev) => {
      if (prev.teamLeadId) return prev;
      const first = teamLeads[0];
      return {
        ...prev,
        teamLeadId: String(first._id || first.id),
      };
    });
  }, [loadingTeamLeads, teamLeads]);

  React.useEffect(() => {
    if (form.fromDate && form.toDate) {
      const start = new Date(form.fromDate);
      const end = new Date(form.toDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
        const diff = Math.round((end - start) / 86400000);
        setDurationDays(diff + 1);
        return;
      }
    }
    setDurationDays(null);
  }, [form.fromDate, form.toDate]);

  React.useEffect(() => {
    setForm((prev) => {
      const updates = {};
      if (
        form.leaveType !== "short" &&
        (prev.durationHours || prev.shortLeaveStartTime || prev.shortLeaveEndTime)
      ) {
        updates.durationHours = "";
        updates.shortLeaveStartTime = "";
        updates.shortLeaveEndTime = "";
      }
      if (form.leaveType !== "half" && prev.halfDaySession) {
        updates.halfDaySession = "";
      }
      if (!Object.keys(updates).length) {
        return prev;
      }
      return { ...prev, ...updates };
    });
  }, [form.leaveType]);

  const handleChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.fromDate || !form.toDate) {
      toast.error("Please choose both start and end dates");
      return;
    }
    if (new Date(form.toDate) < new Date(form.fromDate)) {
      toast.error("End date cannot be earlier than start date");
      return;
    }
    if (!form.teamLeadId) {
      toast.error("Please select the team lead who will review your leave");
      return;
    }
    if (!form.tasksDuringAbsence.trim()) {
      toast.error("Please describe the tasks that need cover during your absence");
      return;
    }
    if (!form.backupStaffName.trim()) {
      toast.error("Please share who will be the primary backup colleague");
      return;
    }
    let durationHoursValue = null;
    let shortLeaveWindow = null;
    let halfDaySessionValue = null;
    if (form.leaveType === "short") {
      const hours = Number(form.durationHours);
      if (!Number.isFinite(hours) || hours <= 0) {
        toast.error("Enter a valid short leave duration (up to 2 hours)");
        return;
      }
      if (hours > 2) {
        toast.error("Short leave cannot exceed 2 hours");
        return;
      }
      const startMinutes = parseTimeToMinutes(form.shortLeaveStartTime);
      const endMinutes = parseTimeToMinutes(form.shortLeaveEndTime);
      if (
        startMinutes === null ||
        endMinutes === null ||
        Number.isNaN(startMinutes) ||
        Number.isNaN(endMinutes)
      ) {
        toast.error("Please select valid start and end times for your short leave");
        return;
      }
      if (endMinutes <= startMinutes) {
        toast.error("Short leave end time must be after the start time");
        return;
      }
      const diffMinutes = endMinutes - startMinutes;
      if (diffMinutes % 30 !== 0) {
        toast.error("Short leave hours must be in 30-minute increments");
        return;
      }
      const calculatedHours = diffMinutes / 60;
      const normalizedExpected = Math.round(hours * 2) / 2;
      const normalizedCalculated = Math.round(calculatedHours * 2) / 2;
      if (Math.abs(normalizedCalculated - normalizedExpected) > 0.001) {
        toast.error("Selected hours must match the duration entered");
        return;
      }
      durationHoursValue = hours;
      shortLeaveWindow = {
        startTime: form.shortLeaveStartTime,
        endTime: form.shortLeaveEndTime,
      };
    } else if (form.leaveType === "half") {
      if (!form.halfDaySession) {
        toast.error("Please choose whether the half day is in the first or second half");
        return;
      }
      const allowed = new Set(halfDaySessionOptions.map((option) => option.value));
      if (!allowed.has(form.halfDaySession)) {
        toast.error("Select a valid half-day session");
        return;
      }
      halfDaySessionValue = form.halfDaySession;
    }
    setSubmitting(true);
    try {
      const payload = {
        leaveType: form.leaveType,
        leaveCategory: form.leaveCategory,
        fromDate: form.fromDate,
        toDate: form.toDate,
        leaveReason: form.leaveReason,
        durationDays,
        durationHours: durationHoursValue,
        shortLeaveWindow,
        halfDaySession: halfDaySessionValue,
        teamLeadId: form.teamLeadId,
        tasksDuringAbsence: form.tasksDuringAbsence.trim(),
        backupStaff: {
          name: form.backupStaffName.trim(),
        },
      };
      await applyLeave(payload);
      setForm((prev) => ({
        ...initialForm,
        teamLeadId: prev.teamLeadId,
      }));
      setDurationDays(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Leave Centre
        </h1>
        <p className="text-sm text-muted-foreground">
          Submit new leave requests and monitor approvals in real time.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-2xl border border-white/10 bg-background/70 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Apply for leave</h2>
              <p className="text-xs text-muted-foreground">
                Your profile details are attached automatically for HR review.
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p className="font-medium">{user?.fullName}</p>
              <span>Employee ID: {user?.employeeId ?? "?"}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Leave type</Label>
                <Select
                  value={form.leaveType}
                  onValueChange={(value) => handleChange("leaveType")(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Leave category</Label>
                <Select
                  value={form.leaveCategory}
                  onValueChange={(value) => handleChange("leaveCategory")(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveCategoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={form.fromDate}
                  onChange={handleChange("fromDate")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={form.toDate}
                  onChange={handleChange("toDate")}
                  required
                  min={form.fromDate}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Duration (days)</Label>
                <Input value={durationDays ?? ""} readOnly placeholder="?" />
              </div>
              {form.leaveType === "short" && (
                <div className="space-y-2">
                  <Label>Duration (hours)</Label>
                  <Input
                    type="number"
                    min="0.5"
                    max="2"
                    step="0.5"
                    value={form.durationHours}
                    onChange={handleChange("durationHours")}
                    placeholder="e.g. 1.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Short leave is limited to a maximum of 2 hours.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Start time</Label>
                      <Input
                        type="time"
                        step="1800"
                        value={form.shortLeaveStartTime}
                        onChange={handleChange("shortLeaveStartTime")}
                        required={form.leaveType === "short"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End time</Label>
                      <Input
                        type="time"
                        step="1800"
                        value={form.shortLeaveEndTime}
                        onChange={handleChange("shortLeaveEndTime")}
                        required={form.leaveType === "short"}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select the exact hours you will be away.
                  </p>
                </div>
              )}
              {form.leaveType === "half" && (
                <div className="space-y-2">
                  <Label>Half-day session</Label>
                  <Select
                    value={form.halfDaySession}
                    onValueChange={(value) => handleChange("halfDaySession")(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      {halfDaySessionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose whether you will be away in the morning or afternoon.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Application</Label>
              <textarea
                value={form.leaveReason}
                onChange={handleChange("leaveReason")}
                required
                placeholder="Share context for the leave request"
                className="min-h-[96px] w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label>Tasks during absence</Label>
              <textarea
                value={form.tasksDuringAbsence}
                onChange={handleChange("tasksDuringAbsence")}
                required
                placeholder="List the handovers, deadlines, or key updates your team lead should be aware of"
                className="min-h-[96px] w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Your team lead reviews this plan before approving the request.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Primary backup colleague</Label>
              <Input
                value={form.backupStaffName}
                onChange={handleChange("backupStaffName")}
                required
                placeholder="Name of the colleague covering while you are away"
              />
              <p className="text-xs text-muted-foreground">
                Share who is handling urgent tasks during your leave.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Team lead reviewer</Label>
              <Select
                value={form.teamLeadId}
                onValueChange={(value) => handleChange("teamLeadId")(value)}
                disabled={loadingTeamLeads || teamLeads.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingTeamLeads
                        ? "Loading team leads..."
                        : "Choose your team lead"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {teamLeads.map((lead) => {
                    const value = String(lead._id || lead.id);
                    const suffix = lead.department ? ` (${lead.department})` : "";
                    return (
                      <SelectItem key={value} value={value}>
                        {lead.fullName}
                        {suffix}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {loadingTeamLeads ? (
                <p className="text-xs text-muted-foreground">
                  Fetching available team leads...
                </p>
              ) : teamLeads.length === 0 ? (
                <p className="text-xs text-destructive">
                  No team leads are registered yet. Please contact your lead to complete their setup.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Your handover details above are sent to the selected lead for approval.
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving || submitting}
                className="px-6"
              >
                {saving || submitting ? "Submitting?" : "Submit leave"}
              </Button>
            </div>
          </form>
        </div>

        <aside className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6 text-sm text-primary-foreground/90">
          <h3 className="text-base font-semibold text-primary mb-3">
            Snapshot sent to HR
          </h3>
          <p className="text-muted-foreground text-sm">
            Your employee details are included with every request so HR can
            verify balances quickly:
          </p>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Name:</span>{" "}
              {user?.fullName || "?"}
            </li>
            <li>
              <span className="font-medium text-foreground">Employee ID:</span>{" "}
              {user?.employeeId || "?"}
            </li>
            <li>
              <span className="font-medium text-foreground">Department:</span>{" "}
              {user?.department || "?"}
            </li>
            <li>
              <span className="font-medium text-foreground">Branch:</span>{" "}
              {user?.branch || "?"}
            </li>
            <li>
              <span className="font-medium text-foreground">City:</span>{" "}
              {user?.city || "?"}
            </li>
          </ul>
          <p className="mt-4 text-muted-foreground text-xs">
            Need supporting documents? Upload them after submission inside the
            request or share via HR support.
          </p>
        </aside>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">My leave history</h2>
            <p className="text-xs text-muted-foreground">
              Track approvals and revisit earlier submissions.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchLeaves().catch(() => {})}
            disabled={loading}
          >
            {loading ? "Refreshing?" : "Refresh"}
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Date range
                </th>
                <th className="px-4 py-3 text-left font-semibold">Duration</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Team lead status</th>
                <th className="px-4 py-3 text-left font-semibold">HR status</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Last remark
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    Loading leave records?
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No leave requests yet. Submit your first request above.
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => {
                  const created = leave.createdAt
                    ? new Date(leave.createdAt)
                    : null;
                  const teamLeadStatus = leave.teamLead?.status || "pending";
                  const teamLeadStatusClass =
                    teamLeadStatusTone[teamLeadStatus] ||
                    "bg-slate-100 text-slate-700 border border-slate-200";
                  const statusClass =
                    statusTone[leave.status] ||
                    "bg-slate-100 text-slate-700 border border-slate-200";
                  const history = leave.statusHistory || [];
                  const lastNote = history.length
                    ? history[history.length - 1].remark
                    : "";
                  const durationParts = [];
                  if (leave.durationDays) {
                    durationParts.push(`${leave.durationDays} day(s)`);
                  }
                  if (leave.durationHours) {
                    durationParts.push(`${leave.durationHours} hour(s)`);
                  }
                  return (
                    <tr
                      key={leave._id || leave.id}
                      className="border-t border-white/5"
                    >
                      <td className="px-4 py-3">
                        {created ? created.toLocaleString() : "?"}
                      </td>
                      <td className="px-4 py-3">
                        {leave.fromDate
                          ? new Date(leave.fromDate).toLocaleDateString()
                          : "?"}{" "}
                        -{" "}
                        {leave.toDate
                          ? new Date(leave.toDate).toLocaleDateString()
                          : "?"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {durationParts.length
                          ? durationParts.join(" / ")
                          : "Pending"}
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">
                        {leave.leaveCategory}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                            teamLeadStatusClass
                          )}
                        >
                          {teamLeadStatusLabel[teamLeadStatus] || teamLeadStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                            statusClass
                          )}
                        >
                          {
                            leaveStatusOptions.find(
                              (option) => option.value === leave.status
                            )?.label
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lastNote || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
