/**
 * Collections (W3) in the editor: a list's settings, and connecting an element's words, picture
 * or link to a field of the collection it's shown for (on the collection's item page, or inside
 * a list's card). Backend lib/collectionTree.ts fills them on the shop.
 *
 * A list can also be read in the visitor's browser (listRows.ts): whose rows it shows, a few filters, and the
 * words for a visitor who isn't signed in. Its card then also takes who a row points at and who added it.
 */
import { useQuery } from "@tanstack/react-query";
import { listCollections, type Collection, type FieldType, type Local } from "../api/collections.api";
import { getApi } from "../api/dataApi.api";
import type { PageTreeNode } from "../api/pages.api";
import { BINDABLE, CATEGORY_COLLECTION, PRODUCT_COLLECTION, fieldsFor } from "../features/collections/collectionForms";
import { opName } from "../features/data/dataText";
import type { Lang } from "../lib/lang";
import { FEED_NAME, LIST_FEEDS, LIST_LIMITS, OPS_FOR, askFields, feedOf, filtersOf, fitFilter, listTrouble, needsValue, newFilter, type ListFilter, type ListOp } from "./listRows";
import { say } from "./say";
import { btn, marks, note, warn } from "./smallInputs";
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

/** Whether an element sits in the card of a list read in the visitor's browser (the nearest list around it has a feed). */
export function inLiveList(index: TreeIndex, nodeId: string): boolean {
  for (let at: string | null = index.nodes.get(nodeId)?.parentId ?? null; at; at = index.nodes.get(at)?.parentId ?? null) {
    const n = index.nodes.get(at)?.node;
    if (n?.type === "collectionList") return !!feedOf(n.props as Record<string, unknown>);
  }
  return false;
}

/** A list's settings: which collection, its order, how many, how many across, and its words when empty. */
export function CollectionListPanel({ node, collections, lang, busy, onProps }: { node: PageTreeNode; collections: Collection[] | undefined; lang: Lang; busy: boolean; onProps: (props: Record<string, unknown>) => void }) {
  const p = node.props as Record<string, any>;
  const set = (patch: Record<string, unknown>) => onProps({ ...p, ...patch });
  // Read in the visitor's browser (listRows.ts): whose rows, a few filters, the words for who isn't signed in.
  const feed = feedOf(p);
  const collection = collections?.find((c) => c.id === p.collectionId);
  // The table's API settings say whether the shop may read it at all (asked only for such a list).
  const apiQ = useQuery({ queryKey: ["data-api"], queryFn: getApi, staleTime: 60_000, retry: false, enabled: !!feed });
  const table = apiQ.data?.tables.find((t) => t.id === p.collectionId);
  const trouble = feed && apiQ.data && collection ? listTrouble(feed, collection.fields, table, apiQ.data.customerAccounts) : null;
  const fields = askFields(collection?.fields ?? [], table?.private);
  const where = filtersOf(p);
  const setWhere = (next: ListFilter[]) => set({ where: next.length ? next : undefined });
  return (
    <div className={box} data-testid="collection-list-panel">
      <div className="text-xs font-medium text-white/85">▦ {say("قائمة من مجموعة|A collection list|רשימה מאוסף")}</div>
      <label className="block text-[11px] text-white/55">{say("المجموعة|Collection|אוסף")}
        <select className={control} disabled={busy} value={String(p.collectionId ?? "")} onChange={(e) => set({ collectionId: e.target.value, where: undefined })} data-testid="list-collection">
          {collections?.map((c) => <option key={c.id} value={c.id}>{words(c.name, lang) || c.slug}</option>)}
        </select>
      </label>
      <label className="block text-[11px] text-white/55">{say("سطور مين|Whose rows|השורות של מי")}
        <select className={control} disabled={busy} value={feed} onChange={(e) => set(e.target.value ? { feed: e.target.value, sort: p.sort === "oldest" ? "oldest" : "newest" } : { feed: undefined, signin: undefined })} data-testid="list-feed">
          {(["", ...LIST_FEEDS] as const).map((f) => <option key={f} value={f}>{say(FEED_NAME[f])}</option>)}
        </select>
      </label>
      {trouble ? <p className={trouble.level === "warn" ? warn : note} data-testid="list-trouble">{trouble.level === "warn" ? "⚠ " : ""}{say(trouble.text)}</p> : null}
      <div className="grid grid-cols-3 gap-2">
        <label className="block text-[11px] text-white/55">{say("الترتيب|Order|סדר")}
          <select className={control} disabled={busy} value={feed ? (p.sort === "oldest" ? "oldest" : "newest") : String(p.sort ?? "newest")} onChange={(e) => set({ sort: e.target.value })} data-testid="list-sort">
            <option value="newest">{say("الأحدث|Newest|החדש ביותר")}</option><option value="oldest">{say("الأقدم|Oldest|הישן ביותר")}</option>{feed ? null : <><option value="order">{say("ترتيبي|My order|הסדר שלי")}</option><option value="title">{say("أبجدي|A–Z|א–ת")}</option></>}
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
      <div className="space-y-2" data-testid="list-filters">
        <div className="text-[11px] text-white/55">{say("بس السطور اللي|Only the rows where|רק השורות שבהן")}</div>
        {where.map((f, i) => {
          const field = collection?.fields.find((x) => x.id === f.field);
          const ops = (field && OPS_FOR[field.type]) || [f.op];
          const change = (patch: Partial<ListFilter>) => setWhere(where.map((x, k) => (k === i ? fitFilter({ ...x, ...patch }, patch.field ? collection?.fields.find((y) => y.id === patch.field) : field) : x)));
          return (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1" data-testid={`list-filter-${i}`}>
              <select className={control} disabled={busy} value={f.field} onChange={(e) => change({ field: e.target.value })} aria-label={say("الحقل|Field|שדה")} data-testid={`list-filter-${i}-field`}>
                {!fields.some((x) => x.id === f.field) ? <option value={f.field}>{f.field}</option> : null}
                {fields.map((x) => <option key={x.id} value={x.id}>{words(x.name, lang) || x.id}</option>)}
              </select>
              <select className={control} disabled={busy} value={f.op} onChange={(e) => change({ op: e.target.value as ListOp })} aria-label={say("السؤال|Question|שאלה")} data-testid={`list-filter-${i}-op`}>
                {ops.map((op) => <option key={op} value={op}>{say(opName(op, (field?.type ?? "text") as FieldType))}</option>)}
              </select>
              <button type="button" className={btn} disabled={busy} onClick={() => setWhere(where.filter((_, k) => k !== i))} aria-label={say("شيل الفلتر|Remove the filter|הסר את המסנן")} data-testid={`list-filter-${i}-remove`}>✕</button>
              {needsValue(f.op) ? (
                field?.type === "select" ? (
                  <select className={`${control} col-span-3`} disabled={busy} value={f.value ?? ""} onChange={(e) => change({ value: e.target.value })} aria-label={say("القيمة|Value|ערך")} data-testid={`list-filter-${i}-value`}>
                    {(field.options ?? []).map((o) => <option key={o.id} value={o.id}>{words(o.name, lang) || o.id}</option>)}
                  </select>
                ) : (
                  <input className={`${control} col-span-3`} disabled={busy} maxLength={LIST_LIMITS.value} defaultValue={f.value ?? ""} key={`v:${f.field}:${f.op}:${f.value ?? ""}`} type={field?.type === "date" ? "date" : field?.type === "number" || field?.type === "money" ? "number" : "text"} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (f.value ?? "")) change({ value: v || undefined }); }} aria-label={say("القيمة|Value|ערך")} data-testid={`list-filter-${i}-value`} />
                )
              ) : null}
            </div>
          );
        })}
        <button type="button" className={btn} disabled={busy || where.length >= LIST_LIMITS.filters || !fields.length} onClick={() => setWhere([...where, newFilter(fields.find((x) => x.type === "select") ?? fields[0])])} data-testid="list-filter-add">+ {say("فلتر|A filter|מסנן")}</button>
      </div>
      {feed ? (
        <>
          <label className="block text-[11px] text-white/55">{say("لما الزائر مش مسجّل دخول|When the visitor isn't signed in|כשהמבקר לא מחובר")}
            <input className={control} disabled={busy} maxLength={200} defaultValue={words(p.signin, lang)} key={`signin:${words(p.signin, lang)}`} placeholder={say("سجّل دخولك لتشوف هالقائمة.|Sign in to see this list.|התחברו כדי לראות את הרשימה.")} onBlur={(e) => { const v = e.target.value.trim(); const next = { ...(p.signin ?? {}), [lang]: v }; if (!v) delete next[lang]; set({ signin: Object.keys(next).length ? next : undefined }); }} data-testid="list-signin" />
          </label>
          <label className="flex items-start gap-2 text-[11px] text-white/75">
            <input type="checkbox" className="mt-0.5" checked={p.stream === true} disabled={busy} onChange={(e) => set({ stream: e.target.checked || undefined })} data-testid="list-stream" />
            <span>
              {say("بتتحدّث لحالها (مباشر)|Updates by itself (live)|מתעדכנת לבד (חי)")}
              <span className="block text-[10px] leading-4 text-white/45">{say("لما حدا يضيف أو يغيّر أو يمحي سطر، القائمة بتتحدّث عند كل اللي فاتحين الصفحة، والسطر الجديد بيطلع بحركة خفيفة. منيحة للشات واللوحات الحيّة. كل زائر بيعرف بس عن السطور اللي بيقدر يقراها.|When someone adds, changes or deletes a row, the list updates for everyone with the page open, and a new row comes in with a soft motion. Good for chats and live boards. Each visitor hears only of rows they may read.|כשמישהו מוסיף, משנה או מוחק שורה, הרשימה מתעדכנת אצל כל מי שהעמוד פתוח אצלו, ושורה חדשה נכנסת בתנועה עדינה. טוב לצ׳אטים וללוחות חיים. כל מבקר שומע רק על שורות שמותר לו לקרוא.")}</span>
            </span>
          </label>
          <p className={note} data-testid="list-live-help">{marks(say(`القائمة بتنقرأ بمتصفح كل زائر بإسمه: الصفحة ما بتتغيّر، والسطور بتيجي من الجدول حسب مين فاتح، وبتتحدّث بعد ما يشغّل function أو يبعت فورم. جوّا الكرت بتشتغل العناصر العادية بس (كلام، صورة، زر، صناديق)، من غير حركة دخول. زر بالكرت بيقدر يشغّل function ويبعتلها {{row_id}} (رقم السطر). وبأي كلام: {{row_by}} مين ضاف السطر، و {{row_${fields[0]?.id ?? "note"}}} قيمة حقل.|Each visitor's browser reads the list as that visitor: the page stays the same, the rows come from the table for whoever is looking, and are read again after they run a function or send a form. Only plain elements work inside the card (words, a picture, a button, boxes), without entrance motion. A button in the card can run a function and send it {{row_id}} (the row's id). In any words: {{row_by}} is who added the row, and {{row_${fields[0]?.id ?? "note"}}} a field's value.|הדפדפן של כל מבקר קורא את הרשימה בשמו: העמוד נשאר אותו דבר, השורות מגיעות מהטבלה לפי מי שצופה, ונקראות שוב אחרי שהוא מריץ פונקציה או שולח טופס. בתוך הכרטיס עובדים רק אובייקטים רגילים (טקסט, תמונה, כפתור, קופסאות), בלי תנועת כניסה. כפתור בכרטיס יכול להריץ פונקציה ולשלוח לה {{row_id}} (מזהה השורה). ובכל טקסט: {{row_by}} מי שהוסיף את השורה, ו-{{row_${fields[0]?.id ?? "note"}}} ערך של שדה.`))}</p>
        </>
      ) : null}
      <p className="text-[11px] leading-5 text-white/45">{say("صمّم الكرت اللي جوّا مرة: بيتكرّر لكل عنصر. العناصر المربوطة (◆) بتاخد قيمه.|Design the card inside once: it repeats for each item. Connected elements (◆) take its values.|עצב את הכרטיס בפנים פעם אחת: הוא חוזר לכל פריט. אובייקטים מחוברים (◆) מקבלים את ערכיו.")}</p>
    </div>
  );
}

/** In a list read in the visitor's browser, words also take what the table's API shows as words: who a row points at, a yes or no, the rows a relation links. */
const LIVE_WORDS: FieldType[] = ["customer", "boolean", "relation"];
const WORDS_PROPS = new Set(["text", "label", "alt"]);

/** Connecting an element's props to the collection's fields. */
export function BindPanel({ node, collection, lang, busy, onProps, live = false }: { node: PageTreeNode; collection: Collection; lang: Lang; busy: boolean; onProps: (props: Record<string, unknown>) => void; /** In the card of a list read in the visitor's browser. */ live?: boolean }) {
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
        const fits = collection.fields.filter((f) => fieldsFor(node.type, prop).includes(f.type) || (live && WORDS_PROPS.has(prop) && LIVE_WORDS.includes(f.type)));
        return (
          <label key={prop} className="block text-[11px] text-white/55">{say(PROP_NAME[prop])}
            <select className={control} disabled={busy} value={bind[prop] ?? ""} onChange={(e) => set(prop, e.target.value)} data-testid={`bind-${prop}`}>
              <option value="">{say("— متل التصميم —|— as designed —|— כמו בעיצוב —")}</option>
              {fits.map((f) => <option key={f.id} value={f.id}>◆ {words(f.name, lang) || f.id}</option>)}
              {prop === "href" ? <option value="$url">◆ {say("صفحة العنصر|The item's page|דף הפריט")}</option> : null}
              {live && WORDS_PROPS.has(prop) ? <option value="$by">◆ {say("مين ضاف السطر|Who added the row|מי שהוסיף את השורה")}</option> : null}
            </select>
          </label>
        );
      })}
    </div>
  );
}
