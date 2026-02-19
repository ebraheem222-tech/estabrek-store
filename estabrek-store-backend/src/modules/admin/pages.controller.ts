import { Router } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import {
  CreatePageBody,
  UpdatePageBody,
  CreateSectionBody,
  UpdateSectionBody,
  MoveSectionBody,
  PageRevisionsQuery,
  RestorePageRevisionBody,
  AiSuggestSectionsBody,
  AiImproveSeoBody,
  AiTranslatePageBody,
  SavePageTranslationBody,
  ValidateSectionBody,
} from "./pages.schemas.js";
import { getDefaultOpenAIModel, openaiResponsesJson } from "../../lib/openai.js";
import { PageSectionTypeZ, getPublishIssuesForSection, validateSectionData } from "./pageSectionData.schemas.js";
import { revalidateStorefront } from "../../lib/storefrontRevalidate.js";
import { cacheDel, cacheDelPrefix } from "../../lib/cache.js";
import { BadRequest } from "../../utils/httpError.js";

const r = Router();
const PAGE_SECTION_TYPES = new Set<string>(PageSectionTypeZ.options as unknown as string[]);

type SuggestedSection = { type: string; data: any; isVisible?: boolean };
type SectionValidationIssue = { path?: string; code?: string; message: string };

function formatValidationPath(path: Array<PropertyKey>): string | undefined {
  if (!Array.isArray(path) || !path.length) return "data";
  return `data.${path
    .map((part) => (typeof part === "symbol" ? (part.description ?? "symbol") : String(part)))
    .join(".")}`;
}

function mapZodIssues(error: ZodError): SectionValidationIssue[] {
  return error.issues.map((issue) => ({
    path: formatValidationPath(issue.path),
    code: issue.code,
    message: issue.message,
  }));
}

function toNullableJsonInput(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function triggerCmsRevalidate(slugs: Array<string | null | undefined> = []) {
  const paths = Array.from(new Set(slugs.filter(Boolean))) as string[];
  void (async () => {
    await cacheDel("storefront:pages:published");
    if (paths.length) {
      for (const slug of paths) {
        for (const locale of ["ar", "he", "en"] as const) {
          await cacheDel(`storefront:page:${locale}:${slug}`);
        }
      }
    } else {
      await cacheDelPrefix("storefront:page:");
    }
    await revalidateStorefront({
      tags: ["cms", "cms:pages", "cms:bootstrap"],
      paths,
    });
  })();
}

function normalizeDateInput(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const dt = new Date(String(value));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function validateScheduleWindow(publishAt?: Date | null, unpublishAt?: Date | null) {
  if (publishAt && unpublishAt && unpublishAt <= publishAt) {
    throw BadRequest("unpublishAt must be later than publishAt");
  }
}

function fallbackLanding(locale: "ar"|"he"|"en", brandName?: string, storeCategory?: string): { sections: SuggestedSection[]; seo: { seoTitle: string; seoDescription: string } } {
  const brand = brandName ?? "Estabrek";
  const cat = storeCategory ?? "ملابس";
  if (locale === "he") {
    return {
      seo: {
        seoTitle: `${brand} | חנות ${cat} אונליין`,
        seoDescription: `קני ${cat} איכותיים עם משלוח מהיר ושירות אמין. דילים וחבילות מיוחדות כל הזמן.`,
      },
      sections: [
        { type: "HERO", data: { title: `${brand} — ${cat}`, subtitle: "איכות גבוהה · מחירים הוגנים · נוחות", align: "center", primaryButton: { label: "לקנייה", href: "/shop" }, secondaryButton: { label: "צור קשר", href: "/contact" } } },
        { type: "BANNER", data: { text: "משלוח מהיר · החזרות קלות · תמיכה בוואטסאפ", variant: "info" } },
        { type: "FEATURED_PRODUCTS", data: { title: "מוצרים נבחרים", limit: 8 } },
        { type: "FAQ", data: { title: "שאלות נפוצות", items: [ { question: "איך מזמינים?", answer: "בחרו מוצר, צבע ומידה, והשלימו הזמנה." }, { question: "איך משלוח?", answer: "אנו שולחים מהר בהתאם לאזור." } ] } },
        { type: "CTA", data: { title: "צריך עזרה?", text: "שלחו לנו הודעה ונחזור אליכם מהר", button: { label: "צור קשר", href: "/contact" } } },
      ],
    };
  }
  if (locale === "en") {
    return {
      seo: {
        seoTitle: `${brand} | ${cat} Store Online`,
        seoDescription: `Shop high‑quality ${cat}. Fast support, great deals, and easy ordering.`,
      },
      sections: [
        { type: "HERO", data: { title: `${brand} — ${cat}`, subtitle: "Quality · Fair pricing · Comfort", align: "center", primaryButton: { label: "Shop now", href: "/shop" }, secondaryButton: { label: "Contact", href: "/contact" } } },
        { type: "BANNER", data: { text: "Fast delivery · Easy returns · WhatsApp support", variant: "info" } },
        { type: "FEATURED_PRODUCTS", data: { title: "Featured", limit: 8 } },
        { type: "FAQ", data: { title: "FAQ", items: [ { question: "How do I order?", answer: "Choose a product, color, and size, then checkout." }, { question: "Delivery time?", answer: "We ship quickly depending on your area." } ] } },
        { type: "CTA", data: { title: "Need help?", text: "Message us and we’ll reply fast", button: { label: "Contact", href: "/contact" } } },
      ],
    };
  }
  // ar default
  return {
    seo: {
      seoTitle: `${brand} | متجر ${cat} اونلاين`,
      seoDescription: `تسوق ${cat} بجودة عالية، دعم سريع، وعروض مستمرة. اطلب بسهولة واستلم بسرعة.`,
    },
    sections: [
      { type: "HERO", data: { title: `${brand} — ${cat}`, subtitle: "جودة عالية · أسعار مناسبة · تجربة سهلة", align: "center", primaryButton: { label: "تسوق الآن", href: "/shop" }, secondaryButton: { label: "تواصل معنا", href: "/contact" } } },
      { type: "BANNER", data: { text: "شحن سريع · استرجاع سهل · دعم واتساب", variant: "info" } },
      { type: "FEATURED_PRODUCTS", data: { title: "منتجات مميزة", limit: 8 } },
      { type: "FAQ", data: { title: "الأسئلة الشائعة", items: [ { question: "كيف أطلب؟", answer: "اختر المنتج واللون والمقاس ثم أكمل الطلب." }, { question: "كم مدة الشحن؟", answer: "نرسل بسرعة حسب منطقتك." } ] } },
      { type: "CTA", data: { title: "تحتاج مساعدة؟", text: "أرسل رسالة وسنرد عليك بسرعة", button: { label: "تواصل", href: "/contact" } } },
    ],
  };
}

function validateSuggestedSections(sections: SuggestedSection[]) {
  return sections
    .map((s) => {
      const type = String(s?.type || "").toUpperCase();
      const data = s?.data ?? {};
      try {
        const parsed = validateSectionData(type as any, data);
        return { type, data: parsed, isVisible: s?.isVisible ?? true };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

type RevisionActor = { email?: string | null; sub?: string | null } | null | undefined;

async function capturePageRevision(pageId: string, reason: string, actor?: RevisionActor) {
  const normalizedReason = String(reason || "Update page").trim();
  const recentCutoff = new Date(Date.now() - 45_000);
  const recent = await prisma.pageRevision.findFirst({
    where: {
      pageId,
      reason: normalizedReason,
      createdAt: { gte: recentCutoff },
    },
    select: { id: true },
  });
  if (recent) return;

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        select: {
          type: true,
          data: true,
          order: true,
          isVisible: true,
        },
      },
    },
  });
  if (!page) return;

  await prisma.pageRevision.create({
    data: {
      pageId: page.id,
      name: page.name,
      slug: page.slug,
      status: page.status,
      publishAt: page.publishAt,
      unpublishAt: page.unpublishAt,
      canonicalUrl: page.canonicalUrl,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      ogImageUrl: page.ogImageUrl,
      noIndex: page.noIndex,
      customCss: page.customCss,
      headScripts: toNullableJsonInput(page.headScripts),
      bodyScripts: toNullableJsonInput(page.bodyScripts),
      sections: page.sections as any,
      reason: normalizedReason,
      createdBy: actor?.email || actor?.sub || null,
    },
  });
}

async function restorePageRevision(pageId: string, revisionId: string, reason: string, actor?: RevisionActor) {
  const revision = await prisma.pageRevision.findFirst({
    where: { id: revisionId, pageId },
  });
  if (!revision) {
    throw BadRequest("Revision not found");
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.page.findUnique({
      where: { id: pageId },
      include: {
        sections: {
          orderBy: { order: "asc" },
          select: {
            type: true,
            data: true,
            order: true,
            isVisible: true,
          },
        },
      },
    });
    if (!current) throw BadRequest("Page not found");

    await tx.pageRevision.create({
      data: {
        pageId: current.id,
        name: current.name,
        slug: current.slug,
        status: current.status,
        publishAt: current.publishAt,
        unpublishAt: current.unpublishAt,
        canonicalUrl: current.canonicalUrl,
        seoTitle: current.seoTitle,
        seoDescription: current.seoDescription,
        ogImageUrl: current.ogImageUrl,
        noIndex: current.noIndex,
        customCss: current.customCss,
        headScripts: toNullableJsonInput(current.headScripts),
        bodyScripts: toNullableJsonInput(current.bodyScripts),
        sections: current.sections as any,
        reason: reason || `Pre-restore snapshot (${revision.id})`,
        createdBy: actor?.email || actor?.sub || null,
      },
    });

    await tx.page.update({
      where: { id: pageId },
      data: {
        name: revision.name,
        slug: revision.slug,
        status: revision.status,
        publishAt: revision.publishAt,
        unpublishAt: revision.unpublishAt,
        canonicalUrl: revision.canonicalUrl,
        seoTitle: revision.seoTitle,
        seoDescription: revision.seoDescription,
        ogImageUrl: revision.ogImageUrl,
        noIndex: revision.noIndex,
        customCss: revision.customCss,
        headScripts: toNullableJsonInput(revision.headScripts),
        bodyScripts: toNullableJsonInput(revision.bodyScripts),
      },
    });

    await tx.pageSection.deleteMany({ where: { pageId } });
    const sections = Array.isArray(revision.sections) ? (revision.sections as any[]) : [];
    if (sections.length) {
      await tx.pageSection.createMany({
        data: sections.map((section, index) => ({
          pageId,
          type: section.type,
          data: section.data ?? {},
          order: Number.isFinite(Number(section.order)) ? Number(section.order) : index,
          isVisible: section.isVisible !== false,
        })),
      });
    }
  });
}

// pages
r.get("/", asyncHandler(async (_req, res) => {
  const pages = await prisma.page.findMany({ orderBy: { createdAt: "desc" } });
  res.json(pages);
}));

r.post("/", validate({ body: CreatePageBody }), asyncHandler(async (req, res) => {
  const body = req.body as any;
  const publishAt = normalizeDateInput(body.publishAt);
  const unpublishAt = normalizeDateInput(body.unpublishAt);
  validateScheduleWindow(publishAt, unpublishAt);

  const page = await prisma.page.create({
    data: {
      ...body,
      publishAt: publishAt ?? null,
      unpublishAt: unpublishAt ?? null,
    },
  });
  triggerCmsRevalidate([page.slug]);
  res.status(201).json(page);
}));

r.get("/:id", asyncHandler(async (req, res) => {
  const page = await prisma.page.findUnique({ where: { id: req.params.id }, include: { sections: { orderBy: { order: "asc" } } } });
  // shape translations for editor
    const i18n: any = {};
    for (const loc of ["he","en"] as const) {
      const pt = (page as any).translations?.find((t: any) => t.locale === loc);
      const sections = (page as any).sections?.map((s: any) => {
        const st = s.translations?.find((t: any) => t.locale === loc);
        return st ? { sectionId: s.id, data: st.data } : null;
      }).filter(Boolean);
      if (pt || (sections && sections.length)) {
        i18n[loc] = { fields: pt ?? null, sections: sections ?? [] };
      }
    }
    res.json({ ...page, i18n });
}));

r.get("/:id/revisions", validate({ query: PageRevisionsQuery }), asyncHandler(async (req, res) => {
  const pageId = String(req.params.id);
  const limit = Number((req.query as any).limit ?? 20);

  const revisions = await prisma.pageRevision.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      pageId: true,
      name: true,
      slug: true,
      status: true,
      publishAt: true,
      unpublishAt: true,
      reason: true,
      createdBy: true,
      createdAt: true,
    },
  });

  res.json({ revisions });
}));

r.post(
  "/:id/revisions/:revisionId/restore",
  validate({ body: RestorePageRevisionBody }),
  asyncHandler(async (req, res) => {
    const pageId = String(req.params.id);
    const revisionId = String(req.params.revisionId);
    const reason = String((req.body as any)?.reason ?? "Restore revision");
    await restorePageRevision(pageId, revisionId, reason, req.user as any);

    const page = await prisma.page.findUnique({ where: { id: pageId }, select: { slug: true } });
    triggerCmsRevalidate([page?.slug]);
    res.json({ ok: true });
  })
);

r.patch("/:id", validate({ body: UpdatePageBody }), asyncHandler(async (req, res) => {
  const prev = await prisma.page.findUnique({
    where: { id: req.params.id },
    select: { slug: true, publishAt: true, unpublishAt: true },
  });
  const body = req.body as any;
  const parsedPublishAt = normalizeDateInput(body.publishAt);
  const parsedUnpublishAt = normalizeDateInput(body.unpublishAt);
  const nextPublishAt = parsedPublishAt === undefined ? prev?.publishAt ?? undefined : parsedPublishAt;
  const nextUnpublishAt = parsedUnpublishAt === undefined ? prev?.unpublishAt ?? undefined : parsedUnpublishAt;
  validateScheduleWindow(nextPublishAt, nextUnpublishAt);
  await capturePageRevision(req.params.id, "Update page", req.user as any);

  const page = await prisma.page.update({
    where: { id: req.params.id },
    data: {
      ...body,
      ...(parsedPublishAt !== undefined ? { publishAt: parsedPublishAt } : {}),
      ...(parsedUnpublishAt !== undefined ? { unpublishAt: parsedUnpublishAt } : {}),
    },
  });
  // shape translations for editor
    const i18n: any = {};
    for (const loc of ["he","en"] as const) {
      const pt = (page as any).translations?.find((t: any) => t.locale === loc);
      const sections = (page as any).sections?.map((s: any) => {
        const st = s.translations?.find((t: any) => t.locale === loc);
        return st ? { sectionId: s.id, data: st.data } : null;
      }).filter(Boolean);
      if (pt || (sections && sections.length)) {
        i18n[loc] = { fields: pt ?? null, sections: sections ?? [] };
      }
    }
    triggerCmsRevalidate([prev?.slug, page.slug]);
    res.json({ ...page, i18n });
}));

r.delete("/:id", asyncHandler(async (req, res) => {
  await capturePageRevision(req.params.id, "Delete page", req.user as any);
  const page = await prisma.page.delete({ where: { id: req.params.id }, select: { slug: true } });
  triggerCmsRevalidate([page.slug]);
  res.json({ ok: true });
}));

// sections
r.post("/sections/validate", validate({ body: ValidateSectionBody }), asyncHandler(async (req, res) => {
  const rawType = String((req.body as any)?.type ?? "").trim().toUpperCase();
  if (!PAGE_SECTION_TYPES.has(rawType)) {
    res.json({
      ok: false,
      source: "server",
      issues: [
        {
          path: "type",
          code: "UNSUPPORTED_TYPE",
          message: `Unsupported section type: ${rawType || "UNKNOWN"}`,
        },
      ],
    });
    return;
  }

  try {
    const normalized = validateSectionData(rawType as any, (req.body as any)?.data ?? {});
    const strictIssues = getPublishIssuesForSection(rawType as any, normalized).map((issue) => ({
      path: "data",
      code: "PUBLISH_VALIDATION",
      message: issue.message,
    }));

    res.json({
      ok: strictIssues.length === 0,
      source: "server",
      issues: strictIssues,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.json({
        ok: false,
        source: "server",
        issues: mapZodIssues(error),
      });
      return;
    }
    throw error;
  }
}));

r.post("/:id/sections", validate({ body: CreateSectionBody }), asyncHandler(async (req, res) => {
  await capturePageRevision(req.params.id, `Add section ${(req.body as any)?.type ?? ""}`.trim(), req.user as any);
  const section = await prisma.pageSection.create({
    data: { pageId: req.params.id, ...req.body },
    include: { page: { select: { slug: true } } },
  });
  triggerCmsRevalidate([section.page?.slug]);
  res.status(201).json(section);
}));

r.patch("/sections/:sectionId", validate({ body: UpdateSectionBody }), asyncHandler(async (req, res) => {
  const existing = await prisma.pageSection.findUnique({
    where: { id: req.params.sectionId },
    select: { pageId: true, type: true },
  });
  if (existing?.pageId) {
    await capturePageRevision(existing.pageId, `Update section ${existing.type}`, req.user as any);
  }
  const sec = await prisma.pageSection.update({
    where: { id: req.params.sectionId },
    data: req.body,
    include: { page: { select: { slug: true } } },
  });
  triggerCmsRevalidate([sec.page?.slug]);
  res.json(sec);
}));

r.post("/sections/:sectionId/move", validate({ body: MoveSectionBody }), asyncHandler(async (req, res) => {
  const existing = await prisma.pageSection.findUnique({
    where: { id: req.params.sectionId },
    select: { pageId: true, type: true },
  });
  if (existing?.pageId) {
    await capturePageRevision(existing.pageId, `Move section ${existing.type}`, req.user as any);
  }
  const sec = await prisma.pageSection.update({
    where: { id: req.params.sectionId },
    data: { order: req.body.order },
    include: { page: { select: { slug: true } } },
  });
  triggerCmsRevalidate([sec.page?.slug]);
  res.json(sec);
}));

r.delete("/sections/:sectionId", asyncHandler(async (req, res) => {
  const existing = await prisma.pageSection.findUnique({
    where: { id: req.params.sectionId },
    select: { pageId: true, type: true },
  });
  if (existing?.pageId) {
    await capturePageRevision(existing.pageId, `Delete section ${existing.type}`, req.user as any);
  }
  const sec = await prisma.pageSection.delete({
    where: { id: req.params.sectionId },
    include: { page: { select: { slug: true } } },
  });
  triggerCmsRevalidate([sec.page?.slug]);
  res.json({ ok: true });
}));

// -----------------------------
// Phase 2: AI helper endpoints
// -----------------------------

/**
 * Phase 2 (final): AI helper endpoints
 * - Always returns a usable payload (fallback if OpenAI missing/fails)
 * - Response shape is stable for the Admin UI: { ok, source: "openai"|"fallback", ... }
 */

r.post("/ai/suggest-sections", validate({ body: AiSuggestSectionsBody }), asyncHandler(async (req, res) => {
  const body = req.body as any;
  const locale = ((body.locale ?? "ar") as ("ar"|"he"|"en"));

  // Fallback always works even without OpenAI
  const fb = fallbackLanding(locale, body.brandName, body.storeCategory);

  const model = getDefaultOpenAIModel();
  const sys = `You are a senior e-commerce CMS assistant. Output STRICT JSON only.`;
  const user = {
    task: "suggest_sections",
    constraints: {
      sectionTypes: ["HERO","BANNER","RICH_TEXT","GRID","FEATURED_PRODUCTS","IMAGE_GALLERY","FAQ","TESTIMONIALS","CTA","CARDS","VIDEO"],
      locale,
      rtl: locale !== "en",
    },
    context: {
      brandName: body.brandName ?? "Estabrek",
      storeCategory: body.storeCategory ?? "اسلامي fashion",
      page: { name: body.pageName, slug: body.pageSlug },
      hints: body.hints ?? [],
    },
    output: {
      sections: "Array<{type,data,isVisible}>",
      seo: "{seoTitle, seoDescription}"
    },
    seedExample: fb,
  };

  const result = await openaiResponsesJson<any>({
    model,
    input: [
      { role: "system", content: sys },
      { role: "user", content: JSON.stringify(user) },
    ],
    max_output_tokens: 1200,
    temperature: 0.6,
  });

  if (!result.ok) {
    // Use fallback if no key or error
    return res.json({ ok: true, source: "fallback", ...fb });
  }

  const sections = validateSuggestedSections(Array.isArray(result.data?.sections) ? result.data.sections : fb.sections);
  const seoTitle = String(result.data?.seo?.seoTitle ?? fb.seo.seoTitle).slice(0, 120);
  const seoDescription = String(result.data?.seo?.seoDescription ?? fb.seo.seoDescription).slice(0, 300);

  res.json({ ok: true, source: "openai", sections, seo: { seoTitle, seoDescription } });
}));

r.post("/ai/improve-seo", validate({ body: AiImproveSeoBody }), asyncHandler(async (req, res) => {
  const body = req.body as any;
  const locale = ((body.locale ?? "ar") as ("ar"|"he"|"en"));
  const fb = fallbackLanding(locale, body.brandName, body.storeCategory).seo;

  const model = getDefaultOpenAIModel();
  const sys = `You are an SEO copywriter for e-commerce. Output STRICT JSON only.`;
  const user = {
    task: "improve_seo",
    locale,
    brandName: body.brandName ?? "Estabrek",
    storeCategory: body.storeCategory ?? "Islamic fashion",
    page: { name: body.pageName, slug: body.pageSlug, summary: body.pageSummary ?? "" },
    current: { title: body.currentTitle ?? "", description: body.currentDescription ?? "" },
    output: { seoTitle: "<=120 chars", seoDescription: "<=300 chars" },
    seedExample: fb,
  };

  const result = await openaiResponsesJson<any>({
    model,
    input: [
      { role: "system", content: sys },
      { role: "user", content: JSON.stringify(user) },
    ],
    max_output_tokens: 600,
    temperature: 0.5,
  });

  if (!result.ok) return res.json({ ok: true, source: "fallback", seoTitle: fb.seoTitle, seoDescription: fb.seoDescription });
  const seoTitle = String(result.data?.seoTitle ?? fb.seoTitle).slice(0, 120);
  const seoDescription = String(result.data?.seoDescription ?? fb.seoDescription).slice(0, 300);
  res.json({ ok: true, source: "openai", seoTitle, seoDescription });
}));

r.post("/ai/translate", validate({ body: AiTranslatePageBody }), asyncHandler(async (req, res) => {
  const body = req.body as any;
  const from = ((body.from ?? "ar") as ("ar"|"he"|"en"));
  const to = ((body.to ?? "en") as ("ar"|"he"|"en"));

  // Fallback: keep same payload if no AI (Admin will store it as a starting point)
  const model = getDefaultOpenAIModel();
  const sys = `You are a professional e-commerce translator.
Output STRICT JSON only: {"fields": object, "sections": [{"type": string, "data": object}]}.
Rules:
- Translate ONLY human-facing text (titles, subtitles, labels, paragraphs).
- Preserve URLs, slugs, IDs, productIds, numbers, currency symbols.
- Preserve brand names exactly.
- For Hebrew (he): output real Hebrew (no transliteration), natural marketing tone, RTL-friendly punctuation.
- For English (en): concise, natural e-commerce tone.
- Do not add new section types or remove sections.
`;
  const user = {
    task: "translate_page",
    from,
    to,
    fields: body.fields ?? {},
    sections: body.sections ?? [],
    rules: [
      "Preserve URLs", "Preserve numbers", "Keep brand names as-is", "Keep short CTA labels",
    ],
    output: {
      fields: "translated fields",
      sections: "translated sections with same type",
    },
  };

  const result = await openaiResponsesJson<any>({
    model,
    input: [
      { role: "system", content: sys },
      { role: "user", content: JSON.stringify(user) },
    ],
    max_output_tokens: 1400,
    temperature: 0.3,
  });

  if (!result.ok) return res.json({ ok: true, source: "fallback", fields: body.fields ?? {}, sections: body.sections ?? [] });

  // Validate translated sections (best-effort)
  const safe: Array<{ type: string; data: any }> = [];
  const rawSecs: any[] = Array.isArray(result.data?.sections) ? result.data.sections : (body.sections ?? []);
  for (const s of rawSecs) {
    const t = String(s?.type ?? "").toUpperCase();
    try {
      safe.push({ type: t, data: validateSectionData(t as any, s?.data ?? {}) });
    } catch {
      // If one section fails, keep the original section to avoid breaking layout
      const orig = (body.sections ?? []).find((x: any) => String(x?.type ?? "").toUpperCase() === t);
      if (orig) safe.push({ type: t, data: orig.data ?? {} });
    }
  }

  res.json({ ok: true, source: "openai", fields: result.data?.fields ?? body.fields ?? {}, sections: safe });
}));


/**
 * i18n translations (DB)
 * GET /admin/pages/:id/i18n/:locale
 * PUT /admin/pages/:id/i18n/:locale
 */
r.get("/:id/i18n/:locale", asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const locale = String(req.params.locale) as any;

  const page = await prisma.page.findUnique({
    where: { id },
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (!page) return res.status(404).json({ error: "NOT_FOUND" });

  const pt = await prisma.pageTranslation.findUnique({
    where: { pageId_locale: { pageId: id, locale } },
  });

  const st = await prisma.pageSectionTranslation.findMany({
    where: { locale, section: { pageId: id } },
    select: { sectionId: true, data: true },
  });

  res.json({ fields: pt, sections: st });
}));

r.put("/:id/i18n/:locale", validate({ body: SavePageTranslationBody }), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const locale = String(req.params.locale) as any;
  if (locale === "ar") return res.status(400).json({ error: "AR_IS_BASE" });

  const body = req.body as any;
  const page = await prisma.page.findUnique({ where: { id }, select: { slug: true } });
  if (!page) return res.status(404).json({ error: "NOT_FOUND" });

  const fields = body.fields ?? {};
  const sections = Array.isArray(body.sections) ? body.sections : [];

  const pt = await prisma.pageTranslation.upsert({
    where: { pageId_locale: { pageId: id, locale } },
    create: {
      pageId: id,
      locale,
      seoTitle: fields.seoTitle,
      seoDescription: fields.seoDescription,
      ogImageUrl: fields.ogImageUrl,
      canonicalUrl: fields.canonicalUrl,
      noIndex: fields.noIndex,
      headScripts: fields.headScripts,
      bodyScripts: fields.bodyScripts,
      customCss: fields.customCss,
    },
    update: {
      seoTitle: fields.seoTitle,
      seoDescription: fields.seoDescription,
      ogImageUrl: fields.ogImageUrl,
      canonicalUrl: fields.canonicalUrl,
      noIndex: fields.noIndex,
      headScripts: fields.headScripts,
      bodyScripts: fields.bodyScripts,
      customCss: fields.customCss,
    },
  });

  for (const s of sections) {
    if (!s?.sectionId) continue;
    await prisma.pageSectionTranslation.upsert({
      where: { sectionId_locale: { sectionId: String(s.sectionId), locale } },
      create: { sectionId: String(s.sectionId), locale, data: s.data ?? {} },
      update: { data: s.data ?? {} },
    });
  }

  triggerCmsRevalidate([page.slug]);
  res.json({ ok: true, fields: pt });
}));

export default r;
