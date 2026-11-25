import type { PageDraftOp, PageTreeNode, TreeScreen } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { useQuery } from "@tanstack/react-query";
import { listCollections } from "../api/collections.api";
import { tr } from "../lib/words";
import { CITIES, cityName } from "../../../estabrek-storefront/src/pageTree/chartMaths";
import { say } from "./say";
import { Range } from "./LookPanels";
import { Field } from "./StudioPanels";
import { Choice, NumberField } from "./StudioTreePanels";
import { styleOp } from "./columns";
import { shownLook } from "./look";

type Ops = (label: string, ops: PageDraftOp[]) => void;
type Props = { node: PageTreeNode; lang: Lang; busy: boolean; onOps: Ops };
const box = "space-y-3 rounded-xl border border-white/8 p-3";
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

/** The chart's kinds; the last five are plan 3.7's (the shop's pageTree/ChartKinds.tsx). */
const CHART_KINDS: Array<[string, () => string]> = [
  ["bar", () => tr("أعمدة", "Bars")],
  ["line", () => tr("خط", "Line")],
  ["donut", () => tr("دائري", "Donut")],
  ["sunburst", () => say("حلقات بتنفتح|Sunburst|סאנברסט")],
  ["sankey", () => say("تدفّقات|Flows (Sankey)|זרימות (סנקי)")],
  ["flights", () => say("خطوط طيران|Flight lines|קווי טיסה")],
  ["bars3d", () => say("أعمدة 3D|3D bars|עמודות תלת־ממד")],
  ["live", () => say("رسم حيّ من جدول|Live line from a table|קו חי מטבלה")],
];
const CHART_HINTS: Record<string, () => string> = {
  sunburst: () => say("كل بند إله «مجموعة»: المجموعات بالحلقة الجوّا وبنودها برّا، والكبسة على مجموعة بتفتحها.|Give each item a group: the groups are the inner ring and their items the outer one; a tap on a group opens it.|לכל פריט קבוצה: הקבוצות בטבעת הפנימית והפריטים שלהן בחיצונית; הקשה על קבוצה פותחת אותה."),
  sankey: () => say("كل بند تدفّق: من «الاسم» لـ«لوين» بقيمته. الأسماء نفسها بتتوصّل ببعض.|Each item is a flow: from its name to «To», by its value. The same names join up.|כל פריט הוא זרימה: מהשם שלו אל «אל», לפי הערך. שמות זהים מתחברים."),
  flights: () => say("اختاري مدينة البداية، ولكل بند مدينته: الخطوط بتطلع منها لكل وحدة، والقائمة بتحكي المسافة.|Pick the city they start from, and each item's city: a line goes to each, and the list tells the distance.|בחרו את עיר המוצא ולכל פריט את העיר שלו: קו יוצא לכל אחת, והרשימה אומרת את המרחק."),
  bars3d: () => say("كل بند عمود؛ البنود اللي إلها نفس «الصف» بتنحط بصف واحد.|Each item is a bar; items with the same row stand in one row.|כל פריט הוא עמודה; פריטים עם אותה שורה עומדים בשורה אחת."),
};
/** An example for each new kind, in the editing language ("عربي|English|עברית"), so a kind picked shows something at once. */
const CHART_EXAMPLES: Record<string, Array<[string, number, Record<string, string>]>> = {
  sunburst: [["إعلانات|Ads|פרסום", 40, { group: "التسويق|Marketing|שיווק" }], ["مؤثرين|Creators|יוצרים", 20, { group: "التسويق|Marketing|שיווק" }], ["داخلي|Local|מקומי", 25, { group: "التوصيل|Delivery|משלוח" }], ["خارجي|Abroad|לחו״ל", 10, { group: "التوصيل|Delivery|משלוח" }], ["التغليف|Packaging|אריזה", 12, {}]],
  sankey: [["بحث|Search|חיפוש", 60, { to: "صفحة المنتج|Product page|דף מוצר" }], ["إنستغرام|Instagram|אינסטגרם", 40, { to: "صفحة المنتج|Product page|דף מוצר" }], ["صفحة المنتج|Product page|דף מוצר", 30, { to: "اشترى|Bought|קנו" }], ["صفحة المنتج|Product page|דף מוצר", 70, { to: "طلع|Left|עזבו" }]],
  flights: [["", 2, { city: "dubai" }], ["", 3, { city: "cairo" }], ["", 4, { city: "istanbul" }], ["", 5, { city: "london" }]],
  bars3d: ["1", "2", "3"].flatMap((w, j) => [["أحد|Sun|א׳", 12 + j * 9], ["اثنين|Mon|ב׳", 30 - j * 6], ["ثلاثاء|Tue|ג׳", 18 + j * 4]].map(([d, v]) => [d as string, v as number, { group: `الأسبوع ${w}|Week ${w}|שבוע ${w}` }] as [string, number, Record<string, string>])),
};
const cityOptions = (lang: Lang) => [...CITIES].map((c) => [c[0], cityName(c[0], lang)] as const).sort((a, b) => a[1].localeCompare(b[1], lang));
const sel = "mt-1 w-full rounded-lg border border-white/10 bg-surface-925 px-2 py-1.5 text-xs text-white";

export function ChartPanel({ node, lang, busy, onOps }: Props) {
  const p = node.props;
  const kind = String(p.kind ?? "bar");
  const items = Array.isArray(p.items) ? p.items as Record<string, unknown>[] : [];
  const set = (patch: Record<string, unknown>) => onOps(tr("بيانات الرسم", "Chart data"), [{ op: "setProps", nodeId: node.id, props: { ...p, ...patch } }]);
  const item = (index: number, patch: Record<string, unknown>) => set({ items: items.map((row, at) => at === index ? { ...row, ...patch } : row) });
  const cities = cityOptions(lang);
  const cityPick = (label: string, value: string, onPick: (key: string) => void, testId: string) => (
    <label className="block text-[11px] text-white/55">{label}
      <select className={sel} value={value} disabled={busy} onChange={(e) => onPick(e.target.value)} data-testid={testId}>
        <option value="">—</option>
        {cities.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
      </select>
    </label>
  );
  const labelWord = kind === "sankey" ? say("من|From|מ־") : kind === "flights" ? say("الاسم على الخريطة (فاضي: اسم المدينة)|Name on the map (empty: the city's)|השם במפה (ריק: של העיר)") : tr("التسمية", "Label");
  return <div className={box} data-testid="studio-chart">
    <Field label={tr("عنوان الرسم", "Chart label")} value={words(p.label, lang)} onSave={text => set({ label: localized(p.label, lang, text.slice(0, 160)) })} testId="chart-label" />
    <Choice label={tr("نوع الرسم", "Chart type")} value={kind} busy={busy} options={CHART_KINDS.map(([k, name]) => [k, name()])} onPick={kind => set({ kind })} testId="chart-kind" />
    {CHART_HINTS[kind] ? <p className="text-[11px] leading-relaxed text-white/45" data-testid="chart-hint">{CHART_HINTS[kind]()}</p> : null}
    {CHART_EXAMPLES[kind] ? <button type="button" className="rounded-lg bg-white/6 px-2 py-1 text-[11px] hover:bg-white/10 disabled:opacity-40" disabled={busy} data-testid="chart-example" onClick={() => {
      const pick = (t: string) => t.split("|")[lang === "en" ? 1 : lang === "he" ? 2 : 0] ?? t;
      set({
        items: CHART_EXAMPLES[kind].map(([label, value, more]) => ({ label: { [lang]: more.city && !label ? cityName(more.city, lang) : pick(label) }, value, ...(more.group ? { group: { [lang]: pick(more.group) } } : {}), ...(more.to ? { to: { [lang]: pick(more.to) } } : {}), ...(more.city ? { city: more.city } : {}) })),
        ...(kind === "flights" && !p.hub ? { hub: "amman" } : {}),
        ...(kind === "flights" ? { unit: { [lang]: pick("أيام|days|ימים") } } : {}),
      });
    }}>{say("عبّيه بمثال (بيبدّل القيم)|Fill with an example (replaces the values)|למלא בדוגמה (מחליף את הערכים)")}</button> : null}
    {toggle(tr("إظهار القيم", "Show values"), p.showValues !== false, busy, showValues => set({ showValues }), "chart-values")}
    <Field label={say("وحدة القيم (اختياري: ₪، زيارة، يوم…)|Unit (optional: $, visits, days…)|יחידה (רשות: ₪, ביקורים, ימים…)")} value={words(p.unit, lang)} onSave={text => set({ unit: localized(p.unit, lang, text.slice(0, 16)) })} testId="chart-unit" />
    {kind === "flights" ? cityPick(say("المدينة اللي بتطلع منها الخطوط|The city the lines start from|העיר שממנה יוצאים הקווים"), String(p.hub ?? ""), hub => set({ hub: hub || undefined }), "chart-hub") : null}
    {kind === "live" ? <LiveChartSettings p={p} lang={lang} busy={busy} set={set} /> : <>
      {items.map((row, index) => <div key={index} className="space-y-2 rounded-lg bg-white/4 p-2">
        {kind === "flights" ? cityPick(say("المدينة|City|עיר"), String(row.city ?? ""), city => item(index, { city: city || undefined, ...(city && !words(row.label, lang) ? { label: localized(row.label, lang, cityName(city, lang)) } : {}) }), `chart-item-city-${index}`) : null}
        <Field label={labelWord} value={words(row.label, lang)} onSave={text => item(index, { label: localized(row.label, lang, text.slice(0, 80)) })} testId={`chart-item-label-${index}`} />
        {kind === "sankey" ? <Field label={say("لوين|To|אל")} value={words(row.to, lang)} onSave={text => item(index, { to: localized(row.to, lang, text.slice(0, 80)) })} testId={`chart-item-to-${index}`} /> : null}
        {kind === "sunburst" || kind === "bars3d" ? <Field label={kind === "sunburst" ? say("المجموعة (الحلقة الجوّا)|Group (the inner ring)|קבוצה (הטבעת הפנימית)") : say("الصف|Row|שורה")} value={words(row.group, lang)} onSave={text => item(index, { group: localized(row.group, lang, text.slice(0, 80)) })} testId={`chart-item-group-${index}`} /> : null}
        <NumberField label={tr("القيمة", "Value")} value={Number(row.value) || 0} min={0} max={1000000} onSave={value => value !== null && item(index, { value })} testId={`chart-item-value-${index}`} />
        <Field label={tr("لون القيمة (HEX أو لون الثيم)", "Value colour (HEX or theme colour)")} value={String(row.color ?? "accent")} onSave={color => /^(#[0-9a-f]{3}|#[0-9a-f]{6}|accent|text|muted|surface|border)$/i.test(color) && item(index, { color })} testId={`chart-item-color-${index}`} />
        <div className="flex gap-2"><button type="button" disabled={busy || index === 0} onClick={() => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; set({ items: next }); }}>↑</button><button type="button" disabled={busy || items.length <= 1} onClick={() => set({ items: items.filter((_, at) => at !== index) })}>{tr("حذف", "Remove")}</button></div>
      </div>)}
      <button type="button" disabled={busy || items.length >= 40} onClick={() => set({ items: [...items, { label: { [lang]: tr("بند جديد", "New item") }, value: 0 }] })} data-testid="chart-add">{tr("إضافة قيمة", "Add value")}</button>
      <p className="text-xs text-white/40">{tr("هذه قيم تدخلها أنت؛ عدّلها لتعكس بيانات متجرك.", "Enter your own values to reflect your store data.")}</p>
    </>}
  </div>;
}

/** The live line: one of the owner's tables, counted per minute, hour or day (GET /v1/data/<table>/per/<every>). */
function LiveChartSettings({ p, lang, busy, set }: { p: Record<string, unknown>; lang: Lang; busy: boolean; set: (patch: Record<string, unknown>) => void }) {
  const tables = useQuery({ queryKey: ["collections"], queryFn: listCollections, staleTime: 60_000 });
  const list = tables.data ?? [];
  const table = String(p.table ?? "");
  return <div className="space-y-2" data-testid="chart-live">
    <label className="block text-[11px] text-white/55">{say("الجدول اللي بتنعدّ سطوره|The table whose rows are counted|הטבלה שהשורות שלה נספרות")}
      <select className={sel} value={table} disabled={busy} onChange={(e) => set({ table: e.target.value || undefined })} data-testid="chart-table">
        <option value="">—</option>
        {list.map((t) => <option key={t.id} value={t.slug}>{t.name?.[lang] || t.name?.ar || t.name?.en || t.slug}</option>)}
        {table && !list.some((t) => t.slug === table) && !tables.isLoading ? <option value={table}>{table}</option> : null}
      </select>
    </label>
    {!tables.isLoading && !list.length ? <p className="text-[11px] text-amber-200/80">{say("ما في جداول لسّا. اعملي جدول من «الجداول» أول.|No tables yet. Make one under Tables first.|עדיין אין טבלאות. צרו אחת תחת «טבלאות» קודם.")}</p> : null}
    <Choice label={say("بتعدّ كل|Count each|ספירה לכל")} value={String(p.every ?? "hour")} busy={busy} options={[["minute", say("دقيقة|Minute|דקה")], ["hour", say("ساعة|Hour|שעה")], ["day", say("يوم|Day|יום")]]} onPick={every => set({ every })} testId="chart-every" />
    <NumberField label={say("كم وحدة لورا (6–60)|How many back (6–60)|כמה אחורה (6–60)")} value={typeof p.last === "number" ? p.last : 24} min={6} max={60} onSave={last => last !== null && set({ last })} testId="chart-last" />
    <p className="text-[11px] leading-relaxed text-white/45">{say("بتنعدّ السطور اللي بيقدر يقراها الزائر (المنشورة)، فالجدول لازم يكون مفتوح للقراءة («الـ API والمفاتيح»). الرقم بيتحدّث لحاله أول ما ينضاف سطر، والزائر بيقدر يبدّل بين دقيقة وساعة ويوم.|The rows a visitor may read (the published ones) are counted, so the table must be open to read (API & keys). The number updates by itself the moment a row is added, and the visitor can switch between minute, hour and day.|נספרות השורות שמבקר יכול לקרוא (שפורסמו), ולכן הטבלה חייבת להיות פתוחה לקריאה (API ומפתחות). המספר מתעדכן לבד ברגע שנוספת שורה, והמבקר יכול לעבור בין דקה, שעה ויום.")}</p>
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
