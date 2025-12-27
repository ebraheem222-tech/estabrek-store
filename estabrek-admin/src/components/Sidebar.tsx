// src/components/Sidebar.tsx
import React from "react";
import { NavLink } from "react-router-dom";

export type SidebarItem = { to: string; label: string };

export function Sidebar({
  title = "Estabrek",
  subtitle = "Admin Dashboard",
  items,
}: {
  title?: string;
  subtitle?: string;
  items: SidebarItem[];
}) {
  return (
    <aside dir="rtl" className="w-72 shrink-0 border-l border-white/10 bg-neutral-950/70 p-4">
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-bold">{title}</div>
        <div className="mt-1 text-xs opacity-70">{subtitle}</div>
      </div>

      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                "block rounded-xl px-3 py-2 text-sm transition",
                isActive ? "bg-white/15 border border-white/10" : "hover:bg-white/10",
              ].join(" ")
            }
            end
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
