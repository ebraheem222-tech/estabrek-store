import { describe, expect, test } from "vitest";
import { STORY_LIMITS, StoryOrderInput, StoryReelInput, reelLive, reelProductIds, shopReels, slidesOf, type StoryReelRow } from "../lib/stories.js";
import { checkTree } from "../lib/pageTree.js";
import { groupsWritten } from "../lib/dbWrites.js";

// The shop's story circles (src/lib/stories.ts): what the admin may send, what the shop is given; no database needed.
const slide = (id: string, extra: Record<string, unknown> = {}) => ({ id, kind: "image", src: "https://res.cloudinary.com/x/image/upload/a.jpg", ...extra });
const row = (id: string, extra: Partial<StoryReelRow> = {}): StoryReelRow => ({ id, title: { ar: id }, cover: null, slides: [slide(`${id}-1`)], order: 0, isActive: true, startsAt: null, endsAt: null, ...extra });

describe("a reel as the admin sends it", () => {
  test("words, pictures and clips, a product or a link per slide, its times", () => {
    const ok = StoryReelInput.safeParse({
      title: { ar: "  وصل جديد ", en: "" },
      cover: "/uploads/cover.jpg",
      slides: [
        slide("a", { caption: { ar: "شال حرير" }, seconds: 6, productId: "cm1abc" }),
        { id: "b", kind: "video", src: "https://res.cloudinary.com/x/video/upload/b.mp4", poster: "https://res.cloudinary.com/x/image/upload/b.jpg", href: "/shop?sort=new", label: { ar: "شوفي الكل" } },
      ],
      startsAt: "2026-11-27T00:00:00.000Z",
      endsAt: "2026-11-30T21:59:00.000Z",
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.title).toEqual({ ar: "وصل جديد" });
  });

  test("no unsafe addresses, no slide twice, no more than the most, an end after its start", () => {
    const bad = (body: Record<string, unknown>) => !StoryReelInput.safeParse({ title: { ar: "x" }, slides: [], ...body }).success;
    expect(bad({ slides: [slide("a", { src: "javascript:alert(1)" })] })).toBe(true);
    expect(bad({ slides: [slide("a", { href: "javascript:alert(1)" })] })).toBe(true);
    expect(bad({ cover: "http://plain.example/a.jpg" })).toBe(true);
    expect(bad({ slides: [slide("a"), slide("a")] })).toBe(true);
    expect(bad({ slides: Array.from({ length: STORY_LIMITS.slides + 1 }, (_, i) => slide(`s${i}`)) })).toBe(true);
    expect(bad({ slides: [slide("a", { seconds: 1 })] })).toBe(true);
    expect(bad({ slides: [slide("a", { kind: "gif" })] })).toBe(true);
    expect(bad({ startsAt: "2026-12-01T00:00:00Z", endsAt: "2026-11-01T00:00:00Z" })).toBe(true);
    expect(bad({ startsAt: "next week" })).toBe(true);
    expect(StoryOrderInput.safeParse({ ids: ["a", "a"] }).success).toBe(false);
  });
});

describe("what the shop is given", () => {
  const now = Date.parse("2026-11-28T12:00:00Z");
  test("live reels in the owner's order: switched on, inside their times, with a slide", () => {
    const reels = shopReels([
      row("third", { order: 2 }),
      row("first", { order: 0 }),
      row("off", { order: 1, isActive: false }),
      row("soon", { order: 1, startsAt: new Date("2026-12-01T00:00:00Z") }),
      row("over", { order: 1, endsAt: new Date("2026-11-27T00:00:00Z") }),
      row("empty", { order: 1, slides: [] }),
      row("broken", { order: 1, slides: [{ id: "x", kind: "image", src: "javascript:1" }] }),
      row("friday", { order: 1, startsAt: new Date("2026-11-27T00:00:00Z"), endsAt: new Date("2026-11-30T00:00:00Z") }),
    ], now);
    expect(reels.map((r) => r.id)).toEqual(["first", "friday", "third"]);
    expect(reels[1].endsAt).toBe("2026-11-30T00:00:00.000Z");
  });

  test("the circle's picture: its own, else the first slide's picture or clip poster", () => {
    expect(shopReels([row("a", { cover: "/c.jpg" })], now)[0].cover).toBe("/c.jpg");
    expect(shopReels([row("b")], now)[0].cover).toBe("https://res.cloudinary.com/x/image/upload/a.jpg");
    expect(shopReels([row("c", { slides: [{ id: "v", kind: "video", src: "https://x.test/v.mp4", poster: "https://x.test/p.jpg" }] })], now)[0].cover).toBe("https://x.test/p.jpg");
  });

  test("a kept slide that no longer passes drops out; the products the reels point at, once each", () => {
    expect(slidesOf([slide("a"), { id: "b", kind: "image" }, "x"]).map((s) => s.id)).toEqual(["a"]);
    expect(reelLive(row("a", { isActive: true }), now)).toBe(true);
    expect(reelProductIds([{ slides: slidesOf([slide("a", { productId: "p1" }), slide("b", { productId: "p1" }), slide("c")]) }, { slides: slidesOf([slide("d", { productId: "p2" })]) }])).toEqual(["p1", "p2"]);
  });

  test("a reel's writes clear the pages' caches; its counts don't", () => {
    expect(groupsWritten('UPDATE "public"."StoryReel" SET "order" = $1')).toEqual(["cms"]);
    expect(groupsWritten('INSERT INTO "public"."StoryStat" ("reelId") VALUES ($1) ON CONFLICT DO UPDATE')).toEqual([]);
  });
});

describe("the page editor's story bar", () => {
  const tree = (props: unknown) => checkTree({ version: 1, root: { id: "page", type: "page", children: [{ id: "s", type: "section", children: [{ id: "bar", type: "storyBar", props }] }] } });
  test("all the live reels or some by id, in a look and a size", () => {
    expect(tree({}).ok).toBe(true);
    expect(tree({ reels: ["cm1", "cm2"], look: "cards", size: "l", names: false, label: { ar: "قصصنا" } }).ok).toBe(true);
    expect(tree({ reels: ["cm1", "cm1"] }).ok).toBe(false);
    expect(tree({ look: "hexagons" }).ok).toBe(false);
  });
});
