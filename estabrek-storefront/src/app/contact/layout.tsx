import React from "react";
import { getBootstrap, getPublicSettings } from "@/lib/api";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScriptTags } from "@/components/ScriptTags";
import { ThemeWrap } from "@/components/ThemeWrap";
import { UiSettingsProvider } from "@/components/UiSettingsProvider";
import { getLoadingById } from "../../cms/effects/loadingAnimations";

export default async function ContactLayout({ children }: { children: React.ReactNode }) {
  const [bootstrap, settings] = await Promise.all([getBootstrap(), getPublicSettings()]);
  const customCss = bootstrap.site.customCss?.trim() || "";
  const header = (settings.site as any)?.header ?? null;
  const theme = header?.theme ?? null;

  const rawLoading = header?.ui?.loading ?? null;
  const enabled = rawLoading?.enabled === true;
  const rawId = typeof rawLoading?.animationId === "string" ? rawLoading.animationId : "spinner-simple";
  const preset = getLoadingById(rawId) ?? getLoadingById("spinner-simple") ?? null;
  const loading = preset ? { enabled, animationId: preset.id, html: preset.html, css: preset.css } : null;

  return (
    <ThemeWrap theme={theme} cursorThemeId={header?.ui?.cursorThemeId}>
      <UiSettingsProvider loading={loading}>
        {customCss ? <style dangerouslySetInnerHTML={{ __html: customCss }} /> : null}
        <ScriptTags scripts={bootstrap.site.scriptsHead} />
        <AnnouncementBar site={settings.site} />
        <Navbar site={bootstrap.site} primaryMenu={bootstrap.primaryMenu} />
        {children}
        <Footer site={bootstrap.site} footerMenu={bootstrap.footerMenu} footer={(settings.site as any)?.footer} />
        <ScriptTags scripts={bootstrap.site.scriptsBody} />
      </UiSettingsProvider>
    </ThemeWrap>
  );
}
