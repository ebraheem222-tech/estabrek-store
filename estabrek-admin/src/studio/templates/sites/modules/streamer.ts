/**
 * A streamer's own site's pieces (wave G7c2 of docs/sites-300-plan.ar.md), around its live status (their Twitch channel,
 * read with the site's own keys: live or not, how many watch, the stream's title and game):
 *
 *   «جدول البث»  the week's streams: each one's day, hour, game and what's on, in the week's order
 *   «الكليبات»   the best moments: each clip's picture, its link (Twitch or YouTube), its game and day, newest first
 *   «الرعاة»     those who back the stream: each one's logo and link, a few words, and the followers' discount code
 *
 * Each is a table the owner edits, a page, and a band on the home page.
 */
import { B, CARD, H, IMG, P, SEC, STACK, eyebrow, pop, withSkin, type Ctx, type N } from "../../build";
import type { W } from "../../words";
import { CLIPS_W, SCHED_W, SPONSORS_W } from "../siteWords";
import { LIST, T, bound, f, head, pageHead, picOf, plainPic, still, type Built, type Part, type SiteModule } from "./kit";

const plain = (v: string) => ({ ar: v, en: v, he: v });
const allButton = (k: Ctx, label: W, href: string) => STACK(k, [B(k, label, href, "outline")], { direction: "row", justify: "center", margin: [32, 0, 0, 0] });

/* ---------------- The week's streams ---------------- */

const DAYS: Array<[string, W]> = [["sat", SCHED_W.sat], ["sun", SCHED_W.sun], ["mon", SCHED_W.mon], ["tue", SCHED_W.tue], ["wed", SCHED_W.wed], ["thu", SCHED_W.thu], ["fri", SCHED_W.fri]];

/** A stream of the week, as a line: its day and hour, what's on and its game. */
function slotCard(k: Ctx, b: Built): N {
  const s = b.use.schedule!.rows[0];
  const day = DAYS.find(([id]) => id === s?.day)?.[1] ?? DAYS[0][1];
  return CARD(k, [
    STACK(k, [
      STACK(k, [bound(P(k, day, { ...still, quiet: false, style: { size: 16, weight: 800, color: pop(k) } }), { text: "day" }), bound(P(k, plain(s?.time ?? "20:00"), { ...still, quiet: false, style: { size: 15, weight: 600 } }), { text: "time" })], { gap: 2, width: "140px" }),
      STACK(k, [bound(H(k, s?.title ?? SCHED_W.title, 4, still), { text: "title" }), bound(P(k, s?.game ?? SCHED_W.game, { ...still, style: { size: 15 } }), { text: "game" })], { gap: 2 }),
    ], { direction: "row", gap: 20, align: "center", wrap: true }),
  ], { gap: 0, pad: [16, 22, 16, 22] });
}
const week = (k: Ctx, b: Built) => LIST(k, "schedule", slotCard(k, b), { columns: 1, limit: 14, empty: SCHED_W.empty });
export const scheduleBand = (b: Built): Part => (c) => {
  const k = withSkin(c, "surface");
  return SEC(k, [head(k, b.use.schedule!.title, SCHED_W.bandSub), STACK(k, [week(k, b)], { maxWidth: "820px", width: "100%", self: "center" })], { name: b.use.schedule!.title });
};
const weekPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [STACK(k, [week(k, b)], { maxWidth: "820px", width: "100%", self: "center" })], { name: SCHED_W.all });
};

export const SCHEDULE: SiteModule = {
  key: "schedule",
  name: SCHED_W.name,
  note: SCHED_W.note,
  pages: (bp) => [{ key: "schedule", slug: "/schedule", order: 17, name: bp.modules.schedule!.title, seo: bp.modules.schedule!.sub, parts: (b) => [pageHead(b.use.schedule!.title, b.use.schedule!.sub, "soft"), weekPart(b)] }],
  tables: (b) => [{
    key: "schedule",
    slug: "schedule",
    name: SCHED_W.name,
    fields: [f.select("day", SCHED_W.day, DAYS, { default: "sat" }), { ...f.text("time", SCHED_W.time, { max: 5 }), help: SCHED_W.timeHelp }, f.text("title", SCHED_W.title, { required: true, max: 80 }), f.text("game", SCHED_W.game, { max: 60 })],
    rows: b.use.schedule!.rows.map((r) => ({ data: { day: r.day, time: plain(r.time), title: r.title, game: r.game } })),
  }],
  counts: (bp) => ({ tables: 1, rows: bp.modules.schedule!.rows.length }),
  panel: () => ({ lists: [{ kind: "view", key: "scheduleAll", title: SCHED_W.name, table: T("schedule"), columns: ["day", "time", "title", "game"] }] }),
};

/* ---------------- Clips ---------------- */

/** A clip: its picture (opening it), its name, its game and day, and the way to watch it. */
function clipCard(k: Ctx, b: Built): N {
  const c = b.use.clips!.rows[0];
  const watch = B(k, CLIPS_W.watch, "#", "link", still);
  return CARD(k, [
    bound(IMG(k, c?.title ?? CLIPS_W.title, { aspect: "16 / 9", radius: 14, motion: false }), { src: "picture", alt: "title", href: "link" }),
    bound(H(k, c?.title ?? CLIPS_W.title, 4, still), { text: "title" }),
    STACK(k, [bound(P(k, c?.game ?? CLIPS_W.game, { ...still, quiet: false, style: { size: 14, weight: 600, color: pop(k) } }), { text: "game" }), bound(P(k, plain(c?.date ?? "2026-11-20"), { ...still, style: { size: 14 } }), { text: "date" })], { direction: "row", gap: 10, wrap: true }),
    bound({ ...watch, props: { ...watch.props, newTab: true } }, { href: "link" }),
  ], { gap: 10, pad: [16, 16, 20, 16] });
}
const newest = [{ field: "date", dir: "desc" as const }];
export const clipsBand = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [head(k, b.use.clips!.title, CLIPS_W.bandSub), LIST(k, "clips", clipCard(k, b), { columns: 3, limit: 3, by: newest, empty: CLIPS_W.empty }), allButton(k, CLIPS_W.all, b.slugs.clips)], { name: b.use.clips!.title });
};
const clipsPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [LIST(k, "clips", clipCard(k, b), { columns: 3, limit: 36, by: newest, empty: CLIPS_W.empty })], { name: CLIPS_W.all });
};

export const CLIPS: SiteModule = {
  key: "clips",
  name: CLIPS_W.name,
  note: CLIPS_W.note,
  pages: (bp) => [{ key: "clips", slug: "/clips", order: 19, name: bp.modules.clips!.title, seo: bp.modules.clips!.sub, parts: (b) => [pageHead(b.use.clips!.title, b.use.clips!.sub, "soft"), clipsPart(b)] }],
  tables: (b) => [{
    key: "clips",
    slug: "clips",
    name: CLIPS_W.clips,
    fields: [f.text("title", CLIPS_W.title, { required: true, max: 100 }), { ...f.link("link", CLIPS_W.link), help: CLIPS_W.linkHelp }, f.text("game", CLIPS_W.game, { max: 60 }), f.date("date", CLIPS_W.date), f.image("picture", CLIPS_W.picture)],
    rows: b.use.clips!.rows.map((r, i) => ({ slug: r.slug, data: { title: r.title, link: r.link, game: r.game, date: r.date, picture: picOf(b.bp, i) } })),
  }],
  counts: (bp) => ({ tables: 1, rows: bp.modules.clips!.rows.length }),
  panel: () => ({ lists: [{ kind: "view", key: "clipsAll", title: CLIPS_W.all, table: T("clips"), columns: ["title", "game", "date", "link"], sort: { field: "date", dir: "desc" }, limit: 50 }] }),
};

/* ---------------- Sponsors ---------------- */

/** A sponsor: their logo (opening their site), their name and words, the followers' code, and the way to them. */
function sponsorCard(k: Ctx, b: Built): N {
  const s = b.use.sponsors!.rows[0];
  const visit = B(k, SPONSORS_W.visit, "#", "outline", still);
  return CARD(k, [
    bound(IMG(k, plain(s?.name ?? "Sponsor"), { aspect: "3 / 2", radius: 14, motion: false }), { src: "logo", alt: "name", href: "link" }),
    bound(H(k, plain(s?.name ?? "Sponsor"), 4, still), { text: "name" }),
    bound(P(k, s?.line ?? SPONSORS_W.line, { ...still, style: { size: 15 } }), { text: "line" }),
    STACK(k, [eyebrow(k, SPONSORS_W.codeLabel, still), bound(P(k, plain(s?.code ?? "CODE"), { ...still, quiet: false, style: { size: 18, weight: 800, letterSpacing: 1 } }), { text: "code" })], { direction: "row", gap: 8, align: "center", wrap: true }),
    bound({ ...visit, props: { ...visit.props, newTab: true } }, { href: "link" }),
  ], { gap: 10, pad: [16, 16, 20, 16] });
}
export const sponsorsBand = (b: Built): Part => (c) => {
  const k = withSkin(c, "surface");
  return SEC(k, [head(k, b.use.sponsors!.title, SPONSORS_W.bandSub), LIST(k, "sponsors", sponsorCard(k, b), { columns: Math.min(3, Math.max(1, b.use.sponsors!.rows.length)), limit: 12, empty: SPONSORS_W.empty })], { name: b.use.sponsors!.title });
};

export const SPONSORS: SiteModule = {
  key: "sponsors",
  name: SPONSORS_W.name,
  note: SPONSORS_W.note,
  tables: (b) => [{
    key: "sponsors",
    slug: "sponsors",
    name: SPONSORS_W.sponsors,
    fields: [f.text("name", SPONSORS_W.sponsor, { required: true, max: 60 }), f.image("logo", SPONSORS_W.logo), f.link("link", SPONSORS_W.link), f.text("code", SPONSORS_W.code, { max: 30 }), f.long("line", SPONSORS_W.line, { max: 200 })],
    rows: b.use.sponsors!.rows.map((r, i) => ({ data: { name: plain(r.name), logo: plainPic(i + 3), link: r.link, code: plain(r.code), line: r.line } })),
  }],
  counts: (bp) => ({ tables: 1, rows: bp.modules.sponsors!.rows.length }),
  panel: () => ({ lists: [{ kind: "view", key: "sponsorsAll", title: SPONSORS_W.sponsors, table: T("sponsors"), columns: ["name", "code", "link"] }] }),
};
