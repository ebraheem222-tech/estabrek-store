import "./globals.css";
import "../cms/effects/effects.css";
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

export const metadata = {
  title: "Estabrak Store",
  description: "Storefront",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [bootstrap, settings] = await Promise.all([getBootstrap(), getPublicSettings()]);
  const header = (settings.site as any)?.header ?? null;
  const theme = header?.theme ?? null;
  const customCss = bootstrap.site.customCss?.trim() || "";
  const initialStorefrontSettings = (settings.site as any)?.header?.storefront ?? undefined;
  const darkModeDisabled = initialStorefrontSettings?.darkModeEnabled === false;
  const defaultTheme = darkModeDisabled
    ? "light"
    : initialStorefrontSettings?.darkModeDefault === false
    ? "light"
    : "dark";

  const navbarHeader = { ...(header ?? {}), sticky: true };
  const rawLoading = header?.ui?.loading ?? null;
  const enabled = rawLoading?.enabled === true;
  const rawId = typeof rawLoading?.animationId === "string" ? rawLoading.animationId : "spinner-simple";
  const preset = getLoadingById(rawId) ?? getLoadingById("spinner-simple") ?? null;
  const loading = preset ? { enabled, animationId: preset.id, html: preset.html, css: preset.css } : null;

  return (
    <html lang="ar" dir="rtl" data-theme={defaultTheme} className={defaultTheme} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">تخطي إلى المحتوى</a>
        <Providers initialStorefrontSettings={initialStorefrontSettings}>
          <ThemeWrap theme={theme} cursorThemeId={header?.ui?.cursorThemeId} storefrontSettings={initialStorefrontSettings}>
            <UiSettingsProvider loading={loading}>
              {customCss ? <style dangerouslySetInnerHTML={{ __html: customCss }} /> : null}
              <ScriptTags scripts={bootstrap.site.scriptsHead} />
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
              {children}
              <Footer site={bootstrap.site} footerMenu={bootstrap.footerMenu} footer={(settings.site as any)?.footer} />
              {/* Global body scripts from site settings */}
              <ScriptTags scripts={bootstrap.site.scriptsBody} />
              <WebVitalsReporter />
            </UiSettingsProvider>
          </ThemeWrap>
        </Providers>
      </body>
    </html>
  );
}
