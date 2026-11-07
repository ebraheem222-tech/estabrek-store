import { env } from "../config/env.js";
import { publicationState, type PublicationPage } from "./pagePublication.js";

export type PublicPageProbeTarget = { origin: string; url: string; state: "shown" | "not_found" | "different_page" | "unavailable"; status?: number };
export type PublicPageProbe = { state: "shown" | "pending" | "not_public" | "not_configured"; checkedAt: string; targets: PublicPageProbeTarget[] };

function safeSlug(slug: string) {
  if (!slug.startsWith("/") || slug.startsWith("//") || /[\\?#]/.test(slug)) return false;
  try { return slug.split("/").every((part) => { const plain = decodeURIComponent(part); return plain !== "." && plain !== ".." && !/[\/\\?#]/.test(plain); }); } catch { return false; }
}

/** Read-only verification against server-configured origins, never a user-supplied destination. */
export async function probePublicPage(page: PublicationPage & { id: string }, locale: "ar" | "en" | "he"): Promise<PublicPageProbe> {
  const checkedAt = new Date().toISOString();
  if (!publicationState(page).public) return { state: "not_public", checkedAt, targets: [] };
  if (!safeSlug(page.slug) || !/^[A-Za-z0-9_-]{1,100}$/.test(page.id)) return { state: "pending", checkedAt, targets: [] };
  const origins = [...new Set([env.STOREFRONT_URL, env.STOREFRONT_REVALIDATE_URL, ...(env.STOREFRONT_REVALIDATE_URLS ?? [])].filter((url): url is string => Boolean(url)).map((url) => new URL(url).origin))];
  if (!origins.length) return { state: "not_configured", checkedAt, targets: [] };
  const targets = await Promise.all(origins.map(async (origin): Promise<PublicPageProbeTarget> => {
    const url = new URL(origin); url.pathname = `/${locale}${page.slug === "/" ? "" : page.slug}`;
    const base = { origin, url: url.toString() };
    try {
      const response = await fetch(url, { headers: { accept: "text/html" }, redirect: "error", signal: AbortSignal.timeout(5000) });
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
        await response.body?.cancel();
        return { ...base, status: response.status, state: response.status === 404 ? "not_found" : "unavailable" };
      }
      const reader = response.body?.getReader();
      if (!reader) return { ...base, status: response.status, state: "unavailable" };
      const decoder = new TextDecoder(); let text = "", bytes = 0;
      try {
        for (;;) {
          const value = await reader.read(); if (value.done) break;
          bytes += value.value.byteLength;
          if (bytes > 2 * 1024 * 1024) return { ...base, status: response.status, state: "unavailable" };
          text += decoder.decode(value.value, { stream: true });
          if (text.includes(`data-cms-page-id="${page.id}"`)) return { ...base, status: response.status, state: "shown" };
        }
        return { ...base, status: response.status, state: "different_page" };
      } finally { await reader.cancel().catch(() => undefined); }
    } catch { return { ...base, state: "unavailable" }; }
  }));
  return { state: targets.every((target) => target.state === "shown") ? "shown" : "pending", checkedAt, targets };
}
