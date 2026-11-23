/**
 * A server's public ban list («لائحة الباند», wave G7b of docs/sites-300-plan.ar.md): each ban in force, by its number
 * (the number an appeal names), the player and their ID, the reason, for how long, since when and on which server. Who
 * banned and the staff's notes stay private. The staff add bans from the panel, or the game server's own admin plugin
 * sends them through the table's API with a key (the automatic API, a key the owner makes for this table). Once an
 * appeal on a ban is accepted (lifted), the ban is lifted by itself and leaves the list.
 */
import { B, CARD, H, P, SEC, STACK, pop, withSkin, type Ctx, type N } from "../../build";
import type { BanLength } from "../blueprint";
import { BANS_W } from "../siteWords";
import { LIST, T, bound, f, pageHead, still, type Built, type Part, type SiteModule } from "./kit";

const LENGTHS: Array<[BanLength, typeof BANS_W.day]> = [["forever", BANS_W.forGood], ["day", BANS_W.day], ["days3", BANS_W.days3], ["week", BANS_W.week], ["month", BANS_W.month]];
const STATES: Array<[string, typeof BANS_W.active]> = [["active", BANS_W.active], ["lifted", BANS_W.lifted]];

/** One ban: its number and how long, the player, why and where. */
const banCard = (c: Ctx): N =>
  CARD(c, [
    STACK(c, [bound(H(c, BANS_W.number, 4, still), { text: "number" }), bound(P(c, BANS_W.forGood, { ...still, quiet: false, style: { weight: 700, color: pop(c) } }), { text: "length" })], { direction: "row", justify: "between", align: "center", gap: 12, wrap: true }),
    bound(P(c, BANS_W.player, { ...still, quiet: false, style: { weight: 700 } }), { text: "player" }),
    bound(P(c, BANS_W.reason, still), { text: "reason" }),
    STACK(c, [bound(P(c, BANS_W.server, { ...still, style: { size: 14 } }), { text: "server" }), bound(P(c, BANS_W.date, { ...still, style: { size: 14 } }), { text: "date" })], { direction: "row", justify: "between", gap: 12, wrap: true }),
  ], { gap: 8, pad: [18, 20, 18, 20] });

const listPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [LIST(k, "bans", banCard(k), { columns: 3, limit: 48, sort: "newest", where: [{ field: "status", op: "is", value: "active" }], empty: BANS_W.empty })], { name: b.use.bans!.title });
};
/** Under the list, where the site takes appeals: the way to one. */
const appealBand = (b: Built): Part => (c) => {
  const k = withSkin(c, "surface");
  return SEC(k, [STACK(k, [H(k, BANS_W.appealTitle, 2), P(k, BANS_W.appealLine, { style: { maxWidth: "560px" } }), STACK(k, [B(k, BANS_W.appealButton, b.slugs.appeal ?? "/appeal")], { direction: "row", justify: "center" })], { gap: 16, align: "center", textAlign: "center" })], { name: BANS_W.appealTitle, pad: [72, 24, 72, 24] });
};

const newest = { field: "$createdAt", dir: "desc" as const };

export const BANS: SiteModule = {
  key: "bans",
  name: BANS_W.name,
  note: BANS_W.note,
  pages: (bp) => [{ key: "bans", slug: "/bans", order: 34, name: bp.modules.bans!.title, seo: bp.modules.bans!.sub, parts: (b) => [pageHead(b.use.bans!.title, b.use.bans!.sub, "soft"), listPart(b), ...(b.use.appeals ? [appealBand(b)] : [])] }],
  tables: (b) => [
    {
      key: "bans",
      slug: "bans",
      name: BANS_W.bans,
      fields: [
        // One ban for each number (what an appeal names).
        f.text("number", BANS_W.number, { required: true, unique: true, max: 40, message: BANS_W.numberTaken }),
        f.text("player", BANS_W.player, { required: true, max: 60 }),
        f.text("playerId", BANS_W.playerId, { max: 80 }),
        f.select("reason", BANS_W.reason, b.use.bans!.reasons, { required: true }),
        f.select("length", BANS_W.length, LENGTHS, { default: "forever" }),
        f.date("date", BANS_W.date),
        f.text("server", BANS_W.server, { max: 60 }),
        f.long("note", BANS_W.story),
        f.text("by", BANS_W.by, { max: 60 }),
        f.long("notes", BANS_W.notes),
        f.select("status", BANS_W.status, STATES, { default: "active" }),
      ],
      // Anyone reads them (the list is public), never who banned nor the staff's notes; the game server's own plugin
      // adds and changes them with a key the owner makes for this table.
      api: { read: "public", create: "key", update: "key", delete: "off", private: ["by", "notes"] },
      rows: b.use.bans!.rows.map((r) => ({
        slug: r.number.toLowerCase(),
        data: { number: { ar: r.number, en: r.number, he: r.number }, player: { ar: r.player, en: r.player, he: r.player }, playerId: { ar: r.playerId, en: r.playerId, he: r.playerId }, reason: r.reason, length: r.length, date: r.date, server: { ar: r.server, en: r.server, he: r.server }, note: r.note, status: "active" },
      })),
    },
  ],
  counts: (bp) => ({ tables: 1, rows: bp.modules.bans!.rows.length }),
  panel: () => ({
    numbers: [{ key: "bansActive", label: BANS_W.activeCount, table: T("bans"), where: [{ field: "status", op: "is", value: "active" }] }],
    lists: [{ kind: "view", key: "bansAll", title: BANS_W.newest, table: T("bans"), columns: ["number", "player", "reason", "length", "server", "by", "status", "$createdAt"], sort: newest, limit: 50 }],
  }),
  // An appeal accepted lifts its ban: the ban by the appeal's number leaves the public list.
  functions: (b) =>
    b.use.appeals
      ? [
          {
            key: "banLifted",
            name: BANS_W.liftedFn.ar,
            note: "لما يصير استئناف «انشال»، الباند اللي برقمه بيصير «انشال» وبيطلع من اللائحة العامة.",
            def: {
              lang: "ar",
              inputs: [{ name: "row", type: "any" }, { name: "before", type: "any" }],
              if: [{ left: "{{input.row.status}}", cmp: "eq", right: "lifted" }, { left: "{{input.before.status}}", cmp: "ne", right: "lifted" }],
              do: [
                { act: "find", table: T("bans"), filters: [{ field: "number", op: "is", value: "{{input.row.ban}}" }], limit: 1, as: "found" },
                { act: "each", list: "{{found}}", as: "ban", do: [{ act: "change", table: T("bans"), row: "{{ban.$id}}", values: { status: "lifted" } }] },
              ],
            },
            triggers: [{ kind: "row", config: { table: T("appeals"), on: ["changed"] } }],
          },
        ]
      : [],
};
