/**
 * The selected element's recipes (triggers.ts): a sentence the owner builds for anything on the page.
 *   when     something happens to it (a click, a long press, the mouse, coming into sight, a time, a key…)
 *   who      may run it (everyone, signed-in customers, guests) and what the others get
 *   if       conditions that must all hold (a variable, the device, the bag, signed in…)
 *   do       its steps, one after another; a step can be a group (at once, repeated, one at random)
 *   else     the steps when the conditions don't hold
 *   on fail  the steps when one fails (a "no" to a question, a product that can't be bought)
 * Ready recipes first; each can be tried in the preview.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import * as CatalogAPI from "../api/catalog.api";
import { Range } from "./LookPanels";
import { ColourPick } from "./StudioTreePanels";
import { say } from "./say";
import {
  ACTS, BURSTS, CONDITIONS, COUNT_CMPS, DENY, EVENTS, FLOW_ACTS, GROUP_ACTS, KEYS, KEY_OK, MAX_FAIL, MAX_GROUP, MAX_IF, MAX_STEPS, PHONE_OK, PLAY_WHAT, SOUNDS,
  TRIGGER_PRESETS, VAR_CMPS, VAR_NAME, VAR_OPS, WHO, canFail, isGroup, newAction, newCondition, newStep, triggersOf, triggersOp, valueOf,
  type Action, type Condition, type ConditionKind, type Deny, type PlainStep, type Step, type StepKind, type Trigger, type TriggerEvent, type VarValue, type Who, type Words,
} from "./triggers";

type Ops = (label: string, ops: PageDraftOp[]) => void;
type Target = { id: string; label: string; type?: string };
const box = "space-y-2.5 rounded-xl border border-white/[0.08] p-3";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] hover:bg-white/[0.1] disabled:opacity-40";
const sel = "mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white";
const part = "text-[10px] font-semibold uppercase tracking-wide text-accent-200/80";
const L = () => say("المشغّلات|Triggers|טריגרים");

function Pick({ label, value, options, busy, onPick, testId }: { label: string; value: string; options: Array<[string, string]>; busy: boolean; onPick: (v: string) => void; testId?: string }) {
  return (
    <label className="block text-[11px] text-white/55">{label}
      <select className={sel} value={value} disabled={busy} onChange={(e) => onPick(e.target.value)} data-testid={testId}>
        {!options.some(([k]) => k === value) ? <option value={value}>{value}</option> : null}
        {options.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
      </select>
    </label>
  );
}
const named = (list: ReadonlyArray<readonly [string, () => string]>): Array<[string, string]> => list.map(([k, n]) => [k, n()]);

/** A line of text saved when it's left (only when it changed and is allowed). */
function Line({ label, value, busy, onSave, ok, ltr, max = 200, hint, testId }: { label: string; value: string; busy: boolean; onSave: (v: string) => void; ok?: (v: string) => boolean; ltr?: boolean; max?: number; hint?: string; testId?: string }) {
  return (
    <label className="block text-[11px] text-white/55">{label}
      <input key={value} dir={ltr ? "ltr" : undefined} className={sel} defaultValue={value} maxLength={max} placeholder={hint} disabled={busy} data-testid={testId}
        onBlur={(e) => { const v = e.target.value.trim(); if (v !== value && (!ok || ok(v))) onSave(v); else if (v !== value) e.target.value = value; }} />
    </label>
  );
}
const shown = (v: VarValue | undefined) => (v === undefined ? "" : String(v));

/** A product for a step, found by its name. */
function ProductPick({ value, busy, onPick }: { value?: string; busy: boolean; onPick: (id: string) => void }) {
  const [text, setText] = useState("");
  const products = useQuery({ queryKey: ["products-pick"], queryFn: () => CatalogAPI.listProducts("all"), staleTime: 60_000 });
  const chosen = (products.data ?? []).find((x) => x.id === value);
  const list = useMemo(() => {
    const q = text.trim().toLowerCase();
    return (products.data ?? []).filter((x) => !q || x.title.toLowerCase().includes(q)).slice(0, 20);
  }, [products.data, text]);
  return (
    <div className="space-y-1" data-testid="trigger-product">
      {chosen ? <div className="text-xs text-white/85">{chosen.title}</div> : <p className="text-[11px] text-amber-200/80">{value ? say("هالمنتج مش موجود هلأ. اختار غيره.|This product isn't there now. Pick another.|המוצר הזה לא קיים כרגע. לבחור אחר.") : say("اختار المنتج (لحد ما تختار، الخطوة ما بتعمل شي).|Pick the product (until then the step does nothing).|לבחור מוצר (עד אז השלב לא עושה כלום).")}</p>}
      <input className={sel} value={text} onChange={(e) => setText(e.target.value)} placeholder={say("دوّر على منتج|Find a product|חיפוש מוצר")} data-testid="trigger-product-find" />
      <ul className="max-h-32 space-y-0.5 overflow-y-auto">
        {list.map((x) => (
          <li key={x.id}><button type="button" disabled={busy} aria-pressed={x.id === value} onClick={() => onPick(x.id)} className={`w-full truncate rounded-lg px-2 py-1 text-start text-[11px] ${x.id === value ? "bg-accent-500/25 text-white" : "text-white/75 hover:bg-white/[0.06]"}`} data-product={x.id}>{x.title}</button></li>
        ))}
      </ul>
    </div>
  );
}

function ActionFields({ a, lang, targets, busy, onSave }: { a: Action; lang: string; targets: Target[]; busy: boolean; onSave: (a: Action) => void }) {
  const aim = (only?: (t: Target) => boolean): Array<[string, string]> => [["self", say("هو نفسه|Itself|הוא עצמו")], ...targets.filter((t) => !only || only(t)).map((t): [string, string] => [t.id, `${t.label} (${t.id})`])];
  const target = "target" in a ? <Pick label={say("على أي عنصر|On which element|על איזה רכיב")} value={a.target} options={aim(a.act === "popup" ? (t) => t.type === "popup" : a.act === "scene" ? (t) => t.type === "scrollScene" : a.act === "video" ? (t) => t.type === "video" || t.type === "scrollScene" : undefined)} busy={busy} onPick={(target) => onSave({ ...a, target } as Action)} /> : null;
  const text = (v: Words | undefined, label: string, set: (w: Words) => void, max = 200) => (
    <Line label={label} value={v?.[lang] ?? ""} max={max} busy={busy} onSave={(t) => set({ ...(v ?? {}), [lang]: t })} />
  );
  const linkOk = (v: string) => /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)[^\s<>"'`\\]*$/i.test(v);
  const phone = (v: string | undefined, set: (p: string | undefined) => void) => (
    <Line label={say("الرقم (فاضي = رقم المتجر)|The number (empty = the store's own)|המספר (ריק = של החנות)")} value={v ?? ""} ltr max={20} hint="+972 50 000 0000" busy={busy} ok={(p) => p === "" || PHONE_OK.test(p)} onSave={(p) => set(p || undefined)} />
  );
  switch (a.act) {
    case "play":
      return <>{target}
        <Pick label={say("أي حركة|Which motion|איזו תנועה")} value={a.what} options={named(PLAY_WHAT)} busy={busy} onPick={(what) => onSave({ ...a, what })} />
        {a.what === "keys" ? <Pick label={say("كيف|How|איך")} value={a.mode ?? "play"} busy={busy} onPick={(mode) => onSave({ ...a, mode: mode as "play" })}
          options={[["play", say("لقدّام|Forward|קדימה")], ["reverse", say("لورا|Back|אחורה")], ["toggle", say("قدّام/ورا بالتناوب|Forward/back in turn|קדימה/אחורה לסירוגין")], ["restart", say("من الأول|From the start|מההתחלה")]]} /> : null}
      </>;
    case "visible":
      return <>{target}<Pick label={say("شو يصير|What happens|מה קורה")} value={a.value} busy={busy} onPick={(value) => onSave({ ...a, value: value as "show" })} options={[["show", say("يبين|Show|הצגה")], ["hide", say("يختفي|Hide|הסתרה")], ["toggle", say("بالتناوب|Toggle|החלפה")]]} /></>;
    case "scrollTo":
      return <>{target}<Range label={say("مسافة فوقه|Space above it|מרווח מעליו")} min={-400} max={400} unit="px" busy={busy} value={a.offset ?? 0} onSave={(offset) => onSave({ ...a, offset })} /></>;
    case "scene":
      return <>{target}<Range label={say("للحظة|To the moment|לרגע")} min={0} max={100} unit="%" busy={busy} value={a.at} onSave={(at) => onSave({ ...a, at })} /></>;
    case "link":
      return <>
        <Line label={say("الرابط (صفحة، منتج، تصنيف، أو رابط برّا)|The link (a page, a product, a category, or outside)|הקישור (עמוד, מוצר, קטגוריה או חיצוני)")} value={a.href} ltr max={500} busy={busy} ok={linkOk} onSave={(href) => onSave({ ...a, href })} />
        <label className="flex items-center gap-2 text-[11px] text-white/70"><input type="checkbox" checked={a.newTab === true} disabled={busy} onChange={(e) => onSave({ ...a, newTab: e.target.checked || undefined })} />{say("بتاب جديد|In a new tab|בכרטיסייה חדשה")}</label>
      </>;
    case "popup":
      return <>{target}<Pick label={say("شو يصير|What happens|מה קורה")} value={a.value} busy={busy} onPick={(value) => onSave({ ...a, value: value as "open" })} options={[["open", say("تنفتح|Open|פתיחה")], ["close", say("تتسكّر|Close|סגירה")]]} /></>;
    case "video":
      return <>{target}<Pick label={say("شو يصير|What happens|מה קורה")} value={a.value} busy={busy} onPick={(value) => onSave({ ...a, value: value as "play" })}
        options={[["play", say("شغّل|Play|הפעלה")], ["pause", say("وقّف|Pause|השהיה")], ["toggle", say("شغّل/وقّف|Play/pause|הפעלה/השהיה")], ["restart", say("من الأول|From the start|מההתחלה")], ["mute", say("كتم الصوت|Mute|השתקה")], ["unmute", say("رجّع الصوت|Unmute|ביטול השתקה")]]} /></>;
    case "burst":
      return <>
        <Pick label={say("شو بينفجر|What bursts|מה מתפרץ")} value={a.kind} options={named(BURSTS)} busy={busy} onPick={(kind) => onSave({ ...a, kind })} />
        <Range label={say("قديش|How many|כמה")} min={5} max={200} busy={busy} value={a.amount ?? 60} onSave={(amount) => onSave({ ...a, amount })} />
        <ColourPick label={say("لون واحد (فاضي = ألوان)|One colour (empty = many)|צבע אחד (ריק = הרבה)")} value={a.color} busy={busy} onPick={(c) => onSave({ ...a, color: c ?? undefined })} />
      </>;
    case "copy":
      return <>{text(a.text, say("شو ينسخ (مثلاً كود خصم)|What to copy (e.g. a discount code)|מה להעתיק (למשל קוד הנחה)"), (w) => onSave({ ...a, text: w }))}{text(a.note, say("الرسالة بعد النسخ|The message after copying|ההודעה אחרי ההעתקה"), (w) => onSave({ ...a, note: w }), 120)}</>;
    case "toast":
      return text(a.text, say("الرسالة ({{اسم}} = قيمة متغيّر)|The message ({{name}} = a variable's value)|ההודעה ({{שם}} = ערך של משתנה)"), (w) => onSave({ ...a, text: w }));
    case "sound":
      return <>
        <Pick label={say("أي صوت|Which sound|איזה צליל")} value={a.kind} options={named(SOUNDS)} busy={busy} onPick={(kind) => onSave({ ...a, kind })} />
        <Range label={say("الصوت|Volume|עוצמה")} min={0} max={1} step={0.05} busy={busy} value={a.volume ?? 0.35} onSave={(volume) => onSave({ ...a, volume })} />
      </>;
    case "wait":
      return <Range label={say("قديش|How long|כמה זמן")} min={0} max={10} step={0.1} unit="s" busy={busy} value={a.seconds} onSave={(seconds) => onSave({ ...a, seconds })} />;
    case "confirm":
      return <>
        {text(a.text, say("السؤال|The question|השאלה"), (w) => onSave({ ...a, text: w }))}
        <div className="grid grid-cols-2 gap-2">
          {text(a.yes, say("زر الموافقة (فاضي = نعم)|The yes button (empty = Yes)|כפתור האישור (ריק = כן)"), (w) => onSave({ ...a, yes: w }), 24)}
          {text(a.no, say("زر الرفض (فاضي = لا)|The no button (empty = No)|כפתור הסירוב (ריק = לא)"), (w) => onSave({ ...a, no: w }), 24)}
        </div>
        <p className="text-[10px] leading-4 text-white/40">{say("«لا» بتوقّف الخطوات، وبتشغّل خطوات «إذا فشل».|A “no” stops the steps and runs the “on fail” ones.|«לא» עוצר את השלבים ומפעיל את שלבי «אם נכשל».")}</p>
      </>;
    case "bag":
      return <>
        <ProductPick value={a.productId} busy={busy} onPick={(productId) => onSave({ ...a, productId })} />
        <Range label={say("كم قطعة|How many|כמה")} min={1} max={20} busy={busy} value={a.quantity ?? 1} onSave={(quantity) => onSave({ ...a, quantity })} />
        <p className="text-[10px] leading-4 text-white/40">{say("منتج بخيار واحد بينضاف فوراً. إذا إله ألوان أو مقاسات بتنفتح نافذته ليختار. إذا خلص، بتشتغل خطوات «إذا فشل».|A product with one choice is added at once. With colours or sizes its quick view opens to choose. Sold out runs the “on fail” steps.|מוצר עם אפשרות אחת נוסף מיד. עם צבעים או מידות נפתח החלון שלו לבחירה. אזל = שלבי «אם נכשל».")}</p>
      </>;
    case "wish":
      return <>
        <ProductPick value={a.productId} busy={busy} onPick={(productId) => onSave({ ...a, productId })} />
        <Pick label={say("شو يصير|What happens|מה קורה")} value={a.value} busy={busy} onPick={(value) => onSave({ ...a, value: value as "toggle" })} options={[["toggle", say("ينحفظ / ينشال بالتناوب|Saved / removed in turn|נשמר / מוסר לסירוגין")], ["add", say("ينحفظ|Saved|נשמר")], ["remove", say("ينشال|Removed|מוסר")]]} />
      </>;
    case "whatsapp":
      return <>{phone(a.phone, (p) => onSave({ ...a, phone: p }))}{text(a.text, say("الرسالة الجاهزة|The message, ready to send|ההודעה המוכנה"), (w) => onSave({ ...a, text: w }), 300)}</>;
    case "call":
      return phone(a.phone, (p) => onSave({ ...a, phone: p }));
    case "share":
      return <>
        <Line label={say("شو ينشارك (فاضي = هالصفحة)|What to share (empty = this page)|מה לשתף (ריק = העמוד הזה)")} value={a.href ?? ""} ltr max={500} busy={busy} ok={(v) => v === "" || linkOk(v)} onSave={(href) => onSave({ ...a, href: href || undefined })} />
        {text(a.title, say("العنوان (فاضي = عنوان الصفحة)|The title (empty = the page's)|הכותרת (ריק = של העמוד)"), (w) => onSave({ ...a, title: w }), 120)}
      </>;
    case "download":
      return <>
        <Line label={say("رابط الملف (من مكتبتك أو https)|The file's link (from your library, or https)|קישור הקובץ (מהספרייה או https)")} value={a.href} ltr max={500} busy={busy} ok={(v) => /^(https:\/\/|\/(?!\/))[^\s<>"'`\\]+$/.test(v)} onSave={(href) => onSave({ ...a, href })} />
        <Line label={say("اسم الملف عند التنزيل (اختياري)|The file's name when saved (optional)|שם הקובץ בהורדה (לא חובה)")} value={a.name ?? ""} max={80} busy={busy} onSave={(name) => onSave({ ...a, name: name || undefined })} />
      </>;
    default:
      return null;
  }
}

/** A variable: its name, how it's compared, and against what. */
function VarFields({ name, cmp, value, busy, onSave, testId }: { name: string; cmp: string; value?: VarValue; busy: boolean; onSave: (v: { name: string; cmp: string; value?: VarValue }) => void; testId?: string }) {
  const bare = cmp === "set" || cmp === "unset";
  return (
    <div className="grid grid-cols-3 gap-1.5">
      <Line label={say("المتغيّر|Variable|משתנה")} value={name} ltr max={24} busy={busy} ok={(v) => VAR_NAME.test(v)} onSave={(v) => onSave({ name: v, cmp, value })} testId={testId ? `${testId}-name` : undefined} />
      <Pick label={say("كيف|How|איך")} value={cmp} options={named(VAR_CMPS)} busy={busy} onPick={(c) => onSave({ name, cmp: c, value: c === "set" || c === "unset" ? undefined : value ?? 1 })} />
      {bare ? <span /> : <Line label={say("القيمة|Value|ערך")} value={shown(value)} max={80} busy={busy} onSave={(v) => onSave({ name, cmp, value: valueOf(v) })} testId={testId ? `${testId}-value` : undefined} />}
    </div>
  );
}

function ConditionFields({ c, busy, onSave, testId }: { c: Condition; busy: boolean; onSave: (c: Condition) => void; testId: string }) {
  const number = (label: string, value: number, min: number, max: number, set: (n: number) => void) => (
    <Line label={label} value={String(value)} ltr max={4} busy={busy} ok={(v) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max} onSave={(v) => set(Number(v))} testId={`${testId}-value`} />
  );
  switch (c.if) {
    case "var":
      return <VarFields name={c.name} cmp={c.cmp} value={c.value} busy={busy} testId={testId} onSave={(v) => onSave({ if: "var", name: v.name, cmp: v.cmp as typeof c.cmp, ...(v.value !== undefined ? { value: v.value } : {}) })} />;
    case "count":
      return <div className="grid grid-cols-2 gap-1.5">
        <Pick label={say("كيف|How|איך")} value={c.cmp} options={named(COUNT_CMPS)} busy={busy} onPick={(cmp) => onSave({ ...c, cmp: cmp as typeof c.cmp })} />
        {number(say("كم مرة|How many times|כמה פעמים"), c.value, 1, 1000, (value) => onSave({ ...c, value }))}
      </div>;
    case "device":
      return <Pick label={say("أي جهاز|Which device|איזה מכשיר")} value={c.value} busy={busy} onPick={(value) => onSave({ ...c, value: value as typeof c.value })} options={[["phone", say("موبايل|Phone|טלפון")], ["tablet", say("تابلت|Tablet|טאבלט")], ["desktop", say("كمبيوتر|Computer|מחשב")]]} />;
    case "time":
      return <div className="grid grid-cols-2 gap-1.5">
        <Range label={say("من الساعة|From (hour)|משעה")} min={0} max={23} busy={busy} value={c.from} onSave={(from) => onSave({ ...c, from })} />
        <Range label={say("للساعة|To (hour)|עד שעה")} min={0} max={23} busy={busy} value={c.to} onSave={(to) => onSave({ ...c, to })} />
      </div>;
    case "lang":
      return <Pick label={say("أي لغة|Which language|איזו שפה")} value={c.value} busy={busy} onPick={(value) => onSave({ ...c, value: value as typeof c.value })} options={[["ar", "العربية"], ["he", "עברית"], ["en", "English"]]} />;
    case "signedIn":
      return <Pick label={say("الزائر|The visitor|המבקר")} value={c.value ? "yes" : "no"} busy={busy} onPick={(v) => onSave({ ...c, value: v === "yes" })} options={[["yes", say("مسجّل دخوله|is signed in|מחובר")], ["no", say("مش مسجّل|isn't signed in|לא מחובר")]]} testId={`${testId}-value`} />;
    case "bag":
      return <div className="grid grid-cols-2 gap-1.5">
        <Pick label={say("كيف|How|איך")} value={c.cmp} options={named(COUNT_CMPS).filter(([k]) => k !== "every")} busy={busy} onPick={(cmp) => onSave({ ...c, cmp: cmp as typeof c.cmp })} />
        {number(say("كم قطعة|How many pieces|כמה פריטים"), c.value, 0, 999, (value) => onSave({ ...c, value }))}
      </div>;
  }
}

/** A list of steps: each a kind with its settings; a group holds a list of its own (no groups inside groups). */
function StepList({ steps, lang, targets, busy, max, min = 0, groups, onSave, testId }: { steps: Step[]; lang: string; targets: Target[]; busy: boolean; max: number; min?: number; groups: boolean; onSave: (steps: Step[]) => void; testId: string }) {
  const kinds: Array<[string, string]> = [...named(ACTS), ...named(FLOW_ACTS), ...(groups ? named(GROUP_ACTS) : [])];
  const put = (j: number, s: Step) => onSave(steps.map((x, k) => (k === j ? s : x)));
  return (
    <div className="space-y-1.5">
      <ol className="space-y-1.5">
        {steps.map((s, j) => (
          <li key={j} className="space-y-1.5 rounded-lg bg-white/[0.04] p-2" data-testid={`${testId}-step-${j}`}>
            <div className="flex items-end gap-1">
              <div className="flex-1"><Pick label={`${j + 1}. ${say("اعمل|Do|עשה")}`} value={s.act} options={kinds} busy={busy} onPick={(act) => put(j, newStep(act as StepKind, lang))} testId={`${testId}-act-${j}`} /></div>
              <button type="button" className={btn} disabled={busy || j === 0} aria-label="↑" onClick={() => { const d = [...steps]; [d[j - 1], d[j]] = [d[j], d[j - 1]]; onSave(d); }}>↑</button>
              <button type="button" className={`${btn} text-red-300`} disabled={busy || steps.length <= min} aria-label={say("شيل|Remove|הסרה")} onClick={() => onSave(steps.filter((_, k) => k !== j))} data-testid={`${testId}-remove-${j}`}>×</button>
            </div>
            {s.act === "set" ? (
              <div className="grid grid-cols-3 gap-1.5">
                <Line label={say("المتغيّر|Variable|משתנה")} value={s.name} ltr max={24} busy={busy} ok={(v) => VAR_NAME.test(v)} onSave={(name) => put(j, { ...s, name })} testId={`${testId}-var-${j}`} />
                <Pick label={say("شو يصير|What happens|מה קורה")} value={s.op} options={named(VAR_OPS)} busy={busy} onPick={(op) => put(j, op === "toggle" ? { act: "set", name: s.name, op: "toggle" } : { act: "set", name: s.name, op: op as "set" | "add", value: op === "add" ? (typeof s.value === "number" ? s.value : 1) : s.value ?? 1 })} />
                {s.op === "toggle" ? <span /> : <Line label={say("القيمة|Value|ערך")} value={shown(s.value)} max={80} busy={busy} ok={(v) => s.op !== "add" || (v !== "" && Number.isFinite(Number(v)))} onSave={(v) => put(j, { ...s, value: valueOf(v) })} />}
              </div>
            ) : s.act === "waitUntil" ? (
              <>
                <VarFields name={s.name} cmp={s.cmp} value={s.value} busy={busy} onSave={(v) => put(j, { act: "waitUntil", name: v.name, cmp: v.cmp as typeof s.cmp, ...(v.value !== undefined ? { value: v.value } : {}), seconds: s.seconds })} />
                <Range label={say("على الأكتر (وبعدها بيكمّل)|At most (then it goes on)|לכל היותר (ואז ממשיך)")} min={0} max={60} unit="s" busy={busy} value={s.seconds ?? 10} onSave={(seconds) => put(j, { ...s, seconds })} />
              </>
            ) : isGroup(s) ? (
              <div className="space-y-1.5 border-s-2 border-accent-500/40 ps-2">
                {s.act === "repeat" ? <Range label={say("كم مرة|How many times|כמה פעמים")} min={1} max={20} busy={busy} value={s.times} onSave={(times) => put(j, { ...s, times })} /> : null}
                <StepList steps={s.do} lang={lang} targets={targets} busy={busy} max={MAX_GROUP} min={1} groups={false} onSave={(inner) => put(j, { ...s, do: inner as PlainStep[] })} testId={`${testId}-g${j}`} />
              </div>
            ) : (
              <ActionFields a={s} lang={lang} targets={targets} busy={busy} onSave={(next) => put(j, next)} />
            )}
          </li>
        ))}
      </ol>
      <button type="button" className={btn} disabled={busy || steps.length >= max} onClick={() => onSave([...steps, newAction("wait", lang)])} data-testid={`${testId}-add`}>+ {say("خطوة|Step|שלב")}</button>
    </div>
  );
}

export function TriggersPanel({ node, lang, targets, busy, onOps, onTest }: { node: PageTreeNode; lang: string; targets: Target[]; busy: boolean; onOps: Ops; onTest: (index: number, fail?: boolean) => void }) {
  const list = triggersOf(node);
  const save = (next: Trigger[]) => onOps(L(), [triggersOp(node, next)]);
  const setOne = (i: number, t: Trigger) => save(list.map((x, j) => (j === i ? t : x)));
  const others = targets.filter((t) => t.id !== node.id);
  return (
    <div className={box} data-testid="studio-triggers">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/80">{say("المشغّلات: لما يصير… اعمل…|Triggers: when… do…|טריגרים: כאשר… עשה…")}</div>
        <span className="text-[10px] text-white/40">{list.length}/8</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {TRIGGER_PRESETS.map((p) => (
          <button key={p.key} type="button" className={btn} disabled={busy || list.length >= 8} onClick={() => save([...list, p.make(lang)])} data-trigger-preset={p.key}>+ {p.name()}</button>
        ))}
      </div>
      {list.map((t, i) => {
        const conditions = t.if ?? [];
        const fails = canFail([...t.do, ...(t.else ?? [])]);
        const letter = t.on === "key" && t.key && t.key.length === 1 ? t.key : "";
        return (
          <div key={i} className="space-y-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2" data-testid={`trigger-${i}`}>
            <Line label={say("اسمه (إلك، اختياري)|Its name (for you, optional)|השם שלו (בשבילך, לא חובה)")} value={t.name ?? ""} max={40} busy={busy} onSave={(name) => setOne(i, { ...t, name: name || undefined })} testId={`trigger-${i}-name`} />
            <div className={part}>{say("لما|When|כאשר")}</div>
            <div className="grid grid-cols-2 gap-2">
              <Pick label={say("شو بيصير|What happens|מה קורה")} value={t.on} options={named(EVENTS)} busy={busy} onPick={(on) => setOne(i, { ...t, on: on as TriggerEvent, ...(on === "scrolled" ? { at: t.at ?? 50 } : on === "timer" ? { at: t.at ?? 5 } : on === "key" ? { key: t.key ?? "Enter" } : {}) })} testId={`trigger-${i}-on`} />
              <label className="flex items-center gap-2 pt-4 text-[11px] text-white/70"><input type="checkbox" checked={t.once === true} disabled={busy} onChange={(e) => setOne(i, { ...t, once: e.target.checked || undefined })} />{say("مرة وحدة بس|Only once|רק פעם אחת")}</label>
            </div>
            {t.on === "scrolled" ? <Range label={say("لما الصفحة تنزل لـ|When the page reaches|כשהעמוד מגיע ל־")} min={0} max={100} unit="%" busy={busy} value={t.at ?? 50} onSave={(at) => setOne(i, { ...t, at })} /> : null}
            {t.on === "timer" || t.on === "load" ? <Range label={say("بعد|After|אחרי")} min={0} max={120} unit="s" busy={busy} value={t.at ?? (t.on === "timer" ? 5 : 0)} onSave={(at) => setOne(i, { ...t, at })} /> : null}
            {t.on === "key" ? (
              <div className="grid grid-cols-2 gap-2">
                <Pick label={say("أي زر|Which key|איזה מקש")} value={letter ? "letter" : t.key ?? "Enter"} options={[...named(KEYS), ["letter", say("حرف أو رقم…|A letter or digit…|אות או ספרה…")]]} busy={busy} onPick={(key) => setOne(i, { ...t, key: key === "letter" ? "a" : key })} testId={`trigger-${i}-key`} />
                {letter ? <Line label={say("الحرف أو الرقم|The letter or digit|האות או הספרה")} value={letter} ltr max={1} busy={busy} ok={(v) => KEY_OK.test(v.toLowerCase()) && v.length === 1} onSave={(v) => setOne(i, { ...t, key: v.toLowerCase() })} testId={`trigger-${i}-letter`} /> : <span />}
              </div>
            ) : null}

            <div className={part}>{say("مين مسموحله|Who may|למי מותר")}</div>
            <div className="grid grid-cols-2 gap-2">
              <Pick label={say("مين|Who|מי")} value={t.who ?? "all"} options={named(WHO)} busy={busy} onPick={(who) => setOne(i, who === "all" ? { ...t, who: undefined, deny: undefined, note: undefined } : { ...t, who: who as Who, deny: t.deny ?? "lock", note: t.note ?? { [lang]: who === "customer" ? say("سجّل دخولك أول|Sign in first|להתחבר קודם") : say("هاد للزوار الجداد|This is for new visitors|זה למבקרים חדשים") } })} testId={`trigger-${i}-who`} />
              {t.who ? <Pick label={say("والباقي|And the others|והאחרים")} value={t.deny ?? "lock"} options={named(DENY)} busy={busy} onPick={(deny) => setOne(i, { ...t, deny: deny as Deny })} testId={`trigger-${i}-deny`} /> : <span />}
            </div>
            {t.who && (t.deny ?? "lock") === "lock" ? <Line label={say("شو بينقاله لما يكبس|What they're told on a press|מה נאמר להם בלחיצה")} value={t.note?.[lang] ?? ""} max={120} busy={busy} onSave={(w) => setOne(i, { ...t, note: { ...(t.note ?? {}), [lang]: w } })} testId={`trigger-${i}-note`} /> : null}
            {t.who ? <p className="text-[10px] leading-4 text-white/40">{say("هاد بيرتّب شو بيبين بالمتجر. أي شي بيغيّر بيانات المتجر بينفحص كمان مرة عالسيرفر.|This arranges what shows in the shop. Whatever changes the store's data is checked again on the server.|זה מסדר מה שמוצג בחנות. כל מה שמשנה את נתוני החנות נבדק שוב בשרת.")}</p> : null}

            <div className={part}>{say("إذا (كل الشروط)|If (all of them)|אם (כל התנאים)")}</div>
            {conditions.map((c, k) => (
              <div key={k} className="space-y-1.5 rounded-lg bg-white/[0.04] p-2" data-testid={`trigger-${i}-if-${k}`}>
                <div className="flex items-end gap-1">
                  <div className="flex-1"><Pick label={say("الشرط|The condition|התנאי")} value={c.if} options={named(CONDITIONS)} busy={busy} onPick={(kind) => setOne(i, { ...t, if: conditions.map((x, m) => (m === k ? newCondition(kind as ConditionKind) : x)) })} testId={`trigger-${i}-if-${k}-kind`} /></div>
                  <button type="button" className={`${btn} text-red-300`} disabled={busy} aria-label={say("شيل|Remove|הסרה")} onClick={() => setOne(i, { ...t, if: conditions.filter((_, m) => m !== k) })} data-testid={`trigger-${i}-if-${k}-remove`}>×</button>
                </div>
                <ConditionFields c={c} busy={busy} onSave={(next) => setOne(i, { ...t, if: conditions.map((x, m) => (m === k ? next : x)) })} testId={`trigger-${i}-if-${k}`} />
              </div>
            ))}
            <button type="button" className={btn} disabled={busy || conditions.length >= MAX_IF} onClick={() => setOne(i, { ...t, if: [...conditions, newCondition("var")] })} data-testid={`trigger-${i}-if-add`}>+ {say("شرط|Condition|תנאי")}</button>

            <div className={part}>{say("اعمل|Do|עשה")}</div>
            <StepList steps={t.do} lang={lang} targets={others} busy={busy} max={MAX_STEPS} min={1} groups onSave={(d) => setOne(i, { ...t, do: d })} testId={`trigger-${i}`} />

            {conditions.length ? (
              <>
                <div className={part}>{say("وإلا (لما الشروط ما بتتحقق)|Else (when they don't hold)|אחרת (כשהתנאים לא מתקיימים)")}</div>
                <StepList steps={t.else ?? []} lang={lang} targets={others} busy={busy} max={MAX_STEPS} groups onSave={(d) => setOne(i, { ...t, else: d })} testId={`trigger-${i}-else`} />
              </>
            ) : null}
            {fails ? (
              <>
                <div className={part}>{say("إذا فشل (قال «لا»، أو المنتج خلص)|On fail (a “no”, or sold out)|אם נכשל («לא», או אזל)")}</div>
                <StepList steps={t.fail ?? []} lang={lang} targets={others} busy={busy} max={MAX_FAIL} groups onSave={(d) => setOne(i, { ...t, fail: d })} testId={`trigger-${i}-fail`} />
              </>
            ) : null}

            <div className="flex flex-wrap gap-1 border-t border-white/[0.06] pt-2">
              <button type="button" className={btn} onClick={() => onTest(i)} data-testid={`trigger-${i}-test`}>▶ {say("جرّب بالمعاينة|Try in the preview|לנסות בתצוגה")}</button>
              {fails ? <button type="button" className={btn} onClick={() => onTest(i, true)} data-testid={`trigger-${i}-test-fail`}>▶ {say("جرّب الفشل (قال «لا» / المنتج خلص)|Try the failure (a “no” / sold out)|לנסות כישלון («לא» / אזל)")}</button> : null}
              <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => save(list.filter((_, k) => k !== i))} data-testid={`trigger-${i}-remove`}>{say("شيل المشغّل|Remove the trigger|הסרת הטריגר")}</button>
            </div>
          </div>
        );
      })}
      <button type="button" className={btn} disabled={busy || list.length >= 8} onClick={() => save([...list, { on: "click", do: [newAction("play", lang)] }])} data-testid="trigger-add">+ {say("مشغّل جديد|New trigger|טריגר חדש")}</button>
      <p className="text-[10px] leading-4 text-white/35">{say("بالمعاينة الكبسة بتختار العناصر، فجرّب من هون (التجربة بتشتغل لأي زائر كان؛ السؤال بيجاوب لحاله، واللي بيطلع من الصفحة أو بيغيّر السلة بينقال بس). بالمتجر بتشتغل لحالها. متغيّر بيبين بأي نص هيك: {{اسمه}}.|In the preview a click selects, so try from here (a try runs whoever it is for; a question answers itself, and what would leave the page or change the bag is only said). In the shop they run by themselves. A variable shows in any text like this: {{its name}}.|בתצוגה המקדימה לחיצה בוחרת, אז לנסות מכאן (ניסיון רץ לכל מבקר; שאלה עונה לעצמה, ומה שיוצא מהעמוד או משנה את הסל רק נאמר). בחנות הם פועלים לבד. משתנה מוצג בכל טקסט כך: {{השם שלו}}.")}</p>
    </div>
  );
}
