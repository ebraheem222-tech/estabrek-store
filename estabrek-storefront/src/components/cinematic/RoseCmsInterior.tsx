import type { ReactNode } from "react";
import type { CmsSection, ProductMini } from "@/cms/types";
import { CmsPageRenderer } from "@/cms";
import { RosePageFrame } from "./RosePageFrame";
import { RoseNativeSections } from "./RoseHome";
import { RoseContact } from "./RoseContact";
import { RoseAboutHero } from "./RoseAbout";
import { RoseCta } from "./RoseSections";
import { sectionPalette } from "./roseDesign";

const plain = (html?: string) => String(html ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
/** A rich-text section that only holds a short title (e.g. the old «تواصل معنا» banner). */
function isTitleBanner(s: CmsSection) {
  const d = (s.data ?? {}) as any;
  if (s.type !== "RICH_TEXT" || d.components?.length || d.slides?.length) return false;
  const text = plain(d.html) || String(d.title ?? "").trim();
  return text.length > 0 && text.length <= 40 && !/[.!؟?]\s*\S/.test(text);
}

export function RoseCmsInterior({ sections, kind, productLookup, renderQuickAdd, renderProductCard }: {
  sections: CmsSection[]; kind: "contact" | "about" | "shop";
  productLookup: Record<string, ProductMini>;
  renderQuickAdd: (ref: { productId?: string; slug?: string }) => ReactNode;
  renderProductCard: (id: string) => ReactNode;
}) {
  const visible = sections.filter(s => s.isVisible !== false).slice().sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
  // On the contact page a title-only banner becomes the rose heading of the contact section instead.
  const hasRoseContact = kind === "contact" && visible.some(s => s.type === "CONTACT" && !(s.data as any)?.themeId && !(s.data as any)?.form?.action);
  const banners = hasRoseContact ? visible.filter(isTitleBanner) : [];
  const heading = banners.length ? plain((banners[0].data as any)?.html) || String((banners[0].data as any)?.title ?? "") : undefined;
  return <RosePageFrame className={`rose-cms-interior ${kind === "contact" ? "rose-contact-page" : `rose-${kind}`}`}>
    {visible.filter(s => !banners.includes(s)).map(s => {
      const d = s.data as any || {};
      const composed = d.components?.length || d.slides?.length || d.splitMode || d.tripleMode || (d.layout?.mode && d.layout.mode !== "stack");
      let node: ReactNode;
      const adapted = !composed && ((s.type === "CONTACT" && !d.themeId && !d.form?.action) || (kind === "about" && s.type === "HERO") || s.type === "CTA");
      if (!composed && s.type === "CONTACT" && !d.themeId && !d.form?.action) node = <RoseContact data={d} heading={heading} />;
      else if (!composed && kind === "about" && s.type === "HERO") node = <RoseAboutHero data={d} />;
      else if (!composed && s.type === "CTA") node = <RoseCta data={d} />;
      else node = <RoseNativeSections><CmsPageRenderer sections={[s]} productLookup={productLookup} renderQuickAdd={renderQuickAdd} renderProductCard={renderProductCard} /></RoseNativeSections>;
      return <div key={s.id} id={adapted ? s.anchorId || undefined : undefined} aria-label={adapted ? s.ariaLabel || undefined : undefined} data-cms-section={s.id} data-rose-palette={sectionPalette(s.type, d.rosePresentation)} data-rose-explicit={d.rosePresentation?.palette || undefined} data-rose-intensity={d.rosePresentation?.motionIntensity || "cinematic"}>{node}</div>;
    })}
  </RosePageFrame>;
}
