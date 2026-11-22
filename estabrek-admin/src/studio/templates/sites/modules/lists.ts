/**
 * The modules that are lists the owner fills: the main list (a menu, treatments, rooms…), the team,
 * reviews, questions, news and branches. Each brings its table with ready rows, its cards bound to the
 * table's fields, the sections other pages place, and its own page where it has one.
 */
import { B, CARD, COLS, DIVIDER, H, ICON, IMG, P, SEC, STACK, eyebrow, pop, withSkin, type Ctx, type N, type Skin } from "../../build";
import { w, type W } from "../../words";
import { hug } from "../../partsMore";
import { PANEL, SET, SW, STARS } from "../siteWords";
import { LIST, S, T, bound, callBand, f, head, pageHead, picOf, plainPic, shownIf, still, tree, type Built, type Part, type SiteModule } from "./kit";

/* ---------------- The cards, each connected to its table's fields ---------------- */

function offerCard(c: Ctx, b: Built): N {
  const o = b.use.offers!;
  const first = o.rows[0];
  // Shown while the owner shows prices (the "showPrices" setting).
  const price = o.price && first.price !== undefined ? [shownIf(bound(P(c, w(String(first.price), String(first.price), String(first.price)), { ...still, quiet: false, style: { weight: 700, color: pop(c), size: 17 } }), { text: "price" }), "showPrices")] : [];
  const extra = o.extra && first.extra ? [bound(P(c, first.extra, { ...still, style: { size: 14 } }), { text: "extra" })] : [];
  const title = bound(H(c, first.title, 4, still), { text: "title" });
  const text = bound(P(c, first.text, { ...still, style: { size: 15 } }), { text: "summary" });
  const more = bound(hug(B(c, SW.more, "#", "link", still)), { href: "$url" });
  if (o.look === "menu") {
    return CARD(c, [STACK(c, [STACK(c, [title, ...extra], { gap: 4 }), ...price], { direction: "row", justify: "between", align: "start", gap: 16 }), text, more], { gap: 8, pad: [20, 22, 20, 22], radius: 16 });
  }
  const pic = bound(IMG(c, first.title, { aspect: o.look === "tiles" ? "1 / 1" : "4 / 3", radius: o.look === "tiles" ? 24 : 16, motion: false }), { src: "picture", alt: "title" });
  if (o.look === "tiles") return STACK(c, [pic, title, ...extra, ...price, more], { gap: 8 });
  return CARD(c, [pic, title, ...extra, text, STACK(c, [...price, more], { direction: "row", justify: "between", align: "center", gap: 12, wrap: true })], { gap: 10, pad: [16, 16, 20, 16] });
}
function teamCard(c: Ctx, b: Built): N {
  const m = b.use.team!.rows[0];
  return CARD(c, [
    bound(IMG(c, m.name, { aspect: "1 / 1", radius: 999, motion: false, style: { width: "128px", self: "center" } }), { src: "photo", alt: "name" }),
    bound(H(c, m.name, 4, still), { text: "name" }),
    bound(P(c, m.role, { ...still, quiet: false, style: { color: pop(c), weight: 600, size: 15 } }), { text: "role" }),
    bound(P(c, m.bio, { ...still, style: { size: 15 } }), { text: "bio" }),
  ], { align: "center", textAlign: "center", gap: 8 });
}
function reviewCard(c: Ctx, b: Built): N {
  const r = b.use.reviews!.rows[0];
  return CARD(c, [
    bound(P(c, STARS[0][1], { ...still, quiet: false, style: { color: pop(c), size: 18 } }), { text: "stars" }),
    bound(P(c, r.text, { ...still, quiet: false, style: { size: 17, lineHeight: 1.7 } }), { text: "words" }),
    DIVIDER(c),
    bound(H(c, r.name, 5, still), { text: "name" }),
    bound(P(c, r.place, { ...still, style: { size: 14 } }), { text: "place" }),
  ], { gap: 10 });
}
function questionCard(c: Ctx, b: Built): N {
  const q = b.use.questions!.rows[0];
  return CARD(c, [bound(H(c, q.q, 4, still), { text: "question" }), bound(P(c, q.a, { ...still, style: { size: 15 } }), { text: "answer" })], { gap: 8 });
}
function postCard(c: Ctx, b: Built): N {
  const p = b.use.news!.rows[0];
  return CARD(c, [
    bound(IMG(c, p.title, { aspect: "16 / 10", radius: 14, motion: false }), { src: "cover", alt: "title" }),
    bound(P(c, w(p.date, p.date, p.date), { ...still, style: { size: 13 } }), { text: "date" }),
    bound(H(c, p.title, 4, still), { text: "title" }),
    bound(P(c, p.text, { ...still, style: { size: 15 } }), { text: "summary" }),
    bound(hug(B(c, SW.readMore, "#", "link", still)), { href: "$url" }),
  ], { gap: 10, pad: [16, 16, 20, 16] });
}
export function branchCard(c: Ctx, b: Built): N {
  const br = b.use.branches!.rows[0];
  return CARD(c, [
    STACK(c, [ICON(c, "heart", { size: 22, motion: false }), bound(H(c, br.name, 4, still), { text: "name" })], { direction: "row", gap: 10, align: "center" }),
    bound(P(c, br.address, { ...still, quiet: false }), { text: "address" }),
    bound(P(c, br.hours, still), { text: "hours" }),
    bound(hug(B(c, w(br.phone, br.phone, br.phone), `tel:${br.phone.replace(/[^\d+]/g, "")}`, "outline", still)), { label: "phone", href: "phone" }),
  ], { gap: 8 });
}

/* ---------------- Sections reading the tables (other pages place them) ---------------- */

export const offersPart = (b: Built, skin: Skin, o: { featured?: boolean; group?: [string, W]; title?: W; sub?: W; limit?: number } = {}): Part => (c) => {
  const k = withSkin(c, skin);
  const spec = b.use.offers!;
  const columns = spec.look === "menu" ? 2 : spec.look === "tiles" ? 4 : 3;
  const where = o.featured ? [{ field: "featured", op: "isTrue" }] : o.group ? [{ field: "group", op: "is", value: o.group[0] }] : [];
  const title = o.group ? o.group[1] : o.title ?? spec.title;
  const kids = [head(k, title, o.group ? undefined : o.sub ?? spec.sub, o.group ? { center: false } : { eyebrow: o.featured ? SW.picked : undefined }), LIST(k, "offers", offerCard(k, b), { columns, where, limit: o.limit ?? (o.featured ? 6 : 24) })];
  if (o.featured) kids.push(STACK(k, [B(k, SW.seeAll, b.slugs.offers, "outline")], { direction: "row", justify: "center", margin: [32, 0, 0, 0] }));
  return SEC(k, kids, { name: title });
};
export const teamPart = (b: Built, skin: Skin): Part => (c) => {
  const k = withSkin(c, skin);
  const t = b.use.team!;
  return SEC(k, [head(k, t.title, t.sub), LIST(k, "team", teamCard(k, b), { columns: Math.min(4, Math.max(2, t.rows.length)) })], { name: t.title });
};
export const reviewsPart = (b: Built, skin: Skin, limit = 6): Part => (c) => {
  const k = withSkin(c, skin);
  return SEC(k, [head(k, SW.reviews, SW.reviewsSub), LIST(k, "reviews", reviewCard(k, b), { columns: 3, limit })], { name: SW.reviews });
};
export const questionsPart = (b: Built, skin: Skin, limit = 24, more = false): Part => (c) => {
  const k = withSkin(c, skin);
  const kids = [head(k, SW.questions, SW.questionsSub), LIST(k, "questions", questionCard(k, b), { columns: 2, limit })];
  if (more) kids.push(STACK(k, [B(k, SW.allQuestions, b.slugs.questions, "outline")], { direction: "row", justify: "center", margin: [32, 0, 0, 0] }));
  return SEC(k, kids, { name: SW.questions });
};
export const postsPart = (b: Built, skin: Skin, limit = 24, more = false): Part => (c) => {
  const k = withSkin(c, skin);
  const news = b.use.news!;
  const kids = [head(k, news.title, news.sub), LIST(k, "posts", postCard(k, b), { columns: 3, limit })];
  if (more) kids.push(STACK(k, [B(k, SW.allNews, b.slugs.news, "outline")], { direction: "row", justify: "center", margin: [32, 0, 0, 0] }));
  return SEC(k, kids, { name: news.title });
};

/* ---------------- The items' own pages ---------------- */

/** An item's own page: a dish, a treatment, a class… (its picture, its words, its price, a way to book). */
function offerPage(c: Ctx, b: Built): N {
  const o = b.use.offers!;
  const first = o.rows[0];
  const k = withSkin(c, "plain");
  const go = b.slugs.book && b.use.booking ? B(k, b.use.booking.button, b.slugs.book, "solid", still) : B(k, SW.writeUs, b.slugs.contact ?? b.slugs.home, "solid", still);
  return SEC(k, [
    hug(B(k, SW.backTo, b.slugs.offers, "link", still)),
    COLS(k, [1, 1], [
      [bound(IMG(k, first.title, { aspect: "4 / 5", radius: 24, motion: false }), { src: "picture", alt: "title" })],
      [
        bound(eyebrow(k, o.groups[0][1], still), { text: "group" }),
        bound(H(k, first.title, 1, still), { text: "title" }),
        ...(o.extra && first.extra ? [bound(P(k, first.extra, { ...still, quiet: false, style: { weight: 600 } }), { text: "extra" })] : []),
        ...(o.price && first.price !== undefined ? [shownIf(bound(P(k, w(String(first.price), String(first.price), String(first.price)), { ...still, quiet: false, style: { size: 26, weight: 800, color: pop(k) } }), { text: "price" }), "showPrices")] : []),
        bound(P(k, first.text, { ...still, style: { size: 18 } }), { text: "summary" }),
        hug(go),
      ],
    ], { gap: 48, align: "center" }),
  ], { name: first.title, pad: [48, 24, 88, 24] });
}
/** A piece of news on its own page. */
function postPage(c: Ctx, b: Built): N {
  const p = b.use.news!.rows[0];
  const k = withSkin(c, "plain");
  return SEC(k, [STACK(k, [
    hug(B(k, SW.allNews, b.slugs.news, "link", still)),
    bound(P(k, w(p.date, p.date, p.date), still), { text: "date" }),
    bound(H(k, p.title, 1, still), { text: "title" }),
    bound(IMG(k, p.title, { aspect: "16 / 9", radius: 20, motion: false }), { src: "cover", alt: "title" }),
    bound(P(k, p.body, { ...still, quiet: false, style: { size: 18, lineHeight: 1.9 } }), { text: "body" }),
  ], { gap: 18, maxWidth: "760px", width: "100%", self: "center" })], { name: p.title, pad: [48, 24, 96, 24] });
}

/* ---------------- The lists' own pages ---------------- */

/** The main list's page: one section a group, then a call to book (or to write). */
function offersParts(b: Built): Part[] {
  const o = b.use.offers!;
  const skins: Skin[] = ["plain", "surface"];
  const groups = o.groups.map((g, i) => offersPart(b, skins[i % 2], { group: g }));
  const call = b.slugs.book && b.use.booking ? callBand(b.use.booking.title, b.use.booking.sub, b.use.booking.button, b.slugs.book) : callBand(SW.contact, SW.contactSub, SW.writeUs, b.slugs.contact ?? b.slugs.home);
  return [pageHead(o.title, o.sub, b.bp.look % 2 ? "plain" : "soft"), ...groups, call];
}
const newsParts = (b: Built): Part[] => [pageHead(b.use.news!.title, b.use.news!.sub, "soft"), postsPart(b, "plain")];
const questionsParts = (b: Built): Part[] => [pageHead(SW.questions, SW.questionsSub, "soft"), questionsPart(b, "plain"), S("contact-cards", "surface")];

/* ---------------- The modules ---------------- */

const OFFERS_NAME = w("القائمة الرئيسية", "The main list", "הרשימה הראשית");
export const OFFERS: SiteModule = {
  key: "offers",
  name: OFFERS_NAME,
  note: w("منيو، خدمات، غرف أو باقات: جدول بأقسام وأسعار، وصفحة لكل عنصر.", "A menu, services, rooms or packages: a table with sections and prices, and a page for each.", "תפריט, שירותים, חדרים או חבילות: טבלה עם קטגוריות ומחירים, ועמוד לכל פריט."),
  pages: (bp) => [{ key: "offers", slug: bp.modules.offers!.page, order: 10, name: bp.modules.offers!.title, seo: bp.modules.offers!.sub, parts: offersParts }],
  tables: (b, c) => {
    const o = b.use.offers!;
    return [{
      key: "offers",
      slug: o.table,
      name: o.title,
      fields: [
        f.text("title", o.item, { required: true }),
        f.long("summary", SW.summary),
        f.select("group", SW.group, o.groups, { default: o.groups[0][0] }),
        ...(o.price ? [f.money("price", o.price)] : []),
        ...(o.extra ? [f.text("extra", o.extra)] : []),
        f.image("picture", SW.picture),
        f.bool("featured", SW.featured),
      ],
      itemPage: tree(offerPage(c, b)),
      rows: o.rows.map((r, i) => ({
        slug: r.slug,
        data: { title: r.title, summary: r.text, group: r.group, ...(o.price && r.price !== undefined ? { price: r.price } : {}), ...(o.extra && r.extra ? { extra: r.extra } : {}), picture: picOf(b.bp, i), featured: !!r.featured },
      })),
    }];
  },
  counts: (bp) => ({ tables: 1, rows: bp.modules.offers!.rows.length }),
  // Its panel: the list itself, as a table to read at a glance.
  panel: (bp) => {
    const o = bp.modules.offers!;
    return { lists: [{ kind: "view", key: "offers", title: o.title, table: T("offers"), columns: ["title", "group", ...(o.price ? ["price"] : []), ...(o.extra ? ["extra"] : []), "featured", "$status"] }] };
  },
  // A list with prices: its owner may hide them (they change often, or are given by phone).
  settings: (bp) => (bp.modules.offers?.price ? [{ key: "showPrices", kind: "toggle" as const, label: SET.showPrices, note: SET.showPricesNote, group: OFFERS_NAME, public: true, default: true }] : []),
};

export const TEAM: SiteModule = {
  key: "team",
  name: w("الفريق", "The team", "הצוות"),
  note: w("مين بيشتغل عنّا، بصورهم وأدوارهم.", "Who works here, with their photos and roles.", "מי עובד כאן, עם תמונות ותפקידים."),
  tables: (b) => {
    const t = b.use.team!;
    return [{ key: "team", slug: "team", name: t.title, fields: [f.text("name", SW.name, { required: true }), f.text("role", SW.role), f.long("bio", SW.bio), f.image("photo", SW.photo)], rows: t.rows.map((m, i) => ({ data: { name: m.name, role: m.role, bio: m.bio, photo: plainPic(i + 2) } })) }];
  },
  counts: (bp) => ({ tables: 1, rows: bp.modules.team!.rows.length }),
};

export const REVIEWS: SiteModule = {
  key: "reviews",
  name: w("الآراء", "Reviews", "ביקורות"),
  note: w("كلام الزباين بنجومه.", "Customers' words, with their stars.", "מילים של לקוחות, עם כוכבים."),
  tables: (b) => [{ key: "reviews", slug: "reviews", name: SW.reviews, fields: [f.text("name", SW.name, { required: true }), f.text("place", SW.place), f.long("words", SW.words, { required: true }), f.select("stars", SW.stars, STARS, { default: "s5" })], rows: b.use.reviews!.rows.map((r) => ({ data: { name: r.name, place: r.place, words: r.text, stars: r.stars === 4 ? "s4" : "s5" } })) }],
  counts: (bp) => ({ tables: 1, rows: bp.modules.reviews!.rows.length }),
};

export const QUESTIONS: SiteModule = {
  key: "questions",
  name: w("الأسئلة", "Questions", "שאלות"),
  note: w("أسئلة بتتكرر وأجوبتها، بصفحة إلها.", "Common questions and their answers, on a page of their own.", "שאלות נפוצות ותשובות, בעמוד משלהן."),
  pages: () => [{ key: "questions", slug: "/questions", order: 40, name: SW.questions, seo: SW.questionsSub, parts: questionsParts }],
  tables: (b) => [{ key: "questions", slug: "questions", name: SW.questions, fields: [f.text("question", SW.question, { required: true }), f.long("answer", SW.answer, { required: true })], rows: b.use.questions!.rows.map((q) => ({ data: { question: q.q, answer: q.a } })) }],
  counts: (bp) => ({ tables: 1, rows: bp.modules.questions!.rows.length }),
};

export const NEWS: SiteModule = {
  key: "news",
  name: w("الأخبار", "News", "חדשות"),
  note: w("أخبار ومقالات، وصفحة لكل خبر.", "News and articles, with a page for each.", "חדשות ומאמרים, עם עמוד לכל אחד."),
  pages: (bp) => [{ key: "news", slug: "/news", order: 30, name: bp.modules.news!.title, seo: bp.modules.news!.sub, parts: newsParts }],
  tables: (b, c) => {
    const n = b.use.news!;
    const pics = b.bp.pics;
    return [{
      key: "posts",
      slug: "news",
      name: n.title,
      fields: [f.text("title", SW.title, { required: true }), f.long("summary", SW.summary), f.long("body", SW.body), f.image("cover", SW.cover), f.date("date", SW.date)],
      itemPage: tree(postPage(c, b)),
      rows: n.rows.map((p, i) => ({ slug: p.slug, data: { title: p.title, summary: p.text, body: p.body, cover: pics ? `/templates/${pics}/${i === 0 ? "hero" : i === 1 ? "story" : "product-3"}.svg` : plainPic(i), date: p.date } })),
    }];
  },
  counts: (bp) => ({ tables: 1, rows: bp.modules.news!.rows.length }),
};

export const BRANCHES: SiteModule = {
  key: "branches",
  name: w("الفروع", "Branches", "סניפים"),
  note: w("عناوين وساعات وتلفونات.", "Addresses, hours and phone numbers.", "כתובות, שעות ומספרי טלפון."),
  tables: (b) => [{ key: "branches", slug: "branches", name: SW.branches, fields: [f.text("name", SW.branch, { required: true }), f.text("address", SW.address), f.text("hours", SW.hours), f.phone("phone", SW.phone)], rows: b.use.branches!.rows.map((br) => ({ data: { name: br.name, address: br.address, hours: br.hours, phone: br.phone } })) }],
  counts: (bp) => ({ tables: 1, rows: bp.modules.branches!.rows.length }),
  // Its panel: the branches on a map, each by its address.
  panel: () => ({ lists: [{ kind: "map", key: "branches", title: PANEL.branchesMap, table: T("branches"), label: "name", address: "address", show: ["hours", "phone"] }] }),
};
