import { z } from "zod";
import { PageSectionTypeZ } from "./pageSectionData.schemas";

export const CreatePageBody = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),  // "/", "/about"
  status: z.enum(["DRAFT","PUBLISHED","ARCHIVED"]).optional(),
  canonicalUrl: z.string().optional(),
  seoTitle: z.string().max(120).optional(),
  seoDescription: z.string().max(300).optional(),
  ogImageUrl: z.string().url().optional(),
  noIndex: z.boolean().optional(),
  customCss: z.string().optional(),
  // Stored in Prisma as Json, but we use string (raw html snippets) for simplicity.
  headScripts: z.string().optional(),
  bodyScripts: z.string().optional(),
});

export const UpdatePageBody = CreatePageBody.partial();

export const CreateSectionBody = z.object({
  type: PageSectionTypeZ,
  data: z.any(),
  order: z.number().int().nonnegative().optional(),
  isVisible: z.boolean().optional(),
});

export const UpdateSectionBody = CreateSectionBody.partial();

export const MoveSectionBody = z.object({
  order: z.number().int().nonnegative(),
});

// -----------------------------
// Phase 2: AI helper endpoints
// -----------------------------

export const AiLocaleZ = z.enum(["ar", "he", "en"]);

export const AiSuggestSectionsBody = z.object({
  pageName: z.string().min(1).max(200),
  pageSlug: z.string().min(1).max(300),
  locale: AiLocaleZ.default("ar"),
  brandName: z.string().max(120).optional(),
  storeCategory: z.string().max(120).optional(),
  tone: z.enum(["luxury", "commercial", "minimal"]).optional(),
  // Provide a short list of categories or hero products for better suggestions
  hints: z.array(z.string().max(120)).max(20).optional(),
});

export const AiImproveSeoBody = z.object({
  pageName: z.string().min(1).max(200),
  pageSlug: z.string().min(1).max(300),
  locale: AiLocaleZ.default("ar"),
  currentTitle: z.string().max(200).optional(),
  currentDescription: z.string().max(800).optional(),
  pageSummary: z.string().max(2000).optional(),
  brandName: z.string().max(120).optional(),
  storeCategory: z.string().max(120).optional(),
});

export const AiTranslatePageBody = z.object({
  from: AiLocaleZ.default("ar"),
  to: AiLocaleZ,
  // The *page-level* fields you want translated
  fields: z.object({
    name: z.string().max(200).optional(),
    seoTitle: z.string().max(200).optional(),
    seoDescription: z.string().max(1200).optional(),
  }).passthrough(),
  // Sections to translate - we keep it permissive and let the model handle
  sections: z.array(z.object({
    type: z.string(),
    data: z.any(),
  })).max(200),
});


export const SavePageTranslationBody = z.object({
  fields: z.object({
    seoTitle: z.string().max(120).optional(),
    seoDescription: z.string().max(300).optional(),
    ogImageUrl: z.string().url().optional(),
    canonicalUrl: z.string().optional(),
    noIndex: z.boolean().optional(),
    headScripts: z.any().optional(),
    bodyScripts: z.any().optional(),
    customCss: z.string().optional(),
  }).optional(),
  sections: z.array(z.object({
    sectionId: z.string().min(1),
    data: z.any(),
  })).optional(),
});
