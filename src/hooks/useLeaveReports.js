import React from "react";
import api from "@/lib/axios";
import { toast } from "sonner";

export function useLeaveReports() {
  const [monthly, setMonthly] = React.useState(null);
  const [yearly, setYearly] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

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

  return {
    monthly,
    yearly,
    loading,
    fetchMonthly,
    fetchYearly,
    setMonthly,
    setYearly,
  };
}

