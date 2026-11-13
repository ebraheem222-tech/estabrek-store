/**
 * Which products a products block shows, and which categories a categories block shows. The shop and the API have
 * always taken "the products of a category", "these products" and "only these categories"; the editor only offered
 * the newest and the best sellers, and every category. The store's own categories and products are read from the
 * catalog (the same lists the catalog pages use).
 */
import { useState } from "react";
import { useCategories, useProducts } from "../hooks/useCatalog";
import { Choice } from "./StudioTreePanels";
import { say } from "./say";

type Props = { p: Record<string, unknown>; busy: boolean; setProps: (patch: Record<string, unknown>) => void };

const control = "mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
const hint = "text-[10px] leading-4 text-white/40";
/** A category page's design shows that page's own category (the shop's storeBind.ts). */
const CURRENT = "current";
export const MAX_PICKED = 48;
export const MAX_CATEGORIES = 24;

const idsOf = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max) : []);

/** A products block's source: the newest, the best sellers, a category's, or picked one by one (in their order). */
export function ProductsSourceFields({ p, busy, setProps }: Props) {
  const source = ["new", "best", "category", "picked"].includes(String(p.source)) ? String(p.source) : "new";
  const categories = useCategories();
  const products = useProducts("active");
  const [q, setQ] = useState("");
  const picked = idsOf(p.productIds, MAX_PICKED);
  const titleOf = (id: string) => products.data?.find((x) => x.id === id)?.title ?? id;
  const words = q.trim().toLowerCase();
  const found = (products.data ?? []).filter((x) => !picked.includes(x.id) && (!words || x.title.toLowerCase().includes(words))).slice(0, 12);
  const pick = (ids: string[]) => setProps({ source: "picked", productIds: ids.length ? ids : undefined, ...(ids.length ? { limit: ids.length } : {}) });
  return (
    <>
      <Choice
        label={say("أي منتجات|Which products|אילו מוצרים")} value={source} busy={busy} testId="studio-products-source"
        options={[
          ["new", say("الأحدث|Newest|החדשים")], ["best", say("الأكثر مبيعاً|Best sellers|הנמכרים ביותר")],
          ["category", say("من قسم|From a category|מקטגוריה")], ["picked", say("أختارها أنا|Picked by hand|בבחירה ידנית")],
        ]}
        onPick={(v) => {
          if (v === "category") setProps({ source: v, categoryId: typeof p.categoryId === "string" && p.categoryId ? p.categoryId : categories.data?.[0]?.id });
          else setProps({ source: v });
        }}
      />
      {source === "category" ? (
        <label className="block text-[11px] text-white/55">
          {say("القسم|The category|הקטגוריה")}
          <select className={control} disabled={busy || !categories.data} value={typeof p.categoryId === "string" ? p.categoryId : ""} onChange={(e) => setProps({ categoryId: e.target.value || undefined })} data-testid="studio-products-category">
            <option value="">{categories.isLoading ? say("عم تتحمّل الأقسام…|Loading the categories…|טוען קטגוריות…") : say("اختاري قسم|Choose a category|בחרו קטגוריה")}</option>
            {p.categoryId === CURRENT ? <option value={CURRENT}>{say("قسم الصفحة نفسها (بتصميم صفحة القسم)|The page's own category (in a category page's design)|הקטגוריה של העמוד עצמו")}</option> : null}
            {(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {categories.isError ? <span className="mt-1 block text-amber-200/80">{say("ما تحمّلت الأقسام.|The categories didn't load.|הקטגוריות לא נטענו.")}</span> : null}
        </label>
      ) : null}
      {source === "picked" ? (
        <div className="space-y-2 rounded-lg bg-white/[0.03] p-2" data-testid="studio-products-picked">
          {picked.length ? (
            <ol className="space-y-1">
              {picked.map((id, i) => (
                <li key={id} className="flex items-center gap-1 text-xs" data-product={id}>
                  <span className="min-w-0 flex-1 truncate text-white/80">{i + 1}. {titleOf(id)}</span>
                  <button type="button" className={btn} disabled={busy || i === 0} onClick={() => pick(picked.map((x, k) => (k === i - 1 ? id : k === i ? picked[i - 1] : x)))} aria-label={say("قبل|Earlier|קודם")}>↑</button>
                  <button type="button" className={btn} disabled={busy} onClick={() => pick(picked.filter((x) => x !== id))} aria-label={say("شيل|Remove|הסרה")} data-testid="studio-products-unpick">✕</button>
                </li>
              ))}
            </ol>
          ) : <p className={hint}>{say("ما في منتجات مختارة لسا: دوّري تحت وكبّسي على المنتج.|No products picked yet: search below and press one.|עדיין לא נבחרו מוצרים: חפשו למטה ולחצו על מוצר.")}</p>}
          {picked.length < MAX_PICKED ? (
            <>
              <input type="search" className={control} value={q} onChange={(e) => setQ(e.target.value)} placeholder={say("دوّري على منتج بالاسم|Find a product by name|חיפוש מוצר לפי שם")} data-testid="studio-products-find" />
              <div className="flex flex-wrap gap-1">
                {found.map((x) => <button key={x.id} type="button" className={btn} disabled={busy} onClick={() => pick([...picked, x.id])} data-testid="studio-products-pick" data-product={x.id}>+ {x.title}</button>)}
              </div>
              {products.isLoading ? <p className={hint}>{say("عم تتحمّل المنتجات…|Loading the products…|טוען מוצרים…")}</p> : null}
              {products.isError ? <p className="text-[10px] text-amber-200/80">{say("ما تحمّلت المنتجات.|The products didn't load.|המוצרים לא נטענו.")}</p> : null}
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** A categories block: every category (the first ones), or only the ones ticked. */
export function CategoriesPickFields({ p, busy, setProps }: Props) {
  const categories = useCategories();
  const ids = idsOf(p.ids, MAX_CATEGORIES);
  const only = ids.length > 0;
  const [open, setOpen] = useState(only);
  const flip = (id: string, on: boolean) => {
    const next = on ? [...ids, id].slice(0, MAX_CATEGORIES) : ids.filter((x) => x !== id);
    setProps({ ids: next.length ? next : undefined });
  };
  return (
    <div className="space-y-2">
      <Choice
        label={say("أي أقسام|Which categories|אילו קטגוריות")} value={open || only ? "some" : "all"} busy={busy} testId="studio-categories-which"
        options={[["all", say("الكل|All of them|כולן")], ["some", say("أختارها أنا|Picked by hand|בבחירה ידנית")]]}
        onPick={(v) => { setOpen(v === "some"); if (v === "all") setProps({ ids: undefined }); }}
      />
      {open || only ? (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-white/[0.03] p-2" data-testid="studio-categories-list">
          {(categories.data ?? []).map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-xs text-white/80">
              <input type="checkbox" disabled={busy || (!ids.includes(c.id) && ids.length >= MAX_CATEGORIES)} checked={ids.includes(c.id)} onChange={(e) => flip(c.id, e.target.checked)} data-category={c.id} />
              <span className="min-w-0 truncate">{c.name}</span>
            </label>
          ))}
          {categories.isLoading ? <p className={hint}>{say("عم تتحمّل الأقسام…|Loading the categories…|טוען קטגוריות…")}</p> : null}
          {categories.isError ? <p className="text-[10px] text-amber-200/80">{say("ما تحمّلت الأقسام.|The categories didn't load.|הקטגוריות לא נטענו.")}</p> : null}
          {!only && categories.data?.length ? <p className={hint}>{say("ما في إشي مختار: بيبيّنوا كلهم.|Nothing ticked: all of them show.|לא סומן דבר: כולן מוצגות.")}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
