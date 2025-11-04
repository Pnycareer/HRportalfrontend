// app/(wherever)/MarkAttendance.jsx
import React, { useMemo, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useEmployees from "@/hooks/useEmployees";
import useAttendance from "@/hooks/useAttendance";
import AttendanceTable from "@/components/attendance/AttendanceTable";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

import { CITIES, getBranchesForCity } from "@/components/constants/locations";

// helpers (kept for branch merge)
function dedupeStrings(arr) {
  return Array.from(new Set((arr || []).filter(Boolean).map(String)));
}
function mergeWithAll(apiList = [], customList = []) {
  const hasAll = apiList.includes("all") || customList.includes("all");
  const merged = dedupeStrings([...apiList, ...customList].filter(v => v !== "all"));
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

  // ✅ City/Branch default to "all"
  const [city, setCity] = useState("all");

  // City options include "all" at the top
  const cityOptions = useMemo(() => ["all", ...CITIES], []); // CITIES is static

  // All branches across all cities for the "all" option
  const allCityBranches = useMemo(
    () => dedupeStrings([].concat(...CITIES.map((c) => getBranchesForCity(c)))),
    []
  );

  // Branch options = (city === 'all' ? allCityBranches : by city) ∪ API branches, keep "all"
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

  // ⛔️ Hide employees with employmentStatus = left/resigned
  const attendanceRows = useMemo(
    () =>
      filtered.filter((u) => {
        const s = String(u.employmentStatus || "").toLowerCase();
        return s !== "left" && s !== "resigned";
      }),
    [filtered]
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Mark Attendance</h1>
        <div className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium">{user?.fullName}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        {/* Search & reload */}
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, ID, email"
            className="max-w-sm"
          />
          <Button type="button" variant="secondary" onClick={() => setQ("")}>
            Clear
          </Button>
          <Button type="button" variant="outline" onClick={reload}>
            Reload
          </Button>
        </div>

        {/* City + Branch */}
        <div className="flex items-center gap-2">
          {/* City (default: All) */}
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-[200px]">
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

          {/* Branch (default: All) */}
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder={city && city !== "all" ? `Branch in ${city}` : "Branch"} />
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

        {/* Date + bulk save */}
        <div className="flex items-center gap-2 xl:ml-auto">
          <span className="text-sm">Date</span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-[180px]"
          />
          <Button
            onClick={async () => { try { await saveAll(); } catch {} }}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save All"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border p-6 text-sm text-muted-foreground">
          Loading...
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
          onMark={async (id) => { try { await markOne(id); } catch {} }}
          dateYmd={date}
          onUpdateEmployee={updateEmployee}
          onUpdateEmployeeSalary={updateEmployeeSalary}
        />
      )}
    </div>
  );
}
