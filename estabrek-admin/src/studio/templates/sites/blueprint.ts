/**
 * A whole site's blueprint (wave 0 of docs/sites-300-plan.ar.md): what a site is, written as data.
 * A site is its business (name, address, words), the archetype it starts from (a business's front, a
 * booking place, a social network…) and the modules it uses (its main list, its team, its news, its
 * contact form, its bookings…), each with its own words and ready rows.
 *
 * The blueprint is the site's source. compile.ts turns it into the feature template the store installs
 * (estabrek.feature, the backend's lib/featureTemplate.ts): the modules each bring their tables, pages
 * and functions, so a new kind of site is mostly a new set of modules, not a new builder.
 *
 * Pure data: no React and no admin words, so the backend's tests read the same files.
 */
import { w, type Family, type IconName, type Pack, type W } from "../words";

export const SITE_FORMAT = "estabrek.site" as const;
export const SITE_FORMAT_VERSION = 2 as const;

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

/** The thirteen archetypes a site starts from (the plan's table); each gives its home and its first modules. */
export const ARCHETYPES = {
  front: { name: w("واجهة", "A business's front", "חזית לעסק"), note: w("شركة، مكتب، محل: صفحات وقوائم ورسائل.", "A company, an office, a shop: pages, lists and messages.", "חברה, משרד, חנות: עמודים, רשימות והודעות.") },
  booking: { name: w("حجز", "Bookings", "הזמנות"), note: w("عيادة، صالون، ملعب، فندق: مواعيد وفترات وتذكير.", "A clinic, a salon, a court, a hotel: times, slots and reminders.", "מרפאה, סלון, מגרש, מלון: תורים, משבצות ותזכורות.") },
  order: { name: w("طلب", "Orders", "הזמנות אוכל ומוצרים"), note: w("مطعم توصيل، صيدلية، مخبز: طلب واستلام أو توصيل.", "A delivery restaurant, a pharmacy, a bakery: order, pick up or deliver.", "מסעדת משלוחים, בית מרקחת, מאפייה: הזמנה, איסוף או משלוח.") },
  membership: { name: w("عضوية", "Membership", "מנויים"), note: w("نادي، اشتراك، خدمة: خطط وأعضاء ومحتوى إلهم.", "A club, a subscription, a service: plans, members and their content.", "מועדון, מנוי, שירות: תוכניות, חברים ותוכן שלהם.") },
  social: { name: w("تواصل", "Social", "קהילה"), note: w("شبكة، منتدى، مجتمع: بروفايلات ومنشورات ورسائل وإشراف.", "A network, a forum, a community: profiles, posts, messages and moderation.", "רשת, פורום, קהילה: פרופילים, פוסטים, הודעות וניהול.") },
  market: { name: w("سوق", "Marketplace", "שוק"), note: w("بائعين، إعلانات، مزادات: موافقة وعمولة وتقييم.", "Sellers, listings, auctions: approval, commission and ratings.", "מוכרים, מודעות, מכירות פומביות: אישור, עמלה ודירוג.") },
  learning: { name: w("تعليم", "Learning", "למידה"), note: w("كورسات، مدرسة، تحفيظ: دروس وتقدّم واختبارات.", "Courses, a school, memorising: lessons, progress and quizzes.", "קורסים, בית ספר, שינון: שיעורים, התקדמות ומבחנים.") },
  media: { name: w("إعلام", "Media", "מדיה"), note: w("أخبار، مجلة، بودكاست: كتّاب ومراجعة ونشر.", "News, a magazine, a podcast: writers, review and publishing.", "חדשות, מגזין, פודקאסט: כותבים, עריכה ופרסום.") },
  giving: { name: w("خير", "Giving", "נתינה"), note: w("جمعية، حملة، كفالة: تبرعات ومتطوعين.", "A charity, a campaign, a sponsorship: donations and volunteers.", "עמותה, קמפיין, חסות: תרומות ומתנדבים.") },
  events: { name: w("فعاليات", "Events", "אירועים"), note: w("مؤتمر، عرس، مسرح: تذاكر وحضور ومقاعد.", "A conference, a wedding, a theatre: tickets, attendance and seats.", "כנס, חתונה, תיאטרון: כרטיסים, נוכחות ומושבים.") },
  directory: { name: w("دليل", "Directory", "מדריך"), note: w("دليل مدينة، عقارات، سيارات: إدراجات وفلاتر وخريطة.", "A city guide, property, cars: listings, filters and a map.", "מדריך עיר, נדל״ן, רכבים: רשומות, מסננים ומפה.") },
  work: { name: w("شغل", "Work", "עבודה"), note: w("CRM، دعم، مشاريع: سجلات بحالات ومهام.", "A CRM, support, projects: records with states and tasks.", "CRM, תמיכה, פרויקטים: רשומות עם מצבים ומשימות.") },
  portfolio: { name: w("معرض", "Portfolio", "תיק עבודות"), note: w("مصوّر، مصمم، معماري: أعمال وطلبات بمراحل.", "A photographer, a designer, an architect: work and requests in stages.", "צלם, מעצב, אדריכל: עבודות ובקשות בשלבים.") },
} as const;
export type Archetype = keyof typeof ARCHETYPES;

/* ---------------- The modules' own words ---------------- */

/** A row of the site's main list: a dish, a treatment, a class, a property, a package… */
export type OfferRow = { slug: string; title: W; text: W; group: string; price?: number; extra?: W; featured?: boolean };
/** The main list: its table, its page, its words, its groups and its rows. */
export type OffersUse = {
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
export type TeamUse = { title: W; sub: W; rows: Array<{ name: W; role: W; bio: W }> };
export type ReviewsUse = { rows: Array<{ name: W; place: W; text: W; stars?: 4 | 5 }> };
export type QuestionsUse = { rows: Array<{ q: W; a: W }> };
export type NewsUse = { title: W; sub: W; rows: Array<{ slug: string; date: string; title: W; text: W; body: W }> };
export type BranchesUse = { rows: Array<{ name: W; address: W; hours: W; phone: string }> };
/** A booking page with its form (a service's). */
export type BookingUse = { title: W; sub: W; ask: W; button: W; done: W; /** What the visitor picks (else the main list's groups). */ options?: Array<[string, W]> };
/** A module that takes no words of its own. */
export type Bare = Record<string, never>;

/** The modules a site uses, each with its words. Which modules exist, and what each brings, is modules/index.ts. */
export type SiteModules = {
  offers?: OffersUse;
  team?: TeamUse;
  story?: Bare;
  reviews?: ReviewsUse;
  questions?: QuestionsUse;
  news?: NewsUse;
  branches?: BranchesUse;
  contact?: Bare;
  booking?: BookingUse;
  notify?: Bare;
};
export type ModuleKey = keyof SiteModules;

/* ---------------- The blueprint ---------------- */

export type SiteBlueprint = {
  format: typeof SITE_FORMAT;
  formatVersion: typeof SITE_FORMAT_VERSION;
  /** The template's key ("site-restaurant") and version. */
  key: string;
  version: string;
  field: SiteField;
  archetype: Archetype;
  /** The kind of store the library builds it as (its choices of shapes and words where the site has none). */
  fam: Family;
  /** The shop's folder of ready pictures (public/templates/<pics>), or "" for the plain ones. */
  pics: string;
  /** Which of its archetype's compositions its pages take. */
  look: number;
  name: W;
  note: W;
  /** The business: its name, where, when, how to reach it, and the town the map shows. */
  biz: { name: W; address: W; hours: W; phone: string; email: string; city: string };
  /** The site's words for the library's sections (an opening's eyebrow, title, line and button; its story). */
  pack: Pick<Pack, "label" | "eyebrow" | "title" | "sub" | "cta" | "product" | "story" | "collection"> & { icon?: IconName };
  /** The site's first page (the store's own home stays as it is). */
  home: string;
  modules: SiteModules;
};

/** A blueprint, with its format said. */
export const site = (b: Omit<SiteBlueprint, "format" | "formatVersion">): SiteBlueprint => ({ format: SITE_FORMAT, formatVersion: SITE_FORMAT_VERSION, ...b });
