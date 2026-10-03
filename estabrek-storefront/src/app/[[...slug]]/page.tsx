import { getPublicSettings } from "@/lib/api";
import { paramsToSlug } from "@/lib/slug";
import FallbackHome from "@/components/FallbackHome";
import { renderCmsPageBySlug } from "@/cms/renderCmsPage";

export const revalidate = 60;
type SP = Record<string, string | string[] | undefined>;
export default async function CmsPageRoute({
  params,
  searchParams,
}: {
  params?: { slug?: string[] };
  searchParams?: SP;
}) {
  const slug = paramsToSlug(params);
  if (slug === "/") {
    const settings = await getPublicSettings().catch(() => null);
    const storefrontCfg = (settings?.site as any)?.header?.storefront ?? {};
    if (storefrontCfg.cmsOverrideHome === false) {
      return <FallbackHome />;
    }
  }
  return renderCmsPageBySlug(slug, searchParams, { allowFallback: true, allowNotFound: true });
}
