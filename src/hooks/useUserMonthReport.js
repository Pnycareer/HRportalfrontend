// hooks/useUserMonthReport.js
import React from "react";
import api from "@/lib/axios";
import { toast } from "sonner";

export default function useUserMonthReport() {
  const now = new Date();
  const [year, setYear] = React.useState(now.getUTCFullYear());
  const [month, setMonth] = React.useState(now.getUTCMonth() + 1); // 1-12
  const [userId, setUserId] = React.useState(""); // admin selects; employee can leave blank
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState(null);

  async function fetchReport(params = {}) {
    const y = params.year ?? year;
    const m = params.month ?? month;
    const uid = params.userId ?? userId;
    setLoading(true);
    try {
      const { data } = await api.get("/api/attendance/report/user-month", {
        params: { userId: uid || undefined, year: y, month: m }
      });
      setData(data);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchReport().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, userId]);

  return {
    year, setYear,
    month, setMonth,
    userId, setUserId,
    loading,
    data,
    refetch: fetchReport,
  };
}
