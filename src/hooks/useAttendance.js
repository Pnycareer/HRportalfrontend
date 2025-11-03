// hooks/useAttendance.js
import React from "react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { todayYMD, normalizeHHmm, hhmmToMinutes } from "@/utils/time";

// OFF detection
const OFF = {
  has(status) {
    if (!status) return false;
    const s = String(status).toLowerCase();
    return s.includes("off") || s === "absent" || s === "leave";
  },
};

// Prefer minutes from backend; otherwise compute from HH:mm
function deriveWorkedMinutes(rec) {
  if (rec?.workedMinutes != null) return rec.workedMinutes;
  const a = hhmmToMinutes(rec?.checkIn);
  const b = hhmmToMinutes(rec?.checkOut);
  if (a == null || b == null) return null;
  // allow overnight (e.g., 22:00 → 06:00 next day)
  return b >= a ? (b - a) : (24 * 60 - a + b);
}

export default function useAttendance() {
  const [date, setDate] = React.useState(todayYMD);
  // persisted: { [userId]: { status, note, checkIn:"HH:mm", checkOut:"HH:mm", workedMinutes? } }
  const [persisted, setPersisted] = React.useState({});
  const [changes, setChanges] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Fetch day
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // IMPORTANT: backend /by-date should already return checkIn/checkOut as "HH:mm" or null.
        // If your backend still returns ISO, convert there OR convert here before assigning.
        const { data } = await api.get("/api/attendance/by-date", { params: { date } });

        const map = {};
        for (const r of data?.records || []) {
          map[r.userId] = {
            status: r.status,
            note: r.note || "",
            checkIn: normalizeHHmm(r.checkIn || ""),   // normalize to HH:mm or ""
            checkOut: normalizeHHmm(r.checkOut || ""),
            subStatus:
              typeof r.subStatus === "string" ? r.subStatus.toLowerCase() : "",
            action:
              typeof r.action === "string" ? r.action.toLowerCase() : "",
            monthlyCounts: {
              short_leave: Number(r?.monthlyCounts?.short_leave ?? 0) || 0,
              half_day: Number(r?.monthlyCounts?.half_day ?? 0) || 0,
            },
            workedMinutes: deriveWorkedMinutes(r),
          };
        }

        if (alive) {
          setPersisted(map);
          setChanges({});
        }
      } catch (e) {
        console.error("Fetch attendance failed:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [date]);

  // track local edits
  function setRowChange(userId, patch) {
    if (!patch || typeof patch !== "object") return;
    const nextPatch = { ...patch };

    if (Object.prototype.hasOwnProperty.call(nextPatch, "checkIn")) {
      nextPatch.checkIn = normalizeHHmm(nextPatch.checkIn);
    }
    if (Object.prototype.hasOwnProperty.call(nextPatch, "checkOut")) {
      nextPatch.checkOut = normalizeHHmm(nextPatch.checkOut);
    }
    if (Object.prototype.hasOwnProperty.call(nextPatch, "status")) {
      nextPatch.status = nextPatch.status || "";
    }
    if (Object.prototype.hasOwnProperty.call(nextPatch, "subStatus")) {
      const raw = nextPatch.subStatus;
      const normalized =
        typeof raw === "string" && raw.trim().length
          ? raw.trim().toLowerCase()
          : "";
      nextPatch.subStatus = normalized;
    }
    if (Object.prototype.hasOwnProperty.call(nextPatch, "action")) {
      const raw = nextPatch.action;
      const normalized =
        typeof raw === "string" && raw.trim().length
          ? raw.trim().toLowerCase()
          : "";
      nextPatch.action = normalized;
    }

    const base = persisted[userId] || {};

    setChanges((prev) => {
      const prevEntry = prev[userId] || {};
      const merged = { ...prevEntry, ...nextPatch };

      const previousSubStatus =
        Object.prototype.hasOwnProperty.call(prevEntry, "subStatus")
          ? prevEntry.subStatus || ""
          : base.subStatus || "";
      if (
        Object.prototype.hasOwnProperty.call(nextPatch, "subStatus") &&
        merged.subStatus &&
        previousSubStatus &&
        previousSubStatus !== merged.subStatus
      ) {
        delete merged.action;
      }

      if (merged.status && merged.status !== "present") {
        delete merged.subStatus;
        delete merged.action;
      } else {
        if (!merged.subStatus) {
          delete merged.subStatus;
          delete merged.action;
        } else if (!merged.action) {
          delete merged.action;
        }
      }

      const cleaned = { ...merged };
      if (!cleaned.subStatus) delete cleaned.subStatus;
      if (!cleaned.action) delete cleaned.action;

      if (!Object.keys(cleaned).length) {
        const { [userId]: _removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [userId]: cleaned,
      };
    });
  }

  function resetRow(userId) {
    setChanges((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  // Save single row
  async function markOne(userId) {
    const draft = changes[userId] || {};
    const current = persisted[userId] || {};
    const merged = { ...current, ...draft };
    if (!merged.status) return;

    const hasDraftCI = Object.prototype.hasOwnProperty.call(draft, "checkIn");
    const hasDraftCO = Object.prototype.hasOwnProperty.call(draft, "checkOut");

    const baseCI = normalizeHHmm(current.checkIn || "");
    const baseCO = normalizeHHmm(current.checkOut || "");

    const ci = hasDraftCI ? normalizeHHmm(draft.checkIn) : baseCI;
    const co = hasDraftCO ? normalizeHHmm(draft.checkOut) : baseCO;

    const isOff = OFF.has(merged.status);
    const subStatusValue =
      !isOff && merged.status === "present"
        ? (
            typeof merged.subStatus === "string" && merged.subStatus.trim().length
              ? merged.subStatus.trim().toLowerCase()
              : ""
          )
        : "";
    const actionValue =
      subStatusValue
        ? (
            typeof merged.action === "string" && merged.action.trim().length
              ? merged.action.trim().toLowerCase()
              : ""
          )
        : "";
    const payload = {
      userId,
      date,                           // "YYYY-MM-DD"
      status: merged.status,
      note: merged.note || "",
      checkIn: isOff ? null : (ci || null),   // "HH:mm" or null
      checkOut: isOff ? null : (co || null),  // "HH:mm" or null
      subStatus: subStatusValue ? subStatusValue : null,
      action: subStatusValue ? (actionValue || null) : null,
    };

    setSaving(true);
    try {
      const { data } = await api.post("/api/attendance/mark", payload);

      const nextStatus = data?.status ?? merged.status;
      const nextIsOff = OFF.has(nextStatus);

      const nextCI = nextIsOff ? "" : normalizeHHmm(data?.checkIn || ci || "");
      const nextCO = nextIsOff ? "" : normalizeHHmm(data?.checkOut || co || "");
      const nextSubStatus =
        nextIsOff || nextStatus !== "present"
          ? ""
          : typeof data?.subStatus === "string" && data.subStatus.length
          ? data.subStatus.toLowerCase()
          : subStatusValue;
      const nextAction =
        nextIsOff || nextStatus !== "present" || !nextSubStatus
          ? ""
          : typeof data?.action === "string" && data.action.length
          ? data.action.toLowerCase()
          : actionValue;
      const monthlyCounts = {
        short_leave:
          Number(
            data?.monthlyCounts?.short_leave ??
              current?.monthlyCounts?.short_leave ??
              0
          ) || 0,
        half_day:
          Number(
            data?.monthlyCounts?.half_day ??
              current?.monthlyCounts?.half_day ??
              0
          ) || 0,
      };

      setPersisted((prev) => ({
        ...prev,
        [userId]: {
          status: nextStatus,
          note: data?.note ?? (merged.note || ""),
          checkIn: nextCI,
          checkOut: nextCO,
          subStatus: nextSubStatus,
          action: nextAction,
          monthlyCounts,
          workedMinutes:
            data?.workedMinutes != null
              ? data.workedMinutes
              : deriveWorkedMinutes({ checkIn: nextCI, checkOut: nextCO }),
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

  // Save all modified rows
  async function saveAll() {
    const records = Object.entries(changes)
      .map(([userId, v]) => {
        const merged = { ...(persisted[userId] || {}), ...(v || {}) };
        if (!merged?.status) return null;
        const off = OFF.has(merged.status);
        const ci = normalizeHHmm(merged.checkIn || "");
        const co = normalizeHHmm(merged.checkOut || "");
        const subStatusVal =
          !off && merged.status === "present"
            ? (
                typeof merged.subStatus === "string" && merged.subStatus.trim().length
                  ? merged.subStatus.trim().toLowerCase()
                  : ""
              )
            : "";
        const actionVal =
          subStatusVal
            ? (
                typeof merged.action === "string" && merged.action.trim().length
                  ? merged.action.trim().toLowerCase()
                  : ""
              )
            : "";
        return {
          userId,
          status: merged.status,
          note: merged.note || "",
          checkIn: off ? null : ci || null,
          checkOut: off ? null : co || null,
          subStatus: subStatusVal ? subStatusVal : null,
          action: subStatusVal ? (actionVal || null) : null,
        };
      })
      .filter(Boolean);

    if (!records.length) return;

    setSaving(true);
    try {
      await api.post("/api/attendance/bulk", { date, records });

      // Refetch authoritative snapshot
      try {
        const { data } = await api.get("/api/attendance/by-date", { params: { date } });
        const map = {};
        for (const r of data?.records || []) {
          const ci = normalizeHHmm(r.checkIn || "");
          const co = normalizeHHmm(r.checkOut || "");
          map[r.userId] = {
            status: r.status,
            note: r.note || "",
            checkIn: ci,
            checkOut: co,
            subStatus:
              typeof r.subStatus === "string" ? r.subStatus.toLowerCase() : "",
            action:
              typeof r.action === "string" ? r.action.toLowerCase() : "",
            monthlyCounts: {
              short_leave: Number(r?.monthlyCounts?.short_leave ?? 0) || 0,
              half_day: Number(r?.monthlyCounts?.half_day ?? 0) || 0,
            },
            workedMinutes:
              r?.workedMinutes != null
                ? r.workedMinutes
                : deriveWorkedMinutes({ checkIn: ci, checkOut: co }),
          };
        }
        setPersisted(map);
      } catch {}

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
