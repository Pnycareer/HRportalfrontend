// hooks/useInstructorOvertime.js
import React from "react";
import api from "@/lib/axios";
import { toast } from "sonner";

export function useInstructorOvertime(defaultParams = {}) {
  const paramsRef = React.useRef(defaultParams);
  const [claims, setClaims] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const fetchClaims = React.useCallback(async (overrides = {}) => {
    const params = { ...paramsRef.current, ...overrides };
    paramsRef.current = params;
    setLoading(true);
    try {
      const { data } = await api.get("/api/instructor-overtime", { params });
      setClaims(Array.isArray(data) ? data : []);
      return data;
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to load overtime claims"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMonthlyReport = React.useCallback(
    async ({ year, month, instructorId, branchName, verified } = {}) => {
      setLoading(true);
      try {
        const { data } = await api.get(
          "/api/instructor-overtime/reports/monthly",
          {
            params: {
              year,
              month, // 1-12
              instructorId, // required for claims list
              branchName,
              verified, // "true" | "false"
            },
          }
        );

        const selected = data?.selectedInstructor;
        const rows = Array.isArray(selected?.claims) ? selected.claims : [];
        setClaims(rows);
        return data;
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            error.message ||
            "Failed to load monthly overtime report"
        );
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createClaim = React.useCallback(
    async (payload) => {
      setSaving(true);
      try {
        const { data } = await api.post("/api/instructor-overtime", payload);
        toast.success("Overtime claim submitted for review");
        // no auto-refetch here — caller decides what to refresh
        return data;
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            error.message ||
            "Failed to submit overtime claim"
        );
        throw error;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const updateClaim = React.useCallback(
    async (id, payload) => {
      setSaving(true);
      try {
        const { data } = await api.patch(`/api/instructor-overtime/${id}`, payload);
        toast.success("Overtime claim updated");
        // no auto-refetch — caller will re-run either monthly or all
        return data;
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            error.message ||
            "Failed to update overtime claim"
        );
        throw error;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const deleteClaim = React.useCallback(
    async (id) => {
      const ok =
        typeof window !== "undefined"
          ? window.confirm("Delete this overtime claim? This cannot be undone.")
          : true;
      if (!ok) return;
      setSaving(true);
      try {
        const { data } = await api.delete(`/api/instructor-overtime/${id}`);
        toast.success("Overtime claim deleted");
        // no auto-refetch — caller decides
        return data;
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            error.message ||
            "Failed to delete overtime claim"
        );
        throw error;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return {
    claims,
    loading,
    saving,
    fetchClaims,
    fetchMonthlyReport,
    createClaim,
    updateClaim,
    deleteClaim,
  };
}
