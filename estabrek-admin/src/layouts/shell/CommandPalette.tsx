// Quick search for the whole admin (Ctrl+K / ⌘K or the search box in the top bar):
// jump to any page, run a common action, or find an order (name, phone, number)
// or a product by name.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listOrders } from "../../api/orders.api";
import { listProducts } from "../../api/catalog.api";
import { cn } from "../../components/ui/cn";
import { env } from "../../config/env";
import { shekel, shortOrderId, statusLabel, orderTotal, type OrderLike } from "../../lib/orders";
import { setSkin, SKINS, type AdminSkin } from "../../theme/skin";
import { Icons, NAV_GROUPS, type NavItem } from "../adminNav";
import { normalizeSearch, phoneDigits } from "./search";

type Hit = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  run: () => void;
};

export function CommandPalette({ open, onClose, canView, can }: {
  open: boolean;
  onClose: () => void;
  canView: (item: NavItem) => boolean;
  can: (perm: "orders:read" | "catalog:read" | "catalog:write") => boolean;
}) {
  // Mounted only while open, so every opening starts clean.
  return open ? <Palette onClose={onClose} canView={canView} can={can} /> : null;
}

function Palette({ onClose, canView, can }: {
  onClose: () => void;
  canView: (item: NavItem) => boolean;
  can: (perm: "orders:read" | "catalog:read" | "catalog:write") => boolean;
}) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const term = normalizeSearch(debounced);
  const digits = phoneDigits(debounced);
  const searching = term.length >= 2;

  const ordersQ = useQuery({
    queryKey: ["admin", "palette", "orders", debounced],
    queryFn: () => listOrders({ q: debounced, pageSize: 8 }),
    enabled: searching && can("orders:read"),
    staleTime: 15_000,
  });
  const productsQ = useQuery({
    queryKey: ["admin", "palette", "products"],
    queryFn: () => listProducts("all"),
    enabled: searching && can("catalog:read"),
    staleTime: 5 * 60_000,
  });

  const go = (to: string) => () => { onClose(); nav(to); };

  const hits = useMemo<Hit[]>(() => {
    const out: Hit[] = [];
    const match = (...texts: Array<string | null | undefined>) => !term || texts.some((t) => normalizeSearch(t ?? "").includes(term));

    // Actions first: the things done every day.
    const actions: Hit[] = [];
    if (can("catalog:write")) actions.push({ id: "a-new-product", group: "إجراءات", label: "منتج جديد", hint: "إضافة سريعة بالصور", icon: Icons.plus, run: go("/admin/catalog/products/new") });
    if (can("orders:read")) actions.push({ id: "a-new-orders", group: "إجراءات", label: "الطلبات الجديدة", hint: "اللي تنتظر التواصل", icon: Icons.orders, run: go("/admin/orders?status=NEW") });
    if (can("orders:read")) actions.push({ id: "a-today", group: "إجراءات", label: "طلبات اليوم", icon: Icons.orders, run: go("/admin/orders?range=today") });
    actions.push({ id: "a-store", group: "إجراءات", label: "فتح المتجر", hint: "في نافذة جديدة", icon: Icons.store, run: () => { onClose(); window.open(storefrontUrl(), "_blank", "noopener"); } });
    for (const s of SKINS) {
      actions.push({ id: `a-skin-${s.id}`, group: "إجراءات", label: `المظهر: ${s.label}`, hint: s.hint, icon: s.id === "rose" ? Icons.sun : Icons.moon, run: () => { setSkin(s.id as AdminSkin); onClose(); } });
    }
    out.push(...actions.filter((a) => match(a.label, a.hint, a.id === "a-store" ? "store shop" : "")));

    // Pages
    for (const g of NAV_GROUPS) {
      for (const item of g.items) {
        if (!canView(item) || !match(item.label, g.title)) continue;
        out.push({ id: `p-${item.to}`, group: "الصفحات", label: item.label.replace(/^\+\s*/, ""), hint: g.title, icon: item.icon, run: go(item.to) });
      }
    }
    if (!searching) return out;

    // Orders: the server searches by name/phone/number; older servers ignore q, so filter here too.
    const orders = ((ordersQ.data?.data ?? []) as Array<OrderLike & { id: string; customerName: string; phone?: string | null; status?: string; city?: string | null }>)
      .filter((o) =>
        normalizeSearch(o.customerName).includes(term) ||
        o.id.toLowerCase().includes(debounced.toLowerCase().replace(/^#/, "")) ||
        shortOrderId(o.id).toLowerCase() === debounced.toLowerCase().replace(/^#/, "") ||
        (digits.length >= 4 && phoneDigits(o.phone ?? "").includes(digits)) ||
        normalizeSearch(o.city ?? "").includes(term))
      .slice(0, 6);
    for (const o of orders) {
      out.push({
        id: `o-${o.id}`,
        group: "طلبات",
        label: `${o.customerName} · #${shortOrderId(o.id)}`,
        hint: [statusLabel(o.status), shekel(orderTotal(o)), o.city].filter(Boolean).join(" · "),
        icon: Icons.orders,
        run: go(`/admin/orders/${o.id}`),
      });
    }

    const products = (productsQ.data ?? []).filter((p) => normalizeSearch(p.title).includes(term) || p.slug.includes(debounced.toLowerCase())).slice(0, 6);
    for (const p of products) {
      out.push({ id: `pr-${p.id}`, group: "منتجات", label: p.title, hint: [p.category?.name, p.isActive ? "منشور" : "مسودة"].filter(Boolean).join(" · "), icon: Icons.products, run: go(`/admin/catalog/products/${p.id}`) });
    }
    return out;
    // `go` only closes over stable values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, digits, debounced, searching, ordersQ.data, productsQ.data, canView, can]);

  const current = Math.min(active, Math.max(0, hits.length - 1));

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(hits.length - 1, Math.min(i, hits.length - 1) + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, Math.min(i, hits.length - 1) - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); hits[current]?.run(); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  const loading = searching && (ordersQ.isFetching || productsQ.isFetching);
  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-3 pt-[10vh] backdrop-blur-sm sm:p-6 sm:pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} data-testid="command-palette">
      <div role="dialog" aria-modal="true" aria-label="بحث سريع" dir="rtl" className="glass w-full max-w-xl overflow-hidden rounded-2xl bg-surface-925 shadow-2xl" onKeyDown={onKey}>
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4">
          <span className="text-white/45">{Icons.search}</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            placeholder="ابحثي عن صفحة، طلب (اسم أو هاتف)، أو منتج…"
            className="h-14 flex-1 bg-transparent text-[15px] text-white placeholder:text-white/35 focus:outline-none"
            aria-label="بحث"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={hits[current] ? `palette-${hits[current].id}` : undefined}
          />
          {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-accent-500" aria-hidden /> : <kbd className="hidden rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-white/45 sm:inline">Esc</kbd>}
        </div>
        <div ref={listRef} id="palette-list" role="listbox" className="max-h-[min(60vh,440px)] overflow-y-auto p-2">
          {hits.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-white/50">{loading ? "جارٍ البحث…" : "ما لقينا شيء. جرّبي اسماً آخر أو آخر 4 أرقام من الهاتف."}</p>
          )}
          {hits.map((h, i) => {
            const header = h.group !== lastGroup ? h.group : null;
            lastGroup = h.group;
            return (
              <React.Fragment key={h.id}>
                {header && <div className="px-3 pb-1 pt-3 text-[11px] font-semibold text-white/40 first:pt-1">{header}</div>}
                <button
                  type="button"
                  id={`palette-${h.id}`}
                  role="option"
                  aria-selected={i === current}
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={h.run}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-colors", i === current ? "bg-accent-500/[0.12] text-white" : "text-white/80")}
                >
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg [&_svg]:h-4 [&_svg]:w-4", i === current ? "bg-accent-500/20 text-accent-400" : "bg-white/[0.05] text-white/50")}>{h.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{h.label}</span>
                    {h.hint && <span className="block truncate text-xs text-white/45">{h.hint}</span>}
                  </span>
                  {i === current && <span className="text-xs text-white/40" aria-hidden>↵</span>}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="hidden items-center gap-4 border-t border-white/[0.08] px-4 py-2 text-[11px] text-white/40 sm:flex">
          <span><kbd className="font-sans">↑ ↓</kbd> للتنقل</span>
          <span><kbd className="font-sans">↵</kbd> للفتح</span>
          <span className="mr-auto">Ctrl K في أي وقت</span>
        </div>
      </div>
    </div>
  );
}

function storefrontUrl() {
  return env.VITE_STOREFRONT_BASE_URL || "/";
}
