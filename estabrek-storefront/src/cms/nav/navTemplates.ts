import { MINIMAL_NAV } from "./templates/minimal";
import { GLASS_NAV } from "./templates/glass";
import { GRADIENT_NAV } from "./templates/gradient";
import { NEON_NAV } from "./templates/neon";
import { LUXURY_NAV } from "./templates/luxury";
import { GAMING_NAV } from "./templates/gaming";
import { CORPORATE_NAV } from "./templates/corporate";
import { ECOMMERCE_NAV } from "./templates/ecommerce";
import { SIDEBAR_NAV } from "./templates/sidebar";
import type { NavTemplate } from "./types";

export type { NavTemplate };

export {
  MINIMAL_NAV,
  GLASS_NAV,
  GRADIENT_NAV,
  NEON_NAV,
  LUXURY_NAV,
  GAMING_NAV,
  CORPORATE_NAV,
  ECOMMERCE_NAV,
  SIDEBAR_NAV,
};

export const ALL_NAV_TEMPLATES: NavTemplate[] = [
  ...MINIMAL_NAV,
  ...GLASS_NAV,
  ...GRADIENT_NAV,
  ...NEON_NAV,
  ...LUXURY_NAV,
  ...GAMING_NAV,
  ...CORPORATE_NAV,
  ...ECOMMERCE_NAV,
  ...SIDEBAR_NAV,
];

export function getNavTemplateById(id: string): NavTemplate | undefined {
  return ALL_NAV_TEMPLATES.find((n) => n.id === id);
}

export function getNavTemplatesByCategory(category: string): NavTemplate[] {
  return ALL_NAV_TEMPLATES.filter((n) => n.category === category);
}

export function getAllNavCategories(): string[] {
  return [...new Set(ALL_NAV_TEMPLATES.map((n) => n.category))];
}

export const NAV_CATEGORY_LABELS_AR: Record<string, string> = {
  minimal: "بسيط",
  glass: "زجاجي",
  gradient: "متدرج",
  neon: "نيون",
  luxury: "فاخر",
  gaming: "ألعاب",
  corporate: "شركات",
  ecommerce: "تجارة إلكترونية",
  sidebar: "شريط جانبي",
};

