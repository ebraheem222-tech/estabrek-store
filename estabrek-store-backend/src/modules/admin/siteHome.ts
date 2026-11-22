/**
 * «خلّيه الرئيسية» (sites wave 0.2, docs/sites-300-plan.ar.md): an installed site becomes the store's face.
 *
 *   make  its first page is shown at "/" (the storefront's page lookup reads `header.siteHome`, lib/siteHome.ts),
 *         and the store's menus become the site's: one above with its pages, one below with all of them,
 *         made from what the admin sends (the pages' keys and their names; the addresses are read here,
 *         so a page given a new address keeps its link). Only published pages go in a menu: the others
 *         are said back. One site at a time: making another one the home puts the first one's back first.
 *   undo  the store's own home and the menus that were in place come back; the site's menus go.
 *
 * Nothing is renamed or moved: the site's pages keep their addresses, and the store's page at "/" stays
 * as it was. The settings keep a revision before each (Settings → السجل).
 */
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/httpError.js";
import { cacheDel } from "../../lib/cache.js";
import { installedOf } from "../../lib/featureInstall.js";
import { mainLanguage } from "../../lib/translations.js";
import { triggerCmsRevalidate } from "../../lib/cmsRevalidate.js";
import { readSiteHome, type SiteHome } from "../../lib/siteHome.js";
import { getOrCreateSettings, keepRevision, triggerSettingsRevalidate } from "./settings.controller.js";

type Header = Record<string, unknown>;
const isObj = (v: unknown): v is Header => !!v && typeof v === "object" && !Array.isArray(v);
const headerOf = (raw: unknown): Header => (isObj(raw) ? { ...raw } : {});

const Word = z.string().trim().max(60);
const Link = z.object({ page: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,40}$/), label: z.object({ ar: Word.optional(), en: Word.optional(), he: Word.optional() }).strict() }).strict();
/** The site's menus: its pages by key, with their names in the three languages. */
export const SiteHomeBody = z.object({ header: z.array(Link).max(12), footer: z.array(Link).max(20), lang: z.enum(["ar", "en", "he"]).optional() }).strict();
export type SiteHomeBody = z.infer<typeof SiteHomeBody>;

/** The site's first page and its other pages, by their keys in its file. */
async function siteOf(featureId: string) {
  const feature = await prisma.feature.findUnique({ where: { id: featureId }, select: { id: true, name: true, enabled: true, template: true } });
  if (!feature) throw new AppError(404, "FEATURE_NOT_FOUND", "No such feature");
  const installed = installedOf(feature.template);
  const ids = installed?.ids.page ?? {};
  if (!ids.home) throw new AppError(400, "NOT_A_SITE", "Only a whole site has a first page to make the store's home");
  const rows = await prisma.page.findMany({ where: { id: { in: Object.values(ids) }, kind: "page" }, select: { id: true, name: true, slug: true, status: true } });
  const byKey = new Map(Object.entries(ids).flatMap(([key, id]) => {
    const row = rows.find((p) => p.id === id);
    return row ? [[key, row] as const] : [];
  }));
  return { feature, homeId: ids.home, byKey };
}

/** The shop reads the home and the menus afresh: the settings' cached copy goes first, so the page asked for next sees the new home. */
async function told(slugs: string[]) {
  await cacheDel("settings:public");
  triggerSettingsRevalidate();
  await triggerCmsRevalidate(["/", ...slugs]);
}

/**
 * For a feature's page: its first page (`homeId`: a whole site's, null for anything else), whether it is the
 * store's home, or which other site is.
 */
export async function siteHomeView(featureId: string, homeId: string | null): Promise<{ homeId: string | null; on: boolean; other: { id: string; name: string } | null }> {
  if (!homeId) return { homeId, on: false, other: null };
  const home = readSiteHome((await getOrCreateSettings()).header);
  if (!home) return { homeId, on: false, other: null };
  if (home.featureId === featureId) return { homeId, on: true, other: null };
  const other = await prisma.feature.findUnique({ where: { id: home.featureId }, select: { id: true, name: true } });
  return { homeId, on: false, other };
}

export async function makeSiteHome(featureId: string, body: SiteHomeBody, adminUserId: string | null) {
  const { feature, homeId, byKey } = await siteOf(featureId);
  const home = [...byKey.values()].find((p) => p.id === homeId);
  if (!home) throw new AppError(409, "SITE_NO_HOME", "The site's first page isn't there any more");
  if (!feature.enabled) throw new AppError(409, "SITE_OFF", "Switch the site on first: its pages are hidden while it is off");
  if (home.status !== "PUBLISHED") throw new AppError(409, "SITE_HOME_DRAFT", "Publish the site's first page first");

  let s = await getOrCreateSettings();
  const now = readSiteHome(s.header);
  if (now && now.featureId !== featureId) {
    await undoSiteHome(adminUserId);
    s = await getOrCreateSettings();
  } else if (now) return { home: home.slug, menus: { header: 0, footer: 0 }, left: [] as string[], already: true };

  const header = headerOf(s.header);
  const main = mainLanguage(header);
  const left = new Set<string>();
  const items = (links: SiteHomeBody["header"]) =>
    links.flatMap((l) => {
      const page = byKey.get(l.page);
      if (!page) return [];
      // A page that isn't published would open as one that isn't there.
      if (page.status !== "PUBLISHED") return left.add(page.name), [];
      const label = (l.label[main] || l.label.ar || l.label.en || l.label.he || "").trim();
      return label ? [{ label, href: page.id === homeId ? "/" : page.slug }] : [];
    });
  const top = items(body.header);
  const bottom = items(body.footer);
  // A menu set in the CMS settings would win over the site's: it is switched off while the site is the home.
  const cmsNav = !!top.length && isObj(header.cmsNav) && header.cmsNav.enabled === true;
  const stamp = `${new Date().toISOString().slice(0, 10)} ${Date.now().toString(36).slice(-4)}`;

  await keepRevision(s as unknown as Record<string, unknown>, ["header", "primaryNavId", "footerNavId"], adminUserId, "Site made the home");
  await prisma.$transaction(
    async (tx) => {
      const menu = async (location: "HEADER" | "FOOTER", list: Array<{ label: string; href: string }>) =>
        list.length ? (await tx.navigationMenu.create({ data: { name: `${feature.name.slice(0, 60)} · ${location === "HEADER" ? "header" : "footer"} · ${stamp}`, location, items: { create: list.map((it, order) => ({ ...it, order })) } }, select: { id: true } })).id : null;
      const menus = { header: await menu("HEADER", top), footer: await menu("FOOTER", bottom) };
      const record: SiteHome = { featureId, pageId: homeId, at: new Date().toISOString(), menus, before: { primaryNavId: s.primaryNavId ?? null, footerNavId: s.footerNavId ?? null, cmsNav } };
      const next: Header = { ...header, siteHome: record, ...(cmsNav ? { cmsNav: { ...(header.cmsNav as Header), enabled: false } } : {}) };
      await tx.siteSettings.update({ where: { id: s.id }, data: { header: next as never, ...(menus.header ? { primaryNavId: menus.header } : {}), ...(menus.footer ? { footerNavId: menus.footer } : {}) } });
    },
    { timeout: 30_000, maxWait: 10_000 },
  );
  await told([home.slug]);
  return { home: home.slug, menus: { header: top.length, footer: bottom.length }, left: [...left], already: false };
}

/** The store's own home and menus back. `featureId`: only if it is that feature that is the home (removing a site puts the home back first). */
export async function undoSiteHome(adminUserId: string | null, featureId?: string) {
  const s = await getOrCreateSettings();
  const was = readSiteHome(s.header);
  if (!was || (featureId && was.featureId !== featureId)) return { was: null as string | null };
  const header = headerOf(s.header);
  delete header.siteHome;
  if (was.before.cmsNav && isObj(header.cmsNav)) header.cmsNav = { ...header.cmsNav, enabled: true };
  // The menus before come back, unless the owner has put others in place since.
  const want = { primary: s.primaryNavId === was.menus.header ? was.before.primaryNavId : s.primaryNavId, footer: s.footerNavId === was.menus.footer ? was.before.footerNavId : s.footerNavId };
  await keepRevision(s as unknown as Record<string, unknown>, ["header", "primaryNavId", "footerNavId"], adminUserId, "Store's own home back");
  await prisma.$transaction(
    async (tx) => {
      // A menu deleted since: none then (the store's default menu for the place, as before any was set).
      const there = async (id: string | null) => (id && (await tx.navigationMenu.findUnique({ where: { id }, select: { id: true } })) ? id : null);
      const primaryNavId = await there(want.primary);
      const footerNavId = await there(want.footer);
      await tx.siteSettings.update({ where: { id: s.id }, data: { header: header as never, primaryNavId, footerNavId } });
      const gone = [was.menus.header, was.menus.footer].filter((id): id is string => !!id && id !== primaryNavId && id !== footerNavId);
      if (gone.length) await tx.navigationMenu.deleteMany({ where: { id: { in: gone } } });
    },
    { timeout: 30_000, maxWait: 10_000 },
  );
  const page = await prisma.page.findUnique({ where: { id: was.pageId }, select: { slug: true } });
  await told(page ? [page.slug] : []);
  return { was: was.featureId };
}
