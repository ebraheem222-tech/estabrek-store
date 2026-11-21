/**
 * The shop's story circles (src/lib/stories.ts): the live reels in the owner's order (cached with the pages), and a
 * shopper's browser telling that a reel was opened or its product or link pressed (counted apart, so the pages'
 * caches stay). Mounted at /v1/storefront/stories.
 */
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { cacheResponse } from "../../middleware/responseCache.js";
import { STORY_EVENTS, shopReels } from "../../lib/stories.js";

const r = Router();

// GET /v1/storefront/stories
r.get("/", cacheResponse("pages"), asyncHandler(async (_req, res) => {
  const rows = await prisma.storyReel.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, cover: true, slides: true, order: true, isActive: true, startsAt: true, endsAt: true, updatedAt: true },
  });
  res.json({ reels: shopReels(rows) });
}));

/**
 * One count per browser address, reel and event in half an hour: a page left open or reloaded doesn't count again.
 * Kept in this server's memory (a restart forgets, which only means a second count).
 */
const SEEN_MS = 30 * 60_000;
const seen = new Map<string, number>();
function firstTime(key: string, now = Date.now()): boolean {
  const at = seen.get(key);
  if (at !== undefined && now - at < SEEN_MS) return false;
  if (seen.size > 20_000) {
    for (const [k, t] of seen) if (now - t >= SEEN_MS) seen.delete(k);
    if (seen.size > 20_000) seen.clear();
  }
  seen.set(key, now);
  return true;
}

// POST /v1/storefront/stories/:id/view | /:id/tap (a beacon: no body, no answer to wait for)
r.post("/:id/:event", asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const event = String(req.params.event) as (typeof STORY_EVENTS)[number];
  if (!/^[\w-]{1,64}$/.test(id) || !(STORY_EVENTS as readonly string[]).includes(event)) return res.status(400).json({ error: "Bad request" });
  if (!firstTime(`${req.ip}|${id}|${event}`)) return res.status(204).end();
  const reel = await prisma.storyReel.findUnique({ where: { id }, select: { id: true } });
  if (!reel) return res.status(404).json({ error: "Not found" });
  const add = event === "view" ? { views: { increment: 1 } } : { taps: { increment: 1 } };
  await prisma.storyStat.upsert({ where: { reelId: id }, create: { reelId: id, views: event === "view" ? 1 : 0, taps: event === "tap" ? 1 : 0 }, update: add });
  res.status(204).end();
}));

export default r;
