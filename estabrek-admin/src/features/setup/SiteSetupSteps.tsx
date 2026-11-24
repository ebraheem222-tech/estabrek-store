// The store setup's steps for a whole site (sites wave 0.4): «شو نوع موقعك؟» (an online store as before, or
// one of the whole sites), the last step that sets it up (siteSetupRun.ts) and what is ready after it.
import { useState } from "react";
import { Link } from "react-router-dom";
import { adminLang } from "../../lib/lang";
import { say } from "../../studio/say";
import { SITES, SITE_FIELDS, type SiteBlueprint, type SiteField } from "../../studio/templates/sites";
import { siteLine } from "../myFeatures/sitesText";
import { runSteps, type SiteRun, type SiteRunStep } from "./siteSetupRun";
import { siteKindName as kindOf } from "./siteSetup";

const card = (on: boolean) => `flex w-full flex-col items-start gap-1 rounded-2xl border p-4 text-start transition ${on ? "border-accent-400 bg-accent-500/15" : "border-white/8 bg-white/3 hover:border-white/20"}`;
/**
 * «شو نوع موقعك؟»: an online store (null), or a whole site made for one kind of business. `suggested`: the site
 * picked for this store when its copy was made (نسخ الزباين), which the step opens on; any other is still a click away.
 */
export function KindStep({ picked, onPick, suggested = null }: { picked: SiteBlueprint | null; onPick: (bp: SiteBlueprint | null) => void; suggested?: SiteBlueprint | null }) {
  const lang = adminLang();
  const fields = (Object.keys(SITE_FIELDS) as SiteField[]).filter((f) => SITES.some((s) => s.field === f));
  return (
    <section className="space-y-6" data-testid="setup-kind" data-picked={picked?.key ?? "store"}>
      <div>
        <h1 className="text-2xl font-bold">{say("شو نوع موقعك؟|What kind of site is it?|איזה סוג אתר זה?")}</h1>
        <p className="mt-1 text-sm text-white/60">
          {say("متجر بيبيع منتجات، أو موقع كامل لشغلك (مطعم، عيادة، صالون…) بصفحاته وجداوله ونماذجه جاهزين، بتفاصيلك إنت. بتقدر تزيد التاني بعدين.|A store that sells products, or a whole site for your business (a restaurant, a clinic, a salon…) with its pages, tables and forms ready, with your own details. You can add the other later.|חנות שמוכרת מוצרים, או אתר שלם לעסק שלכם (מסעדה, מרפאה, סלון…) עם עמודים, טבלאות וטפסים מוכנים, עם הפרטים שלכם. אפשר להוסיף את השני אחר כך.")}
        </p>
        {suggested ? (
          <p className="mt-3 rounded-xl border border-accent-400/30 bg-accent-500/10 px-3 py-2 text-sm" data-testid="setup-kind-suggested" data-site={suggested.key}>
            {say("اللي عمل نسختك اختارلك «{kind}»، وفيك تختار غيره.|Whoever made your copy picked «{kind}» for you; you can pick another.|מי שהכין את העותק שלכם בחר עבורכם «{kind}», ואפשר לבחור אחר.").replace("{kind}", kindOf(suggested, lang))}
          </p>
        ) : null}
      </div>
      <div role="radiogroup" aria-label={say("نوع الموقع|Kind of site|סוג האתר")} className="space-y-6">
        <button type="button" role="radio" aria-checked={!picked} onClick={() => onPick(null)} className={card(!picked)} data-testid="setup-kind-store">
          <span className="text-2xl" aria-hidden>
            🛍️
          </span>
          <span className="text-sm font-semibold">{say("متجر أونلاين|An online store|חנות אונליין")}</span>
          <span className="text-[11px] text-white/50">{say("منتجات وأقسام، سلة ودفع، طلبات وشحن.|Products and categories, a cart and payment, orders and shipping.|מוצרים וקטגוריות, עגלה ותשלום, הזמנות ומשלוחים.")}</span>
        </button>
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-white/80">{say("موقع كامل لشغلك|A whole site for your business|אתר שלם לעסק שלכם")}</h2>
          {fields.map((f) => (
            <div key={f}>
              <h3 className="mb-2 text-xs text-white/50">{SITE_FIELDS[f][lang]}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {SITES.filter((s) => s.field === f).map((s) => (
                  <button key={s.key} type="button" role="radio" aria-checked={picked?.key === s.key} onClick={() => onPick(s)} className={card(picked?.key === s.key)} data-testid={`setup-kind-${s.key}`}>
                    <span className="text-sm font-semibold">{kindOf(s, lang)}</span>
                    <span className="text-[11px] leading-5 text-white/50">{s.note[lang]}</span>
                    <span className="text-[10px] text-white/35">{siteLine(s, lang)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const RUN_TEXT: Record<SiteRunStep, string> = {
  setup: "اسم المتجر وثيمه والمساعد|The store's name, theme and assistant|שם החנות, ערכת הנושא והעוזר",
  install: "الموقع بصفحاته وجداوله وسطوره الجاهزة|The site with its pages, tables and ready rows|האתר עם העמודים, הטבלאות והשורות המוכנות",
  on: "تشغيله|Switching it on|הפעלה",
  publish: "نشر صفحاته|Publishing its pages|פרסום העמודים",
  home: "على عنوان متجرك، مع قوائمه|At your store's address, with its menus|בכתובת של החנות, עם התפריטים",
};

/** The last step: what it makes, whether it goes live now, and how far it got. */
export function SiteFinish({ bp, chosen, sample, live, onLive, run, owner }: { bp: SiteBlueprint; chosen: SiteBlueprint; /** The details still the sample's, by name. */ sample: string[]; live: boolean; onLive: (v: boolean) => void; run: SiteRun | null; owner: boolean }) {
  const lang = adminLang();
  const started = Boolean(run?.done.length || run?.failed);
  return (
    <section className="mx-auto max-w-2xl space-y-5" data-testid="setup-site-finish">
      <h1 className="text-2xl font-bold">{say("جاهز نجهّزه|Ready to set it up|מוכנים להקים")}</h1>
      <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
        <div className="text-sm font-semibold" data-testid="setup-site-name">
          {chosen.name[lang]}
        </div>
        <div className="mt-1 text-xs text-white/50">{siteLine(chosen, lang)}</div>
        <p className="mt-2 text-xs text-white/50">{say("بيلبس ثيم مختار لهاد النوع من المواقع ({kind})، وبتغيّره من الثيمات بأي وقت.|It wears a theme picked for this kind of site ({kind}); change it in Themes any time.|הוא לובש ערכת נושא שנבחרה לסוג האתר הזה ({kind}), ואפשר להחליף אותה בערכות הנושא בכל זמן.").replace("{kind}", kindOf(bp, lang))}</p>
      </div>
      {sample.length ? (
        <p className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200" data-testid="setup-site-sample">
          {say("لسّا من المثال، وبيطلعوا للناس هيك لحد ما تغيّرهم (خطوة «عنّك»): {list}|Still the sample's, and shown like that until you change them (the “About you” step): {list}|עדיין של הדוגמה, ויוצגו כך עד שתשנו אותם (שלב «עליכם»): {list}").replace("{list}", sample.join("، "))}
        </p>
      ) : null}
      <label className="flex items-start gap-3 rounded-2xl border border-white/8 p-4">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={live} disabled={started} onChange={(e) => onLive(e.target.checked)} data-testid="setup-site-live" />
        <span>
          <span className="block text-sm font-medium">{say("انشره هلّق وخلّيه الرئيسية|Publish it now and make it the home|לפרסם עכשיו ולהפוך לדף הבית")}</span>
          <span className="block text-xs text-white/50">{say("صفحاته بتنشر، وبيطلع على عنوان متجرك، وقوائم المتجر بتصير صفحاته. بلاه: بيتثبّت كمسودة وبتكمّل من صفحته بميزاتي.|Its pages are published, it shows at your store's address, and the store's menus become its pages. Without it: it installs as a draft and you carry on from its page in My features.|העמודים מתפרסמים, הוא מופיע בכתובת החנות, והתפריטים הם העמודים שלו. בלי זה: הוא מותקן כטיוטה וממשיכים מהעמוד שלו בתכונות שלי.")}</span>
        </span>
      </label>
      {run ? (
        <ul className="space-y-1 text-sm" data-testid="setup-site-run">
          {runSteps(run.live).map((s) => {
            const state = run.done.includes(s) ? "done" : run.failed?.step === s ? "failed" : "waiting";
            return (
              <li key={s} className={state === "done" ? "text-emerald-300" : state === "failed" ? "text-red-300" : "text-white/50"} data-testid={`setup-site-run-${s}`} data-state={state}>
                {state === "done" ? "✓ " : state === "failed" ? "✗ " : "○ "}
                {say(RUN_TEXT[s])}
              </li>
            );
          })}
        </ul>
      ) : null}
      {run?.failed ? (
        <p className="rounded-xl bg-red-500/10 p-3 text-xs text-red-200" role="alert" data-testid="setup-site-failed">
          {run.failed.message}
        </p>
      ) : null}
      {!owner ? <p className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">{say("صاحب المتجر بس بيقدر يطبّق الإعداد.|Only the store's owner can apply the setup.|רק בעל החנות יכול להחיל את ההגדרה.")}</p> : null}
    </section>
  );
}

/** What is ready: the site live at the store's address, or a draft to carry on with. */
export function SiteDone({ run, shop }: { run: SiteRun; shop: string }) {
  const f = run.feature;
  const home = f?.pages.find((p) => p.id === f.siteHome?.homeId) ?? null;
  const live = run.live && run.done.includes("home");
  // The preview asks for the shop as it is now (not a copy cached before the site was there).
  const [at] = useState(() => Date.now());
  return (
    <section className="space-y-5" data-testid="setup-done" data-site={f?.id ?? ""} data-live={live}>
      <h1 className="text-2xl font-bold">{say("موقعك جاهز!|Your site is ready!|האתר שלכם מוכן!")}</h1>
      <p className="text-sm text-white/60">
        {live
          ? say("صار على عنوان متجرك، وقوائمه فوق وتحت. كل صفحة بتنفتح بالمحرّر، والجداول بسطورها بميزاتي.|It is at your store's address, with its menus above and below. Every page opens in the editor, and its tables with their rows in My features.|הוא בכתובת של החנות, עם התפריטים למעלה ולמטה. כל עמוד נפתח בעורך, והטבלאות עם השורות בתכונות שלי.")
          : say("انثبّت كمسودة: ولا شي بيطلع للناس لسّا. من صفحته بميزاتي: شغّله، انشر صفحاته، و«خلّيه الرئيسية».|It is installed as a draft: nothing shows to anyone yet. From its page in My features: switch it on, publish its pages, and “Make it the home”.|הוא מותקן כטיוטה: עוד לא מוצג לאף אחד. מהעמוד שלו בתכונות שלי: מפעילים, מפרסמים את העמודים ו«להפוך לדף הבית».")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {f ? <Next to={`/admin/my-features/${f.id}`} title={say("صفحة الموقع|The site's page|העמוד של האתר")} hint={say("جداوله وصفحاته ومنطقه|Its tables, pages and logic|הטבלאות, העמודים והלוגיקה")} testid="setup-done-site" /> : null}
        {home ? <Next to={`/studio/${home.id}`} title={say("عدّل الصفحة الأولى|Edit the first page|עריכת העמוד הראשון")} hint={say("كبسة على أي عنصر بالمحرّر|Click anything in the editor|לחיצה על כל דבר בעורך")} testid="setup-done-home" /> : null}
        <Next to="/admin/themes" title={say("خصّص الثيم|Customise the theme|התאמת ערכת הנושא")} hint={say("الألوان، الخطوط، الزوايا|Colours, fonts, corners|צבעים, גופנים, פינות")} />
        <Next to="/admin" title={say("لوحة التحكم|Dashboard|לוח הבקרה")} hint={say("كل الإعدادات|Everything else|כל השאר")} />
      </div>
      {live ? (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          <div className="flex items-center justify-between border-b border-white/8 px-3 py-2 text-xs text-white/50">
            <span>{say("موقعك الآن|Your site now|האתר שלכם עכשיו")}</span>
            <a href={`${shop}/`} target="_blank" rel="noreferrer" className="text-accent-300 hover:underline">
              {say("افتح بصفحة جديدة|Open in a new tab|פתיחה בלשונית חדשה")}
            </a>
          </div>
          <iframe title={say("معاينة الموقع|Site preview|תצוגה מקדימה של האתר")} src={`${shop}/?v=${at}`} className="h-[640px] w-full bg-white" />
        </div>
      ) : null}
    </section>
  );
}

function Next({ to, title, hint, testid }: { to: string; title: string; hint: string; testid?: string }) {
  return (
    <Link to={to} className="block rounded-2xl border border-white/8 bg-white/3 p-4 hover:border-accent-400/60" data-testid={testid}>
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-1 block text-[11px] text-white/45">{hint}</span>
    </Link>
  );
}
