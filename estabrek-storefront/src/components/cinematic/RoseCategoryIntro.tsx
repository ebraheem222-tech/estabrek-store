"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";
import { useRoseTheme } from "./RoseThemeProvider";
import { collectionSeed } from "@/lib/collectionTheme";
import { storefrontPalette } from "@/lib/storefrontPalette";
import { tweenTheme } from "@/lib/themeTween";
import { roseOutfit } from "@/lib/roseEvents";

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
}: {
  name: string;
  slug: string;
  total: number;
  imageUrl?: string | null;
  crumbs: Crumb[];
}) {
  const ar = useLanguage().language === "ar";
  const theme = useRoseTheme();

  useEffect(() => {
    const shell = theme?.root.current;
    if (!shell || shell.dataset.storefrontColor) return;
    const seed = collectionSeed({ label: name, href: `/c/${slug}` }, 0);
    shell.dataset.navbarColor = seed;
    tweenTheme(shell, storefrontPalette(seed), { duration: 0.8 });
  }, [theme, name, slug]);

  // Rose changes into the outfit of this collection.
  useEffect(() => {
    const t = window.setTimeout(() => roseOutfit(`${slug} ${name}`), 900);
    return () => window.clearTimeout(t);
  }, [slug, name]);

  const count = ar
    ? total === 1 ? "قطعة واحدة" : total === 2 ? "قطعتان" : total <= 10 ? `${total} قطع` : `${total} قطعة`
    : `${total} piece${total === 1 ? "" : "s"}`;

  return (
    <section className="rose-shop-intro rose-category-intro" data-rose-palette="pearl">
      <div data-reveal>
        <nav className="rose-crumbs" aria-label={ar ? "مسار التصفح" : "Breadcrumb"}>
          {crumbs.map((c, i) => (
            <span key={c.href}>
              {i < crumbs.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              {i < crumbs.length - 1 && <span aria-hidden="true" className="crumb-sep">/</span>}
            </span>
          ))}
        </nav>
        <span className="atelier-eyebrow">{ar ? "مجموعة" : "COLLECTION"}</span>
        <h1>
          {name}
          <span>{ar ? "مختارة لكِ بحب." : "Chosen for you, with love."}</span>
        </h1>
        <p>
          {ar
            ? `${count} في هذه المجموعة. اختاري اللون والمقاس، وأضيفي ما تحبين إلى حقيبتكِ.`
            : `${count} in this collection. Pick your colour and size, and add what you love to your bag.`}
        </p>
        <a href="#shop-products" className="atelier-text-link">
          {ar ? "تصفّحي القطع" : "Browse the pieces"}
          <Icon name="down" />
        </a>
      </div>
      <div className="rose-shop-intro-image" data-reveal>
        <Image
          src={imageUrl || "/editorial/scarves.webp"}
          alt={name}
          fill
          priority
          sizes="(max-width:760px) 100vw, 45vw"
        />
        <span dir="ltr">THE ESTABREK EDIT / {slug.replace(/^-+/, "").toUpperCase()}</span>
      </div>
    </section>
  );
}
