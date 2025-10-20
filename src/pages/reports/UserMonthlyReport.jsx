import React from "react";
import useUserMonthReport from "@/hooks/useUserMonthReport";
import useEmployees from "@/hooks/useEmployees";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import UserProfilePdfButton from "@/components/reports/UserProfilePdfButton";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  RefreshCw,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Plane,
  Briefcase,
  AlarmClock,
  Clock,
  MapPin,
  Building2,
  BadgeInfo
} from "lucide-react";

const MONTHS = [
  [1, "January"],
  [2, "February"],
  [3, "March"],
  [4, "April"],
  [5, "May"],
  [6, "June"],
  [7, "July"],
  [8, "August"],
  [9, "September"],
  [10, "October"],
  [11, "November"],
  [12, "December"]
];

const STATUS_PILLS = {
  present: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  late: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  absent: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  leave: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  official_off: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
  short_leave: "border-purple-500/30 bg-purple-500/10 text-purple-400"
};

const SUMMARY_CARDS = [
  {
    key: "daysMarked",
    label: "Days Marked",
    icon: CalendarDays,
    gradient: "from-primary/30 via-primary/5 to-transparent"
  },
  {
    key: "present",
    label: "Present",
    icon: CheckCircle2,
    gradient: "from-emerald-500/30 via-emerald-500/5 to-transparent"
  },
  {
    key: "late",
    label: "Late",
    icon: AlarmClock,
    gradient: "from-amber-500/30 via-amber-500/5 to-transparent"
  },
  {
    key: "absent",
    label: "Absent",
    icon: XCircle,
    gradient: "from-rose-500/30 via-rose-500/5 to-transparent"
  },
  {
    key: "leave",
    label: "Leave",
    icon: Plane,
    gradient: "from-sky-500/30 via-sky-500/5 to-transparent"
  },
  {
    key: "official_off",
    label: "Official Off",
    icon: Briefcase,
    gradient: "from-indigo-500/30 via-indigo-500/5 to-transparent"
  },
  {
    key: "short_leave",
    label: "Short Leave",
    icon: CalendarDays,
    gradient: "from-purple-500/30 via-purple-500/5 to-transparent"
  },
  {
    key: "workedHours",
    label: "Worked Hours",
    icon: Clock,
    gradient: "from-foreground/20 via-foreground/5 to-transparent"
  }
];

function hhmmOrDash(value) {
  return value && value.length ? value : "--";
}

function formatDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value ?? "--";
  }
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    weekday: "short"
  });
}

function formatStatus(value) {
  if (!value) return "--";
  return String(value)
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export default function UserMonthlyReport() {
  const { year, setYear, month, setMonth, userId, setUserId, loading, data, refetch } =
    useUserMonthReport();
  const { filtered: employees, loading: usersLoading } = useEmployees();

  const meta = data?.meta;
  const summary = data?.summary;
  const days = data?.days ?? [];

  const activeMonthLabel = React.useMemo(
    () => MONTHS.find(([value]) => value === month)?.[1],
    [month]
  );

  const summaryValues = React.useMemo(
    () => {
      const totals = summary?.totals ?? {};
      return SUMMARY_CARDS.map((card) => {
        if (card.key === "daysMarked") {
          return {
            ...card,
            value: summary?.daysMarked ?? "--"
          };
        }
        if (card.key === "workedHours") {
          return {
            ...card,
            value: (summary?.workedHours ?? 0).toFixed(2)
          };
        }
        return {
          ...card,
          value: totals?.[card.key] ?? 0
        };
      });
    },
    [summary]
  );

  const trackedDays = React.useMemo(() => {
    const daysMarked = summary?.daysMarked;
    if (typeof daysMarked === "number") {
      return daysMarked;
    }
    return days.length;
  }, [summary?.daysMarked, days.length]);

  const presenceRate = React.useMemo(() => {
    if (!trackedDays) return null;
    const presentCount = summary?.totals?.present ?? 0;
    return Math.round((presentCount / trackedDays) * 100);
  }, [summary, trackedDays]);

  const userDetails = React.useMemo(() => {
    if (!meta?.user) {
      return [];
    }
    return [
      {
        label: "Employee ID",
        value: meta.user.employeeId || "--",
        icon: BadgeInfo
      },
      {
        label: "Department",
        value: meta.user.department || "--",
        icon: Building2
      },
      {
        label: "Branch",
        value: meta.user.branch || "--",
        icon: MapPin
      }
    ];
  }, [meta]);

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div className="absolute inset-x-10 top-0 h-40 bg-gradient-to-r from-primary/25 via-primary/10 to-transparent blur-3xl" />
        <div className="absolute bottom-[-160px] left-[-80px] h-72 w-72 rounded-full bg-purple-500/20 blur-[160px]" />
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/80 px-6 py-6 shadow-[0_25px_45px_-24px_rgba(15,23,42,0.6)] backdrop-blur-xl sm:px-8">
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/25 via-transparent to-transparent opacity-90" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Attendance Intelligence
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  User Monthly Attendance
                </h1>
                <p className="text-sm text-muted-foreground sm:max-w-xl">
                  Monitor employee presence, working hours, and exceptions in one streamlined view.
                  Adjust users and timelines without leaving the report.
                </p>
              </div>
            </div>
            {meta?.user && (
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                {userDetails.map((detail) => {
                  const IconComponent = detail.icon;
                  return (
                    <span
                      key={detail.label}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 backdrop-blur"
                    >
                      {IconComponent ? (
                        <IconComponent className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <span className="h-3.5 w-3.5 rounded-full border border-primary/40" />
                      )}
                      <span className="text-muted-foreground">{detail.label}:</span>
                      <span className="font-medium text-foreground">{detail.value}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] md:items-end">
            <Select value={userId ?? undefined} onValueChange={setUserId}>
              <SelectTrigger className="h-12 border-white/10 bg-white/5 p-3 text-left backdrop-blur">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {usersLoading ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading users...</div>
                ) : (
                  employees.map((employee) => (
                    <SelectItem key={employee._id} value={employee._id}>
                      {employee.fullName} - {employee.employeeId || "--"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select value={String(month)} onValueChange={(value) => setMonth(parseInt(value, 10))}>
              <SelectTrigger className="h-12 border-white/10 bg-white/5 p-3 text-left backdrop-blur">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(([value, label]) => (
                  <SelectItem key={value} value={String(value)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              value={year}
              onChange={(event) => setYear(parseInt(event.target.value || "0", 10))}
              className="h-12 border-white/10 bg-white/5 backdrop-blur"
              placeholder="Year"
            />

            <Button
              onClick={() => refetch()}
              variant="outline"
              disabled={loading}
              className="h-12 border-white/20 bg-white/5 backdrop-blur transition hover:border-primary/40"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>

            <div className="hidden md:block">
              <UserProfilePdfButton
                user={meta?.user}
                summary={summary}
                attendanceDays={days}
                monthLabel={activeMonthLabel}
                year={year}
                className="h-12 border-white/20 bg-white/5 backdrop-blur transition hover:border-primary/40"
              >
                Download Profile PDF
              </UserProfilePdfButton>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground sm:text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <CalendarDays className="h-3.5 w-3.5" />
                {activeMonthLabel ? `${activeMonthLabel} ${year}` : `Month ${year}`}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {presenceRate !== null ? `${presenceRate}% presence rate` : "Presence rate unavailable"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Average hours (Present + Late):{" "}
                <span className="font-medium text-foreground">
                  {(summary?.avgHours ?? 0).toFixed(2)} h
                </span>
              </span>
            </div>

            <UserProfilePdfButton
              user={meta?.user}
              summary={summary}
              attendanceDays={days}
              monthLabel={activeMonthLabel}
              year={year}
              variant="ghost"
              className="text-primary hover:text-primary md:hidden"
            >
              Download Profile PDF
            </UserProfilePdfButton>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
        {summaryValues.map((card) => {
          const IconComponent = card.icon;
          return (
            <Card
              key={card.label}
              className="relative overflow-hidden border border-white/10 bg-card/70 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.6)] transition-transform duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_35px_60px_-28px_rgba(79,70,229,0.35)]"
            >
              <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", card.gradient)} />
              <CardContent className="relative z-10 flex items-center justify-between gap-4 p-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="text-3xl font-semibold text-foreground">{card.value}</p>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-primary">
                  {IconComponent ? <IconComponent className="h-5 w-5" /> : null}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="rounded-3xl border border-white/10 bg-card/80 shadow-[0_25px_50px_-24px_rgba(15,23,42,0.55)] backdrop-blur-xl">
        <div className="overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader className="sticky top-0 z-10 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <TableRow>
                <TableHead className="w-[220px] text-muted-foreground">Date</TableHead>
                <TableHead className="w-[180px] text-muted-foreground">Status</TableHead>
                <TableHead className="w-[140px] text-muted-foreground">Check-in</TableHead>
                <TableHead className="w-[140px] text-muted-foreground">Check-out</TableHead>
                <TableHead className="w-[160px] text-muted-foreground">Worked (h)</TableHead>
                <TableHead className="text-muted-foreground">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index} className="border-white/5">
                    <TableCell colSpan={6}>
                      <div className="h-10 animate-pulse rounded-xl border border-dashed border-white/10 bg-white/5" />
                    </TableCell>
                  </TableRow>
                ))
              ) : days.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No attendance records for this period.
                  </TableCell>
                </TableRow>
              ) : (
                days.map((day) => (
                  <TableRow key={day._id} className="border-white/5 transition-colors hover:bg-muted/40">
                    <TableCell className="font-medium">{formatDate(day.date)}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                          STATUS_PILLS[day.status] ?? "border-white/15 bg-white/5 text-foreground"
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {formatStatus(day.status)}
                      </span>
                    </TableCell>
                    <TableCell>{hhmmOrDash(day.checkIn)}</TableCell>
                    <TableCell>{hhmmOrDash(day.checkOut)}</TableCell>
                    <TableCell>
                      {day.workedHours != null ? Number(day.workedHours).toFixed(2) : "--"}
                    </TableCell>
                    <TableCell className="max-w-[420px] text-sm text-muted-foreground">
                      {day.note?.trim() ? day.note : "--"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>    
          </Table>
        </div>
      </section>
    </div>
  );
}
