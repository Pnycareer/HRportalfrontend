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
      toast.error(error.message || "Failed to load overtime claims");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createClaim = React.useCallback(
    async (payload) => {
      setSaving(true);
      try {
        await api.post("/api/instructor-overtime", payload);
        toast.success("Overtime claim submitted for review");
        await fetchClaims();
      } catch (error) {
        toast.error(error.message || "Failed to submit overtime claim");
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [fetchClaims]
  );

  const updateClaim = React.useCallback(
    async (id, payload) => {
      setSaving(true);
      try {
        await api.patch(`/api/instructor-overtime/${id}`, payload);
        toast.success("Overtime claim updated");
        await fetchClaims();
      } catch (error) {
        toast.error(error.message || "Failed to update overtime claim");
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [fetchClaims]
  );

  return {
    claims,
    loading,
    saving,
    fetchClaims,
    createClaim,
    updateClaim,
  };
}
