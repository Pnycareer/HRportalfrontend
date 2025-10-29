import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  ClipboardList,
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
    ],
  },
];

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

  // broadcast state to layout so it can adjust padding
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {}
    window.dispatchEvent(
      new CustomEvent("admin:sidebar-collapsed", { detail: { collapsed } })
    );
  }, [collapsed]);

  const widthClass = collapsed ? "w-16" : "w-72";
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
        "fixed inset-y-0 left-0 z-40 hidden md:flex flex-col border-r bg-background transition-[width] duration-200 ease-out",
        widthClass
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center gap-2 px-3 py-3 border-b")}>
        <img
          src={avatarSrc}
          alt="User Avatar"
          className="h-9 w-9 rounded-full object-cover ring-2 ring-muted"
        />
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">
              HR Admin Panel
            </div>
            <div className="text-xs text-muted-foreground leading-tight truncate">
              {user?.email || ""}
            </div>
          </div>
        )}
        <button
          className={cn(
            "ml-auto inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs hover:bg-muted transition",
            collapsed && "mx-auto"
          )}
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        {filteredGroups.map((group) => (
          <div key={group.label} className="mb-3">
            {!collapsed && (
              <div className="px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.label}
              </div>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center rounded-lg px-2 py-2 text-sm hover:bg-muted transition",
                        isActive
                          ? "bg-muted font-medium"
                          : "text-muted-foreground",
                        collapsed ? "justify-center" : "gap-3"
                      )
                    }
                    end
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-3">
        <div
          className={cn(
            "flex items-center gap-3 mb-3",
            collapsed && "justify-center"
          )}
        >
          <div className="h-9 w-9 rounded-full bg-muted" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {user?.name || user?.fullName || "Admin"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user?.email || ""}
              </div>
            </div>
          )}
          {!collapsed && (
            <Settings className="ml-auto h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            "w-full rounded-xl border px-3 py-2 text-sm transition flex items-center justify-center gap-2 hover:bg-muted disabled:opacity-60",
            collapsed && "px-0"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && (loggingOut ? "Logging out…" : "Logout")}
        </button>
      </div>
    </aside>
  );
}
