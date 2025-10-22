// app/(wherever)/MarkAttendance.jsx
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useEmployees from "@/hooks/useEmployees";
import useAttendance from "@/hooks/useAttendance";
import AttendanceTable from "@/components/attendance/AttendanceTable";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

export default function MarkAttendance() {
  const { user } = useAuth();

  const {
    filtered,
    loading: usersLoading,
    q, setQ,
    branch, setBranch, branches,
    dept, setDept, departments,
    reload,
    updateEmployee,
    updateEmployeeSalary,
  } = useEmployees();

  const {
    date,
    setDate,
    changes,
    setRowChange,
    resetRow,
    markOne,
    saveAll,
    saving,
    persisted,
    loading: attendanceLoading,
  } = useAttendance();

  const loading = usersLoading || attendanceLoading;

  // ✅ Do NOT auto-mark late/present—only set the time
  const handleCheckInChange = React.useCallback(
    (id, hhmm) => {
      setRowChange(id, { checkIn: hhmm });
    },
    [setRowChange]
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

        {/* Branch + Department */}
        <div className="flex items-center gap-2">
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b} value={b}>
                  {b === "all" ? "All branches" : b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d === "all" ? "All departments" : d}
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
          rows={filtered}
          persisted={persisted}
          changes={changes}
          onStatusChange={(id, status) => setRowChange(id, { status })}
          onNoteChange={(id, note) => setRowChange(id, { note })}
          onCheckInChange={handleCheckInChange}
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
