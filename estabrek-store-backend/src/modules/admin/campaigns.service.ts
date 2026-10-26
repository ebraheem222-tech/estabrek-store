/**
 * Seasons (admin → البيع الذكي → المواسم): Ramadan, Eid… The owner sets a start
 * and an end, a theme and / or a percent off (on everything, some categories or
 * some products). The background job "campaigns" (src/jobs.ts, every minute)
 * starts it and ends it:
 *   start  the theme switches (the one before is kept); each size without a sale
 *          of its own gets the season's sale, with the season's end as its end, so
 *          the prices go back on time even if the server is off at that moment.
 *   end    the theme goes back (unless the owner changed it during the season);
 *          the season's prices are put back (sizes changed since stay as they are).
 * Both are kept in the settings history / the price changes list.
 */
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/httpError.js";
import { getOrCreateSettings } from "./settings.controller.js";
import { setThemePreset, themeOf } from "./siteChanges.js";
import { applyPriceAction, restorePriceAction } from "./selling.service.js";

const DAY = 86400_000;
export const CAMPAIGN_MAX_DAYS = 120;

export type CampaignInput = {
  name: string;
  startsAt: Date;
  endsAt: Date;
  themePresetId: string | null;
  percentOff: number | null;
  categoryIds: string[];
  productIds: string[];
};

type CampaignRow = NonNullable<Awaited<ReturnType<typeof prisma.campaign.findUnique>>>;

/** The checks that need the database: no two seasons with a theme at the same time. */
export async function checkCampaign(input: CampaignInput, now = Date.now(), exceptId?: string) {
  if (input.endsAt.getTime() <= input.startsAt.getTime()) throw new AppError(400, "CAMPAIGN_ENDS_BEFORE_START");
  if (input.endsAt.getTime() <= now) throw new AppError(400, "CAMPAIGN_ALREADY_OVER");
  if (input.endsAt.getTime() - input.startsAt.getTime() > CAMPAIGN_MAX_DAYS * DAY) throw new AppError(400, "CAMPAIGN_TOO_LONG");
  if (!input.themePresetId && !input.percentOff) throw new AppError(400, "CAMPAIGN_DOES_NOTHING");
  if (input.themePresetId) {
    const clash = await prisma.campaign.findFirst({
      where: {
        id: exceptId ? { not: exceptId } : undefined,
        status: { in: ["scheduled", "running"] },
        themePresetId: { not: null },
        startsAt: { lt: input.endsAt },
        endsAt: { gt: input.startsAt },
      },
      select: { id: true, name: true },
    });
    if (clash) throw new AppError(409, "CAMPAIGN_THEME_OVERLAP", `Overlaps ${clash.name}`, { campaignId: clash.id, name: clash.name });
  }
}

/** The products a season's prices apply to: all active ones, or the chosen categories (with their sub-categories) and products. */
export async function campaignProducts(c: Pick<CampaignInput, "categoryIds" | "productIds">) {
  if (!c.categoryIds.length && !c.productIds.length) return prisma.product.findMany({ where: { isActive: true }, select: { id: true } });
  const cats = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const all = new Set(c.categoryIds);
  let grew = true;
  while (grew) {
    grew = false;
    for (const k of cats) if (k.parentId && all.has(k.parentId) && !all.has(k.id)) (all.add(k.id), (grew = true));
  }
  return prisma.product.findMany({ where: { isActive: true, OR: [{ id: { in: c.productIds } }, { categoryId: { in: [...all] } }] }, select: { id: true } });
}

/** What a season would change, before saving it. */
export async function previewCampaign(c: Pick<CampaignInput, "categoryIds" | "productIds" | "percentOff">, now = Date.now()) {
  const ids = (await campaignProducts(c)).map((p) => p.id);
  if (!c.percentOff || !ids.length) return { products: ids.length, sizes: 0, onSaleAlready: 0 };
  const variants = await prisma.productVariant.findMany({
    where: { item: { isActive: true, productId: { in: ids } } },
    select: { salePrice: true, saleStartsAt: true, saleEndsAt: true },
  });
  const at = new Date(now);
  const onSale = variants.filter((v) => v.salePrice != null && Number(v.salePrice) > 0 && (!v.saleEndsAt || v.saleEndsAt >= at)).length;
  return { products: ids.length, sizes: variants.length, onSaleAlready: onSale };
}

const logOf = (c: Pick<CampaignRow, "log">) => (c.log && typeof c.log === "object" ? (c.log as Record<string, unknown>) : {});

export async function startCampaign(c: CampaignRow, now = Date.now()) {
  let themeBefore = c.themeBefore;
  // Kept as soon as the theme switches: a start cut off halfway (a restart) can't
  // take the season's own theme for the one to go back to.
  if (c.themePresetId && !logOf(c).themeSwitched) {
    themeBefore = await setThemePreset(c.themePresetId, `بداية «${c.name}»`);
    await prisma.campaign.update({ where: { id: c.id }, data: { themeBefore, log: { ...logOf(c), themeSwitched: true } } });
  }
  let products = 0;
  let sizes = 0;
  let leftAlone = 0;
  if (c.percentOff) {
    for (const p of await campaignProducts(c)) {
      const r = await prisma.$transaction((tx) =>
        applyPriceAction(tx, { productId: p.id, rule: null, action: { kind: "discount", percent: c.percentOff!, saleDays: 0 }, campaignId: c.id, from: c.startsAt.getTime(), to: c.endsAt.getTime() }, now),
      );
      if (r.changed) products += 1;
      sizes += r.changed;
      leftAlone += r.leftAlone;
    }
  }
  return prisma.campaign.update({
    where: { id: c.id },
    data: { status: "running", startedAt: new Date(now), themeBefore, log: { themeSwitched: !!c.themePresetId, start: { at: new Date(now).toISOString(), products, sizes, leftAlone, theme: !!c.themePresetId } } },
  });
}

export async function endCampaign(c: CampaignRow, status: "ended" | "canceled", now = Date.now()) {
  let themeBack = false;
  if (c.status === "running" && c.themePresetId) {
    const s = await getOrCreateSettings();
    // Only if it's still the season's theme: a theme the owner chose during it stays.
    if (themeOf(s.header).presetId === c.themePresetId) {
      await setThemePreset(c.themeBefore, `نهاية «${c.name}»`);
      themeBack = true;
    }
  }
  let restored = 0;
  let changedSince = 0;
  const actions = await prisma.priceAction.findMany({ where: { campaignId: c.id, status: "applied" }, select: { id: true } });
  for (const a of actions) {
    const r = await prisma.$transaction((tx) => restorePriceAction(tx, a.id, "ended", now));
    restored += r.restored;
    changedSince += r.changedSince;
  }
  const log = logOf(c);
  return prisma.campaign.update({
    where: { id: c.id },
    data: { status, endedAt: new Date(now), log: { ...log, end: { at: new Date(now).toISOString(), restored, changedSince, themeBack, early: now < c.endsAt.getTime() } } },
  });
}

/** The background job: start what's due, end what's over. */
export async function runCampaigns(now = Date.now()) {
  const at = new Date(now);
  let started = 0;
  let ended = 0;
  let missed = 0;
  const due = await prisma.campaign.findMany({ where: { status: "scheduled", startsAt: { lte: at } }, orderBy: { startsAt: "asc" } });
  for (const c of due) {
    if (c.endsAt <= at) {
      // The server was off the whole season: nothing to switch on.
      await prisma.campaign.update({ where: { id: c.id }, data: { status: "ended", endedAt: at, log: { missed: true } } });
      missed += 1;
      continue;
    }
    await startCampaign(c, now);
    started += 1;
  }
  const over = await prisma.campaign.findMany({ where: { status: "running", endsAt: { lte: at } } });
  for (const c of over) {
    await endCampaign(c, "ended", now);
    ended += 1;
  }
  return { started, ended, missed };
}
