/**
 * Admin → القصص: the shop's story circles (src/lib/stories.ts). The list with each reel's numbers, a new reel, a whole
 * reel changed, one taken away, and the order. Behind the pages' permissions (admin.routes.ts). Every change tells the
 * shop to draw its story bars again (its cached pages carry the "cms:stories" tag).
 */
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import { revalidateStorefront } from "../../lib/storefrontRevalidate.js";
import { STORY_LIMITS, StoryOrderInput, StoryReelInput, slidesOf, wordsOf, type StoryReelInputT } from "../../lib/stories.js";

const r = Router();

/** A reel as the admin shows it: its words and slides checked again, with its numbers. */
const viewOf = (row: { id: string; title: unknown; cover: string | null; slides: unknown; order: number; isActive: boolean; startsAt: Date | null; endsAt: Date | null; createdAt: Date; updatedAt: Date; stat?: { views: number; taps: number } | null }) => ({
  id: row.id,
  title: wordsOf(row.title, 40),
  cover: row.cover,
  slides: slidesOf(row.slides),
  order: row.order,
  isActive: row.isActive,
  startsAt: row.startsAt?.toISOString() ?? null,
  endsAt: row.endsAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  views: row.stat?.views ?? 0,
  taps: row.stat?.taps ?? 0,
});

const dataOf = (b: StoryReelInputT) => ({
  title: b.title,
  cover: b.cover ?? null,
  slides: b.slides,
  ...(typeof b.isActive === "boolean" ? { isActive: b.isActive } : {}),
  startsAt: b.startsAt ? new Date(b.startsAt) : null,
  endsAt: b.endsAt ? new Date(b.endsAt) : null,
});

/** The shop draws its story bars again (its pages that hold one, and the stories' own answer). */
function refreshShop() {
  void revalidateStorefront({ tags: ["cms:stories"] }).catch(() => undefined);
}

// GET /v1/admin/stories
r.get("/", asyncHandler(async (_req, res) => {
  const rows = await prisma.storyReel.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }], include: { stat: true }, take: STORY_LIMITS.reels });
  res.json({ reels: rows.map(viewOf), limits: STORY_LIMITS });
}));

// POST /v1/admin/stories — a new reel, last in the order.
r.post("/", validate({ body: StoryReelInput }), asyncHandler(async (req, res) => {
  const count = await prisma.storyReel.count();
  if (count >= STORY_LIMITS.reels) return res.status(400).json({ error: `At most ${STORY_LIMITS.reels} stories` });
  const last = await prisma.storyReel.aggregate({ _max: { order: true } });
  const row = await prisma.storyReel.create({ data: { ...dataOf(req.body as StoryReelInputT), order: (last._max.order ?? -1) + 1 }, include: { stat: true } });
  refreshShop();
  res.status(201).json(viewOf(row));
}));

// POST /v1/admin/stories/order — { ids } in the new order (each reel once).
r.post("/order", validate({ body: StoryOrderInput }), asyncHandler(async (req, res) => {
  const ids = (req.body as { ids: string[] }).ids;
  const found = await prisma.storyReel.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (found.length !== ids.length) return res.status(400).json({ error: "A story that isn't there" });
  await prisma.$transaction(ids.map((id, order) => prisma.storyReel.update({ where: { id }, data: { order } })));
  refreshShop();
  res.json({ ok: true });
}));

// PATCH /v1/admin/stories/:id — the whole reel as the admin has it now.
r.patch("/:id", validate({ body: StoryReelInput }), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const had = await prisma.storyReel.findUnique({ where: { id }, select: { id: true } });
  if (!had) return res.status(404).json({ error: "Not found" });
  const row = await prisma.storyReel.update({ where: { id }, data: dataOf(req.body as StoryReelInputT), include: { stat: true } });
  refreshShop();
  res.json(viewOf(row));
}));

// DELETE /v1/admin/stories/:id
r.delete("/:id", asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const gone = await prisma.storyReel.deleteMany({ where: { id } });
  if (!gone.count) return res.status(404).json({ error: "Not found" });
  refreshShop();
  res.json({ ok: true });
}));

export default r;
