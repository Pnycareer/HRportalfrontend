// hooks/useAttendance.js
import React from "react";
import api from "@/lib/axios";
import { toast } from "sonner";

function todayYMD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toUtcIsoMidnight(ymd) {
  return new Date(`${ymd}T00:00:00Z`).toISOString();
}

function isoToHHMM(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function ymdAndTimeToIso(ymd, hhmm) {
  if (!hhmm) return null;
  return new Date(`${ymd}T${hhmm}:00Z`).toISOString();
}

const OFF = new Set(['absent', 'leave', 'official_off']);

export default function useAttendance() {
  const [date, setDate] = React.useState(todayYMD);
  // persisted: { [userId]: { status, note, checkIn, checkOut, workedMinutes? } }
  const [persisted, setPersisted] = React.useState({});
  // local drafts: partial patches
  const [changes, setChanges] = React.useState({});

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/api/attendance/by-date", { params: { date } });
        const map = {};
        for (const r of data?.records || []) {
          map[r.userId] = {
            status: r.status,
            note: r.note || "",
            checkIn: isoToHHMM(r.checkIn),
            checkOut: isoToHHMM(r.checkOut),
            workedMinutes: r.workedMinutes ?? null,
          };
        }
        if (alive) {
          setPersisted(map);
          setChanges({});
        }
      } catch (e) {
        // keep UI usable
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [date]);

  function setRowChange(userId, patch) {
    setChanges(prev => ({
      ...prev,
      [userId]: { ...(prev[userId] || {}), ...patch },
    }));
  }

  function resetRow(userId) {
    setChanges(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  async function markOne(userId) {
    const draft = changes[userId];
    if (!draft?.status) return;

    const isoDate = toUtcIsoMidnight(date);
    const merged = { ...(persisted[userId] || {}), ...(draft || {}) };
    const ci = OFF.has(merged.status) ? null : ymdAndTimeToIso(date, merged.checkIn || "");
    const co = OFF.has(merged.status) ? null : ymdAndTimeToIso(date, merged.checkOut || "");

    setSaving(true);
    try {
      const { data } = await api.post("/api/attendance/mark", {
        userId,
        date: isoDate,
        status: merged.status,
        note: merged.note || "",
        checkIn: ci,
        checkOut: co,
      });

      setPersisted(prev => ({
        ...prev,
        [userId]: {
          status: data.status,
          note: data.note || "",
          checkIn: OFF.has(data.status) ? "" : isoToHHMM(data.checkIn),
          checkOut: OFF.has(data.status) ? "" : isoToHHMM(data.checkOut),
          workedMinutes: data.workedMinutes ?? null,
        },
      }));
      resetRow(userId);
      toast.success("Marked attendance");
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to mark");
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function saveAll() {
    const records = Object.entries(changes)
      .map(([userId, v]) => {
        const merged = { ...(persisted[userId] || {}), ...(v || {}) };
        const off = OFF.has(merged.status);
        return merged?.status
          ? {
              userId,
              status: merged.status,
              note: merged.note || "",
              checkIn: off ? null : ymdAndTimeToIso(date, merged.checkIn || ""),
              checkOut: off ? null : ymdAndTimeToIso(date, merged.checkOut || ""),
            }
          : null;
      })
      .filter(Boolean);

    if (!records.length) return;

    const isoDate = toUtcIsoMidnight(date);
    setSaving(true);
    try {
      const { data } = await api.post("/api/attendance/bulk", { date: isoDate, records });
      // re-fetch (safe) OR optimistically merge—let’s merge to stay snappy:
      // However, workedMinutes comes from server; best to GET after bulk
      try {
        const rd = await api.get("/api/attendance/by-date", { params: { date } });
        const map = {};
        for (const r of rd.data?.records || []) {
          map[r.userId] = {
            status: r.status,
            note: r.note || "",
            checkIn: isoToHHMM(r.checkIn),
            checkOut: isoToHHMM(r.checkOut),
            workedHours: r.workedHours ?? null, // NEW (hours)
          };
        }
        setPersisted(map);
      } catch { /* ignore */ }

      setChanges({});
      toast.success("Attendance saved");
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to save");
      throw e;
    } finally {
      setSaving(false);
    }
  }

  return {
    date,
    setDate,
    loading,
    saving,
    persisted,
    changes,
    setRowChange,
    resetRow,
    markOne,
    saveAll,
  };
}
