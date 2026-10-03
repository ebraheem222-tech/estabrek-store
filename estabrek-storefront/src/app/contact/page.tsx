import { getPublicSettings } from "@/lib/api";
import FallbackContact from "@/components/FallbackContact";
import { renderCmsPageBySlug } from "@/cms/renderCmsPage";

type SP = Record<string, string | string[] | undefined>;

export default async function ContactPage({ searchParams }: { searchParams?: SP }) {
  const settings = await getPublicSettings().catch(() => null);
  const storefrontCfg = (settings?.site as any)?.header?.storefront ?? {};
  if (storefrontCfg.cmsOverrideContact !== false) {
    const cms = await renderCmsPageBySlug("/contact", searchParams, { allowFallback: false, allowNotFound: false });
    if (cms) return <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8">{cms}</main>;
  }
  return (
    <main id="main-content" tabIndex={-1}>
      <FallbackContact />
    </main>
  );
}
