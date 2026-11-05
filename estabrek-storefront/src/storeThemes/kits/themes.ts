/**
 * Each ready template's theme (phase 11.3): its style's colours (both modes), its fonts as
 * stacks that cover Latin, Arabic and Hebrew, its corners and its store parts. A store that
 * uses a template wears its theme, and changes it in the theme customizer like any other.
 */
import { TREE_FONTS } from "../../pageTree/fonts";
import { palettesOf } from "../dna/theme";
import { turned } from "../dna/variants";
import type { StoreTheme, ThemeFamily } from "../types";
import { TEMPLATES, templateThemeId, type Template } from ".";
import { t } from "./tree";
import { CATEGORIES } from "./categories";

// A family's name in a font stack: a theme family by its own files' name, a library one by Google's.
const named = (slug: string) => {
  const f = TREE_FONTS.find((x) => x.slug === slug);
  return !f ? slug : f.source === "theme" ? `th-${slug}` : f.name;
};
const FAMILY: Record<string, ThemeFamily> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.family]));

const themeOf = (tpl: Template): StoreTheme => {
  const s = tpl.style;
  return {
    id: templateThemeId(tpl.id),
    name: tpl.name,
    family: FAMILY[tpl.category] ?? "general",
    blurb: tpl.blurb,
    mode: s.seed.mode,
    palettes: palettesOf(s.seed, turned(s.seed)),
    fonts: { display: [...s.fonts.display.map(named), "sans-serif"], text: [...s.fonts.text.map(named), "sans-serif"] },
    round: s.theme.round,
    pill: s.theme.pill,
    shadow: s.theme.shadow,
    hero: s.theme.hero,
    motion: s.theme.motion,
    svg: s.theme.svg,
    card: s.theme.card,
    copy: {
      eyebrow: tpl.name,
      title: tpl.name,
      subtitle: tpl.blurb,
      cta: t("تسوّق|Shop|לקנייה"),
      productsTitle: t("وصل جديد|Just in|הגיע עכשיו"),
      collectionsTitle: t("التصنيفات|Categories|קטגוריות"),
      marquee: [t("توصيل سريع|Fast delivery|משלוח מהיר"), t("تبديل سهل|Easy swaps|החלפה קלה")],
    },
  };
};

export const TEMPLATE_THEMES: StoreTheme[] = TEMPLATES.map(themeOf);
