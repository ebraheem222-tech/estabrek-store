import React from "react";
import { bannerThemes } from "../banner_themes/banner-themes-v2.jsx";
import { categoryThemes } from "../catagory_themes/category-themes-50.jsx";
import { featurePackThemes } from "../feature_pack_themes/feature-pack-themes.jsx";

type ThemeEntry = {
  id?: string | number;
  name?: string;
  category?: string;
  style?: string;
  render?: (...args: any[]) => React.ReactNode;
};

type PackInput = Record<string, any>;
export type ExternalThemeOption = { id: string; name: string; nameAr?: string; category: string };

function normalizeThemeId(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function findTheme(themes: ThemeEntry[], themeId: unknown) {
  const key = normalizeThemeId(themeId);
  if (!key) return null;
  return (
    themes.find((theme) => normalizeThemeId(theme.id) === key || normalizeThemeId(theme.name) === key) ??
    themes.find((theme) => key.endsWith(`-${normalizeThemeId(theme.id)}`)) ??
    null
  );
}

function optionFromTheme(prefix: string, theme: ThemeEntry, fallbackCategory: string): ExternalThemeOption {
  const id = `${prefix}-${theme.id ?? normalizeThemeId(theme.name)}`;
  return {
    id,
    name: theme.name ?? id,
    category: theme.category ?? theme.style ?? fallbackCategory,
  };
}

function categoriesFrom(options: ExternalThemeOption[]) {
  return Array.from(new Set(options.map((option) => option.category).filter(Boolean)));
}

const featurePackOptions = (featurePackThemes as ThemeEntry[]).map((theme) =>
  optionFromTheme("feature-pack", theme, "Feature Pack")
);

export const externalHeroThemes = featurePackOptions.filter((theme) => theme.category === "Hero");
export const externalHeroThemeCategories = categoriesFrom(externalHeroThemes);

export const externalFeatureThemes = featurePackOptions.filter((theme) => theme.category !== "Hero" && theme.category !== "Pricing");
export const externalFeatureThemeCategories = categoriesFrom(externalFeatureThemes);

export const externalPricingThemes = featurePackOptions.filter((theme) => theme.category === "Pricing");
export const externalPricingThemeCategories = categoriesFrom(externalPricingThemes);

export const externalBannerThemes = (bannerThemes as ThemeEntry[]).map((theme) =>
  optionFromTheme("banner-pack", theme, "Banner Pack")
);
export const externalBannerThemeCategories = categoriesFrom(externalBannerThemes);

export const externalCategoryThemes = (categoryThemes as ThemeEntry[]).map((theme) =>
  optionFromTheme("category-pack", theme, "Category Pack")
);
export const externalCategoryThemeCategories = categoriesFrom(externalCategoryThemes);

export function getExternalThemeName(themeId: unknown) {
  const options = [
    ...externalHeroThemes,
    ...externalFeatureThemes,
    ...externalPricingThemes,
    ...externalBannerThemes,
    ...externalCategoryThemes,
  ];
  return options.find((option) => normalizeThemeId(option.id) === normalizeThemeId(themeId))?.name ?? String(themeId ?? "");
}

function asList(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.length ? value : fallback;
}

export function buildFeaturePackInputFromHeroData(data: PackInput = {}) {
  return {
    title: data.title ?? data.heading ?? data.headline,
    subtitle: data.subtitle ?? data.description ?? data.text,
    badge: data.badge ?? data.eyebrow,
    cta: data.cta ?? data.primaryText ?? data.buttonText,
    cta2: data.cta2 ?? data.secondaryText,
    image: data.image ?? data.imageUrl,
    features: asList(data.features ?? data.items, ["New arrivals", "Premium quality", "Fast delivery"]),
  };
}

export function buildFeaturePackInputFromBannerData(data: PackInput = {}) {
  return buildFeaturePackInputFromHeroData(data);
}

export function buildFeaturePackInputFromFeaturesData(data: PackInput = {}) {
  return {
    title: data.title ?? "Features",
    subtitle: data.subtitle ?? data.description,
    features: asList(data.features ?? data.items, ["Quality", "Comfort", "Style"]),
  };
}

export function buildFeaturePackInputFromPricingData(data: PackInput = {}) {
  return {
    title: data.title ?? "Pricing",
    subtitle: data.subtitle ?? data.description,
    plans: data.plans ?? data.items,
    features: data.features,
  };
}

export function buildBannerPackInputFromBannerData(data: PackInput = {}) {
  return {
    title: data.title ?? data.heading ?? "Banner",
    subtitle: data.subtitle ?? data.description ?? data.text ?? "",
    image: data.image ?? data.imageUrl,
    cta: data.cta ?? data.buttonText,
  };
}

export function renderFeaturePackTheme(themeId: unknown, input: PackInput = {}) {
  const theme = findTheme(featurePackThemes as ThemeEntry[], themeId);
  return theme?.render ? theme.render(input) : null;
}

export function renderBannerPackTheme(themeId: unknown, input: PackInput = {}) {
  const theme = findTheme(bannerThemes as ThemeEntry[], themeId);
  return theme?.render ? theme.render(input.title, input.subtitle, input) : null;
}

export function renderCategoryPackTheme(themeId: unknown, input: PackInput = {}) {
  const theme = findTheme(categoryThemes as ThemeEntry[], themeId);
  return theme?.render ? theme.render(input.selectedCategory ?? input.value ?? "", input.onSelect ?? (() => undefined), input) : null;
}
