/**
 * The selected element's recipes (triggers.ts): a sentence the owner builds for anything on the page.
 *   when     something happens to it (a click, a long press, the mouse, coming into sight, a time, a key…)
 *   who      may run it (everyone, signed-in customers, guests) and what the others get
 *   if       conditions that must all hold (a variable, the device, the bag, signed in…)
 *   do       its steps, one after another; a step can be a group (at once, repeated, one at random)
 *   else     the steps when the conditions don't hold
 *   on fail  the steps when one fails (a "no" to a question, a product that can't be bought, a function that stopped)
 * Ready recipes first; each can be tried in the preview.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import * as CatalogAPI from "../api/catalog.api";
import { useFnDoors } from "./fnDoors";
import * as DataAPI from "../api/dataApi.api";
import { Line, Pick, btn, marks, note, part, sel, warn } from "./smallInputs";
import { Range } from "./LookPanels";
import { ColourPick } from "./StudioTreePanels";
import { say } from "./say";
import {
  ACTS, BURSTS, CONDITIONS, COUNT_CMPS, DENY, EVENTS, FN_ADDRESS, HITS, FLOW_ACTS, GROUP_ACTS, KEYS, KEY_OK, MAX_FAIL, MAX_GROUP, MAX_IF, MAX_STEPS, PHONE_OK, PLAY_WHAT, ROW_CHANGES, SOUNDS,
  TRIGGER_PRESETS, VAR_CMPS, VAR_NAME, VAR_OPS, WHO, canFail, isGroup, newAction, newCondition, newStep, triggersOf, triggersOp, valueOf,
  type Action, type Condition, type ConditionKind, type Deny, type PlainStep, type RowChange, type Step, type StepKind, type Trigger, type TriggerEvent, type VarValue, type Who, type Words,
} from "./triggers";

type Ops = (label: string, ops: PageDraftOp[]) => void;
type Target = { id: string; label: string; type?: string };
const box = "space-y-2.5 rounded-xl border border-white/8 p-3";
const L = () => say("المشغّلات|Triggers|טריגרים");
const named = (list: ReadonlyArray<readonly [string, () => string]>): Array<[string, string]> => list.map(([k, n]) => [k, n()]);
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
          <li key={x.id}><button type="button" disabled={busy} aria-pressed={x.id === value} onClick={() => onPick(x.id)} className={`w-full truncate rounded-lg px-2 py-1 text-start text-[11px] ${x.id === value ? "bg-accent-500/25 text-white" : "text-white/75 hover:bg-white/6"}`} data-product={x.id}>{x.title}</button></li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A function for a step: picked by the address it is called at (admin → Functions → what starts it → a call from
 * the shop), then one box for each thing it is handed, and where its answer is kept. A member who may not look at
 * the functions types the address.
 */
function FnFields({ a, busy, onSave }: { a: Extract<Action, { act: "fn" }>; busy: boolean; onSave: (a: Action) => void }) {
  // A shop's button can't hold an API key: only the addresses a shopper, or anyone, may call (fnDoors.ts).
  const { loading, failed, loaded, doors } = useFnDoors();
  const door = doors.find((d) => d.address === a.fn);
  const given = a.input ?? {};
  const put = (next: { fn?: string; input?: Record<string, string>; as?: string }) => onSave({ act: "fn", ...(next.fn ? { fn: next.fn } : {}), ...(next.input && Object.keys(next.input).length ? { input: next.input } : {}), ...(next.as ? { as: next.as } : {}) });
  const setInput = (name: string, v: string) => {
    const input = { ...given };
    if (v) input[name] = v;
    else delete input[name];
    put({ fn: a.fn, input, as: a.as });
  };
  const value = say("قيمة، أو {{متغيّر}}|A value, or {{variable}}|ערך, או {{משתנה}}");
  // The note speaks of the answer by the name it was given.
  const kept = a.as || "answer";
  return (
    <div className="space-y-1.5" data-testid="trigger-fn">
      {loading ? <p className={note}>…</p> : failed ? (
        <>
          <Line label={say("عنوان الـ function|The function's address|הכתובת של הפונקציה")} value={a.fn ?? ""} ltr max={41} hint="friend-request" busy={busy} ok={(v) => v === "" || FN_ADDRESS.test(v)} onSave={(fn) => put({ fn, input: given, as: a.as })} testId="trigger-fn-address" />
          <p className={note}>{say("ما قدرنا نجيب قائمة الـ Functions (يمكن ما عندك صلاحية تشوفها). اكتب العنوان متل ما هو بصفحتها.|The list of functions couldn't be read (you may not be allowed to see it). Type the address as its page shows it.|לא ניתן לקרוא את רשימת הפונקציות (אולי אין לך הרשאה). להקליד את הכתובת כפי שהיא בעמוד שלה.")}</p>
        </>
      ) : !doors.length && !a.fn ? (
        <p className={warn} data-testid="trigger-fn-none">
          {say("ما في function إلها عنوان نداء من المتجر. افتح الـ Functions، وبقسم «شو بيشغّلها» زيد «نداء»، وانشرها.|No function has an address the shop can call yet. Open Functions, add “a call” under “What starts it”, and publish it.|אין עדיין פונקציה עם כתובת שהחנות יכולה לקרוא לה. לפתוח את הפונקציות, להוסיף «קריאה» תחת «מה מפעיל אותה», ולפרסם.")}{" "}
          <a className="underline" href="/admin/functions" target="_blank" rel="noreferrer">{say("الـ Functions ↗|Functions ↗|פונקציות ↗")}</a>
        </p>
      ) : (
        <Pick label={say("أي function|Which function|איזו פונקציה")} value={a.fn ?? ""} busy={busy} testId="trigger-fn-pick"
          options={[["", say("اختار…|Pick one…|לבחור…")], ...doors.map((d): [string, string] => [d.address, `${d.fn.name} · ${d.address}`])]}
          onPick={(fn) => {
            // What it is handed stays where the newly picked one takes the same name.
            const takes = new Set((doors.find((d) => d.address === fn)?.fn.takes ?? []).map((i) => i.name));
            put({ fn, input: Object.fromEntries(Object.entries(given).filter(([k]) => takes.has(k))), as: a.as });
          }} />
      )}
      {!a.fn && !failed && doors.length ? <p className={warn}>{say("لحد ما تختار، الخطوة ما بتعمل شي.|Until you pick one, the step does nothing.|עד שבוחרים, השלב לא עושה כלום.")}</p> : null}
      {a.fn && loaded && !door ? <p className={warn} data-testid="trigger-fn-gone">{say("هالعنوان مش موجود هلأ (انشال، تطفّى، أو صار لبرنامج بمفتاح). اختار غيره.|This address isn't there now (removed, switched off, or it became a key's). Pick another.|הכתובת הזו לא קיימת כרגע (הוסרה, כובתה, או הפכה לשל מפתח). לבחור אחרת.")}</p> : null}
      {door && (!door.fn.published || !door.fn.enabled) ? <p className={warn} data-testid="trigger-fn-off">{!door.fn.published ? say("هاي الـ function لسا مش منشورة: الزر ما بيشتغل لحد ما تنشرها.|This function isn't published yet: the button won't work until it is.|הפונקציה הזו עדיין לא פורסמה: הכפתור לא יעבוד עד שתפורסם.") : say("هاي الـ function مطفية: الزر ما بيشتغل لحد ما تشغّلها.|This function is switched off: the button won't work until it is on.|הפונקציה הזו כבויה: הכפתור לא יעבוד עד שתודלק.")}</p> : null}
      {door?.who === "customer" ? <p className={note} data-testid="trigger-fn-who">{say("بتشتغل بس لزبون مسجّل دخوله (وبتعرف مين هو). الزائر بينقاله «سجّل دخولك أول»؛ أو خلّي «مين مسموحله» فوق = زبون مسجّل.|It runs only for a signed-in shopper (and knows who they are). A guest is told “Sign in first”; or set “Who may” above to a signed-in customer.|רצה רק ללקוח מחובר (ויודעת מי הוא). לאורח נאמר «יש להתחבר קודם»; או להגדיר למעלה «למי מותר» = לקוח מחובר.")}</p> : null}
      {door ? door.fn.takes.map((i) => (
        <Line key={i.name} label={`${say("بتاخد|It takes|מקבלת")} ${i.name}${i.required ? " *" : ""}${i.note ? ` · ${i.note}` : ""}`} value={given[i.name] ?? ""} max={300} hint={value} busy={busy} onSave={(v) => setInput(i.name, v)} testId={`trigger-fn-input-${i.name}`} />
      )) : Object.keys(given).map((name) => (
        <Line key={name} label={`${say("بتاخد|It takes|מקבלת")} ${name}`} value={given[name]} max={300} hint={value} busy={busy} onSave={(v) => setInput(name, v)} testId={`trigger-fn-input-${name}`} />
      ))}
      <Line label={say("احفظ جوابها بمتغيّر (اختياري)|Keep its answer in a variable (optional)|לשמור את התשובה במשתנה (לא חובה)")} value={a.as ?? ""} ltr max={24} hint="answer" busy={busy} ok={(v) => v === "" || VAR_NAME.test(v)} onSave={(as) => put({ fn: a.fn, input: given, as })} testId="trigger-fn-as" />
      <p className={note} data-testid="trigger-fn-help">{marks(say(`جوابها بيبين بأي نص هيك: {{${kept}}}، وإذا كان صف فكل حقل منه هيك: {{${kept}_field}} (بدل field اسم الحقل). إذا وقفت، كلامها بيبين للزبون؛ بدك تقول شي تاني؟ حط خطوات بـ«إذا فشل»، وكلامها فيها هيك: {{error}}.|Its answer shows in any text like {{${kept}}}; a row's fields like {{${kept}_field}} (the field's name in place of field). When it stops, its own words are shown to the shopper; to say something else, add “on fail” steps, with its words as {{error}}.|התשובה מוצגת בכל טקסט כך: {{${kept}}}; שדות של שורה כך: {{${kept}_field}} (שם השדה במקום field). כשהיא נעצרת, המילים שלה מוצגות ללקוח; כדי לומר משהו אחר, להוסיף שלבי «אם נכשל», והמילים שלה שם כך: {{error}}.`))}</p>
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
    case "fn":
      return <FnFields a={a} busy={busy} onSave={onSave} />;
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
          <li key={j} className="space-y-1.5 rounded-lg bg-white/4 p-2" data-testid={`${testId}-step-${j}`}>
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

/**
 * A "row" recipe: the table it listens to (one a shop page may read), what it waits for, and whether the visitor's
 * own rows count too. Its steps see the row's values ({{row_<field>}}).
 */
function RowFields({ t, i, lang, busy, onSave }: { t: Trigger; i: number; lang: string; busy: boolean; onSave: (t: Trigger) => void }) {
  const api = useQuery({ queryKey: ["data-api"], queryFn: DataAPI.getApi, staleTime: 60_000, retry: false });
  const readable = (api.data?.tables ?? []).filter((x) => x.access.read !== "off" || (x.roles?.read.length ?? 0) > 0);
  const table = readable.find((x) => x.slug === t.table);
  const title = (x: DataAPI.ApiTable) => `${x.name?.[lang as "ar"] || x.name?.ar || x.name?.en || x.slug} · ${x.slug}`;
  const first = table?.fields.find((f) => f.type === "text")?.id ?? "title";
  return (
    <>
      {api.isError ? (
        <>
          <p className={note}>{say("ما قدرنا نجيب قائمة الجداول المفتوحة (يمكن ما عندك صلاحية «الـ API»). اكتب عنوان الجدول.|The list of open tables couldn't be read (you may not have the “API” permission). Type the table's address.|לא ניתן לקרוא את רשימת הטבלאות הפתוחות (אולי אין לך הרשאת «API»). להקליד את כתובת הטבלה.")}</p>
          <Line label={say("عنوان الجدول|The table's address|כתובת הטבלה")} value={t.table ?? ""} ltr max={41} busy={busy} ok={(v) => v === "" || /^[a-z0-9][a-z0-9-]{0,40}$/.test(v)} onSave={(v) => onSave({ ...t, table: v || undefined })} testId={`trigger-${i}-table`} />
        </>
      ) : (
        <Pick label={say("أي جدول|Which table|איזו טבלה")} value={t.table ?? ""} options={[["", say("اختار…|Pick one…|לבחור…")], ...readable.map((x): [string, string] => [x.slug, title(x)]), ...(t.table && !table && api.data ? [[t.table, `${t.table} ⚠`] as [string, string]] : [])]} busy={busy} onPick={(slug) => onSave({ ...t, table: slug || undefined })} testId={`trigger-${i}-table`} />
      )}
      {api.data && !readable.length ? <p className={warn} data-testid={`trigger-${i}-no-tables`}>⚠ {say("ما في جدول مفتوح للقراءة. افتح واحد من «الـ API والمفاتيح».|No table is open for reading. Open one in “API & keys”.|אין טבלה פתוחה לקריאה. לפתוח אחת ב״API ומפתחות״.")}</p> : null}
      {api.data && t.table && !table ? <p className={warn} data-testid={`trigger-${i}-table-closed`}>⚠ {say("هالجدول مش مفتوح للقراءة، فما رح يوصل منه شي.|This table isn't open for reading, so nothing will come from it.|הטבלה הזו לא פתוחה לקריאה, אז לא יגיע ממנה כלום.")}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <Pick label={say("شو بيستنّى|What it waits for|למה הוא מחכה")} value={t.change ?? "added"} options={named(ROW_CHANGES)} busy={busy} onPick={(change) => onSave({ ...t, change: change as RowChange })} testId={`trigger-${i}-change`} />
        <label className="flex items-center gap-2 pt-4 text-[11px] text-white/70"><input type="checkbox" checked={t.own === true} disabled={busy} onChange={(e) => onSave({ ...t, own: e.target.checked || undefined })} data-testid={`trigger-${i}-own`} />{say("وكمان سطور الزائر نفسه|The visitor's own rows too|גם השורות של המבקר עצמו")}</label>
      </div>
      <p className="text-[10px] leading-4 text-white/40" data-testid={`trigger-${i}-row-help`}>{marks(say(`بيشتغل والصفحة مفتوحة، لما يوصل سطر للجدول بيقدر الزائر يقراه (حسب قواعد الجدول): متل رسالة جديدة إله أو طلب صداقة. بالخطوات: {{row_${first}}} قيمة حقل بالسطر، و {{row_by}} مين ضافه. مثلاً إشعار: «وصلتك رسالة من {{row_by}}».|It runs while the page is open, when a row comes in that the visitor may read (by the table's rules): a new message to them, a friend request. In the steps: {{row_${first}}} is a field of the row, and {{row_by}} who added it. A notice, say: “A message from {{row_by}}”.|פועל כשהעמוד פתוח, כשמגיעה שורה שהמבקר רשאי לקרוא (לפי כללי הטבלה): הודעה חדשה אליו, בקשת חברות. בשלבים: {{row_${first}}} ערך של שדה בשורה, ו-{{row_by}} מי שהוסיף אותה. למשל הודעה: ״הודעה מ-{{row_by}}״.`))}</p>
    </>
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
          <div key={i} className="space-y-2 rounded-lg border border-white/8 bg-white/2 p-2" data-testid={`trigger-${i}`}>
            <Line label={say("اسمه (إلك، اختياري)|Its name (for you, optional)|השם שלו (בשבילך, לא חובה)")} value={t.name ?? ""} max={40} busy={busy} onSave={(name) => setOne(i, { ...t, name: name || undefined })} testId={`trigger-${i}-name`} />
            <div className={part}>{say("لما|When|כאשר")}</div>
            <div className="grid grid-cols-2 gap-2">
              <Pick label={say("شو بيصير|What happens|מה קורה")} value={t.on} options={named(EVENTS)} busy={busy} onPick={(on) => setOne(i, { ...t, on: on as TriggerEvent, ...(on === "scrolled" ? { at: t.at ?? 50 } : on === "timer" ? { at: t.at ?? 5 } : on === "key" ? { key: t.key ?? "Enter" } : {}) })} testId={`trigger-${i}-on`} />
              <label className="flex items-center gap-2 pt-4 text-[11px] text-white/70"><input type="checkbox" checked={t.once === true} disabled={busy} onChange={(e) => setOne(i, { ...t, once: e.target.checked || undefined })} />{say("مرة وحدة بس|Only once|רק פעם אחת")}</label>
            </div>
            {t.on === "scrolled" ? <Range label={say("لما الصفحة تنزل لـ|When the page reaches|כשהעמוד מגיע ל־")} min={0} max={100} unit="%" busy={busy} value={t.at ?? 50} onSave={(at) => setOne(i, { ...t, at })} /> : null}
            {t.on === "timer" || t.on === "load" ? <Range label={say("بعد|After|אחרי")} min={0} max={120} unit="s" busy={busy} value={t.at ?? (t.on === "timer" ? 5 : 0)} onSave={(at) => setOne(i, { ...t, at })} /> : null}
            {t.on === "row" ? <RowFields t={t} i={i} lang={lang} busy={busy} onSave={(next) => setOne(i, next)} /> : null}
            {t.on === "hit" ? (
              <>
                <Pick label={say("بشو بيصطدم|What it hits|במה הוא מתנגש")} value={t.hit ?? "any"} options={[...named(HITS), ...others.map((o): [string, string] => [o.id, o.label])]} busy={busy} onPick={(hit) => setOne(i, { ...t, hit: hit === "any" ? undefined : hit })} testId={`trigger-${i}-hit`} />
                <p className="text-[10px] leading-4 text-white/40">{say("بيشتغل لما هالعنصر يكون جسم بعالم فيزيائي شغّال (مش مخبوز لحركة جاهزة)، وكل ما يصطدم. علّم «مرة وحدة بس» إذا بدك ياه مرة.|It runs while this element is a body in a running physics world (not one baked into keyframes), each time it hits. Tick “Only once” to have it once.|פועל כשהאלמנט הוא גוף בעולם פיזיקלי פעיל (לא אפוי לתנועה מוכנה), בכל התנגשות. סמן ״רק פעם אחת״ כדי שיקרה פעם אחת.")}</p>
              </>
            ) : null}
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
              <div key={k} className="space-y-1.5 rounded-lg bg-white/4 p-2" data-testid={`trigger-${i}-if-${k}`}>
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
                <div className={part}>{say("إذا فشل (قال «لا»، المنتج خلص، أو function وقفت)|On fail (a “no”, sold out, or a function stopped)|אם נכשל («לא», אזל, או פונקציה נעצרה)")}</div>
                <StepList steps={t.fail ?? []} lang={lang} targets={others} busy={busy} max={MAX_FAIL} groups onSave={(d) => setOne(i, { ...t, fail: d })} testId={`trigger-${i}-fail`} />
              </>
            ) : null}

            <div className="flex flex-wrap gap-1 border-t border-white/6 pt-2">
              <button type="button" className={btn} onClick={() => onTest(i)} data-testid={`trigger-${i}-test`}>▶ {say("جرّب بالمعاينة|Try in the preview|לנסות בתצוגה")}</button>
              {fails ? <button type="button" className={btn} onClick={() => onTest(i, true)} data-testid={`trigger-${i}-test-fail`}>▶ {say("جرّب الفشل (قال «لا» / المنتج خلص / function وقفت)|Try the failure (a “no” / sold out / a function stopped)|לנסות כישלון («לא» / אזל / פונקציה נעצרה)")}</button> : null}
              <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => save(list.filter((_, k) => k !== i))} data-testid={`trigger-${i}-remove`}>{say("شيل المشغّل|Remove the trigger|הסרת הטריגר")}</button>
            </div>
          </div>
        );
      })}
      <button type="button" className={btn} disabled={busy || list.length >= 8} onClick={() => save([...list, { on: "click", do: [newAction("play", lang)] }])} data-testid="trigger-add">+ {say("مشغّل جديد|New trigger|טריגר חדש")}</button>
      <p className="text-[10px] leading-4 text-white/35">{say("بالمعاينة الكبسة بتختار العناصر، فجرّب من هون (التجربة بتشتغل لأي زائر كان؛ السؤال بيجاوب لحاله، واللي بيطلع من الصفحة أو بيغيّر السلة أو بيشغّل function بينقال بس). بالمتجر بتشتغل لحالها. متغيّر بيبين بأي نص هيك: {{اسمه}}.|In the preview a click selects, so try from here (a try runs whoever it is for; a question answers itself, and what would leave the page, change the bag or run a function is only said). In the shop they run by themselves. A variable shows in any text like this: {{its name}}.|בתצוגה המקדימה לחיצה בוחרת, אז לנסות מכאן (ניסיון רץ לכל מבקר; שאלה עונה לעצמה, ומה שיוצא מהעמוד, משנה את הסל או מפעיל פונקציה רק נאמר). בחנות הם פועלים לבד. משתנה מוצג בכל טקסט כך: {{השם שלו}}.")}</p>
    </div>
  );
}
