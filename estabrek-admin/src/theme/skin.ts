// Admin skin: the look of the whole admin on this device.
// "rose" (light, like the storefront) is the default; "rose-night" is the dark
// rose version; "classic" is the original dark violet admin (and the only one
// where the theme presets from the settings page apply).
import { useSyncExternalStore } from "react";

export type AdminSkin = "rose" | "rose-night" | "classic";

export const SKINS: Array<{ id: AdminSkin; label: string; hint: string }> = [
  { id: "rose", label: "روز نهاري", hint: "فاتح مثل المتجر" },
  { id: "rose-night", label: "روز ليلي", hint: "داكن ومريح للعين" },
  { id: "classic", label: "الكلاسيكي", hint: "الشكل القديم البنفسجي" },
];

const KEY = "estabrek_admin_skin_v1";
const listeners = new Set<() => void>();

function isSkin(v: unknown): v is AdminSkin {
  return v === "rose" || v === "rose-night" || v === "classic";
}

export function readSkin(): AdminSkin {
  try {
    const v = localStorage.getItem(KEY);
    return isSkin(v) ? v : "rose";
  } catch {
    return "rose";
  }
}

export function applySkin(skin: AdminSkin) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (skin === "classic") {
    root.removeAttribute("data-skin");
  } else {
    root.setAttribute("data-skin", skin);
    // The settings presets belong to the classic look only.
    root.removeAttribute("data-admin-theme");
  }
  root.style.colorScheme = skin === "rose" ? "light" : "dark";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", skin === "rose" ? "#fbf5f7" : skin === "rose-night" ? "#130b0f" : "#09090b");
}

export function setSkin(skin: AdminSkin) {
  try { localStorage.setItem(KEY, skin); } catch { /* storage blocked: still switch for this visit */ }
  current = skin;
  applySkin(skin);
  listeners.forEach((l) => l());
}

let current: AdminSkin = typeof window === "undefined" ? "rose" : readSkin();

export function useSkin(): AdminSkin {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
    () => "rose" as AdminSkin,
  );
}
