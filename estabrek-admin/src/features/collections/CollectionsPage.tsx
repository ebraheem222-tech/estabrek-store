/**
 * Content collections (W3): a blog, a lookbook, branches, questions… each with its own fields.
 * Items are written here in the three languages; each published item has its own page at
 * /<collection>/<item> (the collection's item page, designed in the editor), and any page can list
 * them (a "Collection list" in the editor's Add panel).
 */
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../../lib/toast";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { say } from "../../studio/say";
import { MediaLibraryModal } from "../../components/media/MediaLibraryModal";
import { collectionPresets, collectionTemplate, storeTemplate, createCollection, createItem, deleteCollection, deleteItem, listCollections, listItems, updateCollection, updateItem, type Collection, type CollectionField, type CollectionItem, type FieldType, type ItemStatus, type Local } from "../../api/collections.api";
import { itemDataOut, LANGS, newField, slugOf, titleOf, WORD_TYPES, type Lang } from "./collectionForms";
import { gridMeta } from "../../api/data.api";
import { FieldRulesEditor } from "./FieldRulesEditor";
import { fitRules, ruleCount, ruleParts } from "./fieldRules";
import { ChangeDialog, VersionsPanel } from "./SchemaChange";
import { retype, touchesRows } from "./schemaText";
import { previewFields, type Impact } from "../../api/collections.api";
import { useAuth } from "../../hooks/useAuth";
import { ValueInput } from "../data/GridCells";
import { KIND_NAME, draftFrom, valueFrom } from "../data/kinds";
import { listPages, updatePage } from "../../api/pages.api";

const card = "rounded-2xl border border-white/10 bg-white/[0.03] p-4";
const btn = "rounded-lg bg-white/[0.07] px-3 py-1.5 text-xs hover:bg-white/[0.12] disabled:opacity-40";
const primary = "rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:brightness-110 disabled:opacity-40";
const input = "w-full rounded-lg border border-white/15 bg-surface-925 px-2 py-1.5 text-sm";
const PRESET_ICON: Record<string, string> = { blog: "✎", lookbook: "◐", branches: "⌂", faq: "?" };
const TYPE_NAME = KIND_NAME;
const STATUS_NAME: Record<ItemStatus, string> = { DRAFT: "مسودة|Draft|טיוטה", PUBLISHED: "منشور|Published|פורסם", ARCHIVED: "مؤرشف|Archived|בארכיון" };
const words = (v: Local | undefined, lang: Lang) => v?.[lang] || v?.ar || v?.en || v?.he || "";

export default function CollectionsPage() {
  const qc = useQueryClient();
  const lang = adminLang() as Lang;
  const collections = useQuery({ queryKey: ["collections"], queryFn: listCollections });
  const presets = useQuery({ queryKey: ["collections", "presets"], queryFn: collectionPresets, staleTime: Infinity });
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<"items" | "fields" | "page">("items");
  const current = collections.data?.find((c) => c.id === open) ?? collections.data?.[0] ?? null;
  const refresh = () => qc.invalidateQueries({ queryKey: ["collections"] });
  const make = useMutation({
    mutationFn: (body: Parameters<typeof createCollection>[0]) => createCollection(body),
    onSuccess: (c) => { void refresh(); setOpen(c.id); setTab("items"); toast.success(say("انعملت المجموعة|The collection was made|האוסף נוצר")); },
    onError: (e) => toast.error(say("ما انعملت المجموعة|The collection wasn't made|האוסף לא נוצר"), { description: getApiErrorMessage(e) }),
  });
  const taken = new Set(collections.data?.map((c) => c.slug) ?? []);
  const freeSlug = (s: string) => { if (!taken.has(s)) return s; for (let i = 2; ; i++) if (!taken.has(`${s}-${i}`)) return `${s}-${i}`; };

  return (
    <div className="space-y-5 p-4 md:p-6" data-testid="collections-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{say("المجموعات|Collections|אוספים")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/55">{say("محتوى إله حقول خاصة فيه (مدونة، لوك بوك، فروع، أسئلة…). كل عنصر منشور إله صفحة بتتصمّم مرة وحدة، وأي صفحة بتقدر تعرض قائمة منه.|Content with its own fields (a blog, a lookbook, branches, questions…). Each published item gets a page designed once, and any page can show a list of them.|תוכן עם שדות משלו (בלוג, לוקבוק, סניפים, שאלות…). לכל פריט שפורסם יש דף שמעוצב פעם אחת, וכל דף יכול להציג רשימה שלהם.")}</p>
        </div>
      </header>

      <StorePages />

      <section className={card}>
        <div className="mb-2 text-sm font-medium">{say("ابدأ مجموعة جديدة|Start a new collection|התחל אוסף חדש")}</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(presets.data ?? {}).map(([key, p]) => (
            <button key={key} type="button" className={btn} disabled={make.isPending} onClick={() => make.mutate({ preset: key, slug: freeSlug(p.slug) })} data-testid={`collection-preset-${key}`}>
              <span className="me-1">{PRESET_ICON[key] ?? "◆"}</span>{words(p.name, lang)}
            </button>
          ))}
          <button type="button" className={btn} disabled={make.isPending} onClick={() => make.mutate({ slug: freeSlug("items"), name: { [lang]: say("مجموعة جديدة|New collection|אוסף חדש") }, fields: [newField("text", { ar: "العنوان", en: "Title", he: "כותרת" }, [])] })} data-testid="collection-new-empty">+ {say("فاضية|Empty|ריק")}</button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <nav className={`${card} space-y-1`} aria-label={say("المجموعات|Collections|אוספים")}>
          {collections.isLoading ? <p className="text-sm text-white/50">…</p> : null}
          {!collections.data?.length && !collections.isLoading ? <p className="text-sm text-white/50">{say("لسا ما في مجموعات.|No collections yet.|אין עדיין אוספים.")}</p> : null}
          {collections.data?.map((c) => (
            <button key={c.id} type="button" onClick={() => setOpen(c.id)} aria-current={current?.id === c.id} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm ${current?.id === c.id ? "bg-accent-500/20 text-white" : "text-white/75 hover:bg-white/[0.06]"}`} data-testid={`collection-${c.slug}`}>
              <span className="truncate">{words(c.name, lang) || c.slug}</span>
              <span className="text-xs text-white/40" dir="ltr">{c.published}/{c.items}</span>
            </button>
          ))}
        </nav>
        {current ? (
          <section className={`${card} min-w-0 space-y-4`} data-testid="collection-open">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{words(current.name, lang) || current.slug}</h2>
                <p className="text-xs text-white/45" dir="ltr">/{current.slug}/…</p>
              </div>
              <div className="flex gap-1" role="tablist">
                {(["items", "fields", "page"] as const).map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} className={`rounded-lg px-3 py-1.5 text-xs ${tab === t ? "bg-white/[0.12]" : "text-white/60 hover:bg-white/[0.06]"}`} onClick={() => setTab(t)} data-testid={`collection-tab-${t}`}>{say({ items: "العناصر|Items|פריטים", fields: "الحقول|Fields|שדות", page: "صفحة العنصر|Item page|דף פריט" }[t])}</button>)}
              </div>
            </div>
            {tab === "items" ? <Items key={current.id} collection={current} lang={lang} onChanged={refresh} /> : null}
            {tab === "fields" ? <Fields key={current.id} collection={current} lang={lang} onSaved={refresh} onDeleted={() => { setOpen(null); void refresh(); }} /> : null}
            {tab === "page" ? <ItemPage collection={current} onMade={refresh} /> : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

/** The store's own product and category page designs: one each, filled for every product or category. */
/** Where the store's product and category page designs live (lib/collections.ts STORE_TEMPLATES). */
export const STORE_PAGE_SLUGS = { product: "/__product-page", category: "/__category-page" } as const;

function StorePages() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  // Each design's state: none yet, a draft (the shop keeps its own page), or live (the shop draws it).
  const pagesQ = useQuery({ queryKey: ["pages", "store-designs"], queryFn: listPages });
  const pages = (Array.isArray(pagesQ.data) ? pagesQ.data : []) as Array<{ id: string; slug: string; status: string }>;
  const designOf = (kind: keyof typeof STORE_PAGE_SLUGS) => pages.find((p) => p.slug === STORE_PAGE_SLUGS[kind]);
  const open = async (kind: "product" | "category") => {
    setBusy(true);
    try { const { id } = await storeTemplate(kind); navigate(`/studio/${encodeURIComponent(id)}`); }
    catch (e) { toast.error(say("ما انفتح التصميم|The design didn't open|העיצוב לא נפתח"), { description: getApiErrorMessage(e) }); }
    finally { setBusy(false); }
  };
  const stop = useMutation({
    mutationFn: (id: string) => updatePage(id, { status: "DRAFT" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pages"] });
      toast.success(say("رجعت صفحة المتجر الأصلية. التصميم محفوظ كمسودة.|The store's own page is back. The design is kept as a draft.|הדף המקורי של החנות חזר. העיצוב נשמר כטיוטה."));
    },
    onError: (e) => toast.error(say("ما زبط|That didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) }),
  });
  const row = (kind: "product" | "category", icon: string, label: string, primaryButton: boolean) => {
    const design = designOf(kind);
    const live = design?.status === "PUBLISHED";
    return (
      <div className="flex flex-wrap items-center gap-2" data-testid={`store-design-${kind}`} data-state={!design ? "none" : live ? "live" : "draft"}>
        <button type="button" className={primaryButton ? primary : btn} disabled={busy} onClick={() => void open(kind)} data-testid={`design-${kind}-page`}>{icon} {say(label)}</button>
        {design ? (
          <span className={`rounded-full px-2 py-0.5 text-[11px] ${live ? "bg-emerald-500/15 text-emerald-200" : "bg-white/10 text-white/60"}`}>
            {live ? say("منشور: المتجر بيعرض هالتصميم|Live: the shop shows this design|פורסם: החנות מציגה את העיצוב הזה") : say("مسودة: المتجر على صفحته الأصلية|Draft: the shop shows its own page|טיוטה: החנות בדף המקורי שלה")}
          </span>
        ) : null}
        {live ? (
          <button type="button" className={btn} disabled={stop.isPending} onClick={() => stop.mutate(design!.id)} data-testid={`stop-${kind}-design`}>
            ↩ {say("رجّع صفحة المتجر الأصلية|Back to the store's own page|חזרה לדף המקורי של החנות")}
          </button>
        ) : null}
      </div>
    );
  };
  return (
    <section className={card} data-testid="store-pages">
      <div className="mb-1 text-sm font-medium">{say("صفحات المتجر|The store's pages|דפי החנות")}</div>
      <p className="mb-3 text-sm text-white/55">{say("صمّم صفحة المنتج وصفحة القسم مرة وحدة: كل منتج وكل قسم بيظهر فيها ببياناته. المتجر بيضل على صفحاته الحالية لحد ما تنشر التصميم من المحرر.|Design the product page and the category page once: every product and category shows in it with its own data. The shop keeps its current pages until you publish the design from the editor.|עצב את דף המוצר ודף הקטגוריה פעם אחת: כל מוצר וכל קטגוריה מוצגים בו עם הנתונים שלהם. החנות נשארת עם הדפים הנוכחיים עד שתפרסם את העיצוב מהעורך.")}</p>
      <p className="mb-3 text-xs text-amber-100/70" data-testid="store-pages-note">{say("للمتاجر اللي إلها تصميمها الخاص. متجر بتصميم إستبرق (الوردي) بيضل على صفحات المنتج والقسم تبعته حتى لو التصميم منشور.|For stores on their own design. A store on the rose design keeps its own product and category pages even when a design is published.|לחנויות עם עיצוב משלהן. חנות בעיצוב הוורוד שומרת על דפי המוצר והקטגוריה שלה גם כשעיצוב מפורסם.")}</p>
      <div className="space-y-2">
        {row("product", "🛍", "صمّم صفحة المنتج|Design the product page|עצב את דף המוצר", true)}
        {row("category", "▦", "صمّم صفحة القسم|Design the category page|עצב את דף הקטגוריה", false)}
      </div>
    </section>
  );
}

function ItemPage({ collection, onMade }: { collection: Collection; onMade: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    try { const { id } = await collectionTemplate(collection.id); onMade(); navigate(`/studio/${encodeURIComponent(id)}`); }
    catch (e) { toast.error(say("ما انفتحت صفحة العنصر|The item page didn't open|דף הפריט לא נפתח"), { description: getApiErrorMessage(e) }); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-3" data-testid="collection-item-page">
      <p className="text-sm text-white/60">{say("صفحة وحدة بتتصمّم مرة، وكل عنصر بيظهر فيها بعنوانه الخاص. العناصر المربوطة بالحقول (◆) بتاخد قيم العنصر.|One page designed once; every item shows on it at its own address. Elements connected to fields (◆) take the item's values.|דף אחד שמעוצב פעם אחת; כל פריט מוצג בו בכתובת משלו. אובייקטים שמחוברים לשדות (◆) מקבלים את ערכי הפריט.")}</p>
      <p className="text-xs text-white/45" dir="ltr">/{collection.slug}/&lt;item&gt;</p>
      <button type="button" className={primary} disabled={busy} onClick={() => void open()} data-testid="collection-design-page">✎ {collection.templateId ? say("عدّل صفحة العنصر|Edit the item page|ערוך את דף הפריט") : say("صمّم صفحة العنصر|Design the item page|עצב את דף הפריט")}</button>
    </div>
  );
}

function Items({ collection, lang, onChanged }: { collection: Collection; lang: Lang; onChanged: () => void }) {
  const qc = useQueryClient();
  const items = useQuery({ queryKey: ["collections", collection.id, "items"], queryFn: () => listItems(collection.id) });
  const [editing, setEditing] = useState<CollectionItem | "new" | null>(null);
  const reload = () => { void qc.invalidateQueries({ queryKey: ["collections", collection.id, "items"] }); onChanged(); };
  const status = useMutation({
    mutationFn: ({ item, to }: { item: CollectionItem; to: ItemStatus }) => updateItem(collection.id, item.id, { status: to }),
    onSuccess: reload,
    onError: (e) => toast.error(say("ما انحفظ|Not saved|לא נשמר"), { description: getApiErrorMessage(e) }),
  });
  const remove = useMutation({ mutationFn: (item: CollectionItem) => deleteItem(collection.id, item.id), onSuccess: reload });
  if (editing) return <ItemForm collection={collection} lang={lang} item={editing === "new" ? null : editing} onDone={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />;
  return (
    <div className="space-y-2" data-testid="collection-items">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={primary} onClick={() => setEditing("new")} data-testid="item-new">+ {say("عنصر جديد|New item|פריט חדש")}</button>
        <Link to={`/admin/data?table=${encodeURIComponent(collection.slug)}`} className={btn} data-testid="items-as-grid">{say("افتحها كجدول: فلترة، تعديل جماعي، Excel|Open as a table: filters, many at once, Excel|פתח כטבלה: סינון, שינוי קבוצתי, Excel")}</Link>
      </div>
      {items.data?.length ? (
        <ul className="divide-y divide-white/[0.06]">
          {items.data.map((it) => (
            <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 py-2" data-testid="item-row" data-slug={it.slug}>
              <button type="button" className="min-w-0 flex-1 truncate text-start text-sm hover:underline" onClick={() => setEditing(it)}>{titleOf(collection.fields, it.data, lang) || it.slug} <span className="text-xs text-white/35" dir="ltr">/{collection.slug}/{it.slug}</span></button>
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${it.status === "PUBLISHED" ? "bg-emerald-500/15 text-emerald-200" : "bg-white/[0.06] text-white/55"}`}>{say(STATUS_NAME[it.status])}</span>
              <button type="button" className={btn} disabled={status.isPending} onClick={() => status.mutate({ item: it, to: it.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" })} data-testid="item-publish">{it.status === "PUBLISHED" ? say("خبّيه|Unpublish|הסתר") : say("انشره|Publish|פרסם")}</button>
              <button type="button" className={`${btn} text-red-300`} disabled={remove.isPending} onClick={() => { if (window.confirm(say("نحذف العنصر؟|Delete the item?|למחוק את הפריט?"))) remove.mutate(it); }}>{say("احذف|Delete|מחק")}</button>
            </li>
          ))}
        </ul>
      ) : items.isLoading ? null : <p className="text-sm text-white/50">{say("لسا ما في عناصر.|No items yet.|אין עדיין פריטים.")}</p>}
    </div>
  );
}

function ItemForm({ collection, lang, item, onDone, onCancel }: { collection: Collection; lang: Lang; item: CollectionItem | null; onDone: () => void; onCancel: () => void }) {
  const [values, setValues] = useState<Record<string, unknown>>(() => structuredClone(item?.data ?? {}));
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [wordsLang, setWordsLang] = useState<Lang>(lang);
  const [picking, setPicking] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const set = (id: string, v: unknown) => setValues((x) => ({ ...x, [id]: v }));
  const title = titleOf(collection.fields, values, "en") || titleOf(collection.fields, values, lang);
  const save = async (status?: ItemStatus) => {
    setSaving(true);
    setProblems({});
    try {
      const body = { slug: slug.trim() || slugOf(title), data: itemDataOut(collection.fields, values), ...(status ? { status } : {}) };
      if (item) await updateItem(collection.id, item.id, body);
      else await createItem(collection.id, body);
      toast.success(say("انحفظ|Saved|נשמר"));
      onDone();
    } catch (e: any) {
      const issues = e?.response?.data?.issues as Array<{ field: string; message: string }> | undefined;
      if (issues) setProblems(Object.fromEntries(issues.map((i) => [i.field, i.message])));
      toast.error(e?.response?.data?.error === "SLUG_TAKEN" ? say("هالعنوان مأخوذ|This address is taken|הכתובת תפוסה") : say("ما انحفظ|Not saved|לא נשמר"), { description: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }} data-testid="item-form">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/50">{say("لغة الكلام|Words in|שפת הטקסט")}</span>
        {LANGS.map((l) => <button key={l} type="button" className={`rounded-md px-2 py-1 text-xs ${wordsLang === l ? "bg-accent-500/25" : "bg-white/[0.05]"}`} onClick={() => setWordsLang(l)} data-testid={`item-lang-${l}`}>{l.toUpperCase()}</button>)}
      </div>
      {collection.fields.map((f) => <FieldInput key={f.id} field={f} lang={lang} wordsLang={wordsLang} value={values[f.id]} problem={problems[f.id]} onChange={(v) => set(f.id, v)} onPick={() => setPicking(f.id)} />)}
      <label className="block text-xs text-white/60">{say("العنوان بالرابط|Address word|מילה בכתובת")}<input className={input} dir="ltr" value={slug} placeholder={slugOf(title)} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} data-testid="item-slug" /></label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btn} disabled={saving} data-testid="item-save">{say("احفظ|Save|שמור")}</button>
        <button type="button" className={primary} disabled={saving} onClick={() => void save("PUBLISHED")} data-testid="item-save-publish">{say("احفظ وانشر|Save and publish|שמור ופרסם")}</button>
        <button type="button" className={btn} onClick={onCancel}>{say("إلغاء|Cancel|ביטול")}</button>
      </div>
      <MediaLibraryModal open={picking !== null} title={say("صورة|A picture|תמונה")} onClose={() => setPicking(null)} onSelect={(url) => { if (picking) set(picking, url); setPicking(null); }} />
    </form>
  );
}

function FieldInput({ field: f, lang, wordsLang, value, problem, onChange, onPick }: { field: CollectionField; lang: Lang; wordsLang: Lang; value: unknown; problem?: string; onChange: (v: unknown) => void; onPick: () => void }) {
  const label = <span className="flex items-center gap-1">{words(f.name, lang) || f.id}{f.required ? <span className="text-red-300">*</span> : null}<span className="text-white/30">· {say(TYPE_NAME[f.type])}</span></span>;
  const wrap = (el: ReactNode) => <label className="block space-y-1 text-xs text-white/60" data-testid={`item-field-${f.id}`}>{label}{el}{problem ? <span className="text-red-300">{problem}</span> : null}</label>;
  if (WORD_TYPES.includes(f.type)) {
    const v = (value ?? {}) as Local;
    const put = (w: string) => onChange({ ...v, [wordsLang]: w });
    return wrap(f.type === "text" ? <input className={input} dir={wordsLang === "en" ? "ltr" : "rtl"} value={v[wordsLang] ?? ""} onChange={(e) => put(e.target.value)} /> : <textarea className={`${input} min-h-[96px]`} dir={wordsLang === "en" ? "ltr" : "rtl"} value={v[wordsLang] ?? ""} onChange={(e) => put(e.target.value)} />);
  }
  if (f.type === "image") return wrap(<span className="flex items-center gap-2">{typeof value === "string" && value ? <img src={value} alt="" className="h-12 w-12 rounded object-cover" /> : null}<button type="button" className={btn} onClick={onPick}>{say("اختار صورة|Pick a picture|בחר תמונה")}</button><input className={input} dir="ltr" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} placeholder="https://…" /></span>);
  if (f.type === "number") return wrap(<input type="number" className={input} value={typeof value === "number" || typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} />);
  if (f.type === "date") return wrap(<input type="date" className={input} value={typeof value === "string" ? value.slice(0, 10) : ""} onChange={(e) => onChange(e.target.value)} />);
  if (f.type === "link") return wrap(<input className={input} dir="ltr" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} placeholder="/shop or https://…" />);
  if (f.type === "boolean") return <label className="flex items-center gap-2 text-xs text-white/70" data-testid={`item-field-${f.id}`}><input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
  if (f.type === "select") return wrap(<select className={input} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{f.options?.map((o) => <option key={o.id} value={o.id}>{words(o.name, lang) || o.id}</option>)}</select>);
  if (f.type === "color") return wrap(<input type="color" className="h-9 w-16" value={typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#c86b98"} onChange={(e) => onChange(e.target.value)} />);
  // The newer kinds (an email, a date with its time, money, several choices, a place, JSON…): each through its own box.
  return wrap(<KindBox field={f} lang={lang} value={value} onChange={onChange} />);
}

/** One of the newer kinds in the item form: the box keeps its own words while they're written, and hands the form the value they make. */
function KindBox({ field: f, lang, value, onChange }: { field: CollectionField; lang: Lang; value: unknown; onChange: (v: unknown) => void }) {
  const [draft, setDraft] = useState(() => draftFrom(f, value));
  return <ValueInput kind={f.type} field={f} lang={lang} value={draft} big onChange={(d) => { setDraft(d); onChange(valueFrom(f, d)); }} testId={`item-box-${f.id}`} />;
}

function Fields({ collection, lang, onSaved, onDeleted }: { collection: Collection; lang: Lang; onSaved: () => void; onDeleted: () => void }) {
  const [fields, setFields] = useState<CollectionField[]>(() => structuredClone(collection.fields));
  const [name, setName] = useState<Local>(() => ({ ...collection.name }));
  const [slug, setSlug] = useState(collection.slug);
  const [newType, setNewType] = useState<FieldType>("text");
  const [saving, setSaving] = useState(false);
  // Which rules fit which kind of field (the server's own list), and the field whose rules are open.
  const meta = useQuery({ queryKey: ["data", "meta"], queryFn: gridMeta, staleTime: Infinity });
  const [rulesOpen, setRulesOpen] = useState<string | null>(null);
  const changed = useMemo(() => JSON.stringify([fields, name, slug]) !== JSON.stringify([collection.fields, collection.name, collection.slug]), [fields, name, slug, collection]);
  const { hasPermission } = useAuth();
  /** What the change would do to the rows, waiting for a yes. */
  const [asking, setAsking] = useState<Impact[] | null>(null);
  const nameOf = (id: string) => words((fields.find((f) => f.id === id) ?? collection.fields.find((f) => f.id === id))?.name, lang) || id;
  /** A change that touches the rows is shown first; `accepted` = it's been read and agreed to. */
  const save = async (accepted = false) => {
    setSaving(true);
    try {
      const body = { slug, name, fields };
      if (!accepted) {
        const look = await previewFields(collection.id, body);
        if (touchesRows(look.changes)) { setAsking(look.changes); return; }
      }
      const saved = await updateCollection(collection.id, body, accepted);
      setAsking(null);
      setFields(structuredClone(saved.fields));
      toast.success(say("انحفظت الحقول|The fields were saved|השדות נשמרו"));
      onSaved();
    } catch (e) {
      // The rows changed meanwhile and the save now needs a yes: show what it would do.
      const data = (e as { response?: { data?: { error?: string; changes?: Impact[] } } })?.response?.data;
      if (data?.error === "SCHEMA_CHANGE_NEEDS_CONFIRM" && Array.isArray(data.changes)) setAsking(data.changes);
      else toast.error(say("ما انحفظ|Not saved|לא נשמר"), { description: getApiErrorMessage(e) });
    } finally { setSaving(false); }
  };
  const move = (i: number, d: number) => setFields((fs) => { const out = [...fs]; const j = i + d; if (j < 0 || j >= out.length) return fs; [out[i], out[j]] = [out[j], out[i]]; return out; });
  return (
    <div className="space-y-3" data-testid="collection-fields">
      <div className="grid gap-2 md:grid-cols-2">
        <label className="block text-xs text-white/60">{say("الإسم|Name|שם")} ({lang.toUpperCase()})<input className={input} value={name[lang] ?? ""} onChange={(e) => setName({ ...name, [lang]: e.target.value })} /></label>
        <label className="block text-xs text-white/60">{say("العنوان|Address|כתובת")}<input className={input} dir="ltr" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} data-testid="collection-slug" /></label>
      </div>
      <ul className="space-y-2">
        {fields.map((f, i) => (
          <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] p-2" data-testid="field-row" data-field={f.id}>
            <input className={`${input} w-40 flex-1`} value={f.name?.[lang] ?? ""} placeholder={f.id} onChange={(e) => setFields((fs) => fs.map((x, j) => (j === i ? { ...x, name: { ...x.name, [lang]: e.target.value } } : x)))} aria-label={say("إسم الحقل|Field name|שם השדה")} />
            <span className="text-xs text-white/40">{say(TYPE_NAME[f.type])}</span>
            <code className="text-[10px] text-white/30" dir="ltr">{f.id}</code>
            <label className="flex items-center gap-1 text-xs text-white/60"><input type="checkbox" checked={f.required === true} onChange={(e) => setFields((fs) => fs.map((x, j) => (j === i ? { ...x, required: e.target.checked || undefined } : x)))} />{say("لازم|Required|חובה")}</label>
            {meta.data ? (
              <button type="button" className={btn} aria-expanded={rulesOpen === f.id} onClick={() => setRulesOpen(rulesOpen === f.id ? null : f.id)} data-testid={`field-rules-${f.id}`}>
                {say("قواعد|Rules|כללים")}{ruleCount(f) ? ` (${ruleCount(f)})` : ""}
              </button>
            ) : null}
            <button type="button" className={btn} onClick={() => move(i, -1)} aria-label="↑">↑</button>
            <button type="button" className={btn} onClick={() => move(i, 1)} aria-label="↓">↓</button>
            <button type="button" className={`${btn} text-red-300`} disabled={fields.length <= 1} onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}>×</button>
            {rulesOpen !== f.id && ruleParts(f, lang).length ? <span className="w-full text-[11px] text-white/45" data-testid={`field-rules-summary-${f.id}`}>{ruleParts(f, lang).map((part) => say(part)).join(" · ")}</span> : null}
            {rulesOpen === f.id && meta.data ? <FieldRulesEditor field={fitRules(f, meta.data.rules[f.type])} lang={lang} fit={meta.data.rules[f.type]} shapes={meta.data.shapes} onChange={(next) => setFields((fs) => fs.map((x, j) => (j === i ? next : x)))} onRetype={(type) => setFields((fs) => fs.map((x, j) => (j === i ? retype(x, type, meta.data!.rules[type]) : x)))} /> : null}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${input} w-44`} value={newType} onChange={(e) => setNewType(e.target.value as FieldType)} data-testid="field-new-type">{(Object.keys(TYPE_NAME) as FieldType[]).map((t) => <option key={t} value={t}>{say(TYPE_NAME[t])}</option>)}</select>
        <button type="button" className={btn} onClick={() => { const [ar, en, he] = TYPE_NAME[newType].split("|"); setFields((fs) => [...fs, newField(newType, { ar, en, he }, fs.map((x) => x.id))]); }} data-testid="field-add">+ {say("حقل|Field|שדה")}</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primary} disabled={!changed || saving} onClick={() => void save()} data-testid="fields-save">{say("احفظ الحقول|Save the fields|שמור את השדות")}</button>
        {asking ? <ChangeDialog title={say("شو بيعمل هالتغيير بالسطور الموجودة|What this change does to the rows that are there|מה השינוי עושה לשורות הקיימות")} changes={asking} nameOf={nameOf} busy={saving} onAccept={() => void save(true)} onCancel={() => setAsking(null)} /> : null}
        <button type="button" className={`${btn} text-red-300`} onClick={async () => { if (!window.confirm(say("نحذف المجموعة مع كل عناصرها وصفحتها؟|Delete the collection with all its items and its page?|למחוק את האוסף עם כל הפריטים והדף?"))) return; await deleteCollection(collection.id); onDeleted(); }}>{say("احذف المجموعة|Delete the collection|מחק את האוסף")}</button>
      </div>
      <VersionsPanel table={collection} lang={lang} canWrite={hasPermission("pages:write")} onRestored={(saved) => { setFields(structuredClone(saved.fields)); setName({ ...saved.name }); onSaved(); }} />
    </div>
  );
}
