// A whole site's choices, step by step (siteForm.ts holds what they make): the business's details, the
// modules it runs and its look. Shown by the install wizard (SiteWizard.tsx) and by the store setup when a
// new copy starts as a site (features/setup, «شو نوع موقعك؟»).
import { useMemo, useState } from "react";
import { adminLang } from "../../lib/lang";
import { say } from "../../studio/say";
import { FRONT_LOOKS, choosable, keepModules, withChoices, type ModuleKey, type SiteBlueprint } from "../../studio/templates/sites";
import { siteLine } from "./sitesText";
import { LANGS, choicesOf, stillSample, type Lang, type SiteForm, type Words3 } from "./siteForm";

const LANG_NAME: Record<Lang, string> = { ar: "عربي", en: "English", he: "עברית" };
const field = "h-10 w-full min-w-0 rounded-xl border border-white/10 bg-surface-925 px-3 text-sm text-white";

type StepProps = { bp: SiteBlueprint; form: SiteForm; onChange: (next: SiteForm) => void };

/** "Still the sample's", beside a detail the owner hasn't changed yet. */
function Sample({ on, testid }: { on: boolean; testid: string }) {
  return on ? (
    <span className="ms-1 rounded-full bg-amber-400/15 px-1.5 text-[10px] text-amber-200" data-testid={`${testid}-sample`}>
      {say("لسّا من المثال|Still the sample's|עדיין של הדוגמה")}
    </span>
  ) : null;
}

/** Words in three languages: typed in the admin's, the others follow until they're given their own. */
export function WordsField({ label, value, onChange, testid, sample = false }: { label: string; value: Words3; onChange: (next: Words3) => void; testid: string; sample?: boolean }) {
  const main = adminLang();
  const [open, setOpen] = useState(false);
  const set = (l: Lang, text: string) => {
    if (l !== main) return onChange({ v: { ...value.v, [l]: text }, own: { ...value.own, [l]: true } });
    const v = { ...value.v, [l]: text };
    for (const o of LANGS) if (o !== main && !value.own[o]) v[o] = text;
    onChange({ v, own: value.own });
  };
  return (
    <div>
      <label className="block text-xs text-white/60">
        {label}
        <Sample on={sample} testid={testid} />
        <input className={`${field} mt-1`} value={value.v[main]} maxLength={120} onChange={(e) => set(main, e.target.value)} data-testid={testid} />
      </label>
      <button type="button" className="mt-1 text-xs text-white/50 underline" onClick={() => setOpen(!open)} data-testid={`${testid}-langs`}>
        {say("باللغات التانية|In the other languages|בשפות האחרות")}
      </button>
      {open ? (
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          {LANGS.filter((l) => l !== main).map((l) => (
            <input key={l} className={field} dir={l === "en" ? "ltr" : "rtl"} value={value.v[l]} maxLength={120} aria-label={`${label} (${LANG_NAME[l]})`} onChange={(e) => set(l, e.target.value)} data-testid={`${testid}-${l}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** About you: the business's name, phone, email, town, address and hours over the sample's. */
export function SiteAbout({ bp, form, onChange }: StepProps) {
  const sample = useMemo(() => stillSample(bp, form), [bp, form]);
  const contact = (k: keyof SiteForm["contact"], v: string) => onChange({ ...form, contact: { ...form.contact, [k]: v } });
  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="sites-about">
      <p className="text-sm text-white/70 sm:col-span-2">{say("تفاصيلك بدل تفاصيل المثال، بكل صفحات الموقع: الاسم، التلفون وواتساب، الإيميل، العنوان والخريطة، وساعات الدوام. بتقدر تغيّرهم بعدين كمان.|Your details instead of the sample's, on every page of the site: the name, phone and WhatsApp, email, address and map, and opening hours. You can change them later too.|הפרטים שלכם במקום של הדוגמה, בכל עמודי האתר: שם, טלפון ווואטסאפ, אימייל, כתובת ומפה, ושעות פתיחה. אפשר לשנות גם אחר כך.")}</p>
      <WordsField label={say("اسم المحل|The business's name|שם העסק")} value={form.name} onChange={(name) => onChange({ ...form, name })} testid="sites-biz-name" sample={sample.has("name")} />
      <label className="block text-xs text-white/60">
        {say("التلفون (وواتساب)|Phone (and WhatsApp)|טלפון (ווואטסאפ)")}
        <Sample on={sample.has("phone")} testid="sites-biz-phone" />
        <input className={`${field} mt-1`} dir="ltr" inputMode="tel" value={form.contact.phone} maxLength={40} onChange={(e) => contact("phone", e.target.value)} data-testid="sites-biz-phone" />
      </label>
      <label className="block text-xs text-white/60">
        {say("الإيميل|Email|אימייל")}
        <Sample on={sample.has("email")} testid="sites-biz-email" />
        <input className={`${field} mt-1`} dir="ltr" type="email" value={form.contact.email} maxLength={120} onChange={(e) => contact("email", e.target.value)} data-testid="sites-biz-email" />
      </label>
      <label className="block text-xs text-white/60">
        {say("البلد (للخريطة)|Town (for the map)|עיר (למפה)")}
        <Sample on={sample.has("city")} testid="sites-biz-city" />
        <input className={`${field} mt-1`} value={form.contact.city} maxLength={80} onChange={(e) => contact("city", e.target.value)} data-testid="sites-biz-city" />
      </label>
      <WordsField label={say("العنوان|Address|כתובת")} value={form.address} onChange={(address) => onChange({ ...form, address })} testid="sites-biz-address" sample={sample.has("address")} />
      <WordsField label={say("ساعات الدوام|Opening hours|שעות פתיחה")} value={form.hours} onChange={(hours) => onChange({ ...form, hours })} testid="sites-biz-hours" sample={sample.has("hours")} />
    </div>
  );
}

/** What it runs: the modules it keeps; one another needs goes with it, and it says so. */
export function SiteRuns({ bp, form, onChange }: StepProps) {
  const lang = adminLang();
  const all = useMemo(() => choosable(bp), [bp]);
  const { dropped } = useMemo(() => keepModules(bp, form.wanted), [bp, form.wanted]);
  const chosen = useMemo(() => withChoices(bp, choicesOf(bp, form)), [bp, form]);
  const nameOf = (k: ModuleKey) => all.find((m) => m.key === k)?.name[lang] ?? k;
  const set = (k: ModuleKey, on: boolean) => onChange({ ...form, wanted: on ? [...form.wanted, k] : form.wanted.filter((x) => x !== k) });
  return (
    <div className="space-y-2" data-testid="sites-run">
      <p className="text-sm text-white/70">{say("شيل اللي ما بدّك ياه: صفحته وقسمه وروابطه بيروحوا معه، وبتقدر تزيدهم بعدين.|Untick what you don't want: its page, its section and its links go with it. You can add them later.|הורידו את מה שלא צריך: העמוד, הקטע והקישורים שלו הולכים איתו. אפשר להוסיף אחר כך.")}</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {all.map((m) => (
          <li key={m.key}>
            <label className="flex items-start gap-2 rounded-xl border border-white/10 p-3 text-sm">
              <input type="checkbox" className="mt-1" checked={form.wanted.includes(m.key)} onChange={(e) => set(m.key, e.target.checked)} data-testid={`sites-run-${m.key}`} />
              <span>
                <span className="font-medium">{m.name[lang]}</span>
                <span className="block text-xs text-white/60">{m.note[lang]}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {dropped.length ? (
        <p className="text-xs text-amber-200" data-testid="sites-run-dropped">
          {say("راحوا معه لأنهم بيحتاجوه: {list}|These go too, as they need it: {list}|גם אלה יורדים, כי הם צריכים אותו: {list}").replace("{list}", dropped.map(nameOf).join("، "))}
        </p>
      ) : null}
      <p className="text-xs text-white/50" data-testid="sites-run-holds">
        {siteLine(chosen, lang)}
      </p>
    </div>
  );
}

/** Its look: the first page's composition (a business's front) and how much it moves. */
export function SiteLook({ bp, form, onChange, themeNote }: StepProps & { themeNote?: string }) {
  const lang = adminLang();
  return (
    <div className="space-y-4" data-testid="sites-look">
      {bp.archetype === "front" ? (
        <fieldset>
          <legend className="text-sm text-white/70">{say("شو بيطلع بالصفحة الأولى؟|What opens the first page?|מה פותח את העמוד הראשון?")}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {FRONT_LOOKS.map((l, k) => (
              <label key={k} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${form.look === k ? "border-accent-400/60 bg-white/10" : "border-white/10"}`}>
                <input type="radio" name="site-look" className="mt-1" checked={form.look === k} onChange={() => onChange({ ...form, look: k })} data-testid={`sites-look-${k}`} />
                <span>
                  <span className="font-medium">{l.name[lang]}</span>
                  <span className="block text-xs text-white/60">{l.note[lang]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset>
        <legend className="text-sm text-white/70">{say("الحركة|Motion|תנועה")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              ["calm", say("هادية|Calm|רגועה")],
              ["rich", say("أكتر حركة|More motion|יותר תנועה")],
            ] as const
          ).map(([k, text]) => (
            <label key={k} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${form.motion === k ? "border-accent-400/60 bg-white/10" : "border-white/10"}`}>
              <input type="radio" name="site-motion" checked={form.motion === k} onChange={() => onChange({ ...form, motion: k })} data-testid={`sites-motion-${k}`} />
              {text}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-white/50">{themeNote ?? say("الثيمات المناسبة لكل نوع موقع جاية بموجة لحالها. هلّق الموقع بيلبس ثيم متجرك.|Themes matched to each kind of site come in a wave of their own. For now the site wears your store's theme.|ערכות נושא מותאמות לכל סוג אתר יגיעו בגל משלהן. בינתיים האתר לובש את ערכת הנושא של החנות.")}</p>
    </div>
  );
}
