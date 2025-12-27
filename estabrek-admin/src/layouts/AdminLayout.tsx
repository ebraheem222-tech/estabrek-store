// src/layouts/AdminLayout.tsx
import React, { useEffect, useState, createContext, useContext } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../components/ui/cn";
import { ErrorBoundary } from "../components/ErrorBoundary";

// Icons as inline SVGs for modern look
const Icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  orders: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  outbox: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  coupon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m-6 0h.01M15 14.25h.01M3.75 7.5h16.5A2.25 2.25 0 0122.5 9.75v4.5A2.25 2.25 0 0120.25 16.5H3.75A2.25 2.25 0 011.5 14.25v-4.5A2.25 2.25 0 013.75 7.5z" />
    </svg>
  ),
  categories: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
    </svg>
  ),
  products: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  sizes: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  inventory: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6m0 6h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  ),
  nav: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  pages: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  reviews: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.75.75 0 011.04 0l2.39 2.32a.75.75 0 00.424.201l3.307.48a.75.75 0 01.415 1.279l-2.39 2.33a.75.75 0 00-.216.664l.564 3.296a.75.75 0 01-1.088.79l-2.96-1.556a.75.75 0 00-.698 0l-2.96 1.556a.75.75 0 01-1.088-.79l.564-3.296a.75.75 0 00-.216-.664l-2.39-2.33a.75.75 0 01.415-1.279l3.307-.48a.75.75 0 00.424-.201l2.39-2.32z" />
    </svg>
  ),
  profile: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  email: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  security: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1.5l7.5 4.5v6c0 5.25-3.188 9.75-7.5 10.5C7.688 21.75 4.5 17.25 4.5 12V6L12 1.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  ),
};

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_MAIN: NavItem[] = [
  { to: "/admin/dashboard", label: "لوحة التحكم", icon: Icons.dashboard },
  { to: "/admin/orders", label: "الطلبات", icon: Icons.orders },
  { to: "/admin/outbox", label: "الرسائل", icon: Icons.outbox },
];

const NAV_CATALOG: NavItem[] = [
  { to: "/admin/catalog/categories", label: "التصنيفات", icon: Icons.categories },
  { to: "/admin/catalog/products", label: "المنتجات", icon: Icons.products },
  { to: "/admin/catalog/sizes", label: "المقاسات", icon: Icons.sizes },
];

const NAV_INVENTORY: NavItem[] = [
  { to: "/admin/inventory/low-stock", label: "تنبيهات المخزون", icon: Icons.inventory },
  { to: "/admin/inventory/adjustments", label: "سجل المخزون", icon: Icons.inventory },
];

const NAV_DISCOUNTS: NavItem[] = [
  { to: "/admin/discounts/coupons", label: "الكوبونات", icon: Icons.coupon },
  { to: "/admin/discounts/coupons/test", label: "تجربة كوبون", icon: Icons.coupon },
];

const NAV_SITE: NavItem[] = [
  { to: "/admin/settings", label: "الإعدادات", icon: Icons.settings },
  { to: "/admin/nav", label: "القوائم", icon: Icons.nav },
  { to: "/admin/pages", label: "الصفحات", icon: Icons.pages },
  { to: "/admin/ugc/reviews", label: "التقييمات", icon: Icons.reviews },
];

const NAV_ACCOUNT: NavItem[] = [
  { to: "/admin/account/profile", label: "الملف الشخصي", icon: Icons.profile },
  { to: "/admin/account/email", label: "تغيير البريد", icon: Icons.email },
  { to: "/admin/account/security", label: "الأمان", icon: Icons.security },
];

// Sidebar context
const SidebarContext = createContext({ collapsed: false, setCollapsed: (_: boolean) => {} });
export const useSidebar = () => useContext(SidebarContext);

function NavItemLink({ to, label, icon }: NavItem) {
  const { collapsed } = useSidebar();
  
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          collapsed ? "justify-center" : "",
          isActive
            ? "bg-white/[0.08] text-white shadow-inner-light"
            : "text-white/60 hover:bg-white/[0.04] hover:text-white/90"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent-500 rounded-l-full" />
          )}
          <span className={cn("transition-colors", isActive ? "text-accent-400" : "text-white/50 group-hover:text-white/70")}>
            {icon}
          </span>
          {!collapsed && <span>{label}</span>}
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
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">
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

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const onLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("/dashboard")) return "لوحة التحكم";
    if (path.includes("/orders")) return "الطلبات";
    if (path.includes("/outbox")) return "الرسائل";
    if (path.includes("/categories")) return "التصنيفات";
    if (path.includes("/products")) return "المنتجات";
    if (path.includes("/sizes")) return "المقاسات";
    if (path.includes("/inventory")) return "المخزون";
    if (path.includes("/discounts/coupons/test")) return "تجربة كوبون";
    if (path.includes("/discounts/coupons")) return "الكوبونات";
    if (path.includes("/settings")) return "الإعدادات";
    if (path.includes("/nav")) return "القوائم";
    if (path.includes("/pages")) return "الصفحات";
    if (path.includes("/profile")) return "الملف الشخصي";
    if (path.includes("/email")) return "تغيير البريد";
    return "لوحة التحكم";
  };

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div dir="rtl" className="min-h-screen bg-surface-950">
        {/* Gradient background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-500/[0.03] rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-600/[0.02] rounded-full blur-3xl" />
        </div>

        <div className="relative flex min-h-screen">
          {/* Mobile backdrop */}
          <div
            className={cn(
              "fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden",
              mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
            )}
            onClick={() => setMobileOpen(false)}
          />

          {/* Sidebar */}
          <aside
            className={cn(
              "fixed top-0 right-0 z-40 flex h-full flex-col border-l border-white/[0.06] bg-surface-950/80 backdrop-blur-xl transition-all duration-300 lg:translate-x-0",
              mobileOpen ? "translate-x-0" : "translate-x-full",
              "w-[82vw] max-w-[320px]",
              collapsed ? "lg:w-[72px]" : "lg:w-[260px]"
            )}
          >
            {/* Logo */}
            <div className={cn(
              "flex items-center h-16 border-b border-white/[0.06] px-4",
              collapsed ? "justify-center" : "gap-3"
            )}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-glow">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="font-semibold text-white">Estabrek</span>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Admin Panel</span>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6 no-scrollbar"
              onClick={() => setMobileOpen(false)}
            >
              <NavGroup title="الإدارة" items={NAV_MAIN} collapsed={collapsed} />
              <NavGroup title="الكتالوج" items={NAV_CATALOG} collapsed={collapsed} />
              <NavGroup title="المخزون" items={NAV_INVENTORY} collapsed={collapsed} />
              <NavGroup title="التسويق" items={NAV_DISCOUNTS} collapsed={collapsed} />
              <NavGroup title="الموقع" items={NAV_SITE} collapsed={collapsed} />
              <NavGroup title="الحساب" items={NAV_ACCOUNT} collapsed={collapsed} />
            </div>

            {/* User section */}
            <div className="border-t border-white/[0.06] p-3">
              {!collapsed ? (
                <div className="glass rounded-xl p-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-surface-700 to-surface-800 flex items-center justify-center border border-white/10">
                      <span className="text-white/80 text-sm font-medium">
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
                  <button
                    onClick={onLogout}
                    disabled={logout.isPending}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
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
                <button
                  onClick={onLogout}
                  disabled={logout.isPending}
                  className="w-full flex items-center justify-center p-2 text-white/60 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
                  title="تسجيل الخروج"
                >
                  {logout.isPending ? (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  ) : (
                    Icons.logout
                  )}
                </button>
              )}
            </div>

            {/* Collapse button */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="absolute -left-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-surface-800 text-white/40 shadow-lg transition-all hover:bg-surface-700 hover:text-white lg:flex"
            >
              <span className={cn("transition-transform duration-300", collapsed ? "rotate-180" : "")}>
                {Icons.chevronLeft}
              </span>
            </button>
          </aside>

          {/* Main Content */}
          <main className={cn("flex-1 transition-all duration-300 mr-0", collapsed ? "lg:mr-[72px]" : "lg:mr-[260px]")}>
            {/* Top bar */}
            <header className="sticky top-0 z-30 h-16 border-b border-white/[0.06] bg-surface-950/80 backdrop-blur-xl">
              <div className="h-full px-4 sm:px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] lg:hidden"
                    onClick={() => setMobileOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                  </button>
                  <h1 className="text-lg font-semibold text-white">{getPageTitle()}</h1>
                </div>
                <div className="hidden sm:block text-xs text-white/40 font-mono">
                  {new Date().toLocaleDateString("ar-SA", { 
                    weekday: "long",
                    year: "numeric",
                    month: "long", 
                    day: "numeric"
                  })}
                </div>
              </div>
            </header>

            {/* Page content */}
            <div className="p-4 sm:p-6">
              <div className="max-w-7xl mx-auto animate-fade-in-up">
                <ErrorBoundary title="حدث خطأ داخل الصفحة">
                  <Outlet />
                </ErrorBoundary>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
