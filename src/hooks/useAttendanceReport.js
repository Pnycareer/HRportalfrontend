// src/hooks/useAttendanceReport.js
import React from "react";
import api from "@/lib/axios";
import { ORDER } from "@/components/constants/attendance";

function nowYM() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function useAttendanceReport() {
  const { year: y0, month: m0 } = nowYM();
  const [branch, setBranch] = React.useState("all"); // or first branch from your list
  const [year, setYear] = React.useState(y0);
  const [month, setMonth] = React.useState(m0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [rows, setRows] = React.useState([]); // flat list from server

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError("");
      try {
        const { data } = await api.get("/api/attendance/report/monthly", {
          params: { branch, year, month },
        });
        if (alive) setRows(data?.rows || []);
      } catch (e) {
        if (alive) setError(e?.response?.data?.message || e?.message || "Failed to load report");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [branch, year, month]);

  // group by department on client for clean rendering + per-dept totals
  const grouped = React.useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = r.department || "—";
      if (!map.has(key)) {
        map.set(key, { dept: key, items: [], totals: ORDER.reduce((a,k)=> (a[k]=0, a), {}) });
      }
      const g = map.get(key);
      g.items.push(r);
      for (const k of ORDER) g.totals[k] += r[k] || 0;
    }
    // grand totals too
    const grand = ORDER.reduce((a,k)=> (a[k]=0, a), {});
    for (const { totals } of map.values()) for (const k of ORDER) grand[k] += totals[k];
    return { sections: Array.from(map.values()), grand };
  }, [rows]);

  return { branch, setBranch, year, setYear, month, setMonth, loading, error, grouped };
}
