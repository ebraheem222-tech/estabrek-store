// src/api/pages.api.ts
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type PageStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type Page = {
  id: string;
  name: string;
  slug: string; // "/", "/about"
  status: PageStatus;
  publishAt?: string | null;
  unpublishAt?: string | null;
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
  | "GLOBAL_ANNOUNCEMENT"
  | "GLOBAL_HEADER"
  | "GLOBAL_FOOTER"
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

export type PageRevision = {
  id: string;
  pageId: string;
  name: string;
  slug: string;
  status: PageStatus;
  publishAt?: string | null;
  unpublishAt?: string | null;
  reason?: string | null;
  createdBy?: string | null;
  createdAt: string;
};

export type SectionValidationIssue = {
  path?: string;
  message: string;
  code?: string;
};

export type SectionValidationResult = {
  ok: boolean;
  issues: SectionValidationIssue[];
  source: "server" | "fallback";
};

function isEndpointUnavailable(error: any) {
  const status = Number(error?.response?.status ?? 0);
  return status === 404 || status === 405 || status === 501;
}

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

export async function createPage(body: {
  name: string;
  slug: string;
  status?: PageStatus;
  publishAt?: string | null;
  unpublishAt?: string | null;
  canonicalUrl?: string;
  customCss?: string;
  headScripts?: any;
  bodyScripts?: any;
}) {
  const res = await api.post(ENDPOINTS.admin.pages.base, body);
  return res.data as Page;
}

export async function getPage(id: string) {
  const res = await api.get(ENDPOINTS.admin.pages.byId(id));
  return normalizePageWithSections(res.data);
}

export async function updatePage(
  id: string,
  body: Partial<{
    name: string;
    slug: string;
    status: PageStatus;
    publishAt: string | null;
    unpublishAt: string | null;
    canonicalUrl: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImageUrl: string | null;
    noIndex: boolean | null;
    customCss: string | null;
    headScripts: any;
    bodyScripts: any;
  }>
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

export async function validateSectionPayload(input: {
  type: PageSectionType;
  data: any;
  pageId?: string;
  sectionId?: string;
}): Promise<SectionValidationResult> {
  try {
    const res = await api.post(ENDPOINTS.admin.pages.validateSection, input);
    const payload = res.data ?? {};
    const issuesRaw = Array.isArray(payload?.issues) ? payload.issues : [];
    const issues: SectionValidationIssue[] = issuesRaw
      .map((issue: any) => {
        const message = String(issue?.message ?? "").trim();
        if (!message) return null;
        return {
          path: typeof issue?.path === "string" ? issue.path : undefined,
          code: typeof issue?.code === "string" ? issue.code : undefined,
          message,
        } as SectionValidationIssue;
      })
      .filter((issue: SectionValidationIssue | null): issue is SectionValidationIssue => !!issue);

    const ok = payload?.ok === false ? false : issues.length === 0;
    return { ok, issues, source: "server" };
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      return { ok: true, issues: [], source: "fallback" };
    }
    throw error;
  }
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

export async function listPageRevisions(pageId: string, limit = 20) {
  const res = await api.get(ENDPOINTS.admin.pages.revisions(pageId), {
    params: { limit },
  });
  return (res.data?.revisions ?? []) as PageRevision[];
}

export async function restorePageRevision(pageId: string, revisionId: string, reason?: string) {
  const res = await api.post(ENDPOINTS.admin.pages.restoreRevision(pageId, revisionId), {
    reason,
  });
  return res.data as { ok: true };
}
