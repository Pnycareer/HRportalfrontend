import React from "react";
import api from "@/lib/axios";
import { toast } from "sonner";

export function useLeaveReports() {
  const [monthly, setMonthly] = React.useState(null);
  const [yearly, setYearly] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [savingAllowance, setSavingAllowance] = React.useState(false);

  const fetchMonthly = React.useCallback(async ({ userId, year, month }) => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/leaves/report/monthly", {
        params: { userId, year, month },
      });
      setMonthly(data);
      return data;
    } catch (error) {
      toast.error(error.message || "Failed to load monthly report");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchYearly = React.useCallback(async ({ userId, year }) => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/leaves/report/yearly", {
        params: { userId, year },
      });
      setYearly(data);
      return data;
    } catch (error) {
      toast.error(error.message || "Failed to load yearly report");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAllowance = React.useCallback(
    async ({ userId, year, allowed, remaining }) => {
      setSavingAllowance(true);
      try {
        const { data } = await api.put("/api/leaves/allowance", {
          userId,
          year,
          allowed,
          remaining,
        });
        toast.success("Allowance updated");
        return data;
      } catch (error) {
        toast.error(error?.response?.data?.message || error.message || "Failed to update allowance");
        throw error;
      } finally {
        setSavingAllowance(false);
      }
    },
    []
  );

  return {
    monthly,
    yearly,
    loading,
    savingAllowance,
    fetchMonthly,
    fetchYearly,
    updateAllowance,
    setMonthly,
    setYearly,
  };
}
