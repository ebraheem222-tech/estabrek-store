import { env } from "../config/env.js";

type RevalidatePayload = {
  tags?: string[];
  paths?: string[];
};

export async function revalidateStorefront(payload: RevalidatePayload) {
  const url = env.STOREFRONT_REVALIDATE_URL;
  if (!url) return false;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (env.STOREFRONT_REVALIDATE_SECRET) {
      headers["x-revalidate-secret"] = env.STOREFRONT_REVALIDATE_SECRET;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload ?? {}),
    });

    return res.ok;
  } catch {
    return false;
  }
}
