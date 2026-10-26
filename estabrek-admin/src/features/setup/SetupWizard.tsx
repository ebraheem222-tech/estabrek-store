// Setting up a new store (/setup, full screen): its name, what it sells, its theme, the
// starter content that fits it, then the store itself with the next steps. Opens on its own
// for an empty store's owner (AdminLayout), and from Settings any time later. Everything it
// makes is ordinary content: the pages open in the new editor, the theme in its customizer.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { adminLang } from "../../lib/lang";
import { tr } from "../../lib/words";
import { getApiErrorMessage } from "../../api/http";
import { listPages } from "../../api/pages.api";
import { getSettings } from "../../api/settings.api";
import { SETUP_LATER_KEY, applySetup, getSetupStatus, type SetupResult, type SetupStatus } from "../../api/setup.api";
import { listStoreThemes, shopOrigin, type StoreThemeInfo } from "../../studio/storeThemes";
import { PACKS, type Pack, type W } from "./packs";
import { buildSetup } from "./buildSetup";

const STEPS = ["name", "industry", "theme", "content", "done"] as const;
type Step = (typeof STEPS)[number];
/** The rose design (no theme), offered to modest fashion stores. */
const ROSE = "__rose__";


export default function SetupWizard() {
  const navigate = useNavigate();
  const lang = adminLang();
  const say = (x: W) => x[lang] || x.ar;
  const [step, setStep] = useState<Step>("name");
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [name, setName] = useState<W>({ ar: "", en: "", he: "" });
  const [pack, setPack] = useState<Pack | null>(null);
  const [themes, setThemes] = useState<StoreThemeInfo[] | null>(null);
  const [themesFailed, setThemesFailed] = useState(false);
  const [themeId, setThemeId] = useState<string>(ROSE);
  const [mode, setMode] = useState<"light" | "dark" | null>(null);
  const [include, setInclude] = useState({ categories: true, types: true, home: true, menu: true });
  const [replaceHome, setReplaceHome] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [homeId, setHomeId] = useState<string | null>(null);

  useEffect(() => {
    void getSetupStatus().then(setStatus).catch(() => setStatus(null));
    void getSettings()
      .then((s) => {
        const id = (s.header as { identity?: { name?: Partial<W> } } | null | undefined)?.identity?.name;
        if (id && typeof id === "object") setName({ ar: id.ar ?? "", en: id.en ?? "", he: id.he ?? "" });
        else if (s.siteName && s.siteName !== "My Store") setName((n) => ({ ...n, ar: s.siteName ?? "" }));
      })
      .catch(() => undefined);
    void listStoreThemes()
      .then(setThemes)
      .catch(() => setThemesFailed(true));
  }, []);

  // The themes that fit the store, the recommended one first, then the others of its families.
  const offered = useMemo(() => {
    if (!pack || !themes) return [];
    const fits = themes.filter((t) => pack.families.includes(t.family));
    const rank = (t: StoreThemeInfo) => (t.id === pack.theme ? -1 : pack.families.indexOf(t.family));
    return [...fits].sort((a, b) => rank(a) - rank(b));
  }, [pack, themes]);
  const chosen = themes?.find((t) => t.id === themeId) ?? null;

  const pickPack = (p: Pack) => {
    setPack(p);
    setThemeId(p.theme ?? ROSE);
    setMode(null);
  };

  const next = () => setStep(STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(step) + 1)]);
  const back = () => setStep(STEPS[Math.max(0, STEPS.indexOf(step) - 1)]);
  const canNext = step === "name" ? Boolean((name[lang] || name.ar || name.en).trim()) : step === "industry" ? Boolean(pack) : true;

  async function apply() {
    if (!pack) return;
    setBusy(true);
    setError(null);
    try {
      const body = buildSetup({ pack, name, themeId: themeId === ROSE ? null : themeId, mode, include, replaceHome });
      const res = await applySetup(body);
      setResult(res);
      try {
        sessionStorage.removeItem(SETUP_LATER_KEY);
      } catch {
        /* storage off */
      }
      const pages = await listPages().catch(() => []);
      setHomeId(pages.find((p) => p.slug === "/")?.id ?? null);
      setStep("done");
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const later = () => {
    try {
      sessionStorage.setItem(SETUP_LATER_KEY, "1");
    } catch {
      /* storage off */
    }
    navigate("/admin");
  };

  const stepLabel: Record<Step, string> = {
    name: tr("اسم المتجر", "Store name"),
    industry: tr("نوع المتجر", "Kind of store"),
    theme: tr("الثيم", "Theme"),
    content: tr("البداية الجاهزة", "Starter content"),
    done: tr("جاهز", "Ready"),
  };

  return (
    <div className="min-h-screen bg-surface-950 text-white" data-testid="setup-wizard">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-white/[0.08] bg-surface-950/90 px-4 py-3 backdrop-blur">
        <div className="text-sm font-semibold">{tr("إعداد المتجر", "Store setup")}</div>
        <ol className="flex flex-1 flex-wrap justify-center gap-1 text-[11px]" aria-label={tr("الخطوات", "Steps")}>
          {STEPS.map((s, i) => (
            <li key={s} className={`rounded-full px-2.5 py-1 ${s === step ? "bg-accent-500/25 text-white" : i < STEPS.indexOf(step) ? "text-accent-200" : "text-white/40"}`} aria-current={s === step ? "step" : undefined}>
              {i + 1}. {stepLabel[s]}
            </li>
          ))}
        </ol>
        {step !== "done" ? (
          <button type="button" onClick={later} className="text-xs text-white/50 hover:text-white" data-testid="setup-later">
            {tr("بعدين", "Later")}
          </button>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        {step === "name" ? (
          <section className="mx-auto max-w-xl space-y-5">
            <h1 className="text-2xl font-bold">{tr("أهلاً! خلّينا نجهّز متجرك", "Welcome! Let's set up your store")}</h1>
            <p className="text-sm leading-7 text-white/60">
              {tr(
                "بخطوات قليلة بنختار نوع متجرك وثيم يناسبه، وبنجهّز الأقسام والصفحة الرئيسية والقائمة. كل شي بتقدر تعدّله بعدين بالمحرّر.",
                "In a few steps we'll pick your kind of store and a theme that fits it, and prepare the categories, home page and menu. You can edit all of it later in the editor.",
              )}
            </p>
            {(["ar", "en", "he"] as const).map((l) => (
              <label key={l} className="block">
                <span className="mb-1 block text-xs text-white/60">
                  {l === "ar" ? tr("اسم المتجر بالعربي", "Store name in Arabic") : l === "en" ? tr("اسم المتجر بالإنجليزي", "Store name in English") : tr("اسم المتجر بالعبري", "Store name in Hebrew")}
                  {l !== "ar" ? <span className="text-white/35"> · {tr("اختياري", "optional")}</span> : null}
                </span>
                <input
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-accent-400"
                  dir={l === "en" ? "ltr" : "rtl"}
                  value={name[l]}
                  maxLength={60}
                  onChange={(e) => setName({ ...name, [l]: e.target.value })}
                  data-testid={`setup-name-${l}`}
                />
              </label>
            ))}
          </section>
        ) : null}

        {step === "industry" ? (
          <section className="space-y-5">
            <h1 className="text-2xl font-bold">{tr("شو بيبيع متجرك؟", "What does your store sell?")}</h1>
            <p className="text-sm text-white/60">{tr("بنختار حسبه الثيم والأقسام وكلام الصفحة الرئيسية.", "The theme, categories and home page words follow it.")}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="radiogroup" aria-label={tr("نوع المتجر", "Kind of store")}>
              {PACKS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={pack?.id === p.id}
                  onClick={() => pickPack(p)}
                  className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-start transition ${pack?.id === p.id ? "border-accent-400 bg-accent-500/15" : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.2]"}`}
                  data-testid={`setup-pack-${p.id}`}
                >
                  <span className="text-2xl" aria-hidden>
                    {p.icon}
                  </span>
                  <span className="text-sm font-semibold">{say(p.label)}</span>
                  <span className="text-[11px] text-white/45">{say(p.hint)}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {step === "theme" && pack ? (
          <section className="space-y-5">
            <h1 className="text-2xl font-bold">{tr("اختر ثيم متجرك", "Pick your store's theme")}</h1>
            <p className="text-sm text-white/60">
              {tr("الثيم بيغيّر شكل المتجر كله: الألوان، الخطوط، الحركة والصفحة الرئيسية. بتقدر تخصّصه أو تغيّره بأي وقت.", "A theme changes the whole store: colours, fonts, motion and the home page. You can customise or change it any time.")}
            </p>
            {themesFailed ? <p className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">{tr("ما قدرنا نجيب الثيمات من المتجر. بتقدر تكمّل وتختار الثيم بعدين.", "We couldn't load the themes from the store. You can carry on and pick one later.")}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label={tr("الثيم", "Theme")}>
              {pack.id === "modest" ? (
                <ThemeCard
                  name={tr("تصميم الورد", "The rose design")}
                  blurb={tr("تصميم الأزياء المحتشمة الأصلي: فيلم الافتتاح والمشاهد والمرشدة.", "The original modest fashion design: the opening film, the scenes and the guide.")}
                  swatch={["#fff8f4", "#ffffff", "#e9b5c9", "#7d2448", "#462c3b"]}
                  picked={themeId === ROSE}
                  recommended
                  onPick={() => setThemeId(ROSE)}
                  testId="setup-theme-rose"
                />
              ) : null}
              {offered.map((t) => (
                <ThemeCard
                  key={t.id}
                  name={t.name[lang] || t.name.ar}
                  blurb={t.blurb[lang] || t.blurb.ar}
                  swatch={t.swatch}
                  three={Boolean(t.stage)}
                  picked={themeId === t.id}
                  recommended={t.id === pack.theme}
                  onPick={() => {
                    setThemeId(t.id);
                    setMode(null);
                  }}
                  testId={`setup-theme-${t.id}`}
                />
              ))}
            </div>
            {chosen && chosen.modes.length > 1 ? (
              <div className="flex items-center gap-2 text-xs" role="radiogroup" aria-label={tr("فاتح أو غامق", "Light or dark")}>
                <span className="text-white/55">{tr("الألوان:", "Colours:")}</span>
                {chosen.modes.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={(mode ?? chosen.mode) === m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1 ${(mode ?? chosen.mode) === m ? "bg-white/[0.16]" : "bg-white/[0.05] text-white/60"}`}>
                    {m === "light" ? tr("فاتح", "Light") : tr("غامق", "Dark")}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {step === "content" && pack ? (
          <section className="mx-auto max-w-2xl space-y-5">
            <h1 className="text-2xl font-bold">{tr("البداية الجاهزة", "Starter content")}</h1>
            <p className="text-sm text-white/60">{tr("بنجهّزلك هدول بثلاث لغات (عربي، إنجليزي، عبري). اللي موجود عندك ما بنغيّره.", "We'll prepare these in three languages (Arabic, English, Hebrew). Nothing you already have is changed.")}</p>
            <Check id="categories" on={include.categories} onChange={(v) => setInclude({ ...include, categories: v })} title={tr("الأقسام", "Categories")}>
              <Chips items={pack.categories.flatMap((c) => [say(c.name), ...(c.children ?? []).map((ch) => `${say(c.name)} › ${say(ch.name)}`)])} />
            </Check>
            <Check id="types" on={include.types} onChange={(v) => setInclude({ ...include, types: v })} title={tr("أنواع المنتجات وحقولها", "Product types and their fields")}>
              <p className="text-[11px] text-white/45">{tr("مثل القماش والمقاس للملابس، أو الذاكرة والمعالج للموبايلات.", "Like fabric and size for clothing, or storage and processor for phones.")}</p>
            </Check>
            <Check id="home" on={include.home} onChange={(v) => setInclude({ ...include, home: v })} title={tr("الصفحة الرئيسية", "The home page")}>
              <p className="text-[11px] text-white/45">
                {tr("افتتاح بكلام متجرك، وصل حديثاً، الأقسام، الأكثر طلباً، أسئلة متكررة وتواصل.", "An opening in your store's words, new arrivals, categories, best sellers, questions and contact.")}
              </p>
              {status?.hasHome && include.home ? (
                <label className="mt-2 flex items-center gap-2 text-xs text-amber-200">
                  <input type="checkbox" checked={replaceHome} onChange={(e) => setReplaceHome(e.target.checked)} data-testid="setup-replace-home" />
                  {tr("عندك صفحة رئيسية: بدّلها بالجديدة (القديمة بتنحفظ بالسجل)", "You have a home page: replace it with the new one (the old one is kept in its history)")}
                </label>
              ) : null}
            </Check>
            <Check id="menu" on={include.menu} onChange={(v) => setInclude({ ...include, menu: v })} title={tr("القائمة الرئيسية", "The main menu")}>
              <p className="text-[11px] text-white/45">{tr("الأقسام، كل المنتجات، تواصل.", "Categories, all products, contact.")}</p>
            </Check>
            {status && !status.owner ? <p className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">{tr("صاحب المتجر بس بيقدر يطبّق الإعداد.", "Only the store's owner can apply the setup.")}</p> : null}
            {error ? (
              <p className="rounded-xl bg-red-500/10 p-3 text-xs text-red-200" role="alert">
                {error}
              </p>
            ) : null}
          </section>
        ) : null}

        {step === "done" && result ? (
          <section className="space-y-5" data-testid="setup-done">
            <h1 className="text-2xl font-bold">{tr("متجرك جاهز!", "Your store is ready!")}</h1>
            <p className="text-sm text-white/60">
              {tr(
                `انعمل ${result.made.categories} قسم، ${result.made.types} نوع منتج، ${result.made.pages} صفحة و${result.made.menuItems} رابط بالقائمة.`,
                "Made {0} categories, {1} product types, {2} pages and {3} menu links.",
                [result.made.categories, result.made.types, result.made.pages, result.made.menuItems],
              )}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {homeId ? <NextStep to={`/studio/${homeId}`} title={tr("عدّل الصفحة الرئيسية", "Edit the home page")} hint={tr("كبسة على أي عنصر بالمحرّر الجديد", "Click anything in the new editor")} /> : null}
              <NextStep to="/admin/themes" title={tr("خصّص الثيم", "Customise the theme")} hint={tr("الألوان، الخطوط، الزوايا", "Colours, fonts, corners")} />
              <NextStep to="/admin/catalog/products/new" title={tr("أضف أول منتج", "Add your first product")} hint={tr("بأنواع المنتجات الجاهزة", "With the ready product types")} />
              <NextStep to="/admin" title={tr("لوحة التحكم", "Dashboard")} hint={tr("كل الإعدادات", "Everything else")} />
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-2 text-xs text-white/50">
                <span>{tr("متجرك الآن", "Your store now")}</span>
                <a href={`${shopOrigin()}/`} target="_blank" rel="noreferrer" className="text-accent-300 hover:underline">
                  {tr("افتح بصفحة جديدة", "Open in a new tab")}
                </a>
              </div>
              <iframe title={tr("معاينة المتجر", "Store preview")} src={`${shopOrigin()}/?v=${Date.now()}`} className="h-[640px] w-full bg-white" />
            </div>
          </section>
        ) : null}
      </main>

      {step !== "done" ? (
        <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-white/[0.08] bg-surface-950/90 px-4 py-3 backdrop-blur">
          <Button variant="ghost" size="sm" onClick={back} disabled={step === "name" || busy}>
            {tr("رجوع", "Back")}
          </Button>
          {step === "content" ? (
            <Button variant="accent" size="sm" onClick={() => void apply()} isLoading={busy} disabled={busy || (status ? !status.owner : false)} data-testid="setup-apply">
              {tr("جهّز المتجر", "Set up the store")}
            </Button>
          ) : (
            <Button variant="accent" size="sm" onClick={next} disabled={!canNext} data-testid="setup-next">
              {tr("التالي", "Next")}
            </Button>
          )}
        </footer>
      ) : null}
    </div>
  );
}

function ThemeCard(p: { name: string; blurb: string; swatch: string[]; three?: boolean; picked: boolean; recommended?: boolean; onPick: () => void; testId: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={p.picked}
      onClick={p.onPick}
      className={`overflow-hidden rounded-2xl border text-start transition ${p.picked ? "border-accent-400 ring-2 ring-accent-500/30" : "border-white/[0.08] hover:border-white/[0.2]"}`}
      data-testid={p.testId}
    >
      <div className="flex h-16" aria-hidden>
        {p.swatch.map((c, i) => (
          <span key={i} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div className="space-y-1 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold">{p.name}</span>
          {p.recommended ? <span className="rounded-full bg-accent-500/20 px-2 py-0.5 text-[10px] text-accent-100">{tr("موصى فيه", "Recommended")}</span> : null}
          {p.three ? <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] text-white/70">3D</span> : null}
        </div>
        <p className="text-[11px] leading-5 text-white/50">{p.blurb}</p>
      </div>
    </button>
  );
}

function Check(p: { id: string; on: boolean; onChange: (v: boolean) => void; title: string; children?: ReactNode }) {
  return (
    <label className={`block rounded-2xl border p-4 ${p.on ? "border-accent-400/50 bg-accent-500/[0.06]" : "border-white/[0.08]"}`}>
      <span className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={p.on} onChange={(e) => p.onChange(e.target.checked)} data-testid={`setup-include-${p.id}`} />
        {p.title}
      </span>
      <span className="mt-2 block">{p.children}</span>
    </label>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <span key={x} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/70">
          {x}
        </span>
      ))}
    </span>
  );
}

function NextStep({ to, title, hint }: { to: string; title: string; hint: string }) {
  return (
    <Link to={to} className="block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 hover:border-accent-400/60">
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-1 block text-[11px] text-white/45">{hint}</span>
    </Link>
  );
}
