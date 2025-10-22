// hooks/useInstructorOvertimeReport.js
import React from "react";
import api from "@/lib/axios";
import { toast } from "sonner";

export function useInstructorOvertimeMonthlyReport(defaultParams = {}) {
  const paramsRef = React.useRef(defaultParams);
  const [report, setReport] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const fetchReport = React.useCallback(async (overrides = {}) => {
    const params = { ...paramsRef.current, ...overrides };
    if (!params.year || !params.month) {
      throw new Error("Month and year are required for the overtime report");
    }
    paramsRef.current = params;
    setLoading(true);
    try {
      const preparedParams = { ...params };
      if (!preparedParams.instructorId) {
        delete preparedParams.instructorId;
      }
      const { data } = await api.get("/api/instructor-overtime/reports/monthly", {
        params: preparedParams,
      });
      setReport(data);
      return data;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error.message ||
        "Failed to load instructor overtime report";
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { report, loading, fetchReport };
}
