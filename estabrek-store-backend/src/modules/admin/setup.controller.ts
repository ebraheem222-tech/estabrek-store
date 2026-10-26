import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { revalidateStorefront } from "../../lib/storefrontRevalidate.js";
import { mainLanguage, type ContentLang } from "../../lib/translations.js";
import { IdentitySchema } from "../identity/identity.js";
import { SetupBody, SetupError, otherLangs, sectionRows, wordIn, type CategorySpec } from "../setup/setup.js";
import { adminIdOf, getOrCreateSettings, keepRevision, triggerSettingsRevalidate } from "./settings.controller.js";
import { capturePageRevision, triggerCmsRevalidate } from "./pages.controller.js";

/**
 * /v1/admin/setup — setting up a new store (settings:read to look; the owner applies).
 *   GET  /status  whether the wizard should open: never set up and nothing in the catalog yet
 *   POST /apply   what the store sells, its theme and its starter content (modules/setup/setup.ts)
 * Existing rows are never overwritten: categories, types and pages already there are kept
 * (the home page only with replaceHome, after saving it as a revision). The settings keep a
 * revision too, so the theme and identity can be put back from Settings → السجل.
 */
const r = Router();

type Header = Record<string, unknown>;
const headerOf = (raw: unknown): Header => (raw && typeof raw === "object" && !Array.isArray(raw) ? { ...(raw as Header) } : {});

r.get(
  "/status",
  asyncHandler(async (req, res) => {
    const s = await getOrCreateSettings();
    const header = headerOf(s.header);
    const setup = (header.setup && typeof header.setup === "object" ? header.setup : null) as { done?: boolean; industry?: string; at?: string } | null;
    const [products, categories, pages] = await Promise.all([prisma.product.count(), prisma.category.count(), prisma.page.count()]);
    const home = await prisma.page.findUnique({ where: { slug: "/" }, select: { id: true } });
    res.json({
      // A store that already sells (Estabrek, or one set up by hand) never gets the wizard on its own.
      needed: !setup?.done && products === 0 && categories === 0,
      setup,
      counts: { products, categories, pages },
      hasHome: Boolean(home),
      owner: Boolean((req as any).access?.owner),
      mainLanguage: mainLanguage(header),
    });
  }),
);

r.post(
  "/apply",
  validate({ body: SetupBody }),
  asyncHandler(async (req, res) => {
    if (!(req as any).access?.owner) return res.status(403).json({ error: "OWNER_ONLY", message: "Only the store's owner sets the store up" });
    const body = req.body as SetupBody;
    const s = await getOrCreateSettings();
    const header = headerOf(s.header);
    const main: ContentLang = mainLanguage(header);

    // Check every section before anything is written.
    let pages;
    try {
      pages = body.pages.map((p) => ({ ...p, rows: p.sections.map((sec) => sectionRows(sec, main)) }));
    } catch (e) {
      if (e instanceof SetupError) return res.status(400).json({ error: "VALIDATION_ERROR", field: e.field, message: e.message });
      throw e;
    }

    const actor = { email: (req as any).user?.email ?? null, sub: (req as any).user?.sub ?? null };
    const homeBefore = await prisma.page.findUnique({ where: { slug: "/" }, select: { id: true } });
    if (homeBefore && body.replaceHome && pages.some((p) => p.slug === "/")) await capturePageRevision(homeBefore.id, "Before store setup", actor);

    const summary = await prisma.$transaction(
      async (tx) => {
        const made = { categories: 0, types: 0, pages: 0, menuItems: 0 };
        const kept = { categories: 0, types: 0, pages: 0 };

        /* ---- categories (a parent and its children) */
        const addCategory = async (c: Pick<CategorySpec, "slug" | "name">, parentId: string | null) => {
          const found = await tx.category.findUnique({ where: { slug: c.slug }, select: { id: true } });
          if (found) {
            kept.categories++;
            return found.id;
          }
          const row = await tx.category.create({
            data: { slug: c.slug, name: wordIn(c.name, main, main) || c.slug, translations: otherLangs("name", c.name, main) as any, parentId },
            select: { id: true },
          });
          made.categories++;
          return row.id;
        };
        for (const c of body.categories) {
          const id = await addCategory(c, null);
          for (const child of c.children) await addCategory(child, id);
        }

        /* ---- product types */
        const last = await tx.productType.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
        let position = last ? last.position + 1 : 0;
        for (const t of body.types) {
          if (await tx.productType.findUnique({ where: { slug: t.slug }, select: { id: true } })) {
            kept.types++;
            continue;
          }
          const names = otherLangs("name", t.names, main);
          await tx.productType.create({
            data: {
              slug: t.slug,
              name: wordIn(t.names, main, main) || t.name,
              description: t.description ?? null,
              fields: t.fields as any,
              colorLabel: t.colorLabel ?? "اللون",
              sizeLabel: t.sizeLabel ?? "المقاس",
              showColor: t.showColor ?? true,
              showSize: t.showSize ?? true,
              fulfillment: t.fulfillment ?? "SHIPPING",
              translations: names as any,
              position: position++,
            },
          });
          made.types++;
        }

        /* ---- pages (published right away; the home page replaced only when asked) */
        for (const p of pages) {
          const existing = await tx.page.findUnique({ where: { slug: p.slug }, select: { id: true } });
          if (existing && !(p.slug === "/" && body.replaceHome)) {
            kept.pages++;
            continue;
          }
          const seo = {
            seoTitle: wordIn(p.seoTitle, main, main) || null,
            seoDescription: wordIn(p.seoDescription, main, main) || null,
          };
          let pageId: string;
          if (existing) {
            await tx.pageSection.deleteMany({ where: { pageId: existing.id } });
            await tx.page.update({ where: { id: existing.id }, data: { name: wordIn(p.name, main, main), status: "PUBLISHED", format: 1, tree: null as any, draft: null as any, ...seo } });
            pageId = existing.id;
          } else {
            const row = await tx.page.create({ data: { slug: p.slug, name: wordIn(p.name, main, main) || p.slug, status: "PUBLISHED", ...seo }, select: { id: true } });
            pageId = row.id;
          }
          for (const [order, sec] of p.rows.entries()) {
            await tx.pageSection.create({
              data: {
                pageId,
                type: sec.type as any,
                data: sec.data as any,
                order,
                translations: { create: sec.translations.map((t) => ({ locale: t.locale as any, data: t.data as any })) },
              },
            });
          }
          // Each other language's page title for search engines.
          for (const l of ["ar", "en", "he"] as const) {
            if (l === main || !p.seoTitle?.[l]) continue;
            await tx.pageTranslation.upsert({
              where: { pageId_locale: { pageId, locale: l } },
              create: { pageId, locale: l, seoTitle: p.seoTitle[l], seoDescription: p.seoDescription?.[l] ?? null },
              update: { seoTitle: p.seoTitle[l], seoDescription: p.seoDescription?.[l] ?? null },
            });
          }
          made.pages++;
        }

        /* ---- the main menu (a new one, put in place; the old stays in Admin → القوائم) */
        let primaryNavId = s.primaryNavId;
        if (body.menu.length) {
          const menu = await tx.navigationMenu.create({
            data: {
              name: `${wordIn(body.name, main, main) || "Store"} · ${new Date().toISOString().slice(0, 10)} ${Date.now().toString(36).slice(-4)}`,
              location: "HEADER",
              items: { create: body.menu.map((m, order) => ({ label: wordIn(m.label, main, main), href: m.href, order })) },
            },
            select: { id: true },
          });
          primaryNavId = menu.id;
          made.menuItems = body.menu.length;
        }

        /* ---- settings: what it sells, who it talks to, its name, its theme, setup done */
        const before = headerOf(s.header);
        const id = IdentitySchema.parse({
          ...(before.identity && typeof before.identity === "object" ? before.identity : {}),
          industry: body.industry,
          ...(body.audience ? { audience: body.audience } : {}),
          ...(body.name ? { name: { ar: body.name.ar ?? "", en: body.name.en ?? "", he: body.name.he ?? "" } } : {}),
          ...(body.tagline ? { tagline: { ar: body.tagline.ar ?? "", en: body.tagline.en ?? "", he: body.tagline.he ?? "" } } : {}),
        });
        const next: Header = { ...before, identity: id, setup: { done: true, industry: body.industry, at: new Date().toISOString(), version: 1 } };
        if (body.theme.id) next.storeTheme = { id: body.theme.id, mode: body.theme.mode };
        else delete next.storeTheme;
        // A menu in the CMS settings would win over the new one: the new menu is the store's now.
        if (body.menu.length && next.cmsNav && typeof next.cmsNav === "object") next.cmsNav = { ...(next.cmsNav as Header), enabled: false };
        const siteName = wordIn(body.name, main, main);
        await keepRevision(s as unknown as Record<string, unknown>, ["header", ...(siteName ? ["siteName"] : []), ...(primaryNavId !== s.primaryNavId ? ["primaryNavId"] : [])], await adminIdOf(req), "Store setup");
        await tx.siteSettings.update({
          where: { id: s.id },
          data: { header: next as any, primaryNavId, ...(siteName ? { siteName } : {}) },
        });
        return { made, kept };
      },
      { timeout: 30_000, maxWait: 10_000 },
    );

    triggerSettingsRevalidate();
    triggerCmsRevalidate(pages.map((p) => p.slug));
    void revalidateStorefront({ tags: ["catalog"] }).catch(() => undefined);
    res.json({ ok: true, ...summary, mainLanguage: main });
  }),
);

export default r;
