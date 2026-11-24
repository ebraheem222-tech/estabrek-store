/**
 * What a header the owner designed in the editor links to already (the store's bar adds the rest, StoreBar.tsx).
 * Shared by the server (StoreDesignRegion) and tests: no React here.
 */
/** The links a designed header already has, by where they go (any `href` in its tree). */
export function headerLinks(tree: unknown): { cart: boolean; account: boolean } {
  const out = { cart: false, account: false };
  const seen = new Set<unknown>();
  const walk = (v: unknown, key?: string) => {
    if (!v || typeof v !== "object") {
      if (key === "href" && typeof v === "string") {
        const path = v.trim().replace(/^https?:\/\/[^/]+/i, "").replace(/^\/(ar|en|he)(?=\/|$)/, "");
        if (/^\/cart(?:[/?#]|$)/.test(path)) out.cart = true;
        if (/^\/account(?:[/?#]|$)/.test(path)) out.account = true;
      }
      return;
    }
    if (seen.has(v)) return;
    seen.add(v);
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(x, k);
  };
  walk(tree);
  return out;
}
