/**
 * A community's members' directory («دليل الأعضاء», wave G7c of docs/sites-300-plan.ar.md): who is in the community,
 * what they play and where, so members find each other. A signed-in member puts up their own card with a form (their
 * name in games, their games, their platform, their Discord name, a few words); it waits as a draft until the staff
 * say yes on the panel, and a function then publishes it into the directory (a «hide» takes it out again). One card
 * each (the site's rule, the backend's lib/siteWaits.ts): a new one is held back while theirs waits or shows. Its page
 * has the directory, the form and the member's own card with where it stands.
 */
import { CARD, COLS, EL, H, P, SEC, STACK, pop, say, withSkin, type Ctx, type N } from "../../build";
import type { W } from "../../words";
import { MEMBERS_W } from "../siteWords";
import { LIST, T, bound, f, head, pageHead, still, type Built, type Part, type SiteModule } from "./kit";

const plain = (v: string) => ({ ar: v, en: v, he: v });
const PLATFORMS: Array<[string, W]> = [["pc", MEMBERS_W.pc], ["playstation", MEMBERS_W.playstation], ["xbox", MEMBERS_W.xbox], ["switch", MEMBERS_W.switch], ["mobile", MEMBERS_W.mobile]];
const STATES: Array<[string, W]> = [["waiting", MEMBERS_W.waiting], ["shown", MEMBERS_W.shown], ["hidden", MEMBERS_W.hidden]];
const listed = [{ field: "state", op: "is" as const, value: "shown" }];

/** A member's card: their name in games, their platform, what they play, their Discord name and their words. */
function memberCard(k: Ctx, b: Built): N {
  const m = b.use.members!.rows[0];
  const platform = PLATFORMS.find(([id]) => id === m?.platform)?.[1] ?? MEMBERS_W.pc;
  return CARD(k, [
    STACK(k, [bound(H(k, plain(m?.tag ?? "Player"), 4, still), { text: "tag" }), bound(P(k, platform, { ...still, quiet: false, style: { size: 13, weight: 700, color: pop(k) } }), { text: "platform" })], { direction: "row", justify: "between", align: "center", gap: 10, wrap: true }),
    bound(P(k, m?.games ?? MEMBERS_W.gamesField, { ...still, quiet: false, style: { size: 15, weight: 600 } }), { text: "games" }),
    bound(P(k, m?.about ?? MEMBERS_W.aboutField, { ...still, style: { size: 15 } }), { text: "about" }),
    STACK(k, [P(k, MEMBERS_W.onDiscord, { ...still, style: { size: 14 } }), bound(P(k, plain(m?.discordName ?? "player"), { ...still, quiet: false, style: { size: 14, weight: 600 } }), { text: "discordName" })], { direction: "row", gap: 6, align: "center", wrap: true }),
  ], { gap: 8, pad: [20, 22, 20, 22] });
}
const directoryPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [STACK(k, [LIST(k, "members", memberCard(k, b), { columns: 3, limit: 48, sort: "newest", where: listed, empty: MEMBERS_W.empty })], { width: "100%" })], { name: MEMBERS_W.all });
};
/** The form a signed-in member puts up their card with. */
const formPart: Part = (c) => {
  const k = withSkin(c, "surface");
  const form = CARD(k, [EL(k, "form", {
    kind: "custom",
    fields: [
      { name: "tag", kind: "text", label: say(k, MEMBERS_W.tag), required: true },
      { name: "games", kind: "text", label: say(k, MEMBERS_W.games), hint: say(k, MEMBERS_W.gamesHint), required: true },
      { name: "platform", kind: "select", label: say(k, MEMBERS_W.platform), required: true, options: PLATFORMS.map(([value, label]) => ({ value, label: say(k, label) })) },
      { name: "discordName", kind: "text", label: say(k, MEMBERS_W.discordName), required: true },
      { name: "about", kind: "long", label: say(k, MEMBERS_W.about) },
    ],
    send: { to: "table", table: "members" },
    button: say(k, MEMBERS_W.send),
    done: say(k, MEMBERS_W.sent),
  }, { style: { self: "stretch" } })], { gap: 16, pad: [32, 28, 32, 28] });
  const side = STACK(k, [H(k, MEMBERS_W.formTitle, 3, still), P(k, MEMBERS_W.formSub, still)], { gap: 12 });
  return SEC(k, [COLS(k, [2, 3], [[side], [form]], { gap: 48, align: "start", phone: "stack" })], { name: MEMBERS_W.formTitle });
};
/** The member's own card, read in their browser: where it stands. */
const minePart: Part = (c) => {
  const k = withSkin(c, "plain");
  const card = CARD(k, [
    STACK(k, [bound(H(k, plain("Player"), 4, still), { text: "tag" }), bound(P(k, MEMBERS_W.waiting, { ...still, quiet: false, style: { weight: 700, color: pop(k) } }), { text: "state" })], { direction: "row", justify: "between", align: "center", gap: 12, wrap: true }),
    bound(P(k, MEMBERS_W.gamesField, still), { text: "games" }),
  ], { gap: 8, pad: [20, 22, 20, 22] });
  return SEC(k, [STACK(k, [H(k, MEMBERS_W.mine, 2), LIST(k, "members", card, { columns: 1, limit: 3, feed: "added", sort: "newest", empty: MEMBERS_W.mineEmpty, signin: MEMBERS_W.mineSignin })], { gap: 24, maxWidth: "820px", width: "100%", self: "center" })], { name: MEMBERS_W.mine });
};
/** On the home page: the newest members, and the way to the directory. */
export const membersBand = (b: Built): Part => (c) => {
  const k = withSkin(c, "surface");
  return SEC(k, [head(k, b.use.members!.title, MEMBERS_W.bandSub), LIST(k, "members", memberCard(k, b), { columns: 3, limit: 3, sort: "newest", where: listed, empty: MEMBERS_W.empty })], { name: b.use.members!.title });
};

const became = (state: string) => [{ left: "{{input.row.state}}", cmp: "eq", right: state }, { left: "{{input.before.state}}", cmp: "ne", right: state }];

export const MEMBERS: SiteModule = {
  key: "members",
  name: MEMBERS_W.name,
  note: MEMBERS_W.note,
  pages: (bp) => [{ key: "members", slug: "/members", order: 18, name: bp.modules.members!.title, seo: bp.modules.members!.sub, parts: (b) => [pageHead(b.use.members!.title, b.use.members!.sub, "soft"), directoryPart(b), formPart, minePart] }],
  tables: (b) => [{
    key: "members",
    slug: "members",
    name: MEMBERS_W.members,
    fields: [
      f.text("tag", MEMBERS_W.tagField, { required: true, max: 40 }),
      f.text("games", MEMBERS_W.gamesField, { max: 120 }),
      f.select("platform", MEMBERS_W.platformField, PLATFORMS),
      f.text("discordName", MEMBERS_W.discordField, { required: true, max: 40 }),
      f.long("about", MEMBERS_W.aboutField, { max: 400 }),
      f.select("state", MEMBERS_W.state, STATES, { default: "waiting" }),
    ],
    // A signed-in member adds their own card and reads it, never its state (the staff's). The directory is drawn with the page.
    api: { read: "customer", create: "customer", update: "off", delete: "off", locked: ["state"] },
    rows: b.use.members!.rows.map((m) => ({ data: { tag: plain(m.tag), games: m.games, platform: m.platform, discordName: plain(m.discordName), about: m.about, state: "shown" } })),
  }],
  counts: (bp) => ({ tables: 1, rows: bp.modules.members!.rows.length }),
  // One card a member: a new one waits while theirs waits for the staff or shows in the directory.
  waits: () => [{ table: T("members"), same: [], days: 0, open: { field: "state", values: ["waiting", "shown"] } }],
  panel: () => ({
    numbers: [
      { key: "membersListed", label: MEMBERS_W.count, table: T("members"), where: listed },
      { key: "membersWaiting", label: MEMBERS_W.waitingCount, table: T("members"), where: [{ field: "state", op: "is", value: "waiting" }] },
    ],
    today: [{
      kind: "queue",
      key: "membersQueue",
      title: MEMBERS_W.queue,
      table: T("members"),
      where: [{ field: "state", op: "is", value: "waiting" }],
      show: ["$by", "tag", "games", "platform", "discordName", "about"],
      decisions: [
        { key: "show", label: MEMBERS_W.showIt, set: { state: "shown" }, tone: "good" },
        { key: "hide", label: MEMBERS_W.hideIt, set: { state: "hidden" }, tone: "bad" },
      ],
      empty: MEMBERS_W.none,
    }],
    lists: [{ kind: "view", key: "membersAll", title: MEMBERS_W.all, table: T("members"), columns: ["tag", "games", "platform", "discordName", "state", "$by", "$createdAt"], sort: { field: "$createdAt", dir: "desc" }, limit: 50 }],
  }),
  functions: () => [
    {
      key: "membersNew",
      name: MEMBERS_W.newBell.ar,
      note: "بيوصلك جرس بلوحة الإدارة مع كل بطاقة جديدة للدليل.",
      def: { lang: "ar", inputs: [{ name: "row", type: "any" }], do: [{ act: "notify", title: "بطاقة جديدة بالدليل: {{input.row.tag}}", text: "افتحها بطابور البطاقات بلوحة الموقع وبيّنها أو خبّيها.", link: "/admin/data" }] },
      triggers: [{ kind: "row", config: { table: T("members"), on: ["added"] } }],
    },
    {
      key: "membersShown",
      name: MEMBERS_W.shownFn.ar,
      note: "لما الطاقم يبيّن بطاقة بتنتشر بالدليل، ولما يخبّيها بترجع مسودة وبتطلع منه.",
      def: {
        lang: "ar",
        inputs: [{ name: "row", type: "any" }, { name: "before", type: "any" }],
        if: [{ left: "{{input.row.state}}", cmp: "ne", right: "{{input.before.state}}" }],
        do: [
          { act: "if", if: became("shown"), do: [{ act: "change", table: T("members"), row: "{{input.row.$id}}", values: {}, status: "PUBLISHED" }] },
          { act: "if", if: [{ left: "{{input.row.state}}", cmp: "ne", right: "shown" }], do: [{ act: "change", table: T("members"), row: "{{input.row.$id}}", values: {}, status: "DRAFT" }] },
        ],
      },
      triggers: [{ kind: "row", config: { table: T("members"), on: ["changed"] } }],
    },
  ],
};
