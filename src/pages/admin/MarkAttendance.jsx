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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Lateness config
const OFFICIAL_START = "09:00";
const GRACE_MINUTES = 5;

function hhmmToMinutes(hhmm) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function isAtOrAfterSixthLateMinute(checkInHHMM) {
  const cin = hhmmToMinutes(checkInHHMM);
  const start = hhmmToMinutes(OFFICIAL_START);
  if (cin == null || start == null) return false;
  const diff = cin - start; // minutes late
  return diff >= (GRACE_MINUTES + 1);
}

export default function MarkAttendance() {
  const { user } = useAuth();

  const {
    filtered,
    loading: usersLoading,
    q, setQ,
    branch, setBranch, branches,
    dept, setDept, departments,
    reload,
  } = useEmployees();

  const {
    date,
    setDate,
    changes,
    setRowChange,   // merges per-id fields into `changes`
    resetRow,
    markOne,
    saveAll,
    saving,
    persisted,
    loading: attendanceLoading,
  } = useAttendance();

  const loading = usersLoading || attendanceLoading;
  const [latePrompt, setLatePrompt] = React.useState(null);
  const closingLatePromptRef = React.useRef(false);
  const latestLatePromptRef = React.useRef(null);

  React.useEffect(() => {
    latestLatePromptRef.current = latePrompt;
  }, [latePrompt]);

  const handleCheckInChange = React.useCallback((id, hhmm) => {
    setRowChange(id, { checkIn: hhmm });

    if (!hhmm) return;

    if (isAtOrAfterSixthLateMinute(hhmm)) {
      setLatePrompt({ id, checkIn: hhmm });
    } else {
      const current = changes[id]?.status ?? persisted[id]?.status;
      if (!current) setRowChange(id, { status: "present" });
    }
  }, [changes, persisted, setRowChange]);

  const handleLateDecision = React.useCallback((markLate) => {
    if (!latePrompt) return;
    closingLatePromptRef.current = true;
    setRowChange(latePrompt.id, { status: markLate ? "late" : "present" });
    setLatePrompt(null);
  }, [latePrompt, setRowChange]);

  const handleLateDialogOpenChange = React.useCallback((open) => {
    if (open) return;
    if (closingLatePromptRef.current) {
      closingLatePromptRef.current = false;
      return;
    }
    const target = latestLatePromptRef.current;
    if (target) {
      setRowChange(target.id, { status: "present" });
      setLatePrompt(null);
    }
  }, [setRowChange]);

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
        />
      )}

      {/* Late confirmation dialog */}
      <AlertDialog open={!!latePrompt} onOpenChange={handleLateDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm lateness</AlertDialogTitle>
            <AlertDialogDescription>
              Check-in at {latePrompt?.checkIn} is beyond the {GRACE_MINUTES} minute grace period
              from {OFFICIAL_START}. How would you like to record this employee?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleLateDecision(false)}>
              Keep Present
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleLateDecision(true)}>
              Mark Late
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
