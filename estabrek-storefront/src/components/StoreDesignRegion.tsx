import { renderCmsPageBySlug } from "@/cms/renderCmsPage";
import type { PageTree } from "@/pageTree/tree";
import type { Lang } from "@/lib/i18n";

/** Global documents use the same renderer and the same editable tree as any customer page. */
export async function StoreDesignRegion({ tree, region, lang }: { tree: PageTree; region: "header" | "footer"; lang: Lang }) {
  const content = await renderCmsPageBySlug(`/__design/${region}`, {}, {
    lang, allowFallback: false, liveTheme: true,
    page: Promise.resolve({ id: `store-${region}`, name: region, slug: `/__design/${region}`, status: "PUBLISHED", sections: [], format: 2, tree }),
  });
  return <div data-store-design-region={region}>{content}</div>;
}
