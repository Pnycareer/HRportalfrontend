import { sidebarLinks } from "./SidebarData";
import SidebarLink from "./SidebarLink";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside className="min-h-screen w-[230px] shrink-0 bg-gradient-to-br from-orange-200 via-orange-50 to-orange-100 shadow-md flex flex-col border-r border-white/30 py-6">
      {/* Sidebar Links */}
      <nav className="flex flex-col gap-2 px-2">
        {sidebarLinks.map((item) => (
          <SidebarLink key={item.label} {...item} />
        ))}

        {/* Logout just below last link */}
        <button
          onClick={handleLogout}
          className="mt-4 flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium text-black/80 hover:bg-black/10 transition"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </nav>
    </aside>
  );
}
