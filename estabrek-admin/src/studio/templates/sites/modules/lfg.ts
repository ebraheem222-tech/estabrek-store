/**
 * A looking-for-a-group board («دوّر على فريق», wave G7c2 of docs/sites-300-plan.ar.md): a signed-in player puts up a
 * post (the game, the mode, their rank, platform, region, when, the mic, and their Discord name) and it shows on the
 * board at once: a function publishes it as it comes, and the board's lists are read in the visitor's browser, each
 * game's in its own section, read again by themselves when a post comes. A post closes by itself after its time (a code
 * step every quarter hour: 3 hours for «now», 8 for «tonight», 3 days for «the weekend»); the staff close one from the
 * panel. One open post per player (the site's rule). A post's button copies its Discord name.
 */
import { B, CARD, COLS, EL, H, P, SEC, STACK, eyebrow, pop, say, withSkin, type Ctx, type N } from "../../build";
import { w, type W } from "../../words";
import { LFG_W } from "../siteWords";
import { PLATFORMS } from "./members";
import { LIST, T, bound, f, head, pageHead, still, type Built, type Part, type SiteModule } from "./kit";

const plain = (v: string) => ({ ar: v, en: v, he: v });
const WHEN: Array<[string, W]> = [["now", LFG_W.now], ["tonight", LFG_W.tonight], ["weekend", LFG_W.weekend]];
const MIC: Array<[string, W]> = [["yes", LFG_W.micYes], ["no", LFG_W.micNo]];
const STATES: Array<[string, W]> = [["open", LFG_W.open], ["closed", LFG_W.closed]];
const open = [{ field: "status", op: "is", value: "open" }];
/** How long a post stays open, in hours, by when it's for. */
export const LFG_HOURS = { now: 3, tonight: 8, weekend: 72 } as const;

/** The copy button: a press copies the post's own Discord name. */
function copyButton(k: Ctx): N {
  const b = B(k, LFG_W.copy, "#", "outline", still);
  return { ...b, props: { ...b.props, triggers: [{ on: "click", do: [{ act: "copy", text: say(k, plain("{{row_discordName}}")), note: say(k, LFG_W.copied) }] }] } };
}
/** A post: its game and when, the mode and rank, the platform, region and mic, the words, and who to message. */
function postCard(k: Ctx, b: Built): N {
  const l = b.use.lfg!;
  const first = l.rows[0];
  const game = l.games.find(([id]) => id === first?.game)?.[1] ?? l.games[0][1];
  const label = (list: Array<[string, W]>, id: string | undefined) => list.find(([x]) => x === id)?.[1] ?? list[0][1];
  return CARD(k, [
    STACK(k, [bound(eyebrow(k, game, still), { text: "game" }), bound(P(k, label(WHEN, first?.when), { ...still, quiet: false, style: { size: 14, weight: 700, color: pop(k) } }), { text: "when" })], { direction: "row", justify: "between", align: "center", gap: 10, wrap: true }),
    STACK(k, [bound(H(k, first?.mode ?? LFG_W.mode, 4, still), { text: "mode" }), bound(P(k, first?.rank ?? LFG_W.rankField, { ...still, quiet: false, style: { size: 15, weight: 600 } }), { text: "rank" })], { gap: 2 }),
    STACK(k, [
      bound(P(k, label(PLATFORMS, first?.platform), { ...still, style: { size: 14 } }), { text: "platform" }),
      bound(P(k, label(l.regions, first?.region), { ...still, style: { size: 14 } }), { text: "region" }),
      bound(P(k, label(MIC, first ? (first.mic ? "yes" : "no") : "yes"), { ...still, style: { size: 14 } }), { text: "mic" }),
    ], { direction: "row", gap: 12, wrap: true }),
    bound(P(k, first?.note ?? LFG_W.words, { ...still, style: { size: 15 } }), { text: "note" }),
    STACK(k, [
      STACK(k, [P(k, LFG_W.onDiscord, { ...still, style: { size: 14 } }), bound(P(k, plain(first?.discordName ?? "player"), { ...still, quiet: false, style: { size: 14, weight: 700 } }), { text: "discordName" })], { direction: "row", gap: 6, align: "center", wrap: true }),
      copyButton(k),
    ], { direction: "row", justify: "between", align: "center", gap: 10, wrap: true }),
  ], { gap: 10, pad: [20, 22, 20, 22] });
}
/** Open posts, read in the visitor's browser and again by themselves as posts come; one game's, or all of them. */
const postsList = (k: Ctx, b: Built, limit: number, game?: string) =>
  LIST(k, "lfg", postCard(k, b), { columns: 3, limit, feed: "live", sort: "newest", stream: true, where: [...open, ...(game ? [{ field: "game", op: "is", value: game }] : [])], empty: LFG_W.empty });

/** One game's section on the board. */
const gamePart = (b: Built, i: number): Part => (c) => {
  const k = withSkin(c, i % 2 ? "surface" : "plain");
  const [id, name] = b.use.lfg!.games[i];
  return SEC(k, [STACK(k, [H(k, name, 2), postsList(k, b, 12, id)], { gap: 24 })], { name });
};
/** The form a signed-in player puts up a post with. */
const formPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "surface");
  const l = b.use.lfg!;
  const options = (list: Array<[string, W]>) => list.map(([value, label]) => ({ value, label: say(k, label) }));
  const form = CARD(k, [EL(k, "form", {
    kind: "custom",
    fields: [
      { name: "game", kind: "select", label: say(k, LFG_W.game), required: true, options: options(l.games) },
      { name: "mode", kind: "text", label: say(k, LFG_W.mode), hint: say(k, LFG_W.modeHint), required: true },
      { name: "rank", kind: "text", label: say(k, LFG_W.rank) },
      { name: "platform", kind: "select", label: say(k, LFG_W.platform), required: true, options: options(PLATFORMS) },
      { name: "region", kind: "select", label: say(k, LFG_W.region), required: true, options: options(l.regions) },
      { name: "when", kind: "select", label: say(k, LFG_W.when), required: true, options: options(WHEN) },
      { name: "mic", kind: "select", label: say(k, LFG_W.mic), required: true, options: options(MIC) },
      { name: "discordName", kind: "text", label: say(k, LFG_W.discordName), required: true },
      { name: "note", kind: "long", label: say(k, LFG_W.words), hint: say(k, LFG_W.noteHint) },
    ],
    send: { to: "table", table: "lfg" },
    button: say(k, LFG_W.send),
    done: say(k, LFG_W.sent),
  }, { style: { self: "stretch" } })], { gap: 16, pad: [32, 28, 32, 28] });
  const side = STACK(k, [H(k, LFG_W.formTitle, 3, still), P(k, LFG_W.formSub, still)], { gap: 12 });
  return SEC(k, [COLS(k, [2, 3], [[side], [form]], { gap: 48, align: "start", phone: "stack" })], { name: LFG_W.formTitle });
};
/** The player's own posts, read in their browser: open or closed. */
const minePart: Part = (c) => {
  const k = withSkin(c, "plain");
  const card = CARD(k, [
    STACK(k, [bound(H(k, LFG_W.mode, 4, still), { text: "mode" }), bound(P(k, LFG_W.open, { ...still, quiet: false, style: { weight: 700, color: pop(k) } }), { text: "status" })], { direction: "row", justify: "between", align: "center", gap: 12, wrap: true }),
    bound(P(k, LFG_W.game, still), { text: "game" }),
  ], { gap: 8, pad: [20, 22, 20, 22] });
  return SEC(k, [STACK(k, [H(k, LFG_W.mine, 2), LIST(k, "lfg", card, { columns: 1, limit: 5, feed: "added", sort: "newest", empty: LFG_W.mineEmpty, signin: LFG_W.mineSignin })], { gap: 24, maxWidth: "820px", width: "100%", self: "center" })], { name: LFG_W.mine });
};
/** On the home page: the latest open posts, and the way to the board. */
export const lfgBand = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [head(k, b.use.lfg!.title, LFG_W.bandSub), postsList(k, b, 6), STACK(k, [B(k, LFG_W.formTitle, b.slugs.lfg, "solid")], { direction: "row", justify: "center", margin: [32, 0, 0, 0] })], { name: b.use.lfg!.title });
};

/** The code that finds the posts past their time (it is handed the open posts and the moment; it gives back their ids). */
const EXPIRE_CODE = `const hours = ${JSON.stringify(LFG_HOURS)};
const at = Date.parse(input.at);
return (input.posts || []).filter((p) => at - Date.parse(p.$createdAt) >= (hours[p.when] || 6) * 3600000).map((p) => p.$id);`;

export const LFG: SiteModule = {
  key: "lfg",
  name: LFG_W.name,
  note: LFG_W.note,
  pages: (bp) => [{ key: "lfg", slug: "/looking", order: 13, name: bp.modules.lfg!.title, seo: bp.modules.lfg!.sub, parts: (b) => [pageHead(b.use.lfg!.title, b.use.lfg!.sub, "soft"), ...b.use.lfg!.games.map((_, i) => gamePart(b, i)), formPart(b), minePart] }],
  tables: (b) => {
    const l = b.use.lfg!;
    return [{
      key: "lfg",
      slug: "lfg",
      name: LFG_W.posts,
      fields: [
        f.select("game", LFG_W.game, l.games, { required: true }),
        f.text("mode", LFG_W.mode, { required: true, max: 40 }),
        f.text("rank", LFG_W.rankField, { max: 30 }),
        f.select("platform", LFG_W.platform, PLATFORMS),
        f.select("region", LFG_W.region, l.regions),
        f.select("when", LFG_W.when, WHEN, { default: "now" }),
        f.select("mic", LFG_W.mic, MIC, { default: "yes" }),
        f.text("discordName", LFG_W.discordField, { required: true, max: 40 }),
        f.long("note", LFG_W.words, { max: 300 }),
        f.select("status", LFG_W.status, STATES, { default: "open" }),
      ],
      // Everyone reads the open ones (the board asks in the visitor's browser); a signed-in player adds theirs, never its state.
      api: { read: "public", create: "customer", update: "off", delete: "off", locked: ["status"] },
      rows: l.rows.map((r) => ({ data: { game: r.game, mode: r.mode, rank: r.rank, platform: r.platform, region: r.region, when: r.when, mic: r.mic ? "yes" : "no", discordName: plain(r.discordName), note: r.note, status: "open" } })),
    }];
  },
  counts: (bp) => ({ tables: 1, rows: bp.modules.lfg!.rows.length }),
  // One open post a player: a new one waits until theirs closes.
  waits: () => [{ table: T("lfg"), same: [], days: 0, open: { field: "status", values: ["open"] } }],
  panel: () => ({
    numbers: [
      { key: "lfgOpen", label: LFG_W.openCount, table: T("lfg"), where: [{ field: "status", op: "is", value: "open" }] },
      { key: "lfgWeek", label: LFG_W.weekCount, table: T("lfg"), window: "week", compare: true },
    ],
    today: [{
      kind: "queue",
      key: "lfgQueue",
      title: LFG_W.queue,
      table: T("lfg"),
      where: [{ field: "status", op: "is", value: "open" }],
      show: ["$by", "game", "mode", "rank", "platform", "when", "discordName", "note"],
      decisions: [{ key: "close", label: LFG_W.close, set: { status: "closed" }, tone: "bad" }],
      empty: LFG_W.none,
      limit: 30,
    }],
    lists: [{ kind: "view", key: "lfgAll", title: LFG_W.all, table: T("lfg"), columns: ["game", "mode", "rank", "platform", "when", "discordName", "status", "$createdAt"], sort: { field: "$createdAt", dir: "desc" }, limit: 50 }],
    reports: [{ kind: "chart", key: "lfgDaily", title: LFG_W.daily, table: T("lfg"), days: 30, split: "game" }],
  }),
  functions: () => [
    {
      key: "lfgPublish",
      name: LFG_W.publishFn.ar,
      note: "كل طلب جديد بيطلع على اللوحة على طول (طلبات اللاعبين بتوصل مسودّة).",
      def: { lang: "ar", inputs: [{ name: "row", type: "any" }], do: [{ act: "change", table: T("lfg"), row: "{{input.row.$id}}", values: {}, status: "PUBLISHED" }] },
      triggers: [{ kind: "row", config: { table: T("lfg"), on: ["added"] } }],
    },
    {
      key: "lfgExpire",
      name: LFG_W.closeFn.ar,
      note: "كل ربع ساعة: كل طلب مفتوح مرق وقته بيسكّر (3 ساعات لـ «هلّق»، 8 لـ «الليلة»، 3 أيام لـ «الويكند»)، وبيطلع من اللوحة.",
      def: {
        lang: "ar",
        inputs: [{ name: "at", type: "text" }],
        do: [
          { act: "find", table: T("lfg"), filters: [{ field: "status", op: "is", value: "open" }], limit: 200, as: "found" },
          { act: "code", code: EXPIRE_CODE, give: { posts: "{{found}}", at: "{{input.at}}" }, as: "over" },
          { act: "each", list: "{{over}}", as: "post", do: [{ act: "change", table: T("lfg"), row: "{{post}}", values: { status: "closed" } }] },
        ],
      },
      triggers: [{ kind: "schedule", config: { everyMinutes: 15 } }],
    },
  ],
};

/** The regions a board starts with (its own blueprint may name others). */
export const LFG_REGIONS: Array<[string, W]> = [
  ["me", w("الشرق الأوسط", "Middle East", "המזרח התיכון")],
  ["eu", w("أوروبا", "Europe", "אירופה")],
  ["na", w("أمريكا الشمالية", "North America", "צפון אמריקה")],
  ["asia", w("آسيا", "Asia", "אסיה")],
];
