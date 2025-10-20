import { NavLink } from "react-router-dom";

export default function SidebarLink({ label, icon: Icon, path }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
          isActive ? "bg-white/90 text-gray-900" : "text-black/80 hover:bg-white/20"
        }`
      }
    >
      <Icon className="w-5 h-5" />
      {label}
    </NavLink>
  );
}
    