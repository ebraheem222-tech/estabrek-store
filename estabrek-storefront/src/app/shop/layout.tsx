import React from "react";
import { getBootstrap, getPublicSettings } from "@/lib/api";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScriptTags } from "@/components/ScriptTags";
import { ThemeWrap } from "@/components/ThemeWrap";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [bootstrap, settings] = await Promise.all([getBootstrap(), getPublicSettings()]);
  const customCss = bootstrap.site.customCss?.trim() || "";
  const theme = (settings.site as any)?.header?.theme ?? null;

  return (
    <ThemeWrap theme={theme}>
      {customCss ? <style dangerouslySetInnerHTML={{ __html: customCss }} /> : null}
      <ScriptTags scripts={bootstrap.site.scriptsHead} />
      <AnnouncementBar site={settings.site} />
      <Navbar site={bootstrap.site} primaryMenu={bootstrap.primaryMenu} />
      {children}
      <Footer site={bootstrap.site} footerMenu={bootstrap.footerMenu} footer={(settings.site as any)?.footer} />
      <ScriptTags scripts={bootstrap.site.scriptsBody} />
    </ThemeWrap>
  );
}
