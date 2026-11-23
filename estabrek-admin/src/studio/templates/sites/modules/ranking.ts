/**
 * A game server's rankings (wave G6a of docs/sites-300-plan.ar.md): its boards, and the players' numbers on them. The
 * owner edits the boards (a table: each board's key, name, unit, how a player's numbers add up, and who is first);
 * the server's link fills the numbers: it counts play time by itself on the board keyed "playtime" (a minute for each
 * player online at each hello), and sends the server's own numbers (a FiveM script's exports['site-link']:score, or
 * Paper's /linkscore). The backend (lib/ranking.ts) keeps one row a player a day on each board and one for all time.
 * «الترتيب» has a section for each board: its best players today, this week, this month or of all time.
 */
import { EL, SEC, STACK, say, withSkin } from "../../build";
import { w } from "../../words";
import type { RankBoard } from "../blueprint";
import { RANK_W } from "../siteWords";
import { T, f, head, pageHead, type Part, type SiteModule } from "./kit";

/** One board's section: its name, its line, and its best players in tabs. */
const boardPart = (board: RankBoard): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [
    head(k, board.title, board.sub ?? RANK_W.boardSub),
    STACK(k, [EL(k, "leaderboard", { board: board.key, windows: ["week", "month", "all"], size: 10, empty: say(k, RANK_W.empty), day: say(k, RANK_W.day), week: say(k, RANK_W.week), month: say(k, RANK_W.month), all: say(k, RANK_W.all) }, { style: { self: "stretch" } })], { width: "100%", maxWidth: "760px", self: "center" }),
  ], { name: board.title });
};

const UNITS: Array<[RankBoard["unit"], typeof RANK_W.minutes]> = [["minutes", RANK_W.minutes], ["number", RANK_W.number], ["lap", RANK_W.lap]];
const HOWS: Array<[RankBoard["how"], typeof RANK_W.sum]> = [["sum", RANK_W.sum], ["best", RANK_W.best], ["latest", RANK_W.latest]];
const FIRSTS: Array<[RankBoard["best"], typeof RANK_W.high]> = [["high", RANK_W.high], ["low", RANK_W.low]];
const newest = { field: "$updatedAt", dir: "desc" as const };

export const RANKING: SiteModule = {
  key: "ranking",
  name: RANK_W.name,
  note: w("لوحات ترتيب للاعبين: ساعات اللعب بتنحسب لحالها من لينك السيرفر، والأرقام التانية (مصاري، مستوى، أسرع لفّة) بيبعتها السيرفر. الأوائل اليوم وهالأسبوع وهالشهر ومن الأول.", "Ranking boards for the players: play time is counted by the server's link by itself, and the server sends the other numbers (money, a level, the fastest lap). The best today, this week, this month and of all time.", "לוחות דירוג לשחקנים: זמן המשחק נספר מעצמו מהקישור לשרת, ואת שאר המספרים (כסף, רמה, ההקפה המהירה) השרת שולח. הטובים היום, השבוע, החודש ומאז ומעולם."),
  needs: () => ["link"],
  pages: (bp) => [{ key: "ranking", slug: "/ranking", order: 24, name: bp.modules.ranking!.title, seo: bp.modules.ranking!.sub, parts: (b) => [pageHead(b.use.ranking!.title, b.use.ranking!.sub, "soft"), ...b.use.ranking!.boards.map(boardPart)] }],
  tables: (b) => [
    {
      key: "boards",
      slug: "boards",
      name: RANK_W.boards,
      fields: [
        f.text("title", RANK_W.title, { required: true }),
        { ...f.text("key", RANK_W.key, { required: true }), help: RANK_W.keyHelp },
        f.select("unit", RANK_W.unit, UNITS, { default: "number" }),
        f.select("how", RANK_W.how, HOWS, { default: "sum" }),
        f.select("best", RANK_W.first, FIRSTS, { default: "high" }),
      ],
      // The site's pages read them on the server (lib/ranking.ts); nothing through the API.
      api: { read: "off", create: "off", update: "off", delete: "off" },
      rows: b.use.ranking!.boards.map((r) => ({ slug: r.key, data: { title: r.title, key: w(r.key, r.key, r.key), unit: r.unit, how: r.how, best: r.best } })),
    },
    {
      key: "scores",
      slug: "scores",
      name: RANK_W.scores,
      fields: [
        f.text("player", RANK_W.player, { required: true }),
        f.text("board", RANK_W.board),
        f.num("value", RANK_W.value),
        f.select("span", RANK_W.span, [["day", RANK_W.spanDay], ["all", RANK_W.spanAll]], { default: "day" }),
        f.date("day", RANK_W.dayField),
        f.text("playerId", RANK_W.playerId),
      ],
      // Written by the server's link only (a row a player a day, and one for all time).
      api: { read: "off", create: "off", update: "off", delete: "off" },
    },
  ],
  counts: (bp) => ({ tables: 2, rows: bp.modules.ranking!.boards.length }),
  panel: () => ({
    lists: [
      { kind: "view", key: "boards", title: RANK_W.boards, table: T("boards"), columns: ["title", "key", "unit", "how", "best"] },
      { kind: "view", key: "scoresLatest", title: RANK_W.latestScores, table: T("scores"), where: [{ field: "span", op: "is", value: "day" }], columns: ["player", "board", "value", "day"], sort: newest, limit: 30 },
    ],
  }),
};
