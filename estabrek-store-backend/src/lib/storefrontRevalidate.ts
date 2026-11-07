import { env } from "../config/env.js";

export type RevalidatePayload = {
  tags?: string[];
  paths?: string[];
};

export type RevalidationTarget = { origin: string; ok: boolean; status?: number };
export type RevalidationResult = { state: "success" | "failed" | "not_configured"; targets: RevalidationTarget[] };

export async function revalidateStorefront(payload: RevalidatePayload): Promise<RevalidationResult> {
  const urls = [...new Set([env.STOREFRONT_REVALIDATE_URL, ...(env.STOREFRONT_REVALIDATE_URLS ?? [])].filter((v): v is string => Boolean(v)))];
  if (!urls.length) return { state: "not_configured", targets: [] };
  const targets = await Promise.all(urls.map(async (url): Promise<RevalidationTarget> => {
    const origin = new URL(url).origin;
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (env.STOREFRONT_REVALIDATE_SECRET) headers["x-revalidate-secret"] = env.STOREFRONT_REVALIDATE_SECRET;
      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload), redirect: "error", signal: AbortSignal.timeout(3000) });
      // Responses and complete URLs can contain deployment secrets; never retain them.
      await res.body?.cancel();
      return { origin, ok: res.ok, status: res.status };
    } catch {
      return { origin, ok: false };
    }
  }));
  return { state: targets.every((t) => t.ok) ? "success" : "failed", targets };
}
