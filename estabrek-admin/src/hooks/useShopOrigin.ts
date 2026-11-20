// The store's own shop, for the frames that show it (the page editor, the themes page). A store whose shop was made
// from its setup (backend lib/shopLink.ts) has it at another address than the one this admin was built with, which
// is another store's shop (a client's copy built before it had one), and that shop refuses to be shown in this admin
// (its frame-ancestors name its own admin). The admin's frame follows the made shop (AdminLayout), but the editor
// opens full screen, outside it, and framed the other store's shop: an empty page with a broken-page sign.
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { env } from "../config/env";
import { followShop, getShopLink, type ShopLink } from "../api/shop.api";

/** The shop's origin for this link: a shop made from the setup, else the address this admin was built with. */
export function shopOriginOf(link: ShopLink | null | undefined): string {
  const made = link?.source === "made" && link.url && /^https:\/\//.test(link.url) ? link.url : null;
  try {
    return new URL(made ?? env.VITE_STOREFRONT_BASE_URL).origin;
  } catch {
    return "";
  }
}

/**
 * The store's own shop's origin, and whether it is known yet: a frame waits for it (`known`) rather than opening
 * another store's shop; meanwhile `origin` is the built address, for what needs one at once (messages to a frame
 * not yet there, a picture's whole address). A server that doesn't say (an older one, or a member who may not read
 * the settings) leaves the built address.
 */
export function useShopOrigin(): { origin: string; known: boolean } {
  const link = useQuery({ queryKey: ["shop-link"], queryFn: getShopLink, retry: false, staleTime: 300_000 });
  useEffect(() => followShop(link.data), [link.data]);
  return { origin: shopOriginOf(link.isPending ? null : link.data), known: !link.isPending };
}
