import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Settings, LogOut, NotebookPen, FileText } from "lucide-react";

const groups = [
  {
    label: "Dashboards",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/admin/users", icon: LayoutDashboard, label: "Users" },
      { to: "/admin/mark-attendance", icon: LayoutDashboard, label: "Mark Attendance" },
      { to: "/admin/leaves", icon: NotebookPen, label: "Leave Requests" },
      { to: "/admin/leave-report", icon: FileText, label: "Leave Reports" },
      { to: "/admin/monthly-report", icon: LayoutDashboard, label: "Monthly Report" },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout(); // calls your context -> API -> clears user
      navigate("/login", { replace: true, state: {} });
    } catch (e) {
      // optional: toast here if you use one
      console.error("Failed to logout:", e);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden md:flex w-72 flex-col border-r bg-background">
      <div className="h-32 flex flex-col items-center justify-center gap-2 px-4 py-2">
        <img
          src={
            user?.profileImageUrl
              ? user.profileImageUrl.startsWith("http")
                ? user.profileImageUrl
                : `${import.meta.env.VITE_API_BASE || ""}${user.profileImageUrl}`
              : "/default-avatar.png"
          }
          alt="User Avatar"
          className="h-14 w-14 rounded-full object-cover ring-2 ring-muted"
        />
        <div className="text-lg font-semibold">HR Admin Panel</div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {group.label}
            </div>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted transition",
                        isActive
                          ? "bg-muted font-medium"
                          : "text-muted-foreground"
                      )
                    }
                    end
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-muted" />
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {user?.name || "Admin"}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {user?.email || ""}
            </div>
          </div>
          <Settings className="ml-auto h-4 w-4 text-muted-foreground" />
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            "w-full rounded-xl border px-3 py-2 text-sm transition flex items-center justify-center gap-2",
            "hover:bg-muted disabled:opacity-60"
          )}
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? "Logging out…" : "Logout"}
        </button>
      </div>
    </aside>
  );
}
