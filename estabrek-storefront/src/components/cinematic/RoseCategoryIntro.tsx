"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";
import { useRoseTheme } from "./RoseThemeProvider";
import { collectionSeed } from "@/lib/collectionTheme";
import { storefrontPalette } from "@/lib/storefrontPalette";
import { tweenTheme } from "@/lib/themeTween";
import { roseOutfit } from "@/lib/roseEvents";
import { useStoreIdentity } from "@/store/storeIdentity";
import { markOf } from "@/lib/storeIdentity";
import { tr } from "@/lib/words";
import { useStoreLook } from "@/store/storeLook";
import { ThemeIntro } from "@/storeThemes/inner/ThemeIntro";
import { modelFor } from "@/storeThemes/inner/modelFor";
import { RoseShopRing, type RingPiece } from "./RoseShopRing";

type Crumb = { label: string; href: string };

/**
 * Rose header for /c/[slug]: the category name in the campaign type, its
 * place in the catalogue, the number of pieces, and a photo from the
 * category. The page takes on the same colour the collection shows on hover
 * on the homepage, unless the shopper has picked her own colour.
 */
export function RoseCategoryIntro({
  name,
  slug,
  total,
  imageUrl,
  crumbs,
  showcase = [],
}: {
  name: string;
  slug: string;
  total: number;
  imageUrl?: string | null;
  crumbs: Crumb[];
  /** The category's pieces for the opening's 3D ring (three or more: the arch and the ring). */
  showcase?: RingPiece[];
}) {
  const { language: lang } = useLanguage();
  const ar = lang === "ar";
  const id = useStoreIdentity();
  const theme = useRoseTheme();
  const look = useStoreLook();

  // The collection's own colour. A colour the shopper picked wins. Where the store lets colours dress the
  // whole store (the default), the page, the bar and the header take it; where it keeps them to the product
  // area (data-color-scope="product", app/rose-inner.css), only the category's opening does.
  const intro = useRef<HTMLElement>(null);
  useEffect(() => {
    const shell = theme?.root.current;
    const own = intro.current;
    if (!shell || !own || shell.dataset.storefrontColor || look.theme) return;
    const seed = collectionSeed({ label: name, href: `/c/${slug}` }, 0);
    if (shell.dataset.colorScope === "product") {
      tweenTheme(own, storefrontPalette(seed), { duration: 0.8 });
      return;
    }
    shell.dataset.navbarColor = seed;
    tweenTheme(shell, storefrontPalette(seed), { duration: 0.8 });
  }, [theme, name, slug, look.theme]);

  // Rose changes into the outfit of this collection.
  useEffect(() => {
    const t = window.setTimeout(() => roseOutfit(`${slug} ${name}`), 900);
    return () => window.clearTimeout(t);
  }, [slug, name]);

  const count = ar
    ? total === 1 ? "قطعة واحدة" : total === 2 ? "قطعتان" : total <= 10 ? `${total} قطع` : `${total} قطعة`
    : `${total} piece${total === 1 ? "" : "s"}`;

  // A store with a theme: the category in its opening, with the model that fits the category.
  if (look.theme) {
    return (
      <ThemeIntro
        crumbs={crumbs}
        eyebrow={tr(lang, `${total} منتج`, "{0} products", [total])}
        title={name}
        cta={{ label: tr(lang, "تصفّح المنتجات", "Browse the products"), href: "#shop-products" }}
        model={modelFor(look.theme, look.industry, `${name} ${slug}`)}
      />
    );
  }
  return (
    <section ref={intro} className={`rose-shop-intro rose-category-intro${showcase.length >= 3 ? " rose-shop-stage" : ""}`} data-rose-palette="pearl">
      <div data-reveal>
        <nav className="rose-crumbs" aria-label={tr(lang, "مسار التصفح", "Breadcrumb")}>
          {crumbs.map((c, i) => (
            <span key={c.href}>
              {i < crumbs.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              {i < crumbs.length - 1 && <span aria-hidden="true" className="crumb-sep">/</span>}
            </span>
          ))}
        </nav>
        <span className="atelier-eyebrow">{tr(lang, "مجموعة", "COLLECTION")}</span>
        <h1>
          {name}
          <span>{tr(lang, "مختارة لكِ بحب.", "Chosen for you, with love.")}</span>
        </h1>
        <p>
          {tr(lang, `${count} في هذه المجموعة. اختاري اللون والمقاس، وأضيفي ما تحبين إلى حقيبتكِ.`, "{0} in this collection. Pick your colour and size, and add what you love to your bag.", [count])}
        </p>
        <a href="#shop-products" className="atelier-text-link">
          {tr(lang, "تصفّحي القطع", "Browse the pieces")}
          <Icon name="down" />
        </a>
      </div>
      {showcase.length >= 3 ? <div className="rose-stage-visual">
        {/* The category's first photo in the arch, its pieces turning around it (as on the shop). */}
        <div className="rose-stage-arch rose-stage-photo">
          <Image src={imageUrl || "/editorial/scarves.webp"} alt={name} fill priority sizes="(max-width:760px) 60vw, 26vw" />
        </div>
        <svg className="rose-stage-line" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true"><path pathLength={1} d="M2 138V50A48 48 0 0 1 98 50V138" /></svg>
        <RoseShopRing pieces={showcase} label={tr(lang, "قطع من المتجر، اسحبي لتلفّيها", "Pieces from the shop: drag to turn them")} />
      </div> : imageUrl || look.modest ? <div className="rose-shop-intro-image" data-reveal>
        <Image
          src={imageUrl || "/editorial/scarves.webp"}
          alt={name}
          fill
          priority
          sizes="(max-width:760px) 100vw, 45vw"
        />
        <span dir="ltr">THE {markOf(id, "en").toUpperCase()} EDIT / {slug.replace(/^-+/, "").toUpperCase()}</span>
      </div> : null}
    </section>
  );
}
