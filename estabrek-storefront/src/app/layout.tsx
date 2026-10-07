import type { Metadata } from "next";
import { selectStorefrontNav } from "@/lib/storefrontNav";
import "./globals.css";
import "./cinematic.css";
import Providers from "./providers";
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
import { MarketingPixels } from "@/components/MarketingPixels";

/**
 * The site's name, icon and sharing card come from the admin settings (store name,
 * favicon, logo); every page title becomes "Page | Store name".
 */
export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getPublicSettings().catch(() => ({ site: {} as any }));
  const name = String((site as any)?.siteName ?? "").trim() || "استبرق";
  const tagline = "أناقة تليق بكِ";
  // Admin → Settings → محركات البحث: the home title, description and sharing picture.
  const seo = ((site as any)?.header?.seo ?? {}) as { title?: string; description?: string; ogImageUrl?: string };
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const title = text(seo.title) || `${name} — ${tagline}`;
  const description =
    text(seo.description) ||
    `حجاب، فساتين وأطقم محتشمة من ${name}. اختيارات مختارة بحب للأناقة والراحة كل يوم، مع توصيل والدفع عند الاستلام.`;
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  const favicon = (site as any)?.faviconUrl || null;
  const shareImage = text(seo.ogImageUrl) || (site as any)?.logoUrl || "/editorial/hijab-campaign.webp";
  return {
    ...(base ? { metadataBase: new URL(base) } : {}),
    title: { default: title, template: `%s | ${name}` },
    description,
    applicationName: name,
    ...(favicon ? { icons: { icon: favicon, apple: favicon } } : {}),
    openGraph: { type: "website", siteName: name, locale: "ar", title, description, images: [shareImage] },
    twitter: { card: "summary_large_image", title, description, images: [shareImage] },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      lang="ar"
      dir="rtl"
      data-theme={defaultTheme}
      className={defaultTheme}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          تخطي إلى المحتوى
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
                siteName={bootstrap.site.siteName || "استبرق"}
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
