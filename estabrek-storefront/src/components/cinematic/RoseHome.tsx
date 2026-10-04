"use client";
import { useRef, type ReactNode } from "react";
import type { CatalogCategory } from "@/lib/catalog";
import { useLanguage } from "./Language";
import { RosePageFrame } from "./RosePageFrame";
import { DesignStudy } from "./DesignStudy";
import { useGsapMotion } from "@/motion/useGsapMotion";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import {
  RoseHero,
  RoseProductGrid,
  RoseCollections,
  RoseCta,
  RoseInstagram,
} from "./RoseSections";
import { RoseSeasons } from "./RoseSeasons";
import { RoseCollectionStory } from "./RoseCollectionStory";
import type { StoryChapter } from "@/lib/collectionStories";
import type { SeasonEdit } from "@/lib/seasonalEdits";
import type { ProductBadge } from "@/lib/productBadges";

export function RoseHomeFrame({ children }: { children: ReactNode }) {
  return <RosePageFrame home>{children}</RosePageFrame>;
}
export function RoseFabricStudy({ words }: { words?: string[] }) {
  return <DesignStudy language={useLanguage().language} words={words} />;
}
export function RoseNativeSections({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const settings = useStorefrontSettings();
  const { language } = useLanguage();
  useGsapMotion(root, settings.scrollAnimationsEnabled, language);
  return (
    <div ref={root} className="rose-native-sections atelier-section">
      {children}
    </div>
  );
}
export function RoseHome({
  products,
  categories,
  currencyCode,
  seasons = [],
  stories = [],
}: {
  products: {
    id: string;
    title: string;
    slug: string;
    image: string | null;
    secondaryImage?: string | null;
    badge?: ProductBadge | null;
    price: number | null;
    category: string;
    colors: string[];
  }[];
  categories: CatalogCategory[];
  currencyCode: string;
  seasons?: SeasonEdit[];
  stories?: StoryChapter[];
}) {
  const entries = products.map((p) => ({
    ...p,
    imageUrl: p.image,
    secondaryImageUrl: p.secondaryImage ?? null,
    priceText:
      p.price === null
        ? ""
        : new Intl.NumberFormat("ar", {
            style: "currency",
            currency: currencyCode,
          }).format(p.price),
  }));
  return (
    <RoseHomeFrame>
      <div data-rose-palette="blush"><RoseHero data={{}} categories={categories} /></div>
      {seasons.length > 0 && <RoseSeasons seasons={seasons} />}
      <RoseProductGrid products={entries} categories={categories} />
      <RoseFabricStudy />
      <RoseCollections
        items={[
          {
            label: "فساتين وأطقم",
            href: categories.find((c) => /dress|hijabi/.test(c.slug))
              ? `/c/${categories.find((c) => /dress|hijabi/.test(c.slug))!.slug}`
              : "/shop",
            imageUrl: "/editorial/hijab-campaign.webp",
          },
          {
            label: "حجاب وتفاصيل",
            href: categories.find((c) => /hijab|accessor/.test(c.slug))
              ? `/c/${categories.find((c) => /hijab|accessor/.test(c.slug))!.slug}`
              : "/shop",
            imageUrl: "/editorial/scarves.webp",
          },
        ]}
      />
      {stories.length > 0 && <RoseCollectionStory chapters={stories} />}
      <RoseInstagram images={entries.map((p) => p.imageUrl).filter((u): u is string => Boolean(u))} />
      <RoseCta data={{}} />
    </RoseHomeFrame>
  );
}
