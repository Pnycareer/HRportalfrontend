import React from "react";
import useUserMonthReport from "@/hooks/useUserMonthReport";
import useEmployees from "@/hooks/useEmployees";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  BadgeInfo,
  PartyPopper,
  TrendingUp,
  Sun,
  Gauge,
  ListChecks,
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
  [12, "December"],
];

const STATUS_PILLS = {
  present: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  late: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  absent: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  leave: "border-sky-500/30 via-sky-500/5 to-transparent text-sky-400",
  official_off: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
  public_holiday: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  short_leave: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  half_day: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400",
};

const SUMMARY_CARDS = [
  {
    key: "daysMarked",
    label: "Days Marked",
    icon: CalendarDays,
    gradient: "from-primary/30 via-primary/5 to-transparent",
    accent: "text-primary",
  },
  {
    key: "present",
    label: "Present",
    icon: CheckCircle2,
    gradient: "from-emerald-500/30 via-emerald-500/5 to-transparent",
    accent: "text-emerald-400",
    showProgress: true,
  },
  {
    key: "late",
    label: "Late",
    icon: AlarmClock,
    gradient: "from-amber-500/30 via-amber-500/5 to-transparent",
    accent: "text-amber-400",
    showProgress: true,
  },
  {
    key: "absent",
    label: "Absent",
    icon: XCircle,
    gradient: "from-rose-500/30 via-rose-500/5 to-transparent",
    accent: "text-rose-400",
    showProgress: true,
  },
  {
    key: "leave",
    label: "Leave",
    icon: Plane,
    gradient: "from-sky-500/30 via-sky-500/5 to-transparent",
    accent: "text-sky-400",
    showProgress: true,
  },
  {
    key: "official_off",
    label: "Official Off",
    icon: Briefcase,
    gradient: "from-indigo-500/30 via-indigo-500/5 to-transparent",
    accent: "text-indigo-400",
    showProgress: true,
  },
  {
    key: "public_holiday",
    label: "Public Holiday",
    icon: PartyPopper,
    gradient: "from-cyan-500/30 via-cyan-500/5 to-transparent",
    accent: "text-cyan-400",
    showProgress: true,
  },
  {
    key: "short_leave",
    label: "Short Leave",
    icon: CalendarDays,
    gradient: "from-purple-500/30 via-purple-500/5 to-transparent",
    accent: "text-purple-400",
    showProgress: true,
  },
  {
    key: "half_day",
    label: "Half Day",
    icon: CalendarDays,
    gradient: "from-fuchsia-500/30 via-fuchsia-500/5 to-transparent",
    accent: "text-fuchsia-400",
    showProgress: true,
  },
  {
    key: "workedHours",
    label: "Worked Hours",
    icon: Clock,
    gradient: "from-foreground/20 via-foreground/5 to-transparent",
    accent: "text-foreground",
  },
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
    weekday: "short",
  });
}

function formatTimeTo12Hour(timeStr) {
  if (!timeStr) return "--";
  const parts = String(timeStr).split(":").map(Number);
  if (parts.length < 2) return "--";
  const [hours, minutes] = parts;
  if (isNaN(hours) || isNaN(minutes)) return "--";

  const period = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12; // 0 -> 12
  return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function formatStatus(value) {
  if (!value) return "--";
  return String(value)
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export default function UserMonthlyReport() {
  const {
    year,
    setYear,
    month,
    setMonth,
    userId,
    setUserId,
    loading,
    data,
    refetch,
  } = useUserMonthReport();
  const { filtered: employees, loading: usersLoading } = useEmployees();

  const meta = data?.meta;
  const summary = data?.summary;
  const days = data?.days ?? [];

  const activeMonthLabel = React.useMemo(
    () => MONTHS.find(([value]) => value === month)?.[1],
    [month]
  );

  const trackedDays = React.useMemo(() => {
    const daysMarked = summary?.daysMarked;
    if (typeof daysMarked === "number") {
      return daysMarked;
    }
    return days.length;
  }, [summary?.daysMarked, days.length]);

  const summaryValues = React.useMemo(() => {
    const totals = summary?.totals ?? {};
    const denominator = trackedDays || 1;
    return SUMMARY_CARDS.map((card) => {
      if (card.key === "daysMarked") {
        return {
          ...card,
          value: summary?.daysMarked ?? "--",
          progress: null,
        };
      }
      if (card.key === "workedHours") {
        return {
          ...card,
          value: (summary?.workedHours ?? 0).toFixed(2),
          progress: null,
        };
      }
      const value = totals?.[card.key] ?? 0;
      const progress = card.showProgress
        ? Math.min(100, Math.round((value / denominator) * 100))
        : null;
      return {
        ...card,
        value,
        progress,
      };
    });
  }, [summary, trackedDays]);

  const presenceRate = React.useMemo(() => {
    if (!trackedDays) return null;
    const totals = summary?.totals ?? {};
    const positiveDays =
      (totals.present ?? 0) +
      (totals.leave ?? 0) +
      (totals.official_off ?? 0) +
      (totals.public_holiday ?? 0);
    return Math.round((positiveDays / trackedDays) * 100);
  }, [summary, trackedDays]);

  const avgHoursValue = React.useMemo(() => {
    if (typeof summary?.avgHours === "number") return summary.avgHours;
    const totalHours = typeof summary?.workedHours === "number" ? summary.workedHours : 0;
    return trackedDays ? totalHours / trackedDays : 0;
  }, [summary?.avgHours, summary?.workedHours, trackedDays]);

  const userDetails = React.useMemo(() => {
    if (!meta?.user) {
      return [];
    }
    return [
      {
        label: "Employee ID",
        value: meta.user.employeeId || "--",
        icon: BadgeInfo,
      },
      {
        label: "Department",
        value: meta.user.department || "--",
        icon: Building2,
      },
      {
        label: "Branch",
        value: meta.user.branch || "--",
        icon: MapPin,
      },
    ];
  }, [meta]);

  // --- NEW: Missing check-ins / check-outs
  const missingStats = React.useMemo(() => {
    let missingCheckIns = 0;
    let missingCheckOuts = 0;

    days.forEach((d) => {
      if (!d.checkIn || d.checkIn.trim() === "") missingCheckIns++;
      if (!d.checkOut || d.checkOut.trim() === "") missingCheckOuts++;
    });

    return { missingCheckIns, missingCheckOuts };
  }, [days]);

  // --- NEW: Combine into cards list so the same map renders everything
  const combinedCards = React.useMemo(() => {
    return [
      ...summaryValues,
      {
        key: "missing_checkins",
        label: "Missing Check-ins",
        value: missingStats.missingCheckIns,
        icon: XCircle,
        gradient: "from-rose-500/30 via-rose-500/5 to-transparent",
      },
      {
        key: "missing_checkouts",
        label: "Missing Check-outs",
        value: missingStats.missingCheckOuts,
        icon: AlarmClock,
        gradient: "from-amber-500/30 via-amber-500/5 to-transparent",
      },
    ];
  }, [summaryValues, missingStats]);

  const highlightCards = React.useMemo(() => {
    const safeTracked = Math.max(trackedDays, 1);
    const paidDays = summary?.paidDays ?? 0;
    const totalHours = typeof summary?.workedHours === "number" ? summary.workedHours : 0;
    const totalMissing = missingStats.missingCheckIns + missingStats.missingCheckOuts;
    const punchHealth = 100 - Math.min(100, Math.round((totalMissing / (safeTracked * 2)) * 100));

    return [
      {
        key: "presence_pulse",
        title: "Presence Pulse",
        value: presenceRate != null ? `${presenceRate}%` : "--",
        meta:
          trackedDays > 0
            ? `${paidDays} paid of ${trackedDays} tracked days`
            : "Waiting for attendance data",
        icon: TrendingUp,
        gradient: "from-emerald-500/30 via-emerald-500/5 to-transparent",
        progress: presenceRate ?? 0,
        positive: true,
        footer: presenceRate != null && presenceRate >= 90 ? "Excellent consistency" : "Monitor dips early",
      },
      {
        key: "hour_meter",
        title: "Average Hours",
        value: `${avgHoursValue.toFixed(2)} h`,
        meta: `${Number(totalHours || 0).toFixed(1)} total hrs logged`,
        icon: Gauge,
        gradient: "from-sky-500/30 via-sky-500/5 to-transparent",
        progress: Math.min(100, Math.round((avgHoursValue / 9) * 100)),
        positive: avgHoursValue >= 7.5,
        footer: "Target 9h per working day",
      },
      {
        key: "punch_health",
        title: "Punch Health",
        value: `${punchHealth}%`,
        meta: `${missingStats.missingCheckIns} in | ${missingStats.missingCheckOuts} out missing`,
        icon: ListChecks,
        gradient: "from-rose-500/30 via-rose-500/5 to-transparent",
        progress: punchHealth,
        positive: punchHealth >= 80,
        footer: totalMissing === 0 ? "All punches captured" : "Resolve missing punches",
      },
    ];
  }, [
    avgHoursValue,
    missingStats.missingCheckIns,
    missingStats.missingCheckOuts,
    presenceRate,
    summary?.paidDays,
    summary?.workedHours,
    trackedDays,
  ]);

  const heroStats = React.useMemo(() => {
    const paid = summary?.paidDays ?? 0;
    const paidPct = trackedDays ? Math.round((paid / trackedDays) * 100) : null;
    return [
      {
        key: "hero_paid_days",
        label: "Paid Days",
        value: trackedDays ? `${paid}/${trackedDays}` : paid,
        sub: paidPct != null ? `${paidPct}% of tracked period` : "Awaiting attendance",
        icon: CheckCircle2,
        accent: "text-emerald-300",
        border: "border-emerald-500/20",
      },
      {
        key: "hero_presence_rate",
        label: "Presence Momentum",
        value: presenceRate != null ? `${presenceRate}%` : "--",
        sub: presenceRate != null ? "Goal ≥ 95%" : "Need more logs",
        icon: Sun,
        accent: "text-amber-200",
        border: "border-amber-400/20",
      },
      {
        key: "hero_avg_hours",
        label: "Avg Logged Hours",
        value: `${avgHoursValue.toFixed(2)} h`,
        sub: `${Number(summary?.workedHours ?? 0).toFixed(1)} hrs total`,
        icon: Clock,
        accent: "text-cyan-200",
        border: "border-cyan-400/20",
      },
    ];
  }, [avgHoursValue, presenceRate, summary?.paidDays, summary?.workedHours, trackedDays]);

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
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Attendance Intelligence
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  User Monthly Attendance
                </h1>
                <p className="text-sm text-muted-foreground sm:max-w-xl">
                  Monitor employee presence, working hours, and exceptions in
                  one streamlined view. Adjust users and timelines without
                  leaving the report.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {heroStats.map((stat) => {
                  const IconComponent = stat.icon;
                  return (
                    <div
                      key={stat.key}
                      className={cn(
                        "flex flex-col gap-2 rounded-2xl border bg-white/5 p-3 backdrop-blur",
                        stat.border || "border-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {stat.label}
                        {IconComponent ? (
                          <IconComponent className={cn("h-3.5 w-3.5", stat.accent || "text-primary")} />
                        ) : null}
                      </div>
                      <p className={cn("text-2xl font-semibold", stat.accent || "text-foreground")}>
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground">{stat.sub}</p>
                    </div>
                  );
                })}
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
                      <span className="text-muted-foreground">
                        {detail.label}:
                      </span>
                      <span className="font-medium text-foreground">
                        {detail.value}
                      </span>
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
                  <div className="p-2 text-sm text-muted-foreground">
                    Loading users...
                  </div>
                ) : (
                  employees.map((employee) => (
                    <SelectItem key={employee._id} value={employee._id}>
                      {employee.fullName} - {employee.employeeId || "--"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select
              value={String(month)}
              onValueChange={(value) => setMonth(parseInt(value, 10))}
            >
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
              onChange={(event) =>
                setYear(parseInt(event.target.value || "0", 10))
              }
              className="h-12 border-white/10 bg-white/5 backdrop-blur"
              placeholder="Year"
            />

            <Button
              onClick={() => refetch()}
              variant="outline"
              disabled={loading}
              className="h-12 border-white/20 bg-white/5 backdrop-blur transition hover:border-primary/40"
            >
              <RefreshCw
                className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
              />
              Refresh
            </Button>

            {/* Desktop-only */}
            <div className="hidden md:block">
              <UserProfilePdfButton
                user={meta?.user}
                summary={summary}
                attendanceDays={days.map((d) => ({
                  ...d,
                  checkIn: formatTimeTo12Hour(d.checkIn),
                  checkOut: formatTimeTo12Hour(d.checkOut),
                }))}
                monthLabel={activeMonthLabel}
                year={year}
                className="h-12 border-white/20 bg-white/5 backdrop-blur transition hover:border-primary/40"
              >
                Download Profile PDF
              </UserProfilePdfButton>
            </div>

            {/* Mobile-only */}
            <div className="block md:hidden">
              <UserProfilePdfButton
                user={meta?.user}
                summary={summary}
                attendanceDays={days.map((d) => ({
                  ...d,
                  checkIn: formatTimeTo12Hour(d.checkIn),
                  checkOut: formatTimeTo12Hour(d.checkOut),
                }))}
                monthLabel={activeMonthLabel}
                year={year}
                variant="ghost"
                className="text-primary hover:text-primary"
              >
                Download Profile PDF
              </UserProfilePdfButton>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground sm:text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <CalendarDays className="h-3.5 w-3.5" />
                {activeMonthLabel
                  ? `${activeMonthLabel} ${year}`
                  : `Month ${year}`}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {presenceRate !== null
                  ? `${presenceRate}% presence rate`
                  : "Presence rate unavailable"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Average hours (Present + Late):{" "}
                <span className="font-medium text-foreground">
                  {(summary?.avgHours ?? 0).toFixed(2)} h
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHT INSIGHTS */}
      <section className="grid gap-4 lg:grid-cols-3">
        {highlightCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <Card
              key={card.key}
              className={cn(
                "relative overflow-hidden border border-white/10 bg-card/80 backdrop-blur",
                "shadow-[0_30px_60px_-35px_rgba(15,23,42,0.8)] transition-all hover:-translate-y-1 hover:border-primary/40"
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90",
                  card.gradient
                )}
              />
              <CardContent className="relative z-10 flex flex-col gap-3 p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                      {card.title}
                    </p>
                    <p className="text-4xl font-semibold text-foreground">
                      {card.value}
                    </p>
                  </div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-primary">
                    {IconComponent ? <IconComponent className="h-5 w-5" /> : null}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{card.meta}</p>
                <div className="space-y-1.5 pt-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                    <span
                      className={cn(
                        "block h-full rounded-full transition-all duration-500",
                        card.positive ? "bg-emerald-400" : "bg-rose-400"
                      )}
                      style={{ width: `${card.progress ?? 0}%` }}
                    />
                  </div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {card.footer}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* SUMMARY GRID – now uses combinedCards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
        {combinedCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <Card
              key={card.key || card.label}
              className="relative overflow-hidden border border-white/10 bg-card/70 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.6)] transition-transform duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_35px_60px_-28px_rgba(79,70,229,0.35)]"
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br",
                  card.gradient
                )}
              />
              <CardContent className="relative z-10 flex items-center justify-between gap-4 p-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </p>
                  <p className={cn("text-3xl font-semibold", card.accent || "text-foreground")}>
                    {card.value}
                  </p>
                  {card.progress != null ? (
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                        <span
                          className="block h-full rounded-full bg-white/70"
                          style={{ width: `${card.progress}%` }}
                        />
                      </div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {card.progress}% of tracked days
                      </p>
                    </div>
                  ) : null}
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
                <TableHead className="w-[220px] text-muted-foreground">
                  Date
                </TableHead>
                <TableHead className="w-[180px] text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="w-[140px] text-muted-foreground">
                  Check-in
                </TableHead>
                <TableHead className="w-[140px] text-muted-foreground">
                  Check-out
                </TableHead>
                <TableHead className="w-[160px] text-muted-foreground">
                  Worked (h)
                </TableHead>
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
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No attendance records for this period.
                  </TableCell>
                </TableRow>
              ) : (
                days.map((day) => (
                  <TableRow
                    key={day._id}
                    className="border-white/5 transition-colors hover:bg-muted/40"
                  >
                    <TableCell className="font-medium">
                      {formatDate(day.date)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                          STATUS_PILLS[day.status] ??
                            "border-white/15 bg-white/5 text-foreground"
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {formatStatus(day.status)}
                      </span>
                    </TableCell>
                    <TableCell>{formatTimeTo12Hour(day.checkIn)}</TableCell>
                    <TableCell>{formatTimeTo12Hour(day.checkOut)}</TableCell>
                    <TableCell>
                      {day.workedHours != null
                        ? Number(day.workedHours).toFixed(2)
                        : "--"}
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
