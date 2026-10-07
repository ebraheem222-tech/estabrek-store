// src/layouts/adminNav.tsx
// Admin navigation: icons and the list of pages, shared by the sidebar,
// the command palette (Ctrl+K) and the phone tab bar.
import React from "react";
import type { AdminPermission } from "../lib/authz";

// Icons as inline SVGs for modern look
export const Icons = {
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
    </svg>
  ),
  sun: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m9-9h-1.5M4.5 12H3m15.36 6.36l-1.06-1.06M6.7 6.7L5.64 5.64m12.72 0L17.3 6.7M6.7 17.3l-1.06 1.06M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  ),
  moon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 15A9.72 9.72 0 0118 15.75 9.75 9.75 0 018.25 6c0-1.33.27-2.6.75-3.75A9.75 9.75 0 1021.75 15z" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  menu: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  ),
  store: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.35m-16.5 11.65V9.35m0 0a3 3 0 003.75-.62 3 3 0 004.5 0 3 3 0 004.5 0 3 3 0 003.75.62m-16.5 0a3 3 0 01-.62-4.72L4.5 3.42A1.5 1.5 0 015.56 3h12.88a1.5 1.5 0 011.06.44l1.19 1.19a3 3 0 01-.62 4.72M6.75 18h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .41.34.75.75.75z" />
    </svg>
  ),

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
  stock: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5v15M6.75 4.5v15M9 4.5v15M12.75 4.5v15M15 4.5v15M18.75 4.5v15M20.25 4.5v15" />
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
  media: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25l2.47-2.47a1.5 1.5 0 012.12 0l.66.66 1.72-1.72a1.5 1.5 0 012.12 0l1.91 1.91M8.25 8.25h.008v.008H8.25V8.25z" />
    </svg>
  ),
  chatbot: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25-4.03 8.25-9 8.25c-1.446 0-2.812-.28-4.03-.78L3 20.25l1.053-3.158A7.83 7.83 0 012.25 12z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 10.5h9M7.5 13.5h5.25" />
    </svg>
  ),
  backup: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <ellipse cx="12" cy="5.5" rx="7.5" ry="2.75" />
      <path strokeLinecap="round" d="M4.5 5.5v6c0 1.52 3.36 2.75 7.5 2.75s7.5-1.23 7.5-2.75v-6" />
      <path strokeLinecap="round" d="M4.5 11.5v6c0 1.52 3.36 2.75 7.5 2.75 1 0 1.96-.07 2.83-.2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 15.5v5m0 0l-2-2m2 2l2-2" />
    </svg>
  ),
  toggles: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <rect x="2.75" y="4.75" width="18.5" height="6.5" rx="3.25" />
      <circle cx="17.5" cy="8" r="1.75" fill="currentColor" stroke="none" />
      <rect x="2.75" y="12.75" width="18.5" height="6.5" rx="3.25" />
      <circle cx="6.5" cy="16" r="1.75" />
    </svg>
  ),
  ticket: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4zM14 6v2m0 3v2m0 3v2" />
    </svg>
  ),
  bell: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.86 17.08a23.85 23.85 0 005.45-1.31A8.97 8.97 0 0118 9.75V9a6 6 0 10-12 0v.75a8.97 8.97 0 01-2.31 6.02c1.73.64 3.56 1.08 5.45 1.31m5.72 0a24.26 24.26 0 01-5.72 0m5.72 0a3 3 0 11-5.72 0" />
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
  team: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.13a9.38 9.38 0 002.63.37 9.34 9.34 0 004.12-.95 4.13 4.13 0 00-7.53-2.49M15 19.13v-.01c0-1.12-.29-2.17-.78-3.08M15 19.13v.1A12.32 12.32 0 018.62 21c-2.33 0-4.51-.64-6.37-1.77v-.11a6.38 6.38 0 0111.96-3.08M12 6.38a3.38 3.38 0 11-6.75 0 3.38 3.38 0 016.75 0zm8.25 2.25a2.63 2.63 0 11-5.25 0 2.63 2.63 0 015.25 0z" />
    </svg>
  ),
  activity: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
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

export type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  requirePermissions?: AdminPermission[];
};

const NAV_MAIN: NavItem[] = [
  { to: "/admin/dashboard", label: "لوحة التحكم", icon: Icons.dashboard, requirePermissions: ["dashboard:read"] },
  { to: "/admin/orders", label: "الطلبات", icon: Icons.orders, requirePermissions: ["orders:read"] },
  { to: "/admin/tickets", label: "التذاكر والدخول", icon: Icons.ticket, requirePermissions: ["orders:read"] },
  { to: "/admin/requests", label: "الطلبات الخاصة", icon: Icons.bell, requirePermissions: ["orders:read"] },
  { to: "/admin/customers", label: "الزبائن", icon: Icons.profile, requirePermissions: ["customers:read"] },
  { to: "/admin/outbox", label: "الرسائل", icon: Icons.outbox, requirePermissions: ["outbox:read"] },
];

const NAV_CATALOG: NavItem[] = [
  { to: "/admin/catalog/categories", label: "التصنيفات", icon: Icons.categories, requirePermissions: ["catalog:read"] },
  { to: "/admin/catalog/products", label: "المنتجات", icon: Icons.products, requirePermissions: ["catalog:read"] },
  { to: "/admin/catalog/products/new", label: "+ منتج جديد", icon: Icons.products, requirePermissions: ["catalog:write"] },
  { to: "/admin/catalog/sizes", label: "المقاسات", icon: Icons.sizes, requirePermissions: ["catalog:read"] },
  { to: "/admin/catalog/types", label: "أنواع المنتجات", icon: Icons.categories, requirePermissions: ["catalog:read"] },
];

const NAV_INVENTORY: NavItem[] = [
  { to: "/admin/inventory/stock", label: "المخزون والباركود", icon: Icons.stock, requirePermissions: ["inventory:read"] },
  { to: "/admin/inventory/low-stock", label: "تنبيهات المخزون", icon: Icons.inventory, requirePermissions: ["inventory:read"] },
  { to: "/admin/inventory/back-in-stock", label: "بانتظار التوفّر", icon: Icons.bell, requirePermissions: ["inventory:read"] },
  { to: "/admin/inventory/adjustments", label: "سجل المخزون", icon: Icons.inventory, requirePermissions: ["inventory:write"] },
];

const NAV_DISCOUNTS: NavItem[] = [
  { to: "/admin/discounts/coupons", label: "الكوبونات", icon: Icons.coupon, requirePermissions: ["discounts:read"] },
  { to: "/admin/discounts/coupons/test", label: "تجربة كوبون", icon: Icons.coupon, requirePermissions: ["discounts:write"] },
];

const NAV_SITE: NavItem[] = [
  { to: "/admin/features", label: "الميزات", icon: Icons.toggles, requirePermissions: ["settings:read"] },
  { to: "/admin/razan", label: "رزان (دليلة المتجر)", icon: Icons.chatbot, requirePermissions: ["settings:read"] },
  { to: "/admin/quiz", label: "سؤال وجواب 🎁", icon: Icons.coupon, requirePermissions: ["settings:read"] },
  { to: "/admin/ai", label: "الذكاء الاصطناعي ✨", icon: Icons.chatbot, requirePermissions: ["settings:read"] },
  { to: "/admin/settings", label: "الإعدادات", icon: Icons.settings, requirePermissions: ["settings:read"] },
  { to: "/admin/media", label: "الوسائط", icon: Icons.media, requirePermissions: ["media:read"] },
  { to: "/admin/chatbot", label: "مساعد المتجر (AI)", icon: Icons.chatbot, requirePermissions: ["chatbot:read"] },
  { to: "/admin/nav", label: "القوائم", icon: Icons.nav, requirePermissions: ["nav:write"] },
  { to: "/admin/pages", label: "الصفحات", icon: Icons.pages, requirePermissions: ["pages:read"] },
  { to: "/admin/ugc/reviews", label: "التقييمات", icon: Icons.reviews, requirePermissions: ["ugc:read"] },
  { to: "/admin/ugc/comments", label: "التعليقات", icon: Icons.reviews, requirePermissions: ["ugc:read"] },
];

const NAV_TEAM: NavItem[] = [
  { to: "/admin/team", label: "الفريق والصلاحيات", icon: Icons.team, requirePermissions: ["staff:read"] },
  { to: "/admin/team/activity", label: "سجل النشاط", icon: Icons.activity, requirePermissions: ["activity:read"] },
  { to: "/admin/system/security", label: "حماية السيرفر", icon: Icons.security, requirePermissions: ["system:read"] },
  { to: "/admin/system/traffic", label: "حماية الضغط والصيانة", icon: Icons.activity, requirePermissions: ["system:read"] },
  { to: "/admin/system/backups", label: "النسخ الاحتياطي", icon: Icons.backup, requirePermissions: ["system:read"] },
];

const NAV_ACCOUNT: NavItem[] = [
  { to: "/admin/account/profile", label: "الملف الشخصي", icon: Icons.profile, requirePermissions: ["account:read"] },
  { to: "/admin/account/email", label: "تغيير البريد", icon: Icons.email, requirePermissions: ["account:write"] },
  { to: "/admin/account/security", label: "الأمان", icon: Icons.security, requirePermissions: ["security:read", "audit:read"] },
];

/** Sidebar groups, in order. The command palette and the phone tab bar use the same list. */
export const NAV_GROUPS: Array<{ id: string; title: string; items: NavItem[] }> = [
  { id: "main", title: "الإدارة", items: NAV_MAIN },
  { id: "catalog", title: "الكتالوج", items: NAV_CATALOG },
  { id: "inventory", title: "المخزون", items: NAV_INVENTORY },
  { id: "discounts", title: "التسويق", items: NAV_DISCOUNTS },
  { id: "site", title: "الموقع", items: NAV_SITE },
  { id: "team", title: "الفريق والأمان", items: NAV_TEAM },
  { id: "account", title: "الحساب", items: NAV_ACCOUNT },
];

/** The first page this admin may open (a team member may not have the dashboard). */
export function firstAllowedPath(has: (p: AdminPermission) => boolean): string {
  for (const g of NAV_GROUPS) {
    for (const item of g.items) {
      if ((item.requirePermissions ?? []).every((p) => has(p))) return item.to;
    }
  }
  return "/admin/account/profile";
}
