import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  Sheet, SheetTrigger, SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Menu, Settings, Search } from "lucide-react";
import Sidebar from "@/components/sidebar/AdminSidebar";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-muted/40">
      {/* desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* mobile sidebar (sheet) */}
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
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* content */}
      <div className="md:pl-72">
        {/* <Topbar /> */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// function Topbar() {
//   return (
//     <div className="sticky top-0 z-40 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
//       <div className="flex items-center gap-3 p-4">
//         <div className="relative flex-1 max-w-xl">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//           <Input placeholder="Search…" className="pl-9" />
//         </div>
//         <div className="hidden sm:flex items-center gap-2">
//           <Button variant="outline" size="sm">Download</Button>
//           <Button variant="ghost" size="icon" aria-label="Notifications">
//             <Bell className="h-5 w-5" />
//           </Button>
//           <Button variant="ghost" size="icon" aria-label="Settings">
//             <Settings className="h-5 w-5" />
//           </Button>
//           <UserMenu />
//         </div>
//       </div>
//     </div>
//   );
// }

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
