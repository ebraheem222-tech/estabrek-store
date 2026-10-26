import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, LANG_DEFAULTS, isLang, langConfigOf, stripLang, type LangConfig } from "@/lib/i18n";

/**
 * Every page lives under its language (app/[lang]/…), so each language stays a static,
 * cached page. /en/shop and /he/shop are their own addresses (shared links, search
 * engines); a plain /shop is shown in the shopper's last language or the store's main one.
 */

let memo: { at: number; value: Promise<LangConfig> } | null = null;

function apiBase() {
  return (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/v1").replace(/\/$/, "");
}

/** How long the store's languages are kept (a minute live; a second while developing and testing). */
const TTL = process.env.NODE_ENV === "production" ? 60_000 : 1_000;

/** The store's languages (admin → اللغات). */
function languages(): Promise<LangConfig> {
  if (memo && Date.now() - memo.at < TTL) return memo.value;
  const value = fetch(`${apiBase()}/settings`, { headers: { accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => langConfigOf(j?.site?.header))
    .catch(() => LANG_DEFAULTS);
  memo = { at: Date.now(), value };
  return value;
}

const remember = (res: NextResponse, lang: string, had: string | undefined) => {
  if (had !== lang) res.cookies.set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1];
  const had = req.cookies.get(LANG_COOKIE)?.value;
  const cfg = await languages();

  if (isLang(first)) {
    // A language the store doesn't offer: the same page in its main language.
    if (!cfg.enabled.includes(first)) {
      const url = req.nextUrl.clone();
      url.pathname = stripLang(pathname);
      return NextResponse.redirect(url);
    }
    return remember(NextResponse.next(), first, had);
  }

  const lang = isLang(had) && cfg.enabled.includes(had) ? had : cfg.default;
  const url = req.nextUrl.clone();
  url.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Pages only: not the API, Next's own files, or anything with a file extension.
  matcher: ["/((?!api|_next|editorial|fonts|favicon|robots\\.txt|sitemap\\.xml|.*\\.[\\w]+$).*)"],
};
