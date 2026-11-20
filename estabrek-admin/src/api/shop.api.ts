// The store's own shop (backend lib/shopLink.ts, /v1/admin/settings/shop): where it is, and, for a store
// with no shop of its own, made on Vercel from the setup's first step with the owner's token (used for
// those calls alone, never kept).
import { api } from "./http";
import { env } from "../config/env";

export type ShopLink = {
  url: string | null;
  /** "made" here (the setup), the server's own "server" variable, or "none". */
  source: "made" | "server" | "none";
  /** A making that stopped (its name), to go on with. */
  making: string | null;
  /** What a shop made here is built from. */
  repo: string | null;
  branch: string;
};

const BASE = "/admin/settings/shop";
export async function getShopLink() {
  return (await api.get(BASE)).data as ShopLink;
}
/** The shop made (its first deploy takes a few minutes); this admin's own address goes with it, as the page's origin. */
export async function makeShopLink(body: { token: string; team?: string; site: string }) {
  return (await api.post(`${BASE}/make`, body)).data as ShopLink & { project: string | null };
}

/**
 * The admin follows a shop made from its own setup: its links, previews and designs come from that
 * shop rather than the address it was built with (a copy built before it had a shop of its own
 * points at another store's). A shop given by the server's own variables leaves the built one as it is.
 */
export function followShop(link: ShopLink | null | undefined) {
  if (link?.source === "made" && link.url && /^https:\/\//.test(link.url)) env.VITE_STOREFRONT_BASE_URL = link.url.replace(/\/+$/, "");
}

/** Whether the shop opens its designs to this admin (what the setup's next steps read from it). */
export async function shopOpensHere(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${new URL(url).origin}/api/templates`, { credentials: "omit" });
    return res.ok;
  } catch {
    return false;
  }
}
