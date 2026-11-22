// ميزاتي → مواقع كاملة → a picked site's install wizard (sites wave 0.3, docs/sites-300-plan.ar.md):
//   1. the site: what it is and what it is built from
//   2. about you: the business's name, phone, email, town, address and hours over the sample's
//   3. what it runs: the modules it keeps (one another needs goes with it, and it says so)
//   4. its look: the first page's composition and how much it moves
//   5. install as a draft (what it would make here first); then the site's own page says what is left:
//      switch it on, publish its pages, «خلّيه الرئيسية».
// The choices go into the file (studio/templates/sites/choices.ts), so an upgrade keeps them.
import { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { adminLang } from "../../lib/lang";
import { say } from "../../studio/say";
import { FRONT_LOOKS, buildChosen, choosable, keepModules, slugsOf, withChoices, type ModuleKey, type SiteBiz, type SiteBlueprint, type SiteChoices } from "../../studio/templates/sites";
import { InstallFlow } from "./FeatureTemplates";
import { siteLine } from "./sitesText";

type Lang = "ar" | "en" | "he";
type W = Record<Lang, string>;
const LANGS: Lang[] = ["ar", "en", "he"];
const LANG_NAME: Record<Lang, string> = { ar: "عربي", en: "English", he: "עברית" };
const field = "h-10 w-full min-w-0 rounded-xl border border-white/10 bg-surface-925 px-3 text-sm text-white";
/** The steps' names, in the admin's language as it is now. */
const steps = () => [say("الموقع|The site|האתר"), say("عنّك|About you|עליכם"), say("شو بيشتغل|What it runs|מה פועל"), say("الشكل|The look|המראה"), say("ثبّت|Install|התקנה")];

/** Words in three languages: typed in the admin's, the others follow until they're given their own. */
function WordsField({ label, value, onChange, testid }: { label: string; value: { v: W; own: Record<Lang, boolean> }; onChange: (next: { v: W; own: Record<Lang, boolean> }) => void; testid: string }) {
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

type Words3 = { v: W; own: Record<Lang, boolean> };
const words3 = (w: W): Words3 => ({ v: { ...w }, own: { ar: false, en: false, he: false } });
const same = (a: W, b: W) => LANGS.every((l) => a[l] === b[l]);

export function SiteWizard({ site: bp }: { site: SiteBlueprint }) {
  const lang = adminLang();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(() => words3(bp.biz.name));
  const [address, setAddress] = useState(() => words3(bp.biz.address));
  const [hours, setHours] = useState(() => words3(bp.biz.hours));
  const [contact, setContact] = useState({ phone: bp.biz.phone, email: bp.biz.email, city: bp.biz.city });
  const all = useMemo(() => choosable(bp), [bp]);
  const [wanted, setWanted] = useState<ModuleKey[]>(() => all.map((m) => m.key));
  const [look, setLook] = useState(bp.look % 6);
  const [motion, setMotion] = useState<"calm" | "rich">("calm");

  // What differs from the sample only: an untouched site installs as the gallery's.
  const choices: SiteChoices = useMemo(() => {
    const biz: Partial<SiteBiz> = {};
    if (!same(name.v, bp.biz.name)) biz.name = name.v;
    if (!same(address.v, bp.biz.address)) biz.address = address.v;
    if (!same(hours.v, bp.biz.hours)) biz.hours = hours.v;
    for (const k of ["phone", "email", "city"] as const) if (contact[k].trim() && contact[k].trim() !== bp.biz[k]) biz[k] = contact[k].trim();
    const { kept } = keepModules(bp, wanted);
    return {
      ...(Object.keys(biz).length ? { biz } : {}),
      ...(kept.length !== all.length ? { modules: kept } : {}),
      ...(look !== bp.look % 6 ? { look } : {}),
      ...(motion !== "calm" ? { motion } : {}),
    };
  }, [bp, name, address, hours, contact, wanted, all.length, look, motion]);
  const chosen = useMemo(() => withChoices(bp, choices), [bp, choices]);
  const { dropped } = useMemo(() => keepModules(bp, wanted), [bp, wanted]);
  const nameOf = (k: ModuleKey) => all.find((m) => m.key === k)?.name[lang] ?? k;
  // Built once it is to be installed (a site is some 70 KB of pages).
  const file = useMemo(() => (step === 4 ? buildChosen(bp, Object.keys(choices).length ? choices : null, lang) : null), [step, bp, choices, lang]);
  const tag = JSON.stringify(choices);

  return (
    <div className="mt-3" data-testid="sites-wizard" data-step={step}>
      <ol className="flex flex-wrap gap-1.5" data-testid="sites-steps">
        {steps().map((s, k) => (
          <li key={s}>
            <button type="button" disabled={k > step} onClick={() => setStep(k)} className={`h-8 rounded-full px-3 text-xs ${k === step ? "bg-white/15 text-white" : k < step ? "text-emerald-300" : "text-white/40"}`} data-testid={`sites-step-${k}`}>
              {k < step ? "✓ " : `${k + 1}. `}
              {s}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-white/70">{bp.note[lang]}</p>
          <p className="text-xs text-white/60" data-testid="sites-home-note">
            {say("صفحة الموقع الأولى عنوانها {home}، وصفحة متجرك الرئيسية ما بتتغيّر لحد ما تختار «خلّيه الرئيسية».|The site's first page is at {home}; your store's home doesn't change until you choose “Make it the home”.|העמוד הראשון של האתר בכתובת {home}, ודף הבית של החנות לא משתנה עד שבוחרים «להפוך לדף הבית».").replace("{home}", slugsOf(bp).home)}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-white/60">{say("مبني من:|Built from:|בנוי מ:")}</span>
            <ul className="flex flex-wrap gap-1.5" data-testid="sites-modules">
              {all.map((m) => (
                <li key={m.key} title={m.note[lang]} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80" data-testid={`sites-module-${m.key}`}>
                  {m.name[lang]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="mt-3 grid gap-4 sm:grid-cols-2" data-testid="sites-about">
          <p className="text-sm text-white/70 sm:col-span-2">{say("تفاصيلك بدل تفاصيل المثال، بكل صفحات الموقع: الاسم، التلفون وواتساب، الإيميل، العنوان والخريطة، وساعات الدوام. بتقدر تغيّرهم بعدين كمان.|Your details instead of the sample's, on every page of the site: the name, phone and WhatsApp, email, address and map, and opening hours. You can change them later too.|הפרטים שלכם במקום של הדוגמה, בכל עמודי האתר: שם, טלפון ווואטסאפ, אימייל, כתובת ומפה, ושעות פתיחה. אפשר לשנות גם אחר כך.")}</p>
          <WordsField label={say("اسم المحل|The business's name|שם העסק")} value={name} onChange={setName} testid="sites-biz-name" />
          <label className="block text-xs text-white/60">
            {say("التلفون (وواتساب)|Phone (and WhatsApp)|טלפון (ווואטסאפ)")}
            <input className={`${field} mt-1`} dir="ltr" inputMode="tel" value={contact.phone} maxLength={40} onChange={(e) => setContact({ ...contact, phone: e.target.value })} data-testid="sites-biz-phone" />
          </label>
          <label className="block text-xs text-white/60">
            {say("الإيميل|Email|אימייל")}
            <input className={`${field} mt-1`} dir="ltr" type="email" value={contact.email} maxLength={120} onChange={(e) => setContact({ ...contact, email: e.target.value })} data-testid="sites-biz-email" />
          </label>
          <label className="block text-xs text-white/60">
            {say("البلد (للخريطة)|Town (for the map)|עיר (למפה)")}
            <input className={`${field} mt-1`} value={contact.city} maxLength={80} onChange={(e) => setContact({ ...contact, city: e.target.value })} data-testid="sites-biz-city" />
          </label>
          <WordsField label={say("العنوان|Address|כתובת")} value={address} onChange={setAddress} testid="sites-biz-address" />
          <WordsField label={say("ساعات الدوام|Opening hours|שעות פתיחה")} value={hours} onChange={setHours} testid="sites-biz-hours" />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-3 space-y-2" data-testid="sites-run">
          <p className="text-sm text-white/70">{say("شيل اللي ما بدّك ياه: صفحته وقسمه وروابطه بيروحوا معه، وبتقدر تزيدهم بعدين.|Untick what you don't want: its page, its section and its links go with it. You can add them later.|הורידו את מה שלא צריך: העמוד, הקטע והקישורים שלו הולכים איתו. אפשר להוסיף אחר כך.")}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {all.map((m) => (
              <li key={m.key}>
                <label className="flex items-start gap-2 rounded-xl border border-white/10 p-3 text-sm">
                  <input type="checkbox" className="mt-1" checked={wanted.includes(m.key)} onChange={(e) => setWanted(e.target.checked ? [...wanted, m.key] : wanted.filter((k) => k !== m.key))} data-testid={`sites-run-${m.key}`} />
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
      ) : null}

      {step === 3 ? (
        <div className="mt-3 space-y-4" data-testid="sites-look">
          {bp.archetype === "front" ? (
            <fieldset>
              <legend className="text-sm text-white/70">{say("شو بيطلع بالصفحة الأولى؟|What opens the first page?|מה פותח את העמוד הראשון?")}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {FRONT_LOOKS.map((l, k) => (
                  <label key={k} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${look === k ? "border-accent-400/60 bg-white/10" : "border-white/10"}`}>
                    <input type="radio" name="site-look" className="mt-1" checked={look === k} onChange={() => setLook(k)} data-testid={`sites-look-${k}`} />
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
                <label key={k} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${motion === k ? "border-accent-400/60 bg-white/10" : "border-white/10"}`}>
                  <input type="radio" name="site-motion" checked={motion === k} onChange={() => setMotion(k)} data-testid={`sites-motion-${k}`} />
                  {text}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-white/50">{say("الثيمات المناسبة لكل نوع موقع جاية بموجة لحالها. هلّق الموقع بيلبس ثيم متجرك.|Themes matched to each kind of site come in a wave of their own. For now the site wears your store's theme.|ערכות נושא מותאמות לכל סוג אתר יגיעו בגל משלהן. בינתיים האתר לובש את ערכת הנושא של החנות.")}</p>
        </div>
      ) : null}

      {step === 4 && file ? (
        <div className="mt-3" data-testid="sites-install">
          <p className="text-sm text-white/70">{say("بيتثبّت كمسودة: ولا شي بيطلع للناس. بعدها بصفحة الموقع: شغّله، راجع صفحاته وانشرها، وبعدين «خلّيه الرئيسية» إذا بدّك ياه على عنوان متجرك.|It installs as a draft: nothing shows to anyone. Then, on the site's page: switch it on, look over its pages and publish them, then “Make it the home” if you want it at your store's address.|הוא מותקן כטיוטה: שום דבר לא מוצג. אחר כך בעמוד האתר: מפעילים, עוברים על העמודים ומפרסמים, ואז «להפוך לדף הבית» אם רוצים אותו בכתובת החנות.")}</p>
          <InstallFlow key={`${bp.key}:${bp.version}:${lang}:${tag}`} id={`site:${bp.key}:${bp.version}:${lang}:${tag}`} template={file} />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {step > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => setStep(step - 1)} data-testid="sites-back">
            {say("رجوع|Back|חזרה")}
          </Button>
        ) : null}
        {step < 4 ? (
          <Button size="sm" variant="secondary" onClick={() => setStep(step + 1)} data-testid="sites-next">
            {say("التالي|Next|הבא")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
