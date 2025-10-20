import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useLeaves, leaveStatusOptions } from "@/hooks/useLeaves";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";
import { toast } from "sonner";

const teamLeadStatusOptions = [
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const emptyDraft = {
  remarks: "",
  status: "pending",
};

function formatDate(value) {
  if (!value) return "TBD";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "TBD";
  }
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

const leaveStatusLookup = leaveStatusOptions.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

export default function TeamLeadApprovals() {
  const { user, checkAuth } = useAuth();
  const { lastEvent } = useNotifications();
  const isTeamLead = Boolean(user?.isTeamLead);

  const {
    leaves,
    loading,
    saving,
    fetchLeaves,
    updateLeaveAsTeamLead,
  } = useLeaves({ scope: "team_lead" });

  const [selectedId, setSelectedId] = React.useState(null);
  const [draft, setDraft] = React.useState(emptyDraft);
  const [updatingLead, setUpdatingLead] = React.useState(false);

  React.useEffect(() => {
    if (!isTeamLead) return;
    fetchLeaves().catch(() => {});
  }, [fetchLeaves, isTeamLead]);

  React.useEffect(() => {
    if (!isTeamLead) return;
    if (!lastEvent || lastEvent.type !== "leave:new") return;
    const assigned = String(lastEvent.payload?.teamLeadAssignee || "");
    const currentUserId = String(user?._id || user?.id || "");
    if (assigned && currentUserId && assigned !== currentUserId) {
      return;
    }
    fetchLeaves().catch(() => {});
  }, [lastEvent, fetchLeaves, isTeamLead, user]);

  React.useEffect(() => {
    if (!isTeamLead) {
      setSelectedId(null);
      return;
    }
    if (!leaves.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId((current) => {
      if (current) {
        const found = leaves.some(
          (leave) => String(leave._id || leave.id) === String(current)
        );
        if (found) {
          return current;
        }
      }
      const first = leaves[0];
      return String(first._id || first.id);
    });
  }, [isTeamLead, leaves]);

  const selected = React.useMemo(() => {
    if (!selectedId) return null;
    return (
      leaves.find(
        (leave) => String(leave._id || leave.id) === String(selectedId)
      ) || null
    );
  }, [leaves, selectedId]);

  React.useEffect(() => {
    if (!selected) {
      setDraft(emptyDraft);
      return;
    }
    setDraft({
      remarks: selected.teamLead?.remarks || "",
      status: selected.teamLead?.status || "pending",
    });
  }, [selected]);

  const handleDraftChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selected) return;

    await updateLeaveAsTeamLead(selected._id || selected.id, {
      teamLead: {
        remarks: draft.remarks || "",
        status: draft.status || "pending",
      },
    });
  };

  const handleTeamLeadToggle = async () => {
    try {
      setUpdatingLead(true);
      const next = !isTeamLead;
      await api.patch("/api/users/me/team-lead", { isTeamLead: next });
      await checkAuth();
      if (next) {
        toast.success("You are now registered as a team lead.");
      } else {
        toast.success("Team lead access disabled.");
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Failed to update team lead access";
      toast.error(message);
    } finally {
      setUpdatingLead(false);
    }
  };

  if (!isTeamLead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team lead access required</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p>
            Enable team lead access to start reviewing leave requests routed to you before they reach HR.
          </p>
          <Button
            type="button"
            onClick={handleTeamLeadToggle}
            disabled={updatingLead}
          >
            {updatingLead ? "Updating..." : "Register as team lead"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Team lead reviews</h1>
          <p className="text-sm text-muted-foreground">
            Review employee handover plans and approve requests before they reach HR.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleTeamLeadToggle}
            disabled={updatingLead}
          >
            {updatingLead ? "Updating..." : "Leave team lead role"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchLeaves().catch(() => {})}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Assigned requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">
                Loading assigned requests...
              </p>
            ) : leaves.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No leave requests are waiting for your review.
              </p>
            ) : (
              <div className="space-y-2">
                {leaves.map((leave) => {
                  const id = String(leave._id || leave.id);
                  const isActive = id === selectedId;
                  const employeeName = leave.employeeSnapshot?.fullName || "Unnamed";
                  const dateRange = `${formatDate(leave.fromDate)} - ${formatDate(leave.toDate)}`;
                  const leadStatus = leave.teamLead?.status || "pending";
                  const overallStatus = leaveStatusLookup[leave.status] || leave.status;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedId(id)}
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left transition",
                        "hover:border-primary/40 hover:bg-primary/5",
                        isActive
                          ? "border-primary bg-primary/10"
                          : "border-white/10 bg-background/60"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{employeeName}</p>
                          <p className="text-xs text-muted-foreground">{dateRange}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase text-primary">
                            {leadStatus === "pending"
                              ? "Needs action"
                              : leadStatus === "approved"
                              ? "Approved"
                              : "Rejected"}
                          </p>
                          <p className="text-[10px] uppercase text-muted-foreground">
                            HR: {overallStatus || "Pending"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review details</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-muted-foreground">
                Select a request to start the review.
              </p>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="rounded-lg border border-white/10 bg-muted/40 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {selected.employeeSnapshot?.fullName || "Unnamed employee"}
                    </span>
                    <span className="text-xs uppercase text-muted-foreground">
                      {selected.leaveCategory}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <span>Dates: {formatDate(selected.fromDate)} to {formatDate(selected.toDate)}</span>
                    <span>Leave type: {selected.leaveType}</span>
                    <span>Status: {leaveStatusLookup[selected.status] || selected.status}</span>
                    <span>Requested: {formatDateTime(selected.applicantSignedAt || selected.createdAt)}</span>
                    <span>
                      Team lead action:{" "}
                      {selected.teamLead?.status === "pending"
                        ? "Awaiting review"
                        : formatDateTime(selected.teamLead?.reviewedAt)}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Reason: {selected.leaveReason || "Not provided"}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tasks during absence</Label>
                  <div className="min-h-[96px] whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-sm text-foreground">
                    {selected.tasksDuringAbsence
                      ? selected.tasksDuringAbsence
                      : "Not provided"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supplied by the employee when the request was submitted.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Primary backup colleague</Label>
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-foreground">
                    {selected.backupStaff?.name || "Not provided"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Employee-identified coverage for urgent work.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Team lead recommendation</Label>
                  <textarea
                    value={draft.remarks}
                    onChange={handleDraftChange("remarks")}
                    placeholder="Share decisions or additional context for HR"
                    className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Decision</Label>
                    <Select
                      value={draft.status}
                      onValueChange={(value) => handleDraftChange("status")(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {teamLeadStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {selected.teamLead?.status === "pending"
                        ? "No decision recorded yet."
                        : `Last action captured on ${formatDateTime(selected.teamLead?.reviewedAt)}.`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Employee submission timestamp</Label>
                    <div className="rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-foreground">
                      {formatDateTime(selected.applicantSignedAt || selected.createdAt)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Captured automatically when the employee submitted the request.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save review"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Approving forwards the request to HR for final processing.
                  </p>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
