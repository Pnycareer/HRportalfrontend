// src/hooks/useAttendanceReport.js
import React from "react";
import api from "@/lib/axios";
import { ORDER } from "@/components/constants/attendance";

function nowYM() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function createTotalsSeed() {
  const totals = {};
  for (const key of ORDER) totals[key] = 0;
  return totals;
}

export default function useAttendanceReport() {
  const { year: y0, month: m0 } = nowYM();
  const [branch, setBranch] = React.useState("all");
  const [year, setYear] = React.useState(y0);
  const [month, setMonth] = React.useState(m0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [meta, setMeta] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/api/attendance/report/monthly", {
          params: { branch, year, month },
        });
        if (!alive) return;
        setRows(data?.rows || []);
        setMeta(data?.meta || null);
      } catch (e) {
        if (!alive) return;
        setError(e?.response?.data?.message || e?.message || "Failed to load report");
        setRows([]);
        setMeta(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [branch, year, month]);

  const grouped = React.useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const key = row.department || "--";
      if (!map.has(key)) {
        map.set(key, { dept: key, items: [], totals: createTotalsSeed() });
      }
      const bucket = map.get(key);
      bucket.items.push(row);
      for (const status of ORDER) {
        bucket.totals[status] += row[status] || 0;
      }
    }

    const grand = createTotalsSeed();
    for (const { totals } of map.values()) {
      for (const status of ORDER) {
        grand[status] += totals[status];
      }
    }

    return { sections: Array.from(map.values()), grand };
  }, [rows]);

  return {
    branch,
    setBranch,
    year,
    setYear,
    month,
    setMonth,
    loading,
    error,
    grouped,
    meta,
  };
}
