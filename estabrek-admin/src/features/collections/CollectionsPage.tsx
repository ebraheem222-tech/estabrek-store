/**
 * Content collections (W3): a blog, a lookbook, branches, questions… each with its own fields.
 * Items are written here in the three languages; each published item has its own page at
 * /<collection>/<item> (the collection's item page, designed in the editor), and any page can list
 * them (a "Collection list" in the editor's Add panel).
 */
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../../lib/toast";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { say } from "../../studio/say";
import { MediaLibraryModal } from "../../components/media/MediaLibraryModal";
import { collectionPresets, collectionTemplate, storeTemplate, createCollection, createItem, deleteCollection, deleteItem, listCollections, listItems, updateCollection, updateItem, type Collection, type CollectionField, type CollectionItem, type FieldType, type ItemStatus, type Local } from "../../api/collections.api";
import { itemDataOut, LANGS, newField, slugOf, titleOf, WORD_TYPES, type Lang } from "./collectionForms";

const card = "rounded-2xl border border-white/10 bg-white/[0.03] p-4";
const btn = "rounded-lg bg-white/[0.07] px-3 py-1.5 text-xs hover:bg-white/[0.12] disabled:opacity-40";
const primary = "rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:brightness-110 disabled:opacity-40";
const input = "w-full rounded-lg border border-white/15 bg-surface-925 px-2 py-1.5 text-sm";
const PRESET_ICON: Record<string, string> = { blog: "✎", lookbook: "◐", branches: "⌂", faq: "?" };
const TYPE_NAME: Record<FieldType, string> = {
  text: "كلام قصير|Short words|טקסט קצר", longText: "نص طويل|Long text|טקסט ארוך", image: "صورة|Picture|תמונה", number: "رقم|Number|מספר", date: "تاريخ|Date|תאריך",
  link: "رابط|Link|קישור", boolean: "نعم/لا|Yes/no|כן/לא", select: "اختيار|Choice|בחירה", color: "لون|Colour|צבע",
};
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
function StorePages() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const open = async (kind: "product" | "category") => {
    setBusy(true);
    try { const { id } = await storeTemplate(kind); navigate(`/studio/${encodeURIComponent(id)}`); }
    catch (e) { toast.error(say("ما انفتح التصميم|The design didn't open|העיצוב לא נפתח"), { description: getApiErrorMessage(e) }); }
    finally { setBusy(false); }
  };
  return (
    <section className={card} data-testid="store-pages">
      <div className="mb-1 text-sm font-medium">{say("صفحات المتجر|The store's pages|דפי החנות")}</div>
      <p className="mb-3 text-sm text-white/55">{say("صمّم صفحة المنتج وصفحة القسم مرة وحدة: كل منتج وكل قسم بيظهر فيها ببياناته. المتجر بيضل على صفحاته الحالية لحد ما تنشر التصميم من المحرر.|Design the product page and the category page once: every product and category shows in it with its own data. The shop keeps its current pages until you publish the design from the editor.|עצב את דף המוצר ודף הקטגוריה פעם אחת: כל מוצר וכל קטגוריה מוצגים בו עם הנתונים שלהם. החנות נשארת עם הדפים הנוכחיים עד שתפרסם את העיצוב מהעורך.")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primary} disabled={busy} onClick={() => void open("product")} data-testid="design-product-page">🛍 {say("صمّم صفحة المنتج|Design the product page|עצב את דף המוצר")}</button>
        <button type="button" className={btn} disabled={busy} onClick={() => void open("category")} data-testid="design-category-page">▦ {say("صمّم صفحة القسم|Design the category page|עצב את דף הקטגוריה")}</button>
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
      <button type="button" className={primary} onClick={() => setEditing("new")} data-testid="item-new">+ {say("عنصر جديد|New item|פריט חדש")}</button>
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
  return wrap(<input type="color" className="h-9 w-16" value={typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#c86b98"} onChange={(e) => onChange(e.target.value)} />);
}

function Fields({ collection, lang, onSaved, onDeleted }: { collection: Collection; lang: Lang; onSaved: () => void; onDeleted: () => void }) {
  const [fields, setFields] = useState<CollectionField[]>(() => structuredClone(collection.fields));
  const [name, setName] = useState<Local>(() => ({ ...collection.name }));
  const [slug, setSlug] = useState(collection.slug);
  const [newType, setNewType] = useState<FieldType>("text");
  const [saving, setSaving] = useState(false);
  const changed = useMemo(() => JSON.stringify([fields, name, slug]) !== JSON.stringify([collection.fields, collection.name, collection.slug]), [fields, name, slug, collection]);
  const save = async () => {
    setSaving(true);
    try { await updateCollection(collection.id, { slug, name, fields }); toast.success(say("انحفظت الحقول|The fields were saved|השדות נשמרו")); onSaved(); }
    catch (e) { toast.error(say("ما انحفظ|Not saved|לא נשמר"), { description: getApiErrorMessage(e) }); }
    finally { setSaving(false); }
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
            <button type="button" className={btn} onClick={() => move(i, -1)} aria-label="↑">↑</button>
            <button type="button" className={btn} onClick={() => move(i, 1)} aria-label="↓">↓</button>
            <button type="button" className={`${btn} text-red-300`} disabled={fields.length <= 1} onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}>×</button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${input} w-44`} value={newType} onChange={(e) => setNewType(e.target.value as FieldType)} data-testid="field-new-type">{(Object.keys(TYPE_NAME) as FieldType[]).map((t) => <option key={t} value={t}>{say(TYPE_NAME[t])}</option>)}</select>
        <button type="button" className={btn} onClick={() => { const [ar, en, he] = TYPE_NAME[newType].split("|"); setFields((fs) => [...fs, newField(newType, { ar, en, he }, fs.map((x) => x.id))]); }} data-testid="field-add">+ {say("حقل|Field|שדה")}</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primary} disabled={!changed || saving} onClick={() => void save()} data-testid="fields-save">{say("احفظ الحقول|Save the fields|שמור את השדות")}</button>
        <button type="button" className={`${btn} text-red-300`} onClick={async () => { if (!window.confirm(say("نحذف المجموعة مع كل عناصرها وصفحتها؟|Delete the collection with all its items and its page?|למחוק את האוסף עם כל הפריטים והדף?"))) return; await deleteCollection(collection.id); onDeleted(); }}>{say("احذف المجموعة|Delete the collection|מחק את האוסף")}</button>
      </div>
    </div>
  );
}
