/**
 * Store themes (header.storeTheme): each repaints the whole shop and brings its own home,
 * motion and drawings. Every theme can be tried on the real shop before it is applied:
 * the home through the studio frame (its layout follows the theme there), a product
 * page and the cart with ?storeTheme= (only their look changes, so that is exact).
 * Applying asks first; the settings keep a revision to go back to. A gaming theme's stage
 * (its models, games and the 3D scene editor) is worked on under the preview, drawn live
 * in the frame (StageWorkspace); with the scene editor open it sits beside the frame.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as PagesAPI from "../../api/pages.api";
import { listCategories, listProducts } from "../../api/catalog.api";
import { getApiErrorMessage } from "../../api/http";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useSettings } from "../../hooks/useSettings";
import { adminLang } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { tr } from "../../lib/words";
import { FAMILY_LABEL, ROSE_ID, currentStoreTheme, loadStoreThemes, saveStoreTheme, shopOrigin, stageOptionsOf, type StoreThemeInfo } from "../../studio/storeThemes";
import { StageWorkspace, type StageTab } from "./StageWorkspace";

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
  const currentId = current?.id ?? ROSE_ID;

  const all = useMemo(() => [ROSE, ...(themesQ.data?.themes ?? [])], [themesQ.data]);
  const [picked, setPicked] = useState<string | null>(null);
  const [mode, setMode] = useState<"light" | "dark" | null>(null);
  const [view, setView] = useState<View>("home");
  const [size, setSize] = useState<keyof typeof SIZES>("computer");
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [family, setFamily] = useState<string>("all");
  const [stageTab, setStageTab] = useState<StageTab>("models");
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
  const q = `storeTheme=${encodeURIComponent(shown.id)}${shown.id === ROSE_ID ? "" : `&themeMode=${shownMode}`}`;
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

  const families = useMemo(() => ["all", ...Array.from(new Set((themesQ.data?.themes ?? []).map((t) => t.family)))], [themesQ.data]);
  const list = all.filter((t) => family === "all" || t.id === ROSE_ID || t.family === family);

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
        <div className="flex flex-wrap gap-1" role="group" aria-label={tr("نوع المتجر", "Kind of store")}>
          {families.map((f) => (
            <button key={f} type="button" onClick={() => setFamily(f)} aria-pressed={family === f} className={`rounded-lg px-3 py-1.5 text-xs ${family === f ? "bg-accent-500/25 text-white" : "bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"}`}>
              {f === "all" ? tr("الكل", "All") : FAMILY_LABEL[f]?.() ?? f}
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
        <ul className={`grid content-start gap-2 ${scene ? "hidden" : ""}`} data-testid="themes-list">
          {list.map((t) => {
            const on = t.id === shown.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (t.id !== shown.id && stageDirty.current && !window.confirm(tr("في تغييرات بالمشهد ما انحفظت. بدك تتركها؟", "The stage has unsaved changes. Leave them?"))) return;
                    stageDirty.current = false;
                    setPicked(t.id);
                    setMode(null);
                  }}
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
                    <span className="text-[11px] text-white/40">{FAMILY_LABEL[t.family]?.() ?? t.family}</span>
                    {t.id === currentId ? <span className="ms-auto rounded-md bg-accent-500/20 px-1.5 py-0.5 text-[10px] text-accent-200">{tr("الحالي", "Current")}</span> : null}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-white/50">{t.blurb[lang] || t.blurb.en}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <section className="min-w-0 space-y-3 rounded-2xl border border-white/[0.08] p-3" aria-label={tr("المعاينة", "Preview")}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="me-auto text-sm font-semibold">{shown.name[lang] || shown.name.en}</h2>
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
    </div>
  );
}
