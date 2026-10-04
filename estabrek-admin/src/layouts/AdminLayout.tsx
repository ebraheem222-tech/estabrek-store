// src/layouts/AdminLayout.tsx
import React, { Suspense, useCallback, useEffect, useState, createContext, useContext } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { NewOrderAlerts, OrdersBell } from "../features/orders/NewOrderAlerts";
import { useNewOrdersCount } from "../features/orders/useNewOrdersCount";
import { useSettings } from "../hooks/useSettings";
import { cn } from "../components/ui/cn";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Spinner } from "../components/ui/Spinner";
import { applyAdminTheme } from "../theme/adminTheme";
import { applyCursorTheme } from "../theme/cursorTheme";
import { applyButtonTheme, clearButtonTheme } from "../theme/buttonTheme";
import { applySkin, useSkin } from "../theme/skin";
import { Icons, NAV_GROUPS, type NavItem } from "./adminNav";
import { CommandPalette } from "./shell/CommandPalette";
import { MobileTabBar } from "./shell/MobileTabBar";
import { SkinPicker, SkinToggleButton } from "./shell/SkinSwitch";

// Counts shown next to sidebar items (e.g. new orders), keyed by link.
const NavBadgeContext = createContext<Record<string, number>>({});

/** Polls new orders only for accounts that can see orders. */
function OrdersWatch({ children }: { children: (count: number) => React.ReactNode }) {
  const count = useNewOrdersCount();
  return <>{children(count)}<NewOrderAlerts /></>;
}

// Sidebar context
const SidebarContext = createContext({ collapsed: false, setCollapsed: (_: boolean) => {} });
export const useSidebar = () => useContext(SidebarContext);

function NavItemLink({ to, label, icon }: NavItem) {
  const { collapsed } = useSidebar();
  const badge = useContext(NavBadgeContext)[to] ?? 0;

  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          collapsed ? "justify-center" : "",
          isActive
            ? "bg-accent-500/[0.12] text-white"
            : "text-white/60 hover:bg-white/[0.05] hover:text-white/90"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent-500 rounded-l-full" />
          )}
          <span className={cn("transition-colors", isActive ? "text-accent-400" : "text-white/45 group-hover:text-white/70")}>
            {icon}
          </span>
          {!collapsed && <span>{label}</span>}
          {badge > 0 && (
            <span className={cn("rounded-full bg-sky-500 px-1.5 text-center text-[10px] font-bold leading-4 text-white", collapsed ? "absolute left-1.5 top-1.5" : "mr-auto min-w-[1.2rem]")} aria-label={`${badge} جديد`}>
              {badge}
            </span>
          )}
          {collapsed && (
            <span className="absolute right-full mr-2 px-2 py-1 text-xs bg-surface-800 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-white/10">
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function NavGroup({ title, items, collapsed }: { title: string; items: NavItem[]; collapsed: boolean }) {
  return (
    <div className="space-y-1">
      {!collapsed && (
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wide text-white/35">
          {title}
        </div>
      )}
      {collapsed && <div className="h-px bg-white/5 my-2" />}
      <nav className="space-y-0.5">
        {items.map((item) => (
          <NavItemLink key={item.to} {...item} />
        ))}
      </nav>
    </div>
  );
}

/** Store mark: the logo from the settings, or the first letter on a rose tile. */
function BrandMark({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const [broken, setBroken] = useState(false);
  if (logoUrl && !broken) {
    return (
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white p-1">
        <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain" onError={() => setBroken(true)} />
      </span>
    );
  }
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-glow" title={name}>
      {/* a small rose */}
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 13.5c-2.6 0-4.5-1.9-4.5-4.4 0-1.6.9-3 2.3-3.7.6 1.2 1.3 1.8 2.2 1.8s1.6-.6 2.2-1.8c1.4.7 2.3 2.1 2.3 3.7 0 2.5-1.9 4.4-4.5 4.4Z" />
        <path d="M10 9.4c.5.7 1.2 1.1 2 1.1s1.5-.4 2-1.1" />
        <path d="M12 13.5V21M12 17c-1.6-1.9-3.6-2.3-5-1.8.6 1.7 2.6 2.6 5 1.8ZM12 18.5c1.4-1.5 3.1-1.8 4.4-1.3-.6 1.4-2.3 2.1-4.4 1.3Z" />
      </svg>
    </span>
  );
}

const PAGE_TITLES: Array<[string, string]> = [
  ["/dashboard", "لوحة التحكم"],
  ["/orders", "الطلبات"],
  ["/outbox", "الرسائل"],
  ["/categories", "التصنيفات"],
  ["/products/new", "منتج جديد"],
  ["/products", "المنتجات"],
  ["/sizes", "المقاسات"],
  ["/inventory", "المخزون"],
  ["/discounts/coupons/test", "تجربة كوبون"],
  ["/discounts/coupons", "الكوبونات"],
  ["/settings", "الإعدادات"],
  ["/media", "الوسائط"],
  ["/chatbot", "مساعد المتجر"],
  ["/nav", "القوائم"],
  ["/pages", "الصفحات"],
  ["/ugc/comments", "التعليقات"],
  ["/ugc/reviews", "التقييمات"],
  ["/profile", "الملف الشخصي"],
  ["/email", "تغيير البريد"],
  ["/security", "الأمان"],
];

function greeting(name?: string | null) {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jerusalem" }).format(new Date()));
  const part = h < 12 ? "صباح الخير" : h < 18 ? "مساء الخير" : "مساء النور";
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first ? `${part}، ${first}` : part;
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout, hasPermission } = useAuth();
  const canSeeOrders = hasPermission("orders:read");
  const qSettings = useSettings();
  const skin = useSkin();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const storeName = qSettings.data?.siteName || "استبرق";
  const logoUrl = qSettings.data?.logoUrl || null;

  useEffect(() => {
    const header = qSettings.data?.header;
    applyCursorTheme(header?.ui?.cursorThemeId);
    if (skin === "classic") {
      // The original look: theme presets and button themes from the settings page.
      applyAdminTheme(header?.ui?.adminTheme);
      applyButtonTheme(header?.storefront?.buttonThemeId);
    } else {
      clearButtonTheme();
    }
    applySkin(skin);
  }, [qSettings.data, skin]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Ctrl+K / ⌘K anywhere, or "/" when not typing, opens the quick search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const pageTitle = PAGE_TITLES.find(([p]) => location.pathname.includes(p))?.[1] ?? "لوحة التحكم";
  const isHome = location.pathname === "/admin" || location.pathname.startsWith("/admin/dashboard");

  const canViewNavItem = useCallback(
    (item: NavItem): boolean =>
      !item.requirePermissions?.length || item.requirePermissions.every((permission) => hasPermission(permission)),
    [hasPermission]
  );
  const can = useCallback((p: "orders:read" | "catalog:read" | "catalog:write") => hasPermission(p), [hasPermission]);

  const navGroups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter(canViewNavItem) })).filter((group) => group.items.length > 0);

  const renderShell = (ordersBadge: number) => (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div dir="rtl" className="min-h-screen bg-surface-950" data-skin-shell={skin}>
        {/* Soft background glow */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-500/[0.04] rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-600/[0.03] rounded-full blur-3xl" />
        </div>

        <div className="relative flex min-h-screen">
          {/* Mobile backdrop */}
          <div
            className={cn(
              "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden",
              mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
            )}
            onClick={() => setMobileOpen(false)}
          />

          {/* Sidebar */}
          <aside
            className={cn(
              "fixed top-0 right-0 z-50 flex h-full flex-col border-l border-white/[0.07] bg-surface-950/95 backdrop-blur-xl transition-all duration-300 lg:z-40 lg:translate-x-0 lg:bg-surface-950/80",
              mobileOpen ? "translate-x-0" : "translate-x-full",
              "w-[82vw] max-w-[320px]",
              collapsed ? "lg:w-[72px]" : "lg:w-[260px]"
            )}
            aria-label="القائمة"
          >
            {/* Brand */}
            <div className={cn("flex h-16 items-center border-b border-white/[0.07] px-4", collapsed ? "justify-center" : "gap-3")}>
              <BrandMark name={storeName} logoUrl={logoUrl} />
              {!collapsed && (
                <div className="flex min-w-0 flex-col">
                  <span className="skin-display truncate text-[17px] font-bold leading-6 text-white">{storeName}</span>
                  <span className="text-[11px] text-white/45">لوحة الإدارة</span>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-5 no-scrollbar"
              onClick={() => setMobileOpen(false)}
            >
              {navGroups.map((group) => (
                <NavGroup key={group.id} title={group.title} items={group.items} collapsed={collapsed} />
              ))}
            </div>

            {/* User + look */}
            <div className="border-t border-white/[0.07] p-3">
              {!collapsed ? (
                <div className="glass rounded-xl p-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-500/15 flex items-center justify-center border border-accent-500/20">
                      <span className="text-accent-400 text-sm font-semibold">
                        {admin?.name?.charAt(0) || "A"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {admin?.name || "المدير"}
                      </div>
                      <div className="text-xs text-white/40 truncate">
                        {admin?.email || "—"}
                      </div>
                    </div>
                  </div>
                  <SkinPicker />
                  <button
                    onClick={onLogout}
                    disabled={logout.isPending}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                  >
                    {logout.isPending ? (
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    ) : (
                      Icons.logout
                    )}
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <SkinPicker compact />
                  <button
                    onClick={onLogout}
                    disabled={logout.isPending}
                    className="w-full flex items-center justify-center p-2 text-white/60 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                    title="تسجيل الخروج"
                  >
                    {logout.isPending ? (
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    ) : (
                      Icons.logout
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Collapse button */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="absolute -left-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-surface-800 text-white/40 shadow-lg transition-all hover:bg-surface-700 hover:text-white lg:flex"
              aria-label={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
            >
              <span className={cn("transition-transform duration-300", collapsed ? "rotate-180" : "")}>
                {Icons.chevronLeft}
              </span>
            </button>
          </aside>

          {/* Main Content */}
          <main className={cn("min-w-0 flex-1 transition-all duration-300 mr-0", collapsed ? "lg:mr-[72px]" : "lg:mr-[260px]")}>
            {/* Top bar */}
            <header className="sticky top-0 z-30 h-16 border-b border-white/[0.07] bg-surface-950/80 backdrop-blur-xl">
              <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] sm:inline-flex lg:hidden"
                    onClick={() => setMobileOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    {Icons.menu}
                  </button>
                  <div className="min-w-0">
                    <h1 className="truncate text-lg font-bold leading-6 text-white">{pageTitle}</h1>
                    {isHome && <p className="hidden truncate text-xs text-white/45 sm:block">{greeting(admin?.name)} 🌸</p>}
                  </div>
                </div>

                {/* Quick search */}
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="hidden h-10 w-full max-w-sm items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 text-sm text-white/45 transition hover:border-white/15 hover:text-white/70 md:flex [&_svg]:h-4 [&_svg]:w-4"
                  data-testid="open-search"
                >
                  {Icons.search}
                  <span className="flex-1 truncate text-right">ابحثي عن طلب، منتج، صفحة…</span>
                  <kbd className="rounded-md border border-white/10 px-1.5 py-0.5 font-sans text-[10px] text-white/40" dir="ltr">Ctrl K</kbd>
                </button>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaletteOpen(true)}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-white/60 hover:bg-white/[0.06] md:hidden [&_svg]:h-[18px] [&_svg]:w-[18px]"
                    aria-label="بحث"
                  >
                    {Icons.search}
                  </button>
                  <div className="hidden text-xs text-white/40 2xl:block">
                    {new Date().toLocaleDateString("ar-EG-u-nu-latn", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      timeZone: "Asia/Jerusalem",
                    })}
                  </div>
                  {skin !== "classic" && <SkinToggleButton />}
                  {canSeeOrders && <OrdersBell />}
                </div>
              </div>
            </header>

            {/* Page content */}
            <div className="p-4 pb-28 sm:p-6 sm:pb-28 lg:pb-6">
              <div className="max-w-7xl mx-auto animate-fade-in-up">
                <ErrorBoundary title="حدث خطأ داخل الصفحة">
                  <Suspense
                    fallback={(
                      <div className="flex items-center justify-center py-12">
                        <Spinner size="lg" />
                      </div>
                    )}
                  >
                    <Outlet />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </div>
          </main>
        </div>

        <MobileTabBar
          ordersBadge={ordersBadge}
          canOrders={canSeeOrders}
          canAddProduct={hasPermission("catalog:write")}
          canProducts={hasPermission("catalog:read")}
          onSearch={() => setPaletteOpen(true)}
          onMenu={() => setMobileOpen(true)}
        />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} canView={canViewNavItem} can={can} />
      </div>
    </SidebarContext.Provider>
  );

  if (!canSeeOrders) return renderShell(0);
  return (
    <OrdersWatch>
      {(count) => <NavBadgeContext.Provider value={{ "/admin/orders": count }}>{renderShell(count)}</NavBadgeContext.Provider>}
    </OrdersWatch>
  );
}
