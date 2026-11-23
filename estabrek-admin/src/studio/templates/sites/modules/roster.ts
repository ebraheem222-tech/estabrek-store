/**
 * A clan's or a guild's roster («التشكيلة», wave G7c of docs/sites-300-plan.ar.md): its players by their part (the
 * captain, the main players, the subs, the coach), each with their name in games, their game and rank, a line about
 * them and, where they have one, their channel (the picture opens it). Its page has a section for each part; the home
 * page shows the first players.
 */
import { B, CARD, H, IMG, P, SEC, STACK, pop, withSkin, type Ctx, type N } from "../../build";
import { w, type W } from "../../words";
import { ROSTER_W } from "../siteWords";
import { LIST, T, bound, f, head, pageHead, plainPic, still, type Built, type Part, type SiteModule } from "./kit";

const plain = (v: string) => ({ ar: v, en: v, he: v });

/** A player: their picture (opening their channel), name, game and rank, and a line about them. */
function playerCard(k: Ctx, b: Built): N {
  const p = b.use.roster!.rows[0];
  return CARD(k, [
    bound(IMG(k, plain(p?.name ?? "Player"), { aspect: "1 / 1", radius: 999, motion: false, style: { width: "112px", self: "center" } }), { src: "picture", alt: "name", href: "link" }),
    bound(H(k, plain(p?.name ?? "Player"), 4, { ...still, style: { textAlign: "center" } }), { text: "name" }),
    STACK(k, [bound(P(k, p?.game ?? ROSTER_W.game, { ...still, quiet: false, style: { size: 14, weight: 600, color: pop(k) } }), { text: "game" }), bound(P(k, p?.rank ?? ROSTER_W.rank, { ...still, style: { size: 14 } }), { text: "rank" })], { direction: "row", gap: 8, justify: "center", wrap: true }),
    bound(P(k, p?.about ?? ROSTER_W.about, { ...still, style: { size: 15, textAlign: "center" } }), { text: "about" }),
  ], { gap: 8, align: "center", pad: [24, 20, 24, 20] });
}
/** One part of the roster: its name, and its players in the owner's order. */
const rolePart = (b: Built, i: number): Part => (c) => {
  const k = withSkin(c, i % 2 ? "surface" : "plain");
  const [id, name] = b.use.roster!.roles[i];
  return SEC(k, [STACK(k, [H(k, name, 2), LIST(k, "roster", playerCard(k, b), { columns: 4, limit: 24, where: [{ field: "role", op: "is", value: id }] })], { gap: 24 })], { name });
};
/** On the home page: the first players, and the way to the whole roster. */
export const rosterBand = (b: Built): Part => (c) => {
  const k = withSkin(c, "surface");
  return SEC(k, [head(k, b.use.roster!.title, ROSTER_W.bandSub), LIST(k, "roster", playerCard(k, b), { columns: 4, limit: 4, where: [{ field: "role", op: "isNot", value: b.use.roster!.roles.at(-1)![0] }] }), STACK(k, [B(k, ROSTER_W.all, b.slugs.roster, "outline")], { direction: "row", justify: "center", margin: [32, 0, 0, 0] })], { name: b.use.roster!.title });
};

export const ROSTER: SiteModule = {
  key: "roster",
  name: ROSTER_W.name,
  note: ROSTER_W.note,
  pages: (bp) => [{ key: "roster", slug: "/roster", order: 15, name: bp.modules.roster!.title, seo: bp.modules.roster!.sub, parts: (b) => [pageHead(b.use.roster!.title, b.use.roster!.sub, "soft"), ...b.use.roster!.roles.map((_, i) => rolePart(b, i))] }],
  tables: (b) => {
    const r = b.use.roster!;
    return [{
      key: "roster",
      slug: "roster",
      name: r.title,
      fields: [
        f.text("name", ROSTER_W.player, { required: true, max: 40 }),
        f.select("role", ROSTER_W.role, r.roles, { default: r.roles[0][0] }),
        f.text("game", ROSTER_W.game, { max: 60 }),
        f.text("rank", ROSTER_W.rank, { max: 40 }),
        f.long("about", ROSTER_W.about),
        f.image("picture", ROSTER_W.picture),
        { ...f.link("link", ROSTER_W.link), help: ROSTER_W.linkHelp },
      ],
      rows: r.rows.map((p, i) => ({ data: { name: plain(p.name), role: p.role, game: p.game, rank: p.rank, about: p.about, picture: plainPic(i + 1), ...(p.link ? { link: p.link } : {}) } })),
    }];
  },
  counts: (bp) => ({ tables: 1, rows: bp.modules.roster!.rows.length }),
  panel: () => ({ lists: [{ kind: "view", key: "rosterAll", title: ROSTER_W.everyone, table: T("roster"), columns: ["name", "role", "game", "rank", "link"] }] }),
};

/** The parts a clan's roster starts with (its own blueprint may name others). */
export const CLAN_ROLES: Array<[string, W]> = [
  ["captain", w("القائد", "Captain", "קפטן")],
  ["main", w("الأساسيين", "Main players", "שחקנים ראשיים")],
  ["sub", w("الاحتياط", "Subs", "מחליפים")],
  ["coach", w("المدرّب والطاقم", "Coach and staff", "מאמן וצוות")],
];
