// The stock page: every SKU of every product in one table.
// - scan a barcode (or type a SKU) to find a size, or to receive stock (+1 per scan)
// - type new quantities / alerts in many rows, then save once (written to the history)
// - export to Excel, import a counted sheet back (by SKU), print barcode labels
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { applyStockChanges, backendHasStockTools, findBySku, listStock, type StockFilter, type StockRow } from "../../api/inventory.api";
import { getApiErrorMessage } from "../../api/http";
import { useCategories } from "../../hooks/useCatalog";
import { cn } from "../../components/ui/cn";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { downloadText, parseCsv, toCsv, toInt } from "../../lib/csv";
import { toast } from "../../lib/toast";
import { openLabels } from "./LabelsPrintPage";

type Edit = { stock?: string; low?: string };
const digits = (v: string) => v.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[^\d]/g, "");
const norm = (s: string) => s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").trim();
const PAGE = 150;

export default function StockPage() {
  const qc = useQueryClient();
  const cats = useCategories();
  const [filter, setFilter] = useState<StockFilter>("all");
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [flash, setFlash] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const tools = useQuery({ queryKey: ["inventory", "tools"], queryFn: backendHasStockTools, staleTime: Infinity });
  const list = useQuery({ queryKey: ["inventory", "stock", "all"], queryFn: () => listStock({ take: 5000 }), enabled: tools.data === true });
  const all = useMemo(() => list.data?.rows ?? [], [list.data]);

  const stockOf = (r: StockRow) => (edits[r.variantId]?.stock !== undefined && edits[r.variantId].stock !== "" ? Number(edits[r.variantId].stock) : r.stock);
  const lowOf = (r: StockRow) => (edits[r.variantId]?.low !== undefined && edits[r.variantId].low !== "" ? Number(edits[r.variantId].low) : r.lowStockThreshold);

  const rows = useMemo(() => {
    const needle = norm(q);
    return all.filter((r) => {
      if (cat && r.categoryId !== cat && cats.data?.find((c) => c.id === r.categoryId)?.parentId !== cat) return false;
      if (needle && ![r.sku, r.productTitle ?? "", r.colorName ?? "", r.size ?? ""].some((x) => norm(x).includes(needle))) return false;
      const st = r.stock;
      if (filter === "out" && st > 0) return false;
      if (filter === "ok" && st <= 0) return false;
      if (filter === "low" && !(st > 0 && r.lowStockThreshold > 0 && st <= r.lowStockThreshold)) return false;
      return true;
    });
  }, [all, q, cat, filter, cats.data]);

  const changes = useMemo(() => all.filter((r) => {
    const e = edits[r.variantId];
    return e && ((e.stock !== undefined && e.stock !== "" && Number(e.stock) !== r.stock) || (e.low !== undefined && e.low !== "" && Number(e.low) !== r.lowStockThreshold));
  }), [all, edits]);

  const totals = list.data?.totals;
  const setEdit = (id: string, patch: Edit) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));
  const bump = useCallback((r: StockRow, d: number) => setEdits((e) => {
    const cur = e[r.variantId]?.stock;
    const base = cur !== undefined && cur !== "" ? Number(cur) : r.stock;
    return { ...e, [r.variantId]: { ...e[r.variantId], stock: String(Math.max(0, base + d)) } };
  }), []);

  /* ------------------------------------------------ scanning */
  const scanRef = useRef<HTMLInputElement>(null);
  const [scan, setScan] = useState("");
  const [scanMode, setScanMode] = useState<"find" | "receive">("find");
  const [lastScan, setLastScan] = useState<{ sku: string; ok: boolean; text: string } | null>(null);
  const onScan = async (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    setScan("");
    let row = all.find((r) => r.sku.toUpperCase() === code.toUpperCase()) ?? null;
    if (!row) row = await findBySku(code).catch(() => null);
    if (!row) { setLastScan({ sku: code, ok: false, text: "لا يوجد مقاس بهذا الكود" }); return; }
    setQ(""); setFilter("all"); setCat("");
    if (scanMode === "receive") bump(row, 1);
    const after = scanMode === "receive" ? stockOf(row) + 1 : stockOf(row);
    setLastScan({ sku: row.sku, ok: true, text: `${row.productTitle} · ${row.colorName} · ${row.size} — ${scanMode === "receive" ? `صارت ${after}` : `الكمية ${after}`}` });
    setFlash(row.variantId);
    const idx = all.findIndex((r) => r.variantId === row!.variantId);
    if (idx >= limit) setLimit(idx + 20);
    window.setTimeout(() => document.getElementById(`row-${row!.variantId}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
    window.setTimeout(() => setFlash((f) => (f === row!.variantId ? null : f)), 1600);
  };

  /* ------------------------------------------------ save */
  const save = async () => {
    if (!changes.length) return;
    setSaving(true);
    try {
      const res = await applyStockChanges(changes.map((r) => {
        const e = edits[r.variantId];
        return {
          variantId: r.variantId,
          mode: "set" as const,
          ...(e.stock !== undefined && e.stock !== "" && Number(e.stock) !== r.stock ? { value: Number(e.stock) } : {}),
          ...(e.low !== undefined && e.low !== "" && Number(e.low) !== r.lowStockThreshold ? { lowStockThreshold: Number(e.low) } : {}),
        };
      }), reason.trim() || null);
      const failed = new Set(res.results.filter((x) => !x.ok).map((x) => x.variantId ?? x.key));
      setEdits((e) => Object.fromEntries(Object.entries(e).filter(([id]) => failed.has(id))));
      setReason("");
      await Promise.all([qc.invalidateQueries({ queryKey: ["inventory"] }), qc.invalidateQueries({ queryKey: ["catalog", "products"] })]);
      if (res.failed) toast.error(`حُفظ ${res.updated} ولم يُحفظ ${res.failed}`, { description: "الصفوف التي لم تُحفظ بقيت معلّمة" });
      else toast.success(`حُفظت ${res.updated} ${res.updated === 1 ? "كمية" : "كميات"} وسُجّلت في سجل المخزون`);
    } catch (e) {
      toast.error("لم تُحفظ الكميات", { description: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (changes.length) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changes.length]);

  /* ------------------------------------------------ export / labels */
  const exportCsv = () => {
    const csv = toCsv(
      ["sku", "product", "color", "size", "price", "stock", "low_stock_alert", "status"],
      rows.map((r) => [r.sku, r.productTitle, r.colorName, r.size, r.price, r.stock, r.lowStockThreshold, r.productActive ? "published" : "draft"]),
    );
    downloadText(`estabrek-stock-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };
  const selectedRows = rows.filter((r) => checked[r.variantId]);
  const printLabels = () => openLabels(selectedRows.length ? selectedRows : rows);

  /* ------------------------------------------------ render */
  if (tools.data === false) {
    return (
      <div dir="rtl" className="glass mx-auto max-w-2xl rounded-2xl p-6 text-sm leading-7 text-white/75">
        <h1 className="mb-2 text-lg font-semibold text-white">المخزون</h1>
        هذه الصفحة تحتاج تحديث الباكند (Railway) — بعد رفع آخر نسخة من <b>estabrek-store-backend</b> تظهر هنا كل المقاسات مع البحث والمسح بالباركود والتعديل الجماعي.
        <div className="mt-4 flex gap-3"><Link className="text-accent-300" to="/admin/inventory/low-stock">تنبيهات المخزون</Link><Link className="text-accent-300" to="/admin/catalog/products">المنتجات</Link></div>
      </div>
    );
  }

  const visible = rows.slice(0, limit);
  const allChecked = visible.length > 0 && visible.every((r) => checked[r.variantId]);
  return (
    <div dir="rtl" className="space-y-4 pb-28" data-testid="stock-page">
      <div className="glass rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">المخزون</h1>
            <p className="mt-0.5 text-xs text-white/50">كل مقاس لكل لون هو SKU. عدّلي الكميات واحفظي مرة واحدة — كل تغيير يُسجّل في السجل.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setImportOpen(true)} className="h-10 rounded-xl border border-white/[0.12] px-3 text-sm text-white/80 hover:bg-white/[0.06]">استيراد جرد (Excel/CSV)</button>
            <button type="button" onClick={exportCsv} disabled={!rows.length} className="h-10 rounded-xl border border-white/[0.12] px-3 text-sm text-white/80 hover:bg-white/[0.06] disabled:opacity-50">تصدير Excel</button>
            <button type="button" onClick={printLabels} disabled={!rows.length} className="h-10 rounded-xl border border-white/[0.12] px-3 text-sm text-white/80 hover:bg-white/[0.06] disabled:opacity-50">{selectedRows.length ? `ملصقات (${selectedRows.length})` : "ملصقات باركود"}</button>
            <Link to="/admin/inventory/adjustments" className="grid h-10 place-items-center rounded-xl border border-white/[0.12] px-3 text-sm text-white/80 hover:bg-white/[0.06]">سجل المخزون</Link>
          </div>
        </div>

        {totals && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([["all", "SKU", totals.skus, ""], ["ok", "قطعة متوفرة", totals.units, "text-emerald-300"], ["low", "قليل", totals.low, "text-amber-200"], ["out", "نفد", totals.out, "text-red-300"]] as const).map(([k, label, n, tone]) => (
              <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k} className={cn("rounded-xl border px-3 py-2.5 text-right transition", filter === k ? "border-accent-500/50 bg-accent-500/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16]")}>
                <div className={cn("text-xl font-semibold text-white", tone)}>{n}</div>
                <div className="text-xs text-white/55">{label}</div>
              </button>
            ))}
          </div>
        )}

        {/* scanner */}
        <div className="mt-4 rounded-2xl border border-accent-500/25 bg-accent-500/[0.06] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg" aria-hidden>▥</span>
            <input
              ref={scanRef}
              dir={scan ? "ltr" : "rtl"}
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void onScan(scan); } }}
              placeholder="امسحي الباركود أو اكتبي SKU ثم Enter"
              className="h-11 min-w-[220px] flex-1 rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-right font-mono text-sm text-white placeholder:text-white/35 focus:border-accent-500/50 focus:outline-none"
              aria-label="مسح باركود"
              data-testid="scan-input"
            />
            <div className="inline-flex rounded-xl border border-white/[0.1] bg-white/[0.03] p-1" role="tablist" aria-label="عند المسح">
              <button type="button" role="tab" aria-selected={scanMode === "find"} onClick={() => { setScanMode("find"); scanRef.current?.focus(); }} className={cn("h-9 rounded-lg px-3 text-sm", scanMode === "find" ? "bg-accent-500/25 text-white" : "text-white/60")}>إيجاد</button>
              <button type="button" role="tab" aria-selected={scanMode === "receive"} onClick={() => { setScanMode("receive"); scanRef.current?.focus(); }} className={cn("h-9 rounded-lg px-3 text-sm", scanMode === "receive" ? "bg-accent-500/25 text-white" : "text-white/60")}>استلام بضاعة (+1)</button>
            </div>
          </div>
          {lastScan ? (
            <p className={cn("mt-2 text-sm", lastScan.ok ? "text-emerald-300" : "text-red-300")} role="status" data-testid="scan-result">
              <span dir="ltr" className="font-mono">{lastScan.sku}</span> — {lastScan.text}
            </p>
          ) : (
            <p className="mt-2 text-xs text-white/45">قارئ الباركود يكتب الكود ويضغط Enter وحده. في «استلام بضاعة» كل مسحة تزيد قطعة، ثم احفظي.</p>
          )}
        </div>

        {/* filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="بحث بالاسم، اللون، المقاس أو SKU…" className="h-10 min-w-[200px] flex-1 rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white placeholder:text-white/35 focus:outline-none" aria-label="بحث في المخزون" />
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white" aria-label="القسم">
            <option value="">كل الأقسام</option>
            {(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.parentId ? `— ${c.name}` : c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        {list.isLoading || tools.isLoading ? (
          <div className="p-8 text-center text-sm text-white/55">جارٍ تحميل المخزون…</div>
        ) : list.isError ? (
          <div className="p-6 text-sm text-red-200">تعذّر تحميل المخزون: {getApiErrorMessage(list.error)}</div>
        ) : !rows.length ? (
          <div className="p-10 text-center text-sm text-white/55">لا توجد مقاسات بهذا البحث.</div>
        ) : (
          <>
            <div className="hidden grid-cols-[28px_44px_minmax(0,2.2fr)_minmax(0,1.4fr)_72px_150px_80px] items-center gap-3 border-b border-white/[0.06] px-4 py-2 text-[11px] text-white/45 md:grid">
              <input type="checkbox" checked={allChecked} onChange={(e) => setChecked((c) => ({ ...c, ...Object.fromEntries(visible.map((r) => [r.variantId, e.target.checked])) }))} aria-label="تحديد الكل" />
              <span />
              <span>المنتج · اللون · المقاس</span><span>SKU</span><span>السعر</span><span className="text-center">الكمية</span><span className="text-center">تنبيه عند</span>
            </div>
            <ul className="divide-y divide-white/[0.05]" data-testid="stock-rows">
              {visible.map((r) => {
                const st = stockOf(r);
                const lw = lowOf(r);
                const e = edits[r.variantId];
                const dirty = Boolean(e && ((e.stock !== undefined && e.stock !== "" && Number(e.stock) !== r.stock) || (e.low !== undefined && e.low !== "" && Number(e.low) !== r.lowStockThreshold)));
                return (
                  <li
                    key={r.variantId}
                    id={`row-${r.variantId}`}
                    className={cn("grid grid-cols-[28px_44px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-2.5 transition-colors md:grid-cols-[28px_44px_minmax(0,2.2fr)_minmax(0,1.4fr)_72px_150px_80px]", dirty && "bg-accent-500/[0.07]", flash === r.variantId && "bg-emerald-500/15")}
                    data-testid="stock-row"
                  >
                    <input type="checkbox" checked={Boolean(checked[r.variantId])} onChange={(ev) => setChecked((c) => ({ ...c, [r.variantId]: ev.target.checked }))} aria-label={`تحديد ${r.sku}`} />
                    <div className="h-11 w-11 overflow-hidden rounded-lg border border-white/10 bg-black/20">{r.imageUrl ? <img src={r.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}</div>
                    <div className="min-w-0">
                      <Link to={`/admin/catalog/products/${r.productId}`} className="block truncate text-sm font-medium text-white hover:text-accent-200">{r.productTitle}</Link>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-white/55">
                        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full border border-white/25" style={{ background: r.colorHex || "#888" }} />{r.colorName}</span>
                        <b className="text-white/85">{r.size}</b>
                        {!r.productActive ? <span className="rounded-full bg-white/[0.08] px-1.5 text-[10px]">مسودة</span> : null}
                        {st <= 0 ? <span className="rounded-full bg-red-500/15 px-1.5 text-[10px] text-red-300">نفد</span> : lw > 0 && st <= lw ? <span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] text-amber-200">قليل</span> : null}
                        <span dir="ltr" className="font-mono text-[11px] text-white/45 md:hidden">{r.sku}</span>
                      </div>
                    </div>
                    <span dir="ltr" className="hidden truncate text-right font-mono text-xs text-white/70 md:block" title={r.sku}>{r.sku}</span>
                    <span className="hidden text-sm text-white/70 md:block">₪{r.price}</span>
                    <div className="col-span-2 col-start-2 flex items-center gap-2 md:col-span-1 md:col-start-auto md:justify-center">
                      <div className="inline-flex items-center rounded-lg border border-white/[0.1] bg-white/[0.02]">
                        <button type="button" onClick={() => bump(r, -1)} className="h-9 w-9 text-white/55 hover:text-white" aria-label={`إنقاص ${r.sku}`}>−</button>
                        <input className={cn("h-9 w-14 bg-transparent text-center text-sm focus:outline-none", st <= 0 ? "text-red-300" : "text-white")} inputMode="numeric" value={e?.stock ?? String(r.stock)} onFocus={(ev) => ev.target.select()} onChange={(ev) => setEdit(r.variantId, { stock: digits(ev.target.value) })} aria-label={`كمية ${r.sku}`} />
                        <button type="button" onClick={() => bump(r, 1)} className="h-9 w-9 text-white/55 hover:text-white" aria-label={`زيادة ${r.sku}`}>+</button>
                      </div>
                      {dirty && e?.stock !== undefined && Number(e.stock) !== r.stock ? <span className="text-[11px] text-white/45">كان {r.stock}</span> : null}
                    </div>
                    <input className="hidden h-9 w-16 justify-self-center rounded-lg border border-white/[0.1] bg-surface-925 text-center text-sm text-white focus:outline-none md:block" inputMode="numeric" value={e?.low ?? String(r.lowStockThreshold)} onFocus={(ev) => ev.target.select()} onChange={(ev) => setEdit(r.variantId, { low: digits(ev.target.value) })} aria-label={`تنبيه ${r.sku}`} />
                  </li>
                );
              })}
            </ul>
            {rows.length > limit ? (
              <div className="p-3 text-center"><button type="button" onClick={() => setLimit((l) => l + PAGE)} className="h-10 rounded-xl border border-white/[0.12] px-4 text-sm text-white/80 hover:bg-white/[0.06]">عرض المزيد ({rows.length - limit})</button></div>
            ) : null}
          </>
        )}
      </div>

      {changes.length > 0 && (
        <div className="glass sticky bottom-[84px] z-30 rounded-2xl border border-accent-500/30 p-3 shadow-2xl lg:bottom-4" data-testid="stock-savebar">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-sm text-white">{changes.length} {changes.length === 1 ? "تغيير" : "تغييرات"}</b>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="السبب (اختياري): جرد، بضاعة وصلت…" className="h-10 min-w-[180px] flex-1 rounded-xl border border-white/[0.1] bg-surface-925 px-3 text-sm text-white focus:outline-none" aria-label="سبب التغيير" />
            <button type="button" onClick={() => setEdits({})} className="h-10 rounded-xl px-3 text-sm text-white/70 hover:bg-white/[0.06]">تراجع</button>
            <button type="button" onClick={save} disabled={saving} className="h-10 rounded-xl bg-accent-500 px-5 text-sm font-semibold text-white hover:bg-accent-400 disabled:opacity-60">{saving ? "جارٍ الحفظ…" : "حفظ الكميات"}</button>
          </div>
        </div>
      )}

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} rows={all} onApply={(next) => { setEdits((e) => ({ ...e, ...next })); setImportOpen(false); setFilter("all"); }} />
    </div>
  );
}

/* --------------------------------------------- import a counted sheet */

const SKU_KEYS = ["sku", "الكود", "كود", "code", "barcode", "باركود"];
const QTY_KEYS = ["stock", "quantity", "qty", "الكمية", "كمية", "count", "العدد"];
const ADD_KEYS = ["add", "received", "اضافة", "إضافة", "وصل"];
const LOW_KEYS = ["low_stock_alert", "alert", "تنبيه", "low"];
const pick = (row: Record<string, string>, keys: string[]) => { for (const k of keys) if (row[k] !== undefined && row[k] !== "") return row[k]; return undefined; };

function ImportModal({ open, onClose, rows, onApply }: { open: boolean; onClose: () => void; rows: StockRow[]; onApply: (edits: Record<string, Edit>) => void }) {
  const [parsed, setParsed] = useState<null | { found: Array<{ r: StockRow; stock: number | null; low: number | null }>; missing: string[]; bad: number }>(null);
  const [name, setName] = useState("");
  useEffect(() => { if (!open) { setParsed(null); setName(""); } }, [open]);

  const read = async (file: File | null) => {
    if (!file) return;
    setName(file.name);
    const text = await file.text();
    const bySku = new Map(rows.map((r) => [r.sku.toUpperCase(), r]));
    const found: Array<{ r: StockRow; stock: number | null; low: number | null }> = [];
    const missing: string[] = [];
    let bad = 0;
    for (const line of parseCsv(text)) {
      const sku = pick(line, SKU_KEYS)?.trim();
      if (!sku) { bad++; continue; }
      const r = bySku.get(sku.toUpperCase());
      if (!r) { missing.push(sku); continue; }
      const add = toInt(pick(line, ADD_KEYS));
      const qty = toInt(pick(line, QTY_KEYS));
      const low = toInt(pick(line, LOW_KEYS));
      const stock = add !== null ? Math.max(0, r.stock + add) : qty !== null ? Math.max(0, qty) : null;
      if (stock === null && low === null) { bad++; continue; }
      found.push({ r, stock, low });
    }
    setParsed({ found, missing, bad });
  };

  const changed = parsed?.found.filter((f) => (f.stock !== null && f.stock !== f.r.stock) || (f.low !== null && f.low !== f.r.lowStockThreshold)) ?? [];
  return (
    <Modal
      open={open}
      title="استيراد جرد من ملف"
      onClose={onClose}
      widthClassName="max-w-2xl"
      footer={<Button variant="primary" disabled={!changed.length} onClick={() => onApply(Object.fromEntries(changed.map((f) => [f.r.variantId, { ...(f.stock !== null ? { stock: String(f.stock) } : {}), ...(f.low !== null ? { low: String(f.low) } : {}) }])))}>
        {changed.length ? `تجهيز ${changed.length} تغيير للمراجعة` : "لا تغييرات"}
      </Button>}
    >
      <div dir="rtl" className="space-y-3 text-sm text-white/75">
        <p className="leading-6">
          ملف Excel محفوظ كـ CSV فيه عمود <b dir="ltr">sku</b> (أو «الكود») وعمود <b dir="ltr">stock</b> (أو «الكمية») للكمية الجديدة،
          أو عمود <b dir="ltr">add</b> (أو «إضافة») لما وصل فوق الموجود. أسهل طريقة: «تصدير Excel» ثم تعديل الكميات ورفعه هنا.
          لا شيء يُحفظ قبل أن تراجعي وتضغطي «حفظ الكميات».
        </p>
        <input type="file" accept=".csv,text/csv,.txt" onChange={(e) => void read(e.target.files?.[0] ?? null)} aria-label="ملف الجرد" className="block w-full text-sm" />
        {parsed && (
          <div className="rounded-xl border border-white/[0.08] p-3" data-testid="import-summary">
            <div className="font-medium text-white">{name}</div>
            <ul className="mt-1 space-y-0.5 text-xs">
              <li className="text-emerald-300">{changed.length} كمية ستتغير</li>
              <li>{parsed.found.length - changed.length} بدون تغيير</li>
              {parsed.missing.length ? <li className="text-amber-200">{parsed.missing.length} كود غير موجود: <span dir="ltr" className="font-mono">{parsed.missing.slice(0, 8).join(", ")}{parsed.missing.length > 8 ? "…" : ""}</span></li> : null}
              {parsed.bad ? <li className="text-red-300">{parsed.bad} صف بدون كود أو كمية</li> : null}
            </ul>
            {changed.length > 0 && (
              <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs">
                {changed.slice(0, 60).map((f) => (
                  <li key={f.r.variantId} className="flex justify-between gap-2"><span>{f.r.productTitle} · {f.r.colorName} · {f.r.size}</span><span>{f.stock !== null ? `${f.r.stock} → ${f.stock}` : ""}{f.low !== null && f.low !== f.r.lowStockThreshold ? ` · تنبيه ${f.low}` : ""}</span></li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
