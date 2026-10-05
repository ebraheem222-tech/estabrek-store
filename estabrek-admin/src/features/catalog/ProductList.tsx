// The products list: photo, price, stock at a glance, search by name or SKU,
// filters (category, status, stock), quick stock window and a sheet export.
import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { CatalogCategory, CatalogProduct } from "../../api/catalog.api";
import { listStock } from "../../api/inventory.api";
import { getApiErrorMessage } from "../../api/http";
import { cn } from "../../components/ui/cn";
import { Skeleton } from "../../components/ui/Spinner";
import { downloadText, toCsv } from "../../lib/csv";
import { formatShekel } from "../../lib/productComposer";
import { toast } from "../../lib/toast";
import { QuickStockModal } from "../inventory/QuickStockModal";

type StockFilter = "all" | "out" | "low" | "empty";
type Sort = "new" | "stock" | "name";
type Status = "all" | "active" | "draft";

type Props = {
  products: CatalogProduct[];
  categories: CatalogCategory[];
  loading: boolean;
  failed: boolean;
  status: Status;
  onStatus: (s: Status) => void;
  selected: Record<string, boolean>;
  setSelected: (fn: (s: Record<string, boolean>) => Record<string, boolean>) => void;
  bulkBar: React.ReactNode;
  onQuickEdit: (p: CatalogProduct) => void;
  onDelete: (id: string) => void;
  onImport: () => void;
};

const norm = (s: string) => s.toLowerCase().replace(/[ً-ْ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").trim();

export function ProductList({ products, categories, loading, failed, status, onStatus, selected, setSelected, bulkBar, onQuickEdit, onDelete, onImport }: Props) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [cat, setCat] = useState(params.get("category") ?? "");
  const [stock, setStock] = useState<StockFilter>((params.get("stock") as StockFilter) || "all");
  const [sort, setSort] = useState<Sort>("new");
  const [quick, setQuick] = useState<CatalogProduct | null>(null);
  const [exporting, setExporting] = useState(false);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const hasSummary = products.some((p) => p.summary);
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "";
  // A main category includes its sub-categories.
  const inCategory = (p: CatalogProduct) => !cat || p.categoryId === cat || categories.find((c) => c.id === p.categoryId)?.parentId === cat;

  const shown = useMemo(() => {
    const needle = norm(q);
    let list = products.filter((p) => {
      if (!inCategory(p)) return false;
      if (needle) {
        const hay = [p.title, p.slug, ...(p.summary?.skus ?? []), ...(p.summary?.colors ?? []).map((c) => c.name)].map((x) => norm(String(x ?? "")));
        if (!hay.some((h) => h.includes(needle))) return false;
      }
      const s = p.summary;
      if (stock !== "all" && !s) return false;
      if (stock === "out" && !(s!.outCount > 0)) return false;
      if (stock === "low" && !(s!.lowCount > 0)) return false;
      if (stock === "empty" && !(s!.variantCount > 0 && s!.stockTotal <= 0)) return false;
      return true;
    });
    if (sort === "stock") list = [...list].sort((a, b) => (a.summary?.stockTotal ?? 1e9) - (b.summary?.stockTotal ?? 1e9));
    if (sort === "name") list = [...list].sort((a, b) => a.title.localeCompare(b.title, "ar"));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, q, cat, stock, sort, categories]);

  const stats = useMemo(() => {
    const withS = products.filter((p) => p.summary);
    return {
      count: products.length,
      live: products.filter((p) => p.isActive).length,
      units: withS.reduce((s, p) => s + Math.max(0, p.summary!.stockTotal), 0),
      out: withS.filter((p) => p.summary!.outCount > 0).length,
      low: withS.filter((p) => p.summary!.lowCount > 0).length,
      empty: withS.filter((p) => p.summary!.variantCount > 0 && p.summary!.stockTotal <= 0).length,
    };
  }, [products]);

  const allChecked = shown.length > 0 && shown.every((p) => selected[p.id]);
  const toggleAll = (checked: boolean) => setSelected(() => Object.fromEntries(shown.map((p) => [p.id, checked])));

  const exportSheet = async () => {
    setExporting(true);
    try {
      const res = await listStock({ categoryId: undefined });
      const ids = new Set(shown.map((p) => p.id));
      const rows = res.rows.filter((r) => r.productId && ids.has(r.productId));
      const csv = toCsv(
        ["product", "status", "category", "color", "size", "sku", "price", "stock", "low_stock_alert"],
        rows.map((r) => [r.productTitle, r.productActive ? "published" : "draft", r.categoryName, r.colorName, r.size, r.sku, r.price, r.stock, r.lowStockThreshold]),
      );
      downloadText(`estabrek-products-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      toast.success(`صُدّر ${rows.length} SKU`);
    } catch (e) {
      toast.error("تعذّر التصدير", { description: (e as any)?.response?.status === 404 ? "حدّثي الباكند لتفعيل التصدير" : getApiErrorMessage(e) });
    } finally {
      setExporting(false);
    }
  };

  const chip = (active: boolean) =>
    cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition", active ? "border-accent-500/60 bg-accent-500/20 text-white" : "border-white/[0.1] bg-white/[0.03] text-white/70 hover:text-white");

  return (
    <div className="space-y-4" data-testid="product-list">
      {/* header */}
      <div className="glass rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">المنتجات</h1>
            <p className="mt-0.5 text-xs text-white/50">
              {stats.count} منتج · {stats.live} منشور{hasSummary ? <> · {stats.units} قطعة في المخزون</> : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onImport} className="h-10 rounded-xl border border-white/[0.12] px-3 text-sm text-white/80 hover:bg-white/[0.06]">استيراد CSV</button>
            {hasSummary ? <button type="button" onClick={exportSheet} disabled={exporting} className="h-10 rounded-xl border border-white/[0.12] px-3 text-sm text-white/80 hover:bg-white/[0.06] disabled:opacity-50">{exporting ? "…" : "تصدير Excel"}</button> : null}
            <Link to="/admin/inventory/stock" className="grid h-10 place-items-center rounded-xl border border-white/[0.12] px-3 text-sm text-white/80 hover:bg-white/[0.06]">المخزون</Link>
            <button type="button" onClick={() => nav("/admin/catalog/products/new")} className="h-10 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white hover:bg-accent-400">+ منتج جديد</button>
          </div>
        </div>

        {/* stock at a glance: each is also a filter */}
        {hasSummary && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ["all", "كل المنتجات", stats.count, ""],
              ["out", "فيها مقاس نفد", stats.out, "text-red-300"],
              ["low", "فيها مقاس قليل", stats.low, "text-amber-200"],
              ["empty", "نفدت بالكامل", stats.empty, "text-red-300"],
            ] as const).map(([key, label, n, tone]) => (
              <button
                key={key}
                type="button"
                onClick={() => { setStock(key); setParam("stock", key === "all" ? "" : key); }}
                className={cn("rounded-xl border px-3 py-2.5 text-right transition", stock === key ? "border-accent-500/50 bg-accent-500/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16]")}
                aria-pressed={stock === key}
              >
                <div className={cn("text-xl font-semibold text-white", tone)}>{n}</div>
                <div className="text-xs text-white/55">{label}</div>
              </button>
            ))}
          </div>
        )}

        {/* search and filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setParam("q", e.target.value); }}
              placeholder="ابحثي بالاسم أو كود SKU أو اللون…"
              className="h-10 w-full rounded-xl border border-white/[0.1] bg-surface-925 pe-3 ps-9 text-sm text-white placeholder:text-white/35 focus:border-accent-500/40 focus:outline-none"
              aria-label="بحث في المنتجات"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/35" aria-hidden>⌕</span>
          </div>
          <select value={cat} onChange={(e) => { setCat(e.target.value); setParam("category", e.target.value); }} className="h-10 rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white" aria-label="القسم">
            <option value="">كل الأقسام</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.parentId ? `— ${c.name}` : c.name}</option>)}
          </select>
          <div className="flex gap-1.5" role="group" aria-label="الحالة">
            {([["all", "الكل"], ["active", "منشور"], ["draft", "مسودة"]] as const).map(([k, l]) => (
              <button key={k} type="button" className={chip(status === k)} onClick={() => onStatus(k)} aria-pressed={status === k}>{l}</button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white" aria-label="الترتيب">
            <option value="new">الأحدث</option>
            <option value="stock">الأقل مخزوناً</option>
            <option value="name">الاسم</option>
          </select>
        </div>
        {!loading && !hasSummary && products.length > 0 && (
          <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-100">الصور والأسعار والكميات تظهر هنا بعد تحديث الباكند (Railway).</p>
        )}
      </div>

      {bulkBar}

      <div className="glass overflow-hidden rounded-2xl">
        {loading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : failed ? (
          <div className="p-6 text-sm text-red-200">فشل تحميل المنتجات.</div>
        ) : shown.length === 0 ? (
          <div className="p-10 text-center text-sm text-white/55">
            {products.length ? "لا توجد منتجات بهذا البحث." : "لا توجد منتجات بعد."}
            {products.length ? <button type="button" className="ms-2 text-accent-300" onClick={() => { setQ(""); setCat(""); setStock("all"); setParams({}, { replace: true }); }}>مسح الفلاتر</button> : null}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-2 text-xs text-white/50">
              <label className="flex items-center gap-2"><input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} aria-label="تحديد الكل" /> تحديد الكل</label>
              <span className="ms-auto">{shown.length} منتج</span>
            </div>
            <ul className="divide-y divide-white/[0.06]">
              {shown.map((p) => (
                <ProductRow
                  key={p.id}
                  p={p}
                  catName={p.category?.name ?? catName(p.categoryId)}
                  checked={Boolean(selected[p.id])}
                  onCheck={(v) => setSelected((s) => ({ ...s, [p.id]: v }))}
                  onOpen={() => nav(`/admin/catalog/products/${p.id}`)}
                  onStock={() => setQuick(p)}
                  onQuickEdit={() => onQuickEdit(p)}
                  onCopy={() => nav(`/admin/catalog/products/new?from=${p.id}`)}
                  onDelete={() => onDelete(p.id)}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      <QuickStockModal productId={quick?.id ?? null} title={quick?.title} onClose={() => setQuick(null)} />
    </div>
  );
}

function ProductRow({ p, catName, checked, onCheck, onOpen, onStock, onQuickEdit, onCopy, onDelete }: {
  p: CatalogProduct; catName: string; checked: boolean; onCheck: (v: boolean) => void; onOpen: () => void; onStock: () => void; onQuickEdit: () => void; onCopy: () => void; onDelete: () => void;
}) {
  const s = p.summary;
  const [menu, setMenu] = useState(false);
  const price = s?.priceMin == null ? "—" : s.priceMin === s.priceMax ? formatShekel(s.priceMin) : `${formatShekel(s.priceMin)} – ${formatShekel(s.priceMax)}`;
  const discount = s?.compareAtMax && s.priceMin && s.compareAtMax > s.priceMin ? Math.round((1 - s.priceMin / s.compareAtMax) * 100) : null;
  const stockTone = !s ? "text-white/40" : s.stockTotal <= 0 ? "text-red-300" : s.lowCount || s.outCount ? "text-amber-200" : "text-emerald-300";
  return (
    <li className="grid grid-cols-[auto_56px_minmax(0,1fr)] items-center gap-3 px-4 py-3 hover:bg-white/[0.02] md:grid-cols-[auto_56px_minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]" data-testid="product-row">
      <input type="checkbox" checked={checked} onChange={(e) => onCheck(e.target.checked)} aria-label={`تحديد ${p.title}`} />
      <button type="button" onClick={onOpen} className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/10 bg-black/20" aria-label={`فتح ${p.title}`}>
        {s?.thumbUrl ? <img src={s.thumbUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="grid h-full place-items-center text-[10px] text-white/40">لا صورة</span>}
        {discount ? <span className="absolute bottom-0.5 left-0.5 rounded bg-[#7d2448] px-1 text-[9px] font-semibold text-white">−{discount}%</span> : null}
      </button>
      <div className="min-w-0">
        <button type="button" onClick={onOpen} className="block max-w-full truncate text-right text-sm font-semibold text-white hover:text-accent-200">{p.title}</button>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/50">
          <span className={cn("rounded-full px-2 py-0.5", p.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.08] text-white/60")}>{p.isActive ? "منشور" : "مسودة"}</span>
          <span>{catName || "—"}</span>
          {s?.colors?.length ? (
            <span className="inline-flex items-center gap-1">
              {s.colors.slice(0, 6).map((c, i) => <span key={i} title={c.name} className={cn("h-3 w-3 rounded-full border border-white/25", !c.active && "opacity-40")} style={{ background: c.hex || "#999" }} />)}
              {s.colors.length > 6 ? <span>+{s.colors.length - 6}</span> : null}
            </span>
          ) : null}
        </div>
        {/* phones: price and stock under the name */}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs md:hidden">
          <span className="text-white/80">{price}</span>
          <button type="button" onClick={onStock} className={cn("font-medium", stockTone)}>{s ? `${s.stockTotal} قطعة` : "الكميات"}</button>
          {s?.outCount ? <span className="text-red-300">{s.outCount} نفد</span> : null}
        </div>
      </div>
      <div className="hidden text-sm md:block">
        <div className="text-white">{price}</div>
        {s ? <div className="text-[11px] text-white/45">{s.variantCount} SKU</div> : null}
      </div>
      <button type="button" onClick={onStock} className="hidden rounded-xl px-2 py-1 text-right hover:bg-white/[0.04] md:block" title="تعديل الكميات بسرعة">
        <div className={cn("text-sm font-semibold", stockTone)}>{s ? `${s.stockTotal} قطعة` : "الكميات"}</div>
        <div className="text-[11px] text-white/50">
          {s?.outCount ? <span className="text-red-300">{s.outCount} نفد</span> : null}
          {s?.outCount && s?.lowCount ? " · " : null}
          {s?.lowCount ? <span className="text-amber-200">{s.lowCount} قليل</span> : null}
          {s && !s.outCount && !s.lowCount ? "كل المقاسات متوفرة" : null}
        </div>
      </button>
      <div className="relative col-span-3 flex flex-wrap justify-end gap-2 md:col-span-1">
        <button type="button" onClick={onOpen} className="h-9 rounded-xl bg-accent-500 px-3 text-sm font-medium text-white hover:bg-accent-400">تعديل</button>
        <button type="button" onClick={onStock} className="h-9 rounded-xl border border-white/[0.12] px-3 text-sm text-white/80 hover:bg-white/[0.06]">الكميات</button>
        <button type="button" onClick={() => setMenu((m) => !m)} className="h-9 w-9 rounded-xl border border-white/[0.12] text-white/70 hover:bg-white/[0.06]" aria-label="المزيد" aria-expanded={menu}>⋯</button>
        {menu && (
          <div className="absolute left-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-white/[0.1] bg-surface-925 py-1 text-sm shadow-xl" onMouseLeave={() => setMenu(false)}>
            <button type="button" className="block w-full px-3 py-2 text-right text-white/80 hover:bg-white/[0.06]" onClick={() => { setMenu(false); onQuickEdit(); }}>الاسم والقسم بسرعة</button>
            <button type="button" className="block w-full px-3 py-2 text-right text-white/80 hover:bg-white/[0.06]" onClick={() => { setMenu(false); onCopy(); }}>نسخ كمنتج جديد</button>
            <Link className="block px-3 py-2 text-white/80 hover:bg-white/[0.06]" to={`/admin/catalog/products/${p.id}/advanced`}>المحرر المتقدم</Link>
            <Link className="block px-3 py-2 text-white/80 hover:bg-white/[0.06]" to={`/print/labels?productId=${p.id}`} target="_blank">ملصقات باركود</Link>
            <button type="button" className="block w-full px-3 py-2 text-right text-red-300 hover:bg-red-500/10" onClick={() => { setMenu(false); onDelete(); }}>حذف</button>
          </div>
        )}
      </div>
    </li>
  );
}
