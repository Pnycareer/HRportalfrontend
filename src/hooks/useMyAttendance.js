// hooks/useMyAttendance.js
import React from "react";
import api from "@/lib/axios";

const STATUS_MAP = {
  "short leave": "short_leave",
  "short_leave": "short_leave",
  "official off": "official_off",
  "official_off": "official_off",
  "public holiday": "public_holiday",
  "public_holiday": "public_holiday",
  present: "present",
  absent: "absent",
  leave: "leave",
  late: "late",
};

function normStatus(s) {
  if (!s) return s;
  const k = String(s).trim().toLowerCase().replace(/\s+/g, "_");
  return STATUS_MAP[k] || k;
}

function nowYM() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function useMyAttendance(initialYear, initialMonth) {
  const { year: y0, month: m0 } = nowYM();
  const [year, setYear] = React.useState(initialYear || y0);
  const [month, setMonth] = React.useState(initialMonth || m0);
  const [loading, setLoading] = React.useState(true);
  const [days, setDays] = React.useState([]);
  const [error, setError] = React.useState("");
  const [stats, setStats] = React.useState({});
  const [paidDays, setPaidDays] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        // Prefer richer monthly user report (provides totals + paidDays)
        const { data } = await api.get("/api/attendance/report/user-month", { params: { year, month } });

        // data.days from /report/user-month
        let list =
          Array.isArray(data?.days) && data.days.length
            ? data.days.map((d) => ({
                date: d.date,
                status: normStatus(d.status),
                note: d.note || "",
              }))
            : [];

        // If API shape is different (older by-month endpoint), try to adapt
        if (!list.length && Array.isArray(data?.rows)) {
          list = data.rows.map((d) => ({
            date: d.date,
            status: normStatus(d.status),
            note: d.note || "",
          }));
        }

        // Totals & paidDays (from /report/user-month)
        const totals = data?.summary?.totals;
        const paid = typeof data?.summary?.paidDays === "number" ? data.summary.paidDays : null;

        // Fallback: compute counts if not provided
        const computedTotals = totals
          ? Object.fromEntries(
              Object.entries(totals).map(([k, v]) => [normStatus(k), Number(v) || 0])
            )
          : list.reduce((acc, d) => {
              acc[d.status] = (acc[d.status] || 0) + 1;
              return acc;
            }, {});

        // Ensure all known keys exist
        for (const key of [
          "present",
          "absent",
          "leave",
          "late",
          "official_off",
          "short_leave",
          "public_holiday",
        ]) {
          if (!(key in computedTotals)) computedTotals[key] = 0;
        }

        if (alive) {
          setDays(list);
          setStats(computedTotals);
          setPaidDays(paid);
        }
      } catch (e) {
        if (alive) setError(e?.response?.data?.message || e?.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [year, month]);

  return { year, month, setYear, setMonth, loading, error, days, stats, paidDays };
}
