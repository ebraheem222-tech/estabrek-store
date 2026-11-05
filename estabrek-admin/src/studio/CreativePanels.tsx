import type { PageDraftOp, PageTreeNode, TreeScreen } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { tr } from "../lib/words";
import { Range } from "./LookPanels";
import { Field } from "./StudioPanels";
import { Choice, NumberField } from "./StudioTreePanels";
import { styleOp } from "./columns";
import { shownLook } from "./look";

type Ops = (label: string, ops: PageDraftOp[]) => void;
type Props = { node: PageTreeNode; lang: Lang; busy: boolean; onOps: Ops };
const box = "space-y-3 rounded-xl border border-white/[0.08] p-3";
const words = (value: unknown, lang: Lang) => value && typeof value === "object" ? String((value as Record<string, string>)[lang] ?? "") : "";
const localized = (value: unknown, lang: Lang, text: string) => ({ ...(value && typeof value === "object" ? value : {}), [lang]: text });
const toggle = (label: string, checked: boolean, busy: boolean, onSave: (value: boolean) => void, id: string) => <label className="flex items-center justify-between gap-3 text-xs"><span>{label}</span><input type="checkbox" checked={checked} disabled={busy} data-testid={id} onChange={event => onSave(event.target.checked)} /></label>;

export function InstrumentPanel({ node, lang, busy, onOps }: Props) {
  const p = node.props;
  const set = (patch: Record<string, unknown>) => onOps(tr("إعدادات الآلة الموسيقية", "Instrument settings"), [{ op: "setProps", nodeId: node.id, props: { ...p, ...patch } }]);
  const range = (key: string, label: string, min: number, max: number, def: number, step = 1) => <Range key={key} label={label} min={min} max={max} step={step} value={typeof p[key] === "number" ? p[key] as number : def} busy={busy} onSave={value => set({ [key]: value })} testId={`instrument-${key}`} />;
  return <div className={box} data-testid="studio-instrument">
    <Choice label={tr("الآلة", "Instrument")} value={String(p.kind ?? "piano")} options={[["piano", tr("بيانو", "Piano")], ["guitar", tr("غيتار", "Guitar")]]} busy={busy} onPick={kind => set({ kind })} testId="instrument-kind" />
    <Field label={tr("اسم الآلة", "Instrument label")} value={words(p.label, lang)} onSave={text => set({ label: localized(p.label, lang, text.slice(0, 160)) })} testId="instrument-label" />
    {toggle(tr("الصوت بعد تفاعل الزائر", "Sound after visitor interaction"), p.sound === true, busy, sound => set({ sound }), "instrument-sound")}
    {range("volume", tr("مستوى الصوت", "Volume"), 0, 1, .25, .05)}
    {range("octave", tr("الأوكتاف", "Octave"), 2, 6, 4)}
    {p.kind === "guitar" ? range("frets", tr("عدد الفريتات", "Frets"), 4, 12, 8) : range("octaves", tr("عدد الأوكتافات", "Octaves"), 1, 2, 1)}
    {range("sustain", tr("مدة النغمة", "Note sustain"), .1, 3, .8, .1)}
    <Choice label={tr("شكل الموجة", "Waveform")} value={String(p.waveform ?? "triangle")} options={[["sine", "Sine"], ["triangle", "Triangle"], ["sawtooth", "Sawtooth"]]} busy={busy} onPick={waveform => set({ waveform })} testId="instrument-waveform" />
    <Choice label={tr("اللحن", "Melody")} value={String(p.melody ?? "scale")} options={[["scale", tr("سلم موسيقي", "Scale")], ["arpeggio", tr("أربيجيو", "Arpeggio")], ["chords", tr("أوتار", "Chords")], ["jingle", "Jingle Bells"], ["wish", "We Wish You a Merry Christmas"], ["silent", "Silent Night"]]} busy={busy} onPick={melody => set({ melody })} testId="instrument-melody" />
    {toggle(tr("مشغّل أغاني قابل للتحكم", "Song player controls"), p.showPlayer === true, busy, showPlayer => set({ showPlayer }), "instrument-showPlayer")}
    {p.showPlayer === true ? <div className="space-y-1 text-xs">{[["scale", tr("سلم موسيقي", "Scale")], ["arpeggio", tr("أربيجيو", "Arpeggio")], ["chords", tr("أوتار", "Chords")], ["jingle", "Jingle Bells"], ["wish", "We Wish You a Merry Christmas"], ["silent", "Silent Night"]].map(([value, label]) => { const list = Array.isArray(p.playlist) ? p.playlist as string[] : ["scale", "arpeggio", "chords"]; return <label key={value} className="flex justify-between"><span>{label}</span><input type="checkbox" disabled={busy || list.length === 1 && list.includes(value)} checked={list.includes(value)} onChange={event => set({ playlist: event.target.checked ? [...list, value] : list.filter(item => item !== value) })} /></label>; })}</div> : null}
    {range("tempo", tr("سرعة اللحن", "Tempo"), 40, 200, 100)}
    {toggle(tr("تكرار اللحن", "Repeat melody"), p.repeat === true, busy, repeat => set({ repeat }), "instrument-repeat")}
    {toggle(tr("إظهار أسماء النغمات", "Show note names"), p.showNotes !== false, busy, showNotes => set({ showNotes }), "instrument-showNotes")}
    <Choice label={tr("المظهر", "Appearance")} value={String(p.theme ?? "dark")} options={[["dark", tr("داكن", "Dark")], ["light", tr("فاتح", "Light")]]} busy={busy} onPick={theme => set({ theme })} testId="instrument-theme" />
  </div>;
}

export function ChartPanel({ node, lang, busy, onOps }: Props) {
  const p = node.props;
  const items = Array.isArray(p.items) ? p.items as Record<string, unknown>[] : [];
  const set = (patch: Record<string, unknown>) => onOps(tr("بيانات الرسم", "Chart data"), [{ op: "setProps", nodeId: node.id, props: { ...p, ...patch } }]);
  const item = (index: number, patch: Record<string, unknown>) => set({ items: items.map((row, at) => at === index ? { ...row, ...patch } : row) });
  return <div className={box} data-testid="studio-chart">
    <Field label={tr("عنوان الرسم", "Chart label")} value={words(p.label, lang)} onSave={text => set({ label: localized(p.label, lang, text.slice(0, 160)) })} testId="chart-label" />
    <Choice label={tr("نوع الرسم", "Chart type")} value={String(p.kind ?? "bar")} busy={busy} options={[["bar", tr("أعمدة", "Bars")], ["line", tr("خط", "Line")], ["donut", tr("دائري", "Donut")]]} onPick={kind => set({ kind })} testId="chart-kind" />
    {toggle(tr("إظهار القيم", "Show values"), p.showValues !== false, busy, showValues => set({ showValues }), "chart-values")}
    {items.map((row, index) => <div key={index} className="space-y-2 rounded-lg bg-white/[0.04] p-2">
      <Field label={tr("التسمية", "Label")} value={words(row.label, lang)} onSave={text => item(index, { label: localized(row.label, lang, text.slice(0, 80)) })} testId={`chart-item-label-${index}`} />
      <NumberField label={tr("القيمة", "Value")} value={Number(row.value) || 0} min={0} max={1000000} onSave={value => value !== null && item(index, { value })} testId={`chart-item-value-${index}`} />
      <Field label={tr("لون القيمة (HEX أو لون الثيم)", "Value colour (HEX or theme colour)")} value={String(row.color ?? "accent")} onSave={color => /^(#[0-9a-f]{3}|#[0-9a-f]{6}|accent|text|muted|surface|border)$/i.test(color) && item(index, { color })} testId={`chart-item-color-${index}`} />
      <div className="flex gap-2"><button type="button" disabled={busy || index === 0} onClick={() => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; set({ items: next }); }}>↑</button><button type="button" disabled={busy || items.length <= 1} onClick={() => set({ items: items.filter((_, at) => at !== index) })}>{tr("حذف", "Remove")}</button></div>
    </div>)}
    <button type="button" disabled={busy || items.length >= 24} onClick={() => set({ items: [...items, { label: { [lang]: tr("بند جديد", "New item") }, value: 0 }] })}>{tr("إضافة قيمة", "Add value")}</button>
    <p className="text-xs text-white/40">{tr("هذه قيم تدخلها أنت؛ عدّلها لتعكس بيانات متجرك.", "Enter your own values to reflect your store data.")}</p>
  </div>;
}

export function ClockPanel({ node, lang, busy, onOps }: Props) {
  const p = node.props;
  const set = (patch: Record<string, unknown>) => onOps(tr("الساعة", "Clock"), [{ op: "setProps", nodeId: node.id, props: { ...p, ...patch } }]);
  return <div className={box} data-testid="studio-clock">
    <Field label={tr("عنوان الساعة", "Clock label")} value={words(p.label, lang)} onSave={text => set({ label: localized(p.label, lang, text.slice(0, 160)) })} testId="clock-label" />
    <Field label={tr("المنطقة الزمنية", "Time zone")} value={String(p.timezone ?? "UTC")} onSave={timezone => { try { new Intl.DateTimeFormat("en", { timeZone: timezone }); set({ timezone }); } catch {} }} testId="clock-timezone" />
    <Choice label={tr("تنسيق الوقت", "Time format")} value={String(p.format ?? "24")} busy={busy} options={[["12", "12"], ["24", "24"]]} onPick={format => set({ format })} testId="clock-format" />
    {toggle(tr("الثواني", "Seconds"), p.seconds !== false, busy, seconds => set({ seconds }), "clock-seconds")}
    {toggle(tr("التاريخ", "Date"), p.date === true, busy, date => set({ date }), "clock-date")}
  </div>;
}

export function StickyPanel({ node, screen, busy, onOps }: Omit<Props, "lang"> & { screen: TreeScreen }) {
  const sticky = shownLook(node, screen, "sticky") as false | { top: number } | undefined;
  const save = (value: false | { top: number }) => onOps(tr("تثبيت أثناء التمرير", "Sticky on scroll"), [styleOp(node, screen, { sticky: value })]);
  return <div className={box} data-testid="studio-sticky">
    {toggle(tr("تثبيت أثناء التمرير", "Sticky on scroll"), Boolean(sticky), busy, enabled => save(enabled ? { top: 24 } : false), "sticky-on")}
    {sticky ? <Range label={tr("المسافة من الأعلى", "Offset from top")} min={0} max={240} value={sticky.top} busy={busy} onSave={top => save({ top })} testId="sticky-top" /> : null}
  </div>;
}
