import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { usePageDetails } from "../../hooks/usePages";
import { useSettings } from "../../hooks/useSettings";
import { useNavMenus } from "../../hooks/useNav";
import type { NavigationItem, NavigationMenu } from "../../api/nav.api";
import { PageRenderer } from "./PageRenderer";
import { ThemePreview } from "../../components/ThemePreview";

type ScopeCssFn = (css: string, scopeSelector: string) => string;

type HeaderConfig = {
  sticky?: boolean;
  showSearch?: boolean;
  announcement?: { enabled?: boolean; text?: string; href?: string; buttonText?: string };
  cta?: { enabled?: boolean; label?: string; href?: string };
};

type FooterConfig = {
  about?: { title?: string; text?: string };
  social?: Record<string, string>;
  newsletter?: { enabled?: boolean; title?: string; placeholder?: string; buttonLabel?: string };
  bottom?: { copyright?: string };
};

type GlobalAnnouncementData = {
  enabled?: boolean;
  text?: string;
  href?: string;
  buttonText?: string;
};

type GlobalHeaderData = {
  sticky?: boolean;
  showSearch?: boolean;
  showMenu?: boolean;
  showCta?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  brandText?: string;
};

type GlobalFooterData = {
  aboutTitle?: string;
  aboutText?: string;
  showNewsletter?: boolean;
  newsletterTitle?: string;
  newsletterPlaceholder?: string;
  newsletterButtonLabel?: string;
  showSocial?: boolean;
  copyright?: string;
};

const GLOBAL_SECTION_TYPES = new Set(["GLOBAL_ANNOUNCEMENT", "GLOBAL_HEADER", "GLOBAL_FOOTER"]);

function buildTree(items: NavigationItem[]) {
  const byParent = new Map<string | null, NavigationItem[]>();
  for (const it of items) {
    const key = (it.parentId ?? null) as string | null;
    const arr = byParent.get(key) ?? [];
    arr.push(it);
    byParent.set(key, arr);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  return { byParent };
}

function MenuInline({ items }: { items: NavigationItem[] }) {
  const tree = useMemo(() => buildTree(items), [items]);
  const roots = tree.byParent.get(null) ?? [];

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {roots
        .filter((x) => x.isActive !== false)
        .map((it) => (
          <div key={it.id} className="relative group">
            <a
              href={it.href}
              target={it.target || undefined}
              className="inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium hover:bg-white/10"
              rel={it.isExternal ? "noreferrer" : undefined}
            >
              {it.label}
            </a>
            {(tree.byParent.get(it.id) ?? []).length ? (
              <div className="absolute right-0 mt-2 hidden min-w-48 rounded-2xl border border-white/[0.08] bg-[color:var(--bg)]/95 p-2 shadow-lg group-hover:block">
                {(tree.byParent.get(it.id) ?? [])
                  .filter((x) => x.isActive !== false)
                  .map((child) => (
                    <a
                      key={child.id}
                      href={child.href}
                      target={child.target || undefined}
                      className="block rounded-xl px-3 py-2 text-sm hover:bg-white/10"
                      rel={child.isExternal ? "noreferrer" : undefined}
                    >
                      {child.label}
                    </a>
                  ))}
              </div>
            ) : null}
          </div>
        ))}
    </nav>
  );
}

function MenuMobile({
  items,
  onNavigate,
}: {
  items: NavigationItem[];
  onNavigate?: () => void;
}) {
  const tree = useMemo(() => buildTree(items), [items]);
  const roots = tree.byParent.get(null) ?? [];

  return (
    <div className="space-y-3">
      {roots
        .filter((x) => x.isActive !== false)
        .map((it) => {
          const children = (tree.byParent.get(it.id) ?? []).filter((x) => x.isActive !== false);
          return (
            <div key={it.id} className="space-y-2">
              <a
                href={it.href}
                target={it.target || undefined}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm hover:bg-white/[0.08]"
                rel={it.isExternal ? "noreferrer" : undefined}
                onClick={onNavigate}
              >
                <span>{it.label}</span>
                {children.length ? <span className="text-xs opacity-60">+</span> : null}
              </a>
              {children.length ? (
                <div className="ms-4 space-y-1 border-s border-white/10 ps-3">
                  {children.map((child) => (
                    <a
                      key={child.id}
                      href={child.href}
                      target={child.target || undefined}
                      className="block rounded-lg px-2 py-1 text-sm opacity-80 hover:bg-white/[0.06] hover:opacity-100"
                      rel={child.isExternal ? "noreferrer" : undefined}
                      onClick={onNavigate}
                    >
                      {child.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
    </div>
  );
}

function MenuFooterColumns({ items }: { items: NavigationItem[] }) {
  const tree = useMemo(() => buildTree(items), [items]);
  const roots = tree.byParent.get(null) ?? [];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {roots
        .filter((x) => x.isActive !== false)
        .map((root) => (
          <div key={root.id}>
            <div className="text-sm font-semibold">{root.label}</div>
            <div className="mt-2 space-y-2">
              {(tree.byParent.get(root.id) ?? [])
                .filter((x) => x.isActive !== false)
                .map((child) => (
                  <a
                    key={child.id}
                    href={child.href}
                    target={child.target || undefined}
                    className="block text-sm opacity-80 hover:opacity-100"
                    rel={child.isExternal ? "noreferrer" : undefined}
                  >
                    {child.label}
                  </a>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
}

export default function PagePreviewPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();

  const qPage = usePageDetails(id ?? null);
  const qSettings = useSettings();
  const qNav = useNavMenus();

  const page: any = qPage.data;
  const settings: any = qSettings.data;
  const menus: NavigationMenu[] = (qNav.data as any) ?? [];
  const [contentLocale, setContentLocale] = useState<"ar" | "he" | "en">("ar");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scopeCssFn, setScopeCssFn] = useState<ScopeCssFn | null>(null);

  const i18nMeta = useMemo(() => {
    try {
      const raw = typeof page?.headScripts === "string" ? page.headScripts : JSON.stringify(page?.headScripts ?? {});
      const meta = raw && raw.trim() ? JSON.parse(raw) : {};
      return meta?.__i18n ?? null;
    } catch {
      return null;
    }
  }, [page?.headScripts]);

  const translatedSections = useMemo(() => {
    if (!i18nMeta || contentLocale === "ar") return null;
    const arr = (i18nMeta?.sections as any)?.[contentLocale];
    return Array.isArray(arr) ? arr : null;
  }, [i18nMeta, contentLocale]);

  const translatedFields = useMemo(() => {
    if (!i18nMeta || contentLocale === "ar") return null;
    const fields = (i18nMeta as any)?.[contentLocale];
    return fields && typeof fields === "object" ? fields : null;
  }, [i18nMeta, contentLocale]);

  const previewSections = useMemo(() => {
    if (!page?.sections) return [];
    if (!translatedSections || contentLocale === "ar") return page.sections;
    return page.sections.map((sec: any, idx: number) => {
      const translated = translatedSections[idx];
      if (!translated || (translated.type && translated.type !== sec.type)) return sec;
      const base = sec.data ?? {};
      const tData = translated.data ?? {};
      const merged: any = { ...base, ...tData };
      if (base.ui && !tData.ui) merged.ui = base.ui;
      if (base.components && !Array.isArray(tData.components)) merged.components = base.components;
      return { ...sec, data: merged };
    });
  }, [page?.sections, translatedSections, contentLocale]);

  const previewName = (translatedFields as any)?.name ?? page?.name;
  const previewDir = contentLocale === "en" ? "ltr" : "rtl";
  const previewCustomCss = typeof page?.customCss === "string" ? page.customCss : "";
  const hasCustomPreviewCss = previewCustomCss.trim().length > 0;

  useEffect(() => {
    if (!hasCustomPreviewCss || scopeCssFn) return;
    let cancelled = false;
    import("../../lib/scopeCss")
      .then((mod) => {
        if (cancelled) return;
        setScopeCssFn(() => mod.scopeCss);
      })
      .catch(() => {
        // Keep preview usable even if CSS scoper chunk fails to load.
      });
    return () => {
      cancelled = true;
    };
  }, [hasCustomPreviewCss, scopeCssFn]);

  const scopedPreviewCss = useMemo(() => {
    if (!hasCustomPreviewCss || !scopeCssFn) return "";
    return scopeCssFn(previewCustomCss, "#cms-preview-root");
  }, [hasCustomPreviewCss, previewCustomCss, scopeCssFn]);

  const sortedPreviewSections = useMemo(
    () =>
      [...previewSections]
        .filter((s: any) => s && typeof s === "object")
        .sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0)),
    [previewSections]
  );

  const globalAnnouncementData = useMemo(() => {
    const sec = sortedPreviewSections.find((s: any) => s?.isVisible !== false && s?.type === "GLOBAL_ANNOUNCEMENT");
    return (sec?.data ?? null) as GlobalAnnouncementData | null;
  }, [sortedPreviewSections]);

  const globalHeaderData = useMemo(() => {
    const sec = sortedPreviewSections.find((s: any) => s?.isVisible !== false && s?.type === "GLOBAL_HEADER");
    return (sec?.data ?? null) as GlobalHeaderData | null;
  }, [sortedPreviewSections]);

  const globalFooterData = useMemo(() => {
    const sec = sortedPreviewSections.find((s: any) => s?.isVisible !== false && s?.type === "GLOBAL_FOOTER");
    return (sec?.data ?? null) as GlobalFooterData | null;
  }, [sortedPreviewSections]);

  const contentSections = useMemo(
    () => previewSections.filter((s: any) => !GLOBAL_SECTION_TYPES.has(String(s?.type ?? ""))),
    [previewSections]
  );

  const headerCfgBase: HeaderConfig = (settings?.header ?? {}) as any;
  const footerCfgBase: FooterConfig = (settings?.footer ?? {}) as any;

  const headerCfg: HeaderConfig = {
    ...headerCfgBase,
    sticky: globalHeaderData?.sticky ?? headerCfgBase.sticky,
    showSearch: globalHeaderData?.showSearch ?? headerCfgBase.showSearch,
    cta: {
      ...(headerCfgBase.cta ?? {}),
      enabled: globalHeaderData?.showCta ?? headerCfgBase.cta?.enabled,
      label: globalHeaderData?.ctaLabel ?? headerCfgBase.cta?.label,
      href: globalHeaderData?.ctaHref ?? headerCfgBase.cta?.href,
    },
  };

  const footerCfg: FooterConfig = {
    ...footerCfgBase,
    about: {
      ...(footerCfgBase.about ?? {}),
      title: globalFooterData?.aboutTitle ?? footerCfgBase.about?.title,
      text: globalFooterData?.aboutText ?? footerCfgBase.about?.text,
    },
    newsletter: {
      ...(footerCfgBase.newsletter ?? {}),
      enabled: globalFooterData?.showNewsletter ?? footerCfgBase.newsletter?.enabled,
      title: globalFooterData?.newsletterTitle ?? footerCfgBase.newsletter?.title,
      placeholder: globalFooterData?.newsletterPlaceholder ?? footerCfgBase.newsletter?.placeholder,
      buttonLabel: globalFooterData?.newsletterButtonLabel ?? footerCfgBase.newsletter?.buttonLabel,
    },
    bottom: {
      ...(footerCfgBase.bottom ?? {}),
      copyright: globalFooterData?.copyright ?? footerCfgBase.bottom?.copyright,
    },
  };

  const theme = (settings?.header as any)?.theme ?? null;

  const primaryMenu = useMemo(() => {
    const id = settings?.primaryNavId;
    if (!id) return null;
    return menus.find((m) => m.id === id) ?? null;
  }, [menus, settings?.primaryNavId]);

  const footerMenu = useMemo(() => {
    const id = settings?.footerNavId;
    if (!id) return null;
    return menus.find((m) => m.id === id) ?? null;
  }, [menus, settings?.footerNavId]);

  if (qPage.isLoading || qSettings.isLoading || qNav.isLoading) {
    return (
      <div dir="rtl" className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2">
          <Spinner />
          <div className="text-sm opacity-80">جاري التحميل…</div>
        </div>
      </div>
    );
  }

  if (qPage.isError || !page) {
    return (
      <div dir="rtl" className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
        فشل تحميل المعاينة.
        <div className="mt-4">
          <Button variant="ghost" onClick={() => nav("/admin/pages")}>
            رجوع
          </Button>
        </div>
      </div>
    );
  }

  const announcement = globalAnnouncementData
    ? {
        enabled: globalAnnouncementData.enabled ?? true,
        text: globalAnnouncementData.text ?? headerCfg.announcement?.text,
        href: globalAnnouncementData.href ?? headerCfg.announcement?.href,
        buttonText: globalAnnouncementData.buttonText ?? headerCfg.announcement?.buttonText,
      }
    : headerCfg.announcement;
  const showAnnouncement = Boolean(announcement?.enabled) && Boolean(String(announcement?.text ?? "").trim());

  const headerSticky = Boolean(headerCfg.sticky);
  const showMenu = globalHeaderData?.showMenu !== false;
  const siteTitle = String(globalHeaderData?.brandText ?? "").trim() || settings?.siteName || "Store";
  const cta = headerCfg.cta;
  const showCta = Boolean(cta?.enabled) && Boolean(String(cta?.label ?? "").trim());

  const social = globalFooterData?.showSocial === false ? {} : (footerCfg.social ?? {});

  return (
    <div dir={previewDir} className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">معاينة الصفحة (Storefront Preview)</div>
            <div className="mt-1 text-xs opacity-70">
              <span className="opacity-100">{previewName}</span> -
              <span className="ml-2" dir="ltr">
                {page.slug}
              </span>
              <span className="ml-2 rounded-lg bg-white/10 px-2 py-1 text-[11px]">{page.status}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm sm:w-auto"
              value={contentLocale}
              onChange={(e) => setContentLocale(e.target.value as any)}
              title="لغة المعاينة للمحتوى"
            >
              <option value="ar">العربية (AR)</option>
              <option value="he">עברית (HE)</option>
              <option value="en">English (EN)</option>
            </select>
            <Button variant="ghost" onClick={() => nav(`/admin/pages/${page.id}`)} className="w-full sm:w-auto">
              رجوع للمحرر
            </Button>
          </div>
        </div>
      </div>

      {/* Storefront frame */}
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <ThemePreview theme={theme}>
        {/* Announcement */}
        {showAnnouncement ? (
          <div className="border-b border-white/10 bg-white/[0.04] px-4 py-2">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 text-xs md:text-sm">
              <span>{announcement?.text}</span>
              {announcement?.href ? (
                <a href={announcement.href} className="underline opacity-90 hover:opacity-100">
                  {announcement.buttonText || "تفاصيل"}
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

                {/* Header */}
        <header className={(headerSticky ? "sticky top-0 z-10 " : "") + "border-b border-white/10 bg-[color:var(--bg)]/95 backdrop-blur"}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
            <div className="flex items-center gap-3">
              {showMenu && (primaryMenu?.items ?? []).length ? (
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] md:hidden"
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  aria-label="Open menu"
                  aria-expanded={mobileMenuOpen}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>
              ) : null}
              <a href="/" className="flex items-center gap-3">
                {settings?.logoUrl ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <img src={settings.logoUrl} className="h-8 w-8 rounded-xl object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-xl bg-white/10" />
                )}
                <div className="text-sm md:text-base font-bold">{siteTitle}</div>
              </a>
            </div>

            <div className={showMenu ? "hidden md:block" : "hidden"}>
              <MenuInline items={primaryMenu?.items ?? []} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {headerCfg.showSearch ? (
                <div className="hidden sm:block">
                  <input
                    placeholder="Search"
                    className="h-10 w-44 rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-sm outline-none focus:ring-2 focus:ring-white/10"
                  />
                </div>
              ) : null}
              {showCta ? (
                <a href={cta?.href || "#"} className="inline-flex h-10 items-center rounded-2xl bg-white px-4 text-sm font-semibold text-black hover:opacity-90">
                  {cta?.label}
                </a>
              ) : null}
            </div>
          </div>
          {showMenu && (primaryMenu?.items ?? []).length ? (
            <div className={mobileMenuOpen ? "md:hidden border-t border-white/10 bg-[color:var(--bg)]/95" : "hidden"}>
              <div className="mx-auto max-w-6xl px-4 py-4">
                <MenuMobile items={primaryMenu?.items ?? []} onNavigate={() => setMobileMenuOpen(false)} />
              </div>
            </div>
          ) : null}
        </header>

        {/* Content */}
        <main className="px-3 py-6 sm:px-4 sm:py-8">
          <div id="cms-preview-root" className="mx-auto max-w-6xl storefront-preview">
            {scopedPreviewCss ? <style>{scopedPreviewCss}</style> : null}
            <PageRenderer sections={contentSections} />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-white/[0.02]">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
            <div>
              <div className="text-sm font-semibold">{footerCfg.about?.title || "عن المتجر"}</div>
              {footerCfg.about?.text ? <div className="mt-3 text-sm opacity-80 whitespace-pre-wrap">{footerCfg.about.text}</div> : null}
            </div>

            <div>
              <div className="text-sm font-semibold">روابط</div>
              <div className="mt-3">
                <MenuFooterColumns items={footerMenu?.items ?? []} />
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold">تواصل</div>
              <div className="mt-3 space-y-2 text-sm opacity-80">
                {settings?.contactEmail ? <div>✉️ {settings.contactEmail}</div> : null}
                {settings?.contactPhone ? <div>📞 {settings.contactPhone}</div> : null}
              </div>

              {Object.keys(social).length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(social)
                    .filter(([, v]) => String(v || "").trim())
                    .map(([k, v]) => (
                      <a key={k} href={String(v)} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs hover:bg-white/10">
                        {k}
                      </a>
                    ))}
                </div>
              ) : null}

              {footerCfg.newsletter?.enabled ? (
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-sm font-semibold">{footerCfg.newsletter?.title || "النشرة البريدية"}</div>
                  <div className="mt-3 flex gap-2">
                    <input
                      placeholder={footerCfg.newsletter?.placeholder || "اكتب بريدك"}
                      className="h-10 flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-sm outline-none focus:ring-2 focus:ring-white/10"
                    />
                    <button className="h-10 rounded-2xl bg-white px-4 text-sm font-semibold text-black hover:opacity-90">
                      {footerCfg.newsletter?.buttonLabel || "اشترك"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-white/10 px-4 py-4">
            <div className="mx-auto max-w-6xl text-xs opacity-70">
              {footerCfg.bottom?.copyright || `© ${new Date().getFullYear()} ${settings?.siteName || "Store"}`}
            </div>
          </div>
        </footer>
        </ThemePreview>
      </div>
    </div>
  );
}



