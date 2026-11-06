import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { tr } from "../lib/words";
import { Field } from "./StudioPanels";
import { Choice } from "./StudioTreePanels";

type Props = { node: PageTreeNode; lang: Lang; busy: boolean; onOps: (label: string, ops: PageDraftOp[]) => void };
type Item = Record<string, unknown>;
const object = (value: unknown): Item => value && typeof value === "object" && !Array.isArray(value) ? value as Item : {};
const list = (value: unknown): Item[] => Array.isArray(value) ? value.map(object) : [];
const words = (value: unknown, lang: Lang) => typeof object(value)[lang] === "string" ? object(value)[lang] as string : "";
const localized = (value: unknown, lang: Lang, text: string, max: number) => ({ ...object(value), [lang]: text.slice(0, max) });
const move = <T,>(items: T[], index: number, offset: number) => {
  const next = [...items], to = index + offset;
  if (to >= 0 && to < next.length) [next[index], next[to]] = [next[to], next[index]];
  return next;
};
const SAFE_LINK = /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)[^\s<>"'`\\]*$/i;
const box = "space-y-3 rounded-xl border border-white/[0.08] p-3";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";

/** List edits, including column/value alignment, are one reversible setProps operation. */
export function ReferenceDataPanel({ node, lang, busy, onOps }: Props) {
  const p = node.props;
  const set = (patch: Item) => { if (!busy) onOps(tr("تعديل الجدول", "Edit table"), [{ op: "setProps", nodeId: node.id, props: { ...p, ...patch } }]); };
  const field = (id: string, label: string, value: unknown, save: (value: unknown) => void, max = 160, multiline = false) => <Field key={id} label={label} value={words(value, lang)} multiline={multiline} onSave={text => save(localized(value, lang, text, max))} testId={id} />;
  const toggle = (id: string, label: string, checked: boolean, save: (value: boolean) => void) => <label className="flex items-center justify-between gap-2 text-xs"><span>{label}</span><input type="checkbox" disabled={busy} checked={checked} onChange={event => save(event.target.checked)} data-testid={id} /></label>;
  const link = (id: string, value: unknown, save: (value: string | undefined) => void) => <Field key={id} label={tr("الرابط (اختياري)", "Link (optional)")} value={typeof value === "string" ? value : ""} onSave={text => { const href = text.trim(); if (!href || href.length <= 500 && SAFE_LINK.test(href)) save(href || undefined); }} testId={id} />;
  const actions = (prefix: string, index: number, count: number, reorder: (offset: number) => void, remove: () => void) => <div className="flex gap-2">
    <button type="button" className={btn} disabled={busy || index === 0} aria-label={tr("لفوق", "Up")} data-testid={`${prefix}-up-${index}`} onClick={() => reorder(-1)}>↑</button>
    <button type="button" className={btn} disabled={busy || index >= count - 1} aria-label={tr("لتحت", "Down")} data-testid={`${prefix}-down-${index}`} onClick={() => reorder(1)}>↓</button>
    <button type="button" className={btn} disabled={busy} data-testid={`${prefix}-remove-${index}`} onClick={remove}>{tr("حذف", "Remove")}</button>
  </div>;

  if (node.type === "schedule") {
    const items = list(p.items).slice(0, 40);
    const item = (index: number, patch: Item) => set({ items: items.map((value, i) => i === index ? { ...value, ...patch } : value) });
    return <fieldset className={box} disabled={busy} data-testid="studio-schedule">
      {field("schedule-label", tr("اسم البرنامج", "Schedule label"), p.label, label => set({ label }))}
      <Choice label={tr("الترتيب", "Layout")} value={String(p.layout ?? "cards")} options={[["cards", tr("بطاقات", "Cards")], ["table", tr("جدول", "Table")], ["timeline", tr("خط زمني", "Timeline")]]} busy={busy} onPick={layout => set({ layout })} testId="schedule-layout" />
      {toggle("schedule-filterDays", tr("فلترة حسب اليوم", "Filter by day"), p.filterDays === true, filterDays => set({ filterDays }))}
      {toggle("schedule-showLocation", tr("إظهار المكان", "Show location"), p.showLocation !== false, showLocation => set({ showLocation }))}
      {items.map((row, index) => <details key={index} className={box} open={index === 0}>
        <summary>{index + 1}. {words(row.title, lang) || tr("جلسة", "Session")}</summary>
        {actions("schedule", index, items.length, offset => set({ items: move(items, index, offset) }), () => set({ items: items.filter((_, i) => i !== index) }))}
        {field(`schedule-day-${index}`, tr("اليوم", "Day"), row.day, day => item(index, { day }), 80)}
        <Field label={tr("الوقت", "Time")} value={typeof row.time === "string" ? row.time : ""} onSave={time => item(index, { time: time.slice(0, 80) })} testId={`schedule-time-${index}`} />
        {field(`schedule-title-${index}`, tr("العنوان", "Title"), row.title, title => item(index, { title }))}
        {field(`schedule-text-${index}`, tr("الوصف", "Description"), row.text, text => item(index, { text }), 1200, true)}
        {field(`schedule-speaker-${index}`, tr("المتحدث", "Speaker"), row.speaker, speaker => item(index, { speaker }))}
        {field(`schedule-location-${index}`, tr("المكان", "Location"), row.location, location => item(index, { location }))}
        {link(`schedule-href-${index}`, row.href, href => item(index, { href }))}
      </details>)}
      <button type="button" className={btn} disabled={busy || items.length >= 40} data-testid="schedule-add" onClick={() => set({ items: [...items, { day: {}, time: "", title: {} }] })}>{tr("إضافة جلسة", "Add session")}</button>
    </fieldset>;
  }

  const columns = list(p.columns).slice(0, 6);
  const rows = list(p.rows).slice(0, 20).map((row): Item & { values: Item[] } => ({ ...row, values: columns.map((_, index) => object(Array.isArray(row.values) ? row.values[index] : null)) }));
  const column = (index: number, patch: Item) => set({ columns: columns.map((value, i) => i === index ? { ...value, ...patch } : value) });
  const row = (index: number, patch: Item) => set({ rows: rows.map((value, i) => i === index ? { ...value, ...patch } : value) });
  const cell = (rowIndex: number, columnIndex: number, patch: Item) => row(rowIndex, { values: rows[rowIndex].values.map((value, i) => i === columnIndex ? { ...value, ...patch } : value) });
  return <fieldset className={box} disabled={busy} data-testid="studio-comparison">
    {field("comparison-label", tr("اسم المقارنة", "Comparison label"), p.label, label => set({ label }))}
    {field("comparison-caption", tr("ملاحظة الجدول", "Table caption"), p.caption, caption => set({ caption }), 1200, true)}
    {toggle("comparison-stickyHeader", tr("تثبيت عناوين الأعمدة", "Sticky column headings"), p.stickyHeader === true, stickyHeader => set({ stickyHeader }))}
    <h3 className="text-sm">{tr("الأعمدة", "Columns")}</h3>
    {columns.map((value, index) => <details key={index} className={box} open={index === 0}>
      <summary>{index + 1}. {words(value.title, lang) || tr("عمود", "Column")}</summary>
      {actions("comparison-column", index, columns.length, offset => set({ columns: move(columns, index, offset), rows: rows.map(value => ({ ...value, values: move(value.values, index, offset) })) }), () => set({ columns: columns.filter((_, i) => i !== index), rows: rows.map(value => ({ ...value, values: value.values.filter((_, i) => i !== index) })) }))}
      {field(`comparison-title-${index}`, tr("العنوان", "Title"), value.title, title => column(index, { title }))}
      {field(`comparison-subtitle-${index}`, tr("عنوان فرعي", "Subtitle"), value.subtitle, subtitle => column(index, { subtitle }), 300)}
      {toggle(`comparison-highlight-${index}`, tr("تمييز العمود", "Highlight column"), value.highlight === true, highlight => column(index, { highlight }))}
      {field(`comparison-cta-${index}`, tr("نص الزر", "Button label"), value.cta, cta => column(index, { cta }), 60)}
      {link(`comparison-href-${index}`, value.href, href => column(index, { href }))}
    </details>)}
    <button type="button" className={btn} disabled={busy || columns.length >= 6} data-testid="comparison-column-add" onClick={() => set({ columns: [...columns, { title: {} }], rows: rows.map(value => ({ ...value, values: [...value.values, {}] })) })}>{tr("إضافة عمود", "Add column")}</button>
    <h3 className="text-sm">{tr("الصفوف", "Rows")}</h3>
    {rows.map((value, index) => <details key={index} className={box} open={index === 0}>
      <summary>{index + 1}. {words(value.label, lang) || tr("صف", "Row")}</summary>
      {actions("comparison-row", index, rows.length, offset => set({ rows: move(rows, index, offset) }), () => set({ rows: rows.filter((_, i) => i !== index) }))}
      {field(`comparison-row-label-${index}`, tr("اسم الميزة", "Feature label"), value.label, label => row(index, { label }))}
      {columns.map((column, c) => <div key={c} className={box}>
        <div className="text-xs">{words(column.title, lang) || `${tr("عمود", "Column")} ${c + 1}`}</div>
        <Choice label={tr("حالة القيمة", "Cell state")} value={String(value.values[c].state ?? "text")} options={[["text", tr("نص", "Text")], ["yes", tr("نعم", "Yes")], ["no", tr("لا", "No")]]} busy={busy} onPick={state => cell(index, c, { state })} testId={`comparison-state-${index}-${c}`} />
        {field(`comparison-cell-${index}-${c}`, tr("النص", "Text"), value.values[c].text, text => cell(index, c, { text }), 600)}
      </div>)}
    </details>)}
    <button type="button" className={btn} disabled={busy || rows.length >= 20} data-testid="comparison-row-add" onClick={() => set({ rows: [...rows, { label: {}, values: columns.map(() => ({})) }] })}>{tr("إضافة صف", "Add row")}</button>
  </fieldset>;
}
