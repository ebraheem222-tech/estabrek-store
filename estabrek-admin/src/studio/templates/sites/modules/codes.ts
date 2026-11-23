/**
 * A Roblox game's codes («الأكواد», wave G7c of docs/sites-300-plan.ar.md): the codes its makers hand out in updates,
 * each with what it gives and its last day. A player copies one in a press and pastes it in the game. The list is read
 * in the visitor's browser (a new code shows at once, and its copy button knows the row's code); a code past its last
 * day leaves the working ones by itself every night (a function on the store's clock), and the expired ones stay
 * below, so a player knows they missed nothing. The game's own server may add codes with a key for the table.
 */
import { B, CARD, H, P, SEC, STACK, eyebrow, pop, say, withSkin, type Ctx, type N } from "../../build";
import { w } from "../../words";
import { CODES_W } from "../siteWords";
import { LIST, T, bound, f, head, pageHead, still, type Built, type Part, type SiteModule } from "./kit";

const plain = (v: string) => ({ ar: v, en: v, he: v });
const STATES: Array<[string, ReturnType<typeof w>]> = [["active", CODES_W.active], ["expired", CODES_W.expired]];
const working = [{ field: "status", op: "is", value: "active" }];
const over = [{ field: "status", op: "is", value: "expired" }];

/** The copy button: a press copies the row's own code (a recipe in the row's copy of the card). */
function copyButton(k: Ctx): N {
  const b = B(k, CODES_W.copy, "#", "solid", still);
  return { ...b, props: { ...b.props, triggers: [{ on: "click", do: [{ act: "copy", text: say(k, plain("{{row_code}}")), note: say(k, CODES_W.copied) }] }] } };
}
/** A code as a card: the code big, what it gives, its last day (or none), and the copy button while it works. */
function codeCard(k: Ctx, b: Built, expired: boolean): N {
  const first = b.use.codes!.rows[0];
  const code = bound(H(k, plain(first?.code ?? "CODE"), 3, { ...still, style: { letterSpacing: 2, ...(expired ? {} : { color: pop(k) }) } }), { text: "code" });
  // The row's last day as the page shows it, or the words after "|" for a code with none (the live list's {{row_…}}).
  const day = w(`{{row_until|${CODES_W.noEnd.ar}}}`, `{{row_until|${CODES_W.noEnd.en}}}`, `{{row_until|${CODES_W.noEnd.he}}}`);
  const until = STACK(k, [eyebrow(k, CODES_W.untilLabel, still), P(k, day, { ...still, style: { size: 14 } })], { gap: 2 });
  return CARD(k, [
    code,
    bound(P(k, first?.reward ?? CODES_W.reward, { ...still, quiet: false, style: { size: 16, weight: 600 } }), { text: "reward" }),
    STACK(k, [until, ...(expired ? [] : [copyButton(k)])], { direction: "row", justify: "between", align: "center", gap: 12, wrap: true }),
  ], { gap: 10, pad: [20, 22, 20, 22], ...(expired ? { opacity: 0.62 } : {}) });
}
const codesList = (k: Ctx, b: Built, limit: number) => LIST(k, "codes", codeCard(k, b, false), { columns: 3, limit, feed: "live", sort: "newest", where: working, empty: CODES_W.empty });

/** Where the codes go in the game, in the makers' words. */
const howPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "surface");
  const card = CARD(k, [eyebrow(k, CODES_W.how, still), P(k, b.use.codes!.how, { ...still, quiet: false, style: { size: 17 } })], { gap: 8, pad: [20, 24, 20, 24] });
  return SEC(k, [STACK(k, [card], { maxWidth: "820px", width: "100%", self: "center" })], { name: CODES_W.how, pad: [40, 24, 40, 24] });
};
const activePart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [STACK(k, [codesList(k, b, 24)], { width: "100%" })], { name: CODES_W.codes });
};
const expiredPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "surface");
  return SEC(k, [head(k, CODES_W.expiredTitle, CODES_W.expiredSub), LIST(k, "codes", codeCard(k, b, true), { columns: 3, limit: 9, feed: "live", sort: "newest", where: over, empty: CODES_W.empty })], { name: CODES_W.expiredTitle });
};
/** On the home page: the latest working codes, and the way to all of them. */
export const codesBand = (b: Built): Part => (c) => {
  const k = withSkin(c, "surface");
  return SEC(k, [head(k, b.use.codes!.title, CODES_W.bandSub), codesList(k, b, 3), STACK(k, [B(k, CODES_W.all, b.slugs.codes, "outline")], { direction: "row", justify: "center", margin: [32, 0, 0, 0] })], { name: b.use.codes!.title });
};

export const CODES: SiteModule = {
  key: "codes",
  name: CODES_W.name,
  note: CODES_W.note,
  pages: (bp) => [{ key: "codes", slug: "/codes", order: 14, name: bp.modules.codes!.title, seo: bp.modules.codes!.sub, parts: (b) => [pageHead(b.use.codes!.title, b.use.codes!.sub, "soft"), howPart(b), activePart(b), expiredPart(b)] }],
  tables: (b) => [
    {
      key: "codes",
      slug: "codes",
      name: CODES_W.codes,
      fields: [
        f.text("code", CODES_W.code, { required: true, unique: true, max: 40, message: CODES_W.codeTaken }),
        f.text("reward", CODES_W.reward, { max: 120 }),
        { ...f.date("until", CODES_W.until), help: CODES_W.untilHelp },
        f.select("status", CODES_W.status, STATES, { default: "active" }),
      ],
      // Everyone reads them (the page asks in the visitor's browser); the game's own server may add and change them with a key.
      api: { read: "public", create: "key", update: "key", delete: "off" },
      rows: b.use.codes!.rows.map((r) => ({ slug: r.code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), data: { code: plain(r.code), reward: r.reward, ...(r.until ? { until: r.until } : {}), status: r.expired ? "expired" : "active" } })),
    },
  ],
  counts: (bp) => ({ tables: 1, rows: bp.modules.codes!.rows.length }),
  panel: () => ({
    numbers: [{ key: "codesActive", label: CODES_W.activeCount, table: T("codes"), where: [{ field: "status", op: "is", value: "active" }] }],
    lists: [{ kind: "view", key: "codesAll", title: CODES_W.newest, table: T("codes"), columns: ["code", "reward", "until", "status", "$createdAt"], sort: { field: "$createdAt", dir: "desc" }, limit: 50 }],
  }),
  // Every night a little after midnight (the store's clock): a working code past its last day becomes expired.
  functions: () => [
    {
      key: "codesExpire",
      name: CODES_W.expireFn.ar,
      note: "كل ليلة بعد نص الليل بخمس دقايق: كل كود شغّال مرق آخر يوم إله بيصير «خلص» وبيطلع من الأكواد الشغّالة.",
      def: {
        lang: "ar",
        inputs: [{ name: "at", type: "text" }],
        do: [
          { act: "find", table: T("codes"), filters: [{ field: "status", op: "is", value: "active" }], limit: 200, as: "found" },
          { act: "each", list: "{{found}}", as: "code", do: [{ act: "if", if: [{ left: "{{code.until}}", cmp: "notEmpty" }, { left: "{{code.until}}", cmp: "lt", right: "{{input.at}}" }], do: [{ act: "change", table: T("codes"), row: "{{code.$id}}", values: { status: "expired" } }] }] },
        ],
      },
      triggers: [{ kind: "schedule", config: { at: "00:05" } }],
    },
  ],
};
