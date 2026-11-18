// ميزاتي → مواقع كاملة (stage 4, item 3): a business's whole site for its field, built from the section
// library with its lists reading real tables (studio/templates/sites). The owner picks one, sees what it
// would make here, and installs it as a draft: its pages unpublished, its tables holding ready rows to
// change, its forms writing into tables of their own. The store's own home stays as it is.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { adminLang } from "../../lib/lang";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import { SITES, SITE_FIELDS, buildSite, slugsOf, type SiteField, type SiteSpec } from "../../studio/templates/sites";
import { InstallFlow } from "./FeatureTemplates";
import { siteLine, siteMatches } from "./sitesText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-10 min-w-0 rounded-xl border border-white/10 bg-surface-925 px-3 text-sm text-white";

export default function SitesPage() {
  const lang = adminLang();
  const { hasPermission } = useAuth();
  const canInstall = hasPermission("features:write") && hasPermission("functions:write") && hasPermission("pages:write");
  const [kind, setKind] = useState<SiteField | "all">("all");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<SiteSpec | null>(null);
  const fields = useMemo(() => (Object.keys(SITE_FIELDS) as SiteField[]).filter((f) => SITES.some((s) => s.field === f)), []);
  // Built once for what is picked (a site is some 70 KB of pages).
  const file = useMemo(() => (picked ? buildSite(picked, { lang }) : null), [picked, lang]);
  const shown = SITES.filter((s) => (kind === "all" || s.field === kind) && siteMatches(s, search, SITE_FIELDS));
  return (
    <div className="space-y-4 pb-24" data-testid="sites-page">
      <section className={box}>
        <Link to="/admin/my-features" className="text-xs text-white/60 underline">
          {say("← ميزاتي|← My features|← התכונות שלי")}
        </Link>
        <h1 className="mt-2 text-lg font-semibold">{say("مواقع كاملة|Whole sites|אתרים שלמים")}</h1>
        <p className="mt-1 text-sm text-white/60">
          {say(
            "موقع كامل لمجالك (مطعم، عيادة، صالون، نادي…): صفحاته مبنية من مكتبة الأقسام، والقوائم فيها (المنيو، الفريق، الآراء، الأسئلة، الأخبار، الفروع) بتقرأ من جداول فيها سطور جاهزة. بتغيّر السطر بالجدول والموقع بيتبعه. الفورمات بتكتب رسائل الزوار وحجوزاتهم بجداول إلها. بيتثبّت كمسودة: الصفحات مش منشورة لحد ما تراجعها، والصفحة الرئيسية تبعت متجرك بتضل متل ما هي.|A whole site for your field (a restaurant, a clinic, a salon, a gym…): its pages built from the section library, its lists (the menu, the team, reviews, questions, news, branches) reading tables that hold ready rows. Change a row in the table and the site follows. Its forms write visitors' messages and bookings into tables of their own. It is installed as a draft: the pages stay unpublished until you've looked at them, and your store's own home stays as it is.|אתר שלם לתחום שלכם (מסעדה, מרפאה, סלון, חדר כושר…): העמודים בנויים מספריית הקטעים, והרשימות בהם (התפריט, הצוות, ביקורות, שאלות, חדשות, סניפים) קוראות מטבלאות עם שורות מוכנות. משנים שורה בטבלה והאתר מתעדכן. הטפסים כותבים הודעות והזמנות של מבקרים לטבלאות משלהם. הוא מותקן כטיוטה: העמודים לא מפורסמים עד שבודקים, ודף הבית של החנות נשאר כמו שהוא.",
          )}
        </p>
        <p className="mt-2 text-sm font-medium" data-testid="sites-totals">
          {say("{n} مواقع جاهزة|{n} ready sites|{n} אתרים מוכנים").replace("{n}", String(SITES.length))}
        </p>
      </section>

      {picked ? (
        <section className={`${box} border-accent-400/40`} data-testid="sites-selected">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">{picked.name[lang]}</h2>
            <Button size="sm" variant="ghost" onClick={() => setPicked(null)} data-testid="sites-close">
              {say("سكّر|Close|סגירה")}
            </Button>
          </div>
          <p className="mt-1 text-xs text-white/60" data-testid="sites-home-note">
            {say("صفحة الموقع الأولى عنوانها {home}، وصفحة متجرك الرئيسية ما بتتغيّر.|The site's first page is at {home}; your store's home doesn't change.|העמוד הראשון של האתר בכתובת {home}, ודף הבית של החנות לא משתנה.").replace("{home}", slugsOf(picked).home)}
          </p>
          <InstallFlow key={`${picked.key}:${picked.version}:${lang}`} id={`site:${picked.key}:${picked.version}:${lang}`} template={file} />
        </section>
      ) : null}

      <section className={box}>
        <div className="flex flex-wrap items-center gap-2" role="tablist">
          {(["all", ...fields] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              className={`h-9 rounded-full px-4 text-sm ${kind === k ? "bg-white/15 text-white" : "text-white/60 hover:text-white"}`}
              onClick={() => setKind(k)}
              data-testid={`sites-field-${k}`}
            >
              {k === "all" ? say("الكل|All|הכול") : SITE_FIELDS[k][lang]}
            </button>
          ))}
        </div>
        <input className={`${field} mt-3 w-full`} value={search} placeholder={say("دوّر: مطعم، عيادة، أعراس، دورات…|Search: restaurant, clinic, weddings, courses…|חיפוש: מסעדה, מרפאה, חתונות, קורסים…")} onChange={(e) => setSearch(e.target.value)} data-testid="sites-search" />
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="sites-list">
          {shown.map((s) => {
            const slugs = slugsOf(s);
            return (
              <li key={s.key} className="flex flex-col gap-2 rounded-xl border border-white/10 p-4" data-testid={`sites-item-${s.key}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success" size="sm">
                    {SITE_FIELDS[s.field][lang]}
                  </Badge>
                  <bdi dir="ltr" className="text-xs text-white/40">
                    {s.version}
                  </bdi>
                </div>
                <div className="font-medium">{s.name[lang]}</div>
                <p className="text-sm text-white/70">{s.note[lang]}</p>
                <div className="mt-auto space-y-1 text-xs text-white/50">
                  <div data-testid={`sites-holds-${s.key}`}>{siteLine(s, lang)}</div>
                  <bdi dir="ltr" className="block truncate font-mono">
                    {[slugs.home, slugs.offers, slugs.story, slugs.news, slugs.questions, slugs.contact, ...(slugs.book ? [slugs.book] : [])].join(" · ")}
                  </bdi>
                </div>
                {canInstall ? (
                  <div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setPicked(s);
                        if (typeof window !== "undefined" && typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      data-testid={`sites-pick-${s.key}`}
                    >
                      {say("شوف وثبّت|See and install|צפייה והתקנה")}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {!shown.length ? (
          <p className="text-sm text-white/60" data-testid="sites-empty">
            {say("ما في موقع بهالبحث. جرّب كلمة تانية.|No site for this search. Try another word.|אין אתר לחיפוש הזה. נסו מילה אחרת.")}
          </p>
        ) : null}
      </section>
    </div>
  );
}
