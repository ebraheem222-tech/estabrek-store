import { createHash } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { cacheGet, cacheSet } from "../../lib/cache.js";
import type { NavigationItem, SiteSettings } from "@prisma/client";

const PUBLIC_SETTINGS_TTL_MS = 30_000;

/** Build a nested tree from a flat list of nav items */
function buildMenuTree(items: NavigationItem[]) {
  const byParent = new Map<string | null, NavigationItem[]>();
  for (const it of items) {
    const key = it.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(it);
    byParent.set(key, list);
  }
  const make = (parentId: string | null): any[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime())
      .map((it) => ({ ...it, children: make(it.id) }));
  return make(null);
}

/** Load a menu’s items and return as a nested tree */
export async function getMenuTreeById(menuId: string) {
  const items = await prisma.navigationItem.findMany({
    where: { menuId, isActive: true },
    orderBy: [{ parentId: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });
  return buildMenuTree(items);
}

/** Convenience: load a menu by location (HEADER/FOOTER/SECONDARY/CUSTOM + isDefault) */
export async function getMenuTreeByLocation(location: "HEADER" | "FOOTER" | "SECONDARY" | "CUSTOM") {
  const menu = await prisma.navigationMenu.findFirst({
    where: { location, isDefault: true },
  });
  if (!menu) return null;
  const tree = await getMenuTreeById(menu.id);
  return { menu, tree };
}

/** Get the single SiteSettings (if missing, create an empty one) */
export async function getOrCreateSiteSettings() {
  let s = await prisma.siteSettings.findFirst();
  if (!s) s = await prisma.siteSettings.create({ data: {} });
  return s;
}

/** Public settings payload: site + header/footer menu trees */
export async function getPublicSettings() {
  const cached = await cacheGet<any>("settings:public");
  if (cached) return cached;
  const s: SiteSettings = await getOrCreateSiteSettings();

  // If linked in settings, prefer those menus; otherwise fall back to default menus by location
  let primaryMenu = null as null | { menuId: string; tree: any[] };
  let footerMenu = null as null | { menuId: string; tree: any[] };

  if (s.primaryNavId) {
    primaryMenu = { menuId: s.primaryNavId, tree: await getMenuTreeById(s.primaryNavId) };
  } else {
    const m = await getMenuTreeByLocation("HEADER");
    if (m) primaryMenu = { menuId: m.menu.id, tree: m.tree };
  }

  if (s.footerNavId) {
    footerMenu = { menuId: s.footerNavId, tree: await getMenuTreeById(s.footerNavId) };
  } else {
    const m = await getMenuTreeByLocation("FOOTER");
    if (m) footerMenu = { menuId: m.menu.id, tree: m.tree };
  }

  const out = {
    site: {
      id: s.id,
      siteName: s.siteName,
      currencyCode: s.currencyCode,
      storeCountryCode: (s as any).storeCountryCode ?? "IL",
      logoUrl: s.logoUrl,
      faviconUrl: s.faviconUrl,
      announcement: {
        isActive: s.announcementIsActive,
        text: s.announcementText,
        linkUrl: s.announcementLinkUrl,
      },
      newsletter: {
        isActive: (s as any).newsletterIsActive,
        title: (s as any).newsletterTitle,
        text: (s as any).newsletterText,
        success: (s as any).newsletterSuccess,
      },
      header: s.header,
      footer: s.footer,
      scriptsHead: s.scriptsHead,
      scriptsBody: s.scriptsBody,
      customCss: s.customCss,
      contactEmail: s.contactEmail,
      contactPhone: s.contactPhone,
      checkoutMode: (s as any).checkoutMode ?? "WHATSAPP",
      ordersEmail: (s as any).ordersEmail ?? null,
      whatsappNumber: (s as any).whatsappNumber ?? null,
      stripeEnabled: (s as any).stripeEnabled ?? false,
      stripePublicKey: (s as any).stripePublicKey ?? null,
      paypalEnabled: (s as any).paypalEnabled ?? false,
      paypalClientId: (s as any).paypalClientId ?? null,
      customerAccountsEnabled: s.customerAccountsEnabled === true,
      stockAlertsEnabled: s.stockAlertsEnabled === true,
      // Maintenance: the storefront shows a "back soon" screen; the owner opens it with ?preview=<key> (only its hash is public).
      maintenance: s.maintenanceMode
        ? { on: true, message: s.maintenanceMessage ?? null, previewHash: s.maintenanceKey ? createHash("sha256").update(s.maintenanceKey).digest("hex") : null }
        : { on: false, message: null, previewHash: null },
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    },
    primaryMenu,
    footerMenu,
  };
  await cacheSet("settings:public", out, PUBLIC_SETTINGS_TTL_MS);
  return out;
}
