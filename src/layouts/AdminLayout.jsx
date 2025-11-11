// layouts/AdminLayout.jsx
import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
import LoaderOverlay from "@/components/LoaderOverlay/LoaderOverlay"; // <— add this
import { gsap } from "gsap";

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

  // ——— route-change overlay (quick feedback even if the chunk is cached) ———
  const location = useLocation();
  const [routeChanging, setRouteChanging] = React.useState(false);
  const routeKeyRef = React.useRef(location.pathname);
  const layoutRef = React.useRef(null);

  React.useEffect(() => {
    if (routeKeyRef.current !== location.pathname) {
      routeKeyRef.current = location.pathname;
      setRouteChanging(true);
      // keep the overlay briefly to avoid flicker
      const t = setTimeout(() => setRouteChanging(false), 250);
      return () => clearTimeout(t);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".admin-aurora",
        { opacity: 0.18, scale: 0.92 },
        {
          opacity: 0.45,
          scale: 1.08,
          duration: 8,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        },
      );

      gsap.from(".admin-topbar", {
        y: -28,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        delay: 0.15,
      });

      gsap.from(".admin-main-shell", {
        y: 36,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        delay: 0.25,
      });
    }, layoutRef);

    return () => ctx.revert();
  }, []);

  // desktop left padding to avoid overlap with fixed sidebar
  const desktopPaddingClass = collapsed ? "md:pl-16" : "md:pl-72";

  return (
    <div
      ref={layoutRef}
      className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-900"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="admin-aurora absolute -left-20 top-[-18rem] h-[26rem] w-[26rem] rounded-full bg-gradient-to-br from-sky-200 via-purple-200 to-transparent blur-3xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 0.35, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <motion.div
          className="admin-aurora absolute right-[-12rem] bottom-[-16rem] h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-emerald-200 via-cyan-200 to-transparent blur-3xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </div>

      {/* desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* mobile top bar + sidebar sheet */}
      <Sheet>
        <div className="admin-topbar md:hidden sticky top-0 z-50 border-b border-white/30 bg-white/80 backdrop-blur-xl shadow-sm">
          <div className="flex items-center gap-2 p-3">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Control Center
              </span>
              <span className="text-base font-semibold text-slate-900">
                Admin
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <UserMenu />
            </div>
          </div>
        </div>
        <SheetContent side="left" className="w-72 border-r border-slate-200/60 bg-white/85 p-0 backdrop-blur-xl">
          {/* mobile sidebar always full width inside sheet */}
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* content */}
      <div className={`relative transition-[padding] duration-300 ease-out ${desktopPaddingClass}`}>
        <main className="admin-main-shell relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-10">
          {/* <motion.div
            className="mx-auto mb-6 w-full max-w-5xl rounded-2xl border border-white/60 bg-white/80 p-5 shadow-xl shadow-sky-100/40 backdrop-blur-md"
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Welcome back
                </p>
                <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  Let's craft today's workflows
                </h1>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.55)]" />
                Systems running optimally
              </div>
            </div>
          </motion.div> */}

          {/* Suspense shows loader while lazy chunks download */}
          <React.Suspense fallback={<LoaderOverlay show={true} />}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </React.Suspense>
        </main>
      </div>

      {/* quick route-change overlay (covers “already-cached” instant navigations) */}
      <AnimatePresence>
        {routeChanging && (
          <motion.div
            key="route-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <LoaderOverlay show={true} />
          </motion.div>
        )}
      </AnimatePresence>
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
