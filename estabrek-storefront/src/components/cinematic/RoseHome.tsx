"use client";
import { useRef, type ReactNode } from "react";
import type { CatalogCategory } from "@/lib/catalog";
import { useLanguage } from "./Language";
import { ScrollExperience } from "./ScrollExperience";
import { DesignStudy } from "./DesignStudy";
import { useGsapMotion } from "@/motion/useGsapMotion";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import {
  RoseHero,
  RoseProductGrid,
  RoseCollections,
  RoseCta,
} from "./RoseSections";

export function RoseHomeFrame({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const root = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={root}
      className="cinematic-home rose-home"
      dir={language === "ar" ? "rtl" : "ltr"}
      lang={language}
    >
      <ScrollExperience root={root} language={language} />
      {children}
    </div>
  );
}
export function RoseFabricStudy() {
  return <DesignStudy language={useLanguage().language} />;
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
}: {
  products: {
    id: string;
    title: string;
    slug: string;
    image: string | null;
    price: number | null;
    category: string;
    colors: string[];
  }[];
  categories: CatalogCategory[];
  currencyCode: string;
}) {
  const entries = products.map((p) => ({
    ...p,
    imageUrl: p.image,
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
      <RoseHero data={{}} categories={categories} />
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
      <RoseCta data={{}} />
    </RoseHomeFrame>
  );
}
