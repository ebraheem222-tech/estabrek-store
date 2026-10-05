import { getPublicSettings, getPageBySlug } from "@/lib/api";
import FallbackContact from "@/components/FallbackContact";
import { renderCmsPageBySlug } from "@/cms/renderCmsPage";
import { RoseContact } from "@/components/cinematic/RoseContact";
import { RosePageFrame } from "@/components/cinematic/RosePageFrame";

type SP = Record<string, string | string[] | undefined>;

export default async function ContactPage({ searchParams }: { searchParams?: SP }) {
  // Look up the CMS page alongside the settings instead of after them (one wait, not two).
  void getPageBySlug("/contact");
  const settings = await getPublicSettings().catch(() => null);
  const storefrontCfg = (settings?.site as any)?.header?.storefront ?? {};
  if (storefrontCfg.cmsOverrideContact !== false) {
    const cms = await renderCmsPageBySlug("/contact", searchParams, { allowFallback: false, allowNotFound: false });
    if (cms) return <main id="main-content" tabIndex={-1} className={process.env.ESTABREK_HOME_MODE === "cms" ? "mx-auto max-w-6xl px-4 py-8" : undefined}>{cms}</main>;
  }
  return (
    <main id="main-content" tabIndex={-1}>
      {process.env.ESTABREK_HOME_MODE === "cms" ? <FallbackContact /> : <RosePageFrame><RoseContact /></RosePageFrame>}
    </main>
  );
}
