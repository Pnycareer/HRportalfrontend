// app/(wherever)/MarkAttendance.jsx
import React, { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useEmployees from "@/hooks/useEmployees";
import useAttendance from "@/hooks/useAttendance";
import AttendanceTable from "@/components/attendance/AttendanceTable";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  CalendarDays,
  RefreshCcw,
  Search,
  Users,
  Clock3,
  Sparkles,
} from "lucide-react";

import { CITIES, getBranchesForCity } from "@/components/constants/locations";

// helpers (kept for branch merge)
function dedupeStrings(arr) {
  return Array.from(new Set((arr || []).filter(Boolean).map(String)));
}
function mergeWithAll(apiList = [], customList = []) {
  const hasAll = apiList.includes("all") || customList.includes("all");
  const merged = dedupeStrings([...apiList, ...customList].filter((v) => v !== "all"));
  return hasAll ? ["all", ...merged] : merged;
}

export default function MarkAttendance() {
  const { user } = useAuth();

  // guard against hook returning undefined/null during init
  const employeesState = useEmployees() || {};

  const {
    filtered = [],
    loading: usersLoading = false,
    q = "",
    setQ = () => {},
    branch = "",
    setBranch = () => {},
    branches = [],
    reload = () => {},
    updateEmployee = () => {},
    updateEmployeeSalary = () => {},
  } = employeesState;

  const {
    date = "",
    setDate = () => {},
    changes = {},
    setRowChange = () => {},
    resetRow = () => {}, // not used
    markOne = async () => {},
    saveAll = async () => {},
    saving = false,
    persisted = {},
    loading: attendanceLoading = false,
  } = useAttendance() || {};

  const loading = usersLoading || attendanceLoading;

  // City/Branch default to "all"
  const [city, setCity] = useState("all");

  // City options include "all" at the top
  const cityOptions = useMemo(() => ["all", ...CITIES], []); // CITIES is static

  // All branches across all cities for the "all" option
  const allCityBranches = useMemo(
    () => dedupeStrings([].concat(...CITIES.map((c) => getBranchesForCity(c)))),
    [],
  );

  // Branch options = (city === 'all' ? allCityBranches : by city) union API branches, keep "all"
  const branchOptions = useMemo(() => {
    const cityBranches = city === "all" ? allCityBranches : (city ? getBranchesForCity(city) : []);
    return mergeWithAll(branches, ["all", ...cityBranches]);
  }, [city, branches, allCityBranches]);

  // If city changes and current branch becomes invalid (not in list, excluding 'all'), set to 'all'
  useEffect(() => {
    if (branch && branch !== "all" && !branchOptions.includes(String(branch))) {
      setBranch("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, branchOptions]);

  // On first mount, if branch is empty, default it to 'all'
  useEffect(() => {
    if (!branch) setBranch("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide employees with employmentStatus = left/resigned
  const attendanceRows = useMemo(
    () =>
      filtered.filter((u) => {
        const s = String(u.employmentStatus || "").toLowerCase();
        return s !== "left" && s !== "resigned";
      }),
    [filtered],
  );

  const totalActive = attendanceRows.length;
  const pendingChanges = useMemo(
    () => Object.keys(changes || {}).length,
    [changes],
  );
  const formattedDate = useMemo(() => {
    if (!date) return "No date selected";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "Invalid date";
    return parsed.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [date]);

  return (
    <div className="relative mx-auto flex max-w-6xl flex-col gap-6 pb-12">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -left-20 top-[-8rem] h-72 w-72 rounded-full bg-sky-200/35 blur-3xl"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
        <motion.div
          className="absolute right-[-12rem] bottom-[-8rem] h-80 w-80 rounded-full bg-indigo-200/30 blur-[120px]"
          initial={{ opacity: 0, scale: 0.75 }}
          animate={{ opacity: 0.45, scale: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
      </div>

      <motion.div
        className="overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-sky-400/20 via-white/80 to-white/95 p-6 shadow-xl shadow-sky-100/40 backdrop-blur-xl sm:p-8"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-sky-500 shadow-inner shadow-white/40 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-sky-500" />
              Attendance Control
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                Mark Attendance
              </h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Keep your team in sync with real-time attendance tracking, tailored filters, and quick actions. Everything updates live as you record progress.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 sm:text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 shadow-sm shadow-white/60">
                <Users className="h-3.5 w-3.5 text-sky-500" />
                Signed in as{" "}
                <span className="font-medium text-slate-700">
                  {user?.fullName || "Admin"}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 shadow-sm shadow-white/60">
                <CalendarDays className="h-3.5 w-3.5 text-sky-500" />
                {formattedDate}
              </span>
            </div>
          </div>

          <motion.div
            className="grid w-full max-w-xs grid-cols-1 gap-3 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm shadow-lg shadow-sky-100/40 backdrop-blur"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          >
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                Active team
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {totalActive}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                Pending updates
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {pendingChanges}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                Bulk save
              </p>
              <Button
                className="mt-2 w-full"
                onClick={async () => {
                  try {
                    await saveAll();
                  } catch {}
                }}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save All"}
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-xl shadow-sky-100/35 backdrop-blur-xl sm:p-6"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.12 }}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, employee ID, or email"
                className="pl-10"
              />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setQ("")}
                className="border border-slate-200/70 bg-white/70 shadow-sm hover:bg-white"
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={reload}
                className="border-sky-200/70 bg-white/70 text-sky-600 hover:bg-white"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reload
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200/80 bg-white/70 backdrop-blur-sm">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                {cityOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "all" ? "All Cities" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200/80 bg-white/70 backdrop-blur-sm">
                <SelectValue
                  placeholder={
                    city && city !== "all" ? `Branch in ${city}` : "Branch"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {branchOptions.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b === "all" ? "All branches" : b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 text-xs text-slate-500 shadow-inner shadow-white/40">
            <Clock3 className="h-4 w-4 text-sky-500" />
            You have {pendingChanges} unsaved change{pendingChanges === 1 ? "" : "s"} ready to submit.
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500">Date</span>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-[200px] rounded-xl border-slate-200/80 bg-white/70 text-sm"
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-2xl shadow-sky-100/45 backdrop-blur-xl"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
      >
        {loading ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-10 text-sm text-slate-500">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-sky-400" />
            Syncing attendance data...
          </div>
        ) : (
          <AttendanceTable
            rows={attendanceRows}
            persisted={persisted}
            changes={changes}
            onStatusChange={(id, status) => setRowChange(id, { status })}
            onSubStatusChange={(id, subStatus) => setRowChange(id, { subStatus })}
            onActionChange={(id, action) => setRowChange(id, { action })}
            onNoteChange={(id, note) => setRowChange(id, { note })}
            onCheckInChange={(id, checkIn) => setRowChange(id, { checkIn })}
            onCheckOutChange={(id, checkOut) => setRowChange(id, { checkOut })}
            onMark={async (id) => {
              try {
                await markOne(id);
              } catch {}
            }}
            dateYmd={date}
            onUpdateEmployee={updateEmployee}
            onUpdateEmployeeSalary={updateEmployeeSalary}
          />
        )}
      </motion.div>
    </div>
  );
}
