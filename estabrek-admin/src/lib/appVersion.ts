/**
 * Is a newer admin out than the one this tab runs? Each build loads its main script
 * by a name of its own (/assets/index-<hash>.js); after a deploy the server's page
 * names another one. A tab left open across a deploy keeps running the old admin
 * until it's reloaded, so it's told (components/NewVersionNotice).
 */
const MAIN_SCRIPT = /\/assets\/index-[\w-]+\.js/;

/** The main script a page of the admin names (null when there's none, e.g. the dev server). */
export function mainScriptOf(html: string): string | null {
  const m = /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["']/i.exec(html) ?? /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*\btype=["']module["']/i.exec(html);
  const src = m?.[1] ?? "";
  return MAIN_SCRIPT.test(src) ? (MAIN_SCRIPT.exec(src)?.[0] ?? null) : null;
}

/** The main script this tab was loaded with. */
export function loadedScript(doc: Document = document): string | null {
  for (const s of Array.from(doc.querySelectorAll<HTMLScriptElement>("script[type=module][src]"))) {
    const m = MAIN_SCRIPT.exec(s.getAttribute("src") ?? "");
    if (m) return m[0];
  }
  return null;
}

/** The main script the server's page names now (null when it can't be read). */
export async function latestScript(fetcher: typeof fetch = fetch, origin = window.location.origin): Promise<string | null> {
  try {
    const res = await fetcher(`${origin}/?v=${Date.now()}`, { cache: "no-store", credentials: "omit" });
    if (!res.ok) return null;
    return mainScriptOf(await res.text());
  } catch {
    return null; // offline, or the server is busy: ask again later
  }
}
