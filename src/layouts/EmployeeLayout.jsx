import React from "react";
import { Link, Outlet, useMatch, useResolvedPath } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LABELS } from "@/components/constants/attendance";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  CalendarCheck2,
  UserRound,
  LayoutDashboard,
  LogOut,
  Settings,
  CircleHelp,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Clock3,
  Fuel,
  NotebookPen,
  CalendarClock,
  Headphones,
  Bell,
  FileText,
  Loader2,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/axios";
import { motion, AnimatePresence } from "framer-motion";

function formatNotificationDateRange(from, to) {
  try {
    const start = new Date(from);
    const end = new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "Dates pending";
    }
    const sameDay = start.toDateString() === end.toDateString();
    const options = { day: "numeric", month: "short" };
    const startLabel = start.toLocaleDateString(undefined, options);
    const endLabel = end.toLocaleDateString(undefined, options);
    return sameDay ? startLabel : `${startLabel} - ${endLabel}`;
  } catch {
    return "Dates pending";
  }
}

function formatRelativeTimestamp(value) {
  if (!value) return "just now";
  try {
    const now = Date.now();
    const ts = new Date(value).getTime();
    if (Number.isNaN(ts)) return "just now";
    const diffMs = now - ts;
    if (diffMs < 60000) return "just now";
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 60) {
      return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    }
    return new Date(ts).toLocaleDateString();
  } catch {
    return "just now";
  }
}

function formatTime(iso) {
  if (!iso) return "--";
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--";
  }
}

function formatLocalDateKey(input = new Date()) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const BASE_NAV = [
  { href: "/employee", label: "My Attendance", icon: CalendarCheck2 },
  { href: "/employee/leaves", label: "Leave Centre", icon: NotebookPen },
  { href: "/employee/leave-report", label: "Leave Reports", icon: FileText },
  { href: "/employee/instructor-overtime", label: "Instructor Overtime", icon: Clock3 },
  { href: "/employee/fuel-requisition", label: "Fuel Requisition", icon: Fuel },
];

const QUICK_METRICS = [
  {
    label: "Attendance Score",
    value: "98%",
    helper: "+2.1% this month",
    icon: TrendingUp,
    gradient: "from-primary/30 via-primary/10 to-transparent",
  },
  {
    label: "Logged Hours",
    value: "142h",
    helper: "Week-to-date",
    icon: Clock3,
    gradient: "from-indigo-400/30 via-indigo-500/10 to-transparent",
  },
  {
    label: "Open Requests",
    value: "3",
    helper: "Awaiting approval",
    icon: NotebookPen,
    gradient: "from-pink-400/25 via-pink-500/10 to-transparent",
  },
  {
    label: "SLA Health",
    value: "100%",
    helper: "Support tickets on track",
    icon: ShieldCheck,
    gradient: "from-emerald-400/25 via-emerald-500/10 to-transparent",
  },
];

const QUICK_ACTIONS = [
  {
    title: "Clock In",
    description: "Capture today's attendance and breaks with one tap.",
    href: "/employee/attendance",
    icon: CalendarClock,
    gradient: "from-emerald-500/25 via-emerald-500/10 to-transparent",
  },
  {
    title: "Update Profile",
    description: "Refresh contact info, skills, and availability.",
    href: "/employee/profile",
    icon: UserRound,
    gradient: "from-sky-500/25 via-sky-500/10 to-transparent",
  },
  {
    title: "Raise Support Ticket",
    description: "Get instant help from the people team.",
    href: "/employee",
    icon: Headphones,
    gradient: "from-violet-500/25 via-violet-500/10 to-transparent",
  },
  {
    title: "Review Policies",
    description: "Stay aligned with the latest handbook updates.",
    href: "/employee/profile",
    icon: NotebookPen,
    gradient: "from-amber-500/25 via-amber-500/10 to-transparent",
  },
];

const ANNOUNCEMENTS = [
  {
    title: "Pulse survey closes Friday",
    description:
      "Share feedback in less than 2 minutes and help shape new perks.",
    badge: "Reminder",
  },
  {
    title: "Hybrid collaboration day July 24",
    description:
      "Meet cross-functional teams in the studio or dial in remotely.",
    badge: "Upcoming",
  },
  {
    title: "Wellbeing resources refreshed",
    description:
      "Access the latest workshops and benefits inside the employee hub.",
    badge: "New",
  },
];

const SIDEBAR_WIDTH = {
  expanded: 280,
  collapsed: 92,
};

const sidebarLabelVariants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
};

function SidebarItem({ href, label, icon, collapsed }) {
  const Icon = icon;
  const resolvedPath = useResolvedPath(href);
  const match = useMatch({ path: resolvedPath.pathname, end: true });
  const isActive = Boolean(match);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip disableHoverableContent={!collapsed}>
        <TooltipTrigger asChild>
          <Link
            to={href}
            className={cn(
              "group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3 py-2.5 text-sm font-medium transition-all duration-300",
              collapsed ? "justify-center" : "",
              isActive
                ? "border-primary/60 bg-primary/10 text-primary shadow-[0_20px_45px_-24px_rgba(79,70,229,0.9)]"
                : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/5 hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "relative grid h-9 w-9 place-items-center rounded-xl border text-muted-foreground transition-all duration-300",
                "border-white/10 bg-background/80 group-hover:border-primary/40 group-hover:text-primary",
                isActive &&
                  "border-primary/60 bg-primary/15 text-primary shadow-inner"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <AnimatePresence initial={false} mode="wait">
              {!collapsed && (
                <motion.span
                  key="label"
                  variants={sidebarLabelVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex-1 truncate"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
            <span
              className={cn(
                "absolute right-3 top-1/2 hidden h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary/80 transition-all duration-300",
                isActive && "opacity-100 md:block"
              )}
            />
          </Link>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right" className="px-2 py-1 text-xs">
            {label}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

const DesktopSidebar = React.memo(function DesktopSidebar({ navItems }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const sidebarWidth = collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded;
  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((value) => !value);
  }, []);

  return (
    <motion.aside
      layout
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={{ type: "spring", stiffness: 340, damping: 32, mass: 0.7 }}
      className="hidden md:flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-card/70 p-4 shadow-[0_25px_50px_-24px_rgba(15,23,42,0.65)] backdrop-blur-xl"
      style={{ width: sidebarWidth }}
    >
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-background/60 px-3 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-card/70">
            <Settings className="h-5 w-5 text-primary" />
          </span>
          <AnimatePresence initial={false} mode="wait">
            {!collapsed && (
              <motion.div
                key="sidebar-meta"
                variants={sidebarLabelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="leading-tight"
              >
                <div className="text-sm font-semibold text-foreground">
                  Employee Command
                </div>
                <div className="text-xs text-muted-foreground">Version 1.0</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar (B)" : "Collapse sidebar (B)"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <SidebarItem key={item.href} {...item} collapsed={collapsed} />
        ))}
      </nav>
    </motion.aside>
  );
});

export default function EmployeeLayout({ title = "Employee" }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const showNotifications = Boolean(user?.isTeamLead);
  const unreadLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  const handleNotificationsOpenChange = React.useCallback(
    (open) => {
      if (open && unreadCount) {
        markAllAsRead();
      }
    },
    [markAllAsRead, unreadCount]
  );

  const navItems = React.useMemo(() => {
    const items = [...BASE_NAV];
    items.splice(2, 0, {
      href: "/employee/team-lead/review",
      label: user?.isTeamLead ? "Team Lead Review" : "Team Lead Access",
      icon: ShieldCheck,
    });
    return items;
  }, [user?.isTeamLead]);

  const apiBase = import.meta.env.VITE_API_BASE || "";
  const rawAvatar = user?.profileImageUrl || user?.signatureImageUrl || "";
  const avatarUrl = rawAvatar
    ? rawAvatar.startsWith("http")
      ? rawAvatar
      : `${apiBase}${rawAvatar}`
    : "";

  const initials = (user?.fullName || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const firstName = user?.fullName?.split(" ")?.[0] || "there";

  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const clockTime = React.useMemo(
    () => now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    [now]
  );
  const clockDay = React.useMemo(
    () => now.toLocaleDateString(undefined, { weekday: "long" }),
    [now]
  );
  const clockDate = React.useMemo(
    () => now.toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" }),
    [now]
  );

  const userId = React.useMemo(() => {
    if (!user) return null;
    const identifier = user._id ?? user.id ?? null;
    return identifier ? String(identifier) : null;
  }, [user]);

  const [selfForm, setSelfForm] = React.useState({ password: "", note: "" });
  const [submittingAction, setSubmittingAction] = React.useState(null);
  const [loadingToday, setLoadingToday] = React.useState(false);
  const [todayRecord, setTodayRecord] = React.useState(null);
  const [selfieModalOpen, setSelfieModalOpen] = React.useState(false);
  const [selfieAction, setSelfieAction] = React.useState(null);
  const [cameraStream, setCameraStream] = React.useState(null);
  const [cameraLoading, setCameraLoading] = React.useState(false);
  const [cameraError, setCameraError] = React.useState(null);
  const [capturedImage, setCapturedImage] = React.useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  const fetchTodayRecord = React.useCallback(async () => {
    if (!userId) return;
    setLoadingToday(true);
    try {
      const todayKey = formatLocalDateKey();
      const timezoneOffset = new Date().getTimezoneOffset();
      const { data } = await api.get("/api/attendance/by-date", {
        params: { date: todayKey, timezoneOffset },
      });
      const current = data?.records?.find((record) => record.userId === userId);
      setTodayRecord(current || null);
    } catch (error) {
      console.error("Failed to load today's attendance", error);
      toast.error(error.message || "Failed to load today's attendance");
    } finally {
      setLoadingToday(false);
    }
  }, [userId]);

  React.useEffect(() => {
    fetchTodayRecord();
  }, [fetchTodayRecord]);

  const hasCheckedIn = Boolean(todayRecord?.checkIn);
  const hasCheckedOut = Boolean(todayRecord?.checkOut);
  const todayStatusLabel = todayRecord?.status
    ? LABELS?.[todayRecord.status] ?? todayRecord.status.replace(/_/g, " ")
    : "Not marked yet";
  const checkInTime = hasCheckedIn ? formatTime(todayRecord.checkIn) : "--";
  const checkOutTime = hasCheckedOut ? formatTime(todayRecord.checkOut) : "--";

  const handleSelfAttendance = React.useCallback(
    async (action, snapshot) => {
      if (!userId) return;
      if (!selfForm.password?.trim()) {
        toast.error("Enter your password to continue");
        return;
      }
      if (action === "check-in" && hasCheckedIn) {
        toast.error("Check-in already recorded for today");
        return;
      }
      if (action === "check-out") {
        if (!hasCheckedIn) {
          toast.error("Check-in first before checking out");
          return;
        }
        if (hasCheckedOut) {
          toast.error("Check-out already recorded for today");
          return;
        }
      }

      if (!snapshot || typeof snapshot !== "string") {
        toast.error("Capture your face before confirming");
        return;
      }

      setSubmittingAction(action);
      try {
        const timezoneOffset = new Date().getTimezoneOffset();
        const payload = {
          action,
          password: selfForm.password,
          timezoneOffset,
          snapshot,
        };
        const trimmedNote = selfForm.note?.trim();
        if (trimmedNote) payload.note = trimmedNote;

        const { data } = await api.post("/api/attendance/self/mark", payload);
        toast.success(
          data?.message ||
            (action === "check-in"
              ? "Check-in recorded"
              : "Check-out recorded")
        );
        setSelfForm({ password: "", note: "" });
        await fetchTodayRecord();
        return true;
      } catch (error) {
        toast.error(
          error.message ||
            `Unable to ${action === "check-in" ? "check in" : "check out"}`
        );
        setSelfForm((prev) => ({ ...prev, password: "" }));
        return false;
      } finally {
        setSubmittingAction(null);
      }
    },
    [
      userId,
      selfForm.password,
      selfForm.note,
      hasCheckedIn,
      hasCheckedOut,
      fetchTodayRecord,
    ]
  );

  const stopCamera = React.useCallback(() => {
    setCameraStream((stream) => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      return null;
    });
  }, []);

  React.useEffect(() => {
    if (!selfieModalOpen) {
      setCapturedImage(null);
      setCameraError(null);
      stopCamera();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera access is not supported in this browser");
      setCameraLoading(false);
      return;
    }

    let canceled = false;
    setCameraLoading(true);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        if (canceled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        setCameraStream(stream);
        setCameraError(null);
      })
      .catch((error) => {
        setCameraError(
          error?.message || "Unable to access the device camera. Check permissions."
        );
      })
      .finally(() => {
        if (!canceled) {
          setCameraLoading(false);
        }
      });

    return () => {
      canceled = true;
      stopCamera();
    };
  }, [selfieModalOpen, stopCamera]);

  React.useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    if (cameraStream) {
      element.srcObject = cameraStream;
      element.play().catch(() => {});
    } else {
      element.srcObject = null;
    }
  }, [cameraStream]);

  const initiateSelfie = React.useCallback(
    (action) => {
      if (!selfForm.password?.trim()) {
        toast.error("Enter your password to continue");
        return;
      }
      if (action === "check-in" && hasCheckedIn) {
        toast.error("Check-in already recorded for today");
        return;
      }
      if (action === "check-out") {
        if (!hasCheckedIn) {
          toast.error("Check-in first before checking out");
          return;
        }
        if (hasCheckedOut) {
          toast.error("Check-out already recorded for today");
          return;
        }
      }
      setCapturedImage(null);
      setCameraError(null);
      setSelfieAction(action);
      setSelfieModalOpen(true);
    },
    [selfForm.password, hasCheckedIn, hasCheckedOut]
  );

  const captureSnapshot = React.useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      toast.error("Camera not ready yet");
      return;
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      toast.error("Camera is still initializing. Please try again");
      return;
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
  }, []);

  const closeSelfieModal = React.useCallback(() => {
    setSelfieModalOpen(false);
    setSelfieAction(null);
    setCapturedImage(null);
    setCameraError(null);
    setCameraLoading(false);
  }, []);

  const confirmSelfieSubmission = React.useCallback(async () => {
    if (!selfieAction) return;
    if (!capturedImage) {
      toast.error("Capture your face before confirming");
      return;
    }
    const ok = await handleSelfAttendance(selfieAction, capturedImage);
    if (ok) {
      closeSelfieModal();
    }
  }, [selfieAction, capturedImage, handleSelfAttendance, closeSelfieModal]);

  const isSubmitting = Boolean(submittingAction);
  const disableCheckIn = isSubmitting || loadingToday || hasCheckedIn;
  const disableCheckOut =
    isSubmitting || loadingToday || !hasCheckedIn || hasCheckedOut;

  return (
    <>
      <div className="relative min-h-screen overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-[-180px] right-[-140px] h-[520px] w-[520px] rounded-full bg-pink-500/20 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-3 sm:px-6">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[300px] border-white/10 bg-background/95 p-0 backdrop-blur-xl"
                >
                  <div className="flex flex-col gap-6 px-5 py-6">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur">
                      <Avatar className="h-10 w-10 border border-white/10">
                        <AvatarImage
                          src={user?.avatar || ""}
                          alt={user?.fullName || ""}
                        />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-semibold leading-tight">
                          {user?.fullName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Employee
                        </div>
                      </div>
                    </div>
                    <nav className="space-y-2">
                      {navItems.map((item) => (
                        <SidebarItem
                          key={item.href}
                          {...item}
                          collapsed={false}
                        />
                      ))}
                    </nav>
                    <Separator />
                    <Button
                      variant="outline"
                      className="justify-start gap-2"
                      onClick={logout}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex flex-col">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {title} Hub
                </span>
                <span className="text-sm font-medium text-foreground">
                  Design your best workday
                </span>
              </div>
            </div>

            <div className="hidden items-center gap-4 md:flex">
              <div className="hidden lg:flex">
                <Input
                  placeholder="Search anything..."
                  className="w-[260px] border-white/10 bg-card/60 backdrop-blur placeholder:text-muted-foreground"
                />
              </div>
              <Separator orientation="vertical" className="h-8 bg-white/10" />
              {showNotifications && (
                <>
                  <DropdownMenu onOpenChange={handleNotificationsOpenChange}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-10 w-10 rounded-full border border-white/10 bg-white/5 text-foreground shadow-sm backdrop-blur hover:bg-white/10"
                      >
                        <Bell className="h-4 w-4" />
                        {unreadCount > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-white">
                            {unreadLabel}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-80 border border-white/10 bg-card/90 p-0 shadow-2xl backdrop-blur-xl"
                    >
                      <DropdownMenuLabel className="px-3 py-2 text-sm font-semibold text-foreground">
                        Team lead alerts
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                            You are all caught up.
                          </div>
                        ) : (
                          notifications.map((notification, index) => {
                            const metaParts = [];
                            if (notification.leaveCategory) {
                              metaParts.push(notification.leaveCategory);
                            }
                            if (notification.leaveType) {
                              metaParts.push(notification.leaveType);
                            }
                            const meta = metaParts.join(" / ");
                            return (
                              <div
                                key={notification.id}
                                className={cn(
                                  "px-4 py-3 text-sm transition-colors hover:bg-white/5",
                                  index !== notifications.length - 1 &&
                                    "border-b border-white/10"
                                )}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-foreground">
                                    {notification.employeeName ||
                                      "New leave request"}
                                  </span>
                                </div>
                                {meta && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {meta}
                                  </div>
                                )}
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {formatNotificationDateRange(
                                    notification.fromDate,
                                    notification.toDate
                                  )}
                                </div>
                                <div className="mt-1 text-[11px] text-muted-foreground">
                                  {formatRelativeTimestamp(
                                    notification.receivedAt
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Separator
                    orientation="vertical"
                    className="hidden h-8 bg-white/10 lg:block"
                  />
                </>
              )}
              <span className="hidden items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 lg:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Online
              </span>
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9 border border-white/10">
                  <AvatarImage
                    src={avatarUrl || ""}
                    alt={user?.fullName || ""}
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <div className="text-sm font-semibold leading-4">
                    {user?.fullName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user?.email}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 bg-white/5 backdrop-blur"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full flex-1 flex-col gap-6 px-3 py-6 sm:px-6 md:grid md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
          <DesktopSidebar navItems={navItems} />

          <main className="min-w-0 space-y-6">
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/60 px-6 py-7 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:px-8 md:py-8">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/5 to-transparent" />
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                    Guided mode
                  </span>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Welcome back, {firstName}. We already lined up what matters
                    today.
                  </h1>
                  <p className="max-w-xl text-sm text-muted-foreground">
                    Stay on top of attendance, requests, and growth without
                    friction. This workspace is tuned for momentum.
                  </p>
                </div>
                <div className="relative ml-auto">
                  <div className="pointer-events-none absolute inset-0 translate-x-6 rounded-full bg-primary/30 blur-2xl" />
                  <Avatar className="relative z-10 h-20 w-20 border-2 border-white/30 shadow-lg">
                    <AvatarImage
                      src={avatarUrl}
                      alt={user?.fullName || ""}
                    />
                    <AvatarFallback className="text-lg font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              {/* <div className="relative z-10 mt-8">
                <div className="rounded-2xl border border-white/10 bg-background/80 p-6 shadow-[0_20px_45px_-18px_rgba(15,23,42,0.55)] backdrop-blur">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">
                        Mark today&apos;s attendance
                      </h2>
                      <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                        Check in or out yourself. We confirm it&apos;s really you by asking for your account password.
                      </p>
                    </div>
                    {loadingToday && (
                      <span className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Syncing
                      </span>
                    )}
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 backdrop-blur">
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
                        Live clock
                      </span>
                      <div className="mt-2 text-black text-2xl font-semibold">
                        {clockTime}
                      </div>
                      <div className="mt-2 text-sm font-medium uppercase tracking-[0.2em] text-primary/80">
                        {clockDay}
                      </div>
                      <div className="mt-1 text-sm text-primary/80">{clockDate}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        Status
                      </span>
                      <div className="mt-2 text-lg font-semibold text-foreground">
                        {todayStatusLabel}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        Check-in
                      </span>
                      <div className="mt-2 text-lg font-semibold text-foreground">
                        {checkInTime}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        Check-out
                      </span>
                      <div className="mt-2 text-lg font-semibold text-foreground">
                        {checkOutTime}
                      </div>
                    </div>
                  </div>
                  {todayRecord?.note ? (
                    <div className="mt-4 rounded-xl border border-amber-500/30 bg-gray-500 p-4 text-sm text-amber-200/90">
                      <span className="font-medium uppercase tracking-[0.2em] text-amber-200">Note on file</span>
                      <p className="mt-2 leading-snug text-amber-50/90">
                        {todayRecord.note}
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-6 grid gap-4">
                    <label className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                      Account password
                    </label>
                    <Input
                      type="password"
                      value={selfForm.password}
                      onChange={(event) =>
                        setSelfForm((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Enter your password to confirm"
                      disabled={isSubmitting}
                      className="border-white/10 bg-white/5 backdrop-blur"
                    />
                    <label className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                      Note (optional)
                    </label>
                    <Textarea
                      value={selfForm.note}
                      onChange={(event) =>
                        setSelfForm((prev) => ({
                          ...prev,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Anything your manager should know about today?"
                      rows={3}
                      className="border-white/10 bg-white/5 backdrop-blur"
                      disabled={isSubmitting}
                    />
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button
                        onClick={() => initiateSelfie("check-in")}
                        disabled={disableCheckIn || !selfForm.password.trim()}
                        className="flex items-center gap-2"
                      >
                        {submittingAction === "check-in" && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {hasCheckedIn ? "Check-in complete" : "Check in"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => initiateSelfie("check-out")}
                        disabled={disableCheckOut || !selfForm.password.trim()}
                        className="flex items-center gap-2"
                      >
                        {submittingAction === "check-out" && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {hasCheckedOut ? "Check-out complete" : "Check out"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div> */}
            </section>

            <section className="rounded-3xl border border-white/10 bg-card/70 p-6 shadow-[0_25px_50px_-18px_rgba(15,23,42,0.55)] backdrop-blur-xl">
              <Outlet />
            </section>
          </main>
        </div>
      </div>
      </div>
      <Dialog
        open={selfieModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeSelfieModal();
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Capture face snapshot</DialogTitle>
            <DialogDescription>
              {selfieAction === "check-out"
                ? "Take a quick photo to confirm your check-out."
                : "Take a quick photo to confirm your check-in."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {cameraError ? (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {cameraError}
              </div>
            ) : (
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
                {capturedImage ? (
                  <img
                    src={capturedImage}
                    alt="Captured face"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                )}
                {cameraLoading && (
                  <div className="absolute inset-0 grid place-items-center gap-2 bg-black/60 text-sm text-white">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Starting camera…
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={captureSnapshot}
                disabled={
                  cameraLoading ||
                  !!capturedImage ||
                  !cameraStream ||
                  !!cameraError
                }
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Capture photo
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCapturedImage(null)}
                disabled={cameraLoading || !capturedImage}
              >
                Retake
              </Button>
              <Button
                type="button"
                onClick={confirmSelfieSubmission}
                disabled={!capturedImage || !!cameraError || isSubmitting}
                className="ml-auto flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm {selfieAction === "check-out" ? "check-out" : "check-in"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}
