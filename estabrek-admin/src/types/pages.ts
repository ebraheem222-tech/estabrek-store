// src/types/pages.ts
import type { ID, ISODateString, JsonValue } from "./common";

export type PageStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type PageSectionType =
  | "HERO"
  | "RICH_TEXT"
  | "CUSTOM_HTML"
  | "GRID"
  | "BANNER"
  | "FEATURED_CATEGORIES"
  | "COLLECTIONS_GRID"
  | "BEST_SELLERS_SLIDER"
  | "NEW_ARRIVALS_SLIDER"
  | "BRANDS_SLIDER"
  | "FEATURED_PRODUCTS"
  | "IMAGE_GALLERY"
  | "FAQ"
  | "TESTIMONIALS"
  | "CTA"
  | "CARDS"
  | "VIDEO";

/** Prisma: Page */
export type Page = {
  id: ID;
  name: string;
  slug: string;
  status: PageStatus;

  headScripts?: JsonValue | null;
  bodyScripts?: JsonValue | null;
  customCss?: string | null;

  createdAt: ISODateString;
  updatedAt: ISODateString;

  sections?: PageSection[];
};

/** Prisma: PageSection */
export type PageSection = {
  id: ID;
  pageId: ID;

  type: PageSectionType;
  data: JsonValue;

  order: number;
  isVisible: boolean;

  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreatePageInput = {
  name: string;
  slug: string;
  status?: PageStatus;
};

export type UpdatePageInput = Partial<CreatePageInput>;

export type CreateSectionInput = {
  type: PageSectionType;
  data: JsonValue;
  order?: number;
  isVisible?: boolean;
};

export type UpdateSectionInput = Partial<CreateSectionInput>;

export type MoveSectionInput = {
  order: number;
};
