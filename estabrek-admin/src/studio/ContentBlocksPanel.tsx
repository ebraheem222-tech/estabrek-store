/**
 * The panels of the content blocks (accordion, testimonials, pricing, team, logos, notice,
 * running words): each block's own settings and its list of items, where items are added,
 * removed and moved up or down, and each item's words (in the language shown), links,
 * pictures, stars and switches are changed. One change = one step back with undo.
 */
import { useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { MediaLibraryModal } from "../components/media/MediaLibraryModal";
import type { Lang } from "../lib/lang";
import { tr } from "../lib/words";
import { Range } from "./LookPanels";
import { Field } from "./StudioPanels";
import { Choice } from "./StudioTreePanels";
import { newItem, type BlockKind } from "./blockDefaults";

type Ops = (label: string, ops: PageDraftOp[]) => void;
type Item = Record<string, unknown>;
type FieldSpec = { key: string; label: () => string; kind: "words" | "long" | "link" | "image" | "stars" | "toggle" };
const box = "space-y-2.5 rounded-xl border border-white/[0.08] p-3";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
const SAFE_LINK = /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)[^\s<>"'`\\]*$/i;

const wordsOf = (t: unknown, lang: Lang) => (t && typeof t === "object" ? String((t as Record<string, string>)[lang] ?? "") : typeof t === "string" ? t : "");
const withWords = (t: unknown, lang: Lang, v: string) => {
  const out = { ...(t && typeof t === "object" ? (t as Record<string, string>) : {}) };
  if (v.trim()) out[lang] = v;
  else delete out[lang];
  return out;
};

/** Each block's item fields, its most items, and the field naming an item in the list. */
const ITEMS: Partial<Record<BlockKind, { fields: FieldSpec[]; max: number; title: string }>> = {
  accordion: {
    max: 30, title: "q",
    fields: [
      { key: "q", label: () => tr("السؤال", "Question"), kind: "words" },
      { key: "a", label: () => tr("الجواب", "Answer"), kind: "long" },
      { key: "open", label: () => tr("مفتوح من الأول", "Open at first"), kind: "toggle" },
    ],
  },
  testimonials: {
    max: 24, title: "name",
    fields: [
      { key: "quote", label: () => tr("كلامها", "What they said"), kind: "long" },
      { key: "name", label: () => tr("الاسم", "Name"), kind: "words" },
      { key: "role", label: () => tr("مين هي (اختياري)", "Who they are (optional)"), kind: "words" },
      { key: "photo", label: () => tr("صورتها (اختياري)", "Their photo (optional)"), kind: "image" },
      { key: "stars", label: () => tr("النجوم", "Stars"), kind: "stars" },
    ],
  },
  pricing: {
    max: 6, title: "name",
    fields: [
      { key: "name", label: () => tr("اسم الخطة", "Plan name"), kind: "words" },
      { key: "price", label: () => tr("السعر", "Price"), kind: "words" },
      { key: "period", label: () => tr("كل قديش (اختياري)", "Per (optional)"), kind: "words" },
      { key: "features", label: () => tr("المزايا (كل وحدة بسطر)", "Features (one per line)"), kind: "long" },
      { key: "badge", label: () => tr("شارة (اختياري)", "Badge (optional)"), kind: "words" },
      { key: "featured", label: () => tr("بارزة", "Stands out"), kind: "toggle" },
      { key: "cta", label: () => tr("كلام الزر", "Button words"), kind: "words" },
      { key: "href", label: () => tr("رابط الزر", "Button link"), kind: "link" },
    ],
  },
  team: {
    max: 24, title: "name",
    fields: [
      { key: "name", label: () => tr("الاسم", "Name"), kind: "words" },
      { key: "role", label: () => tr("الدور", "Role"), kind: "words" },
      { key: "photo", label: () => tr("الصورة", "Photo"), kind: "image" },
      { key: "href", label: () => tr("رابط (اختياري)", "Link (optional)"), kind: "link" },
    ],
  },
  logos: {
    max: 40, title: "alt",
    fields: [
      { key: "src", label: () => tr("الشعار", "Logo"), kind: "image" },
      { key: "alt", label: () => tr("اسمه لقارئ الشاشة", "Its name for screen readers"), kind: "words" },
      { key: "href", label: () => tr("رابط (اختياري)", "Link (optional)"), kind: "link" },
    ],
  },
};

function ItemFields({ item, fields, lang, busy, onSave }: { item: Item; fields: FieldSpec[]; lang: Lang; busy: boolean; onSave: (next: Item) => void }) {
  const [picking, setPicking] = useState<string | null>(null);
  const put = (key: string, v: unknown) => onSave({ ...item, [key]: v });
  return (
    <div className="space-y-2">
      {fields.map((f) => {
        const v = item[f.key];
        switch (f.kind) {
          case "words":
          case "long":
            return <Field key={f.key} label={f.label()} multiline={f.kind === "long"} value={wordsOf(v, lang)} onSave={(t) => put(f.key, withWords(v, lang, t))} testId={`block-item-${f.key}`} />;
          case "link":
            return (
              <Field key={f.key} label={f.label()} value={typeof v === "string" ? v : ""} testId={`block-item-${f.key}`} onSave={(t) => {
                const s = t.trim();
                if (!s) put(f.key, undefined);
                else if (SAFE_LINK.test(s)) put(f.key, s);
              }} />
            );
          case "image":
            return (
              <div key={f.key} className="flex items-center gap-2 text-[11px] text-white/55">
                {typeof v === "string" && v ? <img src={v} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-md bg-white/[0.06]">—</span>}
                <span className="min-w-0 flex-1">{f.label()}</span>
                <button type="button" className={btn} disabled={busy} onClick={() => setPicking(f.key)} data-testid={`block-item-pick-${f.key}`}>{tr("اختاري", "Choose")}</button>
                {typeof v === "string" && v && f.key !== "src" ? <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => put(f.key, undefined)}>{tr("شيل", "Remove")}</button> : null}
              </div>
            );
          case "stars":
            return <Choice key={f.key} label={f.label()} value={String(v ?? "")} busy={busy} options={[["", tr("بلا", "None")], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]]} onPick={(s) => put(f.key, s ? Number(s) : undefined)} />;
          case "toggle":
            return (
              <label key={f.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-white/75">{f.label()}</span>
                <input type="checkbox" disabled={busy} checked={v === true} onChange={(e) => put(f.key, e.target.checked || undefined)} data-testid={`block-item-${f.key}`} />
              </label>
            );
        }
      })}
      <MediaLibraryModal open={picking !== null} onClose={() => setPicking(null)} title={tr("صورة", "Picture")} onSelect={(u) => { const k = picking!; setPicking(null); put(k, u); }} />
    </div>
  );
}

/** A block's list: each item folded under its name, moved, removed; a new one added at the end. */
function ItemsEditor({ node, kind, lang, busy, onOps }: { node: PageTreeNode; kind: BlockKind; lang: Lang; busy: boolean; onOps: Ops }) {
  const spec = ITEMS[kind]!;
  const p = (node.props ?? {}) as Item;
  const items = (Array.isArray(p.items) ? p.items : []) as Item[];
  const [open, setOpen] = useState(0);
  const [adding, setAdding] = useState(false);
  const save = (label: string, next: Item[], openAt?: number) => {
    onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...p, items: next } }]);
    if (openAt !== undefined) setOpen(openAt);
  };
  const move = (i: number, by: number) => {
    const next = [...items];
    const [it] = next.splice(i, 1);
    next.splice(i + by, 0, it);
    save(tr("ترتيب", "Order"), next, i + by);
  };
  return (
    <div className="space-y-1.5" data-testid="block-items">
      {items.map((it, i) => (
        <details key={i} open={open === i} className="rounded-lg border border-white/[0.08] px-2 py-1.5" data-item={i}>
          <summary className="flex cursor-pointer select-none items-center gap-2 text-[11px] text-white/75" onClick={(e) => { e.preventDefault(); setOpen(open === i ? -1 : i); }}>
            <span className="min-w-0 flex-1 truncate">{i + 1}. {wordsOf(it[spec.title], lang) || tr("بلا اسم", "Unnamed")}</span>
            <button type="button" className={btn} disabled={busy || i === 0} onClick={(e) => { e.stopPropagation(); move(i, -1); }} aria-label={tr("لفوق", "Up")}>↑</button>
            <button type="button" className={btn} disabled={busy || i === items.length - 1} onClick={(e) => { e.stopPropagation(); move(i, 1); }} aria-label={tr("لتحت", "Down")}>↓</button>
            <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={(e) => { e.stopPropagation(); save(tr("شيل", "Remove"), items.filter((_, j) => j !== i)); }} aria-label={tr("شيل", "Remove")} data-testid="block-item-remove">✕</button>
          </summary>
          {open === i ? <div className="mt-2"><ItemFields item={it} fields={spec.fields} lang={lang} busy={busy} onSave={(next) => save(tr("تعديل", "Edit"), items.map((x, j) => (j === i ? next : x)))} /></div> : null}
        </details>
      ))}
      {items.length < spec.max ? (
        <button
          type="button" className={`${btn} w-full`} disabled={busy} data-testid="block-item-add"
          onClick={() => (kind === "logos" ? setAdding(true) : save(tr("إضافة", "Add"), [...items, newItem(kind, lang, items.length) as Item], items.length))}
        >
          + {tr("أضيفي واحد", "Add one")}
        </button>
      ) : null}
      {kind === "logos" ? (
        // A logo starts from its picture (many at once).
        <MediaLibraryModal
          open={adding} multiple maxSelect={spec.max - items.length} onClose={() => setAdding(false)} title={tr("الشعارات", "Logos")}
          onSelect={(u) => { setAdding(false); save(tr("إضافة", "Add"), [...items, { src: u }], items.length); }}
          onSelectMultiple={(urls) => { setAdding(false); save(tr("إضافة", "Add"), [...items, ...urls.map((src) => ({ src }))], items.length); }}
        />
      ) : null}
    </div>
  );
}

/** Running words: each a line of words (in the language shown). */
function RunningWords({ node, lang, busy, onOps }: { node: PageTreeNode; lang: Lang; busy: boolean; onOps: Ops }) {
  const p = (node.props ?? {}) as Item;
  const items = (Array.isArray(p.items) ? p.items : []) as unknown[];
  const save = (next: unknown[]) => onOps(tr("الكلام الماشي", "Running words"), [{ op: "setProps", nodeId: node.id, props: { ...p, items: next } }]);
  return (
    <div className="space-y-1.5" data-testid="block-items">
      {items.map((t, i) => (
        <div key={i} className="flex items-end gap-1">
          <div className="min-w-0 flex-1"><Field label={`${i + 1}`} value={wordsOf(t, lang)} onSave={(v) => save(items.map((x, j) => (j === i ? withWords(x, lang, v) : x)))} testId="block-running" /></div>
          <button type="button" className={`${btn} mb-1 text-red-300`} disabled={busy || items.length < 2} onClick={() => save(items.filter((_, j) => j !== i))} aria-label={tr("شيل", "Remove")}>✕</button>
        </div>
      ))}
      {items.length < 20 ? <button type="button" className={`${btn} w-full`} disabled={busy} onClick={() => save([...items, newItem("marquee", lang, items.length)])} data-testid="block-item-add">+ {tr("أضيفي واحد", "Add one")}</button> : null}
    </div>
  );
}

export function ContentBlocksPanel({ node, lang, busy, onOps }: { node: PageTreeNode; lang: Lang; busy: boolean; onOps: Ops }) {
  const p = (node.props ?? {}) as Item;
  const set = (label: string, patch: Item) => onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...p, ...patch } }]);
  const kind = node.type as BlockKind;
  const toggle = (key: string, label: string) => (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-white/75">{label}</span>
      <input type="checkbox" disabled={busy} checked={p[key] === true} onChange={(e) => set(label, { [key]: e.target.checked || undefined })} data-testid={`block-${key}`} />
    </label>
  );
  const words = (key: string, label: string, multiline = false) => <Field label={label} multiline={multiline} value={wordsOf(p[key], lang)} onSave={(v) => set(tr("تعديل", "Edit"), { [key]: withWords(p[key], lang, v) })} testId={`block-${key}`} />;
  return (
    <div className={box} data-testid="studio-block">
      {kind === "accordion" ? (
        <>
          <Choice label={tr("الشكل", "Look")} value={String(p.look ?? "lines")} busy={busy} options={[["lines", tr("خطوط", "Lines")], ["cards", tr("كروت", "Cards")], ["plus", tr("زائد وناقص", "Plus and minus")]]} onPick={(v) => set(tr("الشكل", "Look"), { look: v })} testId="block-look" />
          {toggle("single", tr("واحد مفتوح بس بنفس الوقت", "Only one open at a time"))}
          <p className="text-[10px] leading-4 text-white/35">{tr("الأسئلة بتنعرض لمحركات البحث كأسئلة شائعة.", "The questions show to search engines as an FAQ.")}</p>
        </>
      ) : null}
      {kind === "testimonials" ? (
        <>
          <Choice label={tr("الترتيب", "Layout")} value={String(p.layout ?? "grid")} busy={busy} options={[["grid", tr("شبكة", "Grid")], ["row", tr("صف بيتسحب", "A sliding row")], ["single", tr("واحد كبير", "One large")]]} onPick={(v) => set(tr("الترتيب", "Layout"), { layout: v })} testId="block-layout" />
          {p.layout !== "row" && p.layout !== "single" ? <Range label={tr("الأعمدة", "Columns")} min={1} max={4} busy={busy} value={typeof p.columns === "number" ? p.columns : 3} onSave={(v) => set(tr("الأعمدة", "Columns"), { columns: v })} /> : null}
        </>
      ) : null}
      {kind === "team" ? <Range label={tr("الأعمدة", "Columns")} min={1} max={6} busy={busy} value={typeof p.columns === "number" ? p.columns : 4} onSave={(v) => set(tr("الأعمدة", "Columns"), { columns: v })} /> : null}
      {kind === "logos" ? (
        <>
          {toggle("gray", tr("رمادي لحد ما يمرّ الماوس", "Grey until the mouse comes over"))}
          {toggle("moving", tr("ماشيين بخط", "Moving along a line"))}
        </>
      ) : null}
      {kind === "alert" ? (
        <>
          <Choice
            label={tr("النوع", "Kind")} value={String(p.kind ?? "info")} busy={busy} testId="block-kind"
            options={[["info", tr("معلومة", "Info")], ["success", tr("نجاح", "Success")], ["warning", tr("تنبيه", "Warning")], ["danger", tr("خطر", "Danger")], ["promo", tr("عرض", "Offer")]]}
            onPick={(v) => set(tr("النوع", "Kind"), { kind: v })}
          />
          {words("title", tr("العنوان (اختياري)", "Title (optional)"))}
          {words("text", tr("الكلام", "The words"), true)}
          {toggle("close", tr("فيه زر إغلاق", "Has a close button"))}
        </>
      ) : null}
      {kind === "marquee" ? (
        <>
          <RunningWords node={node} lang={lang} busy={busy} onOps={onOps} />
          <Range label={tr("لفّة كاملة بتاخد", "One full loop takes")} min={4} max={120} unit="s" busy={busy} value={typeof p.speed === "number" ? p.speed : 30} onSave={(v) => set(tr("السرعة", "Speed"), { speed: v })} testId="block-speed" />
          {toggle("reverse", tr("بالعكس", "The other way"))}
          {toggle("pause", tr("بيوقف لما يمرّ الماوس", "Stops under the mouse"))}
          <Field label={tr("الفاصل بينهم", "Between them")} value={typeof p.separator === "string" ? p.separator : "•"} onSave={(v) => set(tr("الفاصل", "Separator"), { separator: v.trim().slice(0, 4) || undefined })} testId="block-separator" />
        </>
      ) : null}
      {ITEMS[kind] ? (
        <>
          <div className="pt-1 text-[11px] font-medium text-white/60">{tr("العناصر", "Items")}</div>
          <ItemsEditor node={node} kind={kind} lang={lang} busy={busy} onOps={onOps} />
        </>
      ) : null}
    </div>
  );
}
