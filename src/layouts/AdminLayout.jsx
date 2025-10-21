import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  Sheet, SheetTrigger, SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Menu } from "lucide-react";
import Sidebar from "@/components/sidebar/AdminSidebar";

const STORAGE_KEY = "adminSidebarCollapsed";

export default function AdminLayout() {
  const [collapsed, setCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    function handler(e) {
      if (e?.detail && typeof e.detail.collapsed === "boolean") {
        setCollapsed(e.detail.collapsed);
      }
    }
    window.addEventListener("admin:sidebar-collapsed", handler);
    return () => window.removeEventListener("admin:sidebar-collapsed", handler);
  }, []);

  // desktop left padding to avoid overlap with fixed sidebar
  const desktopPaddingClass = collapsed ? "md:pl-16" : "md:pl-72";

  return (
    <div className="min-h-screen bg-muted/40">
      {/* desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* mobile top bar + sidebar sheet */}
      <Sheet>
        <div className="md:hidden sticky top-0 z-50 bg-background border-b">
          <div className="flex items-center gap-2 p-3">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <div className="font-semibold">Admin</div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <UserMenu />
            </div>
          </div>
        </div>
        <SheetContent side="left" className="p-0 w-72">
          {/* mobile sidebar always full width inside sheet */}
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* content */}
      <div className={desktopPaddingClass}>
        <main className="p-2">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://i.pravatar.cc/64?img=8" alt="User" />
            <AvatarFallback>RB</AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-sm font-medium">Rahil</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <NavLink to="/profile">Profile</NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink to="/settings">Settings</NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
