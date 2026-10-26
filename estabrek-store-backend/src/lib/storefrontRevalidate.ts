import { env } from "../config/env.js";

type RevalidatePayload = {
  tags?: string[];
  paths?: string[];
};

export async function revalidateStorefront(payload: RevalidatePayload) {
  const url = env.STOREFRONT_REVALIDATE_URL;
  if (!url) return;

  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (env.STOREFRONT_REVALIDATE_SECRET) {
      headers["x-revalidate-secret"] = env.STOREFRONT_REVALIDATE_SECRET;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[storefront-revalidate] failed:", res.status, body);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[storefront-revalidate] error:", message);
  }
}
