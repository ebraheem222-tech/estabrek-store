/**
 * A whole site's settings changed by its owner (lib/siteSettings.ts): from the site's page in ميزاتي, or from a
 * quick action in its panel (lib/sitePanel.ts). Every value is checked against what the site's file declares;
 * then its functions read them from their next run and its pages are drawn again on the shop.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { AppError } from "../utils/httpError.js";
import { declsOf, readValues, type Values } from "./siteSettings.js";
import { installedOf } from "./featureInstall.js";
import { forgetFeatureGate } from "./featureGate.js";
import { forgetTriggers } from "./fnTriggers.js";
import { forgetTebex } from "./tebex.js";
import { triggerCmsRevalidate } from "./cmsRevalidate.js";

/** The named settings changed (the others stay): 404 no such feature, 409 it has none, 400 with each problem by key. */
export async function saveSiteSettings(featureId: string, asked: unknown): Promise<Values> {
  const feature = await prisma.feature.findUnique({ where: { id: featureId }, select: { id: true, template: true, settings: true, items: { where: { kind: "page" }, select: { refId: true } } } });
  if (!feature) throw new AppError(404, "FEATURE_NOT_FOUND", "No such feature");
  const decls = declsOf(installedOf(feature.template)?.file.settings);
  if (!decls.length) throw new AppError(409, "NO_SETTINGS", "This feature has no settings");
  const read = readValues(decls, feature.settings, asked);
  if (!read.ok) throw new AppError(400, "BAD_SETTINGS", "Some settings can't take these values", { problems: read.problems });
  await prisma.feature.update({ where: { id: feature.id }, data: { settings: read.values as Prisma.InputJsonValue } });
  forgetFeatureGate();
  forgetTriggers();
  // A Tebex token just set or changed: its webstore is read again.
  forgetTebex();
  const slugs = (await prisma.page.findMany({ where: { id: { in: feature.items.map((i) => i.refId) }, kind: "page" }, select: { slug: true } })).map((p) => p.slug);
  if (slugs.length) await triggerCmsRevalidate(slugs);
  return read.values;
}
