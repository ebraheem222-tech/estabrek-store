import { getPublicSettings } from "@/lib/api";
import { paramsToSlug } from "@/lib/slug";
import FallbackHome from "@/components/FallbackHome";
import { renderCmsPageBySlug } from "@/cms/renderCmsPage";
import { routeLang, seoAlternates } from "@/lib/seoLang";

export const revalidate = 60;

export async function generateMetadata({ params }: { params?: { slug?: string[]; lang?: string } }) {
  return { alternates: await seoAlternates(paramsToSlug(params), routeLang(params)) };
}
type SP = Record<string, string | string[] | undefined>;
export default async function CmsPageRoute({
  params,
  searchParams,
}: {
  params?: { slug?: string[]; lang?: string };
  searchParams?: SP;
}) {
  const slug = paramsToSlug(params);
  const lang = routeLang(params);
  if (slug === "/") {
    const settings = await getPublicSettings().catch(() => null);
    const storefrontCfg = (settings?.site as any)?.header?.storefront ?? {};
    if (storefrontCfg.cmsOverrideHome === false) {
      return <FallbackHome lang={lang} />;
    }
  }
  return renderCmsPageBySlug(slug, searchParams, { allowFallback: true, allowNotFound: true, lang });
}
