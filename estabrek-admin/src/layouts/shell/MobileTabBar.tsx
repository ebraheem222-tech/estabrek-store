// Phone tab bar: the four places used all day plus the full menu.
import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "../../components/ui/cn";
import { Icons } from "../adminNav";

export function MobileTabBar({ ordersBadge, canOrders, canAddProduct, canProducts, onSearch, onMenu }: {
  ordersBadge: number;
  canOrders: boolean;
  canAddProduct: boolean;
  canProducts: boolean;
  onSearch: () => void;
  onMenu: () => void;
}) {
  const tab = "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10.5px] font-medium [&_svg]:h-[22px] [&_svg]:w-[22px]";
  const tone = ({ isActive }: { isActive: boolean }) => cn(tab, isActive ? "text-accent-400" : "text-white/55");
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-surface-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="التنقل السريع"
      data-testid="mobile-tabbar"
    >
      <div className="mx-auto flex h-16 max-w-md items-stretch px-2">
        <NavLink to="/admin/dashboard" className={tone}>{Icons.dashboard}<span>الرئيسية</span></NavLink>
        {canOrders && (
          <NavLink to="/admin/orders" className={tone}>
            {Icons.orders}
            <span>الطلبات</span>
            {ordersBadge > 0 && <span className="absolute top-1 left-1/2 ml-[-22px] min-w-[1.1rem] rounded-full bg-sky-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{ordersBadge}</span>}
          </NavLink>
        )}
        {canAddProduct && (
          <div className="flex flex-1 items-center justify-center">
            <NavLink to="/admin/catalog/products/new" end aria-label="منتج جديد" className="-mt-6 grid h-14 w-14 place-items-center rounded-2xl bg-accent-500 text-white shadow-lg shadow-accent-500/30 ring-4 ring-surface-950 [&_svg]:h-6 [&_svg]:w-6">
              {Icons.plus}
            </NavLink>
          </div>
        )}
        {canProducts ? (
          <NavLink to="/admin/catalog/products" end className={tone}>{Icons.products}<span>المنتجات</span></NavLink>
        ) : (
          <button type="button" onClick={onSearch} className={cn(tab, "text-white/55")}>{Icons.search}<span>بحث</span></button>
        )}
        <button type="button" onClick={onMenu} className={cn(tab, "text-white/55")} aria-label="القائمة الكاملة">{Icons.menu}<span>المزيد</span></button>
      </div>
    </nav>
  );
}
