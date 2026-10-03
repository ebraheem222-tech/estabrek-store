"use client";

import Link from "next/link";

type HeaderCfg = {
  topbar?: {
    enabled?: boolean;
    template?: "info" | "promo" | "contact";
    text?: string;
    href?: string;
    buttonText?: string;
    showOnMobile?: boolean;
    bgPreset?: "solid" | "gradient" | "glass";
  };
};

const bgMap: Record<string, string> = {
  solid: "bg-[color:var(--surface)]/90 border-b border-[color:var(--border)]",
  glass: "bg-[color:var(--surface)]/70 backdrop-blur border-b border-[color:var(--border)]",
  gradient: "bg-gradient-to-r from-[color:var(--accent-1)]/20 via-[color:var(--accent-2)]/20 to-[color:var(--accent-3)]/20 border-b border-[color:var(--border)]",
};

export function Topbar({ header }: { header?: HeaderCfg | null }) {
  const cfg = header?.topbar;
  if (!cfg?.enabled) return null;
  const showOnMobile = cfg.showOnMobile !== false;

  const wrap = "px-4";
  const base = "text-xs md:text-sm text-[color:var(--muted)]";
  const template = cfg.template ?? "info";

  const cls = (bgMap[cfg.bgPreset ?? "solid"] ?? bgMap.solid) + " " + (showOnMobile ? "" : "hidden md:block");

  const text = cfg.text ?? "";
  const href = cfg.href ?? "";
  const btn = cfg.buttonText ?? "";

  return (
    <div className={cls}>
      <div className={"mx-auto max-w-6xl " + wrap}>
        <div className="flex items-center justify-between gap-3 py-2">
          <div className={base + " flex items-center gap-2"}>
            {template === "contact" ? <span aria-hidden>☎️</span> : template === "promo" ? <span aria-hidden>🔥</span> : <span aria-hidden>ℹ️</span>}
            {href ? (
              <Link href={href} className="hover:underline">
                {text}
              </Link>
            ) : (
              <span>{text}</span>
            )}
          </div>

          {btn && href ? (
            <Link
              href={href}
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-xs text-[color:var(--text)] hover:brightness-95"
            >
              {btn}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
