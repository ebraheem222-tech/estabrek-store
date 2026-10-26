/**
 * The page builder's «منتج 360°» element: which product's 360° view it shows (products
 * with one come first: their scans are linked to them, admin → المنتج → عرض 360°),
 * which colour (that colour's own view, else the one for every colour), whether it turns
 * by itself, and the words screen readers hear.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import * as CatalogAPI from "../api/catalog.api";
import { listScans } from "../api/scans.api";
import type { Lang } from "../lib/lang";
import { tr } from "../lib/words";
import { Field } from "./StudioPanels";

type Ops = (label: string, ops: PageDraftOp[]) => void;
const control = "mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";

export function Product360Panel({ node, lang, busy, onOps }: { node: PageTreeNode; lang: Lang; busy: boolean; onOps: Ops }) {
  const p = (node.props ?? {}) as Record<string, unknown>;
  const productId = typeof p.productId === "string" ? p.productId : "";
  const [text, setText] = useState("");
  const products = useQuery({ queryKey: ["products-pick"], queryFn: () => CatalogAPI.listProducts("all"), staleTime: 60_000 });
  const scans = useQuery({ queryKey: ["media", "scans"], queryFn: () => listScans() });
  const full = useQuery({ queryKey: ["product-full", productId], queryFn: () => CatalogAPI.getProductFull(productId), enabled: Boolean(productId) });
  const spun = useMemo(() => new Set((scans.data?.items ?? []).map((s) => s.manifest?.product?.id).filter(Boolean) as string[]), [scans.data]);
  const list = useMemo(() => {
    const q = text.trim().toLowerCase();
    return (products.data ?? [])
      .filter((x) => !q || x.title.toLowerCase().includes(q))
      .sort((a, b) => Number(spun.has(b.id)) - Number(spun.has(a.id)))
      .slice(0, 30);
  }, [products.data, text, spun]);
  const set = (label: string, patch: Record<string, unknown>) => onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...p, ...patch } }]);
  const chosen = (products.data ?? []).find((x) => x.id === productId);
  const items = ((full.data as { items?: Array<{ id: string; colorName?: string | null }> } | undefined)?.items ?? []).filter((it) => it.id);
  return (
    <div className="space-y-3 rounded-xl border border-white/[0.08] p-3" data-testid="studio-product360">
      <div className="text-xs font-medium text-white/70">{tr("منتج 360°", "Product 360°")}</div>
      {chosen ? <div className="text-xs text-white/85">{chosen.title}{spun.has(chosen.id) ? "" : ` · ${tr("ما إله عرض 360° لسا", "has no 360° view yet")}`}</div> : <p className="text-[11px] text-amber-200/80">{tr("اختار المنتج اللي بدك تلفّه.", "Choose the product to turn.")}</p>}
      <label className="block text-[11px] text-white/55">
        {tr("دوّر على منتج", "Find a product")}
        <input className={control} value={text} onChange={(e) => setText(e.target.value)} placeholder={tr("اسم المنتج", "Product name")} data-testid="studio-product360-search" />
      </label>
      <ul className="max-h-48 space-y-1 overflow-y-auto" data-testid="studio-product360-list">
        {list.map((x) => (
          <li key={x.id}>
            <button type="button" disabled={busy} onClick={() => set(tr("منتج 360°", "Product 360°"), { productId: x.id, itemId: undefined })} aria-pressed={x.id === productId} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-start text-xs ${x.id === productId ? "bg-accent-500/25 text-white" : "text-white/75 hover:bg-white/[0.05]"} disabled:opacity-40`} data-product={x.id}>
              <span className="min-w-0 flex-1 truncate">{x.title}</span>
              {spun.has(x.id) ? <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 text-[10px] text-emerald-200">360°</span> : null}
            </button>
          </li>
        ))}
      </ul>
      {productId && items.length > 1 ? (
        <label className="block text-[11px] text-white/55">
          {tr("لأي لون", "For which colour")}
          <select className={control} disabled={busy} value={typeof p.itemId === "string" ? p.itemId : ""} onChange={(e) => set(tr("اللون", "Colour"), { itemId: e.target.value || undefined })}>
            <option value="">{tr("كل الألوان", "Every colour")}</option>
            {items.map((it) => <option key={it.id} value={it.id}>{it.colorName || it.id}</option>)}
          </select>
        </label>
      ) : null}
      <label className="flex items-center justify-between gap-2 text-xs">
        <span className="text-white/75">{tr("بيلف لحاله لحد ما حدا يلمسه", "Turns by itself until it's touched")}</span>
        <input type="checkbox" disabled={busy} checked={p.auto !== false} onChange={(e) => set(tr("تعديل", "Edit"), { auto: e.target.checked ? undefined : false })} />
      </label>
      <Field label={tr("وصفه لقارئ الشاشة (فاضي = اسم المنتج)", "Its description for screen readers (empty = the product's name)")} value={typeof p.label === "object" && p.label ? String((p.label as Record<string, string>)[lang] ?? "") : ""} onSave={(v) => {
        const words = { ...((p.label ?? {}) as Record<string, string>) };
        if (v.trim()) words[lang] = v;
        else delete words[lang];
        set(tr("تعديل", "Edit"), { label: Object.keys(words).length ? words : undefined });
      }} />
      {productId ? <Link to={`/admin/catalog/products/${productId}`} className="block text-[11px] text-accent-300 hover:underline">{tr("عرض 360° للمنتج: عمل أو تغيير", "The product's 360° view: make or change it")}</Link> : null}
    </div>
  );
}
