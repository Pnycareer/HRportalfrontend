// hooks/useAttendance.js
import React from "react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { isoToHHmmUTC, toMinutes, pad2 } from "@/utils/time";

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

function normalizeHHmm(value) {
  if (!value || typeof value !== "string") return "";
  const minutes = toMinutes(value);
  if (minutes === null) return "";
  const [hoursRaw, minutesRaw] = value.split(":").map(Number);
  return `${pad2(hoursRaw)}:${pad2(minutesRaw)}`;
}

function fromApiHHmm(iso) {
  if (!iso) return "";
  const formatted = isoToHHmmUTC(iso);
  return normalizeHHmm(formatted);
}

// Flexible OFF detection: treat anything with "off" plus absent/leave as OFF
const OFF = {
  has(status) {
    if (!status) return false;
    const s = String(status).toLowerCase();
    return s.includes("off") || s === "absent" || s === "leave";
  }
};

function minutesFromApi(data) {
  if (data?.workedMinutes != null) return data.workedMinutes;
  if (data?.workedHours != null) return Math.round(data.workedHours * 60);
  return null;
}

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
        const timezoneOffset = new Date().getTimezoneOffset();
        const { data } = await api.get("/api/attendance/by-date", {
          params: { date, timezoneOffset },
        });
        const map = {};
        for (const r of data?.records || []) {
          const workedMinutes =
            r.workedMinutes ?? (r.workedHours != null ? Math.round(r.workedHours * 60) : null);
          const checkIn = fromApiHHmm(r.checkIn);
          const checkOut = fromApiHHmm(r.checkOut);

          map[r.userId] = {
            status: r.status,
            note: r.note || "",
            checkIn,
            checkOut,
            workedMinutes,
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
    const nextPatch = { ...(patch || {}) };
    if (Object.prototype.hasOwnProperty.call(nextPatch, "checkIn")) {
      nextPatch.checkIn = normalizeHHmm(nextPatch.checkIn);
    }
    if (Object.prototype.hasOwnProperty.call(nextPatch, "checkOut")) {
      nextPatch.checkOut = normalizeHHmm(nextPatch.checkOut);
    }
    setChanges((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] || {}), ...nextPatch },
    }));
  }

  function resetRow(userId) {
    setChanges(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  // async function markOne(userId) {
  //   const draft = changes[userId] || {};
  //   const current = persisted[userId] || {};
  //   const merged = { ...current, ...draft };
  //   if (!merged.status) return;

  //   const isoDate = toUtcIsoMidnight(date);
  //   const isOff = OFF.has(merged.status);
  //   const ciIso = isOff ? null : ymdAndTimeToIso(date, merged.checkIn || "");
  //   const coIso = isOff ? null : ymdAndTimeToIso(date, merged.checkOut || "");

  //   setSaving(true);
  //   try {
  //     const { data } = await api.post("/api/attendance/mark", {
  //       userId,
  //       date: isoDate,
  //       status: merged.status,
  //       note: merged.note || "",
  //       checkIn: ciIso,
  //       checkOut: coIso,
  //     });

  //     const nextStatus = data?.status ?? merged.status;
  //     const nextIsOff = OFF.has(nextStatus);

  //     // if API didn’t echo times, fall back to what we sent
  //     const nextCheckInIso  = nextIsOff ? null : (data?.checkIn  ?? ciIso);
  //     const nextCheckOutIso = nextIsOff ? null : (data?.checkOut ?? coIso);

  //     setPersisted(prev => ({
  //       ...prev,
  //       [userId]: {
  //         status: nextStatus,
  //         note: data?.note ?? (merged.note || ""),
  //         checkIn: nextCheckInIso ? isoToHHMM(nextCheckInIso) : "",
  //         checkOut: nextCheckOutIso ? isoToHHMM(nextCheckOutIso) : "",
  //         workedMinutes: minutesFromApi(data),
  //       },
  //     }));
  //     resetRow(userId);
  //     toast.success("Marked attendance");
  //   } catch (e) {
  //     toast.error(e?.response?.data?.message || e?.message || "Failed to mark");
  //     throw e;
  //   } finally {
  //     setSaving(false);
  //   }
  // }

// hooks/useAttendance.js

async function markOne(userId) {
  const draft = changes[userId] || {};
  const current = persisted[userId] || {};
  const merged = { ...current, ...draft };
  if (!merged.status) return;

  const isoDate = toUtcIsoMidnight(date);

  const hasDraftCI = Object.prototype.hasOwnProperty.call(draft, "checkIn");
  const hasDraftCO = Object.prototype.hasOwnProperty.call(draft, "checkOut");

  const baseCI = normalizeHHmm(current.checkIn || "");
  const baseCO = normalizeHHmm(current.checkOut || "");

  const ciHHMM = hasDraftCI ? normalizeHHmm(draft.checkIn) : baseCI;
  const coHHMM = hasDraftCO ? normalizeHHmm(draft.checkOut) : baseCO;

  const isOff = (s => {
    const x = String(s || "").toLowerCase();
    return x.includes("off") || x === "absent" || x === "leave";
  })(merged.status);

  const ciForApi = isOff ? null : (ciHHMM || null);
  const coForApi = isOff ? null : (coHHMM || null);

  setSaving(true);
  try {
    const { data } = await api.post("/api/attendance/mark", {
      userId,
      date: isoDate,
      status: merged.status,
      note: merged.note || "",
      checkIn: ciForApi,
      checkOut: coForApi,
    });

    const nextStatus = data?.status ?? merged.status;
    const nextIsOff = (s => {
      const x = String(s || "").toLowerCase();
      return x.includes("off") || x === "absent" || x === "leave";
    })(nextStatus);

    const nextCheckInStr = nextIsOff
      ? ""
      : (data?.checkIn ? fromApiHHmm(data.checkIn) : (ciHHMM || ""));
    const nextCheckOutStr = nextIsOff
      ? ""
      : (data?.checkOut ? fromApiHHmm(data.checkOut) : (coHHMM || ""));

    setPersisted(prev => ({
      ...prev,
      [userId]: {
        status: nextStatus,
        note: data?.note ?? (merged.note || ""),
        checkIn: nextCheckInStr,
        checkOut: nextCheckOutStr,
        workedMinutes:
          data?.workedMinutes != null
            ? data.workedMinutes
            : (data?.workedHours != null ? Math.round(data.workedHours * 60) : prev[userId]?.workedMinutes ?? null),
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
        if (!merged?.status) return null;
        const off = OFF.has(merged.status);
        const normalizedIn = normalizeHHmm(merged.checkIn || "");
        const normalizedOut = normalizeHHmm(merged.checkOut || "");
        return {
          userId,
          status: merged.status,
          note: merged.note || "",
          checkIn: off ? null : normalizedIn || null,
          checkOut: off ? null : normalizedOut || null,
        };
      })
      .filter(Boolean);

    if (!records.length) return;

    const isoDate = toUtcIsoMidnight(date);
    setSaving(true);
    try {
      await api.post("/api/attendance/bulk", { date: isoDate, records });
      // refetch to get authoritative workedMinutes from server
      try {
      const timezoneOffset = new Date().getTimezoneOffset();
      const rd = await api.get("/api/attendance/by-date", {
        params: { date, timezoneOffset },
      });
        const map = {};
        for (const r of rd.data?.records || []) {
          const workedMinutes =
            r.workedMinutes ?? (r.workedHours != null ? Math.round(r.workedHours * 60) : null);
          const checkIn = fromApiHHmm(r.checkIn);
          const checkOut = fromApiHHmm(r.checkOut);

          map[r.userId] = {
            status: r.status,
            note: r.note || "",
            checkIn,
            checkOut,
            workedMinutes,
          };
        }
        setPersisted(map);
      } catch {
        // ignore fetch errors, persisted stays optimistic
      }

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
