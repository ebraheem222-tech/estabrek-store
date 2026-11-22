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
import { buildChosen, choosable, slugsOf, type SiteBlueprint } from "../../studio/templates/sites";
import { InstallFlow } from "./FeatureTemplates";
import { choicesOf, choicesOrNull, siteForm } from "./siteForm";
import { SiteAbout, SiteLook, SiteRuns } from "./SiteSteps";

/** The steps' names, in the admin's language as it is now. */
const steps = () => [say("الموقع|The site|האתר"), say("عنّك|About you|עליכם"), say("شو بيشتغل|What it runs|מה פועל"), say("الشكل|The look|המראה"), say("ثبّت|Install|התקנה")];

export function SiteWizard({ site: bp }: { site: SiteBlueprint }) {
  const lang = adminLang();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => siteForm(bp));
  const all = useMemo(() => choosable(bp), [bp]);
  // What differs from the sample only: an untouched site installs as the gallery's.
  const choices = useMemo(() => choicesOf(bp, form), [bp, form]);
  // Built once it is to be installed (a site is some 70 KB of pages).
  const file = useMemo(() => (step === 4 ? buildChosen(bp, choicesOrNull(choices), lang) : null), [step, bp, choices, lang]);
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
        <div className="mt-3">
          <SiteAbout bp={bp} form={form} onChange={setForm} />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-3">
          <SiteRuns bp={bp} form={form} onChange={setForm} />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-3">
          <SiteLook bp={bp} form={form} onChange={setForm} />
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
