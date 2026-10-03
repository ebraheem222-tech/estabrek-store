"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { CartBadge } from "@/components/CartBadge";
import { SearchBox } from "@/components/SearchBox";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import { LoadingImg } from "@/components/LoadingImg";
import { StorefrontMiniCart } from "@/components/StorefrontMiniCart";
import type { MenuTree, SitePublicSettings, NavItem } from "@/lib/types";
import { getNavTemplateById, type NavTemplate } from "@/cms/nav/navTemplates";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { useTheme } from "@/components/ThemeToggle";

const EXTERNAL_PROTOCOL_RE = /^[a-z][a-z0-9+.-]*:/i;
const NAV_ICON_IMAGE_RE = /^(https?:\/\/|data:image\/)/i;
const NAV_ICON_IMAGE_RELATIVE_RE = /^\/.+\.(?:avif|webp|png|jpe?g|gif|svg)(?:\?.*)?$/i;

function safeTrim(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isExternalHref(href: string) {
  return EXTERNAL_PROTOCOL_RE.test(href) || href.startsWith("//");
}

function normalizeNavHref(value?: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "#";
  if (raw.startsWith("#")) return raw;
  if (isExternalHref(raw)) return raw;
  if (raw.startsWith("/")) return raw.replace(/\/{2,}/g, "/");
  if (raw.startsWith("?")) return raw;
  const cleaned = raw.replace(/^(\.\/)+/, "").replace(/^\/+/, "");
  return `/${cleaned}`;
}

function isNavImageIcon(value?: string) {
  const raw = String(value ?? "").trim();
  return raw.length > 0 && (NAV_ICON_IMAGE_RE.test(raw) || NAV_ICON_IMAGE_RELATIVE_RE.test(raw));
}

function parseColorToRgb(value?: string): [number, number, number] | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const hex = raw.replace(/^#/, "");
  if (/^[\da-f]{3}$/i.test(hex)) {
    const [r, g, b] = hex.split("");
    return [r + r, g + g, b + b].map((v) => parseInt(v, 16)) as [number, number, number];
  }
  if (/^[\da-f]{6}$/i.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }

  const rgbMatch = raw.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (rgbMatch) {
    const clamp = (n: number) => Math.max(0, Math.min(255, n));
    return [clamp(Number(rgbMatch[1])), clamp(Number(rgbMatch[2])), clamp(Number(rgbMatch[3]))];
  }

  return null;
}

function colorToRgba(value: string | undefined, alpha: number, fallback: [number, number, number]) {
  const [r, g, b] = parseColorToRgb(value) ?? fallback;
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

function readNavArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const candidates = [
    value.items,
    value.children,
    value.categories,
    value.subcategories,
    value.childCategories,
    value.childrens,
    value.nodes,
    value.links,
    value.menuItems,
    value.menu,
    value.tree,
    value.subItems,
    value.subMenu,
    value.submenu,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function readNavString(value: any, keys: string[]) {
  for (const key of keys) {
    const raw = safeTrim(value?.[key]);
    if (raw) return raw;
  }
  return "";
}

function normalizeNavNode(raw: any, depth = 0, index = 0): any | null {
  if (!raw || typeof raw !== "object") return null;

  const label = readNavString(raw, ["label", "title", "name", "text", "displayName", "menuLabel"]);
  const hrefRaw = readNavString(raw, ["href", "url", "link", "path", "to", "slug"]);
  const href = normalizeNavHref(hrefRaw || (label ? "#" : ""));
  const icon = readNavString(raw, ["icon", "iconUrl", "iconSrc", "image", "imageUrl", "thumbnailUrl"]);
  const targetRaw = readNavString(raw, ["target"]);
  const forceBlank = raw?.openInNewTab === true || raw?.newTab === true;

  const nested = readNavArray(
    raw.children ??
      raw.items ??
      raw.nodes ??
      raw.links ??
      raw.subItems ??
      raw.submenu ??
      raw.subMenu ??
      raw.subcategories ??
      raw.categories ??
      raw.childCategories ??
      raw.childrens,
  );
  const children = nested
    .map((child, childIndex) => normalizeNavNode(child, depth + 1, childIndex))
    .filter(Boolean) as any[];

  const idRaw = readNavString(raw, ["id", "_id", "key", "value"]);
  const id = idRaw || `nav-${depth}-${index}-${label || href || "item"}`;
  const isExternal = raw?.isExternal === true || raw?.external === true || forceBlank || isExternalHref(href);

  if (!label && href === "#" && children.length === 0) return null;

  return {
    id,
    label: label || (href !== "#" ? href.replace(/^\/+/, "") : "Item"),
    href,
    icon: icon || undefined,
    target: targetRaw || (forceBlank ? "_blank" : undefined),
    isExternal,
    children,
  };
}

function normalizeNavItems(items: any[]): any[] {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => normalizeNavNode(item, 0, index))
    .filter(Boolean) as any[];
}


function NavNode({
  item,
  pathname,
  showIcons,
  mode,
  gradient,
  template,
  prefetchLinks,
  forceTextStyle,
}: {
  item: any;
  pathname: string;
  showIcons: boolean;
  mode: "dropdown" | "mega";
  gradient: "none" | "sunset" | "ocean" | "neon";
  template?: NavTemplate;
  prefetchLinks: boolean;
  forceTextStyle?: React.CSSProperties;
}) {
  const settings = useStorefrontSettings();
  const hasChildren = !!(item.children && item.children.length);
  const href = normalizeNavHref(item.href);
  const external = !!item.isExternal || isExternalHref(href);
  const hrefPath = href.startsWith("/") ? href.split(/[?#]/)[0] : href;
  const active = !external && hrefPath !== "#" && (pathname === hrefPath || pathname.startsWith(hrefPath + "/"));

  const baseLink = template
    ? [
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200 relative overflow-hidden group",
        template.styles.link,
        template.styles.linkHover,
        active ? template.styles.linkActive : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 relative overflow-hidden group " +
      (active
        ? "bg-gradient-to-r from-[var(--accent)]/10 to-[var(--accent-2)]/10 text-[color:var(--accent)]"
        : "text-[color:var(--text)] opacity-80 hover:opacity-100 hover:bg-gradient-to-r hover:from-[var(--accent)]/5 hover:to-[var(--accent-2)]/5");

  const iconPaths: Record<string, string> = {
    home: "M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5Z",
    shop: "M4 7h16l-1.5 14H5.5L4 7Zm3-4h10l1 4H6l1-4Z",
    phone: "M6 2h3l2 5-2 1c1 3 3 5 6 6l1-2 5 2v3c0 1-1 2-2 2C10 19 5 14 4 6c0-1 1-2 2-2Z",
    star: "M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7l3-7Z",
    sparkle: "M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2Z",
    chev: "M9 6l6 6-6 6",
  };
  function Icon({ name }: { name?: string }) {
    if (!showIcons) return null;
    const rawName = String(name ?? "").trim();
    if (!rawName) return null;
    if (isNavImageIcon(rawName)) {
      return (
        // eslint-disable-next-line jsx-a11y/alt-text
        <img
          src={rawName}
          className="h-4 w-4 rounded-sm object-contain"
          loading="lazy"
          decoding="async"
        />
      );
    }
    const d = iconPaths[rawName];
    if (!d) return null;
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-90" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={d} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  }

  const gradStops: Record<string, string[]> = {
    sunset: ["#fb7185", "#f97316", "#fbbf24"],
    ocean: ["#06b6d4", "#3b82f6", "#6366f1"],
    neon: ["#d946ef", "#8b5cf6", "#3b82f6"],
  };
  function GradientBg({ id }: { id: string }) {
    if (gradient === "none") return null;
    return (
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={`var(--accent-1, ${gradStops[gradient][0]})`} stopOpacity={0.85} />
            <stop offset="50%" stopColor={`var(--accent-2, ${gradStops[gradient][1]})`} stopOpacity={0.85} />
            <stop offset="100%" stopColor={`var(--accent-3, ${gradStops[gradient][2]})`} stopOpacity={0.85} />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill={`url(#${id})`} opacity={0.22} />
      </svg>
    );
  }

  const desktopPanelWidthClass =
    mode === "mega"
      ? "min-w-[360px] w-[420px] max-w-[calc(100vw-2rem)]"
      : "min-w-[320px] w-[360px] max-w-[calc(100vw-2rem)]";
  const desktopItemClass =
    "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium text-slate-900 shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition-all duration-200";
  const desktopPanelToneA = colorToRgba(settings.accentColor, 0.14, [236, 72, 153]);
  const desktopPanelToneB = colorToRgba(settings.accentColor2, 0.13, [99, 102, 241]);
  const desktopPanelEdge = colorToRgba(settings.accentColor, 0.2, [236, 72, 153]);
  const desktopPanelStyle: React.CSSProperties = {
    background: `linear-gradient(145deg, rgba(255,255,255,0.94) 0%, ${desktopPanelToneA} 52%, ${desktopPanelToneB} 100%)`,
    borderColor: "rgba(255,255,255,0.72)",
    boxShadow: `0 22px 56px ${colorToRgba(settings.accentColor, 0.2, [15, 23, 42])}`,
  };
  const desktopHeaderStyle: React.CSSProperties = {
    background: `linear-gradient(140deg, rgba(255,255,255,0.82) 0%, ${colorToRgba(settings.accentColor, 0.09, [236, 72, 153])} 100%)`,
    borderColor: "rgba(255,255,255,0.62)",
  };
  const desktopItemBaseStyle: React.CSSProperties = {
    background: `linear-gradient(132deg, rgba(255,255,255,0.78) 0%, ${colorToRgba(settings.accentColor, 0.11, [236, 72, 153])} 58%, ${colorToRgba(settings.accentColor2, 0.12, [99, 102, 241])} 100%)`,
    borderColor: desktopPanelEdge,
  };
  const desktopItemActiveStyle: React.CSSProperties = {
    background: `linear-gradient(132deg, ${colorToRgba(settings.accentColor, 0.25, [236, 72, 153])} 0%, ${colorToRgba(settings.accentColor2, 0.23, [99, 102, 241])} 100%)`,
    borderColor: colorToRgba(settings.accentColor, 0.46, [236, 72, 153]),
  };
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [desktopLevelAnim, setDesktopLevelAnim] = useState<"none" | "forward" | "back">("none");
  const [desktopTrail, setDesktopTrail] = useState<Array<{ label: string; items: any[]; href?: string; external?: boolean; target?: string }>>([]);
  const desktopTriggerRef = useRef<HTMLButtonElement | null>(null);
  const desktopPanelRef = useRef<HTMLDivElement | null>(null);
  const desktopLevelAnimTimerRef = useRef<number | null>(null);

  const desktopLevel = desktopTrail.length ? desktopTrail[desktopTrail.length - 1] : null;
  const desktopMenuItems = (desktopLevel?.items ?? item.children ?? []).length ? (desktopLevel?.items ?? item.children ?? []) : [];
  const desktopHasParentLink = !!desktopLevel?.href && desktopLevel.href !== "#";
  const desktopRootHasLink = href !== "#" && href !== "";
  const desktopPanelHref = desktopLevel ? desktopLevel.href : href;
  const desktopPanelTarget = desktopLevel ? desktopLevel.target : item?.target;
  const desktopPanelExternal = desktopLevel ? desktopLevel.external : external;
  const desktopLevelAnimClass =
    desktopLevelAnim === "forward"
      ? "mobile-nav-level mobile-nav-level-forward"
      : desktopLevelAnim === "back"
      ? "mobile-nav-level mobile-nav-level-back"
      : "mobile-nav-level";

  function clearDesktopLevelAnimTimer() {
    if (desktopLevelAnimTimerRef.current && typeof window !== "undefined") {
      window.clearTimeout(desktopLevelAnimTimerRef.current);
      desktopLevelAnimTimerRef.current = null;
    }
  }

  function triggerDesktopLevelAnimation(direction: "forward" | "back") {
    clearDesktopLevelAnimTimer();
    setDesktopLevelAnim(direction);
    if (typeof window !== "undefined") {
      desktopLevelAnimTimerRef.current = window.setTimeout(() => {
        setDesktopLevelAnim("none");
        desktopLevelAnimTimerRef.current = null;
      }, 280);
    }
  }

  function closeDesktopPanel() {
    setDesktopOpen(false);
    setDesktopTrail([]);
    setDesktopLevelAnim("none");
    clearDesktopLevelAnimTimer();
  }

  function openDesktopPanel() {
    setDesktopOpen(true);
    setDesktopTrail([]);
    triggerDesktopLevelAnimation("forward");
  }

  function openDesktopChildren(node: any) {
    const children = Array.isArray(node?.children) ? node.children : [];
    if (!children.length) return;
    const nodeHref = normalizeNavHref(node?.href);
    const nodeExternal = !!node?.isExternal || isExternalHref(nodeHref);
    triggerDesktopLevelAnimation("forward");
    setDesktopTrail((prev) => [
      ...prev,
      {
        label: String(node?.label ?? "القائمة"),
        items: children,
        href: nodeHref,
        external: nodeExternal,
        target: node?.target,
      },
    ]);
  }

  function desktopBack() {
    triggerDesktopLevelAnimation("back");
    setDesktopTrail((prev) => prev.slice(0, -1));
  }

  function renderDesktopPanelItem(node: any, idx: number): React.ReactNode {
    const key = node?.id ?? node?.href ?? node?.label ?? `desktop-item-${idx}`;
    const nodeHref = normalizeNavHref(node?.href);
    const nodeExternal = !!node?.isExternal || isExternalHref(nodeHref);
    const nodeChildren = Array.isArray(node?.children) ? node.children : [];
    const nodeHasChildren = nodeChildren.length > 0;
    const nodeHrefPath = nodeHref.startsWith("/") ? nodeHref.split(/[?#]/)[0] : nodeHref;
    const nodeActive = !nodeExternal && nodeHrefPath !== "#" && (pathname === nodeHrefPath || pathname.startsWith(nodeHrefPath + "/"));
    const rowClass = `${desktopItemClass} ${nodeActive ? "text-[color:var(--accent)]" : "hover:brightness-[1.02]"}`;
    const rowStyle = nodeActive ? desktopItemActiveStyle : desktopItemBaseStyle;

    if (nodeHasChildren) {
      return (
        <button key={key} type="button" onClick={() => openDesktopChildren(node)} className={rowClass} style={rowStyle}>
          <span className="inline-flex items-center gap-2 truncate">
            <Icon name={node?.icon} />
            <span className="truncate">{node?.label}</span>
          </span>
          <Icon name="chev" />
        </button>
      );
    }

    if (nodeExternal) {
      return (
        <a
          key={key}
          href={nodeHref}
          target={node?.target || "_blank"}
          rel="noopener noreferrer"
          onClick={closeDesktopPanel}
          className={rowClass}
          style={rowStyle}
        >
          <span className="inline-flex items-center gap-2 truncate">
            <Icon name={node?.icon} />
            <span className="truncate">{node?.label}</span>
          </span>
        </a>
      );
    }

    return (
      <Link key={key} href={nodeHref} prefetch={prefetchLinks} onClick={closeDesktopPanel} className={rowClass} style={rowStyle}>
        <span className="inline-flex items-center gap-2 truncate">
          <Icon name={node?.icon} />
          <span className="truncate">{node?.label}</span>
        </span>
      </Link>
    );
  }

  useEffect(() => {
    closeDesktopPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!desktopOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (desktopPanelRef.current?.contains(target)) return;
      if (desktopTriggerRef.current?.contains(target)) return;
      closeDesktopPanel();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDesktopPanel();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktopOpen]);

  useEffect(() => {
    return () => {
      clearDesktopLevelAnimTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  if (!hasChildren) {
    return external ? (
      <a
        href={href}
        target={item.target || "_blank"}
        rel="noopener noreferrer"
        className={baseLink}
        style={forceTextStyle}
      >
        <Icon name={item.icon} />
        <span>{item.label}</span>
      </a>
    ) : (
      <Link href={href} className={baseLink} prefetch={prefetchLinks} style={forceTextStyle}>
        <Icon name={item.icon} />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        ref={desktopTriggerRef}
        type="button"
        onClick={() => (desktopOpen ? closeDesktopPanel() : openDesktopPanel())}
        className={baseLink}
        style={forceTextStyle}
        aria-haspopup="menu"
        aria-expanded={desktopOpen}
      >
        <Icon name={item.icon} />
        <span>{item.label}</span>
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${desktopOpen ? "rotate-90" : "rotate-0"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
        </svg>
      </button>

      <div
        className={`absolute left-0 top-full z-[1300] hidden pt-2 transition-all duration-200 md:block ${
          desktopOpen ? "pointer-events-auto opacity-100 translate-y-0 scale-100" : "pointer-events-none opacity-0 translate-y-1 scale-[0.98]"
        }`}
      >
        <div
          ref={desktopPanelRef}
          className={`relative overflow-hidden rounded-2xl border border-white/60 bg-white/88 shadow-[0_22px_56px_rgba(15,23,42,0.18)] backdrop-blur-xl p-3 ${desktopPanelWidthClass}`}
          style={desktopPanelStyle}
        >
          <GradientBg id={`nav-dd-${item.id ?? item.label}`} />

          <div className="relative">
            <div className="mb-2 rounded-xl border border-white/55 bg-white/72 px-3 py-2 backdrop-blur" style={desktopHeaderStyle}>
              <div className="flex items-center justify-between gap-2">
                {desktopTrail.length ? (
                  <button
                    type="button"
                    onClick={desktopBack}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/55 bg-white/75 px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
                    </svg>
                    رجوع
                  </button>
                ) : (
                  <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                )}

                <button
                  type="button"
                  onClick={closeDesktopPanel}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/50 bg-white/75 text-slate-700 transition-transform duration-200 hover:rotate-90"
                  aria-label="Close submenu"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              {desktopTrail.length ? (
                <div className="mt-1 text-xs font-semibold text-slate-700">{desktopLevel?.label}</div>
              ) : null}

              {desktopPanelHref && desktopPanelHref !== "#" && (desktopHasParentLink || (!desktopTrail.length && desktopRootHasLink)) ? (
                desktopPanelExternal ? (
                  <a
                    href={desktopPanelHref}
                    target={desktopPanelTarget || "_blank"}
                    rel="noopener noreferrer"
                    onClick={closeDesktopPanel}
                    className="mt-1 inline-flex items-center text-xs text-slate-600 hover:text-slate-900"
                  >
                    عرض الكل
                  </a>
                ) : (
                  <Link
                    href={desktopPanelHref}
                    prefetch={prefetchLinks}
                    onClick={closeDesktopPanel}
                    className="mt-1 inline-flex items-center text-xs text-slate-600 hover:text-slate-900"
                  >
                    عرض الكل
                  </Link>
                )
              ) : null}
            </div>

            <div className={`max-h-[62vh] overflow-y-auto pr-1 ${desktopLevelAnimClass}`}>
              {desktopMenuItems.length ? (
                <div className="space-y-2">
                  {desktopMenuItems.map((node: any, idx: number) => (
                    <div
                      key={node?.id ?? node?.href ?? node?.label ?? `desktop-wrap-${idx}`}
                      className="mobile-nav-item-pop"
                      style={{ animationDelay: `${Math.min(idx * 30, 220)}ms` }}
                    >
                      {renderDesktopPanelItem(node, idx)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-white/40 bg-white/55 px-3 py-2 text-sm text-slate-600">
                  لا توجد عناصر قائمة حالياً
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export function Navbar({ site, primaryMenu, header, cmsNav }: { site: SitePublicSettings; primaryMenu: MenuTree; header?: any; cmsNav?: any }) {

  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileDrawerStage, setMobileDrawerStage] = useState<"closed" | "open" | "closing">("closed");
  const [mobileLevelAnim, setMobileLevelAnim] = useState<"none" | "forward" | "back">("none");
  const [mobileTrail, setMobileTrail] = useState<Array<{ label: string; items: any[]; href?: string; external?: boolean; target?: string }>>([]);
  const mobileCloseTimerRef = useRef<number | null>(null);
  const mobileLevelAnimTimerRef = useRef<number | null>(null);
  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 768px)").matches;
  });
  const [hasMounted, setHasMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const settings = useStorefrontSettings();
  const { resolvedTheme } = useTheme();
  const [domTheme, setDomTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMobileDrawerStage("closed");
    setMobileLevelAnim("none");
    setMobileTrail([]);
    setMiniCartOpen(false);
  }, [pathname]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setMiniCartOpen(false);
      return;
    }
    setMobileOpen(false);
    setMobileDrawerStage("closed");
    setMobileLevelAnim("none");
    setMobileTrail([]);
  }, [isDesktop]);

  useEffect(() => {
    return () => {
      if (mobileCloseTimerRef.current && typeof window !== "undefined") {
        window.clearTimeout(mobileCloseTimerRef.current);
      }
      if (mobileLevelAnimTimerRef.current && typeof window !== "undefined") {
        window.clearTimeout(mobileLevelAnimTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return;
  }, [mobileOpen]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const read = () => {
      const attr = root.getAttribute("data-theme");
      if (attr === "dark" || attr === "light") setDomTheme(attr);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => observer.disconnect();
  }, []);

  // Scroll detection for dynamic navbar styling
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    // Set initial state
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const cmsNavCfg = cmsNav && typeof cmsNav === "object" ? cmsNav : null;
  const cmsNavEnabled = cmsNavCfg ? (cmsNavCfg.enabled ?? cmsNavCfg?.props?.enabled ?? true) : false;

  const templateIdRaw =
    (typeof cmsNavCfg?.templateId === "string" && cmsNavCfg.templateId) ||
    (typeof cmsNavCfg?.props?.templateId === "string" && cmsNavCfg.props.templateId) ||
    "default";
  const navTemplate = templateIdRaw !== "default" ? getNavTemplateById(templateIdRaw) : undefined;
  const primaryMenuItemsRaw = Array.isArray(primaryMenu?.tree) ? primaryMenu.tree : [];
  const cmsMenuItemsRaw = useMemo(() => {
    if (!cmsNavCfg) return [];
    const candidates = [
      cmsNavCfg?.items,
      cmsNavCfg?.props?.items,
      cmsNavCfg?.menuItems,
      cmsNavCfg?.props?.menuItems,
      cmsNavCfg?.menu,
      cmsNavCfg?.props?.menu,
      cmsNavCfg?.tree,
      cmsNavCfg?.props?.tree,
      cmsNavCfg?.links,
      cmsNavCfg?.props?.links,
      cmsNavCfg?.children,
      cmsNavCfg?.props?.children,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }
    return [];
  }, [cmsNavCfg]);
  const primaryMenuItems = useMemo(() => normalizeNavItems(primaryMenuItemsRaw), [primaryMenuItemsRaw]);
  const cmsMenuItems = useMemo(() => normalizeNavItems(cmsMenuItemsRaw), [cmsMenuItemsRaw]);
  const fallbackMenuItems = useMemo(
    () => normalizeNavItems([
      { id: "nav-home-fallback", label: "الرئيسية", href: "/" },
      { id: "nav-shop-fallback", label: "المتجر", href: "/shop" },
      { id: "nav-about-fallback", label: "من نحن", href: "/about" },
      { id: "nav-contact-fallback", label: "اتصل بنا", href: "/contact" },
    ]),
    [],
  );
  const navItems: any[] = useMemo(() => {
    if (cmsNavEnabled) {
      // Accept both shapes: { items } and { props: { items } }.
      if (cmsMenuItems.length) return cmsMenuItems;
      if (primaryMenuItems.length) return primaryMenuItems;
      return fallbackMenuItems;
    }
    if (primaryMenuItems.length) return primaryMenuItems;
    return fallbackMenuItems;
  }, [cmsNavEnabled, cmsMenuItems, fallbackMenuItems, primaryMenuItems]);

  const navModeRaw = cmsNavCfg?.mode ?? cmsNavCfg?.props?.mode;
  const navMode: "dropdown" | "mega" = (navModeRaw === "mega" ? "mega" : "dropdown");
  const navGradientRaw = cmsNavCfg?.gradient ?? cmsNavCfg?.props?.gradient;
  const navGradient: "none" | "sunset" | "ocean" | "neon" =
    (["none","sunset","ocean","neon"].includes(navGradientRaw) ? (navGradientRaw as "none" | "sunset" | "ocean" | "neon") : "none");
  const navShowIconsRaw = cmsNavCfg?.showIcons ?? cmsNavCfg?.props?.showIcons;
  const navShowIcons: boolean = navShowIconsRaw !== false;
  const forceLightText = settings.darkModeEnabled === false || (domTheme ?? resolvedTheme) === "light";
  const navTemplateTextStyle = navTemplate && forceLightText ? ({ color: "var(--text)" } as React.CSSProperties) : undefined;

  const preset: "classic" | "minimal" | "centered" = (header?.preset === "minimal" || header?.preset === "centered") ? header.preset : "classic";
  const headerSticky = typeof header?.sticky === "boolean" ? header.sticky : undefined;
  const sticky: boolean =
    headerSticky !== undefined
      ? headerSticky
      : (cmsNavEnabled ? true : settings.stickyHeaderEnabled !== false);
  const showSearch: boolean = header?.showSearch !== false;
  const showCart: boolean = header?.showCart !== false;
  const showAccount: boolean = !!header?.showAccount;
  const heightDesktop: "compact" | "normal" | "comfortable" =
    (header as any)?.heightDesktop === "compact" || (header as any)?.heightDesktop === "comfortable"
      ? (header as any).heightDesktop
      : "normal";
  const heightMobile: "compact" | "normal" | "comfortable" =
    (header as any)?.heightMobile === "normal" || (header as any)?.heightMobile === "comfortable"
      ? (header as any).heightMobile
      : "compact";
  const searchStyle: "input" | "icon" = (header as any)?.searchStyle === "icon" ? "icon" : "input";
  const searchInputStyleId: string = typeof (header as any)?.searchInputStyleId === "string" ? (header as any).searchInputStyleId : "default";
  const cartStyle: "iconBadge" | "icon" | "badge" =
    (header as any)?.cartStyle === "icon" || (header as any)?.cartStyle === "badge" ? (header as any).cartStyle : "iconBadge";
  const allowMiniCart = settings.miniCartEnabled && isDesktop;
  const padMap: Record<string, string> = { compact: "py-2", normal: "py-3", comfortable: "py-4" };
  const padCls = `${padMap[heightMobile]} md:${padMap[heightDesktop]}`;
  const navTextBase = "text-[color:var(--text)]";
  const navTextMuted = "text-[color:var(--text)] opacity-80 hover:opacity-100";
  const navPill =
    "inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 px-3 py-2 text-sm " +
    navTextMuted +
    " hover:bg-black/10 dark:hover:bg-white/15";
  const navCtaBase =
    "rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[color:var(--accent-contrast)] hover:opacity-90";
  const navDrawerItem =
    "overflow-hidden rounded-2xl border border-white/55 bg-white/72 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md";
  const navDrawerLink = "block w-full px-4 py-3 font-semibold text-slate-900";
  const navDrawerSubLink = "block w-full px-4 py-2 text-sm text-[color:var(--text)] opacity-75 hover:opacity-100";
  const mobileLevelAnimClass =
    mobileLevelAnim === "forward"
      ? "mobile-nav-level mobile-nav-level-forward"
      : mobileLevelAnim === "back"
      ? "mobile-nav-level mobile-nav-level-back"
      : "mobile-nav-level";
  const mobileGlowA = colorToRgba(settings.accentColor, 0.26, [236, 72, 153]);
  const mobileGlowB = colorToRgba(settings.accentColor2, 0.24, [99, 102, 241]);
  const mobileGlowAEdge = colorToRgba(settings.accentColor, 0.15, [236, 72, 153]);
  const mobileGlowBEdge = colorToRgba(settings.accentColor2, 0.13, [99, 102, 241]);
  const mobileBackdropStyle: React.CSSProperties = {
    background: `radial-gradient(circle at 14% 8%, ${mobileGlowA} 0%, rgba(255, 255, 255, 0.52) 42%, rgba(255, 255, 255, 0.68) 100%)`,
    backdropFilter: settings.glassEffectsEnabled === false ? undefined : "blur(10px) saturate(125%)",
  };
  const mobileDrawerStyle: React.CSSProperties = {
    height: "100dvh",
    background: `linear-gradient(148deg, rgba(255, 255, 255, 0.96) 0%, ${mobileGlowAEdge} 46%, ${mobileGlowBEdge} 100%)`,
    borderColor: "rgba(255, 255, 255, 0.72)",
    boxShadow: `0 28px 90px ${colorToRgba(settings.accentColor, 0.22, [168, 85, 247])}`,
    backdropFilter: settings.glassEffectsEnabled === false ? undefined : "blur(22px) saturate(160%)",
  };
  const mobileHeaderStyle: React.CSSProperties = {
    paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)",
    background: `linear-gradient(160deg, rgba(255, 255, 255, 0.84), ${colorToRgba(settings.accentColor, 0.08, [236, 72, 153])})`,
    borderColor: "rgba(255, 255, 255, 0.62)",
  };
  const mobileOrnamentAStyle: React.CSSProperties = {
    background: `radial-gradient(circle, ${mobileGlowA}, rgba(255, 255, 255, 0) 72%)`,
  };
  const mobileOrnamentBStyle: React.CSSProperties = {
    background: `radial-gradient(circle, ${mobileGlowB}, rgba(255, 255, 255, 0) 70%)`,
  };

  function triggerMobileLevelAnimation(direction: "forward" | "back") {
    if (typeof window !== "undefined" && mobileLevelAnimTimerRef.current) {
      window.clearTimeout(mobileLevelAnimTimerRef.current);
    }
    setMobileLevelAnim(direction);
    if (typeof window !== "undefined") {
      mobileLevelAnimTimerRef.current = window.setTimeout(() => {
        setMobileLevelAnim("none");
        mobileLevelAnimTimerRef.current = null;
      }, 280);
    }
  }

  function openMobileDrawer() {
    if (typeof window !== "undefined" && mobileCloseTimerRef.current) {
      window.clearTimeout(mobileCloseTimerRef.current);
      mobileCloseTimerRef.current = null;
    }
    if (typeof window !== "undefined" && mobileLevelAnimTimerRef.current) {
      window.clearTimeout(mobileLevelAnimTimerRef.current);
      mobileLevelAnimTimerRef.current = null;
    }
    setMobileTrail([]);
    setMobileLevelAnim("forward");
    setMobileOpen(true);
    setMobileDrawerStage("open");
  }

  function closeMobileDrawer() {
    if (!mobileOpen) return;
    setMobileDrawerStage("closing");
    if (typeof window !== "undefined" && mobileCloseTimerRef.current) {
      window.clearTimeout(mobileCloseTimerRef.current);
    }
    if (typeof window !== "undefined") {
      mobileCloseTimerRef.current = window.setTimeout(() => {
        setMobileOpen(false);
        setMobileDrawerStage("closed");
        setMobileLevelAnim("none");
        setMobileTrail([]);
        mobileCloseTimerRef.current = null;
      }, 220);
    } else {
      setMobileOpen(false);
      setMobileDrawerStage("closed");
      setMobileLevelAnim("none");
      setMobileTrail([]);
    }
  }

  function openMobileChildren(item: any) {
    const children = Array.isArray(item?.children) ? item.children : [];
    if (!children.length) return;
    const href = normalizeNavHref(item?.href);
    const external = !!item?.isExternal || isExternalHref(href);
    triggerMobileLevelAnimation("forward");
    setMobileTrail((prev) => [
      ...prev,
      {
        label: String(item?.label ?? "Submenu"),
        items: children,
        href,
        external,
        target: item?.target,
      },
    ]);
  }

  function mobileBack() {
    triggerMobileLevelAnimation("back");
    setMobileTrail((prev) => prev.slice(0, -1));
  }

  function renderMobileItem(item: any, idx: number): React.ReactNode {
    const key = item?.id ?? item?.href ?? item?.label ?? `mobile-${idx}`;
    const href = normalizeNavHref(item?.href);
    const external = !!item?.isExternal || isExternalHref(href);
    const children = Array.isArray(item?.children) ? item.children : [];
    const hasChildren = children.length > 0;

    if (hasChildren) {
      return (
        <button
          key={key}
          type="button"
          onClick={() => openMobileChildren(item)}
          className={`${navDrawerLink} flex items-center justify-between text-start transition-colors hover:bg-white/75`}
        >
          <span>{item?.label}</span>
          <svg className="h-4 w-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
          </svg>
        </button>
      );
    }

    if (external) {
      return (
        <a
          key={key}
          href={href}
          target={item?.target || "_blank"}
          rel="noopener noreferrer"
          onClick={closeMobileDrawer}
          className={`${navDrawerLink} transition-colors hover:bg-white/75`}
        >
          {item?.label}
        </a>
      );
    }

    return (
      <Link
        key={key}
        href={href}
        prefetch={settings.prefetchLinks}
        onClick={closeMobileDrawer}
        className={`${navDrawerLink} transition-colors hover:bg-white/75`}
      >
        {item?.label}
      </Link>
    );
  }

  function SearchControl({ withLabel }: { withLabel?: boolean }) {
    if (searchStyle !== "icon") return <SearchBox styleId={searchInputStyleId} />;
    return (
      <div className="inline-flex items-center gap-2">
        <Link
          href="/search"
          prefetch={settings.prefetchLinks}
          className={`inline-flex items-center gap-2 ${navPill}`}
          aria-label="Search"
        >
          <span aria-hidden>🔎</span>
          {withLabel ? <span>بحث</span> : null}
        </Link>
        {settings.voiceSearchEnabled ? (
          <VoiceSearchButton
            withLabel={withLabel}
            className={`inline-flex items-center gap-2 ${navPill}`}
          />
        ) : null}
      </div>
    );
  }

  function CartControl() {
    if (cartStyle === "badge") return <CartBadge />;
    return (
      <>
        <span aria-hidden>🛒</span>
        {cartStyle === "iconBadge" ? <CartBadge /> : null}
      </>
    );
  }

  const cta = header?.cta && header.cta.enabled ? header.cta : null;
  const mobileMenuLevel = mobileTrail.length ? mobileTrail[mobileTrail.length - 1] : null;
  const mobileMenuItems = (mobileMenuLevel?.items ?? navItems)?.length ? (mobileMenuLevel?.items ?? navItems) : fallbackMenuItems;
  const mobileHasParentLink = !!mobileMenuLevel?.href && mobileMenuLevel.href !== "#";
  const mobileToggleActive = mobileOpen && mobileDrawerStage !== "closing";
  const mobileDrawerTranslateClass =
    mobileDrawerStage === "open" ? "translate-x-0 opacity-100" : "translate-x-full opacity-95";
  const mobileDrawerVisible = mobileOpen;

  function isActiveHref(href?: string) {
    if (!href) return false;
    try {
      const h = href.startsWith("http") ? new URL(href).pathname : href;
      if (h === "/") return pathname === "/";
      return pathname === h || pathname.startsWith(h + "/");
    } catch {
      return pathname === href;
    }
  }

  const stripNavPosition = (value: string) => {
    const tokens = value.split(/\s+/).filter(Boolean);
    return tokens
      .filter((token) => {
        if (["static", "fixed", "absolute", "relative", "sticky"].includes(token)) return false;
        if (/^(top|bottom|left|right|inset|inset-x|inset-y)-/.test(token)) return false;
        if (/^-?translate-[xy]-/.test(token)) return false;
        return true;
      })
      .join(" ");
  };

  const headerClassName = (() => {
    if (!navTemplate) {
      const basePos = sticky ? "sticky top-0 z-40 " : "relative z-40 ";
      const scrollStyles = scrolled
        ? "bg-[color:var(--surface)]/95 backdrop-blur-xl border-b-2 border-[color:var(--accent)]/20 shadow-lg"
        : "bg-[color:var(--surface)]/80 backdrop-blur-md border-b border-[color:var(--border)]";
      return basePos + scrollStyles + " transition-all duration-300";
    }

    const rawNavCls = navTemplate.styles.nav ?? "";
    const isSidebar = navTemplate.category === "sidebar";
    const navCls = isSidebar ? rawNavCls : stripNavPosition(rawNavCls);
    const hasZIndex = /\bz-(?:\d+|auto)\b|\bz-\[/.test(navCls);

    // Ensure sticky toggle wins over template positioning.
    const extra: string[] = [];
    if (!isSidebar) extra.push(sticky ? "sticky top-0" : "relative");
    if (!hasZIndex) extra.push("z-40");
    return [navCls, ...extra].filter(Boolean).join(" ");
  })();

  const siteNameClass = navTemplate?.styles.logo ?? `text-sm font-semibold tracking-wide ${navTextBase}`;
  const desktopLinksClass = navTemplate?.styles.links ?? "hidden items-center gap-1 md:flex";
  const desktopLinksClassCentered = navTemplate?.styles.links ? `${navTemplate.styles.links} justify-center` : "hidden items-center justify-center gap-1 md:flex";
  const ctaClassName = navTemplate?.styles.button
    ? `hidden md:inline-flex items-center ${navTemplate.styles.button}`
    : `hidden md:inline-flex items-center ${navCtaBase}`;
  const ctaMobileClassName = navTemplate?.styles.button
    ? `inline-flex w-full justify-center ${navTemplate.styles.button}`
    : `inline-flex w-full justify-center ${navCtaBase}`;

  const mobileDrawerNode = mobileDrawerVisible ? (
    <div className="md:hidden fixed inset-0 z-[2147483000]">
      <button
        type="button"
        className={`absolute inset-0 transition-opacity duration-300 ${mobileDrawerStage === "open" ? "opacity-100" : "opacity-0"}`}
        style={mobileBackdropStyle}
        onClick={closeMobileDrawer}
        aria-label="Close menu backdrop"
      />

      <aside
        className={`absolute inset-0 w-screen max-w-none overflow-hidden border transition-[transform,opacity] duration-300 ease-out will-change-transform ${mobileDrawerTranslateClass}`}
        style={mobileDrawerStyle}
      >
        <div
          className="pointer-events-none absolute -top-24 left-[-18%] h-64 w-64 rounded-full blur-3xl"
          style={mobileOrnamentAStyle}
        />
        <div
          className="pointer-events-none absolute right-[-14%] top-1/3 h-72 w-72 rounded-full blur-3xl"
          style={mobileOrnamentBStyle}
        />

        <div className="relative flex h-full min-h-0 flex-col">
          <div
            className="sticky top-0 z-10 border-b px-4 py-3 backdrop-blur-xl"
            style={mobileHeaderStyle}
          >
            <div className="flex items-center justify-between gap-2">
              {mobileTrail.length ? (
                <button
                  type="button"
                  onClick={mobileBack}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/55 bg-white/72 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur-md"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
                  </svg>
                  رجوع
                </button>
              ) : (
                <div className="text-sm font-semibold text-slate-900">القائمة</div>
              )}

              <button
                type="button"
                onClick={closeMobileDrawer}
                className="mobile-menu-close-btn inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/55 bg-white/75 text-slate-900 shadow-sm backdrop-blur-md"
                aria-label="Close menu"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            {mobileTrail.length ? (
              <div className="mt-2 text-sm font-semibold text-slate-900">{mobileMenuLevel?.label}</div>
            ) : null}

            {mobileHasParentLink ? (
              mobileMenuLevel?.external ? (
                <a
                  href={mobileMenuLevel.href}
                  target={mobileMenuLevel?.target || "_blank"}
                  rel="noopener noreferrer"
                  onClick={closeMobileDrawer}
                  className="mt-2 inline-flex items-center rounded-lg text-xs text-slate-600 hover:text-slate-900"
                >
                  عرض الكل
                </a>
              ) : (
                <Link
                  href={mobileMenuLevel?.href || "#"}
                  prefetch={settings.prefetchLinks}
                  onClick={closeMobileDrawer}
                  className="mt-2 inline-flex items-center rounded-lg text-xs text-slate-600 hover:text-slate-900"
                >
                  عرض الكل
                </Link>
              )
            ) : null}
          </div>

          <div
            className="flex-1 min-h-0 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
          >
            <div
              key={`mobile-level-${mobileTrail.length}-${mobileMenuLevel?.label ?? "root"}`}
              className={mobileLevelAnimClass}
            >
              {showSearch && mobileTrail.length === 0 ? (
                <div className="w-full">
                  <SearchControl withLabel />
                </div>
              ) : null}

              {cta && mobileTrail.length === 0 ? (
                <Link href={cta.href || "/"} onClick={closeMobileDrawer} className={ctaMobileClassName}>
                  {cta.label || "CTA"}
                </Link>
              ) : null}

              {mobileMenuItems.length ? (
                <div className="space-y-2">
                  {mobileMenuItems.map((it: any, idx: number) => (
                    <div
                      key={it?.id ?? it?.href ?? it?.label ?? `mobile-wrap-${idx}`}
                      className={`${navDrawerItem} mobile-nav-item-pop`}
                      style={{ animationDelay: `${Math.min(idx * 32, 220)}ms` }}
                    >
                      {renderMobileItem(it, idx)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-white/35 bg-white/55 px-3 py-2 text-sm text-slate-600 backdrop-blur">
                  لا توجد عناصر قائمة حالياً
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  ) : null;

  return (
    <header className={headerClassName}>
      <div className={"mx-auto max-w-6xl px-4 " + padCls}>
        {preset === "centered" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => (mobileOpen ? closeMobileDrawer() : openMobileDrawer())}
                className={`md:hidden ${navPill} transition-all duration-300 ${mobileToggleActive ? "bg-gradient-to-r from-[var(--accent)]/15 to-[var(--accent-2)]/15" : ""}`}
                aria-label="Toggle menu"
                aria-expanded={mobileToggleActive}
              >
                <svg className={`h-5 w-5 transition-transform duration-300 ${mobileToggleActive ? "rotate-90" : "rotate-0"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  {mobileToggleActive ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              <Link href="/" prefetch={settings.prefetchLinks} className="mx-auto flex items-center gap-2">
                {site.logoUrl ? (
                  <LoadingImg
                    src={site.logoUrl}
                    alt={site.siteName ?? "Logo"}
                    wrapperClassName="h-8 w-8"
                    className="h-8 w-8 rounded-lg object-cover"
                    disableBlur
                    loading="eager"
                    decoding="sync"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-white/[0.08]" />
                )}
                <div className={siteNameClass} style={navTemplateTextStyle}>
                  {site.siteName || "Store"}
                </div>
              </Link>

              <div className="flex items-center gap-2">
                {showAccount ? (
                  <Link
                    href="/account"
                    prefetch={settings.prefetchLinks}
                    className={navPill}
                  >
                    ??
                  </Link>
                ) : null}
                {showCart ? (
                  allowMiniCart ? (
                    <button
                      type="button"
                      onClick={() => setMiniCartOpen(true)}
                      className={navPill}
                    >
                      ?? <span className="hidden sm:inline">Cart</span> <CartBadge />
                    </button>
                  ) : (
                    <Link
                      href="/cart"
                      prefetch={settings.prefetchLinks}
                      className={navPill}
                    >
                      ?? <span className="hidden sm:inline">Cart</span> <CartBadge />
                    </Link>
                  )
                ) : null}
              </div>
            </div>

            <div className="hidden md:flex items-center justify-center gap-3">
              <nav className={desktopLinksClassCentered}>
                {navItems.map((it: any) => (
                  <NavNode
                    key={it.id ?? it.href ?? it.label}
                    item={it}
                    pathname={pathname}
                    showIcons={navShowIcons}
                    mode={navMode}
                    gradient={navGradient}
                    template={navTemplate}
                    prefetchLinks={settings.prefetchLinks}
                    forceTextStyle={navTemplateTextStyle}
                  />
                ))}
              </nav>
              {showSearch ? (
                <div className={searchStyle === "icon" ? "" : "max-w-[360px] w-full"}>
                  <SearchControl />
                </div>
              ) : null}
              {cta ? (
                <Link href={cta.href || "/"} prefetch={settings.prefetchLinks} className={ctaClassName}>
                  {cta.label || "CTA"}
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => (mobileOpen ? closeMobileDrawer() : openMobileDrawer())}
                className={`md:hidden ${navPill} transition-all duration-300 ${mobileToggleActive ? "bg-gradient-to-r from-[var(--accent)]/15 to-[var(--accent-2)]/15" : ""}`}
                aria-label="Toggle menu"
                aria-expanded={mobileToggleActive}
              >
                <svg className={`h-5 w-5 transition-transform duration-300 ${mobileToggleActive ? "rotate-90" : "rotate-0"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  {mobileToggleActive ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              <Link href="/" prefetch={settings.prefetchLinks} className="flex items-center gap-2">
                {site.logoUrl ? (
                  <LoadingImg
                    src={site.logoUrl}
                    alt={site.siteName ?? "Logo"}
                    wrapperClassName="h-8 w-8"
                    className="h-8 w-8 rounded-lg object-cover"
                    disableBlur
                    loading="eager"
                    decoding="sync"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-white/[0.08]" />
                )}
                <div className={siteNameClass} style={navTemplateTextStyle}>
                  {site.siteName || "Store"}
                </div>
              </Link>
            </div>

            <nav className={preset === "minimal" ? desktopLinksClassCentered : desktopLinksClass}>
              {navItems.map((it: any) => (
                <NavNode
                  key={it.id ?? it.href ?? it.label}
                  item={it}
                  pathname={pathname}
                  showIcons={navShowIcons}
                  mode={navMode}
                  gradient={navGradient}
                  template={navTemplate}
                  prefetchLinks={settings.prefetchLinks}
                  forceTextStyle={navTemplateTextStyle}
                />
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {showSearch ? (
                <div className={searchStyle === "icon" ? "" : "hidden lg:block max-w-[360px] w-full"}>
                  <SearchControl />
                </div>
              ) : null}
              {cta ? (
                <Link href={cta.href || "/"} prefetch={settings.prefetchLinks} className={ctaClassName}>
                  {cta.label || "CTA"}
                </Link>
              ) : null}
              {showAccount ? (
                <Link
                  href="/account"
                  prefetch={settings.prefetchLinks}
                  className={navPill}
                >
                  ??
                </Link>
              ) : null}
              {showCart ? (
                allowMiniCart ? (
                  <button
                    type="button"
                    onClick={() => setMiniCartOpen(true)}
                    className={navPill}
                  >
                    <CartControl />
                  </button>
                ) : (
                  <Link
                    href="/cart"
                    prefetch={settings.prefetchLinks}
                    className={navPill}
                  >
                    <CartControl />
                  </Link>
                )
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Mobile drawer */}
      {hasMounted ? createPortal(mobileDrawerNode, document.body) : null}

      {allowMiniCart ? (
        <StorefrontMiniCart open={miniCartOpen} onClose={() => setMiniCartOpen(false)} />
      ) : null}
    </header>
  );
}
