import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  FileText,
  BarChart3,
  Clock3,
  Fuel,
  Timer,
  Settings,
  LogOut,
  NotebookPen,
  ChevronLeft,
  PersonStandingIcon,
  ChevronRight,
  SheetIcon,
} from "lucide-react";

const groups = [
  {
    label: "Dashboards",
    items: [
      {
        to: "/admin",
        icon: LayoutDashboard,
        label: "Dashboard",
      },
      {
        to: "/admin/users",
        icon: Users,
        label: "Users",
      },
      {
        to: "/admin/mark-attendance",
        icon: CalendarCheck2,
        label: "Mark Attendance",
      },
      {
        to: "/admin/leaves",
        icon: NotebookPen,
        label: "Leave Requests",
      },
      {
        to: "/admin/leave-report",
        icon: FileText,
        label: "Leave Reports",
      },
      {
        to: "/admin/monthly-report",
        icon: BarChart3,
        label: "Monthly Report",
      },
      {
        to: "/admin/user-monthly",
        icon: PersonStandingIcon,
        label: "Individual Report",
      },
      {
        to: "/admin/monthly-overtime-report",
        icon: Timer,
        label: "Monthly Overtime",
      },
      {
        to: "/admin/instructor-overtime",
        icon: Clock3,
        label: "Instructor Overtime",
      },
      {
        to: "/admin/fuel-requisition-report",
        icon: Fuel,
        label: "Fuel Requisition",
      },
      {
        to: "/admin/salary-sheet",
        icon: SheetIcon,
        label: "Salary Sheet",
      },
    ],
  },
];

const MotionNavLink = motion(NavLink);

const STORAGE_KEY = "adminSidebarCollapsed";

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {}
    window.dispatchEvent(
      new CustomEvent("admin:sidebar-collapsed", { detail: { collapsed } }),
    );
  }, [collapsed]);

  const widthClass = collapsed ? "md:w-26" : "md:w-72";
  const filteredGroups = useMemo(() => {
    if (!user) return groups;
    const activeRole = user.activeRole || user.role;
    const allowMonthlyReport =
      activeRole === "superadmin" || activeRole === "admin";
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (
            item.to === "/admin/monthly-report" ||
            item.to === "/admin/monthly-overtime-report"
          ) {
            return allowMonthlyReport;
          }
          return true;
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [user]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true, state: {} });
    } catch (e) {
      console.error("Failed to logout:", e);
    } finally {
      setLoggingOut(false);
    }
  };

  const avatarSrc = useMemo(() => {
    if (!user?.profileImageUrl) return "/default-avatar.png";
    return user.profileImageUrl.startsWith("http")
      ? user.profileImageUrl
      : `${import.meta.env.VITE_API_BASE || ""}${user.profileImageUrl}`;
  }, [user]);

  return (
    <aside
      className={cn(
        "group/sidebar relative z-40 flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/80 bg-gradient-to-br from-white/95 via-white/70 to-slate-50/80 shadow-[0_20px_44px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition-[width] duration-300 ease-out",
        "md:fixed md:inset-y-0 md:left-0 md:rounded-r-3xl md:border-r md:w-auto",
        widthClass,
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-sky-300/35 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-indigo-300/30 via-transparent to-transparent" />
        <div className="absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-sky-200/18 blur-3xl" />
      </div>

      <div className="relative z-10 flex h-full w-full flex-col">
        <div className="flex items-center gap-3 px-3.5 pb-4 pt-4">
          <div className="relative">
            <img
              // src={avatarSrc}
              alt="User Avatar"
              className="h-10 w-10 rounded-full object-cover ring-2 ring-white/80 shadow-md shadow-sky-100/50"
            />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                HR Suite
              </div>
              <div className="text-base font-semibold leading-tight text-slate-900">
                Control Panel
              </div>
              <div className="truncate text-xs leading-tight text-slate-500">
                {user?.email || ""}
              </div>
            </div>
          )}
          <motion.button
            className={cn(
              "ml-auto inline-flex items-center justify-center rounded-full border border-white/70 bg-white/80 p-2 text-slate-500 shadow-sm transition",
              collapsed && "mx-auto",
            )}
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expand" : "Collapse"}
            whileHover={{ scale: 1.05, rotate: collapsed ? 0 : 3 }}
            whileTap={{ scale: 0.92 }}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </motion.button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-6 pt-2">
          {filteredGroups.map((group) => (
            <div key={group.label} className="mb-6">
              {!collapsed && (
                <div className="mb-3 flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                  <span className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-200/50 to-transparent" />
                  <span>{group.label}</span>
                </div>
              )}
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li key={item.to} className="relative">
                    <MotionNavLink
                      to={item.to}
                      whileHover={{
                        x: collapsed ? 0 : 6,
                        scale: collapsed ? 1.05 : 1.02,
                      }}
                      whileFocus={{ x: collapsed ? 0 : 6 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className={({ isActive }) =>
                        cn(
                          "relative flex items-center rounded-xl px-2.5 py-2 text-sm font-medium text-slate-500 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/70",
                          collapsed ? "justify-center" : "gap-3 pl-3 pr-3.5",
                          isActive && "text-slate-900",
                        )
                      }
                      end
                      title={collapsed ? item.label : undefined}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.span
                              layoutId="sidebar-active"
                              className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-sky-400/25 via-sky-300/15 to-transparent shadow-lg shadow-sky-100/45"
                              transition={{
                                type: "spring",
                                stiffness: 360,
                                damping: 32,
                              }}
                            />
                          )}
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                          {!collapsed && (
                            <motion.span
                              layout="position"
                              className="pointer-events-none absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.45)]"
                              initial={false}
                              animate={{
                                opacity: isActive ? 1 : 0,
                                scale: isActive ? 1 : 0.55,
                              }}
                              transition={{ duration: 0.2 }}
                            />
                          )}
                        </>
                      )}
                    </MotionNavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="relative mt-auto px-3.5 pb-4 pt-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-3 py-2.5 shadow-inner shadow-white/40 backdrop-blur-sm",
              collapsed && "justify-center px-2",
            )}
          >
            <div className="relative">
              <img
                src={avatarSrc}
                alt="User Avatar"
                className="h-9 w-9 rounded-full object-cover"
              />
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-emerald-400" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {user?.name || user?.fullName || "Admin"}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {user?.email || ""}
                </div>
              </div>
            )}
            {!collapsed && <Settings className="ml-auto h-4 w-4 text-slate-400" />}
          </div>

          <motion.button
            onClick={handleLogout}
            disabled={loggingOut}
            className={cn(
              "mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-sky-500 to-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-200/60 transition hover:from-sky-400 hover:via-sky-500 hover:to-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 disabled:cursor-not-allowed disabled:opacity-70",
              collapsed && "px-0",
            )}
            title={collapsed ? "Logout" : undefined}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && (loggingOut ? "Logging out..." : "Logout")}
          </motion.button>
        </div>
      </div>
    </aside>
  );
}
