import type { Metadata, Viewport } from "next";
import { selectStorefrontNav } from "@/lib/storefrontNav";
import "../globals.css";
import "../cinematic.css";
// The inner pages' final look (the home keeps its own): app/rose-inner.css.
import "../rose-inner.css";
// Its showpieces: the page loader, the cards, the filters and the motion (app/rose-showcase.css).
import "../rose-showcase.css";
// The home's showpieces: particles, rooms, the secret, the world, the page hero, story mode (app/rose-wonders.css).
import "../rose-wonders.css";
import "../store-themes.css";
import "../server-themes.css";
// The small bag's 100 designs (lib/miniBagDesigns.ts): app/minibag-designs.css, after the rose bag's own.
import "../minibag-designs.css";
import "@/pageTree/commerce.css";
import Providers from "../providers";
import { notFound } from "next/navigation";
import { LANGS, LANG_LOCALE, dirOf, isLang, langConfigOf, type Lang } from "@/lib/i18n";
import { getBootstrap, getPublicSettings, getStoreDesignRegions } from "@/lib/api";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Footer } from "@/components/Footer";
import { ScriptTags } from "@/components/ScriptTags";
import { ThemeWrap } from "@/components/ThemeWrap";
import { UiSettingsProvider } from "@/components/UiSettingsProvider";
import { getLoadingById } from "@/cms/effects/loadingAnimations";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import { EffectsStyles } from "@/components/EffectsStyles";
import { StorefrontChrome } from "@/components/cinematic/StorefrontChrome";
import { MaintenanceGate } from "@/components/cinematic/MaintenanceGate";
import { MotionSettingsBridge } from "@/components/MotionSettingsBridge";
import { normalizeMotion } from "@/lib/motionSettings";
import { abHeadScript, abTests } from "@/lib/ab";
import { MarketingPixels } from "@/components/MarketingPixels";
import { identityOf, nameOf, pick } from "@/lib/storeIdentity";
import { StoreLookProvider } from "@/store/storeLook";
import { themePalette } from "@/storeThemes/css";
import { setArabicTone, setPlainWords, tr } from "@/lib/words";
import { roseDesignOn, roseOwned, storeThemeOf, themeCss } from "@/storeThemes";
import { kitCss, kitOfHeader } from "@/storeThemes/packs";
import { ThemeMotion } from "@/storeThemes/motion/ThemeMotion";
import { StoreThemePreview } from "@/storeThemes/StoreThemePreview";
import { cinematicEnabled, independentDesign, readThemeSnapshot } from "@/storeThemes/snapshot";
import { BASE_CSS } from "@/pageTree/css";
import { StoreDesignRegion } from "@/components/StoreDesignRegion";
// The plain header (stores without the cinematic design): its own download (PlainHeaderParts.tsx).
import { HeaderOffset, Navbar, Topbar } from "@/components/PlainHeaderParts";
import { TreeRuntime } from "@/pageTree/TreeRuntime";
import { AppShell } from "@/components/AppShell";
import { PushAsk } from "@/components/PushAsk";
import { iconHref, pushOn, workerHref } from "@/lib/pwa";
import { appState } from "@/lib/pwaServer";
import { apiBaseClient } from "@/lib/apiClient";
import { normalizeDelivery } from "@/lib/delivery";

/** Every language is its own static page: /ar…, /en…, /he… (see src/middleware.ts). */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}
export const dynamicParams = false;

/** The rose design's own line and words (only for the store that wears it), in each language. */
const MODEST_COPY: Record<Lang, { tagline: string; description: (name: string) => string }> = {
  ar: {
    tagline: "أناقة تليق بكِ",
    description: (name) => `حجاب، فساتين وأطقم محتشمة من ${name}. اختيارات مختارة بحب للأناقة والراحة كل يوم، مع توصيل والدفع عند الاستلام.`,
  },
  en: {
    tagline: "Beautifully, you",
    description: (name) => `Hijabs, dresses and modest sets from ${name}. Chosen with love for elegance and comfort every day, with delivery and cash on delivery.`,
  },
  he: {
    tagline: "אלגנטיות שמתאימה לך",
    description: (name) => `חיג'אבים, שמלות וסטים צנועים של ${name}. נבחרו באהבה לאלגנטיות ולנוחות בכל יום, עם משלוח ותשלום במזומן בעת המסירה.`,
  },
};

/**
 * The site's name, icon and sharing card come from the admin settings (store name,
 * favicon, logo); every page title becomes "Page | Store name", in the page's language.
 */
export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const lang: Lang = isLang(params.lang) ? params.lang : "ar";
  const { site } = await getPublicSettings().catch(() => ({ site: {} as any }));
  // The store's own name and words (admin → هوية المتجر).
  const id = identityOf(site as any);
  const name = nameOf(id, lang);
  const modest = roseDesignOn(site?.header);
  const main = langConfigOf((site as any)?.header).default === lang;
  // A title in one language holds only that language's line.
  const tagline = modest ? MODEST_COPY[lang].tagline : id.tagline[lang];
  // Admin → Settings → محركات البحث: the home title, description and sharing picture (written for the main language).
  const seo = ((site as any)?.header?.seo ?? {}) as { title?: string; description?: string; ogImageUrl?: string };
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const title = (main && text(seo.title)) || (tagline ? `${name} — ${tagline}` : name);
  const description =
    (main && text(seo.description)) ||
    (modest ? MODEST_COPY[lang].description(name) : id.about[lang] || pick(id.about, lang) || name);
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  const favicon = (site as any)?.faviconUrl || null;
  const shareImage = text(seo.ogImageUrl) || (site as any)?.logoUrl || (modest ? "/editorial/hijab-campaign.webp" : undefined);
  // Admin → الإعدادات → التطبيق: the shop installs as an app (its manifest, and an iPhone's own tags and icon).
  const app = await appState().catch(() => null);
  const asApp = app?.app.enabled ? app : null;
  const appIcons = asApp ? { icons: { ...(favicon ? { icon: favicon } : {}), apple: iconHref(180, "any", asApp.version, asApp.colours.theme) } } : null;
  return {
    ...(base ? { metadataBase: new URL(base) } : {}),
    title: { default: title, template: `%s | ${name}` },
    description,
    applicationName: name,
    ...(appIcons ?? (favicon ? { icons: { icon: favicon, apple: favicon } } : {})),
    ...(asApp ? { manifest: "/manifest.webmanifest", appleWebApp: { capable: true, title: asApp.app.shortName || name, statusBarStyle: "default" as const } } : {}),
    openGraph: { type: "website", siteName: name, locale: LANG_LOCALE[lang], title, description, images: [shareImage] },
    twitter: { card: "summary_large_image", title, description, images: [shareImage] },
  };
}

/** The bar's colour on a phone: the app's, while the shop is an app. */
export async function generateViewport(): Promise<Viewport> {
  const app = await appState().catch(() => null);
  return app?.app.enabled ? { themeColor: app.colours.theme } : {};
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  if (!isLang(params.lang)) notFound();
  const lang: Lang = params.lang;
  const [bootstrap, settings, pwa] = await Promise.all([
    getBootstrap(),
    getPublicSettings(),
    // Admin → الإعدادات → التطبيق (header.app).
    appState().catch(() => null),
  ]);
  const settingsHeader = (settings.site as any)?.header;
  const bootstrapHeader = (bootstrap.site as any)?.header;
  const header =
    (settingsHeader && typeof settingsHeader === "object"
      ? settingsHeader
      : null) ??
    (bootstrapHeader && typeof bootstrapHeader === "object"
      ? bootstrapHeader
      : null) ??
    null;
  const theme = header?.theme ?? null;
  // Admin → ثيمات المتجر (header.storeTheme): none = the kind's theme; the rose design only where picked.
  const storeTheme = storeThemeOf(header);
  // The pack the store applied (header.storeKit): its focus ring, cursor and loading indicator here.
  const ownedDesign = independentDesign(header);
  const kit = ownedDesign && !header?.storeKit ? null : kitOfHeader(header, storeTheme?.theme ?? null);
  const regions = ownedDesign ? await getStoreDesignRegions().catch(() => ({ header: null, footer: null })) : null;
  const identity = identityOf({ siteName: bootstrap.site.siteName, header, currencyCode: (bootstrap.site as any).currencyCode });
  setArabicTone(identity.audience);
  // The clothes shop's words (bag, look, fabric) are the rose design's; any other store speaks plainly.
  setPlainWords(!roseDesignOn(header));
  // Admin → Settings → أكواد متقدمة → "إيقاف الأكواد المخصصة مؤقتاً": custom CSS,
  // scripts and tracking pixels are not added while it is on (nothing is deleted).
  const safeMode = header?.safeMode === true;
  const customCss = safeMode ? "" : bootstrap.site.customCss?.trim() || "";
  const initialStorefrontSettings =
    header?.storefront ??
    (settings.site as any)?.storefront ??
    (bootstrap.site as any)?.storefront ??
    undefined;
  const darkModeDisabled = initialStorefrontSettings?.darkModeEnabled === false;
  // A store with a theme is in that theme's mode (a light theme's page isn't put in the old frame's dark).
  const storeThemeMode = storeTheme ? themePalette(storeTheme.theme, storeTheme.mode).mode : null;
  const defaultTheme =
    storeThemeMode ??
    (darkModeDisabled
      ? "light"
      : initialStorefrontSettings?.darkModeDefault === false
        ? "light"
        : "dark");

  const cinematic = cinematicEnabled(header, process.env.ESTABREK_HOME_MODE);
  // Admin → Settings → حسابات الزبائن (off by default: visitors only).
  const accountsEnabled = settings.site?.customerAccountsEnabled === true;
  // Admin → المخزون → بانتظار التوفّر (off by default).
  const stockAlertsEnabled = settings.site?.stockAlertsEnabled === true;
  const navbarHeader = { ...(header ?? {}), sticky: true };
  // Admin → السرعة والكاش → الحركة والتحميل: read by the scroll scenes before they start.
  const motion = normalizeMotion((settings.site as any)?.performance);
  // Signed in or not is marked on <html> before the page shows, so what a recipe keeps for customers (or for
  // guests) never flashes (pageTree/css.ts, TreeTriggers).
  const motionScript = `window.__estabrekMotion=${JSON.stringify(motion).replace(/</g, "\\u003c")};try{if(/(^|; ?)estabrek_signed_in=1(;|$)/.test(document.cookie))document.documentElement.setAttribute("data-pt-in","")}catch(e){}`;
  // Admin → تجارب A/B: this visit's sides are picked before the page shows.
  const abTestsNow = abTests((settings.site as any)?.experiments);
  const rawLoading = header?.ui?.loading ?? null;
  // The store's own loading choice wins; else the pack's.
  const kitLoader = !rawLoading?.enabled && kit && kit.loader !== "none" ? kit.loader : null;
  const enabled = rawLoading?.enabled === true || Boolean(kitLoader);
  const rawId =
    kitLoader ??
    (typeof rawLoading?.animationId === "string"
      ? rawLoading.animationId
      : "spinner-simple");
  const preset =
    getLoadingById(rawId) ?? getLoadingById("spinner-simple") ?? null;
  const loading = preset
    ? { enabled, animationId: preset.id, html: preset.html, css: preset.css }
    : null;

  return (
    <html
      lang={LANG_LOCALE[lang]}
      data-phone-glass={motion.phoneGlass ? "" : undefined}
      dir={dirOf(lang)}
      data-theme={defaultTheme}
      data-store-theme={storeTheme?.theme.id}
      data-store-kit={kit ? "" : undefined}
      data-store-design={ownedDesign ? "cms" : undefined}
      className={defaultTheme}
      suppressHydrationWarning
    >
      <head>
        {storeTheme ? <style id="store-theme" dangerouslySetInnerHTML={{ __html: themeCss(storeTheme.theme, storeTheme.mode) }} /> : null}
        {kit ? <style id="store-kit" dangerouslySetInnerHTML={{ __html: kitCss(kit) }} /> : null}
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
        {abTestsNow.length ? <script dangerouslySetInnerHTML={{ __html: abHeadScript(abTestsNow) }} /> : null}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body>
        {/* A store with its own design: the page trees' shared rules once, before its header, page and footer
            (each tree's style then carries only its own rules, cms/renderCmsPage.tsx), after every stylesheet. */}
        {ownedDesign ? <style id="page-tree-base" dangerouslySetInnerHTML={{ __html: BASE_CSS }} /> : null}
        <MotionSettingsBridge />
        <StoreThemePreview saved={storeTheme?.theme.id ?? null} owned={readThemeSnapshot(header?.storeTheme?.snapshot)} roseOwner={roseOwned(header)} />
        <ThemeMotion />
        {ownedDesign ? <TreeRuntime /> : null}
        <a href="#main-content" className="skip-link">
          {tr(lang, "تخطي إلى المحتوى", "Skip to content")}
        </a>
        <Providers
          initialStorefrontSettings={initialStorefrontSettings}
          storeThemeMode={storeThemeMode}
          visualControls={bootstrap.site.visualControls}
          cinematic={cinematic}
          rose={roseDesignOn(header)}
          accountsEnabled={accountsEnabled}
          stockAlertsEnabled={stockAlertsEnabled}
          checkoutTerms={(settings.site as { checkoutTerms?: unknown } | undefined)?.checkoutTerms}
          razan={header?.razan}
          requests={header?.requests}
          delivery={header?.delivery}
          quiz={header?.quiz}
          ai={header?.ai}
          scarcity={header?.scarcity}
          identity={identity}
          lang={lang}
          languages={langConfigOf(header)}
        >
          <EffectsStyles />
          <StoreLookProvider
            value={{
              theme: storeTheme?.theme ?? null,
              mode: storeThemeMode ?? "light",
              industry: identity.industry,
              rose: roseDesignOn(header),
            }}
          >
          <ThemeWrap
            theme={theme}
            cursorThemeId={kit ? (kit.cursor === "none" ? null : kit.cursor) : cinematic ? null : header?.ui?.cursorThemeId}
            storefrontSettings={initialStorefrontSettings}
            disableGalleryBackdrop={cinematic}
            storeThemeMode={storeThemeMode}
          >
            <UiSettingsProvider loading={loading}>
              {customCss ? (
                <style dangerouslySetInnerHTML={{ __html: customCss }} />
              ) : null}
              {safeMode ? null : <ScriptTags scripts={bootstrap.site.scriptsHead} />}
              {safeMode ? null : <MarketingPixels config={header?.marketing} />}
              <MaintenanceGate
                maintenance={settings.site?.maintenance}
                siteName={nameOf(identity, lang)}
                logoUrl={bootstrap.site.logoUrl}
                whatsappNumber={bootstrap.site.whatsappNumber}
                contactEmail={bootstrap.site.contactEmail}
                countryCode={(bootstrap.site as any).storeCountryCode}
              >
              <StorefrontChrome
                enabled={cinematic}
                storeData={{
                  siteName: bootstrap.site.siteName,
                  logoUrl: bootstrap.site.logoUrl,
                  navLinks: selectStorefrontNav(header?.cmsNav, bootstrap.primaryMenu),
                  footerDescription: (
                    (bootstrap.site as any).footer?.about?.text || ""
                  ).split("\n\n")[0],
                  instagram: (bootstrap.site as any).footer?.social?.instagram,
                  footerEnabled: (bootstrap.site as any).footer?.enabled,
                  contactPhone: bootstrap.site.contactPhone,
                  whatsappNumber: bootstrap.site.whatsappNumber,
                  contactEmail: bootstrap.site.contactEmail,
                  announcement: bootstrap.site.announcement?.isActive
                    ? bootstrap.site.announcement.text || ""
                    : "",
                  announcementHref: bootstrap.site.announcement?.linkUrl || "",
                  // Admin → الإعدادات → الثيم والألوان: a picked colour dresses the whole store, or the product area only.
                  colorFollow: initialStorefrontSettings?.colorFollow === "product" ? "product" : "everything",
                  // Admin → الإعدادات → سرّ المتجر: holding the logo down opens a hidden coupon.
                  secret: { enabled: initialStorefrontSettings?.secretEnabled !== false, code: typeof initialStorefrontSettings?.secretCode === "string" ? initialStorefrontSettings.secretCode.trim().slice(0, 40) : "", text: typeof initialStorefrontSettings?.secretText === "string" ? initialStorefrontSettings.secretText.slice(0, 200) : "" },
                  // Admin → التوصيل: free delivery from this subtotal (the small bag's progress line).
                  freeOver: normalizeDelivery(header?.delivery).freeOver,
                }}
                legacyHeader={cinematic ? null : regions?.header ? <StoreDesignRegion tree={regions.header} region="header" lang={lang} accounts={accountsEnabled} /> :
                  <>
                    <div data-studio-region="header" id="site-header" className="site-header">
                      <AnnouncementBar site={settings.site} />
                      <Topbar header={header} />
                      <Navbar
                        site={bootstrap.site}
                        primaryMenu={bootstrap.primaryMenu}
                        header={navbarHeader}
                        cmsNav={header?.cmsNav}
                      />
                    </div>
                    <HeaderOffset />
                  </>
                }
                legacyFooter={cinematic ? null : regions?.footer ? <StoreDesignRegion tree={regions.footer} region="footer" lang={lang} /> :
                  <Footer
                    site={bootstrap.site}
                    footerMenu={bootstrap.footerMenu}
                    footer={
                      (settings.site as any)?.footer ??
                      (bootstrap.site as any)?.footer
                    }
                  />
                }
              >
                {children}
              </StorefrontChrome>
              </MaintenanceGate>
              {/* Global body scripts from site settings */}
              {safeMode ? null : <ScriptTags scripts={bootstrap.site.scriptsBody} />}
              <WebVitalsReporter />
              {/* Admin → الإعدادات → التطبيق → الإشعارات (header.app.push): inside the account's provider, so a phone is tied to who is signed in on it. */}
              <PushAsk
                on={pwa ? pushOn(pwa.app) : false}
                ask={pwa?.app.push.ask ?? "banner"}
                lang={lang}
                name={pwa?.app.shortName || nameOf(identity, lang)}
                icon={pwa ? iconHref(192, "any", pwa.version, pwa.colours.theme) : ""}
              />
            </UiSettingsProvider>
          </ThemeWrap>
          </StoreLookProvider>
        </Providers>
        <AppShell
          enabled={pwa?.app.enabled === true}
          worker={pwa ? workerHref(pwa.version, header, process.env.NODE_ENV !== "production", pushOn(pwa.app) ? apiBaseClient() : null) : "/sw.js"}
          prompt={pwa?.app.prompt ?? "off"}
          lang={lang}
          name={pwa?.app.shortName || nameOf(identity, lang)}
          icon={pwa ? iconHref(192, "any", pwa.version, pwa.colours.theme) : ""}
        />
      </body>
    </html>
  );
}
