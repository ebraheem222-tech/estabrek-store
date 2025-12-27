import React from "react";
import { getBootstrap, getPublicSettings } from "@/lib/api";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScriptTags } from "@/components/ScriptTags";
import { ThemeWrap } from "@/components/ThemeWrap";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const [bootstrap, settings] = await Promise.all([getBootstrap(), getPublicSettings()]);
  const theme = (settings.site as any)?.header?.theme ?? null;

  return (
    <ThemeWrap theme={theme}>
      <AnnouncementBar site={settings.site} />
      <Navbar site={bootstrap.site} primaryMenu={bootstrap.primaryMenu} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <Footer site={bootstrap.site} footerMenu={bootstrap.footerMenu} footer={(settings.site as any)?.footer} />
      <ScriptTags scripts={bootstrap.site.scriptsBody} />
    </ThemeWrap>
  );
}
