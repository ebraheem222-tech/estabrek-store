// Step 4: sizes from ready sets, then one small grid of quantities
// (colours × sizes) with "same quantity for all".
import React, { useMemo, useState } from "react";
import type { CatalogSize } from "../../../api/catalog.api";
import { cn } from "../../../components/ui/cn";
import { formatShekel, parsePrice, sizePresets } from "../../../lib/productComposer";
import { stockKey, stockOf, type ComposerDraft } from "./composerModel";
import { Chip, Section, Swatch, Toggle } from "./ui";
import { fieldCls } from "./styles";

type Props = {
  draft: ComposerDraft;
  update: (fn: (d: ComposerDraft) => ComposerDraft) => void;
  sizes: CatalogSize[];
  onCreateSize: (name: string) => Promise<CatalogSize | null>;
  error?: string;
};

export function SizesStockSection({ draft, update, sizes, onCreateSize, error }: Props) {
  const active = useMemo(() => [...sizes].filter((s) => s.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [sizes]);
  const presets = useMemo(() => sizePresets(active), [active]);
  const selected = draft.sizeIds.map((id) => active.find((s) => s.id === id) ?? sizes.find((s) => s.id === id)).filter(Boolean) as CatalogSize[];
  const [newSize, setNewSize] = useState("");
  const [adding, setAdding] = useState(false);
  const [perSizePrice, setPerSizePrice] = useState(() => Object.keys(draft.priceBySize).length > 0);
  const basePrice = parsePrice(draft.price);

  const toggleSize = (id: string) =>
    update((d) => ({ ...d, sizeIds: d.sizeIds.includes(id) ? d.sizeIds.filter((x) => x !== id) : sortBy(active, [...d.sizeIds, id]) }));
  const applyPreset = (ids: string[]) => update((d) => ({ ...d, sizeIds: sortBy(active, ids) }));
  const fillAll = () => update((d) => ({ ...d, stock: {} }));
  const setStock = (groupKey: string, sizeId: string, value: string) =>
    update((d) => ({ ...d, stock: { ...d.stock, [stockKey(groupKey, sizeId)]: value.replace(/[^\d٠-٩]/g, "").replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))) } }));
  const step = (groupKey: string, sizeId: string, delta: number) =>
    update((d) => ({ ...d, stock: { ...d.stock, [stockKey(groupKey, sizeId)]: String(Math.max(0, stockOf(d, groupKey, sizeId) + delta)) } }));

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

  const total = draft.groups.reduce((sum, g) => sum + draft.sizeIds.reduce((s, sid) => s + stockOf(draft, g.key, sid), 0), 0);

  return (
    <Section id="sizes" step={4} title="المقاسات والكمية" hint="اختاري مجموعة جاهزة أو اضغطي على المقاسات. الكمية تُكتب مرة واحدة للكل، وتعدّلين ما يختلف فقط." error={error}>
      {presets.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/50">جاهز:</span>
          {presets.map((p) => (
            <Chip key={p.key} active={sameSet(p.sizeIds, draft.sizeIds)} onClick={() => applyPreset(p.sizeIds)}>{p.label}</Chip>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label="المقاسات">
        {active.map((s) => (
          <Chip key={s.id} active={draft.sizeIds.includes(s.id)} onClick={() => toggleSize(s.id)} className="min-w-[3rem] justify-center">{s.name}</Chip>
        ))}
        <div className="inline-flex items-center gap-1">
          <input className={cn(fieldCls, "h-9 w-28 rounded-full px-3")} placeholder="مقاس جديد" value={newSize} onChange={(e) => setNewSize(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void createSize(); } }} aria-label="إضافة مقاس جديد" />
          {newSize.trim() && <button type="button" disabled={adding} onClick={() => void createSize()} className="h-9 rounded-full bg-accent-500/20 px-3 text-sm text-accent-200 hover:bg-accent-500/30">{adding ? "…" : "إضافة"}</button>}
        </div>
      </div>

      {selected.length > 0 && draft.groups.length > 0 && (
        <div className="mt-5">
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="text-sm text-white/70">
              <span className="mb-1 block text-xs text-white/50">الكمية لكل مقاس</span>
              <input
                className={cn(fieldCls, "h-10 w-28 text-center")}
                inputMode="numeric"
                value={draft.defaultStock}
                onChange={(e) => update((d) => ({ ...d, defaultStock: e.target.value.replace(/[^\d]/g, "") }))}
                aria-label="الكمية لكل مقاس"
              />
            </label>
            <button type="button" onClick={fillAll} className="h-10 rounded-xl border border-white/[0.12] px-3 text-sm text-white/80 hover:bg-white/[0.06]">تطبيق على الكل</button>
            <span className="ms-auto text-xs text-white/50">المجموع: <b className="text-white">{total}</b> قطعة</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full min-w-[420px] border-collapse text-sm" data-testid="stock-grid">
              <thead>
                <tr className="bg-white/[0.03] text-xs text-white/55">
                  <th className="sticky right-0 z-10 bg-surface-925 px-3 py-2 text-right font-medium">اللون</th>
                  {selected.map((s) => <th key={s.id} className="px-2 py-2 text-center font-medium">{s.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {draft.groups.map((g, gi) => (
                  <tr key={g.key} className="border-t border-white/[0.06]">
                    <td className="sticky right-0 z-10 bg-surface-925 px-3 py-2">
                      <span className="inline-flex items-center gap-2 whitespace-nowrap"><Swatch hex={g.hex} size={14} />{g.name || `لون ${gi + 1}`}</span>
                    </td>
                    {selected.map((s) => {
                      const explicit = draft.stock[stockKey(g.key, s.id)] !== undefined;
                      return (
                        <td key={s.id} className="px-1.5 py-1.5 text-center">
                          <div className="inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02]">
                            <button type="button" tabIndex={-1} onClick={() => step(g.key, s.id, -1)} className="h-8 w-7 text-white/50 hover:text-white" aria-label="إنقاص">−</button>
                            <input
                              className={cn("h-8 w-10 bg-transparent text-center text-sm focus:outline-none", explicit ? "text-white" : "text-white/55")}
                              inputMode="numeric"
                              value={explicit ? draft.stock[stockKey(g.key, s.id)] : draft.defaultStock}
                              onChange={(e) => setStock(g.key, s.id, e.target.value)}
                              onFocus={(e) => e.target.select()}
                              aria-label={`كمية ${g.name || `لون ${gi + 1}`} مقاس ${s.name}`}
                            />
                            <button type="button" tabIndex={-1} onClick={() => step(g.key, s.id, 1)} className="h-8 w-7 text-white/50 hover:text-white" aria-label="زيادة">+</button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Toggle checked={perSizePrice} onChange={(v) => { setPerSizePrice(v); if (!v) update((d) => ({ ...d, priceBySize: {} })); }} label="بعض المقاسات سعرها مختلف" />
            {perSizePrice && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-1.5 text-sm text-white/70">
                    {s.name}
                    <input
                      className="h-8 w-20 rounded-lg border border-white/[0.08] bg-surface-925 px-2 text-center text-white focus:outline-none"
                      inputMode="decimal"
                      placeholder={basePrice != null ? String(basePrice) : "₪"}
                      value={draft.priceBySize[s.id] ?? ""}
                      onChange={(e) => update((d) => ({ ...d, priceBySize: { ...d.priceBySize, [s.id]: e.target.value } }))}
                      aria-label={`سعر مقاس ${s.name}`}
                    />
                  </label>
                ))}
                <span className="self-center text-xs text-white/45">الفارغ يأخذ السعر الأساسي {formatShekel(basePrice)}</span>
              </div>
            )}
          </div>
        </div>
      )}
      {selected.length > 0 && draft.groups.length === 0 && (
        <p className="mt-4 rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-white/55">أضيفي صوراً أو لوناً في الخطوة ١ لتظهر جدول الكميات.</p>
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
