// Step 4: sizes from ready sets, which sizes each colour comes in, then every
// colour × size as its own SKU row (code, price, quantity, low-stock alert) — or
// the quick quantities grid.
import React, { useMemo, useState } from "react";
import type { CatalogSize } from "../../../api/catalog.api";
import { cn } from "../../../components/ui/cn";
import { formatMoney, parsePrice, sizePresets } from "../../../lib/productComposer";
import { autoSkus, cleanSku, hasSize, lowOf, madeCount, priceOf, setSizeFor, sizesOf, stockKey, stockOf, type ComposerDraft } from "./composerModel";
import { Chip, Section, Swatch, Toggle } from "./ui";
import { fieldCls } from "./styles";
import { currencySign } from "../../../lib/money";
import { tr } from "@/lib/words";

type Props = {
  draft: ComposerDraft;
  update: (fn: (d: ComposerDraft) => ComposerDraft) => void;
  sizes: CatalogSize[];
  onCreateSize: (name: string) => Promise<CatalogSize | null>;
  error?: string;
  /** SKUs the server refused (taken by another product): shown in red. */
  badSkus?: string[];
  step?: number;
};

type View = "skus" | "grid";
const VIEW_KEY = "estabrek_admin_stock_view_v1";
const readView = (): View => {
  try { return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "skus"; } catch { return "skus"; }
};

const digits = (v: string) => v.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[^\d]/g, "");
const decimal = (v: string) => v.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[^\d.]/g, "");

export function SizesStockSection({ draft, update, sizes, onCreateSize, error, badSkus = [], step = 4 }: Props) {
  const active = useMemo(() => [...sizes].filter((s) => s.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [sizes]);
  const presets = useMemo(() => sizePresets(active), [active]);
  // Sizes the product already uses stay listed even when switched off in Sizes.
  const chips = useMemo(() => [...active, ...sizes.filter((s) => s.active === false && draft.sizeIds.includes(s.id))], [active, sizes, draft.sizeIds]);
  const selected = draft.sizeIds.map((id) => sizes.find((s) => s.id === id)).filter(Boolean) as CatalogSize[];
  const [newSize, setNewSize] = useState("");
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<View>(readView);
  const [perSizePrice, setPerSizePrice] = useState(() => Object.keys(draft.priceBySize).length > 0);
  const basePrice = parsePrice(draft.price);
  const auto = useMemo(() => autoSkus(draft, sizes), [draft, sizes]);
  const edit = draft.edit;

  const chooseView = (v: View) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* storage blocked */ } };
  const toggleSize = (id: string) =>
    update((d) => ({ ...d, sizeIds: d.sizeIds.includes(id) ? d.sizeIds.filter((x) => x !== id) : sortBy(chips, [...d.sizeIds, id]) }));
  const applyPreset = (ids: string[]) => update((d) => ({ ...d, sizeIds: sortBy(chips, ids) }));
  const fillAll = () => update((d) => ({ ...d, stock: {} }));
  const setStock = (groupKey: string, sizeId: string, value: string) =>
    update((d) => ({ ...d, stock: { ...d.stock, [stockKey(groupKey, sizeId)]: digits(value) } }));
  const stepStock = (groupKey: string, sizeId: string, delta: number) =>
    update((d) => ({ ...d, stock: { ...d.stock, [stockKey(groupKey, sizeId)]: String(Math.max(0, stockOf(d, groupKey, sizeId) + delta)) } }));
  const setField = (field: "skus" | "priceBy" | "lowBy", key: string, value: string) =>
    update((d) => {
      const next = { ...d[field] };
      if (value === "") delete next[key];
      else next[key] = value;
      return { ...d, [field]: next };
    });

  const createSize = async () => {
    const name = newSize.trim();
    if (!name) return;
    const existing = sizes.find((s) => s.name.trim().toLowerCase() === name.toLowerCase());
    if (existing) { if (!draft.sizeIds.includes(existing.id)) toggleSize(existing.id); setNewSize(""); return; }
    setAdding(true);
    const created = await onCreateSize(name);
    setAdding(false);
    if (created) { update((d) => ({ ...d, sizeIds: [...d.sizeIds, created.id] })); setNewSize(""); }
  };

  const total = draft.groups.reduce((sum, g) => sum + sizesOf(draft, g.key).reduce((s, sid) => s + stockOf(draft, g.key, sid), 0), 0);
  const skuCount = madeCount(draft);
  const toggleFor = (groupKey: string, sizeId: string) => update((d) => setSizeFor(d, groupKey, sizeId, !hasSize(d, groupKey, sizeId)));
  const someOff = Object.values(draft.sizesOff ?? {}).some(Boolean);
  const bad = new Set(badSkus.map((s) => s.toUpperCase()));
  const finalSku = (key: string) => cleanSku(draft.skus[key] ?? "") || auto[key] || "";
  const counts = new Map<string, number>();
  for (const g of draft.groups) for (const s of selected) {
    if (!hasSize(draft, g.key, s.id)) continue;
    const k = finalSku(stockKey(g.key, s.id));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  return (
    <Section
      id="sizes"
      step={step}
      title={tr("المقاسات والكمية", "Sizes and quantity")}
      hint={tr("كل لون × مقاس هو SKU مستقل: له كود وسعر وكمية وتنبيه. الكود يُكتب تلقائياً ويمكن تغييره.", "Each colour × size is its own SKU: a code, price, quantity and alert. The code is written automatically and can be changed.")}
      error={error}
    >
      {presets.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/50">{tr("جاهز:", "Ready:")}</span>
          {presets.map((p) => (
            <Chip key={p.key} active={sameSet(p.sizeIds, draft.sizeIds)} onClick={() => applyPreset(p.sizeIds)}>{p.label}</Chip>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label={tr("المقاسات", "Sizes")}>
        {chips.map((s) => (
          <Chip key={s.id} active={draft.sizeIds.includes(s.id)} onClick={() => toggleSize(s.id)} className="min-w-[3rem] justify-center">{s.name}</Chip>
        ))}
        <div className="inline-flex items-center gap-1">
          <input className={cn(fieldCls, "h-9 w-28 rounded-full px-3")} placeholder={tr("مقاس جديد", "New size")} value={newSize} onChange={(e) => setNewSize(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void createSize(); } }} aria-label={tr("إضافة مقاس جديد", "Add a new size")} />
          {newSize.trim() && <button type="button" disabled={adding} onClick={() => void createSize()} className="h-9 rounded-full bg-accent-500/20 px-3 text-sm text-accent-200 hover:bg-accent-500/30">{adding ? "…" : tr("إضافة", "Add")}</button>}
        </div>
      </div>

      {selected.length > 0 && draft.groups.length > 0 && (
        <div className="mt-5">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl border border-white/[0.1] bg-white/[0.03] p-1" role="tablist" aria-label={tr("طريقة العرض", "View")}>
              <button type="button" role="tab" aria-selected={view === "skus"} onClick={() => chooseView("skus")} className={cn("h-8 rounded-lg px-3 text-sm", view === "skus" ? "bg-accent-500/25 text-white" : "text-white/60 hover:text-white")}>{tr("جدول SKU", "SKU table")}</button>
              <button type="button" role="tab" aria-selected={view === "grid"} onClick={() => chooseView("grid")} className={cn("h-8 rounded-lg px-3 text-sm", view === "grid" ? "bg-accent-500/25 text-white" : "text-white/60 hover:text-white")}>{tr("شبكة الكميات", "Quantity grid")}</button>
            </div>
            <label className="flex items-center gap-2 text-xs text-white/55">
              {edit ? tr("كمية المقاسات الجديدة", "Quantity for new sizes") : tr("الكمية لكل مقاس", "Quantity per size")}
              <input
                className={cn(fieldCls, "h-9 w-20 px-2 text-center")}
                inputMode="numeric"
                value={draft.defaultStock}
                onChange={(e) => update((d) => ({ ...d, defaultStock: digits(e.target.value) }))}
                aria-label={tr("الكمية لكل مقاس", "Quantity per size")}
              />
            </label>
            {!edit && <button type="button" onClick={fillAll} className="h-9 rounded-xl border border-white/[0.12] px-3 text-sm text-white/80 hover:bg-white/[0.06]">{tr("تطبيق على الكل", "Apply to all")}</button>}
            <span className="ms-auto text-xs text-white/50"><b className="text-white">{skuCount}</b> SKU · <b className="text-white">{total}</b> {tr("قطعة", "pcs")}</span>
          </div>

          {selected.length > 1 ? (
            <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.015] p-3" data-testid="sizes-per-colour">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-white">{tr("كل لون بأي مقاسات؟", "Which sizes for each colour?")}</span>
                {someOff ? (
                  <button type="button" onClick={() => update((d) => ({ ...d, sizesOff: {} }))} className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-accent-300 hover:bg-accent-500/10 sm:h-7 sm:px-2 sm:text-xs">
                    {tr("نفس المقاسات لكل الألوان", "Same sizes for every colour")}
                  </button>
                ) : (
                  <span className="text-[11px] text-white/40">{tr("كل الألوان بكل المقاسات. المقاس اللي مش موجود بلون معيّن بينشال من هون.", "Every colour in every size. Remove a size a colour doesn't come in.")}</span>
                )}
              </div>
              <ul className="space-y-2">
                {draft.groups.map((g, gi) => {
                  const mine = sizesOf(draft, g.key).length;
                  return (
                    <li key={g.key} className="flex flex-wrap items-center gap-2" data-testid="colour-sizes">
                      <span className="inline-flex min-w-[6rem] items-center gap-2 text-sm text-white/85"><Swatch hex={g.hex} size={14} />{g.name || tr(`لون ${gi + 1}`, "Colour {0}", [gi + 1])}</span>
                      <div className="flex flex-wrap gap-1.5" role="group" aria-label={tr(`مقاسات ${g.name || tr(`لون ${gi + 1}`, "Colour {0}", [gi + 1])}`, "Sizes of {0}", [g.name || tr(`لون ${gi + 1}`, "Colour {0}", [gi + 1])])}>
                        {selected.map((sz) => {
                          const on = hasSize(draft, g.key, sz.id);
                          return (
                            <button
                              key={sz.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggleFor(g.key, sz.id)}
                              className={cn(
                                "h-8 min-w-[2.75rem] rounded-full border px-2.5 text-xs transition",
                                on ? "border-accent-400/60 bg-accent-500/20 text-white" : "border-dashed border-white/[0.14] text-white/35 line-through hover:text-white/60",
                              )}
                              title={on ? tr(`«${g.name}» ما بييجي بمقاس ${sz.name}؟ الضغط بيشيله`, "“{0}” doesn't come in size {1}? Click to remove it", [g.name, sz.name]) : tr(`إضافة مقاس ${sz.name} لـ«${g.name}»`, "Add size {0} to “{1}”", [sz.name, g.name])}
                            >
                              {sz.name}
                            </button>
                          );
                        })}
                      </div>
                      {!mine ? <span className="text-[11px] text-red-300">{tr("لازم مقاس واحد على الأقل", "At least one size is needed")}</span> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {view === "skus" ? (
            <div className="space-y-3" data-testid="sku-table">
              {draft.groups.map((g, gi) => {
                const colourTotal = sizesOf(draft, g.key).reduce((s, sid) => s + stockOf(draft, g.key, sid), 0);
                const mineSizes = selected.filter((sz) => hasSize(draft, g.key, sz.id));
                return (
                  <div key={g.key} className={cn("rounded-xl border border-white/[0.08] bg-white/[0.015]", g.hidden && "opacity-70")}>
                    <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-3 py-2 text-sm">
                      <Swatch hex={g.hex} size={16} />
                      <b className="text-white">{g.name || tr(`لون ${gi + 1}`, "Colour {0}", [gi + 1])}</b>
                      {g.boxLabel ? <span className="text-xs text-white/45">({g.boxLabel})</span> : null}
                      {g.hidden ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-200">{tr("مخفي من المتجر", "Hidden from the store")}</span> : null}
                      <span className="ms-auto text-xs text-white/45">{colourTotal} {tr("قطعة", "pcs")}</span>
                      {edit && g.itemId ? (
                        <button
                          type="button"
                          onClick={() => update((d) => ({ ...d, groups: d.groups.map((x) => (x.key === g.key ? { ...x, hidden: !x.hidden } : x)) }))}
                          className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-white/55 hover:bg-white/[0.06] hover:text-white sm:h-7 sm:px-2 sm:text-xs"
                          title={tr("اللون المخفي لا يظهر في المتجر لكن يبقى بكمياته وطلباته", "A hidden colour doesn't show in the store but keeps its quantities and orders")}
                        >
                          {g.hidden ? tr("إظهار في المتجر", "Show in the store") : tr("إخفاء", "Hide")}
                        </button>
                      ) : null}
                    </div>
                    <div className="hidden grid-cols-[64px_minmax(150px,1.6fr)_104px_128px_76px_64px] gap-2 px-3 pt-2 text-[11px] text-white/40 sm:grid">
                      <span>{tr("المقاس", "Size")}</span><span>SKU</span><span>{tr("السعر", "Price")}</span><span className="text-center">{tr("الكمية", "Quantity")}</span><span className="text-center">{tr("تنبيه عند", "Alert at")}</span><span />
                    </div>
                    {!mineSizes.length ? <p className="px-3 py-3 text-xs text-red-300">{tr("ما في مقاسات لهاللون: المقاس بيتختار من «كل لون بأي مقاسات؟».", "No sizes for this colour: pick one in “Which sizes for each colour?”.")}</p> : null}
                    <ul className="divide-y divide-white/[0.05]">
                      {mineSizes.map((s) => {
                        const key = stockKey(g.key, s.id);
                        const qty = stockOf(draft, g.key, s.id);
                        const low = lowOf(draft, g.key, s.id);
                        const sku = finalSku(key);
                        const wrong = bad.has(sku.toUpperCase()) || (counts.get(sku) ?? 0) > 1;
                        const loaded = edit?.loadedStock[key];
                        const isNew = Boolean(edit) && !edit?.variantIds[key];
                        return (
                          <li key={s.id} className="grid grid-cols-[76px_minmax(0,1fr)_60px] items-center gap-2 px-3 py-2.5 sm:grid-cols-[64px_minmax(150px,1.6fr)_104px_128px_76px_64px]" data-testid="sku-row">
                            <span className="text-sm font-semibold text-white">
                              {s.name}
                              {isNew ? <span className="ms-1 align-middle text-[10px] font-normal text-emerald-300">{tr("جديد", "New")}</span> : null}
                            </span>
                            <input
                              dir="ltr"
                              className={cn(fieldCls, "col-span-2 h-9 px-2 font-mono text-[13px] tracking-wide sm:col-span-1", wrong && "border-red-500/60 ring-1 ring-red-500/30")}
                              value={draft.skus[key] ?? ""}
                              placeholder={auto[key]}
                              onChange={(e) => setField("skus", key, e.target.value.toUpperCase())}
                              onBlur={(e) => { const v = cleanSku(e.target.value); setField("skus", key, v && v !== auto[key] ? v : edit?.variantIds[key] ? v : ""); }}
                              aria-label={tr(`SKU ${g.name} مقاس ${s.name}`, "SKU {0} size {1}", [g.name, s.name])}
                              aria-invalid={wrong || undefined}
                              title={wrong ? tr("هذا الكود مكرر أو مستخدم في منتج آخر", "This code is repeated or used by another product") : tr("الفارغ بياخد الكود التلقائي", "Leave it empty for the automatic code")}
                            />
                            <label className="relative">
                              <span className="sr-only">{tr("السعر", "Price")}</span>
                              <input
                                className={cn(fieldCls, "h-9 ps-7 pe-2 text-center")}
                                inputMode="decimal"
                                value={draft.priceBy[key] ?? ""}
                                placeholder={String(priceOf({ ...draft, priceBy: {} }, g.key, s.id) || "")}
                                onChange={(e) => setField("priceBy", key, decimal(e.target.value))}
                                aria-label={tr(`سعر ${g.name} مقاس ${s.name}`, "Price {0} size {1}", [g.name, s.name])}
                              />
                              <span className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-xs text-white/35">{currencySign()}</span>
                            </label>
                            <div className="flex items-center justify-center gap-1">
                              <div className="inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02]">
                                <button type="button" tabIndex={-1} onClick={() => stepStock(g.key, s.id, -1)} className="h-9 w-8 text-white/50 hover:text-white" aria-label={tr("إنقاص", "Less")}>−</button>
                                <input
                                  className="h-9 w-12 bg-transparent text-center text-sm text-white focus:outline-none"
                                  inputMode="numeric"
                                  value={draft.stock[key] !== undefined ? draft.stock[key] : draft.defaultStock}
                                  onChange={(e) => setStock(g.key, s.id, e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  aria-label={tr(`كمية ${g.name} مقاس ${s.name}`, "Quantity {0} size {1}", [g.name, s.name])}
                                />
                                <button type="button" tabIndex={-1} onClick={() => stepStock(g.key, s.id, 1)} className="h-9 w-8 text-white/50 hover:text-white" aria-label={tr("زيادة", "More")}>+</button>
                              </div>
                            </div>
                            <input
                              className={cn(fieldCls, "h-9 px-1 text-center")}
                              inputMode="numeric"
                              value={draft.lowBy[key] ?? ""}
                              placeholder={draft.lowStock || "0"}
                              onChange={(e) => setField("lowBy", key, digits(e.target.value))}
                              aria-label={tr(`تنبيه ${g.name} مقاس ${s.name}`, "Alert {0} size {1}", [g.name, s.name])}
                              title={tr("تنبيه لما تبقى هالكمية أو أقل", "Alert me when this many or fewer are left")}
                            />
                            <span className="col-span-3 text-start text-[11px] sm:col-span-1 sm:text-center">
                              {qty <= 0 ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-red-300">{tr("نفد", "Sold out")}</span>
                                : low > 0 && qty <= low ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-200">{tr("قليل", "Low")}</span>
                                : <span className="text-white/35">{tr("متوفر", "In stock")}</span>}
                              {loaded !== undefined && loaded !== qty ? <span className="mt-0.5 block text-white/40">{tr("كان", "was")} {loaded}</span> : null}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
              <p className="text-[11px] leading-5 text-white/40">
                {tr("الحقول الفارغة تأخذ القيمة الرمادية: الكود التلقائي، سعر المنتج، وتنبيه المخزون العام (", "Empty fields take the grey value: the automatic code, the product price, and the general stock alert (")}{draft.lowStock || 0}).
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full min-w-[420px] border-collapse text-sm" data-testid="stock-grid">
                <thead>
                  <tr className="bg-white/[0.03] text-xs text-white/55">
                    <th className="sticky start-0 z-10 bg-surface-925 px-3 py-2 text-start font-medium">{tr("اللون", "Colour")}</th>
                    {selected.map((s) => <th key={s.id} className="px-2 py-2 text-center font-medium">{s.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {draft.groups.map((g, gi) => (
                    <tr key={g.key} className="border-t border-white/[0.06]">
                      <td className="sticky start-0 z-10 bg-surface-925 px-3 py-2">
                        <span className="inline-flex items-center gap-2 whitespace-nowrap"><Swatch hex={g.hex} size={14} />{g.name || tr(`لون ${gi + 1}`, "Colour {0}", [gi + 1])}</span>
                      </td>
                      {selected.map((s) => {
                        const explicit = draft.stock[stockKey(g.key, s.id)] !== undefined;
                        if (!hasSize(draft, g.key, s.id)) {
                          return (
                            <td key={s.id} className="px-1.5 py-1.5 text-center">
                              <button type="button" onClick={() => toggleFor(g.key, s.id)} className="h-8 w-[5.25rem] rounded-lg border border-dashed border-white/[0.12] text-xs text-white/35 hover:text-white/70" title={tr(`إضافة مقاس ${s.name} لـ«${g.name}»`, "Add size {0} to “{1}”", [s.name, g.name])} aria-label={tr(`${g.name || tr(`لون ${gi + 1}`, "Colour {0}", [gi + 1])} مش متوفر بمقاس ${s.name}`, "{0} isn't available in size {1}", [g.name || tr(`لون ${gi + 1}`, "Colour {0}", [gi + 1]), s.name])}>
                                —
                              </button>
                            </td>
                          );
                        }
                        return (
                          <td key={s.id} className="px-1.5 py-1.5 text-center">
                            <div className="inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02]">
                              <button type="button" tabIndex={-1} onClick={() => stepStock(g.key, s.id, -1)} className="h-8 w-7 text-white/50 hover:text-white" aria-label={tr("إنقاص", "Less")}>−</button>
                              <input
                                className={cn("h-8 w-10 bg-transparent text-center text-sm focus:outline-none", explicit ? "text-white" : "text-white/55")}
                                inputMode="numeric"
                                value={explicit ? draft.stock[stockKey(g.key, s.id)] : draft.defaultStock}
                                onChange={(e) => setStock(g.key, s.id, e.target.value)}
                                onFocus={(e) => e.target.select()}
                                aria-label={tr(`كمية ${g.name || tr(`لون ${gi + 1}`, "Colour {0}", [gi + 1])} مقاس ${s.name}`, "Quantity {0} size {1}", [g.name || tr(`لون ${gi + 1}`, "Colour {0}", [gi + 1]), s.name])}
                              />
                              <button type="button" tabIndex={-1} onClick={() => stepStock(g.key, s.id, 1)} className="h-8 w-7 text-white/50 hover:text-white" aria-label={tr("زيادة", "More")}>+</button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4">
            <Toggle checked={perSizePrice} onChange={(v) => { setPerSizePrice(v); if (!v) update((d) => ({ ...d, priceBySize: {} })); }} label={tr("بعض المقاسات سعرها مختلف (لكل الألوان)", "Some sizes have a different price (for every colour)")} />
            {perSizePrice && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-1.5 text-sm text-white/70">
                    {s.name}
                    <input
                      className="h-8 w-20 rounded-lg border border-white/[0.08] bg-surface-925 px-2 text-center text-white focus:outline-none"
                      inputMode="decimal"
                      placeholder={basePrice != null ? String(basePrice) : currencySign()}
                      value={draft.priceBySize[s.id] ?? ""}
                      onChange={(e) => update((d) => ({ ...d, priceBySize: { ...d.priceBySize, [s.id]: decimal(e.target.value) } }))}
                      aria-label={tr(`سعر مقاس ${s.name}`, "Price of size {0}", [s.name])}
                    />
                  </label>
                ))}
                <span className="self-center text-xs text-white/45">{tr("الفارغ يأخذ السعر الأساسي", "Empty takes the base price")} {formatMoney(basePrice)}</span>
              </div>
            )}
          </div>
        </div>
      )}
      {selected.length > 0 && draft.groups.length === 0 && (
        <p className="mt-4 rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-white/55">{tr("الصور أو اللون بالخطوة ١ بيطلّعوا جدول المقاسات.", "Add photos or a colour in step 1 to see the sizes table.")}</p>
      )}
    </Section>
  );
}

function sortBy(list: CatalogSize[], ids: string[]) {
  const order = new Map(list.map((s, i) => [s.id, i]));
  return [...new Set(ids)].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
}

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}
