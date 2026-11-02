/**
 * Store themes (header.storeTheme): each repaints the whole shop and brings its own home,
 * motion and drawings. Every theme can be tried on the real shop before it is applied:
 * the home through the studio frame (its layout follows the theme there), a product
 * page and the cart with ?storeTheme= (only their look changes, so that is exact).
 * Applying asks first; the settings keep a revision to go back to. A gaming theme's stage
 * (its models, games and the 3D scene editor) is worked on under the preview, drawn live
 * in the frame (StageWorkspace); with the scene editor open it sits beside the frame.
 * Each theme is a whole pack (PackPanel): tried on the preview, mixed with other packs' parts,
 * and applied as one with the editor's shared styles.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as PagesAPI from "../../api/pages.api";
import { listCategories, listProducts } from "../../api/catalog.api";
import { getApiErrorMessage } from "../../api/http";
import { getSiteStyles, publishSiteStyles, saveSiteStylesDraft } from "../../api/siteStyles.api";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useSettings } from "../../hooks/useSettings";
import { adminLang } from "../../lib/lang";
import { identityOf } from "../../lib/storeIdentity";
import { toast } from "../../lib/toast";
import { tr } from "../../lib/words";
import { stylesOfKit, withPackStyles } from "../../studio/packs";
import { FAMILY_LABEL, ROSE_ID, currentStoreTheme, loadStoreThemes, saveStorePack, saveStoreTheme, shopOrigin, stageOptionsOf, type StoreThemeInfo, type Words } from "../../studio/storeThemes";
import { PackPanel } from "./PackPanel";
import { packChoice, type PackChoice, type PackFrom } from "./packChoice";
import { StageWorkspace, type StageTab } from "./StageWorkspace";
import { ThemeCustomizer } from "./ThemeCustomizer";
import { customParam, type ThemeCustom } from "./customize";

type View = "home" | "product" | "cart";
const SIZES = { computer: { w: 1280, h: 800 }, phone: { w: 390, h: 844 } } as const;

const ROSE: StoreThemeInfo = {
  id: ROSE_ID,
  name: { ar: "تصميم الورد", en: "The rose design", he: "עיצוב הוורד" },
  family: "fashion",
  blurb: { ar: "تصميم المتجر الأصلي: فيلم الافتتاح، المشاهد والألوان اللي بتتبع اختيار الزبون.", en: "The store's own design: the opening film, the scenes and colours that follow the shopper's pick.", he: "העיצוב המקורי של החנות: סרט הפתיחה, הסצנות והצבעים שעוקבים אחרי בחירת הלקוח." },
  mode: "light",
  modes: ["light"],
  swatch: ["#fff8f4", "#ffffff", "#e8b4ce", "#7d2448", "#462c3b"],
  hero: "film",
  motion: "rose",
};

export default function ThemesPage() {
  const qc = useQueryClient();
  const lang = adminLang();
  const settings = useSettings();
  const themesQ = useQuery({ queryKey: ["store-themes", "full"], queryFn: loadStoreThemes, staleTime: 300_000 });
  const categoriesQ = useQuery({ queryKey: ["catalog", "categories"], queryFn: listCategories });
  const [frameKey, setFrameKey] = useState(0);
  const pagesQ = useQuery({ queryKey: ["pages"], queryFn: PagesAPI.listPages });
  const productsQ = useQuery({ queryKey: ["catalog", "products", "active"], queryFn: () => listProducts("active") });
  const current = currentStoreTheme(settings.data?.header);
  // The rose design is for modest fashion stores alone; any other store with no theme chosen
  // shows its kind's theme (the shop's DEFAULT_THEME), so that one is its current theme here.
  const identity = identityOf(settings.data?.header);
  const modest = identity.industry === "fashion" && identity.audience === "women";
  const defaults = themesQ.data?.defaults;
  const currentId = current?.id ?? (modest ? ROSE_ID : defaults?.[identity.industry] ?? defaults?.general ?? ROSE_ID);

  const all = useMemo(() => [...(modest ? [ROSE] : []), ...(themesQ.data?.themes ?? [])], [themesQ.data, modest]);
  const [picked, setPicked] = useState<string | null>(null);
  const [mode, setMode] = useState<"light" | "dark" | null>(null);
  const [view, setView] = useState<View>("home");
  const [size, setSize] = useState<keyof typeof SIZES>("computer");
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);
  // Which designs show: all, one sector's, or the classic themes; and words looked for.
  const [group, setGroup] = useState<string>("all");
  const [find, setFind] = useState("");
  const [stageTab, setStageTab] = useState<StageTab>("models");
  // The shown theme's pack: where each part comes from, whether the preview shows it, and the one being applied.
  const [packFrom, setPackFrom] = useState<PackFrom>({});
  const [packTrying, setPackTrying] = useState(false);
  const [packAsking, setPackAsking] = useState<PackChoice | null>(null);
  const stageDirty = useRef(false);
  const onStageDirty = useCallback((d: boolean) => (stageDirty.current = d), []);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const shown = all.find((t) => t.id === (picked ?? currentId)) ?? ROSE;
  const shownMode = mode && shown.modes.includes(mode) ? mode : shown.id === currentId ? current?.mode ?? shown.mode : shown.mode;

  // The home's ticket for the studio frame (30 minutes).
  const home = pagesQ.data?.find((p) => p.slug === "/");
  const [ticket, setTicket] = useState<string | null>(null);
  useEffect(() => {
    if (!home?.id) return;
    let gone = false;
    PagesAPI.getPreviewTicket(home.id).then(
      (t) => !gone && setTicket(t.token),
      () => !gone && setTicket(null),
    );
    return () => {
      gone = true;
    };
  }, [home?.id]);
  const product = productsQ.data?.find((p) => p.slug);
  const origin = shopOrigin();
  // The current theme shows with the store's changes: the ones being tried, else the saved ones.
  const savedCustom = (current?.custom && typeof current.custom === "object" ? current.custom : null) as ThemeCustom | null;
  const [customDraft, setCustomDraft] = useState<ThemeCustom | null | undefined>(undefined);
  const isCurrent = shown.id === currentId && shown.id !== ROSE_ID;
  const custom = isCurrent ? (customDraft === undefined ? savedCustom : customDraft) : null;
  const pack = shown.id === ROSE_ID ? null : packChoice(shown, packFrom, isCurrent ? savedCustom : null, themesQ.data?.themes ?? []);
  const packShown = packTrying && pack;
  // The pack being tried: its colours and fonts as the store's changes, its kit for the motion, focus and cursor (?kit=).
  const kitParam = packShown ? `&kit=${encodeURIComponent(JSON.stringify(pack.kit))}` : "";
  const q = `storeTheme=${encodeURIComponent(shown.id)}${shown.id === ROSE_ID ? "" : `&themeMode=${shownMode}`}${customParam(packShown ? pack.custom : custom)}${kitParam}`;
  const packApplied = isCurrent && Boolean((settings.data?.header as { storeKit?: unknown } | null | undefined)?.storeKit);
  const src =
    view === "home"
      ? ticket
        ? `${origin}/studio-frame?token=${encodeURIComponent(ticket)}&${q}`
        : `${origin}/?${q}`
      : view === "product" && product
        ? `${origin}/p/${encodeURIComponent(product.slug)}?${q}`
        : `${origin}/cart?${q}`;

  // The frame drawn at its real width, scaled to the space it has.
  const box = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(800);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setRoom(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const dev = SIZES[size];
  const scale = Math.min(1, room / dev.w);
  // The scene editor sits beside the frame: the list makes room.
  const scene = Boolean(shown.stage) && stageTab === "scene";
  const liveFrame = view === "home" && Boolean(ticket) && Boolean(origin);

  // One card for each design (its original); the classic themes on their own; a design's variants beside the preview.
  const themes = useMemo(() => themesQ.data?.themes ?? [], [themesQ.data]);
  const sectors = useMemo(() => {
    const seen = new Map<string, Words>();
    for (const t of themes) if (t.design && !seen.has(t.design.sector)) seen.set(t.design.sector, t.design.sectorName);
    return [...seen];
  }, [themes]);
  const words = find.trim().toLowerCase();
  const matches = (t: StoreThemeInfo) => !words || [t.name, t.blurb, ...(t.design ? [t.design.sectorName, t.design.signature] : [])].some((x) => [x.ar, x.en, x.he].join(" ").toLowerCase().includes(words));
  const list = (group === "classic" ? themes.filter((t) => t.classic) : all.filter((t) => t.id === ROSE_ID || (t.design?.variant === "first" && (group === "all" || t.design.sector === group)) || (!t.design && !t.classic))).filter((t) => t.id === ROSE_ID || matches(t));
  const variants = shown.design ? themes.filter((t) => t.design?.kind === shown.design!.kind) : [];
  const VARIANT_LABEL: Record<string, () => string> = { first: () => tr("الأصلي", "Original"), soft: () => tr("ناعم", "Soft"), bold: () => tr("جريء", "Bold"), layout: () => tr("ترتيب تاني", "Another layout") };
  const pickTheme = (id: string) => {
    if (id !== shown.id && stageDirty.current && !window.confirm(tr("في تغييرات بالمشهد ما انحفظت. بدك تتركها؟", "The stage has unsaved changes. Leave them?"))) return;
    stageDirty.current = false;
    setPicked(id);
    setMode(null);
    setPackFrom({});
    setPackTrying(false);
  };

  /** The whole pack for the store: the theme (with the mix's colours and fonts), its kit, and the editor's shared styles. */
  const applyPack = async () => {
    if (!packAsking) return;
    setSaving(true);
    try {
      await saveStorePack({ id: shown.id, mode: shownMode === shown.mode ? null : shownMode, custom: packAsking.custom ?? undefined }, packAsking.kit);
      // The editor's shared styles take the pack's (the store's own named ones stay); published unless other changes wait.
      const ss = await getSiteStyles();
      await saveSiteStylesDraft(withPackStyles(ss.draft ?? ss.styles, stylesOfKit(packAsking.kit, shown)));
      let published = false;
      if (!ss.draft) {
        try {
          await publishSiteStyles();
          published = true;
        } catch {
          /* no right to publish: the styles wait in the editor */
        }
      }
      await qc.invalidateQueries({ queryKey: ["settings"] });
      void qc.invalidateQueries({ queryKey: ["site-styles"] });
      setPackAsking(null);
      setPackTrying(false);
      setPackFrom({});
      setPicked(null);
      toast.success(
        published ? tr("انطبقت الحزمة على كل المتجر", "The pack is on for the whole store") : tr("انطبقت الحزمة. ستايلات النصوص والأزرار بتستنى النشر بتبويب «الستايلات» بالمحرر.", "The pack is on. Its text and button styles wait to be published in the editor's Styles tab."),
      );
    } catch (e) {
      toast.error(tr("ما انطبقت الحزمة", "The pack wasn't applied"), { description: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };
  /** Takes the store's kit off; the theme and its changes stay. */
  const removePack = async () => {
    if (!current) return;
    setSaving(true);
    try {
      await saveStorePack({ id: current.id, mode: current.mode ?? null, custom: current.custom }, null);
      await qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success(tr("انشالت الحزمة، والثيم ضل", "The pack is off; the theme stays"));
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const apply = async () => {
    setSaving(true);
    try {
      await saveStoreTheme(shown.id === ROSE_ID ? null : { id: shown.id, mode: shownMode === shown.mode ? null : shownMode });
      await qc.invalidateQueries({ queryKey: ["settings"] });
      setAsking(false);
      setPicked(null);
      toast.success(tr("انطبق الثيم على كل المتجر", "The theme is on for the whole store"));
    } catch (e) {
      toast.error(tr("ما انطبق الثيم", "The theme wasn't applied"), { description: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="themes-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{tr("ثيمات المتجر", "Store themes")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/55">
            {tr(
              "كل ثيم بيغيّر شكل المتجر كله: الألوان، الخطوط، الصفحة الرئيسية، الحركة والرسومات. جرّبه على المتجر الحقيقي قبل التطبيق.",
              "Each theme changes the whole store: colours, fonts, the home page, motion and drawings. Try it on the real store before applying.",
            )}
          </p>
        </div>
        <div className="flex max-w-3xl flex-wrap gap-1" role="group" aria-label={tr("نوع المتجر", "Kind of store")}>
          {[["all", null] as const, ...sectors, ["classic", null] as const].map(([g, name]) => (
            <button key={g} type="button" onClick={() => setGroup(g)} aria-pressed={group === g} className={`rounded-lg px-3 py-1.5 text-xs ${group === g ? "bg-accent-500/25 text-white" : "bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"}`} data-testid="themes-group" data-group={g}>
              {g === "all" ? tr("كل التصاميم", "Every design") : g === "classic" ? tr("الثيمات الكلاسيكية", "Classic themes") : name?.[lang] || name?.en}
            </button>
          ))}
        </div>
      </header>

      {themesQ.isError ? (
        <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-200">
          {tr("ما قدرنا نجيب الثيمات من المتجر", "The themes couldn't be loaded from the store")}: {getApiErrorMessage(themesQ.error)}
        </p>
      ) : null}

      <div className={`grid gap-4 ${scene ? "" : "xl:grid-cols-[minmax(300px,380px)_1fr]"}`}>
        <ul className={`grid max-h-[calc(100vh-180px)] content-start gap-2 overflow-y-auto ${scene ? "hidden" : ""}`} data-testid="themes-list">
          <li className="sticky top-0 z-10 bg-surface-950 pb-1">
            <input
              type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder={tr(`دوّر بين ${themes.filter((t) => t.design?.variant === "first").length} تصميم`, "Search {0} designs", [themes.filter((t) => t.design?.variant === "first").length])}
              className="w-full rounded-xl border border-white/[0.1] bg-surface-925 px-3 py-2 text-sm text-white" data-testid="themes-find"
            />
          </li>
          {list.map((t) => {
            const on = t.id === shown.id || (Boolean(t.design) && t.design?.kind === shown.design?.kind);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => pickTheme(t.id)}
                  aria-pressed={on}
                  className={`w-full rounded-2xl border p-3 text-start transition ${on ? "border-accent-400/70 bg-white/[0.07]" : "border-white/[0.08] hover:bg-white/[0.04]"}`}
                  data-testid="theme-card"
                  data-theme-id={t.id}
                >
                  <span className="flex h-10 overflow-hidden rounded-lg" aria-hidden>
                    {t.swatch.map((c, i) => (
                      <span key={i} className="flex-1" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="mt-2 flex items-center gap-2">
                    <span className="font-medium">{t.name[lang] || t.name.en}</span>
                    <span className="text-[11px] text-white/40">{t.design ? t.design.sectorName[lang] || t.design.sectorName.en : FAMILY_LABEL[t.family]?.() ?? t.family}</span>
                    {t.id === currentId ? <span className="ms-auto rounded-md bg-accent-500/20 px-1.5 py-0.5 text-[10px] text-accent-200">{tr("الحالي", "Current")}</span> : null}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-white/50">{t.blurb[lang] || t.blurb.en}</span>
                  {t.design ? <span className="mt-1 block text-[11px] text-accent-200/80">✦ {t.design.signature[lang] || t.design.signature.en}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>

        <section className="min-w-0 space-y-3 rounded-2xl border border-white/[0.08] p-3" aria-label={tr("المعاينة", "Preview")}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="me-auto text-sm font-semibold">{shown.name[lang] || shown.name.en}</h2>
            {variants.length > 1 ? (
              <div className="flex gap-1" role="group" aria-label={tr("نسخة التصميم", "The design's variant")} data-testid="theme-variants">
                {variants.map((v) => (
                  <button key={v.id} type="button" onClick={() => pickTheme(v.id)} aria-pressed={v.id === shown.id} className={`rounded-lg px-2 py-1 text-xs ${v.id === shown.id ? "bg-accent-500/25 text-white" : "text-white/60 hover:bg-white/[0.06]"}`} data-testid="theme-variant" data-theme-id={v.id}>
                    {VARIANT_LABEL[v.design!.variant]()}
                  </button>
                ))}
              </div>
            ) : null}
            {shown.modes.length > 1 ? (
              <div className="flex gap-1" role="group" aria-label={tr("فاتح أو غامق", "Light or dark")}>
                {shown.modes.map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={shownMode === m} className={`rounded-lg px-2 py-1 text-xs ${shownMode === m ? "bg-white/[0.14]" : "text-white/60 hover:bg-white/[0.06]"}`}>
                    {m === "light" ? tr("فاتح", "Light") : tr("غامق", "Dark")}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex gap-1" role="group" aria-label={tr("الصفحة", "Page")}>
              {(["home", "product", "cart"] as View[]).map((v) => (
                <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} disabled={v === "product" && !product} className={`rounded-lg px-2 py-1 text-xs disabled:opacity-30 ${view === v ? "bg-white/[0.14]" : "text-white/60 hover:bg-white/[0.06]"}`}>
                  {v === "home" ? tr("الرئيسية", "Home") : v === "product" ? tr("صفحة منتج", "Product page") : tr("السلة", "Cart")}
                </button>
              ))}
            </div>
            <div className="flex gap-1" role="group" aria-label={tr("حجم الشاشة", "Screen size")}>
              {(Object.keys(SIZES) as Array<keyof typeof SIZES>).map((k) => (
                <button key={k} type="button" onClick={() => setSize(k)} aria-pressed={size === k} className={`rounded-lg px-2 py-1 text-xs ${size === k ? "bg-white/[0.14]" : "text-white/60 hover:bg-white/[0.06]"}`}>
                  {k === "computer" ? tr("كمبيوتر", "Computer") : tr("موبايل", "Phone")}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={shown.id === currentId && (shown.id === ROSE_ID || shownMode === (current?.mode ?? shown.mode))}
              onClick={() => setAsking(true)}
              className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-30"
              data-testid="theme-apply"
            >
              {tr("تطبيق على المتجر", "Apply to the store")}
            </button>
          </div>
          <div className={scene ? "grid gap-3 xl:grid-cols-[minmax(0,1fr)_390px]" : ""}>
          <div className="min-w-0 space-y-3">
          <div ref={box} className="relative overflow-hidden rounded-xl bg-black/30" style={{ height: dev.h * scale }}>
            {origin ? (
              <iframe
                ref={frameRef}
                key={`${src}#${frameKey}`}
                src={src}
                title={tr("معاينة الثيم على المتجر", "The theme on the store")}
                width={dev.w}
                height={dev.h}
                className="absolute top-0 bg-white"
                // Physical left with a top-left origin: scaling from the right edge in a right-to-left page pushed it out of view.
                style={{ border: 0, transform: `scale(${scale})`, left: Math.max(0, (room - dev.w * scale) / 2), transformOrigin: "top left" }}
                data-testid="theme-frame"
              />
            ) : null}
          </div>
          <p className="text-[11px] text-white/40">
            {tr("المعاينة بتبيّن هون بس، والزبائن بيشوفوا الثيم بعد التطبيق.", "The preview shows here only; customers see the theme after it is applied.")}
          </p>
          {isCurrent ? (
            <ThemeCustomizer
              theme={shown}
              mode={shownMode}
              saved={savedCustom}
              onDraft={setCustomDraft}
              onSaved={() => {
                setCustomDraft(undefined);
                void qc.invalidateQueries({ queryKey: ["settings"] });
              }}
            />
          ) : shown.id !== ROSE_ID ? (
            <p className="text-[11px] text-white/40">{tr("بعد ما تطبّق الثيم، بتقدر تخصّص ألوانه وخطوطه وزواياه من هون.", "Once the theme is applied, its colours, fonts and corners can be customised here.")}</p>
          ) : null}
          {pack ? (
            <PackPanel
              theme={shown}
              themes={themesQ.data?.themes ?? []}
              choice={pack}
              from={packFrom}
              onFrom={setPackFrom}
              applied={packApplied}
              busy={saving}
              trying={packTrying}
              onTrying={setPackTrying}
              onApply={setPackAsking}
              onRemove={() => void removePack()}
            />
          ) : null}
          </div>
          {shown.stage ? (
            <div className={scene ? "min-w-0 xl:overflow-y-auto" : ""} style={scene ? { maxHeight: Math.max(480, dev.h * scale + 40) } : undefined}>
              <StageWorkspace
                key={`${shown.id}:${settings.data ? "1" : "0"}`}
                theme={shown}
                models={themesQ.data?.models ?? []}
                categories={Array.isArray(categoriesQ.data) ? categoriesQ.data : []}
                saved={stageOptionsOf(settings.data?.header, shown.id)}
                frame={frameRef}
                origin={origin}
                live={liveFrame}
                tab={stageTab}
                setTab={setStageTab}
                onShowHome={() => setView("home")}
                onSaved={() => {
                  void qc.invalidateQueries({ queryKey: ["settings"] });
                  // The home's frame already shows it; the other pages load it again.
                  if (!liveFrame) setFrameKey((k) => k + 1);
                }}
                onDirty={onStageDirty}
                defaults={themesQ.data?.stageDefaults ?? null}
              />
            </div>
          ) : null}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={asking}
        variant="warning"
        isLoading={saving}
        title={tr("تطبيق الثيم على كل المتجر؟", "Apply the theme to the whole store?")}
        message={tr(
          "كل صفحات المتجر رح تتغيّر فوراً لكل الزبائن. الإعدادات الحالية بتنحفظ بالسجل، وبتقدر ترجع لأي ثيم بأي وقت.",
          "Every page of the store changes right away for every customer. The current settings are kept in the history, and any theme can be put back at any time.",
        )}
        confirmText={tr("تطبيق", "Apply")}
        onClose={() => setAsking(false)}
        onConfirm={apply}
      />
      <ConfirmDialog
        open={Boolean(packAsking)}
        variant="warning"
        isLoading={saving}
        title={tr("تطبيق الحزمة كاملة على المتجر؟", "Apply the whole pack to the store?")}
        message={tr(
          "الثيم وألوانه وخطوطه، مرور الماوس والحركة بصفحات المحرر الجديد، إطار التركيز والمؤشر وعلامة التحميل، وستايلات العناوين والأزرار والكروت، كلها بتتغيّر لكل الزبائن. الإعدادات الحالية بتنحفظ بالسجل.",
          "The theme with its colours and fonts, the hovers and motion on the new editor's pages, the focus ring, cursor and loading indicator, and the heading, button and card styles all change for every customer. The current settings are kept in the history.",
        )}
        confirmText={tr("تطبيق", "Apply")}
        onClose={() => setPackAsking(null)}
        onConfirm={applyPack}
      />
    </div>
  );
}
