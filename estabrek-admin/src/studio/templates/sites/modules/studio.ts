/**
 * A game studio's own pieces (wave G7d1 of docs/sites-300-plan.ar.md: a FiveM script studio, a Minecraft plugin studio),
 * around what it sells (FiveM scripts through its Tebex webstore, Minecraft plugins through the store itself):
 *
 *   «التوثيق»        pages for each product (installing, setting up, commands), each with the version it is for and a page of its own
 *   «التحديثات»      each product's versions, newest first: their day and whether they added, changed or fixed (open to read, so a
 *                    product can check for a newer one)
 *   «الدعم»          a signed-in customer's support tickets for a product (a picture if they like), their own list with the team's
 *                    answer; one open ticket per product; an answer reaches them by email
 *   «منتجات المتجر»  the store's own products on the site's page (each sold, paid for and delivered by the store: its code, its
 *                    serial and licence, its download)
 */
import { B, CARD, COLS, EL, H, P, SEC, STACK, eyebrow, pop, say, withSkin, type Ctx, type N } from "../../build";
import type { W } from "../../words";
import { DOCS_W, GOODS_W, RELEASES_W, TICKETS_W } from "../siteWords";
import { LIST, T, bound, callBand, f, head, pageHead, still, tree, type Built, type Part, type SiteModule } from "./kit";
import { mcNoticePart } from "./mcstore";

const plain = (v: string) => ({ ar: v, en: v, he: v });
const labelOf = (list: Array<[string, W]>, id: string | undefined) => list.find(([x]) => x === id)?.[1] ?? list[0][1];

/* ---------------- Documentation ---------------- */

/** A docs page as a line in its product's list: its title, its version and the way to it. */
function docLine(k: Ctx, b: Built): N {
  const d = b.use.docs!.rows[0];
  return CARD(k, [
    STACK(k, [
      STACK(k, [bound(H(k, d?.title ?? DOCS_W.title, 4, still), { text: "title" }), bound(P(k, plain(d?.version ?? "1.0"), { ...still, style: { size: 14 } }), { text: "version" })], { gap: 2 }),
      bound(B(k, DOCS_W.read, "#", "link", still), { href: "$url" }),
    ], { direction: "row", justify: "between", align: "center", gap: 12, wrap: true }),
  ], { gap: 0, pad: [16, 22, 16, 22] });
}
/** A docs page on its own: its product, title, version and what it says. */
function docPage(c: Ctx, b: Built): N {
  const d = b.use.docs!;
  const first = d.rows[0];
  const k = withSkin(c, "plain");
  return SEC(k, [STACK(k, [
    STACK(k, [B(k, DOCS_W.back, b.slugs.docs, "link", still)], { direction: "row" }),
    bound(eyebrow(k, labelOf(d.products, first?.product), still), { text: "product" }),
    bound(H(k, first?.title ?? DOCS_W.title, 1, still), { text: "title" }),
    STACK(k, [P(k, DOCS_W.version, { ...still, style: { size: 14 } }), bound(P(k, plain(first?.version ?? "1.0"), { ...still, quiet: false, style: { size: 14, weight: 700, color: pop(k) } }), { text: "version" })], { direction: "row", gap: 6, align: "center" }),
    bound(P(k, first?.body ?? DOCS_W.body, { ...still, quiet: false, style: { size: 18, lineHeight: 1.9 } }), { text: "body" }),
  ], { gap: 16, maxWidth: "820px", width: "100%", self: "center" })], { name: first?.title ?? DOCS_W.title, pad: [48, 24, 96, 24] });
}
/** One product's docs, in the owner's order. */
const productDocs = (b: Built, i: number): Part => (c) => {
  const k = withSkin(c, i % 2 ? "surface" : "plain");
  const [id, name] = b.use.docs!.products[i];
  return SEC(k, [STACK(k, [H(k, name, 2), LIST(k, "docs", docLine(k, b), { columns: 1, limit: 48, where: [{ field: "product", op: "is", value: id }], empty: DOCS_W.empty })], { gap: 20, maxWidth: "820px", width: "100%", self: "center" })], { name });
};
export const docsBand = (b: Built): Part => callBand(DOCS_W.bandTitle, DOCS_W.bandSub, DOCS_W.open, b.slugs.docs, "surface");

export const DOCS: SiteModule = {
  key: "docs",
  name: DOCS_W.name,
  note: DOCS_W.note,
  pages: (bp) => [{ key: "docs", slug: "/docs", order: 24, name: bp.modules.docs!.title, seo: bp.modules.docs!.sub, parts: (b) => [pageHead(b.use.docs!.title, b.use.docs!.sub, "soft"), ...b.use.docs!.products.map((_, i) => productDocs(b, i))] }],
  tables: (b, c) => {
    const d = b.use.docs!;
    return [{
      key: "docs",
      slug: "docs",
      name: DOCS_W.docs,
      fields: [f.select("product", DOCS_W.product, d.products, { required: true }), f.text("title", DOCS_W.title, { required: true, max: 120 }), f.text("version", DOCS_W.version, { max: 20 }), f.long("body", DOCS_W.body)],
      itemPage: tree(docPage(c, b)),
      rows: d.rows.map((r) => ({ slug: r.slug, data: { product: r.product, title: r.title, version: plain(r.version), body: r.body } })),
    }];
  },
  counts: (bp) => ({ tables: 1, rows: bp.modules.docs!.rows.length }),
  panel: () => ({ lists: [{ kind: "view", key: "docsAll", title: DOCS_W.all, table: T("docs"), columns: ["product", "title", "version", "$status"] }] }),
};

/* ---------------- Changelog ---------------- */

const KINDS: Array<[string, W]> = [["added", RELEASES_W.added], ["changed", RELEASES_W.changed], ["fixed", RELEASES_W.fixed]];
/** A version: its number and product, its day, what kind of change, and what's in it. */
function releaseCard(k: Ctx, b: Built): N {
  const r = b.use.releases!;
  const first = r.rows[0];
  return CARD(k, [
    STACK(k, [
      STACK(k, [bound(H(k, plain(first?.version ?? "1.0.0"), 4, still), { text: "version" }), bound(eyebrow(k, labelOf(r.products, first?.product), still), { text: "product" })], { direction: "row", gap: 12, align: "center", wrap: true }),
      STACK(k, [bound(P(k, labelOf(KINDS, first?.kind), { ...still, quiet: false, style: { size: 14, weight: 700, color: pop(k) } }), { text: "kind" }), bound(P(k, plain(first?.date ?? "2026-11-20"), { ...still, style: { size: 14 } }), { text: "date" })], { direction: "row", gap: 10, align: "center" }),
    ], { direction: "row", justify: "between", align: "center", gap: 12, wrap: true }),
    bound(P(k, first?.changes ?? RELEASES_W.changes, { ...still, style: { size: 15 } }), { text: "changes" }),
  ], { gap: 8, pad: [18, 22, 18, 22] });
}
const newest = [{ field: "date", dir: "desc" as const }, { field: "version", dir: "desc" as const }];
const releasesList = (k: Ctx, b: Built, limit: number) => LIST(k, "releases", releaseCard(k, b), { columns: 1, limit, by: newest, empty: RELEASES_W.empty });
export const releasesBand = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  return SEC(k, [head(k, b.use.releases!.title, RELEASES_W.bandSub), STACK(k, [releasesList(k, b, 3), STACK(k, [B(k, RELEASES_W.all, b.slugs.releases, "outline")], { direction: "row", justify: "center", margin: [24, 0, 0, 0] })], { maxWidth: "820px", width: "100%", self: "center" })], { name: b.use.releases!.title });
};

export const RELEASES: SiteModule = {
  key: "releases",
  name: RELEASES_W.name,
  note: RELEASES_W.note,
  pages: (bp) => [{ key: "releases", slug: "/changelog", order: 26, name: bp.modules.releases!.title, seo: bp.modules.releases!.sub, parts: (b) => [pageHead(b.use.releases!.title, b.use.releases!.sub, "soft"), (c) => { const k = withSkin(c, "plain"); return SEC(k, [STACK(k, [releasesList(k, b, 48)], { maxWidth: "820px", width: "100%", self: "center" })], { name: RELEASES_W.all }); }] }],
  tables: (b) => {
    const r = b.use.releases!;
    return [{
      key: "releases",
      slug: "releases",
      name: RELEASES_W.releases,
      fields: [f.select("product", RELEASES_W.product, r.products, { required: true }), f.text("version", RELEASES_W.version, { required: true, max: 20 }), f.date("date", RELEASES_W.date), f.select("kind", RELEASES_W.kind, KINDS, { default: "added" }), f.long("changes", RELEASES_W.changes)],
      // Everyone may read them: a product may ask whether a newer version is out.
      api: { read: "public", create: "key", update: "key", delete: "off" },
      rows: r.rows.map((x) => ({ data: { product: x.product, version: plain(x.version), date: x.date, kind: x.kind, changes: x.changes } })),
    }];
  },
  counts: (bp) => ({ tables: 1, rows: bp.modules.releases!.rows.length }),
  panel: () => ({ lists: [{ kind: "view", key: "releasesAll", title: RELEASES_W.all, table: T("releases"), columns: ["product", "version", "date", "kind"], sort: { field: "date", dir: "desc" }, limit: 50 }] }),
};

/* ---------------- Support tickets ---------------- */

const STATES: Array<[string, W]> = [["open", TICKETS_W.open], ["answered", TICKETS_W.answered], ["closed", TICKETS_W.closed]];
const openNow = [{ field: "status", op: "is" as const, value: "open" }];

const ticketForm = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  const products = b.use.tickets!.products.map(([value, label]) => ({ value, label: say(k, label) }));
  const form = CARD(k, [EL(k, "form", {
    kind: "custom",
    fields: [
      { name: "product", kind: "select", label: say(k, TICKETS_W.product), required: true, options: products },
      { name: "subject", kind: "text", label: say(k, TICKETS_W.subject), required: true },
      { name: "body", kind: "long", label: say(k, TICKETS_W.body), hint: say(k, TICKETS_W.bodyHint), required: true },
      { name: "picture", kind: "file", label: say(k, TICKETS_W.picture) },
    ],
    send: { to: "table", table: "tickets" },
    button: say(k, TICKETS_W.send),
    done: say(k, TICKETS_W.sent),
  }, { style: { self: "stretch" } })], { gap: 16, pad: [32, 28, 32, 28] });
  const side = STACK(k, [H(k, TICKETS_W.formTitle, 3, still), P(k, TICKETS_W.formSub, still), ...(b.slugs.docs ? [STACK(k, [B(k, DOCS_W.open, b.slugs.docs, "outline", still)], { direction: "row" })] : [])], { gap: 12 });
  return SEC(k, [COLS(k, [2, 3], [[side], [form]], { gap: 48, align: "start", phone: "stack" })], { name: TICKETS_W.formTitle });
};
/** The customer's own tickets, read in their browser: each one's state and the team's answer. */
const myTickets: Part = (c) => {
  const k = withSkin(c, "surface");
  const card = CARD(k, [
    STACK(k, [bound(H(k, TICKETS_W.subject, 4, still), { text: "subject" }), bound(P(k, TICKETS_W.open, { ...still, quiet: false, style: { weight: 700, color: pop(k) } }), { text: "status" })], { direction: "row", justify: "between", align: "center", gap: 12, wrap: true }),
    bound(P(k, TICKETS_W.product, { ...still, style: { size: 14 } }), { text: "product" }),
    bound(P(k, TICKETS_W.noReply, { ...still, style: { size: 15 } }), { text: "reply" }),
  ], { gap: 8, pad: [20, 22, 20, 22] });
  return SEC(k, [STACK(k, [H(k, TICKETS_W.mine, 2), LIST(k, "tickets", card, { columns: 1, limit: 12, feed: "added", sort: "newest", empty: TICKETS_W.mineEmpty, signin: TICKETS_W.mineSignin })], { gap: 24, maxWidth: "820px", width: "100%", self: "center" })], { name: TICKETS_W.mine });
};
export const ticketsBand = (b: Built): Part => callBand(TICKETS_W.bandTitle, TICKETS_W.bandSub, TICKETS_W.formTitle, b.slugs.tickets, "bold");
const became = (state: string) => [{ left: "{{input.row.status}}", cmp: "eq", right: state }, { left: "{{input.before.status}}", cmp: "ne", right: state }];

export const TICKETS: SiteModule = {
  key: "tickets",
  name: TICKETS_W.name,
  note: TICKETS_W.note,
  pages: (bp) => [{ key: "tickets", slug: "/support", order: 28, name: bp.modules.tickets!.title, seo: bp.modules.tickets!.sub, parts: (b) => [pageHead(b.use.tickets!.title, b.use.tickets!.sub, "soft"), ticketForm(b), myTickets] }],
  tables: (b) => [{
    key: "tickets",
    slug: "tickets",
    name: TICKETS_W.tickets,
    fields: [
      f.select("product", TICKETS_W.product, b.use.tickets!.products, { required: true }),
      f.text("subject", TICKETS_W.subject, { required: true, max: 120 }),
      f.long("body", TICKETS_W.bodyField, { required: true, max: 4000 }),
      f.file("picture", TICKETS_W.pictureField, { maxMb: 8, kinds: ["image"], private: true }),
      f.select("status", TICKETS_W.status, STATES, { default: "open" }),
      f.long("reply", TICKETS_W.reply),
      f.long("notes", TICKETS_W.notes),
    ],
    // A signed-in customer adds theirs and reads them; never their state or the team's answer, nor the team's notes.
    api: { read: "customer", create: "customer", update: "off", delete: "off", private: ["notes"], locked: ["status", "reply"] },
  }],
  counts: () => ({ tables: 1, rows: 0 }),
  // One open ticket a product: a new one for it waits until theirs is answered or closed.
  waits: () => [{ table: T("tickets"), same: ["product"], days: 0, open: { field: "status", values: ["open"] } }],
  panel: () => ({
    numbers: [
      { key: "ticketsOpen", label: TICKETS_W.waiting, table: T("tickets"), where: openNow },
      { key: "ticketsWeek", label: TICKETS_W.week, table: T("tickets"), window: "week", compare: true },
    ],
    today: [{
      kind: "queue",
      key: "ticketsQueue",
      title: TICKETS_W.queue,
      table: T("tickets"),
      where: openNow,
      show: ["$by", "product", "subject", "body", "picture", "reply"],
      decisions: [{ key: "answer", label: TICKETS_W.answer, set: { status: "answered" }, tone: "good" }, { key: "close", label: TICKETS_W.close, set: { status: "closed" }, tone: "bad" }],
      empty: TICKETS_W.none,
    }],
    board: [{ kind: "kanban", key: "ticketsBoard", title: TICKETS_W.board, table: T("tickets"), field: "status", show: ["$by", "product", "subject"] }],
    lists: [{ kind: "view", key: "ticketsAll", title: TICKETS_W.all, table: T("tickets"), columns: ["$by", "product", "subject", "status", "reply", "$createdAt"], sort: { field: "$createdAt", dir: "desc" }, limit: 50 }],
    reports: [{ kind: "report", key: "ticketsBy", title: TICKETS_W.byProduct, table: T("tickets"), by: "product", columns: ["$by", "product", "subject", "status", "$createdAt"] }],
  }),
  functions: () => [
    {
      key: "ticketNew",
      name: TICKETS_W.newBell.ar,
      note: "بيوصلك جرس بلوحة الإدارة مع كل تذكرة دعم جديدة.",
      def: { lang: "ar", inputs: [{ name: "row", type: "any" }], do: [{ act: "notify", title: "تذكرة دعم جديدة: {{input.row.subject}}", text: "اكتب الرد بالتذكرة واكبس «انردّ عليها» بلوحة الموقع.", link: "/admin/data" }] },
      triggers: [{ kind: "row", config: { table: T("tickets"), on: ["added"] } }],
    },
    {
      key: "ticketAnswered",
      name: TICKETS_W.answeredFn.ar,
      note: "لما تصير تذكرة «انردّ عليها»، بيوصل للزبون إيميل فيه رد الفريق.",
      def: {
        lang: "ar",
        inputs: [{ name: "row", type: "any" }, { name: "before", type: "any" }],
        if: became("answered"),
        do: [
          { act: "customer", who: "{{input.row.$owner}}", mark: "read", as: "buyer" },
          { act: "email", to: "{{buyer.email}}", subject: "ردّينا على تذكرتك: {{input.row.subject}}", text: "أهلين {{buyer.name}}،\n{{input.row.reply}}\nإذا لسّا في مشكلة، افتح تذكرة جديدة من صفحة الدعم." },
        ],
      },
      triggers: [{ kind: "row", config: { table: T("tickets"), on: ["changed"] } }],
    },
  ],
};

/* ---------------- The store's own products ---------------- */

/** The store's newest products, as the shop draws its own product cards (each opens its page in the store). */
const goodsGrid = (k: Ctx, limit: number) => EL(k, "products", { source: "new", limit, layout: "grid", columns: 3, card: "lift" }, { style: { self: "stretch" } });
/** How a bought product arrives: the studio's words. */
const howPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "surface");
  const card = CARD(k, [eyebrow(k, GOODS_W.how, still), P(k, b.use.goods!.how, { ...still, quiet: false, style: { size: 17 } })], { gap: 8, pad: [20, 24, 20, 24] });
  return SEC(k, [STACK(k, [card], { maxWidth: "820px", width: "100%", self: "center" })], { name: GOODS_W.how, pad: [40, 24, 40, 24] });
};
export const goodsBand = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  const g = b.use.goods!;
  return SEC(k, [head(k, g.title, g.sub), STACK(k, [goodsGrid(k, 6)], { width: "100%" }), STACK(k, [B(k, g.title, b.slugs.goods, "outline")], { direction: "row", justify: "center", margin: [32, 0, 0, 0] })], { name: g.title });
};

export const GOODS: SiteModule = {
  key: "goods",
  name: GOODS_W.name,
  note: GOODS_W.note,
  pages: (bp) => [{ key: "goods", slug: bp.modules.goods!.page, order: 21, name: bp.modules.goods!.title, seo: bp.modules.goods!.sub, parts: (b) => [pageHead(b.use.goods!.title, b.use.goods!.sub, "soft"), (c) => { const k = withSkin(c, "plain"); return SEC(k, [STACK(k, [goodsGrid(k, 24)], { width: "100%" })], { name: b.use.goods!.title }); }, howPart(b), ...(b.use.goods!.minecraft ? [mcNoticePart] : [])] }],
};
