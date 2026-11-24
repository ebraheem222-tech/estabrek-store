/**
 * A server list («قائمة السيرفرات», wave G7d2 of docs/sites-300-plan.ar.md): owners add their game servers with a form
 * (signed in; one listing an address each), which wait as drafts until the staff list them on the panel (a function
 * publishes them). Our server reads each listed server's status every few minutes (the backend's lib/gameListings.ts)
 * and writes it beside the owner's words. The list is read in the visitor's browser, a section a game, ranked by this
 * month's votes: «صوّت» calls a function that takes one vote a day for each server from each signed-in player (and
 * refuses a second the same day); the votes start over on the first of each month. Each card copies its address.
 */
import { B, CARD, COLS, EL, H, IMG, P, SEC, STACK, eyebrow, pop, say, withSkin, type Ctx, type N } from "../../build";
import { w, type W } from "../../words";
import { LIST_W } from "../siteWords";
import { LIST, T, bound, f, head, pageHead, still, type Built, type Part, type SiteModule } from "./kit";

const plain = (v: string) => ({ ar: v, en: v, he: v });
export const LISTED_GAMES: Array<[string, W]> = [
  ["fivem", w("FiveM", "FiveM", "FiveM")],
  ["minecraft", w("ماينكرافت Java", "Minecraft Java", "Minecraft Java")],
  ["bedrock", w("ماينكرافت Bedrock", "Minecraft Bedrock", "Minecraft Bedrock")],
  ["steam", w("لعبة على Steam", "A Steam game", "משחק ב־Steam")],
];
const STATES: Array<[string, W]> = [["waiting", LIST_W.waiting], ["listed", LIST_W.listed], ["hidden", LIST_W.hidden]];
const LIVE: Array<[string, W]> = [["on", LIST_W.on], ["off", LIST_W.off]];
/** The vote function's call address (each card's button calls it). */
export const VOTE = "vote-server";
const listed = { field: "state", op: "is", value: "listed" };
const ranked = [{ field: "votes", dir: "desc" as const }, { field: "players", dir: "desc" as const }];

/** A listed server: its picture, name and game, whether it's up and how many play, its words, its address to copy, its Discord, its votes and the vote. */
function listingCard(k: Ctx, b: Built): N {
  const l = b.use.listings!;
  const first = l.rows[0];
  const game = LISTED_GAMES.find(([id]) => id === first?.game)?.[1] ?? LISTED_GAMES[0][1];
  const copy = B(k, LIST_W.copy, "#", "outline", still);
  copy.props = { ...copy.props, triggers: [{ on: "click", do: [{ act: "copy", text: say(k, plain("{{row_address}}")), note: say(k, LIST_W.copied) }] }] };
  const vote = B(k, LIST_W.vote, "#", "solid", still);
  // Signed in: one vote a day for this server (the function refuses a second, and says so).
  vote.props = { ...vote.props, triggers: [{ on: "click", who: "customer", deny: "signin", do: [{ act: "fn", fn: VOTE, input: { listing: "{{row_id}}" }, as: "voted" }, { act: "toast", text: say(k, LIST_W.voted) }] }] };
  const discord = B(k, LIST_W.join, "#", "link", still);
  return CARD(k, [
    bound(IMG(k, plain(first?.name ?? "Server"), { aspect: "16 / 7", radius: 14, motion: false }), { src: "banner", alt: "name" }),
    STACK(k, [bound(eyebrow(k, game, still), { text: "game" }), bound(P(k, LIST_W.on, { ...still, quiet: false, style: { size: 14, weight: 700, color: pop(k) } }), { text: "live" })], { direction: "row", justify: "between", align: "center", gap: 10, wrap: true }),
    STACK(k, [bound(H(k, plain(first?.name ?? "Server"), 4, still), { text: "name" }), P(k, w("{{row_players|—}} / {{row_max|—}}", "{{row_players|—}} / {{row_max|—}}", "{{row_players|—}} / {{row_max|—}}"), { ...still, quiet: false, style: { size: 15, weight: 700 } })], { direction: "row", justify: "between", align: "center", gap: 10, wrap: true }),
    bound(P(k, first?.about ?? LIST_W.about, { ...still, style: { size: 15 } }), { text: "about" }),
    bound(P(k, first?.tags ?? LIST_W.tags, { ...still, style: { size: 13 } }), { text: "tags" }),
    STACK(k, [copy, bound(discord, { href: "discord" })], { direction: "row", gap: 10, align: "center", wrap: true }),
    STACK(k, [P(k, w("{{row_votes|0}} صوت", "{{row_votes|0}} votes", "{{row_votes|0}} הצבעות"), { ...still, quiet: false, style: { size: 15, weight: 700 } }), vote], { direction: "row", justify: "between", align: "center", gap: 10 }),
  ], { gap: 10, pad: [16, 16, 20, 16] });
}
const listingsList = (k: Ctx, b: Built, limit: number, game?: string) =>
  LIST(k, "listings", listingCard(k, b), { columns: 3, limit, feed: "live", by: ranked, where: [listed, ...(game ? [{ field: "game", op: "is", value: game }] : [])], empty: LIST_W.empty });

/** One game's section of the list. */
const gamePart = (b: Built, i: number): Part => (c) => {
  const k = withSkin(c, i % 2 ? "surface" : "plain");
  const [id, name] = b.use.listings!.games[i];
  return SEC(k, [STACK(k, [H(k, name, 2), listingsList(k, b, 24, id)], { gap: 24 })], { name });
};
/** The form an owner adds their server with. */
const formPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "surface");
  const games = b.use.listings!.games.map(([value, label]) => ({ value, label: say(k, label) }));
  const form = CARD(k, [EL(k, "form", {
    kind: "custom",
    fields: [
      { name: "name", kind: "text", label: say(k, LIST_W.serverName), required: true },
      { name: "game", kind: "select", label: say(k, LIST_W.game), required: true, options: games },
      { name: "address", kind: "text", label: say(k, LIST_W.address), hint: say(k, LIST_W.addressHelp), required: true },
      { name: "about", kind: "long", label: say(k, LIST_W.about), required: true },
      { name: "tags", kind: "text", label: say(k, LIST_W.tags), hint: say(k, LIST_W.tagsHint) },
      { name: "discord", kind: "text", label: say(k, LIST_W.discord) },
      { name: "banner", kind: "file", label: say(k, LIST_W.banner) },
    ],
    send: { to: "table", table: "listings" },
    button: say(k, LIST_W.send),
    done: say(k, LIST_W.sent),
  }, { style: { self: "stretch" } })], { gap: 16, pad: [32, 28, 32, 28] });
  const side = STACK(k, [H(k, LIST_W.formTitle, 3, still), P(k, LIST_W.formSub, still)], { gap: 12 });
  return SEC(k, [COLS(k, [2, 3], [[side], [form]], { gap: 48, align: "start", phone: "stack" })], { name: LIST_W.formTitle });
};
/** The owner's own servers on the list, read in their browser: listed or waiting. */
const minePart: Part = (c) => {
  const k = withSkin(c, "plain");
  const card = CARD(k, [STACK(k, [bound(H(k, LIST_W.serverName, 4, still), { text: "name" }), bound(P(k, LIST_W.waiting, { ...still, quiet: false, style: { weight: 700, color: pop(k) } }), { text: "state" })], { direction: "row", justify: "between", align: "center", gap: 12, wrap: true }), bound(P(k, LIST_W.address, still), { text: "address" })], { gap: 8, pad: [20, 22, 20, 22] });
  return SEC(k, [STACK(k, [H(k, LIST_W.mine, 2), LIST(k, "listings", card, { columns: 1, limit: 6, feed: "added", sort: "newest", empty: LIST_W.mineEmpty, signin: LIST_W.mineSignin })], { gap: 24, maxWidth: "820px", width: "100%", self: "center" })], { name: LIST_W.mine });
};
/** On the home page: this month's top servers, and the way to the whole list. */
export const listingsBand = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [head(k, LIST_W.top, LIST_W.topSub), listingsList(k, b, 6), STACK(k, [B(k, LIST_W.all, b.slugs.listings, "outline")], { direction: "row", justify: "center", margin: [32, 0, 0, 0] })], { name: LIST_W.top });
};

const became = (state: string) => [{ left: "{{input.row.state}}", cmp: "eq", right: state }, { left: "{{input.before.state}}", cmp: "ne", right: state }];
/** This month's first day, in the store's day (its schedule's moment is a little after midnight on the store's clock, UTC−6 to UTC+6). */
const FIRST_DAY = "return new Date(Date.parse(input.at) + 6 * 3600000).getUTCDate() === 1;";
/** Today's day on the store's clock (a little ahead of UTC), for one vote a day. */
const TODAY = "return new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 10);";
const NEXT = "return (Number(input.v) || 0) + 1;";

export const LISTINGS: SiteModule = {
  key: "listings",
  name: LIST_W.name,
  note: LIST_W.note,
  pages: (bp) => [{ key: "listings", slug: "/list", order: 11, name: bp.modules.listings!.title, seo: bp.modules.listings!.sub, parts: (b) => [pageHead(b.use.listings!.title, b.use.listings!.sub, "soft"), ...b.use.listings!.games.map((_, i) => gamePart(b, i)), formPart(b), minePart] }],
  tables: (b) => {
    const l = b.use.listings!;
    return [
      {
        key: "listings",
        slug: "listings",
        name: LIST_W.listings,
        fields: [
          f.text("name", LIST_W.serverName, { required: true, max: 60 }),
          f.select("game", LIST_W.game, l.games, { required: true }),
          { ...f.text("address", LIST_W.address, { required: true, max: 120 }), help: LIST_W.addressHelp },
          f.long("about", LIST_W.about, { max: 600 }),
          f.text("tags", LIST_W.tags, { max: 80 }),
          f.link("discord", LIST_W.discord),
          f.image("banner", LIST_W.banner),
          f.select("state", LIST_W.state, STATES, { default: "waiting" }),
          f.select("live", LIST_W.live, LIVE),
          f.num("players", LIST_W.players, { min: 0 }),
          f.num("max", LIST_W.max, { min: 0 }),
          { id: "checked", type: "datetime", name: LIST_W.checked },
          f.num("votes", LIST_W.voteCount, { min: 0 }),
        ],
        // Everyone reads the listed ones (the list asks in the visitor's browser); an owner adds theirs, never its state, its status or its votes.
        api: { read: "public", create: "customer", update: "off", delete: "off", locked: ["state", "live", "players", "max", "checked", "votes"] },
        rows: l.rows.map((r) => ({ slug: r.slug, data: { name: plain(r.name), game: r.game, address: plain(r.address), about: r.about, tags: r.tags, ...(r.discord ? { discord: r.discord } : {}), state: "listed", votes: r.votes } })),
      },
      {
        key: "votes",
        slug: "votes",
        name: LIST_W.votes,
        fields: [f.text("listing", LIST_W.listing, { required: true, max: 40 }), f.text("voter", LIST_W.voter, { max: 60 }), f.text("day", LIST_W.day, { max: 10 })],
        // Written by the vote function alone.
        api: { read: "off", create: "off", update: "off", delete: "off" },
      },
    ];
  },
  counts: (bp) => ({ tables: 2, rows: bp.modules.listings!.rows.length }),
  // One listing an address: a new one for it waits while theirs waits or is listed.
  waits: () => [{ table: T("listings"), same: ["address"], days: 0, open: { field: "state", values: ["waiting", "listed"] } }],
  panel: () => ({
    numbers: [
      { key: "listingsListed", label: LIST_W.listedCount, table: T("listings"), where: [{ field: "state", op: "is", value: "listed" }] },
      { key: "listingsWaiting", label: LIST_W.waitingCount, table: T("listings"), where: [{ field: "state", op: "is", value: "waiting" }] },
      { key: "votesToday", label: LIST_W.votesToday, table: T("votes"), window: "today", compare: true },
    ],
    today: [{
      kind: "queue",
      key: "listingsQueue",
      title: LIST_W.queue,
      table: T("listings"),
      where: [{ field: "state", op: "is", value: "waiting" }],
      show: ["$by", "name", "game", "address", "about", "discord"],
      decisions: [{ key: "list", label: LIST_W.listIt, set: { state: "listed" }, tone: "good" }, { key: "hide", label: LIST_W.hideIt, set: { state: "hidden" }, tone: "bad" }],
      empty: LIST_W.none,
    }],
    lists: [{ kind: "view", key: "listingsAll", title: LIST_W.all, table: T("listings"), columns: ["name", "game", "address", "state", "live", "players", "votes", "$by"], sort: { field: "votes", dir: "desc" }, limit: 50 }],
    reports: [{ kind: "chart", key: "votesDaily", title: LIST_W.votes, table: T("votes"), days: 30 }],
  }),
  functions: () => [
    {
      key: "listingNew",
      name: LIST_W.newBell.ar,
      note: "بيوصلك جرس بلوحة الإدارة مع كل سيرفر جديد للقائمة.",
      def: { lang: "ar", inputs: [{ name: "row", type: "any" }], do: [{ act: "notify", title: "سيرفر جديد للقائمة: {{input.row.name}}", text: "افتحه بطابور السيرفرات بلوحة الموقع وحطّه بالقائمة أو خبّيه.", link: "/admin/data" }] },
      triggers: [{ kind: "row", config: { table: T("listings"), on: ["added"] } }],
    },
    {
      key: "listingShown",
      name: LIST_W.shownFn.ar,
      note: "لما الطاقم يحط سيرفر بالقائمة بينتشر (وحالته بتبلّش تنفحص)، ولما يخبّيه بيرجع مسودة وبيطلع منها.",
      def: {
        lang: "ar",
        inputs: [{ name: "row", type: "any" }, { name: "before", type: "any" }],
        if: [{ left: "{{input.row.state}}", cmp: "ne", right: "{{input.before.state}}" }],
        do: [
          { act: "if", if: became("listed"), do: [{ act: "change", table: T("listings"), row: "{{input.row.$id}}", values: {}, status: "PUBLISHED" }] },
          { act: "if", if: [{ left: "{{input.row.state}}", cmp: "ne", right: "listed" }], do: [{ act: "change", table: T("listings"), row: "{{input.row.$id}}", values: {}, status: "DRAFT" }] },
        ],
      },
      triggers: [{ kind: "row", config: { table: T("listings"), on: ["changed"] } }],
    },
    {
      key: "voteServer",
      name: LIST_W.voteFn.ar,
      note: "كبسة «صوّت» بالقائمة بتشغّلها: لاعب فايت بحسابه بيصوّت مرّة باليوم لكل سيرفر بالقائمة، والصوت بينزاد على أصوات الشهر.",
      def: {
        lang: "ar",
        inputs: [{ name: "listing", type: "text" }],
        do: [
          { act: "get", table: T("listings"), row: "{{input.listing}}", as: "l" },
          { act: "if", if: [{ left: "{{l}}", cmp: "empty" }], do: [{ act: "stop", message: LIST_W.notListed.ar }] },
          { act: "if", if: [{ left: "{{l.$status}}", cmp: "ne", right: "PUBLISHED" }], do: [{ act: "stop", message: LIST_W.notListed.ar }] },
          { act: "if", if: [{ left: "{{l.state}}", cmp: "ne", right: "listed" }], do: [{ act: "stop", message: LIST_W.notListed.ar }] },
          { act: "code", code: TODAY, as: "today" },
          { act: "find", table: T("votes"), filters: [{ field: "listing", op: "is", value: "{{l.$id}}" }, { field: "voter", op: "is", value: "{{caller.id}}" }, { field: "day", op: "is", value: "{{today}}" }], limit: 1, as: "had" },
          { act: "if", if: [{ left: "{{had}}", cmp: "notEmpty" }], do: [{ act: "stop", message: LIST_W.votedToday.ar }] },
          { act: "add", table: T("votes"), values: { listing: "{{l.$id}}", voter: "{{caller.id}}", day: "{{today}}" }, owner: "{{caller.id}}" },
          { act: "code", code: NEXT, give: { v: "{{l.votes}}" }, as: "n" },
          { act: "change", table: T("listings"), row: "{{l.$id}}", values: { votes: "{{n}}" } },
          { act: "return", value: { votes: "{{n}}" } },
        ],
      },
      triggers: [{ kind: "call", config: { who: "customer", perMinute: 6 }, slug: VOTE }],
    },
    {
      key: "votesReset",
      name: LIST_W.resetFn.ar,
      note: "كل ليلة بعد نص الليل: إذا اليوم أول الشهر، أصوات كل السيرفرات بترجع صفر.",
      def: {
        lang: "ar",
        inputs: [{ name: "at", type: "text" }],
        do: [
          { act: "code", code: FIRST_DAY, give: { at: "{{input.at}}" }, as: "first" },
          {
            act: "if",
            if: [{ left: "{{first}}", cmp: "eq", right: true }],
            do: [
              { act: "find", table: T("listings"), filters: [{ field: "votes", op: "gt", value: 0 }], limit: 200, as: "all" },
              { act: "each", list: "{{all}}", as: "s", do: [{ act: "change", table: T("listings"), row: "{{s.$id}}", values: { votes: 0 } }] },
            ],
          },
        ],
      },
      triggers: [{ kind: "schedule", config: { at: "00:05" } }],
    },
  ],
};
