// Choosing the admin look: a quick day/night button for the top bar and the
// full choice (rose day / rose night / classic) for the sidebar.
import React from "react";
import { cn } from "../../components/ui/cn";
import { SKINS, setSkin, useSkin, type AdminSkin } from "../../theme/skin";
import { Icons } from "../adminNav";

export function SkinToggleButton() {
  const skin = useSkin();
  const next: AdminSkin = skin === "rose" ? "rose-night" : "rose";
  const label = skin === "rose" ? "الوضع الليلي" : "الوضع النهاري";
  return (
    <button
      type="button"
      onClick={() => setSkin(next)}
      className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-white/60 transition hover:bg-white/[0.06] hover:text-white [&_svg]:h-[18px] [&_svg]:w-[18px]"
      title={label}
      aria-label={label}
      data-testid="skin-toggle"
    >
      {skin === "rose" ? Icons.moon : Icons.sun}
    </button>
  );
}

const SWATCH: Record<AdminSkin, string> = {
  rose: "linear-gradient(135deg,#fff9fb 0 50%,#a43b64 50% 100%)",
  "rose-night": "linear-gradient(135deg,#1f131a 0 50%,#c94f80 50% 100%)",
  classic: "linear-gradient(135deg,#141416 0 50%,#8b5cf6 50% 100%)",
};

export function SkinPicker({ compact }: { compact?: boolean }) {
  const skin = useSkin();
  return (
    <div role="radiogroup" aria-label="مظهر لوحة الإدارة" className={cn("flex items-center gap-1.5", compact ? "flex-col" : "")}>
      {!compact && <span className="ml-auto text-[11px] text-white/40">المظهر</span>}
      {SKINS.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={skin === s.id}
          onClick={() => setSkin(s.id)}
          title={`${s.label} — ${s.hint}`}
          aria-label={s.label}
          className={cn("h-6 w-6 rounded-full border transition", skin === s.id ? "border-accent-500 ring-2 ring-accent-500/30" : "border-white/15 hover:scale-110")}
          style={{ background: SWATCH[s.id] }}
        />
      ))}
    </div>
  );
}
