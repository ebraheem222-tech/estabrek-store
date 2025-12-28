import React from "react";
import { getBootstrap, getPublicSettings } from "@/lib/api";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Topbar } from "@/components/Topbar";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScriptTags } from "@/components/ScriptTags";
import { ThemeWrap } from "@/components/ThemeWrap";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [bootstrap, settings] = await Promise.all([getBootstrap(), getPublicSettings()]);
  const header = (settings.site as any)?.header ?? null;
  const theme = header?.theme ?? null;
  const navbarHeader = { ...(header ?? {}), sticky: true };

  return (
    <ThemeWrap theme={theme}>
      <AnnouncementBar site={settings.site} />
      <Topbar header={header} />
      <Navbar
        site={bootstrap.site}
        primaryMenu={bootstrap.primaryMenu}
        header={navbarHeader}
        cmsNav={header?.cmsNav}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
      <Footer site={bootstrap.site} footerMenu={bootstrap.footerMenu} footer={(settings.site as any)?.footer} />
      {/* Global body scripts from site settings */}
      <ScriptTags scripts={bootstrap.site.scriptsBody} />
    </ThemeWrap>
  );
}
