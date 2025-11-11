import { useState, useCallback } from "react";
import api from "@/lib/axios";

export default function useSalarySheet() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const createSalarySheet = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.post("/api/salary-sheets", payload);
      setData(res.data);
      return res.data;
    } catch (err) {
      setError(err?.message || "Failed to create salary sheet");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSalarySheet = useCallback(async (params) => {
    if (!params?.userId) return null;
    setFetching(true);
    setError(null);
    try {
      const res = await api.get("/api/salary-sheets", {
        params: { ...params, limit: 1, page: 1 },
      });
      const item = Array.isArray(res.data?.items) ? res.data.items[0] : null;
      setData(item);
      return item;
    } catch (err) {
      setError(err?.message || "Failed to fetch salary sheet");
      throw err;
    } finally {
      setFetching(false);
    }
  }, []);

  const updateSalarySheet = useCallback(async (id, payload) => {
    if (!id) throw new Error("Salary sheet id is required");
    setUpdating(true);
    setError(null);
    try {
      const res = await api.put(`/api/salary-sheets/${id}`, payload);
      setData(res.data);
      return res.data;
    } catch (err) {
      setError(err?.message || "Failed to update salary sheet");
      throw err;
    } finally {
      setUpdating(false);
    }
  }, []);

  return {
    createSalarySheet,
    fetchSalarySheet,
    updateSalarySheet,
    loading,
    fetching,
    updating,
    error,
    data,
    setError,
    setData,
  };
}
