import type { Metadata } from "next";
import { selectStorefrontNav } from "@/lib/storefrontNav";
import "../globals.css";
import "../cinematic.css";
import "../store-themes.css";
import Providers from "../providers";
import { notFound } from "next/navigation";
import { LANGS, LANG_LOCALE, dirOf, isLang, langConfigOf, type Lang } from "@/lib/i18n";
import { getBootstrap, getPublicSettings } from "@/lib/api";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Topbar } from "@/components/Topbar";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScriptTags } from "@/components/ScriptTags";
import { ThemeWrap } from "@/components/ThemeWrap";
import { UiSettingsProvider } from "@/components/UiSettingsProvider";
import { HeaderOffset } from "@/components/HeaderOffset";
import { getLoadingById } from "@/cms/effects/loadingAnimations";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import { EffectsStyles } from "@/components/EffectsStyles";
import { StorefrontChrome } from "@/components/cinematic/StorefrontChrome";
import { MaintenanceGate } from "@/components/cinematic/MaintenanceGate";
import { MotionSettingsBridge } from "@/components/MotionSettingsBridge";
import { normalizeMotion } from "@/lib/motionSettings";
import { abHeadScript, abTests } from "@/lib/ab";
import { MarketingPixels } from "@/components/MarketingPixels";
import { identityOf, modestShop, nameOf, pick } from "@/lib/storeIdentity";
import { setArabicTone, tr } from "@/lib/words";
import { storeThemeOf, themeCss } from "@/storeThemes";
import { ThemeMotion } from "@/storeThemes/motion/ThemeMotion";
import { StoreThemePreview } from "@/storeThemes/StoreThemePreview";

/** Every language is its own static page: /ar…, /en…, /he… (see src/middleware.ts). */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}
export const dynamicParams = false;

/** The rose design's own line and words for a clothes shop for women, in each language. */
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
  const modest = modestShop(id);
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
  const shareImage = text(seo.ogImageUrl) || (site as any)?.logoUrl || "/editorial/hijab-campaign.webp";
  return {
    ...(base ? { metadataBase: new URL(base) } : {}),
    title: { default: title, template: `%s | ${name}` },
    description,
    applicationName: name,
    ...(favicon ? { icons: { icon: favicon, apple: favicon } } : {}),
    openGraph: { type: "website", siteName: name, locale: LANG_LOCALE[lang], title, description, images: [shareImage] },
    twitter: { card: "summary_large_image", title, description, images: [shareImage] },
  };
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
  const [bootstrap, settings] = await Promise.all([
    getBootstrap(),
    getPublicSettings(),
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
  // Admin → ثيمات المتجر (header.storeTheme): none = the rose design.
  const storeTheme = storeThemeOf(header);
  const identity = identityOf({ siteName: bootstrap.site.siteName, header, currencyCode: (bootstrap.site as any).currencyCode });
  setArabicTone(identity.audience);
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
  const defaultTheme = darkModeDisabled
    ? "light"
    : initialStorefrontSettings?.darkModeDefault === false
      ? "light"
      : "dark";

  const cinematic = process.env.ESTABREK_HOME_MODE !== "cms";
  // Admin → Settings → حسابات الزبائن (off by default: visitors only).
  const accountsEnabled = settings.site?.customerAccountsEnabled === true;
  // Admin → المخزون → بانتظار التوفّر (off by default).
  const stockAlertsEnabled = settings.site?.stockAlertsEnabled === true;
  const navbarHeader = { ...(header ?? {}), sticky: true };
  // Admin → السرعة والكاش → الحركة والتحميل: read by the scroll scenes before they start.
  const motion = normalizeMotion((settings.site as any)?.performance);
  const motionScript = `window.__estabrekMotion=${JSON.stringify(motion).replace(/</g, "\\u003c")};`;
  // Admin → تجارب A/B: this visit's sides are picked before the page shows.
  const abTestsNow = abTests((settings.site as any)?.experiments);
  const rawLoading = header?.ui?.loading ?? null;
  const enabled = rawLoading?.enabled === true;
  const rawId =
    typeof rawLoading?.animationId === "string"
      ? rawLoading.animationId
      : "spinner-simple";
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
      className={defaultTheme}
      suppressHydrationWarning
    >
      <head>
        {storeTheme ? <style id="store-theme" dangerouslySetInnerHTML={{ __html: themeCss(storeTheme.theme, storeTheme.mode) }} /> : null}
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
        {abTestsNow.length ? <script dangerouslySetInnerHTML={{ __html: abHeadScript(abTestsNow) }} /> : null}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body>
        <MotionSettingsBridge />
        <StoreThemePreview saved={storeTheme?.theme.id ?? null} />
        <ThemeMotion />
        <a href="#main-content" className="skip-link">
          {tr(lang, "تخطي إلى المحتوى", "Skip to content")}
        </a>
        <Providers
          initialStorefrontSettings={initialStorefrontSettings}
          cinematic={cinematic}
          accountsEnabled={accountsEnabled}
          stockAlertsEnabled={stockAlertsEnabled}
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
          <ThemeWrap
            theme={theme}
            cursorThemeId={cinematic ? null : header?.ui?.cursorThemeId}
            storefrontSettings={initialStorefrontSettings}
            disableGalleryBackdrop={cinematic}
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
                }}
                legacyHeader={
                  <>
                    <div id="site-header" className="site-header">
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
                legacyFooter={
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
            </UiSettingsProvider>
          </ThemeWrap>
        </Providers>
      </body>
    </html>
  );
}
