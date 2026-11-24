import { renderCmsPageBySlug } from "@/cms/renderCmsPage";
import type { PageTree } from "@/pageTree/tree";
import type { Lang } from "@/lib/i18n";
import { headerLinks } from "@/lib/headerLinks";
import { StoreBar } from "./StoreBar";

/**
 * Global documents use the same renderer and the same editable tree as any customer page. A header the owner
 * designed takes the store's own header's place, so the store's bar comes over it with what it doesn't link to
 * already: signing in and a new account while `accounts` are on, and the cart (StoreBar.tsx).
 */
export async function StoreDesignRegion({ tree, region, lang, accounts = false }: { tree: PageTree; region: "header" | "footer"; lang: Lang; accounts?: boolean }) {
  const content = await renderCmsPageBySlug(`/__design/${region}`, {}, {
    lang, allowFallback: false, liveTheme: true,
    page: Promise.resolve({ id: `store-${region}`, name: region, slug: `/__design/${region}`, status: "PUBLISHED", sections: [], format: 2, tree }),
  });
  const has = region === "header" ? headerLinks(tree) : null;
  return (
    <div data-store-design-region={region}>
      {has ? <StoreBar account={accounts && !has.account} cart={!has.cart} /> : null}
      {content}
    </div>
  );
}
