import type { Metadata } from "next";
import { isLang, type Lang } from "@/lib/i18n";
import { tr } from "@/lib/words";

/**
 * The store's "no internet" page (/<lang>/offline): the app's worker (public/sw.js) keeps it, with its styles, and
 * shows it when a page the shopper hasn't seen before can't be fetched. Plain: it has to work with nothing but
 * what was kept, so its "try again" is a link to the page that failed (the address stays the one asked for).
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OfflinePage(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  const lang: Lang = isLang(params.lang) ? params.lang : "ar";
  return (
    <main id="main-content" data-testid="offline-page" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 20px" }}>
      <div style={{ maxWidth: 460, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.7 }}>
          <path d="M2 8.8a15 15 0 0 1 20 0" />
          <path d="M5 12.6a10 10 0 0 1 14 0" />
          <path d="M8.5 16.3a5 5 0 0 1 7 0" />
          <circle cx="12" cy="20" r="1" />
          <path d="M3 3l18 18" />
        </svg>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{tr(lang, "ما في إنترنت هلّق", "You're offline")}</h1>
        <p style={{ fontSize: 17, lineHeight: 1.7, margin: 0, opacity: 0.8 }}>
          {tr(lang, "الصفحات اللي انفتحت من قبل بتفتح حتى بدون نت. هاي الصفحة بدها اتصال، وبتفتح أول ما يرجع النت.", "Pages opened before still open without a connection. This one needs one, and opens as soon as you're back online.")}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
          <a href="" data-testid="offline-retry" style={{ padding: "12px 22px", borderRadius: 999, background: "var(--color-accent, #a43b64)", color: "#fff", textDecoration: "none", fontWeight: 600 }}>
            {tr(lang, "إعادة المحاولة", "Try again")}
          </a>
          <a href={`/${lang}`} data-testid="offline-home" style={{ padding: "12px 22px", borderRadius: 999, border: "1px solid currentColor", textDecoration: "none", fontWeight: 600 }}>
            {tr(lang, "الصفحة الرئيسية", "Home page")}
          </a>
        </div>
      </div>
    </main>
  );
}
