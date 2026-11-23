/**
 * A game server's rules and its applications (wave G3 of docs/sites-300-plan.ar.md).
 *
 * The rules: numbered sections (1.1, 2.3) read from a table the owner edits, with "last changed" and what changed (a
 * setting) at the top of the page; a player agrees to them as they apply.
 *
 * Applying: a page with the kinds (the whitelist, a job like police or paramedics, the staff), each with its own page
 * and form (its own question), writing an application as the signed-in player (the table is theirs to add to and to
 * read their own rows, never to write its state). The site's rule (SiteWait, the backend's lib/siteWaits.ts) holds a
 * new one back while their last for that kind waits for an answer, and for some days after it. «طلباتي» lists theirs
 * with the staff's answer. In the panel, the staff vote on each (one vote each, lib/siteVotes.ts), and «اقبل» waits
 * for enough yes; accepted, a function adds the player to the whitelist and writes to them, and another (once the
 * owner picks their Discord connection) gives them the kind's role and tells the staff's channel of each new one.
 */
import { B, CARD, COLS, EL, GRID, H, P, SEC, STACK, eyebrow, pop, say, withSkin, type Ctx, type N } from "../../build";
import { w, type W } from "../../words";
import type { ApplyKind, SiteBlueprint, SiteSetting } from "../blueprint";
import { APPLY_W, RULES_W } from "../siteWords";
import { LIST, T, bound, callBand, f, fromSetting, pageHead, shownIf, still, type Built, type Part, type SiteModule } from "./kit";

/* ---------------- The rules ---------------- */

/** A rule as a list's card: its number, its title and what it says. */
function ruleCard(c: Ctx, b: Built): N {
  const r = b.use.rules!.sections[0].rows[0];
  return STACK(c, [
    bound(P(c, w(r.n, r.n, r.n), { ...still, quiet: false, style: { size: 18, weight: 800, color: pop(c), width: "56px" } }), { text: "number" }),
    STACK(c, [bound(H(c, r.title, 4, still), { text: "title" }), bound(P(c, r.text, { ...still, style: { size: 15 } }), { text: "text" })], { gap: 4 }),
  ], { direction: "row", gap: 16, align: "start" });
}
/** When the rules last changed and what changed (the owner's words, a setting). */
const changedPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "surface");
  const card = CARD(k, [eyebrow(k, RULES_W.changedLabel, still), fromSetting(P(k, b.use.rules!.changed, { ...still, quiet: false, style: { size: 17 } }), { text: "rulesChanged" })], { gap: 8, pad: [20, 24, 20, 24] });
  return SEC(k, [STACK(k, [card], { maxWidth: "820px", width: "100%", self: "center" })], { name: RULES_W.changedLabel, pad: [40, 24, 40, 24] });
};
/** One section of the rules: its number and name, and its rules in the owner's order. */
const sectionPart = (b: Built, i: number): Part => (c) => {
  const k = withSkin(c, i % 2 ? "surface" : "plain");
  const s = b.use.rules!.sections[i];
  const n = String(i + 1);
  const title = w(`${n}. ${s.name.ar}`, `${n}. ${s.name.en}`, `${n}. ${s.name.he}`);
  return SEC(k, [STACK(k, [H(k, title, 2), LIST(k, "rules", ruleCard(k, b), { columns: 1, limit: 48, where: [{ field: "section", op: "is", value: s.key }] })], { gap: 24, maxWidth: "820px", width: "100%", self: "center" })], { name: s.name });
};
const rulesParts = (b: Built): Part[] => [pageHead(b.use.rules!.title, b.use.rules!.sub, "soft"), changedPart(b), ...b.use.rules!.sections.map((_, i) => sectionPart(b, i))];

const RULES_NAME = w("القوانين", "Rules", "חוקים");
export const RULES: SiteModule = {
  key: "rules",
  name: RULES_NAME,
  note: w("القوانين بأقسام مرقّمة من جدول، وآخر تعديل فوقها، واللاعب بيوافق عليها وهو بيقدّم.", "The rules in numbered sections from a table, the last change above them; a player agrees to them as they apply.", "החוקים בפרקים ממוספרים מטבלה, השינוי האחרון מעליהם; שחקן מסכים להם כשהוא מגיש."),
  pages: (bp) => [{ key: "rules", slug: "/rules", order: 20, name: bp.modules.rules!.title, seo: bp.modules.rules!.sub, parts: rulesParts }],
  tables: (b) => {
    const r = b.use.rules!;
    return [{
      key: "rules",
      slug: "rules",
      name: r.title,
      fields: [f.text("number", RULES_W.number, { required: true }), f.select("section", RULES_W.section, r.sections.map((s): [string, W] => [s.key, s.name])), f.text("title", RULES_W.rule, { required: true }), f.long("text", RULES_W.text), f.date("changed", RULES_W.changed)],
      rows: r.sections.flatMap((s) => s.rows.map((x) => ({ data: { number: w(x.n, x.n, x.n), section: s.key, title: x.title, text: x.text, changed: r.date } }))),
    }];
  },
  counts: (bp) => ({ tables: 1, rows: bp.modules.rules!.sections.reduce((n, s) => n + s.rows.length, 0) }),
  settings: (bp) => [{ key: "rulesChanged", kind: "words", label: RULES_W.changedSetting, note: RULES_W.changedNote, group: RULES_NAME, public: true, long: true, default: bp.modules.rules!.changed }],
  panel: () => ({ lists: [{ kind: "view", key: "rules", title: RULES_W.allRules, table: T("rules"), columns: ["number", "section", "title", "changed"], sort: { field: "number", dir: "asc" }, limit: 50 }] }),
};

/* ---------------- Applying ---------------- */

/** A kind's own page, under the applications' page (not in the site's menu). */
const kindSlug = (kind: ApplyKind) => `/apply/${kind.key}`;
/** A kind's Discord role setting ("rolePolice"). */
const roleKey = (kind: ApplyKind) => `role${kind.key[0].toUpperCase()}${kind.key.slice(1)}`;
const STATES: Array<[string, W]> = [["fresh", APPLY_W.fresh], ["review", APPLY_W.review], ["interview", APPLY_W.interview], ["accepted", APPLY_W.accepted], ["rejected", APPLY_W.rejected]];
/** A row still waiting for an answer (holds a new one of its kind back). */
const OPEN = ["fresh", "review", "interview"];

/** The kinds as cards, each with what it takes and the way to its form. */
const kindsPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  const a = b.use.apply!;
  return SEC(k, [
    STACK(k, [H(k, APPLY_W.pick, 2), P(k, APPLY_W.pickSub, { style: { maxWidth: "620px" } })], { gap: 12, align: "center", textAlign: "center", margin: [0, 0, 40, 0] }),
    GRID(k, Math.min(4, a.kinds.length), a.kinds.map((kind) => CARD(k, [
      H(k, kind.name, 3, still),
      P(k, kind.line, still),
      eyebrow(k, APPLY_W.needs, still),
      P(k, kind.needs, { ...still, style: { size: 15 } }),
      STACK(k, [B(k, APPLY_W.apply, kindSlug(kind), "solid", still)], { direction: "row" }),
    ], { gap: 10, pad: [24, 22, 24, 22] })), { gap: 24, phone: 1 }),
  ], { name: APPLY_W.pick });
};
/** The player's own applications, read in their browser: what each was for, where it stands, the staff's answer. */
const minePart: Part = (c) => {
  const k = withSkin(c, "surface");
  const card = CARD(k, [
    STACK(k, [bound(H(k, APPLY_W.kind, 4, still), { text: "kind" }), bound(P(k, APPLY_W.fresh, { ...still, quiet: false, style: { weight: 700, color: pop(k) } }), { text: "status" })], { direction: "row", justify: "between", align: "center", gap: 12, wrap: true }),
    bound(P(k, APPLY_W.character, still), { text: "character" }),
    bound(P(k, APPLY_W.reply, { ...still, style: { size: 15 } }), { text: "reply" }),
  ], { gap: 8, pad: [20, 22, 20, 22] });
  return SEC(k, [STACK(k, [
    STACK(k, [H(k, APPLY_W.mine, 2), P(k, APPLY_W.mineSub)], { gap: 8 }),
    LIST(k, "applications", card, { columns: 1, limit: 12, feed: "added", sort: "newest", empty: APPLY_W.mineEmpty, signin: APPLY_W.mineSignin }),
  ], { gap: 24, maxWidth: "820px", width: "100%", self: "center" })], { name: APPLY_W.mine });
};
/** A kind's form: the questions every kind asks, its own, and the rules agreed to; or the owner's words while closed. */
const kindForm = (b: Built, kind: ApplyKind): Part => (c) => {
  const k = withSkin(c, "plain");
  const form = CARD(k, [EL(k, "form", {
    kind: "custom",
    fields: [
      { name: "character", kind: "text", label: say(k, APPLY_W.character), required: true },
      { name: "age", kind: "number", label: say(k, APPLY_W.age), required: true, min: 10, max: 99 },
      { name: "story", kind: "long", label: say(k, APPLY_W.story), hint: say(k, APPLY_W.storyHint), required: true },
      { name: "why", kind: "long", label: say(k, APPLY_W.why), required: true },
      { name: "question", kind: "long", label: say(k, APPLY_W.question), hint: say(k, kind.question), required: true },
      { name: "rules", kind: "check", label: say(k, APPLY_W.rules), required: true },
    ],
    send: { to: "table", table: "applications", set: { kind: kind.key } },
    button: say(k, APPLY_W.send),
    done: say(k, APPLY_W.sent),
  }, { style: { self: "stretch" } })], { gap: 16, pad: [32, 28, 32, 28] });
  const closed = CARD(k, [fromSetting(P(k, APPLY_W.closedText, { ...still, quiet: false, style: { size: 18, weight: 600 } }), { text: "applyClosed" })], { gap: 16, pad: [32, 28, 32, 28] });
  const side = STACK(k, [
    H(k, APPLY_W.needs, 3, still),
    P(k, kind.needs, still),
    H(k, APPLY_W.beforeYou, 4, still),
    P(k, APPLY_W.beforeLine, still),
    STACK(k, [B(k, RULES_W.read, b.slugs.rules ?? b.slugs.home, "outline", still)], { direction: "row" }),
    P(k, APPLY_W.signinFirst, { ...still, style: { size: 14 } }),
  ], { gap: 12 });
  return SEC(k, [COLS(k, [2, 3], [[side], [shownIf(form, "applyOpen"), shownIf(closed, "applyOpen", false)]], { gap: 48, align: "start", phone: "stack" })], { name: kind.name });
};
/** A band on the home page calling to apply (beside the server's status). */
export const applyBand = (b: Built): Part => callBand(APPLY_W.bandTitle, APPLY_W.bandSub, APPLY_W.apply, b.slugs.apply, "bold");

const APPLY_NAME = w("التقديم", "Applications", "הגשות");
const waiting = [{ field: "status", op: "isNot" as const, value: "accepted" }, { field: "status", op: "isNot" as const, value: "rejected" }];
const newest = { field: "$createdAt", dir: "desc" as const };

/** Each kind's settings: its Discord role. */
const roleSettings = (bp: SiteBlueprint): SiteSetting[] => bp.modules.apply!.kinds.map((kind) => ({ key: roleKey(kind), kind: "text", label: w(`${APPLY_W.role.ar} ${kind.name.ar}`, `${APPLY_W.role.en} ${kind.name.en}`, `${APPLY_W.role.he}${kind.name.he}`), note: APPLY_W.roleNote, group: APPLY_W.discordGroup, default: "" }));

export const APPLY: SiteModule = {
  key: "apply",
  name: APPLY_NAME,
  note: w("التقديم على الوايتلست والوظائف والطاقم: صفحة وفورم لكل دور، «طلباتي»، تصويت الطاقم، انتظار قبل ما يقدّم مرة تانية، ولما ينقبل: الوايتلست ورتبة ديسكورد وإيميل.", "Applying for the whitelist, jobs and the staff: a page and a form for each, «my applications», the staff's votes, a wait before applying again, and once accepted: the whitelist, a Discord role and an email.", "הגשה לרשימה הלבנה, לעבודות ולצוות: עמוד וטופס לכל תפקיד, «הבקשות שלי», הצבעת הצוות, המתנה לפני הגשה חוזרת, וכשמתקבלים: הרשימה הלבנה, תפקיד בדיסקורד ומייל."),
  needs: () => ["rules"],
  pages: (bp) => {
    const a = bp.modules.apply!;
    return [
      { key: "apply", slug: "/apply", order: 25, name: a.title, seo: a.sub, parts: (b) => [pageHead(a.title, a.sub, "soft"), kindsPart(b), minePart] },
      ...a.kinds.map((kind, i) => ({ key: `apply-${kind.key}`, slug: kindSlug(kind), order: 26 + i, name: kind.name, seo: kind.line, menu: false as const, parts: (b: Built) => [pageHead(w(`${APPLY_W.applyFor.ar} ${kind.name.ar}`, `${APPLY_W.applyFor.en} ${kind.name.en}`, `${APPLY_W.applyFor.he}${kind.name.he}`), kind.line, "soft"), kindForm(b, kind)] })),
    ];
  },
  tables: (b) => {
    const a = b.use.apply!;
    return [
      {
        key: "applications",
        slug: "applications",
        name: APPLY_W.applications,
        fields: [
          f.select("kind", APPLY_W.kind, a.kinds.map((x): [string, W] => [x.key, x.name]), { required: true }),
          f.text("character", APPLY_W.characterField, { required: true }),
          f.num("age", APPLY_W.ageField, { min: 10, max: 99 }),
          f.long("story", APPLY_W.storyField, { required: true }),
          f.long("why", APPLY_W.whyField, { required: true }),
          f.long("question", APPLY_W.question, { required: true }),
          f.bool("rules", APPLY_W.rulesField),
          f.select("status", APPLY_W.status, STATES, { default: "fresh" }),
          f.long("reply", APPLY_W.reply),
          f.long("notes", APPLY_W.notes),
        ],
        // A signed-in player adds theirs and reads them; never its state or the staff's answer (locked), nor the staff's notes (private).
        api: { read: "customer", create: "customer", update: "off", delete: "off", private: ["notes"], locked: ["status", "reply"] },
      },
      {
        key: "whitelist",
        slug: "whitelist",
        name: APPLY_W.whitelist,
        fields: [f.text("player", APPLY_W.player, { required: true }), f.email("email", APPLY_W.email), f.text("discordId", w("Discord", "Discord", "Discord")), f.text("steamId", w("Steam", "Steam", "Steam")), f.select("kind", APPLY_W.kind, a.kinds.map((x): [string, W] => [x.key, x.name]))],
      },
    ];
  },
  counts: () => ({ tables: 2, rows: 0 }),
  // One application of a kind at a time, and again only after the days its owner sets.
  waits: (bp) => [{ table: T("applications"), same: ["kind"], days: bp.modules.apply!.wait, setting: "applyWaitDays", open: { field: "status", values: OPEN } }],
  settings: (bp) => [
    { key: "applyOpen", kind: "toggle", label: APPLY_W.open, note: APPLY_W.openNote, group: APPLY_NAME, public: true, default: true },
    { key: "applyClosed", kind: "words", label: APPLY_W.closed, group: APPLY_NAME, public: true, long: true, default: APPLY_W.closedText },
    { key: "applyWaitDays", kind: "number", label: APPLY_W.wait, note: APPLY_W.waitNote, group: APPLY_NAME, default: bp.modules.apply!.wait, min: 0, max: 90, whole: true, unit: APPLY_W.days },
    { key: "applyVotes", kind: "number", label: APPLY_W.votes, note: APPLY_W.votesNote, group: APPLY_NAME, default: bp.modules.apply!.votes, min: 0, max: 20, whole: true },
    ...roleSettings(bp),
  ],
  panel: () => ({
    numbers: [
      { key: "applicationsWaiting", label: APPLY_W.waiting, table: T("applications"), where: waiting },
      { key: "applicationsWeek", label: APPLY_W.week, table: T("applications"), window: "week", compare: true },
    ],
    today: [{
      kind: "queue",
      key: "applications",
      title: APPLY_W.queue,
      table: T("applications"),
      where: waiting,
      show: ["$by", "kind", "character", "age", "story", "why", "question", "status"],
      votes: { need: "applyVotes" },
      decisions: [
        { key: "review", label: APPLY_W.startReview, set: { status: "review" } },
        { key: "interview", label: APPLY_W.toInterview, set: { status: "interview" } },
        { key: "accept", label: APPLY_W.accept, set: { status: "accepted" }, tone: "good", afterVotes: true },
        { key: "reject", label: APPLY_W.reject, set: { status: "rejected" }, tone: "bad" },
      ],
      empty: APPLY_W.none,
    }],
    board: [{ kind: "kanban", key: "applicationsBoard", title: APPLY_W.board, table: T("applications"), field: "status", show: ["$by", "kind", "character"] }],
    lists: [
      { kind: "view", key: "applicationsAll", title: APPLY_W.all, table: T("applications"), columns: ["$by", "kind", "character", "status", "reply", "$createdAt"], sort: newest, limit: 30 },
      { kind: "view", key: "whitelist", title: APPLY_W.whitelist, table: T("whitelist"), columns: ["player", "email", "discordId", "steamId", "kind", "$createdAt"], sort: newest, limit: 30 },
    ],
    reports: [
      { kind: "chart", key: "applicationsDaily", title: APPLY_W.daily, table: T("applications"), days: 30, split: "kind" },
      { kind: "report", key: "applicationsBy", title: APPLY_W.byKind, table: T("applications"), by: "kind", columns: ["$by", "kind", "character", "age", "status", "$createdAt"] },
    ],
    actions: [
      { key: "applyClose", label: APPLY_W.close, note: APPLY_W.closeNote, setting: "applyOpen", value: false },
      { key: "applyOpenNow", label: APPLY_W.openIt, setting: "applyOpen", value: true },
    ],
  }),
  functions: (b) => {
    const kinds = b.use.apply!.kinds;
    const changed = [{ kind: "row" as const, config: { table: T("applications"), on: ["changed"] } }];
    const became = (state: string) => [{ left: "{{input.row.status}}", cmp: "eq", right: state }, { left: "{{input.before.status}}", cmp: "ne", right: state }];
    return [
      {
        key: "applyNew",
        name: APPLY_W.newBell.ar,
        note: "بيوصلك جرس بلوحة الإدارة مع كل طلب تقديم جديد.",
        def: { lang: "ar", inputs: [{ name: "row", type: "any" }], do: [{ act: "notify", title: "طلب تقديم جديد: {{input.row.character}}", text: "افتح طابور التقديم بلوحة الموقع لتقراه وتصوّت عليه.", link: "/admin/data" }] },
        triggers: [{ kind: "row", config: { table: T("applications"), on: ["added"] } }],
      },
      {
        key: "applyDecided",
        name: APPLY_W.decided.ar,
        note: "لما يتغيّر حال طلب: للمقابلة إيميل للاعب، للقبول سطر بالوايتلست وإيميل، للرفض إيميل فيه رد الطاقم وإمتى بيقدر يقدّم مرة تانية.",
        def: {
          lang: "ar",
          inputs: [{ name: "row", type: "any" }, { name: "before", type: "any" }],
          if: [{ left: "{{input.row.status}}", cmp: "ne", right: "{{input.before.status}}" }],
          do: [
            { act: "customer", who: "{{input.row.$owner}}", mark: "read", as: "player" },
            { act: "if", if: became("interview"), do: [{ act: "email", to: "{{player.email}}", subject: "انعزمت عالمقابلة", text: "أهلين {{player.name}}،\nطلبك ({{input.row.character}}) مرق من المراجعة، والطاقم بدّه يعمل معك مقابلة. تابع الديسكورد لتعرف الموعد.\n{{input.row.reply}}" }] },
            {
              act: "if",
              if: became("accepted"),
              do: [
                { act: "add", table: T("whitelist"), values: { player: "{{input.row.character}}", email: "{{player.email}}", discordId: "{{player.discordId}}", steamId: "{{player.steamId}}", kind: "{{input.row.kind}}" } },
                { act: "email", to: "{{player.email}}", subject: "انقبلت!", text: "مبروك {{player.name}}،\nطلبك ({{input.row.character}}) انقبل. منستنّاك بالمدينة.\n{{input.row.reply}}" },
              ],
            },
            { act: "if", if: became("rejected"), do: [{ act: "email", to: "{{player.email}}", subject: "عن طلبك", text: "أهلين {{player.name}}،\nطلبك ({{input.row.character}}) ما انقبل هالمرة.\n{{input.row.reply}}\nفيك تقدّم مرة تانية بعد {{settings.applyWaitDays}} يوم." }] },
          ],
        },
        triggers: changed,
      },
      {
        key: "applyDiscord",
        name: APPLY_W.discordFn.ar,
        note: "بتحتاج اتصال ديسكورد (الاتصالات والأسرار ← ديسكورد): افتحها، اختار الاتصال بخطواتها، حط أرقام الرتب بإعدادات الموقع، وانشرها. مع كل طلب جديد بتبعت سطر لقناة الطاقم، ولما ينقبل حدا بتعطيه رتبة دوره.",
        def: {
          lang: "ar",
          inputs: [{ name: "row", type: "any" }, { name: "before", type: "any" }, { name: "event", type: "text" }],
          do: [
            { act: "if", if: [{ left: "{{input.event}}", cmp: "eq", right: "added" }], do: [{ act: "ready", via: "", what: "message", give: { text: "طلب تقديم جديد: {{input.row.character}} ({{input.row.kind}}). افتح لوحة الموقع لتصوّت." } }] },
            {
              act: "if",
              if: [{ left: "{{input.event}}", cmp: "eq", right: "changed" }, ...became("accepted")],
              do: [
                { act: "customer", who: "{{input.row.$owner}}", mark: "read", as: "player" },
                ...kinds.map((kind) => ({ act: "if", if: [{ left: "{{input.row.kind}}", cmp: "eq", right: kind.key }, { left: `{{settings.${roleKey(kind)}}}`, cmp: "notEmpty" }, { left: "{{player.discordId}}", cmp: "notEmpty" }], do: [{ act: "ready", via: "", what: "giveRole", give: { member: "{{player.discordId}}", role: `{{settings.${roleKey(kind)}}}` } }] })),
              ],
            },
          ],
        },
        triggers: [{ kind: "row", config: { table: T("applications"), on: ["added", "changed"] } }],
      },
    ];
  },
};
