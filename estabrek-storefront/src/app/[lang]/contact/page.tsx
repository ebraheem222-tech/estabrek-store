import { getPublicSettings, getPageBySlug } from "@/lib/api";
import { bleedTree } from "@/pageTree/tree";
import FallbackContact from "@/components/FallbackContact";
import { renderCmsPageBySlug } from "@/cms/renderCmsPage";
import { RoseContact } from "@/components/cinematic/RoseContact";
import { RosePageFrame } from "@/components/cinematic/RosePageFrame";
import { routeLang } from "@/lib/seoLang";

type SP = Record<string, string | string[] | undefined>;

export default async function ContactPage(props: { params: Promise<{ lang: string }>; searchParams?: Promise<SP> }) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const lang = routeLang(params);
  // Look up the CMS page alongside the settings instead of after them (one wait, not two).
  void getPageBySlug("/contact", lang);
  const settings = await getPublicSettings().catch(() => null);
  const storefrontCfg = (settings?.site as any)?.header?.storefront ?? {};
  if (storefrontCfg.cmsOverrideContact !== false) {
    const cms = await renderCmsPageBySlug("/contact", searchParams, { allowFallback: false, allowNotFound: false, lang });
    // A page whose sections spread their ground over the whole screen (a premium theme's) drops the side margins.
    const wide = bleedTree(((await getPageBySlug("/contact", lang)) as { tree?: unknown } | null)?.tree);
    if (cms) return <main id="main-content" tabIndex={-1} className={wide ? "cms-page-wide w-full" : process.env.ESTABREK_HOME_MODE === "cms" ? "mx-auto max-w-6xl px-4 py-8" : undefined} data-page-wide={wide ? "" : undefined}>{cms}</main>;
  }
  return (
    <main id="main-content" tabIndex={-1}>
      {process.env.ESTABREK_HOME_MODE === "cms" ? <FallbackContact /> : <RosePageFrame><RoseContact /></RosePageFrame>}
    </main>
  );
}
