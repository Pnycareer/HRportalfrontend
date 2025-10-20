import React from "react";
import {
  useLeaves,
  leaveStatusOptions,
  leaveCategoryOptions,
  leaveTypeOptions,
} from "@/hooks/useLeaves";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";
import { toast } from "sonner";

const statusTone = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  accepted: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border border-rose-200",
  on_hold: "bg-sky-100 text-sky-800 border border-sky-200",
};

const STATUS_FILTERS = [{ value: "all", label: "All statuses" }].concat(
  leaveStatusOptions
);

const TEAM_LEAD_FILTERS = [
  { value: "all", label: "All team lead states" },
  { value: "pending", label: "Team lead pending" },
  { value: "approved", label: "Team lead approved" },
  { value: "rejected", label: "Team lead rejected" },
];

const teamLeadStatusLabels = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const teamLeadStatusTone = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border border-rose-200",
};

const employmentStatusOptions = [
  { value: "intern", label: "Intern" },
  { value: "apprentice", label: "Apprentice" },
  { value: "permanent", label: "Permanent" },
  { value: "probation", label: "Probation" },
  { value: "contract", label: "Contract" },
];

const decisionForFormOptions = [
  { value: "not_applicable", label: "Not set" },
  { value: "paid", label: "Paid leave" },
  { value: "unpaid", label: "Unpaid leave" },
  { value: "partially_paid", label: "Partially paid" },
];

const emptyHrDraft = {
  receivedBy: "",
  receivedDateTime: "",
  employmentStatus: "",
  decisionForForm: "not_applicable",
};

const defaultAllowance = { allowed: 12, used: 0, remaining: 12, monthlyUsed: 0 };

function toNumberOrDefault(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMinutes = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offsetMinutes * 60000);
  return local.toISOString().slice(0, 16);
}

function buildHrDraft(leave) {
  const section = leave?.hrSection || {};
  return {
    receivedBy: section.receivedBy || "",
    receivedDateTime: formatDatetimeLocal(section.receivedAt),
    employmentStatus: section.employmentStatus || "",
    decisionForForm: section.decisionForForm || "not_applicable",
  };
}

function buildAllowance(leave) {
  const source =
    leave?.annualAllowance ||
    leave?.hrSection?.annualAllowance ||
    leave?.monthlyAllowance ||
    leave?.hrSection?.monthlyAllowance;

  if (!source) {
    return { ...defaultAllowance };
  }

  const allowed = toNumberOrDefault(source.allowed, defaultAllowance.allowed);
  const used = toNumberOrDefault(source.used, defaultAllowance.used);
  const remaining = toNumberOrDefault(
    source.remaining,
    Math.max(allowed - used, 0)
  );

  return {
    allowed,
    used,
    remaining,
    monthlyUsed: defaultAllowance.monthlyUsed,
  };
}

function formatAllowance(value) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function resolveImageSrc(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function formatDateTimeDisplay(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function toIsoString(value, withTime) {
  if (!value) return null;
  const date = withTime ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function buildHrPayload(draft) {
  return {
    receivedBy: draft.receivedBy || "",
    receivedAt: toIsoString(draft.receivedDateTime, true),
    employmentStatus: draft.employmentStatus || null,
    decisionForForm: draft.decisionForForm || "not_applicable",
  };
}

function buildDurationText(leave) {
  if (!leave) return "Pending";
  const parts = [];
  if (leave.durationDays) {
    parts.push(`${leave.durationDays} day(s)`);
  }
  if (leave.durationHours) {
    parts.push(`${leave.durationHours} hour(s)`);
  }
  return parts.length ? parts.join(" / ") : "Pending";
}

export default function LeaveApprovals() {
  const {
    leaves,
    loading,
    saving,
    fetchLeaves,
    updateLeaveStatus,
    updateLeave,
  } = useLeaves({
    status: "pending",
  });
  const [statusFilter, setStatusFilter] = React.useState("pending");
  const [teamLeadFilter, setTeamLeadFilter] = React.useState("all");
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(null);
  const [decision, setDecision] = React.useState({
    status: "pending",
    remark: "",
  });
  const [hrDraft, setHrDraft] = React.useState(emptyHrDraft);
  const [allowanceInfo, setAllowanceInfo] = React.useState(defaultAllowance);
  const [hrUsers, setHrUsers] = React.useState([]);
  const [hrLoading, setHrLoading] = React.useState(false);
  const allowanceRequestIdRef = React.useRef(0);

  const selectedCategoryLabel =
    selected &&
    (leaveCategoryOptions.find((opt) => opt.value === selected.leaveCategory)
      ?.label || selected.leaveCategory);
  const selectedTypeLabel =
    selected &&
    (leaveTypeOptions.find((opt) => opt.value === selected.leaveType)?.label ||
      selected.leaveType);
  const selectedSubmittedAt =
    selected && (selected.applicantSignedAt || selected.createdAt);
  const selectedDurationText = selected ? buildDurationText(selected) : "Pending";
  const selectedTeamLeadStatus = selected?.teamLead?.status || "pending";
  const selectedTeamLeadLabel =
    teamLeadStatusLabels[selectedTeamLeadStatus] || teamLeadStatusLabels.pending;
  const selectedTeamLeadTimestamp =
    selectedTeamLeadStatus === "pending" ? null : selected?.teamLead?.reviewedAt;
  const selectedTeamLeadRemarks = selected?.teamLead?.remarks || "No remarks yet.";
  const selectedPeriodText = selected
    ? `${selected.fromDate ? new Date(selected.fromDate).toLocaleDateString() : "N/A"} - ${
        selected.toDate ? new Date(selected.toDate).toLocaleDateString() : "N/A"
      }`
    : "N/A - N/A";
  const selectedAvatarUrl =
    selected?.employeeSnapshot?.profileImageUrl ||
    selected?.employeeSnapshot?.signatureImageUrl ||
    null;
  const selectedAvatarSrc = resolveImageSrc(selectedAvatarUrl);
  const selectedFullName = selected?.employeeSnapshot?.fullName || "";
  const selectedAvatarFallback =
    selectedFullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "EMP";
  const decisionStatusLabel =
    leaveStatusOptions.find((option) => option.value === decision.status)?.label ||
    (decision.status ? decision.status.replace(/_/g, " ") : "Pending");

  const refreshLeaves = React.useCallback(() => {
    const params = {};
    if (statusFilter !== "all") {
      params.status = statusFilter;
    }
    if (teamLeadFilter !== "all") {
      params.teamLeadStatus = teamLeadFilter;
    }
    fetchLeaves(params).catch(() => {});
  }, [fetchLeaves, statusFilter, teamLeadFilter]);

  React.useEffect(() => {
    refreshLeaves();
  }, [refreshLeaves]);

  React.useEffect(() => {
    let active = true;
    setHrLoading(true);
    api
      .get("/api/users", { params: { role: "hr" } })
      .then(({ data }) => {
        if (!active) return;
        setHrUsers(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (!active) return;
        const message =
          error?.response?.data?.message || error?.message || "Failed to load HR team";
        toast.error(message);
      })
      .finally(() => {
        if (active) {
          setHrLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleStatusFilterChange = React.useCallback((value) => {
    setStatusFilter(value);
  }, []);

  const handleTeamLeadFilterChange = React.useCallback((value) => {
    setTeamLeadFilter(value);
  }, []);

  async function loadAllowanceDetails(leave) {
    if (!leave) {
      setAllowanceInfo({ ...defaultAllowance });
      return;
    }

    const baseAllowance = buildAllowance(leave);
    setAllowanceInfo(baseAllowance);

    const userId = leave.user;
    const referenceDate = leave.fromDate || leave.createdAt;
    if (!userId || !referenceDate) {
      return;
    }

    const parsed = new Date(referenceDate);
    if (Number.isNaN(parsed.getTime())) {
      return;
    }

    const requestId = allowanceRequestIdRef.current + 1;
    allowanceRequestIdRef.current = requestId;

    try {
      const { data } = await api.get("/api/leaves/report/monthly", {
        params: {
          userId,
          year: parsed.getUTCFullYear(),
          month: parsed.getUTCMonth() + 1,
        },
      });

      if (allowanceRequestIdRef.current !== requestId) {
        return;
      }

      const allowance = data?.allowance || {};
      const monthlyApproved = toNumberOrDefault(
        data?.totals?.approved,
        baseAllowance.monthlyUsed
      );
      const allowed = toNumberOrDefault(
        allowance.allowed,
        baseAllowance.allowed
      );
      const yearlyUsed = toNumberOrDefault(
        allowance.used,
        baseAllowance.used
      );
      const remaining = toNumberOrDefault(
        allowance.remaining,
        Math.max(allowed - yearlyUsed, 0)
      );

      setAllowanceInfo({
        allowed,
        used: yearlyUsed,
        remaining,
        monthlyUsed: monthlyApproved,
      });
    } catch (error) {
      if (allowanceRequestIdRef.current !== requestId) {
        return;
      }
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load allowance summary";
      toast.error(message);
      setAllowanceInfo(baseAllowance);
    }
  }

  function openDetail(leave) {
    setSelected(leave);
    setDecision({
      status: leave.status || "pending",
      remark: "",
    });
    setHrDraft(buildHrDraft(leave));
    loadAllowanceDetails(leave);
    setDetailOpen(true);
  }

  function handleDetailOpenChange(nextOpen) {
    setDetailOpen(nextOpen);
    if (!nextOpen) {
      allowanceRequestIdRef.current += 1;
      setSelected(null);
      setDecision({ status: "pending", remark: "" });
      setHrDraft(emptyHrDraft);
      setAllowanceInfo({ ...defaultAllowance });
    }
  }

  const submitDecision = async () => {
    if (!selected?._id) return;
    try {
      const hrSection = buildHrPayload(hrDraft);
      await updateLeave(selected._id, { hrSection });

      if (
        decision.status !== selected.status ||
        (decision.remark && decision.remark.trim().length > 0)
      ) {
        await updateLeaveStatus(selected._id, {
          status: decision.status,
          remark: decision.remark,
        });
      }

      handleDetailOpenChange(false);
      refreshLeaves();
    } catch {
      // errors are surfaced via toast notifications
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Leave approvals
          </h1>
          <p className="text-sm text-muted-foreground">
            Review pending requests, fill in HR details, and capture decisions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={teamLeadFilter}
            onValueChange={handleTeamLeadFilterChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEAM_LEAD_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={refreshLeaves}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full min-w-[940px] table-fixed border-collapse text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Employee</th>
              <th className="px-4 py-3 text-left font-semibold">Department</th>
              <th className="px-4 py-3 text-left font-semibold">Leave</th>
              <th className="px-4 py-3 text-left font-semibold">Dates</th>
              <th className="px-4 py-3 text-left font-semibold">Duration</th>
              <th className="px-4 py-3 text-left font-semibold">Team lead</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Submitted</th>
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  Loading leave requests...
                </td>
              </tr>
            ) : leaves.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  No leave requests found for this filter.
                </td>
              </tr>
            ) : (
              leaves.map((leave) => {
                const snapshot = leave.employeeSnapshot || {};
                const range = `${leave.fromDate ? new Date(leave.fromDate).toLocaleDateString() : "N/A"} - ${
                  leave.toDate ? new Date(leave.toDate).toLocaleDateString() : "N/A"
                }`;
                const submitted = leave.createdAt
                  ? new Date(leave.createdAt).toLocaleString()
                  : "N/A";
                const duration = [
                  leave.durationDays ? `${leave.durationDays} day(s)` : null,
                  leave.durationHours ? `${leave.durationHours} hour(s)` : null,
                ]
                  .filter(Boolean)
                  .join(" / ");
                const statusClass =
                  statusTone[leave.status] ||
                  "bg-slate-100 text-slate-700 border border-slate-200";
                const teamLeadState = leave.teamLead?.status || "pending";
                const teamLeadLabel =
                  teamLeadStatusLabels[teamLeadState] ||
                  teamLeadStatusLabels.pending;
                const teamLeadClass =
                  teamLeadStatusTone[teamLeadState] ||
                  teamLeadStatusTone.pending;

                const typeLabel =
                  leaveTypeOptions.find((opt) => opt.value === leave.leaveType)
                    ?.label || leave.leaveType;
                const categoryLabel =
                  leaveCategoryOptions.find(
                    (opt) => opt.value === leave.leaveCategory
                  )?.label || leave.leaveCategory;

                return (
                  <tr
                    key={leave._id || leave.id}
                    className="border-t border-white/5"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {snapshot.fullName || "N/A"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: {snapshot.employeeId || "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{snapshot.department || "N/A"}</div>
                      <div className="text-xs">
                        {snapshot.branch
                          ? `${snapshot.branch} · ${snapshot.city || ""}`
                          : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-foreground">
                        {categoryLabel}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {typeLabel}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{range}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {duration || "Pending"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                          teamLeadClass
                        )}
                      >
                        {teamLeadLabel}
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
                            (opt) => opt.value === leave.status
                          )?.label
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {submitted}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDetail(leave)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={detailOpen} onOpenChange={handleDetailOpenChange}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Leave details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6">
              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-input p-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Employee snapshot
                  </h3>
                  <div className="mt-3 flex items-center gap-3">
                    <Avatar className="h-16 w-16 border border-muted">
                      {selectedAvatarSrc ? (
                        <AvatarImage
                          src={selectedAvatarSrc}
                          alt={`${selectedFullName || "Employee"} profile`}
                        />
                      ) : (
                        <AvatarFallback>{selectedAvatarFallback}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {selected.employeeSnapshot?.fullName || "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: {selected.employeeSnapshot?.employeeId || "N/A"}
                      </p>
                    </div>
                  </div>
                  <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <div>
                      <dt>Department</dt>
                      <dd>{selected.employeeSnapshot?.department || "N/A"}</dd>
                    </div>
                    <div>
                      <dt>Branch</dt>
                      <dd>
                        {selected.employeeSnapshot?.branch || "N/A"},{" "}
                        {selected.employeeSnapshot?.city || "N/A"}
                      </dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{selected.employeeSnapshot?.email || "N/A"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl border border-input p-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Leave summary
                  </h3>
                  <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <div>
                      <dt>Category · Type</dt>
                      <dd>
                        {
                          leaveCategoryOptions.find(
                            (opt) => opt.value === selected.leaveCategory
                          )?.label
                        }{" "}
                        ·{" "}
                        {
                          leaveTypeOptions.find(
                            (opt) => opt.value === selected.leaveType
                          )?.label
                        }
                      </dd>
                    </div>
                    <div>
                      <dt>Period</dt>
                      <dd>
                        {selected.fromDate
                          ? new Date(selected.fromDate).toLocaleDateString()
                          : "N/A"}{" "}
                        -{" "}
                        {selected.toDate
                          ? new Date(selected.toDate).toLocaleDateString()
                          : "N/A"}
                      </dd>
                    </div>
                    <div>
                      <dt>Duration</dt>
                      <dd>
                        {[
                          selected.durationDays
                            ? `${selected.durationDays} day(s)`
                            : null,
                          selected.durationHours
                            ? `${selected.durationHours} hour(s)`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" / ") || "Pending"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section className="rounded-xl border border-input p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Request details
                </h3>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">
                      Submitted:
                    </span>{" "}
                    {formatDateTimeDisplay(
                      selected.applicantSignedAt || selected.createdAt
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      Team lead decision:
                    </span>{" "}
                    {teamLeadStatusLabels[selected.teamLead?.status || "pending"] ||
                      teamLeadStatusLabels.pending}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      Team lead action:
                    </span>{" "}
                    {selected.teamLead?.status === "pending"
                      ? "Pending"
                      : formatDateTimeDisplay(selected.teamLead?.reviewedAt)}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      Reason:
                    </span>{" "}
                    {selected.leaveReason || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      Team lead recommendation:
                    </span>{" "}
                    {selected.teamLead?.remarks || "N/A"}
                  </div>
                  {selected.tasksDuringAbsence ? (
                    <div>
                      <span className="font-medium text-foreground">
                        Tasks during absence:
                      </span>{" "}
                      {selected.tasksDuringAbsence}
                    </div>
                  ) : null}
                  {selected.backupStaff?.name ? (
                    <div>
                      <span className="font-medium text-foreground">
                        Backup staff:
                      </span>{" "}
                      {selected.backupStaff?.name}
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="rounded-xl border border-input p-4 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  HR processing
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Received by</Label>
                    {hrUsers.length > 0 ? (
                      <Select
                        value={hrDraft.receivedBy ?? ""}
                        onValueChange={(value) =>
                          setHrDraft((prev) => ({
                            ...prev,
                            receivedBy: value,
                          }))
                        }
                        disabled={hrLoading}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              hrLoading ? "Loading HR team..." : "Select HR member"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Not captured</SelectItem>
                          {hrUsers.map((hr) => {
                            const id = String(hr._id || hr.id);
                            const labelParts = [hr.fullName];
                            if (hr.employeeId) {
                              labelParts.push(`#${hr.employeeId}`);
                            }
                            return (
                              <SelectItem key={id} value={hr.fullName}>
                                {labelParts.join(" ")}
                              </SelectItem>
                            );
                          })}
                          {hrDraft.receivedBy &&
                          !hrUsers.some((hr) => hr.fullName === hrDraft.receivedBy) ? (
                            <SelectItem value={hrDraft.receivedBy}>
                              {hrDraft.receivedBy}
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={hrDraft.receivedBy}
                        onChange={(event) =>
                          setHrDraft((prev) => ({
                            ...prev,
                            receivedBy: event.target.value,
                          }))
                        }
                        placeholder={hrLoading ? "Loading HR team..." : "Name"}
                      />
                    )}
                    {hrLoading ? (
                      <p className="text-xs text-muted-foreground">Fetching HR roster…</p>
                    ) : null}
                  </div>
                  <div className="space-y-2 md:col-start-2">
                    <Label>Received date &amp; time</Label>
                    <Input
                      type="datetime-local"
                      value={hrDraft.receivedDateTime}
                      onChange={(event) =>
                        setHrDraft((prev) => ({
                          ...prev,
                          receivedDateTime: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Employment status</Label>
                    <Select
                      value={hrDraft.employmentStatus || undefined}
                      onValueChange={(value) =>
                        setHrDraft((prev) => ({ ...prev, employmentStatus: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employment status" />
                      </SelectTrigger>
                      <SelectContent>
                        {employmentStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Decision for this form</Label>
                    <Select
                      value={hrDraft.decisionForForm || undefined}
                      onValueChange={(value) =>
                        setHrDraft((prev) => ({ ...prev, decisionForForm: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select decision" />
                      </SelectTrigger>
                      <SelectContent>
                        {decisionForFormOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 grid gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Annual allowance
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatAllowance(allowanceInfo.allowed)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Used this year
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatAllowance(allowanceInfo.used)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Approved this month
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatAllowance(allowanceInfo.monthlyUsed)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Remaining this year
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatAllowance(allowanceInfo.remaining)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Employee submission timestamp</Label>
                    <div className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                      {formatDateTimeDisplay(selected.applicantSignedAt || selected.createdAt)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Team lead decision timestamp</Label>
                    <div className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                      {selected.teamLead?.status === "pending"
                        ? "Pending"
                        : formatDateTimeDisplay(selected.teamLead?.reviewedAt)}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={decision.status}
                    onValueChange={(value) =>
                      setDecision((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>HR remarks</Label>
                  <textarea
                    value={decision.remark}
                    onChange={(event) =>
                      setDecision((prev) => ({
                        ...prev,
                        remark: event.target.value,
                      }))
                    }
                    placeholder="Capture supporting context or next steps"
                    className="min-h-[96px] w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
              </section>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => handleDetailOpenChange(false)}
              type="button"
            >
              Close
            </Button>
            <Button
              onClick={submitDecision}
              disabled={saving || !selected}
              type="button"
            >
              {saving ? "Saving..." : "Save decision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
