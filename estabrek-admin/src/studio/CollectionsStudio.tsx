/**
 * Collections (W3) in the editor: a list's settings, and connecting an element's words, picture
 * or link to a field of the collection it's shown for (on the collection's item page, or inside
 * a list's card). Backend lib/collectionTree.ts fills them on the shop.
 */
import { useQuery } from "@tanstack/react-query";
import { listCollections, type Collection, type Local } from "../api/collections.api";
import type { PageTreeNode } from "../api/pages.api";
import { BINDABLE, CATEGORY_COLLECTION, PRODUCT_COLLECTION, PROP_FIELDS } from "../features/collections/collectionForms";
import type { Lang } from "../lib/lang";
import { say } from "./say";
import type { TreeIndex } from "./treeIndex";

export const useCollections = () => useQuery({ queryKey: ["collections"], queryFn: listCollections, staleTime: 30_000, retry: false });

const box = "space-y-2 rounded-xl border border-white/[0.08] p-3";
const control = "w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";
const words = (v: Local | undefined, lang: Lang) => v?.[lang] || v?.ar || v?.en || v?.he || "";
const PROP_NAME: Record<string, string> = { text: "الكلام|The words|הטקסט", label: "كلام الزر|The button's words|טקסט הכפתור", href: "الرابط|The link|הקישור", src: "الصورة|The picture|התמונה", alt: "وصف الصورة|Picture description|תיאור התמונה" };

/**
 * The collection an element is shown for: the one whose item page this is, or the one of the
 * list around it (the nearest); null when there's none.
 */
export function bindContext(index: TreeIndex, nodeId: string, page: { id: string; kind?: string }, collections: Collection[] | undefined): Collection | null {
  if (page.kind === "productTemplate") return PRODUCT_COLLECTION;
  if (page.kind === "categoryTemplate") return CATEGORY_COLLECTION;
  if (!collections?.length) return null;
  for (let at: string | null = index.nodes.get(nodeId)?.parentId ?? null; at; at = index.nodes.get(at)?.parentId ?? null) {
    const n = index.nodes.get(at)?.node;
    if (n?.type === "collectionList") return collections.find((c) => c.id === n.props.collectionId) ?? null;
  }
  return page.kind === "collectionTemplate" ? collections.find((c) => c.templateId === page.id) ?? null : null;
}

/** A list's settings: which collection, its order, how many, how many across, and its words when empty. */
export function CollectionListPanel({ node, collections, lang, busy, onProps }: { node: PageTreeNode; collections: Collection[] | undefined; lang: Lang; busy: boolean; onProps: (props: Record<string, unknown>) => void }) {
  const p = node.props as Record<string, any>;
  const set = (patch: Record<string, unknown>) => onProps({ ...p, ...patch });
  return (
    <div className={box} data-testid="collection-list-panel">
      <div className="text-xs font-medium text-white/85">▦ {say("قائمة من مجموعة|A collection list|רשימה מאוסף")}</div>
      <label className="block text-[11px] text-white/55">{say("المجموعة|Collection|אוסף")}
        <select className={control} disabled={busy} value={String(p.collectionId ?? "")} onChange={(e) => set({ collectionId: e.target.value })} data-testid="list-collection">
          {collections?.map((c) => <option key={c.id} value={c.id}>{words(c.name, lang) || c.slug}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="block text-[11px] text-white/55">{say("الترتيب|Order|סדר")}
          <select className={control} disabled={busy} value={String(p.sort ?? "newest")} onChange={(e) => set({ sort: e.target.value })} data-testid="list-sort">
            <option value="newest">{say("الأحدث|Newest|החדש ביותר")}</option><option value="oldest">{say("الأقدم|Oldest|הישן ביותר")}</option><option value="order">{say("ترتيبي|My order|הסדר שלי")}</option><option value="title">{say("أبجدي|A–Z|א–ת")}</option>
          </select>
        </label>
        <label className="block text-[11px] text-white/55">{say("كم واحد|How many|כמה")}
          <input type="number" className={control} min={1} max={48} disabled={busy} defaultValue={Number(p.limit ?? 6)} key={`limit:${p.limit}`} onBlur={(e) => { const n = Math.max(1, Math.min(48, Math.round(Number(e.target.value) || 6))); if (n !== p.limit) set({ limit: n }); }} data-testid="list-limit" />
        </label>
        <label className="block text-[11px] text-white/55">{say("بالعرض|Across|לרוחב")}
          <input type="number" className={control} min={1} max={6} disabled={busy} defaultValue={Number(p.columns ?? 3)} key={`cols:${p.columns}`} onBlur={(e) => { const n = Math.max(1, Math.min(6, Math.round(Number(e.target.value) || 3))); if (n !== p.columns) set({ columns: n }); }} data-testid="list-columns" />
        </label>
      </div>
      <label className="block text-[11px] text-white/55">{say("لما ما في عناصر|When there are no items|כשאין פריטים")}
        <input className={control} disabled={busy} defaultValue={words(p.empty, lang)} key={`empty:${words(p.empty, lang)}`} onBlur={(e) => { const v = e.target.value.trim(); const next = { ...(p.empty ?? {}), [lang]: v }; if (!v) delete next[lang]; set({ empty: Object.keys(next).length ? next : undefined }); }} data-testid="list-empty" />
      </label>
      <p className="text-[11px] leading-5 text-white/45">{say("صمّم الكرت اللي جوّا مرة: بيتكرّر لكل عنصر. العناصر المربوطة (◆) بتاخد قيمه.|Design the card inside once: it repeats for each item. Connected elements (◆) take its values.|עצב את הכרטיס בפנים פעם אחת: הוא חוזר לכל פריט. אובייקטים מחוברים (◆) מקבלים את ערכיו.")}</p>
    </div>
  );
}

/** Connecting an element's props to the collection's fields. */
export function BindPanel({ node, collection, lang, busy, onProps }: { node: PageTreeNode; collection: Collection; lang: Lang; busy: boolean; onProps: (props: Record<string, unknown>) => void }) {
  const props = BINDABLE[node.type] ?? [];
  if (!props.length) return null;
  const bind = (node.props.bind ?? {}) as Record<string, string>;
  const set = (prop: string, ref: string) => {
    const next = { ...bind };
    if (ref) next[prop] = ref; else delete next[prop];
    onProps({ ...node.props, bind: Object.keys(next).length ? next : undefined });
  };
  return (
    <div className={box} data-testid="bind-panel">
      <div className="text-xs font-medium text-white/85">◆ {say(`ربط بحقل من «${words(collection.name, lang) || collection.slug}»|Connect to a field of “${words(collection.name, lang) || collection.slug}”|חיבור לשדה של ״${words(collection.name, lang) || collection.slug}״`)}</div>
      {props.map((prop) => {
        const fits = collection.fields.filter((f) => (PROP_FIELDS[prop] ?? []).includes(f.type));
        return (
          <label key={prop} className="block text-[11px] text-white/55">{say(PROP_NAME[prop])}
            <select className={control} disabled={busy} value={bind[prop] ?? ""} onChange={(e) => set(prop, e.target.value)} data-testid={`bind-${prop}`}>
              <option value="">{say("— متل التصميم —|— as designed —|— כמו בעיצוב —")}</option>
              {fits.map((f) => <option key={f.id} value={f.id}>◆ {words(f.name, lang) || f.id}</option>)}
              {prop === "href" ? <option value="$url">◆ {say("صفحة العنصر|The item's page|דף הפריט")}</option> : null}
            </select>
          </label>
        );
      })}
    </div>
  );
}
