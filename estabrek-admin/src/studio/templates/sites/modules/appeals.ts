/**
 * A game server's appeals and reports (wave G3 of docs/sites-300-plan.ar.md), on one page.
 *
 * An appeal is on a ban, by its number, and a ban has one (the table's field is the only one of its value, with the
 * owner's words when it isn't). A report is on a player: what they did (a reason), when, what happened, a link to the
 * clip and a picture (kept private: only the staff and the one who sent it open it); one report on a player waits
 * for its answer before another on the same player. Each is written as the signed-in player, who reads theirs and the
 * staff's answer, never writes their state or the answer (locked) nor sees the staff's notes (private). In the panel,
 * a queue for each; decided, the player hears by email.
 */
import { CARD, COLS, EL, H, P, SEC, STACK, pop, say, withSkin, type Ctx, type N } from "../../build";
import { w, type W } from "../../words";
import { APPEAL_W } from "../siteWords";
import { LIST, T, bound, f, pageHead, still, type Built, type Part, type SiteModule } from "./kit";

const APPEAL_STATES: Array<[string, W]> = [["fresh", APPEAL_W.fresh], ["review", APPEAL_W.review], ["lifted", APPEAL_W.lifted], ["kept", APPEAL_W.kept]];
const REPORT_STATES: Array<[string, W]> = [["fresh", APPEAL_W.fresh], ["review", APPEAL_W.review], ["actioned", APPEAL_W.actioned], ["dismissed", APPEAL_W.dismissed]];
/** A shopper adds theirs and reads them; never their state or the staff's answer, nor the staff's notes. */
const THEIRS = { read: "customer", create: "customer", update: "off", delete: "off", private: ["notes"], locked: ["status", "reply"] };

/** The two forms side by side: an appeal on a ban, a report on a player. */
const formsPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  const reasons = b.use.appeals!.reasons;
  const appeal = CARD(k, [
    H(k, APPEAL_W.appealTitle, 3, still),
    P(k, APPEAL_W.appealLine, still),
    EL(k, "form", {
      kind: "custom",
      fields: [
        { name: "ban", kind: "text", label: say(k, APPEAL_W.ban), hint: say(k, APPEAL_W.banHint), required: true, max: 40 },
        { name: "character", kind: "text", label: say(k, APPEAL_W.character), required: true },
        { name: "what", kind: "long", label: say(k, APPEAL_W.what), required: true },
        { name: "why", kind: "long", label: say(k, APPEAL_W.why), required: true },
      ],
      send: { to: "table", table: "appeals" },
      button: say(k, APPEAL_W.sendAppeal),
      done: say(k, APPEAL_W.appealSent),
    }, { style: { self: "stretch" } }),
  ], { gap: 14, pad: [28, 24, 28, 24] });
  const report = CARD(k, [
    H(k, APPEAL_W.reportTitle, 3, still),
    P(k, APPEAL_W.reportLine, still),
    EL(k, "form", {
      kind: "custom",
      fields: [
        { name: "who", kind: "text", label: say(k, APPEAL_W.who), required: true },
        { name: "reason", kind: "select", label: say(k, APPEAL_W.reason), required: true, options: reasons.map(([id, name]) => ({ value: id, label: say(k, name) })) },
        { name: "when", kind: "date", label: say(k, APPEAL_W.when) },
        { name: "story", kind: "long", label: say(k, APPEAL_W.story), required: true },
        { name: "clip", kind: "text", label: say(k, APPEAL_W.clip), hint: say(k, APPEAL_W.clipHint) },
        { name: "shot", kind: "file", label: say(k, APPEAL_W.shot) },
      ],
      send: { to: "table", table: "reports" },
      button: say(k, APPEAL_W.sendReport),
      done: say(k, APPEAL_W.reportSent),
    }, { style: { self: "stretch" } }),
  ], { gap: 14, pad: [28, 24, 28, 24] });
  return SEC(k, [
    P(k, APPEAL_W.signinFirst, { style: { size: 15, textAlign: "center", margin: [0, 0, 28, 0] } }),
    COLS(k, [1, 1], [[appeal], [report]], { gap: 32, align: "start", phone: "stack" }),
  ], { name: b.use.appeals!.title });
};

/** One of the player's own: what it was about, where it stands, the staff's answer. */
const sentCard = (c: Ctx, first: string, firstWords: W): N =>
  CARD(c, [
    STACK(c, [bound(H(c, firstWords, 4, still), { text: first }), bound(P(c, APPEAL_W.fresh, { ...still, quiet: false, style: { weight: 700, color: pop(c) } }), { text: "status" })], { direction: "row", justify: "between", align: "center", gap: 12, wrap: true }),
    bound(P(c, APPEAL_W.reply, { ...still, style: { size: 15 } }), { text: "reply" }),
  ], { gap: 8, pad: [18, 20, 18, 20] });
/** What the player sent: their appeals and their reports, read in their browser. */
const minePart: Part = (c) => {
  const k = withSkin(c, "surface");
  const list = (table: string, title: W, card: N) => STACK(k, [H(k, title, 3, still), LIST(k, table, card, { columns: 1, limit: 12, feed: "added", sort: "newest", empty: APPEAL_W.noneSent, signin: APPEAL_W.signin })], { gap: 16 });
  return SEC(k, [
    STACK(k, [H(k, APPEAL_W.mine, 2), P(k, APPEAL_W.mineSub)], { gap: 8, align: "center", textAlign: "center", margin: [0, 0, 32, 0] }),
    COLS(k, [1, 1], [[list("appeals", APPEAL_W.mineAppeals, sentCard(k, "ban", APPEAL_W.ban))], [list("reports", APPEAL_W.mineReports, sentCard(k, "who", APPEAL_W.who))]], { gap: 32, align: "start", phone: "stack" }),
  ], { name: APPEAL_W.mine });
};

const NAME = w("الاستئناف والبلاغ", "Appeals and reports", "ערעורים ודיווחים");
const open = (decided: string[]) => decided.map((value) => ({ field: "status", op: "isNot" as const, value }));
const newest = { field: "$createdAt", dir: "desc" as const };

export const APPEALS: SiteModule = {
  key: "appeals",
  name: NAME,
  note: w("استئناف على باند برقمه (مرّة لكل باند)، وبلاغ على لاعب بكليب أو صورة، وطابور لكل واحد باللوحة، وإيميل للاعب لما ينقرّر.", "An appeal on a ban by its number (one each), a report on a player with a clip or a picture, a queue for each in the panel, and an email to the player once decided.", "ערעור על באן לפי מספרו (אחד לכל באן), דיווח על שחקן עם קליפ או תמונה, תור לכל אחד בלוח, ומייל לשחקן כשהוחלט."),
  pages: (bp) => [{ key: "appeal", slug: "/appeal", order: 35, name: bp.modules.appeals!.title, seo: bp.modules.appeals!.sub, parts: (b) => [pageHead(b.use.appeals!.title, b.use.appeals!.sub, "soft"), formsPart(b), minePart] }],
  tables: (b) => [
    {
      key: "appeals",
      slug: "appeals",
      name: APPEAL_W.appeals,
      fields: [
        // One appeal for each ban, whoever sends it.
        f.text("ban", APPEAL_W.ban, { required: true, unique: true, max: 40, message: APPEAL_W.banTaken }),
        f.text("character", APPEAL_W.characterField, { required: true }),
        f.long("what", APPEAL_W.what, { required: true }),
        f.long("why", APPEAL_W.why, { required: true }),
        f.select("status", APPEAL_W.status, APPEAL_STATES, { default: "fresh" }),
        f.long("reply", APPEAL_W.reply),
        f.long("notes", APPEAL_W.notes),
      ],
      api: THEIRS,
    },
    {
      key: "reports",
      slug: "reports",
      name: APPEAL_W.reports,
      fields: [
        f.text("who", APPEAL_W.who, { required: true }),
        f.select("reason", APPEAL_W.reason, b.use.appeals!.reasons, { required: true }),
        f.date("when", APPEAL_W.when),
        f.long("story", APPEAL_W.story, { required: true }),
        f.link("clip", APPEAL_W.clip),
        // A picture the player uploads, opened only by who may read the row.
        f.file("shot", APPEAL_W.shot, { maxMb: 8, kinds: ["image"], private: true }),
        f.select("status", APPEAL_W.status, REPORT_STATES, { default: "fresh" }),
        f.long("reply", APPEAL_W.reply),
        f.long("notes", APPEAL_W.notes),
      ],
      api: THEIRS,
    },
  ],
  counts: () => ({ tables: 2, rows: 0 }),
  // A report on a player waits while the last one on them from the same player is still being looked at.
  waits: () => [{ table: T("reports"), same: ["who"], days: 0, open: { field: "status", values: ["fresh", "review"] } }],
  panel: () => ({
    numbers: [
      { key: "appealsWaiting", label: APPEAL_W.appealsWaiting, table: T("appeals"), where: open(["lifted", "kept"]) },
      { key: "reportsWaiting", label: APPEAL_W.reportsWaiting, table: T("reports"), where: open(["actioned", "dismissed"]) },
    ],
    today: [
      {
        kind: "queue",
        key: "appeals",
        title: APPEAL_W.appeals,
        table: T("appeals"),
        where: open(["lifted", "kept"]),
        show: ["$by", "ban", "character", "what", "why", "status", "$createdAt"],
        decisions: [
          { key: "review", label: APPEAL_W.startReview, set: { status: "review" } },
          { key: "lift", label: APPEAL_W.lift, set: { status: "lifted" }, tone: "good" },
          { key: "keep", label: APPEAL_W.keep, set: { status: "kept" }, tone: "bad" },
        ],
        empty: APPEAL_W.noAppeals,
      },
      {
        kind: "queue",
        key: "reports",
        title: APPEAL_W.reports,
        table: T("reports"),
        where: open(["actioned", "dismissed"]),
        show: ["$by", "who", "reason", "when", "story", "clip", "shot", "status"],
        decisions: [
          { key: "review", label: APPEAL_W.startReview, set: { status: "review" } },
          { key: "act", label: APPEAL_W.act, set: { status: "actioned" }, tone: "good" },
          { key: "dismiss", label: APPEAL_W.dismiss, set: { status: "dismissed" } },
        ],
        empty: APPEAL_W.noReports,
      },
    ],
    lists: [
      { kind: "view", key: "appealsAll", title: APPEAL_W.allAppeals, table: T("appeals"), columns: ["$by", "ban", "character", "status", "reply", "$createdAt"], sort: newest, limit: 30 },
      { kind: "view", key: "reportsAll", title: APPEAL_W.allReports, table: T("reports"), columns: ["$by", "who", "reason", "status", "reply", "$createdAt"], sort: newest, limit: 30 },
    ],
    reports: [
      { kind: "chart", key: "reportsDaily", title: APPEAL_W.reportsDaily, table: T("reports"), days: 30, split: "reason" },
      { kind: "report", key: "reportsBy", title: APPEAL_W.reportsBy, table: T("reports"), by: "reason", columns: ["$by", "who", "reason", "when", "status", "$createdAt"] },
    ],
  }),
  functions: () => {
    const became = (state: string) => [{ left: "{{input.row.status}}", cmp: "eq", right: state }, { left: "{{input.before.status}}", cmp: "ne", right: state }];
    const player = { act: "customer", who: "{{input.row.$owner}}", mark: "read", as: "player" };
    const changed = (table: string) => [{ kind: "row" as const, config: { table: T(table), on: ["changed"] } }];
    return [
      {
        key: "appealsBell",
        name: APPEAL_W.bell.ar,
        note: "بيوصلك جرس بلوحة الإدارة مع كل استئناف أو بلاغ جديد.",
        def: { lang: "ar", inputs: [{ name: "row", type: "any" }, { name: "table", type: "text" }], do: [{ act: "notify", title: "استئناف أو بلاغ جديد", text: "افتح لوحة الموقع لتشوفه وتقرّر.", link: "/admin/data" }] },
        triggers: [{ kind: "row", config: { table: T("appeals"), on: ["added"] } }, { kind: "row", config: { table: T("reports"), on: ["added"] } }],
      },
      {
        key: "appealDecided",
        name: APPEAL_W.appealDecided.ar,
        note: "لما ينشال الباند أو يضل، بيوصل اللاعب إيميل فيه رد الطاقم.",
        def: {
          lang: "ar",
          inputs: [{ name: "row", type: "any" }, { name: "before", type: "any" }],
          if: [{ left: "{{input.row.status}}", cmp: "ne", right: "{{input.before.status}}" }],
          do: [
            player,
            { act: "if", if: became("lifted"), do: [{ act: "email", to: "{{player.email}}", subject: "انشال الباند", text: "أهلين {{player.name}}،\nراجعنا استئنافك على الباند {{input.row.ban}} وشلناه. منستنّاك بالمدينة، وانتبه للقوانين.\n{{input.row.reply}}" }] },
            { act: "if", if: became("kept"), do: [{ act: "email", to: "{{player.email}}", subject: "عن استئنافك", text: "أهلين {{player.name}}،\nراجعنا استئنافك على الباند {{input.row.ban}}، والباند باقي.\n{{input.row.reply}}" }] },
          ],
        },
        triggers: changed("appeals"),
      },
      {
        key: "reportDecided",
        name: APPEAL_W.reportDecided.ar,
        note: "لما يتقرّر بلاغ، بيوصل اللي بعته إيميل شكر فيه رد الطاقم.",
        def: {
          lang: "ar",
          inputs: [{ name: "row", type: "any" }, { name: "before", type: "any" }],
          if: [{ left: "{{input.row.status}}", cmp: "ne", right: "{{input.before.status}}" }],
          do: [
            player,
            { act: "if", if: became("actioned"), do: [{ act: "email", to: "{{player.email}}", subject: "عن بلاغك", text: "أهلين {{player.name}}،\nشكراً عالبلاغ على {{input.row.who}}. راجعناه وانعمل إجراء.\n{{input.row.reply}}" }] },
            { act: "if", if: became("dismissed"), do: [{ act: "email", to: "{{player.email}}", subject: "عن بلاغك", text: "أهلين {{player.name}}،\nشكراً عالبلاغ على {{input.row.who}}. راجعناه وما لقينا سبب لإجراء هالمرة.\n{{input.row.reply}}" }] },
          ],
        },
        triggers: changed("reports"),
      },
    ];
  },
};
