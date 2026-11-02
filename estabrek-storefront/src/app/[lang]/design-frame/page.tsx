/**
 * A ready template's page (?template=<id>) or a design kit's (?kit=<kind>) inside the admin's
 * gallery (storeThemes/kits): the same shop code a customer gets, drawing it in its theme,
 * which the address names too so the layout paints it (&storeTheme=<id>&themeMode=light|dark).
 * Never indexed or cached, framed only by the admin (next.config.mjs); it shows the
 * template's own pictures, words and sample products, none of the store's.
 */
import { notFound } from "next/navigation";
import { renderCmsPageBySlug } from "@/cms/renderCmsPage";
import { routeLang } from "@/lib/seoLang";
import type { StorefrontPage } from "@/lib/types";
import { KIT_PAGES, kitPage, templatePage, templateThemeId, type KitPage } from "@/storeThemes/kits";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function DesignFrame({ params, searchParams }: { params?: { lang?: string }; searchParams?: SP }) {
  const lang = routeLang(params);
  const template = one(searchParams?.template);
  const kind = template ?? one(searchParams?.kit) ?? "";
  const which = (one(searchParams?.page) ?? "home") as KitPage;
  const known = (KIT_PAGES as readonly string[]).includes(which);
  const sections = !known ? null : template ? templatePage(template, which, true) : kitPage(kind, which, true);
  if (!sections) notFound();
  const mode = one(searchParams?.themeMode);
  const page: StorefrontPage = {
    id: `kit-${kind}-${which}`,
    name: kind,
    slug: "/design-frame",
    status: "PUBLISHED",
    sections: [],
    format: 2,
    tree: { version: 1, root: { id: "root", type: "page", props: {}, children: sections } },
  };
  return renderCmsPageBySlug("/design-frame", searchParams, {
    lang,
    page: Promise.resolve(page),
    allowFallback: false,
    allowNotFound: true,
    storeTheme: one(searchParams?.storeTheme) ?? (template ? templateThemeId(template) : kind),
    storeThemeMode: mode === "light" || mode === "dark" ? mode : null,
  });
}
