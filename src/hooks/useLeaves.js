import React from "react";
import api from "@/lib/axios";
import { toast } from "sonner";

export const leaveTypeOptions = [
  { value: "full", label: "Full Day" },
  { value: "short", label: "Short Leave" },
  { value: "half", label: "Half Leave" },
];

export const leaveCategoryOptions = [
  { value: "casual", label: "Casual" },
  { value: "medical", label: "Medical" },
  { value: "annual", label: "Annual" },
  { value: "sick", label: "Sick" },
  { value: "unpaid", label: "Unpaid" },
  { value: "other", label: "Other" },
];

export const leaveStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "on_hold", label: "On Hold" },
];

export function useLeaves(defaultParams = {}) {
  const paramsRef = React.useRef(defaultParams);
  const [leaves, setLeaves] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const fetchLeaves = React.useCallback(
    async (overrides = {}) => {
      const params = { ...paramsRef.current, ...overrides };
      paramsRef.current = params;
      setLoading(true);
      try {
        const { data } = await api.get("/api/leaves", { params });
        setLeaves(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error(error.message || "Failed to load leaves");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const applyLeave = React.useCallback(
    async (payload) => {
      setSaving(true);
      try {
        await api.post("/api/leaves", payload);
        toast.success("Leave submitted for review");
        await fetchLeaves();
      } catch (error) {
        toast.error(error.message || "Failed to submit leave");
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [fetchLeaves]
  );

  const updateLeaveStatus = React.useCallback(
    async (id, { status, remark }) => {
      setSaving(true);
      try {
        await api.patch(`/api/leaves/${id}/status`, { status, remark });
        toast.success("Leave status updated");
        await fetchLeaves();
      } catch (error) {
        toast.error(error.message || "Failed to update status");
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [fetchLeaves]
  );

  const updateLeave = React.useCallback(
    async (id, payload) => {
      setSaving(true);
      try {
        await api.patch(`/api/leaves/${id}`, payload);
        toast.success("Leave updated");
        await fetchLeaves();
      } catch (error) {
        toast.error(error.message || "Failed to update leave");
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [fetchLeaves]
  );

  const updateLeaveAsTeamLead = React.useCallback(
    async (id, payload) => {
      setSaving(true);
      try {
        await api.patch(`/api/leaves/${id}/team-lead`, payload);
        toast.success("Team lead review saved");
        await fetchLeaves();
      } catch (error) {
        const message = error?.response?.data?.message || error.message || "Failed to submit review";
        toast.error(message);
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [fetchLeaves]
  );

  return {
    leaves,
    loading,
    saving,
    fetchLeaves,
    applyLeave,
    updateLeaveStatus,
    updateLeave,
    updateLeaveAsTeamLead,
  };
}
