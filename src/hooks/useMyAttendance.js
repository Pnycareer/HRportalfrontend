// useMyAttendance.js
import React from "react";
import api from "@/lib/axios";

const STATUS_MAP = {
  "short leave": "short_leave",
  "short_leave": "short_leave",
  "official off": "official_off",
  "official_off": "official_off",
  // keep the originals too, just in case
  present: "present",
  absent: "absent",
  leave: "leave",
  late: "late",
};

function normStatus(s) {
  if (!s) return s;
  const k = String(s).trim().toLowerCase();
  return STATUS_MAP[k] || k.replace(/\s+/g, "_"); // last-resort slug
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

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/api/attendance/by-month", { params: { year, month } });
        const normalized = (data?.days || []).map((d) => ({
          date: d.date,
          status: normStatus(d.status),   // 👈 normalize here
          note: d.note || "",
        }));
        if (alive) setDays(normalized);
      } catch (e) {
        if (alive) setError(e?.response?.data?.message || e?.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [year, month]);

  const stats = React.useMemo(() => {
    const s = { present: 0, absent: 0, leave: 0, late: 0, official_off: 0, short_leave: 0 };
    for (const d of days) if (s[d.status] !== undefined) s[d.status] += 1;
    return s;
  }, [days]);

  return { year, month, setYear, setMonth, loading, error, days, stats };
}
