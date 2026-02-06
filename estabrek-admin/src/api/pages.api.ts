// src/api/pages.api.ts
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type PageStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type Page = {
  id: string;
  name: string;
  slug: string; // "/", "/about"
  status: PageStatus;
  canonicalUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  noIndex?: boolean | null;
  customCss?: string | null;
  headScripts?: any;
  bodyScripts?: any;
  createdAt?: string;
  updatedAt?: string;
};

export type PageSectionType =
  | "HERO"
  | "RICH_TEXT"
  | "CUSTOM_HTML"
  | "GRID"
  | "FEATURES"
  | "STATS"
  | "TEAM"
  | "PRICING"
  | "CONTACT"
  | "BANNER"
  | "FEATURED_CATEGORIES"
  | "COLLECTIONS_GRID"
  | "BEST_SELLERS_SLIDER"
  | "NEW_ARRIVALS_SLIDER"
  | "BRANDS_SLIDER"
  | "FEATURED_PRODUCTS"
  | "NEWSLETTER"
  | "IMAGE_GALLERY"
  | "FAQ"
  | "TESTIMONIALS"
  | "CTA"
  | "CARDS"
  | "VIDEO";

export type PageSection = {
  id: string;
  pageId: string;
  type: PageSectionType;
  data: any;
  order: number;
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PageWithSections = Page & { sections: PageSection[] };

function safeJsonParse(v: unknown) {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return {};
  }
}

function normalizeSection(sec: any): PageSection | null {
  if (!sec || typeof sec !== "object") return null;
  const id = (typeof sec.id === "string" || typeof sec.id === "number") ? String(sec.id) : "";
  if (!id) return null;
  const type = (typeof sec.type === "string" ? sec.type : "RICH_TEXT") as PageSectionType;
  const order = typeof sec.order === "number" ? sec.order : 0;
  const isVisible = typeof sec.isVisible === "boolean" ? sec.isVisible : true;
  const data = safeJsonParse(sec.data) ?? {};
  return { ...sec, id, type, order, isVisible, data } as PageSection;
}

function normalizePageWithSections(p: any): PageWithSections {
  const sectionsRaw = Array.isArray(p?.sections) ? p.sections : [];
  const sections = sectionsRaw.map(normalizeSection).filter(Boolean) as PageSection[];
  return { ...(p as Page), sections } as PageWithSections;
}

export async function listPages() {
  const res = await api.get(ENDPOINTS.admin.pages.base);
  return res.data as Page[];
}

export async function createPage(body: { name: string; slug: string; status?: PageStatus; canonicalUrl?: string; customCss?: string; headScripts?: any; bodyScripts?: any }) {
  const res = await api.post(ENDPOINTS.admin.pages.base, body);
  return res.data as Page;
}

export async function getPage(id: string) {
  const res = await api.get(ENDPOINTS.admin.pages.byId(id));
  return normalizePageWithSections(res.data);
}

export async function updatePage(
  id: string,
  body: Partial<{ name: string; slug: string; status: PageStatus; canonicalUrl: string | null; seoTitle: string | null; seoDescription: string | null; ogImageUrl: string | null; noIndex: boolean | null; customCss: string | null; headScripts: any; bodyScripts: any }>
) {
  const res = await api.patch(ENDPOINTS.admin.pages.byId(id), body);
  return res.data as Page;
}

export async function deletePage(id: string) {
  const res = await api.delete(ENDPOINTS.admin.pages.byId(id));
  return res.data as { ok: true };
}

export async function createSection(pageId: string, body: { type: PageSectionType; data: any; order?: number; isVisible?: boolean }) {
  const res = await api.post(ENDPOINTS.admin.pages.sections(pageId), body);
  return (normalizeSection(res.data) ?? res.data) as PageSection;
}

export async function updateSection(sectionId: string, body: Partial<{ type: PageSectionType; data: any; order: number; isVisible: boolean }>) {
  const res = await api.patch(ENDPOINTS.admin.pages.sectionById(sectionId), body);
  return (normalizeSection(res.data) ?? res.data) as PageSection;
}

export async function moveSection(sectionId: string, body: { order: number }) {
  const res = await api.post(ENDPOINTS.admin.pages.moveSection(sectionId), body);
  return (normalizeSection(res.data) ?? res.data) as PageSection;
}

// -----------------------------
// Phase 2: AI helper APIs
// -----------------------------

export type AiLocale = "ar" | "he" | "en";

export async function aiSuggestSections(body: {
  pageName: string;
  pageSlug: string;
  locale?: AiLocale;
  brandName?: string;
  storeCategory?: string;
  hints?: string[];
}) {
  const res = await api.post(ENDPOINTS.admin.pages.aiSuggestSections, body);
  return res.data as { ok: true; source: "openai" | "fallback"; sections: { type: PageSectionType; data: any; isVisible?: boolean }[]; seo: { seoTitle: string; seoDescription: string } };
}

export async function aiImproveSeo(body: {
  pageName: string;
  pageSlug: string;
  locale?: AiLocale;
  currentTitle?: string;
  currentDescription?: string;
  pageSummary?: string;
  brandName?: string;
  storeCategory?: string;
}) {
  const res = await api.post(ENDPOINTS.admin.pages.aiImproveSeo, body);
  return res.data as { ok: true; source: "openai" | "fallback"; seoTitle: string; seoDescription: string };
}

export async function aiTranslatePage(body: {
  from?: AiLocale;
  to: AiLocale;
  fields: Record<string, any>;
  sections: { type: PageSectionType; data: any }[];
}) {
  const res = await api.post(ENDPOINTS.admin.pages.aiTranslate, body);
  return res.data as { ok: true; source: "openai" | "fallback"; fields: Record<string, any>; sections: { type: PageSectionType; data: any }[] };
}

export async function deleteSection(sectionId: string) {
  const res = await api.delete(ENDPOINTS.admin.pages.sectionById(sectionId));
  return res.data as { ok: true };
}
