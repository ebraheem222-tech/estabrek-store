/**
 * Whole sites (stage 4, item 3; admin → ميزاتي → مواقع كاملة): a business's whole site for one field (a
 * restaurant, a clinic, a gym…), built from the section library (its openings, stories, pictures and calls,
 * in the site's own words) with its lists connected to real data. Each site is a feature template
 * (estabrek.feature, the backend's lib/featureTemplate.ts) installed as a draft: its tables with ready rows
 * (the menu, the team, the reviews, the questions, the news, the branches), its pages reading those tables,
 * the forms that write the visitors' messages and bookings into tables of their own, and a function that
 * tells the owner when one comes. The owner changes the rows in the table and the site follows.
 *
 * Pure: no React and no admin words, so the backend's test builds and installs every site (sites.spec.ts).
 */
import { B, CARD, COLS, DIVIDER, EL, GRID, H, ICON, IMG, P, SEC, STACK, ctxOf, eyebrow, mo, pop, say, withSkin, type Ctx, type MotionLevel, type N, type Skin } from "../build";
import { RECIPES } from "../sections";
import { C, w, type Family, type IconName, type Pack, type W } from "../words";
import { hug } from "../partsMore";

/* ---------------- What a site is ---------------- */

/** The fields a site is for (the gallery's filter). */
export const SITE_FIELDS = {
  food: w("أكل وشرب", "Food and drink", "אוכל ושתייה"),
  health: w("صحة وعيادات", "Health and clinics", "בריאות ומרפאות"),
  beauty: w("تجميل وعناية", "Beauty and care", "יופי וטיפוח"),
  fitness: w("رياضة ولياقة", "Sport and fitness", "ספורט וכושר"),
  learning: w("تعليم ودورات", "Learning and courses", "לימודים וקורסים"),
  property: w("عقارات وإقامة", "Property and stays", "נדל״ן ולינה"),
  creative: w("تصوير وإبداع", "Photography and creative work", "צילום ויצירה"),
  events: w("مناسبات وأفراح", "Events and weddings", "אירועים וחתונות"),
  services: w("خدمات ومكاتب", "Services and offices", "שירותים ומשרדים"),
} as const;
export type SiteField = keyof typeof SITE_FIELDS;

/** A row of the site's main list: a dish, a treatment, a class, a property, a package… */
export type OfferRow = { slug: string; title: W; text: W; group: string; price?: number; extra?: W; featured?: boolean };
export type SiteSpec = {
  /** The template's key ("site-restaurant") and version. */
  key: string;
  version: string;
  field: SiteField;
  /** The kind of store the library builds it as (its choices of shapes and words where the site has none). */
  fam: Family;
  /** The shop's folder of ready pictures (public/templates/<pics>), or "" for the plain ones. */
  pics: string;
  /** Which of the six compositions its pages take (0–5). */
  look: number;
  name: W;
  note: W;
  /** The business: its name, where, when, how to reach it, and the town the map shows. */
  biz: { name: W; address: W; hours: W; phone: string; email: string; city: string };
  /** The site's words for the library's sections (an opening's eyebrow, title, line and button; its story). */
  pack: Pick<Pack, "label" | "eyebrow" | "title" | "sub" | "cta" | "product" | "story" | "collection"> & { icon?: IconName };
  /** The site's first page (the store's own home stays as it is). */
  home: string;
  /** Its main list: the table, its page, its words, its groups and its rows. */
  offers: {
    table: string;
    page: string;
    title: W;
    sub: W;
    /** What one row is called (the title field's name: "الطبق", "العلاج"). */
    item: W;
    look: "menu" | "cards" | "tiles";
    groups: Array<[string, W]>;
    /** The price field's name; none: no prices. */
    price?: W;
    /** One more short field shown under the title (a duration, the rooms, the level). */
    extra?: W;
    rows: OfferRow[];
  };
  team?: { title: W; sub: W; rows: Array<{ name: W; role: W; bio: W }> };
  reviews: Array<{ name: W; place: W; text: W; stars?: 4 | 5 }>;
  questions: Array<{ q: W; a: W }>;
  posts: { title: W; sub: W; rows: Array<{ slug: string; date: string; title: W; text: W; body: W }> };
  branches: Array<{ name: W; address: W; hours: W; phone: string }>;
  /** A booking page with its form (a service's). */
  booking?: { title: W; sub: W; ask: W; button: W; done: W; /** What the visitor picks (else the main list's groups). */ options?: Array<[string, W]> };
};

/* ---------------- The words every site shares ---------------- */

export const SW = {
  reviews: w("شو بيحكوا عنّا", "What people say", "מה אומרים עלינו"),
  reviewsSub: w("كلام ناس جرّبونا، متل ما كتبوه.", "Words from people who came to us, as they wrote them.", "מילים של אנשים שהגיעו אלינו, כמו שכתבו."),
  questions: w("أسئلة بتتكرر", "Common questions", "שאלות נפוצות"),
  questionsSub: w("إذا ما لقيتوا جوابكم هون، ابعتولنا.", "If your answer isn't here, write to us.", "אם התשובה לא כאן, כתבו לנו."),
  allQuestions: w("كل الأسئلة", "All questions", "כל השאלות"),
  ourStory: w("قصتنا", "Our story", "הסיפור שלנו"),
  contact: w("تواصلوا معنا", "Get in touch", "צרו קשר"),
  contactSub: w("ابعتولنا سؤالكم أو زورونا بأقرب فرع.", "Send us your question or visit the nearest branch.", "שלחו לנו שאלה או בקרו בסניף הקרוב."),
  branches: w("فروعنا", "Our branches", "הסניפים שלנו"),
  writeUs: w("ابعتولنا رسالة", "Send us a message", "שלחו לנו הודעה"),
  name: w("الاسم", "Name", "שם"),
  phone: w("رقم التلفون", "Phone number", "מספר טלפון"),
  email: w("الإيميل", "Email", "אימייל"),
  message: w("رسالتكم", "Your message", "ההודעה שלכם"),
  day: w("اليوم اللي بناسبكم", "The day that suits you", "היום שמתאים לכם"),
  notes: w("ملاحظات", "Notes", "הערות"),
  send: w("ابعتوا", "Send", "שליחה"),
  sent: w("وصلتنا رسالتكم، ومنرد عليكم بأقرب وقت.", "Your message is in: we'll reply soon.", "ההודעה התקבלה: נחזור אליכם בקרוב."),
  status: w("الحالة", "Status", "מצב"),
  fresh: w("جديد", "New", "חדש"),
  replied: w("انرد عليه", "Replied", "נענה"),
  confirmed: w("تأكّد", "Confirmed", "אושר"),
  done: w("خلص", "Done", "הסתיים"),
  more: w("التفاصيل", "Details", "פרטים"),
  readMore: w("اقرأوا أكتر", "Read more", "להמשך קריאה"),
  allNews: w("كل الأخبار", "All the news", "כל החדשות"),
  backTo: w("رجوع", "Back", "חזרה"),
  seeAll: w("شوفوا الكل", "See everything", "לכל הרשימה"),
  picked: w("اختياراتنا", "Our picks", "הבחירות שלנו"),
  home: w("الصفحة الأولى", "First page", "עמוד ראשון"),
  team: w("الفريق", "The team", "הצוות"),
  messages: w("رسائل الموقع", "The site's messages", "הודעות מהאתר"),
  bookings: w("طلبات الحجز", "Booking requests", "בקשות הזמנה"),
  picture: w("الصورة", "Picture", "תמונה"),
  summary: w("وصف قصير", "A short description", "תיאור קצר"),
  group: w("القسم", "Section", "קטגוריה"),
  featured: w("بالصفحة الأولى", "On the first page", "בעמוד הראשון"),
  role: w("الدور", "Role", "תפקיד"),
  bio: w("نبذة", "About them", "קצת עליהם"),
  photo: w("صورة", "Photo", "תמונה"),
  place: w("من وين", "From", "מאיפה"),
  words: w("الكلام", "Words", "מילים"),
  stars: w("النجوم", "Stars", "כוכבים"),
  question: w("السؤال", "Question", "שאלה"),
  answer: w("الجواب", "Answer", "תשובה"),
  title: w("العنوان", "Title", "כותרת"),
  body: w("النص", "Text", "טקסט"),
  cover: w("صورة الغلاف", "Cover picture", "תמונת שער"),
  date: w("التاريخ", "Date", "תאריך"),
  branch: w("الفرع", "Branch", "סניף"),
  address: w("العنوان", "Address", "כתובת"),
  hours: w("ساعات الدوام", "Opening hours", "שעות פתיחה"),
  howBook: w("كيف بتحجزوا", "How booking works", "איך מזמינים"),
  bookSteps: [
    [w("اختاروا", "Choose", "בחרו"), w("الخدمة واليوم اللي بناسبكم.", "The service and the day that suit you.", "את השירות ואת היום שמתאים לכם.")],
    [w("ابعتوا", "Send", "שלחו"), w("اسمكم ورقمكم، بدون دفع هلّق.", "Your name and number, nothing to pay now.", "שם ומספר, בלי לשלם עכשיו.")],
    [w("منأكّدلكم", "We confirm", "אנחנו מאשרים"), w("منتصل فيكم خلال ساعات الدوام لنثبّت الموعد.", "We call you within opening hours to fix the time.", "נתקשר בשעות הפעילות לקבוע את השעה.")],
  ] as Array<[W, W]>,
  newRequest: "طلب جديد من الموقع",
  notify: "خبّرني بكل رسالة وحجز من الموقع",
};
const STARS: Array<[string, W]> = [
  ["s5", w("★★★★★", "★★★★★", "★★★★★")],
  ["s4", w("★★★★☆", "★★★★☆", "★★★★☆")],
];

/* ---------------- The file it makes ---------------- */

/** A whole site as a feature template file (the backend's TemplateSchema). */
export type SiteFile = {
  format: "estabrek.feature";
  formatVersion: 1;
  key: string;
  version: string;
  name: W;
  note: W;
  tables: Array<{ key: string; slug: string; name: W; fields: Field[]; api?: Record<string, unknown>; itemPage?: Tree; rows?: Array<{ slug?: string; data: Record<string, unknown> }> }>;
  functions: Array<{ key: string; name: string; note?: string; def: Record<string, unknown>; triggers: Array<{ kind: "row"; config: Record<string, unknown> }> }>;
  pages: Array<{ key: string; name: string; slug: string; tree: Tree; seo?: { title?: string; description?: string } }>;
  needs: { secrets: string[]; sites: string[] };
};
type Field = Record<string, unknown> & { id: string; type: string };
type Tree = { version: 1; root: N };
type Lang = "ar" | "en" | "he";

/* ---------------- Building ---------------- */

const BY_KEY = new Map(RECIPES.map((r) => [r.key, r]));
type Part = (c: Ctx) => N;
/** A library section in a skin. */
const S = (key: string, skin: Skin): Part => (c) => {
  const r = BY_KEY.get(key);
  if (!r) throw new Error(`No section “${key}”`);
  return r.build(withSkin(c, skin));
};
/** A table's reference, where a list names it (installing makes it this store's id). */
const T = (key: string) => `@table:${key}`;
/** An element whose props take a row's values (`{ text: "title" }`). */
const bound = (n: N, bind: Record<string, string>): N => ({ ...n, props: { ...n.props, bind } });
const still = { motion: false } as const;

/** A list of a table's rows drawn with the page (its card repeated once a row, in the owner's order). */
function LIST(c: Ctx, table: string, card: N, o: { columns: number; limit?: number; where?: Array<{ field: string; op: string; value?: string }>; empty?: W }): N {
  return {
    id: c.ids("list"),
    type: "collectionList",
    props: { collectionId: T(table), sort: "order", limit: o.limit ?? 24, columns: o.columns, ...(o.where?.length ? { where: o.where } : {}), ...(o.empty ? { empty: say(c, o.empty) } : {}) },
    style: { base: { gap: 24, self: "stretch" } },
    motion: mo.group(c),
    children: [card],
  };
}
/** A section's heading: an eyebrow, a title, a line under it. */
function head(c: Ctx, title: W, sub?: W, o: { eyebrow?: W; center?: boolean } = {}): N {
  const center = o.center ?? true;
  return STACK(c, [...(o.eyebrow ? [eyebrow(c, o.eyebrow)] : []), H(c, title, 2), ...(sub ? [P(c, sub, { style: { maxWidth: "620px" } })] : [])], { gap: 12, margin: [0, 0, 40, 0], ...(center ? { align: "center", textAlign: "center" } : {}) });
}
/** A page's own title at its top. */
const pageHead = (title: W, sub: W, skin: Skin = "soft"): Part => (c) => {
  const k = withSkin(c, skin);
  return SEC(k, [STACK(k, [H(k, title, 1), P(k, sub, { style: { size: 19, maxWidth: "620px" } })], { align: "center", textAlign: "center", gap: 14 })], { name: title, pad: [96, 24, 72, 24] });
};
/** A band calling to one thing (booking, writing to us). */
const callBand = (title: W, sub: W, button: W, href: string, skin: Skin = "bold"): Part => (c) => {
  const k = withSkin(c, skin);
  return SEC(k, [STACK(k, [H(k, title, 2), P(k, sub, { style: { maxWidth: "560px" } }), STACK(k, [B(k, button, href)], { direction: "row", justify: "center" })], { gap: 16, align: "center", textAlign: "center" })], { name: title, pad: [80, 24, 80, 24] });
};

/* ---- the cards of the lists, each connected to its table's fields ---- */

type Built = { spec: SiteSpec; slugs: Slugs };
type Slugs = { home: string; offers: string; story: string; news: string; questions: string; contact: string; book: string | null };

function offerCard(c: Ctx, b: Built): N {
  const o = b.spec.offers;
  const first = o.rows[0];
  const price = o.price && first.price !== undefined ? [bound(P(c, w(String(first.price), String(first.price), String(first.price)), { ...still, quiet: false, style: { weight: 700, color: pop(c), size: 17 } }), { text: "price" })] : [];
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
  const m = b.spec.team!.rows[0];
  return CARD(c, [
    bound(IMG(c, m.name, { aspect: "1 / 1", radius: 999, motion: false, style: { width: "128px", self: "center" } }), { src: "photo", alt: "name" }),
    bound(H(c, m.name, 4, still), { text: "name" }),
    bound(P(c, m.role, { ...still, quiet: false, style: { color: pop(c), weight: 600, size: 15 } }), { text: "role" }),
    bound(P(c, m.bio, { ...still, style: { size: 15 } }), { text: "bio" }),
  ], { align: "center", textAlign: "center", gap: 8 });
}
function reviewCard(c: Ctx, b: Built): N {
  const r = b.spec.reviews[0];
  return CARD(c, [
    bound(P(c, STARS[0][1], { ...still, quiet: false, style: { color: pop(c), size: 18 } }), { text: "stars" }),
    bound(P(c, r.text, { ...still, quiet: false, style: { size: 17, lineHeight: 1.7 } }), { text: "words" }),
    DIVIDER(c),
    bound(H(c, r.name, 5, still), { text: "name" }),
    bound(P(c, r.place, { ...still, style: { size: 14 } }), { text: "place" }),
  ], { gap: 10 });
}
function questionCard(c: Ctx, b: Built): N {
  const q = b.spec.questions[0];
  return CARD(c, [bound(H(c, q.q, 4, still), { text: "question" }), bound(P(c, q.a, { ...still, style: { size: 15 } }), { text: "answer" })], { gap: 8 });
}
function postCard(c: Ctx, b: Built): N {
  const p = b.spec.posts.rows[0];
  return CARD(c, [
    bound(IMG(c, p.title, { aspect: "16 / 10", radius: 14, motion: false }), { src: "cover", alt: "title" }),
    bound(P(c, w(p.date, p.date, p.date), { ...still, style: { size: 13 } }), { text: "date" }),
    bound(H(c, p.title, 4, still), { text: "title" }),
    bound(P(c, p.text, { ...still, style: { size: 15 } }), { text: "summary" }),
    bound(hug(B(c, SW.readMore, "#", "link", still)), { href: "$url" }),
  ], { gap: 10, pad: [16, 16, 20, 16] });
}
function branchCard(c: Ctx, b: Built): N {
  const br = b.spec.branches[0];
  return CARD(c, [
    STACK(c, [ICON(c, "heart", { size: 22, motion: false }), bound(H(c, br.name, 4, still), { text: "name" })], { direction: "row", gap: 10, align: "center" }),
    bound(P(c, br.address, { ...still, quiet: false }), { text: "address" }),
    bound(P(c, br.hours, still), { text: "hours" }),
    bound(hug(B(c, w(br.phone, br.phone, br.phone), `tel:${br.phone.replace(/[^\d+]/g, "")}`, "outline", still)), { label: "phone", href: "phone" }),
  ], { gap: 8 });
}

/* ---- sections reading the tables ---- */

const offersPart = (b: Built, skin: Skin, o: { featured?: boolean; group?: [string, W]; title?: W; sub?: W; limit?: number } = {}): Part => (c) => {
  const k = withSkin(c, skin);
  const spec = b.spec.offers;
  const columns = spec.look === "menu" ? 2 : spec.look === "tiles" ? 4 : 3;
  const where = o.featured ? [{ field: "featured", op: "isTrue" }] : o.group ? [{ field: "group", op: "is", value: o.group[0] }] : [];
  const title = o.group ? o.group[1] : o.title ?? spec.title;
  const kids = [head(k, title, o.group ? undefined : o.sub ?? spec.sub, o.group ? { center: false } : { eyebrow: o.featured ? SW.picked : undefined }), LIST(k, "offers", offerCard(k, b), { columns, where, limit: o.limit ?? (o.featured ? 6 : 24) })];
  if (o.featured) kids.push(STACK(k, [B(k, SW.seeAll, b.slugs.offers, "outline")], { direction: "row", justify: "center", margin: [32, 0, 0, 0] }));
  return SEC(k, kids, { name: title });
};
const teamPart = (b: Built, skin: Skin): Part => (c) => {
  const k = withSkin(c, skin);
  const t = b.spec.team!;
  return SEC(k, [head(k, t.title, t.sub), LIST(k, "team", teamCard(k, b), { columns: Math.min(4, Math.max(2, t.rows.length)) })], { name: t.title });
};
const reviewsPart = (b: Built, skin: Skin, limit = 6): Part => (c) => {
  const k = withSkin(c, skin);
  return SEC(k, [head(k, SW.reviews, SW.reviewsSub), LIST(k, "reviews", reviewCard(k, b), { columns: 3, limit })], { name: SW.reviews });
};
const questionsPart = (b: Built, skin: Skin, limit = 24, more = false): Part => (c) => {
  const k = withSkin(c, skin);
  const kids = [head(k, SW.questions, SW.questionsSub), LIST(k, "questions", questionCard(k, b), { columns: 2, limit })];
  if (more) kids.push(STACK(k, [B(k, SW.allQuestions, b.slugs.questions, "outline")], { direction: "row", justify: "center", margin: [32, 0, 0, 0] }));
  return SEC(k, kids, { name: SW.questions });
};
const postsPart = (b: Built, skin: Skin, limit = 24, more = false): Part => (c) => {
  const k = withSkin(c, skin);
  const kids = [head(k, b.spec.posts.title, b.spec.posts.sub), LIST(k, "posts", postCard(k, b), { columns: 3, limit })];
  if (more) kids.push(STACK(k, [B(k, SW.allNews, b.slugs.news, "outline")], { direction: "row", justify: "center", margin: [32, 0, 0, 0] }));
  return SEC(k, kids, { name: b.spec.posts.title });
};
/** The visitor's message: a form writing a row into the messages table, beside the branches. */
const contactPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  const formCard = CARD(k, [H(k, SW.writeUs, 3, still), EL(k, "form", {
    kind: "custom",
    fields: [
      { name: "name", kind: "text", label: say(k, SW.name), required: true },
      { name: "phone", kind: "phone", label: say(k, SW.phone), required: true },
      { name: "email", kind: "email", label: say(k, SW.email) },
      { name: "message", kind: "long", label: say(k, SW.message), required: true },
    ],
    send: { to: "table", table: "messages" },
    button: say(k, SW.send),
    done: say(k, SW.sent),
  }, { style: { self: "stretch" } })], { gap: 16, pad: [32, 28, 32, 28] });
  const places = STACK(k, [H(k, SW.branches, 3), LIST(k, "branches", branchCard(k, b), { columns: 1 })], { gap: 16 });
  return SEC(k, [COLS(k, [3, 2], [[formCard], [places]], { gap: 40, align: "start" })], { name: SW.contact });
};
/** A booking: what to choose, the day, and the steps after. */
const bookingPart = (b: Built): Part => (c) => {
  const k = withSkin(c, "plain");
  const bk = b.spec.booking!;
  const formCard = CARD(k, [EL(k, "form", {
    kind: "custom",
    fields: [
      { name: "name", kind: "text", label: say(k, SW.name), required: true },
      { name: "phone", kind: "phone", label: say(k, SW.phone), required: true },
      { name: "service", kind: "select", label: say(k, bk.ask), required: true, options: choicesOf(b.spec).map(([id, name]) => ({ value: id, label: say(k, name) })) },
      { name: "day", kind: "date", label: say(k, SW.day) },
      { name: "notes", kind: "long", label: say(k, SW.notes) },
    ],
    send: { to: "table", table: "bookings" },
    button: say(k, bk.button),
    done: say(k, bk.done),
  }, { style: { self: "stretch" } })], { gap: 16, pad: [32, 28, 32, 28] });
  const steps = STACK(k, [H(k, SW.howBook, 3), ...SW.bookSteps.map(([t, line], i) => STACK(k, [
    P(k, w(String(i + 1), String(i + 1), String(i + 1)), { ...still, quiet: false, style: { size: 28, weight: 800, color: pop(k), width: "44px" } }),
    STACK(k, [H(k, t, 4, still), P(k, line, still)], { gap: 4 }),
  ], { direction: "row", gap: 16, align: "start" }))], { gap: 20 });
  return SEC(k, [COLS(k, [2, 3], [[steps], [formCard]], { gap: 48, align: "start", phone: "stack" })], { name: bk.title });
};

/** What a booking asks the visitor to pick. */
const choicesOf = (spec: SiteSpec) => spec.booking?.options ?? spec.offers.groups;

/* ---------------- The pages ---------------- */

/** A site's home in each of the six compositions: the library's openings and stories, the site's lists between them. */
function homeParts(b: Built): Part[] {
  const team = b.spec.team ? [teamPart(b, "plain")] : [];
  switch (b.spec.look % 6) {
    case 1: return [S("hero-quiet", "plain"), S("split-zigzag", "plain"), offersPart(b, "surface", { featured: true }), S("story-center", "soft"), reviewsPart(b, "plain", 3), questionsPart(b, "surface", 4, true), S("cta-mesh", "plain")];
    case 2: return [S("hero-scene", "dark"), offersPart(b, "plain", { featured: true }), S("story-two-pics", "soft"), ...team, reviewsPart(b, "surface", 3), S("cta-split", "bold")];
    case 3: return [S("hero-cover", "plain"), offersPart(b, "plain", { featured: true }), S("gal-mosaic", "plain"), S("story-wide", "plain"), reviewsPart(b, "soft", 3), S("cta-picture-over", "plain")];
    case 4: return [S("hero-frame", "soft"), offersPart(b, "plain", { featured: true }), S("split-card-over", "surface"), postsPart(b, "plain", 3, true), reviewsPart(b, "soft", 3), S("cta-scene", "dark")];
    case 5: return [S("hero-collage", "plain"), offersPart(b, "soft", { featured: true }), S("story-quote", "bold"), ...team, reviewsPart(b, "surface", 3), S("cta-center", "bold")];
    default: return [S("hero-split", "plain"), offersPart(b, "soft", { featured: true }), S("story-split", "plain"), reviewsPart(b, "surface", 3), questionsPart(b, "plain", 4, true), S("cta-box", "plain")];
  }
}
function offersParts(b: Built): Part[] {
  const o = b.spec.offers;
  const skins: Skin[] = ["plain", "surface"];
  const groups = o.groups.map((g, i) => offersPart(b, skins[i % 2], { group: g }));
  const call = b.slugs.book && b.spec.booking ? callBand(b.spec.booking.title, b.spec.booking.sub, b.spec.booking.button, b.slugs.book) : callBand(SW.contact, SW.contactSub, SW.writeUs, b.slugs.contact);
  return [pageHead(o.title, o.sub, b.spec.look % 2 ? "plain" : "soft"), ...groups, call];
}
function storyParts(b: Built): Part[] {
  const team = b.spec.team ? [teamPart(b, "surface")] : [];
  const story = b.spec.look % 2 ? S("story-two-pics", "plain") : S("story-split", "plain");
  return [pageHead(SW.ourStory, b.spec.pack.sub, "soft"), story, S("story-quote", "bold"), ...team, S("gal-four", "plain"), callBand(SW.contact, SW.contactSub, SW.writeUs, b.slugs.contact, "dark")];
}
const newsParts = (b: Built): Part[] => [pageHead(b.spec.posts.title, b.spec.posts.sub, "soft"), postsPart(b, "plain")];
const questionsParts = (b: Built): Part[] => [pageHead(SW.questions, SW.questionsSub, "soft"), questionsPart(b, "plain"), S("contact-cards", "surface")];
const contactParts = (b: Built): Part[] => [pageHead(SW.contact, SW.contactSub, "soft"), contactPart(b), S("contact-map", "surface")];
const bookParts = (b: Built): Part[] => [pageHead(b.spec.booking!.title, b.spec.booking!.sub, "soft"), bookingPart(b), questionsPart(b, "surface", 4)];

/** An item's own page: a dish, a treatment, a class… (its picture, its words, its price, a way to book). */
function offerPage(c: Ctx, b: Built): N {
  const o = b.spec.offers;
  const first = o.rows[0];
  const k = withSkin(c, "plain");
  const go = b.slugs.book && b.spec.booking ? B(k, b.spec.booking.button, b.slugs.book, "solid", still) : B(k, SW.writeUs, b.slugs.contact, "solid", still);
  return SEC(k, [
    hug(B(k, SW.backTo, b.slugs.offers, "link", still)),
    COLS(k, [1, 1], [
      [bound(IMG(k, first.title, { aspect: "4 / 5", radius: 24, motion: false }), { src: "picture", alt: "title" })],
      [
        bound(eyebrow(k, o.groups[0][1], still), { text: "group" }),
        bound(H(k, first.title, 1, still), { text: "title" }),
        ...(o.extra && first.extra ? [bound(P(k, first.extra, { ...still, quiet: false, style: { weight: 600 } }), { text: "extra" })] : []),
        ...(o.price && first.price !== undefined ? [bound(P(k, w(String(first.price), String(first.price), String(first.price)), { ...still, quiet: false, style: { size: 26, weight: 800, color: pop(k) } }), { text: "price" })] : []),
        bound(P(k, first.text, { ...still, style: { size: 18 } }), { text: "summary" }),
        hug(go),
      ],
    ], { gap: 48, align: "center" }),
  ], { name: first.title, pad: [48, 24, 88, 24] });
}
/** A piece of news on its own page. */
function postPage(c: Ctx, b: Built): N {
  const p = b.spec.posts.rows[0];
  const k = withSkin(c, "plain");
  return SEC(k, [STACK(k, [
    hug(B(k, SW.allNews, b.slugs.news, "link", still)),
    bound(P(k, w(p.date, p.date, p.date), still), { text: "date" }),
    bound(H(k, p.title, 1, still), { text: "title" }),
    bound(IMG(k, p.title, { aspect: "16 / 9", radius: 20, motion: false }), { src: "cover", alt: "title" }),
    bound(P(k, p.body, { ...still, quiet: false, style: { size: 18, lineHeight: 1.9 } }), { text: "body" }),
  ], { gap: 18, maxWidth: "760px", width: "100%", self: "center" })], { name: p.title, pad: [48, 24, 96, 24] });
}

/* ---------------- The site's words where the library has a store's ---------------- */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
/**
 * The library writes a store's sample details (its name, address, hours, phone, the shop's pages): the
 * site's own take their place, and its buttons go to the site's own pages.
 */
function ownWords(tree: N, b: Built, c: Ctx): N {
  const biz = b.spec.biz;
  const digits = biz.phone.replace(/[^\d+]/g, "");
  // A dashed number after right-to-left words reads backwards ("1234-600-04") unless kept whole, left to right.
  const num = `${String.fromCodePoint(0x2066)}${biz.phone}${String.fromCodePoint(0x2069)}`;
  const phoneLine = w(`تلفون وواتساب: ${num}`, `Phone and WhatsApp: ${biz.phone}`, `טלפון ווואטסאפ: ${num}`);
  const swaps: Array<[W, W]> = [[C.storeName, biz.name], [C.address, biz.address], [C.hours, biz.hours], [C.phoneLine, phoneLine], [C.mailLine, w(biz.email, biz.email, biz.email)]];
  const pages: Record<string, string> = { "/shop": b.slugs.offers, "/about": b.slugs.story, "/contact": b.slugs.contact };
  const walk = (n: N): N => {
    const props: Obj = { ...n.props };
    for (const key of ["text", "label"]) {
      const v = props[key];
      if (!isObj(v)) continue;
      const hit = swaps.find(([from]) => v.ar === from.ar || v.en === from.en);
      if (hit) props[key] = say(c, hit[1]);
    }
    if (typeof props.href === "string") {
      if (pages[props.href]) props.href = pages[props.href];
      else if (props.href.startsWith("tel:")) props.href = `tel:${digits}`;
      else if (props.href.startsWith("mailto:")) props.href = `mailto:${biz.email}`;
      else if (props.href.startsWith("https://wa.me/")) props.href = `https://wa.me/${digits.replace(/^\+/, "").replace(/^0/, "972")}`;
    }
    if (n.type === "map") props.query = biz.city;
    return { ...n, props, ...(n.children ? { children: n.children.map(walk) } : {}) };
  };
  return walk(tree);
}

/* ---------------- The tables ---------------- */

const f = {
  text: (id: string, name: W, more: Obj = {}): Field => ({ id, type: "text", name, ...more }),
  long: (id: string, name: W, more: Obj = {}): Field => ({ id, type: "longText", name, ...more }),
  image: (id: string, name: W): Field => ({ id, type: "image", name }),
  money: (id: string, name: W): Field => ({ id, type: "money", name, currency: "ILS" }),
  bool: (id: string, name: W): Field => ({ id, type: "boolean", name }),
  date: (id: string, name: W): Field => ({ id, type: "date", name }),
  phone: (id: string, name: W, more: Obj = {}): Field => ({ id, type: "phone", name, ...more }),
  email: (id: string, name: W): Field => ({ id, type: "email", name }),
  select: (id: string, name: W, options: Array<[string, W]>, more: Obj = {}): Field => ({ id, type: "select", name, options: options.map(([oid, oname]) => ({ id: oid, name: oname })), ...more }),
};
/** Ready pictures in turn: the site's kind's, else the plain ones. */
const picOf = (spec: SiteSpec, n: number) => (spec.pics ? `/templates/${spec.pics}/product-${(n % 6) + 1}.svg` : `/templates/photo-${(n % 6) + 1}.svg`);
const plainPic = (n: number) => `/templates/photo-${(n % 6) + 1}.svg`;
/** Visitors may add a row (a message, a booking); nobody reads them but the store's own members. */
const WRITE_ONLY = { read: "off", create: "public", update: "off", delete: "off", private: [] as string[] };

function tablesOf(b: Built, c: Ctx): SiteFile["tables"] {
  const s = b.spec;
  const o = s.offers;
  const tree = (node: N): Tree => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [node] } });
  const offers = {
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
      data: { title: r.title, summary: r.text, group: r.group, ...(o.price && r.price !== undefined ? { price: r.price } : {}), ...(o.extra && r.extra ? { extra: r.extra } : {}), picture: picOf(s, i), featured: !!r.featured },
    })),
  };
  const team = s.team
    ? [{ key: "team", slug: "team", name: s.team.title, fields: [f.text("name", SW.name, { required: true }), f.text("role", SW.role), f.long("bio", SW.bio), f.image("photo", SW.photo)], rows: s.team.rows.map((m, i) => ({ data: { name: m.name, role: m.role, bio: m.bio, photo: plainPic(i + 2) } })) }]
    : [];
  const reviews = { key: "reviews", slug: "reviews", name: SW.reviews, fields: [f.text("name", SW.name, { required: true }), f.text("place", SW.place), f.long("words", SW.words, { required: true }), f.select("stars", SW.stars, STARS, { default: "s5" })], rows: s.reviews.map((r) => ({ data: { name: r.name, place: r.place, words: r.text, stars: r.stars === 4 ? "s4" : "s5" } })) };
  const questions = { key: "questions", slug: "questions", name: SW.questions, fields: [f.text("question", SW.question, { required: true }), f.long("answer", SW.answer, { required: true })], rows: s.questions.map((q) => ({ data: { question: q.q, answer: q.a } })) };
  const posts = {
    key: "posts",
    slug: "news",
    name: s.posts.title,
    fields: [f.text("title", SW.title, { required: true }), f.long("summary", SW.summary), f.long("body", SW.body), f.image("cover", SW.cover), f.date("date", SW.date)],
    itemPage: tree(postPage(c, b)),
    rows: s.posts.rows.map((p, i) => ({ slug: p.slug, data: { title: p.title, summary: p.text, body: p.body, cover: s.pics ? `/templates/${s.pics}/${i === 0 ? "hero" : i === 1 ? "story" : "product-3"}.svg` : plainPic(i), date: p.date } })),
  };
  const branches = { key: "branches", slug: "branches", name: SW.branches, fields: [f.text("name", SW.branch, { required: true }), f.text("address", SW.address), f.text("hours", SW.hours), f.phone("phone", SW.phone)], rows: s.branches.map((br) => ({ data: { name: br.name, address: br.address, hours: br.hours, phone: br.phone } })) };
  const status = (more: Array<[string, W]>) => f.select("status", SW.status, [["fresh", SW.fresh], ...more], { default: "fresh" });
  const messages = { key: "messages", slug: "messages", name: SW.messages, fields: [f.text("name", SW.name, { required: true }), f.phone("phone", SW.phone, { required: true }), f.email("email", SW.email), f.long("message", SW.message, { required: true }), status([["replied", SW.replied]])], api: WRITE_ONLY };
  const bookings = s.booking
    ? [{ key: "bookings", slug: "bookings", name: SW.bookings, fields: [f.text("name", SW.name, { required: true }), f.phone("phone", SW.phone, { required: true }), f.select("service", s.booking.ask, choicesOf(s)), f.date("day", SW.day), f.long("notes", SW.notes), status([["confirmed", SW.confirmed], ["done", SW.done]])], api: WRITE_ONLY }]
    : [];
  return [offers, ...team, reviews, questions, posts, branches, messages, ...bookings];
}

/** The owner is told of each message and booking from the site (a draft: they publish it to switch it on). */
function functionsOf(b: Built): SiteFile["functions"] {
  const on = (table: string) => ({ kind: "row" as const, config: { table: T(table), on: ["added"] } });
  return [{
    key: "notify",
    name: SW.notify,
    note: "بيوصلك جرس بلوحة الإدارة مع كل رسالة أو طلب حجز بيجي من الموقع.",
    def: { lang: "ar", inputs: [{ name: "row", type: "any" }], do: [{ act: "notify", title: `${SW.newRequest}: {{input.row.phone}}`, text: "افتح الجدول لتشوف التفاصيل وترد.", link: "/admin/data" }] },
    triggers: [on("messages"), ...(b.spec.booking ? [on("bookings")] : [])],
  }];
}

/* ---------------- The whole site ---------------- */

export type BuildSite = { lang: Lang; motion?: MotionLevel };

/** The site's pages' addresses (the template's own words: installing gives a taken one another). */
export function slugsOf(spec: SiteSpec): Slugs {
  return { home: spec.home, offers: spec.offers.page, story: "/our-story", news: "/news", questions: "/questions", contact: "/reach-us", book: spec.booking ? "/book" : null };
}

/** A site as the template file the store installs (words in all three languages; page names in `lang`). */
export function buildSite(spec: SiteSpec, o: BuildSite): SiteFile {
  let n = 0;
  const ids = (prefix: string) => `${prefix.replace(/[^A-Za-z0-9_-]/g, "") || "n"}-${(n++).toString(36)}`;
  const pics = spec.pics ? [`/templates/${spec.pics}/hero.svg`, `/templates/${spec.pics}/story.svg`, ...[1, 2, 3, 4, 5, 6].map((i) => `/templates/${spec.pics}/product-${i}.svg`)] : [];
  const base = ctxOf({ lang: o.lang, all: true, fam: spec.fam, motion: o.motion ?? "calm", ids, pics });
  const c: Ctx = { ...base, pack: { ...base.pack, ...spec.pack, icon: spec.pack.icon ?? base.pack.icon } };
  const b: Built = { spec, slugs: slugsOf(spec) };
  const pageOf = (key: string, slug: string, name: W, parts: Part[], seo: W): SiteFile["pages"][number] => ({
    key,
    name: `${spec.biz.name[o.lang]}: ${name[o.lang]}`.slice(0, 120),
    slug,
    tree: { version: 1, root: ownWords({ id: "page", type: "page", props: {}, children: parts.map((p) => p(c)) }, b, c) },
    seo: { title: `${name[o.lang]} | ${spec.biz.name[o.lang]}`.slice(0, 120), description: seo[o.lang].slice(0, 300) },
  });
  const pages: SiteFile["pages"] = [
    pageOf("home", b.slugs.home, SW.home, homeParts(b), spec.pack.sub),
    pageOf("offers", b.slugs.offers, spec.offers.title, offersParts(b), spec.offers.sub),
    pageOf("story", b.slugs.story, SW.ourStory, storyParts(b), spec.pack.story),
    pageOf("news", b.slugs.news, spec.posts.title, newsParts(b), spec.posts.sub),
    pageOf("questions", b.slugs.questions, SW.questions, questionsParts(b), SW.questionsSub),
    pageOf("contact", b.slugs.contact, SW.contact, contactParts(b), SW.contactSub),
    ...(b.slugs.book && spec.booking ? [pageOf("book", b.slugs.book, spec.booking.title, bookParts(b), spec.booking.sub)] : []),
  ];
  const tables = tablesOf(b, c).map((t) => (t.itemPage ? { ...t, itemPage: { ...t.itemPage, root: ownWords(t.itemPage.root, b, c) } } : t));
  return { format: "estabrek.feature", formatVersion: 1, key: spec.key, version: spec.version, name: spec.name, note: spec.note, tables, functions: functionsOf(b), pages, needs: { secrets: [], sites: [] } };
}

/** What a site holds, for its card in the gallery. */
export function siteCounts(spec: SiteSpec) {
  const tables = 6 + (spec.team ? 1 : 0) + (spec.booking ? 1 : 0);
  const rows = spec.offers.rows.length + (spec.team?.rows.length ?? 0) + spec.reviews.length + spec.questions.length + spec.posts.rows.length + spec.branches.length;
  return { pages: spec.booking ? 7 : 6, tables, rows };
}
