/**
 * The page inside the admin's new editor: the same shop code a customer gets,
 * for one page's draft, opened with the editor's 30-minute ticket (?token=…).
 * Never indexed, never cached, and framed only by the admin (next.config.mjs).
 */
import { notFound } from "next/navigation";
import { getPagePreview } from "@/lib/api";
import { renderCmsPageBySlug } from "@/cms/renderCmsPage";
import { routeLang } from "@/lib/seoLang";
import { studioOrigins } from "@/lib/studioOrigins";
import { StudioBridge } from "@/pageTree/StudioBridge";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

type SP = Record<string, string | string[] | undefined>;

const EMPTY_PLACES =
  ".pt-cell:empty,.pt-stack:empty,.pt-section:empty,.pt-inner:empty,.pt-product360:empty{min-height:96px;outline:1px dashed color-mix(in srgb,var(--accent,#7d2448) 45%,transparent);outline-offset:-1px;background-image:repeating-linear-gradient(135deg,color-mix(in srgb,var(--accent,#7d2448) 7%,transparent) 0 8px,transparent 8px 16px)}";

export default async function StudioFrame({ params, searchParams }: { params?: { lang?: string }; searchParams?: SP }) {
  const token = typeof searchParams?.token === "string" ? searchParams.token : "";
  const lang = routeLang(params);
  const page = token ? await getPagePreview(token, lang) : null;
  if (!page) notFound();
  // The theme gallery's preview (?storeTheme=<id>, "rose" for none): the home's layout follows it here.
  const storeTheme = typeof searchParams?.storeTheme === "string" ? searchParams.storeTheme : undefined;
  const storeThemeMode = searchParams?.themeMode === "light" || searchParams?.themeMode === "dark" ? searchParams.themeMode : null;
  const body = await renderCmsPageBySlug(page.slug || "/", searchParams, { lang, page: Promise.resolve(page), allowFallback: false, allowNotFound: true, storeTheme, storeThemeMode });
  return (
    <>
      {/* The editor only: an empty cell or section keeps a place to drop things into (the shop draws it empty). */}
      <style dangerouslySetInnerHTML={{ __html: EMPTY_PLACES }} />
      {/* The home looks as the home does in the editor (StorefrontChrome reads this). */}
      {(page.slug || "/") === "/" ? <div hidden data-studio-home="" /> : null}
      {body}
      <StudioBridge origins={studioOrigins()} pageId={page.id} lang={lang} />
    </>
  );
}
