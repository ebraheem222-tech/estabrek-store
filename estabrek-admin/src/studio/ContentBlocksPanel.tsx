/**
 * The panels of the content blocks (accordion, testimonials, pricing, team, logos, notice,
 * running words): each block's own settings and its list of items, where items are added,
 * removed and moved up or down, and each item's words (in the language shown), links,
 * pictures, stars and switches are changed. One change = one step back with undo.
 */
import { useState } from "react";
import { COUNTDOWN_WORD_FIELDS, defaultPartWords } from "../../../shared/partWords";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { MediaLibraryModal } from "../components/media/MediaLibraryModal";
import type { Lang } from "../lib/lang";
import { tr } from "../lib/words";
import { Range } from "./LookPanels";
import { Field } from "./StudioPanels";
import { Choice } from "./StudioTreePanels";
import { newItem, type BlockKind } from "./blockDefaults";
import { ReferenceDataPanel } from "./ReferenceDataPanels";

type Ops = (label: string, ops: PageDraftOp[]) => void;
type Item = Record<string, unknown>;
type FieldSpec = { key: string; label: () => string; kind: "words" | "long" | "link" | "image" | "stars" | "toggle" | "percent"; max?: number; required?: boolean };
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
  filterGallery: {
    max: 40, title: "title",
    fields: [
      { key: "title", label: () => tr("العنوان", "Title"), kind: "words", max: 160 },
      { key: "image", label: () => tr("الصورة", "Picture"), kind: "image", required: true },
      { key: "text", label: () => tr("الكلام (اختياري)", "Words (optional)"), kind: "long", max: 1200 },
      { key: "category", label: () => tr("الفئة (اختياري)", "Category (optional)"), kind: "words", max: 80 },
      { key: "href", label: () => tr("الرابط (اختياري)", "Link (optional)"), kind: "link" },
      { key: "cta", label: () => tr("كلام الرابط", "Link words"), kind: "words", max: 60 },
    ],
  },
  showcase: {
    max: 8, title: "title",
    fields: [
      { key: "title", label: () => tr("العنوان", "Title"), kind: "words", max: 160 },
      { key: "text", label: () => tr("الكلام (اختياري)", "Words (optional)"), kind: "long", max: 1200 },
      { key: "image", label: () => tr("الصورة", "Picture"), kind: "image" },
      { key: "href", label: () => tr("الرابط (اختياري)", "Link (optional)"), kind: "link" },
      { key: "cta", label: () => tr("كلام الرابط", "Link words"), kind: "words", max: 60 },
    ],
  },
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
      { key: "yearlyPrice", label: () => tr("السعر السنوي (اختياري)", "Yearly price (optional)"), kind: "words", max: 40 },
      { key: "yearlyPeriod", label: () => tr("الفترة السنوية (اختياري)", "Yearly period (optional)"), kind: "words", max: 40 },
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
  tabs: {
    max: 12, title: "label",
    fields: [
      { key: "label", label: () => tr("اسم التبويب", "Tab name"), kind: "words" },
      { key: "text", label: () => tr("الكلام", "The words"), kind: "long" },
      { key: "image", label: () => tr("صورة (اختياري)", "Picture (optional)"), kind: "image" },
    ],
  },
  hotspots: {
    max: 20, title: "title",
    fields: [
      { key: "x", label: () => tr("مكانها بالعرض (من الشمال)", "Across (from the left)"), kind: "percent" },
      { key: "y", label: () => tr("مكانها بالطول (من فوق)", "Down (from the top)"), kind: "percent" },
      { key: "title", label: () => tr("العنوان", "Title"), kind: "words" },
      { key: "text", label: () => tr("الكلام (اختياري)", "Words (optional)"), kind: "long" },
      { key: "href", label: () => tr("رابط (اختياري)", "Link (optional)"), kind: "link" },
    ],
  },
  menu: {
    max: 20, title: "label",
    fields: [
      { key: "label", label: () => tr("الكلام", "The words"), kind: "words" },
      { key: "href", label: () => tr("الرابط", "The link"), kind: "link" },
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
            return <Field key={f.key} label={f.label()} multiline={f.kind === "long"} value={wordsOf(v, lang)} onSave={(t) => put(f.key, withWords(v, lang, f.max ? t.slice(0, f.max) : t))} testId={`block-item-${f.key}`} />;
          case "link":
            return (
              <Field key={f.key} label={f.label()} value={typeof v === "string" ? v : ""} testId={`block-item-${f.key}`} onSave={(t) => {
                const s = t.trim();
                if (!s) put(f.key, undefined);
                else if (s.length <= 500 && SAFE_LINK.test(s)) put(f.key, s);
              }} />
            );
          case "image":
            return (
              <div key={f.key} className="flex items-center gap-2 text-[11px] text-white/55">
                {typeof v === "string" && v ? <img src={v} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-md bg-white/[0.06]">—</span>}
                <span className="min-w-0 flex-1">{f.label()}</span>
                <button type="button" className={btn} disabled={busy} onClick={() => setPicking(f.key)} data-testid={`block-item-pick-${f.key}`}>{tr("اختاري", "Choose")}</button>
                {typeof v === "string" && v && f.key !== "src" && !f.required ? <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => put(f.key, undefined)}>{tr("شيل", "Remove")}</button> : null}
              </div>
            );
          case "stars":
            return <Choice key={f.key} label={f.label()} value={String(v ?? "")} busy={busy} options={[["", tr("بلا", "None")], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]]} onPick={(s) => put(f.key, s ? Number(s) : undefined)} />;
          case "percent":
            return <Range key={f.key} label={f.label()} min={0} max={100} unit="%" busy={busy} value={typeof v === "number" ? v : 50} onSave={(n) => put(f.key, n)} testId={`block-item-${f.key}`} />;
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
  const save = (label: string, next: Item[], openAt?: number, initial?: number) => {
    const active = kind === "showcase" ? { initial: Math.max(0, Math.min(next.length - 1, initial ?? (Number(p.initial) || 0))) } : {};
    onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...p, items: next, ...active } }]);
    if (openAt !== undefined) setOpen(openAt);
  };
  const move = (i: number, by: number) => {
    const next = [...items];
    const [it] = next.splice(i, 1);
    next.splice(i + by, 0, it);
    const initial = Number(p.initial) || 0;
    save(tr("ترتيب", "Order"), next, i + by, initial === i ? i + by : initial === i + by ? i : initial);
  };
  return (
    <div className="space-y-1.5" data-testid="block-items">
      {items.map((it, i) => (
        <details key={i} open={open === i} className="rounded-lg border border-white/[0.08] px-2 py-1.5" data-item={i}>
          <summary className="flex cursor-pointer select-none items-center gap-2 text-[11px] text-white/75" onClick={(e) => { e.preventDefault(); setOpen(open === i ? -1 : i); }}>
            <span className="min-w-0 flex-1 truncate">{i + 1}. {wordsOf(it[spec.title], lang) || tr("بلا اسم", "Unnamed")}</span>
            <button type="button" className={btn} disabled={busy || i === 0} onClick={(e) => { e.stopPropagation(); move(i, -1); }} aria-label={tr("لفوق", "Up")}>↑</button>
            <button type="button" className={btn} disabled={busy || i === items.length - 1} onClick={(e) => { e.stopPropagation(); move(i, 1); }} aria-label={tr("لتحت", "Down")}>↓</button>
            <button type="button" className={`${btn} text-red-300`} disabled={busy || ((kind === "showcase" || kind === "filterGallery") && items.length <= 1)} onClick={(e) => { e.stopPropagation(); const initial = Number(p.initial) || 0; save(tr("شيل", "Remove"), items.filter((_, j) => j !== i), Math.max(0, Math.min(open, items.length - 2)), initial > i ? initial - 1 : initial); }} aria-label={tr("شيل", "Remove")} data-testid="block-item-remove">✕</button>
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

/** A picture of the element's own, chosen from the media library. */
function PictureField({ label, value, busy, onPick, testId }: { label: string; value: unknown; busy: boolean; onPick: (url: string) => void; testId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2 text-[11px] text-white/55">
      {typeof value === "string" && value ? <img src={value} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-md bg-white/[0.06]">—</span>}
      <span className="min-w-0 flex-1">{label}</span>
      <button type="button" className={btn} disabled={busy} onClick={() => setOpen(true)} data-testid={testId}>{tr("اختاري", "Choose")}</button>
      <MediaLibraryModal open={open} onClose={() => setOpen(false)} title={label} onSelect={(u) => { setOpen(false); onPick(u); }} />
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
  if (node.type === "schedule" || node.type === "comparison") return <ReferenceDataPanel node={node} lang={lang} busy={busy} onOps={onOps} />;
  const p = (node.props ?? {}) as Item;
  const set = (label: string, patch: Item) => onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...p, ...patch } }]);
  const kind = node.type as BlockKind;
  const toggle = (key: string, label: string, defaultValue = false) => (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-white/75">{label}</span>
      <input type="checkbox" disabled={busy} checked={p[key] === undefined ? defaultValue : p[key] === true} onChange={(e) => set(label, { [key]: e.target.checked })} data-testid={`block-${key}`} />
    </label>
  );
  const words = (key: string, label: string, multiline = false) => <Field label={label} multiline={multiline} value={wordsOf(p[key], lang)} onSave={(v) => set(tr("تعديل", "Edit"), { [key]: withWords(p[key], lang, v) })} testId={`block-${key}`} />;
  return (
    <div className={box} data-testid="studio-block">
      {kind === "filterGallery" ? (
        <>
          <Choice label={tr("شكل المعرض", "Gallery presentation")} value={String(p.presentation ?? "cards")} busy={busy} options={[["cards", tr("بطاقات", "Cards")], ["index", tr("فهرس أعمال", "Work index")]]} onPick={presentation => set(tr("شكل المعرض", "Gallery presentation"), { presentation })} />
          <Choice label={tr("توزيع صور مميز", "Bento image layout")} value={p.layout === "bento" ? "bento" : "standard"} busy={busy} options={[["standard", tr("التوزيع الحالي", "Current layout")], ["bento", "Bento"]]} onPick={layout => set(tr("الترتيب", "Layout"), { layout: layout === "bento" ? layout : "grid" })} />
          {toggle("filters", tr("إظهار فلاتر المعرض", "Show gallery filters"), true)}
          {toggle("showCount", tr("إظهار عدد النتائج", "Show result count"), true)}
          <Choice label={tr("صورة المعاينة الأولى", "Initial preview image")} value={String(p.initial ?? 0)} busy={busy} options={[["-1", tr("مساحة فارغة حتى التفاعل", "Blank until interaction")], ...(Array.isArray(p.items) ? p.items : []).map((_: unknown, i: number) => [String(i), String(i + 1)] as [string, string])]} onPick={value => set(tr("صورة المعاينة الأولى", "Initial preview image"), { initial: Number(value) })} />
          <Field label={tr("اسم المعرض", "Gallery label")} value={wordsOf(p.label, lang)} onSave={(value) => set(tr("اسم المعرض", "Gallery label"), { label: withWords(p.label, lang, value.slice(0, 160)) })} testId="filterGallery-label" />
          <Choice label={tr("الترتيب", "Layout")} value={String(p.layout ?? "grid")} busy={busy} options={[["grid", tr("شبكة", "Grid")], ["masonry", tr("صور متراصة", "Masonry")], ["split", tr("معاينة مقسومة", "Split preview")]]} onPick={(value) => set(tr("الترتيب", "Layout"), { layout: value })} testId="filterGallery-layout" />
          <Range label={tr("الأعمدة", "Columns")} min={1} max={6} value={typeof p.columns === "number" ? p.columns : 3} busy={busy} onSave={(value) => set(tr("الأعمدة", "Columns"), { columns: value })} testId="filterGallery-columns" />
          <Range label={tr("المسافة", "Gap")} min={0} max={48} unit="px" value={typeof p.gap === "number" ? p.gap : 20} busy={busy} onSave={(value) => set(tr("المسافة", "Gap"), { gap: value })} testId="filterGallery-gap" />
          <Choice label={tr("تأثير مرور الماوس", "Hover effect")} value={String(p.hoverEffect ?? "none")} busy={busy} options={[["none", tr("بلا", "None")], ["zoom", tr("تقريب", "Zoom")], ["tilt", tr("ميلان", "Tilt")], ["reveal", tr("ظهور", "Reveal")]]} onPick={(value) => set(tr("تأثير مرور الماوس", "Hover effect"), { hoverEffect: value })} testId="filterGallery-hoverEffect" />
          <Choice label={tr("تفعيل المعاينة", "Preview activation")} value={String(p.activation ?? "click")} busy={busy} options={[["click", tr("بالضغط", "Click")], ["hover", tr("بمرور الماوس", "Hover")]]} onPick={(value) => set(tr("تفعيل المعاينة", "Preview activation"), { activation: value })} testId="filterGallery-activation" />
          {toggle("lightbox", tr("عرض الصورة المكبرة", "Lightbox"))}
          {toggle("searchable", tr("بحث في المعرض", "Search gallery"))}
        </>
      ) : null}
      {kind === "showcase" ? (
        <>
          <Choice label={tr("المظهر", "Appearance")} value={String(p.look ?? "default")} busy={busy} options={[["default", tr("افتراضي", "Default")], ["clay", tr("بطاقات طينية ناعمة", "Soft clay cards")]]} onPick={look => set(tr("المظهر", "Appearance"), { look })} />
          <Field label={tr("اسم المعرض", "Gallery label")} value={wordsOf(p.label, lang)} onSave={(value) => set(tr("اسم المعرض", "Gallery label"), { label: withWords(p.label, lang, value.slice(0, 160)) })} testId="showcase-label" />
          <Choice label={tr("الترتيب", "Layout")} value={String(p.layout ?? "horizontal")} busy={busy} options={[["horizontal", tr("أفقي", "Horizontal")], ["vertical", tr("عمودي", "Vertical")]]} onPick={(value) => set(tr("الترتيب", "Layout"), { layout: value })} testId="showcase-layout" />
          <Choice label={tr("التوسيع", "Expansion")} value={String(p.activation ?? "click")} busy={busy} options={[["click", tr("بالضغط", "Click")], ["hover", tr("بمرور الماوس", "Hover")]]} onPick={(value) => set(tr("التوسيع", "Expansion"), { activation: value })} testId="showcase-activation" />
          <Choice label={tr("المفتوحة أولاً", "Initially expanded")} value={String(p.initial ?? 0)} busy={busy} options={(Array.isArray(p.items) ? p.items : []).map((item, i) => [String(i), `${i + 1}. ${wordsOf((item as Item).title, lang)}`])} onPick={(value) => set(tr("المفتوحة أولاً", "Initially expanded"), { initial: Number(value) })} testId="showcase-initial" />
          <Range label={tr("نسبة التوسيع", "Expansion ratio")} min={2} max={6} step={0.1} value={typeof p.ratio === "number" ? p.ratio : 4} busy={busy} onSave={(value) => set(tr("نسبة التوسيع", "Expansion ratio"), { ratio: value })} testId="showcase-ratio" />
          <Range label={tr("الارتفاع", "Height")} min={240} max={800} unit="px" value={typeof p.height === "number" ? p.height : 480} busy={busy} onSave={(value) => set(tr("الارتفاع", "Height"), { height: value })} testId="showcase-height" />
          <Range label={tr("مدة الانتقال", "Transition duration")} min={0} max={1.5} step={0.05} unit="s" value={typeof p.duration === "number" ? p.duration : 0.55} busy={busy} onSave={(value) => set(tr("مدة الانتقال", "Transition duration"), { duration: value })} testId="showcase-duration" />
          <Range label={tr("تعتيم الصورة", "Image overlay")} min={0} max={0.9} step={0.05} value={typeof p.overlay === "number" ? p.overlay : 0.5} busy={busy} onSave={(value) => set(tr("تعتيم الصورة", "Image overlay"), { overlay: value })} testId="showcase-overlay" />
        </>
      ) : null}
      {kind === "accordion" ? (
        <>
          <Choice label={tr("الشكل", "Look")} value={String(p.look ?? "lines")} busy={busy} options={[["lines", tr("خطوط", "Lines")], ["cards", tr("كروت", "Cards")], ["plus", tr("زائد وناقص", "Plus and minus")]]} onPick={(v) => set(tr("الشكل", "Look"), { look: v })} testId="block-look" />
          {toggle("single", tr("واحد مفتوح بس بنفس الوقت", "Only one open at a time"))}
          {p.single !== true ? toggle("controls", tr("أزرار فتح وإغلاق الكل", "Expand and collapse all controls")) : null}
          <p className="text-[10px] leading-4 text-white/35">{tr("الأسئلة بتنعرض لمحركات البحث كأسئلة شائعة.", "The questions show to search engines as an FAQ.")}</p>
        </>
      ) : null}
      {kind === "pricing" ? (
        <>
          {toggle("billing", tr("التبديل بين فترات الدفع", "Billing switch"))}
          <Choice label={tr("فترة الدفع الأولى", "Initial billing")} value={p.initialBilling === "yearly" ? "yearly" : "monthly"} busy={busy} options={[["monthly", tr("شهري", "Monthly")], ["yearly", tr("سنوي", "Yearly")]]} onPick={(value) => set(tr("فترة الدفع الأولى", "Initial billing"), { initialBilling: value })} testId="pricing-initialBilling" />
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
      {kind === "countdown" ? (
        <>
          <label className="block text-[11px] text-white/55">
            {tr("لحد إمتى (بوقت المتجر)", "Until when (the shop's time)")}
            <input
              type="datetime-local" dir="ltr" disabled={busy} defaultValue={typeof p.until === "string" ? p.until.slice(0, 16) : ""} key={String(p.until)}
              className="mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white"
              onChange={(e) => e.target.value && set(tr("موعد العدّ", "Countdown time"), { until: e.target.value })} data-testid="block-until"
            />
          </label>
          <Choice label={tr("الشكل", "Look")} value={String(p.look ?? "boxes")} busy={busy} options={[["boxes", tr("مربعات", "Boxes")], ["plain", tr("أرقام بس", "Numbers only")]]} onPick={(v) => set(tr("الشكل", "Look"), { look: v })} testId="block-look" />
          {words("done", tr("الكلام لما يخلص (فاضي = بيختفي)", "The words when it ends (empty = it goes)"))}
          {COUNTDOWN_WORD_FIELDS.map(key => <Field key={key} label={defaultPartWords("countdown", key)![lang]} value={wordsOf(p[key], lang) || defaultPartWords("countdown", key)![lang]} maxLength={40} onSave={value => set(tr("الكلام", "The words"), { [key]: withWords(p[key], lang, value.slice(0, 40)) })} testId={`block-${key}`} />)}
        </>
      ) : null}
      {kind === "beforeAfter" ? (
        <>
          <PictureField label={tr("صورة «قبل»", "The “before” picture")} value={p.before} busy={busy} onPick={(u) => set(tr("صورة قبل", "Before picture"), { before: u })} testId="block-before" />
          <PictureField label={tr("صورة «بعد»", "The “after” picture")} value={p.after} busy={busy} onPick={(u) => set(tr("صورة بعد", "After picture"), { after: u })} testId="block-after" />
          {words("beforeLabel", tr("كلمة «قبل» (فاضي = قبل)", "The “before” word (empty = Before)"))}
          {words("afterLabel", tr("كلمة «بعد» (فاضي = بعد)", "The “after” word (empty = After)"))}
          <Range label={tr("وين بيبلّش المقبض", "Where the handle starts")} min={0} max={100} unit="%" busy={busy} value={typeof p.start === "number" ? p.start : 50} onSave={(v) => set(tr("المقبض", "Handle"), { start: v })} testId="block-start" />
        </>
      ) : null}
      {kind === "hotspots" ? (
        <>
          <PictureField label={tr("الصورة", "The picture")} value={p.src} busy={busy} onPick={(u) => set(tr("الصورة", "Picture"), { src: u })} testId="block-src" />
          {words("alt", tr("وصفها لقارئ الشاشة", "Its description for screen readers"))}
          <p className="text-[10px] leading-4 text-white/35">{tr("كل نقطة بتفتح كرت صغير. مكانها بالنسبة للصورة نفسها.", "Each point opens a little card. Its place is measured on the picture itself.")}</p>
        </>
      ) : null}
      {kind === "map" ? (
        <>
          <Field label={tr("العنوان أو المكان", "The address or place")} value={typeof p.query === "string" ? p.query : ""} onSave={(v) => v.trim().length >= 2 && set(tr("الخريطة", "Map"), { query: v.trim().slice(0, 200) })} testId="block-query" />
          <Range label={tr("التقريب", "Zoom")} min={1} max={20} busy={busy} value={typeof p.zoom === "number" ? p.zoom : 14} onSave={(v) => set(tr("الخريطة", "Map"), { zoom: v })} testId="block-zoom" />
          {words("label", tr("اسمها لقارئ الشاشة", "Its name for screen readers"))}
          <p className="text-[10px] leading-4 text-white/35">{tr("الخريطة من خرائط Google، وبتتحمّل بس لما توصلها الصفحة.", "The map comes from Google Maps, and loads only when the page gets to it.")}</p>
        </>
      ) : null}
      {kind === "search" ? (
        <>
          <Choice
            label={tr("الشكل", "Look")} value={String(p.look ?? "pill")} busy={busy} testId="block-look"
            options={[["pill", tr("كبسولة", "Pill")], ["rounded", tr("زوايا ناعمة", "Soft corners")], ["boxed", tr("مربع", "Square")], ["underline", tr("خط تحت", "Underline")], ["glass", tr("زجاج", "Glass")]]}
            onPick={(v) => set(tr("الشكل", "Look"), { look: v })}
          />
          {words("placeholder", tr("الكلام جوّا الخانة (فاضي = متل المتجر)", "The words inside it (empty = the shop's)"))}
          {words("button", tr("كلام الزر (فاضي = سهم)", "Button words (empty = an arrow)"))}
          <p className="text-[10px] leading-4 text-white/35">{tr("بيبعت لصفحة البحث بالمتجر.", "It sends to the shop's search page.")}</p>
        </>
      ) : null}
      {kind === "menu" ? (
        <>
          <Choice label={tr("الترتيب", "Layout")} value={String(p.layout ?? "row")} busy={busy} options={[["row", tr("بصف", "In a row")], ["column", tr("بعمود", "In a column")]]} onPick={(v) => set(tr("الترتيب", "Layout"), { layout: v })} testId="block-layout" />
          <Choice
            label={tr("الشكل", "Look")} value={String(p.look ?? "plain")} busy={busy} testId="block-look"
            options={[["plain", tr("عادي", "Plain")], ["underline", tr("خط تحت", "Underline")], ["pills", tr("كبسولات", "Pills")], ["buttons", tr("أزرار", "Buttons")]]}
            onPick={(v) => set(tr("الشكل", "Look"), { look: v })}
          />
          <label className="flex items-center justify-between gap-2 text-xs">
            <span className="text-white/75">{tr("على الموبايل بتنطوي تحت زر", "Folds under a button on a phone")}</span>
            <input type="checkbox" disabled={busy} checked={p.phone === "fold"} onChange={(e) => set(tr("القائمة", "Menu"), { phone: e.target.checked ? "fold" : undefined })} data-testid="block-fold" />
          </label>
          {words("label", tr("اسمها لقارئ الشاشة (فاضي = القائمة)", "Its name for screen readers (empty = Menu)"))}
        </>
      ) : null}
      {kind === "tabs" ? <Choice label={tr("الشكل", "Look")} value={String(p.look ?? "underline")} busy={busy} options={[["underline", tr("خط تحت", "Underline")], ["pills", tr("كبسولات", "Pills")], ["boxed", tr("مربعات", "Boxes")]]} onPick={(v) => set(tr("الشكل", "Look"), { look: v })} testId="block-look" /> : null}
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

/** A popup's moment (on arrival, at a share of the scroll, as the mouse leaves, from a link), how often, its size and place. */
export function PopupPanel({ node, lang, busy, onOps }: { node: PageTreeNode; lang: Lang; busy: boolean; onOps: Ops }) {
  const p = (node.props ?? {}) as Item;
  const set = (label: string, patch: Item) => onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...p, ...patch } }]);
  const trigger = String(p.trigger ?? "load");
  return (
    <div className={box} data-testid="studio-popup">
      <div className="text-xs font-medium text-white/70">{tr("النافذة المنبثقة", "The popup")}</div>
      <p className="text-[10px] leading-4 text-white/40">{tr("بالمحرر بتبيّن مفتوحة بمكانها لتعدّلي محتواها. بالمتجر بتطلع فوق الصفحة.", "In the editor it stays open in its place so its content can be edited. In the shop it shows over the page.")}</p>
      <Choice
        label={tr("إمتى بتطلع", "When it shows")} value={trigger} busy={busy} testId="popup-trigger"
        options={[["load", tr("لما تفتح الصفحة", "When the page opens")], ["scroll", tr("بعد شوي سكرول", "After some scrolling")], ["exit", tr("لما الماوس يطلع", "As the mouse leaves")], ["click", tr("من رابط أو زر", "From a link or button")]]}
        onPick={(v) => set(tr("إمتى بتطلع", "When it shows"), { trigger: v })}
      />
      {trigger === "load" ? <Range label={tr("بعد", "After")} min={0} max={60} unit="s" busy={busy} value={typeof p.delay === "number" ? p.delay : 3} onSave={(v) => set(tr("التأخير", "Delay"), { delay: v })} testId="popup-delay" /> : null}
      {trigger === "scroll" ? <Range label={tr("لما توصل", "Once down")} min={5} max={100} unit="%" busy={busy} value={typeof p.scroll === "number" ? p.scroll : 50} onSave={(v) => set(tr("السكرول", "Scroll"), { scroll: v })} testId="popup-scroll" /> : null}
      <Field
        label={tr("اسمها للروابط (رابط لـ #الاسم بيفتحها)", "Its name for links (a link to #name opens it)")} value={typeof p.anchor === "string" ? p.anchor : ""} testId="popup-anchor"
        onSave={(v) => {
          const a = v.trim().replace(/^#/, "");
          if (!a) set(tr("الاسم", "Name"), { anchor: undefined });
          else if (/^[A-Za-z][\w-]{0,40}$/.test(a)) set(tr("الاسم", "Name"), { anchor: a });
        }}
      />
      <Choice
        label={tr("قديش بتطلع", "How often")} value={String(p.often ?? "visit")} busy={busy} testId="popup-often"
        options={[["visit", tr("مرة كل زيارة", "Once a visit")], ["day", tr("مرة باليوم", "Once a day")], ["once", tr("مرة وحدة بس", "Once ever")], ["always", tr("كل مرة", "Every time")]]}
        onPick={(v) => set(tr("قديش بتطلع", "How often"), { often: v })}
      />
      <Choice label={tr("الحجم", "Size")} value={String(p.size ?? "m")} busy={busy} options={[["s", tr("صغيرة", "Small")], ["m", tr("وسط", "Medium")], ["l", tr("كبيرة", "Large")]]} onPick={(v) => set(tr("الحجم", "Size"), { size: v })} testId="popup-size" />
      <Choice label={tr("مكانها", "Where")} value={String(p.place ?? "center")} busy={busy} options={[["center", tr("بالنص (والصفحة بتغمق)", "Centre (the page dims)")], ["bottom", tr("تحت", "Bottom")], ["corner", tr("بالزاوية", "Corner")]]} onPick={(v) => set(tr("مكانها", "Where"), { place: v })} testId="popup-place" />
      <Field label={tr("اسمها لقارئ الشاشة", "Its name for screen readers")} value={wordsOf(p.label, lang)} onSave={(v) => set(tr("تعديل", "Edit"), { label: withWords(p.label, lang, v) })} />
    </div>
  );
}
