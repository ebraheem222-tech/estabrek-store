"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
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
  const hasChildren = !!(item.children && item.children.length);
  const href = item.href || "#";
  const external = !!item.isExternal || /^https?:\/\//.test(href);
  const active = !external && href !== "#" && (pathname === href || pathname.startsWith(href + "/"));

  const baseLink = template
    ? [
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 transition-colors duration-200",
        template.styles.link,
        template.styles.linkHover,
        active ? template.styles.linkActive : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition " +
      (active
        ? "bg-black/5 dark:bg-white/10 text-[color:var(--text)]"
        : "text-[color:var(--text)] opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10");

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
    const d = iconPaths[String(name ?? "")];
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
    <div className="relative group">
      <a href={href} className={baseLink} style={forceTextStyle} aria-haspopup="menu" aria-expanded="false">
        <Icon name={item.icon} />
        <span>{item.label}</span>
        <Icon name="chev" />
      </a>

      <div className="absolute left-0 top-full z-50 hidden min-w-[240px] pt-2 group-hover:block">
        <div className="relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]/95 backdrop-blur p-3">
          <GradientBg id={`nav-dd-${item.id ?? item.label}`} />
          {mode === "mega" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {(item.children ?? []).map((ch: any) => (
                <NavNode
                  key={ch.id ?? ch.href ?? ch.label}
                  item={ch}
                  pathname={pathname}
                  showIcons={showIcons}
                  mode="dropdown"
                  gradient={gradient}
                  template={template}
                  prefetchLinks={prefetchLinks}
                  forceTextStyle={forceTextStyle}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-1">
              {(item.children ?? []).map((ch: any) => (
                <NavNode
                  key={ch.id ?? ch.href ?? ch.label}
                  item={ch}
                  pathname={pathname}
                  showIcons={showIcons}
                  mode="dropdown"
                  gradient={gradient}
                  template={template}
                  prefetchLinks={prefetchLinks}
                  forceTextStyle={forceTextStyle}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export function Navbar({ site, primaryMenu, header, cmsNav }: { site: SitePublicSettings; primaryMenu: MenuTree; header?: any; cmsNav?: any }) {

  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 768px)").matches;
  });
  const settings = useStorefrontSettings();
  const { resolvedTheme } = useTheme();
  const [domTheme, setDomTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMiniCartOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isDesktop) setMiniCartOpen(false);
  }, [isDesktop]);

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

  const cmsNavCfg = cmsNav && typeof cmsNav === "object" ? cmsNav : null;
  const cmsNavEnabled = cmsNavCfg ? (cmsNavCfg.enabled ?? cmsNavCfg?.props?.enabled ?? true) : false;

  const templateIdRaw =
    (typeof cmsNavCfg?.templateId === "string" && cmsNavCfg.templateId) ||
    (typeof cmsNavCfg?.props?.templateId === "string" && cmsNavCfg.props.templateId) ||
    "default";
  const navTemplate = templateIdRaw !== "default" ? getNavTemplateById(templateIdRaw) : undefined;
  const navItems: any[] = useMemo(() => {
    if (cmsNavEnabled) {
      // Admin stores cmsNav as { enabled, mode, gradient, showIcons, items }
      return Array.isArray(cmsNavCfg.items) ? cmsNavCfg.items : [];
    }
    return primaryMenu?.tree ?? [];
  }, [cmsNavCfg, cmsNavEnabled, primaryMenu]);

  const navMode: "dropdown" | "mega" = (cmsNavCfg?.mode === "mega" ? "mega" : "dropdown");
  const navGradient: "none" | "sunset" | "ocean" | "neon" =
    (["none","sunset","ocean","neon"].includes(cmsNavCfg?.gradient) ? cmsNavCfg.gradient : "none");
  const navShowIcons: boolean = cmsNavCfg?.showIcons !== false;
  const forceLightText = settings.darkModeEnabled === false || (domTheme ?? resolvedTheme) === "light";
  const navTemplateTextStyle = navTemplate && forceLightText ? ({ color: "var(--text)" } as React.CSSProperties) : undefined;

  const preset: "classic" | "minimal" | "centered" = (header?.preset === "minimal" || header?.preset === "centered") ? header.preset : "classic";
  const sticky: boolean = settings.stickyHeaderEnabled !== false;
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
    "rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 px-3 py-2 text-sm " +
    navTextMuted +
    " hover:bg-black/10 dark:hover:bg-white/15";
  const navCtaBase =
    "rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[color:var(--accent-contrast)] hover:opacity-90";
  const navDrawerItem = "rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 p-3";
  const navDrawerLink = "font-semibold text-[color:var(--text)]";
  const navDrawerSubLink = "block text-sm text-[color:var(--text)] opacity-75 hover:opacity-100";

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
      return (sticky ? "sticky top-0 z-40 " : "relative z-40 ") + "border-b border-[color:var(--border)] bg-[color:var(--surface)]/80 backdrop-blur";
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

  return (
    <header className={headerClassName}>
      <div className={"mx-auto max-w-6xl px-4 " + padCls}>
        {preset === "centered" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className={`md:hidden ${navPill}`}
                aria-label="Toggle menu"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
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
                onClick={() => setMobileOpen((v) => !v)}
                className={`md:hidden ${navPill}`}
                aria-label="Toggle menu"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
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
      {mobileOpen ? (
        <div className="md:hidden border-t border-[color:var(--border)] bg-[color:var(--surface)]/95 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-4 space-y-3">
            {showSearch ? (
              <div className="w-full">
                <SearchControl withLabel />
              </div>
            ) : null}
            {cta ? (
              <Link href={cta.href || "/"} className={ctaMobileClassName}>
                {cta.label || "CTA"}
              </Link>
            ) : null}
            <div className="space-y-2">
              {navItems.map((it: any) => (
                <div key={it.id ?? it.href ?? it.label} className={navDrawerItem}>
                  <a href={it.href ?? "#"} className={navDrawerLink}>
                    {it.label}
                  </a>
                  {(it.children ?? []).length ? (
                    <div className="mt-2 space-y-1 pl-3">
                      {(it.children ?? []).map((ch: any) => (
                        <a key={ch.id ?? ch.href ?? ch.label} href={ch.href ?? "#"} className={navDrawerSubLink}>
                          {ch.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {allowMiniCart ? (
        <StorefrontMiniCart open={miniCartOpen} onClose={() => setMiniCartOpen(false)} />
      ) : null}
    </header>
  );
}




