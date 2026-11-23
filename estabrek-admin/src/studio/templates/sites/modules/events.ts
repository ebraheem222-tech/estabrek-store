/**
 * A community's events («الفعاليات», wave G7c of docs/sites-300-plan.ar.md): game nights, tournaments, watch parties,
 * and a clan's matches with who against, how they ended and the score. The coming ones in the order of their days and
 * hours (the list sorts by the table's own fields), the results under them, newest first. An event whose day passed
 * becomes «done» by itself every night (a function on the store's clock); the staff write a match's result. The panel
 * has them on a calendar.
 */
import { B, CARD, H, P, SEC, STACK, eyebrow, pop, withSkin, type Ctx, type N } from "../../build";
import type { W } from "../../words";
import { EVENTS_W } from "../siteWords";
import { LIST, T, bound, f, head, pageHead, still, type Built, type Part, type SiteModule } from "./kit";

const STATES: Array<[string, W]> = [["upcoming", EVENTS_W.upcoming], ["done", EVENTS_W.done], ["cancelled", EVENTS_W.cancelled]];
const RESULTS: Array<[string, W]> = [["win", EVENTS_W.win], ["loss", EVENTS_W.loss], ["draw", EVENTS_W.draw]];
const plain = (v: string) => ({ ar: v, en: v, he: v });
const dash = plain("—");
const coming = [{ field: "status", op: "is", value: "upcoming" }];
const happened = [{ field: "status", op: "is", value: "done" }];
/** The coming ones: the nearest day first, then its hour. */
const soonest = [{ field: "date", dir: "asc" as const }, { field: "time", dir: "asc" as const }];
const latest = [{ field: "date", dir: "desc" as const }, { field: "time", dir: "desc" as const }];

/** A coming event: its day and hour, its kind, its name, who against (a match), where, and what it is. */
function eventCard(k: Ctx, b: Built): N {
  const e = b.use.events!;
  const first = e.rows[0];
  const kind = e.kinds.find(([id]) => id === first?.kind)?.[1] ?? e.kinds[0][1];
  return CARD(k, [
    STACK(k, [
      bound(P(k, plain(first?.date ?? "2026-12-05"), { ...still, quiet: false, style: { size: 15, weight: 700, color: pop(k) } }), { text: "date" }),
      bound(P(k, plain(first?.time ?? "21:00"), { ...still, quiet: false, style: { size: 15, weight: 700 } }), { text: "time" }),
    ], { direction: "row", gap: 10, align: "center", wrap: true }),
    bound(eyebrow(k, kind, still), { text: "kind" }),
    bound(H(k, first?.title ?? EVENTS_W.title, 4, still), { text: "title" }),
    ...(e.matches ? [STACK(k, [P(k, EVENTS_W.vs, { ...still, style: { size: 15 } }), bound(P(k, dash, { ...still, quiet: false, style: { size: 15, weight: 600 } }), { text: "opponent" })], { direction: "row", gap: 6, align: "center" })] : []),
    bound(P(k, first?.where ?? EVENTS_W.where, { ...still, style: { size: 15 } }), { text: "where" }),
    bound(P(k, first?.text ?? EVENTS_W.text, { ...still, style: { size: 15 } }), { text: "text" }),
  ], { gap: 8, pad: [20, 22, 20, 22] });
}
/** A match that happened: its day, its name, who against, how it ended and the score. */
function resultCard(k: Ctx, b: Built): N {
  const done = b.use.events!.rows.find((r) => r.done) ?? b.use.events!.rows[0];
  return CARD(k, [
    STACK(k, [bound(P(k, plain(done?.date ?? "2026-11-20"), { ...still, style: { size: 14 } }), { text: "date" }), bound(P(k, dash, { ...still, quiet: false, style: { size: 15, weight: 800, color: pop(k) } }), { text: "result" })], { direction: "row", justify: "between", align: "center", gap: 10 }),
    bound(H(k, done?.title ?? EVENTS_W.title, 4, still), { text: "title" }),
    STACK(k, [P(k, EVENTS_W.vs, { ...still, style: { size: 15 } }), bound(P(k, dash, { ...still, quiet: false, style: { size: 15, weight: 600 } }), { text: "opponent" })], { direction: "row", gap: 6, align: "center" }),
    bound(P(k, dash, { ...still, quiet: false, style: { size: 26, weight: 800 } }), { text: "score" }),
  ], { gap: 8, pad: [20, 22, 20, 22] });
}
/** An event that happened (not a clan's: no score). */
function pastCard(k: Ctx, b: Built): N {
  const done = b.use.events!.rows.find((r) => r.done) ?? b.use.events!.rows[0];
  return CARD(k, [bound(P(k, plain(done?.date ?? "2026-11-20"), { ...still, style: { size: 14 } }), { text: "date" }), bound(H(k, done?.title ?? EVENTS_W.title, 4, still), { text: "title" }), bound(P(k, done?.text ?? EVENTS_W.text, { ...still, style: { size: 15 } }), { text: "text" })], { gap: 8, pad: [20, 22, 20, 22], opacity: 0.8 });
}

const comingList = (k: Ctx, b: Built, limit: number, columns: number) => LIST(k, "events", eventCard(k, b), { columns, limit, where: coming, by: soonest, empty: EVENTS_W.empty });
const comingPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [head(k, EVENTS_W.coming, EVENTS_W.comingSub), comingList(k, b, 24, 2)], { name: EVENTS_W.coming });
};
const resultsPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "surface");
  const matches = b.use.events!.matches;
  return SEC(k, [head(k, matches ? EVENTS_W.results : EVENTS_W.past, matches ? EVENTS_W.resultsSub : undefined), LIST(k, "events", matches ? resultCard(k, b) : pastCard(k, b), { columns: 3, limit: matches ? 12 : 6, where: happened, by: latest, empty: EVENTS_W.noResults })], { name: matches ? EVENTS_W.results : EVENTS_W.past });
};
/** On the home page: the next three, and the way to all of them. */
export const eventsBand = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [head(k, b.use.events!.title, EVENTS_W.bandSub), comingList(k, b, 3, 3), STACK(k, [B(k, EVENTS_W.all, b.slugs.events, "outline")], { direction: "row", justify: "center", margin: [32, 0, 0, 0] })], { name: b.use.events!.title });
};

export const EVENTS: SiteModule = {
  key: "events",
  name: EVENTS_W.name,
  note: EVENTS_W.note,
  pages: (bp) => [{ key: "events", slug: "/events", order: 16, name: bp.modules.events!.title, seo: bp.modules.events!.sub, parts: (b) => [pageHead(b.use.events!.title, b.use.events!.sub, "soft"), comingPart(b), resultsPart(b)] }],
  tables: (b) => {
    const e = b.use.events!;
    return [{
      key: "events",
      slug: "events",
      name: EVENTS_W.events,
      fields: [
        f.text("title", EVENTS_W.title, { required: true }),
        f.select("kind", EVENTS_W.kind, e.kinds, { default: e.kinds[0][0] }),
        f.date("date", EVENTS_W.date),
        { ...f.text("time", EVENTS_W.time, { max: 5 }), help: EVENTS_W.timeHelp },
        f.text("where", EVENTS_W.where, { max: 120 }),
        f.long("text", EVENTS_W.text),
        f.select("status", EVENTS_W.status, STATES, { default: "upcoming" }),
        ...(e.matches ? [f.text("opponent", EVENTS_W.opponent, { max: 60 }), f.select("result", EVENTS_W.result, RESULTS), f.text("score", EVENTS_W.score, { max: 20 })] : []),
      ],
      // Everyone may read them (a Discord bot, a tournament's site); its owner's tools may add and change them with a key.
      api: { read: "public", create: "key", update: "key", delete: "off" },
      rows: e.rows.map((r) => ({
        slug: r.slug,
        data: {
          title: r.title, kind: r.kind, date: r.date, time: plain(r.time), where: r.where, text: r.text, status: r.done ? "done" : "upcoming",
          ...(e.matches && r.opponent ? { opponent: plain(r.opponent) } : {}), ...(e.matches && r.result ? { result: r.result } : {}), ...(e.matches && r.score ? { score: plain(r.score) } : {}),
        },
      })),
    }];
  },
  counts: (bp) => ({ tables: 1, rows: bp.modules.events!.rows.length }),
  panel: (bp) => {
    const matches = bp.modules.events!.matches;
    return {
      numbers: [
        { key: "eventsComing", label: EVENTS_W.upcomingCount, table: T("events"), where: [{ field: "status", op: "is", value: "upcoming" }] },
        ...(matches ? [{ key: "matchesWon", label: EVENTS_W.wins, table: T("events"), where: [{ field: "result", op: "is" as const, value: "win" }], window: "month" as const }] : []),
      ],
      board: [{ kind: "calendar", key: "eventsCalendar", title: EVENTS_W.calendar, table: T("events"), date: "date", show: ["title", "time", "kind", ...(matches ? ["opponent"] : [])] }],
      lists: [{ kind: "view", key: "eventsAll", title: EVENTS_W.everything, table: T("events"), columns: ["title", "kind", "date", "time", "status", ...(matches ? ["opponent", "result", "score"] : [])], sort: { field: "date", dir: "desc" }, limit: 50 }],
    };
  },
  // Every night a little after midnight (the store's clock): a coming event whose day passed is done.
  functions: () => [
    {
      key: "eventsPast",
      name: EVENTS_W.pastFn.ar,
      note: "كل ليلة بعد نص الليل بعشر دقايق: كل فعالية «جاية» مرق يومها بتصير «صارت»، وبتنتقل من الجاي للنتايج.",
      def: {
        lang: "ar",
        inputs: [{ name: "at", type: "text" }],
        do: [
          { act: "find", table: T("events"), filters: [{ field: "status", op: "is", value: "upcoming" }], limit: 200, as: "found" },
          { act: "each", list: "{{found}}", as: "event", do: [{ act: "if", if: [{ left: "{{event.date}}", cmp: "notEmpty" }, { left: "{{event.date}}", cmp: "lt", right: "{{input.at}}" }], do: [{ act: "change", table: T("events"), row: "{{event.$id}}", values: { status: "done" } }] }] },
        ],
      },
      triggers: [{ kind: "schedule", config: { at: "00:10" } }],
    },
  ],
};
