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

/**
 * A whole site's setting (wave 1): a switch, a number, words… its owner changes without opening a page or a
 * function (admin → ميزاتي → the site → إعدادات الموقع). Its functions read it as "{{settings.key}}"; its
 * pages show an element only while a switch is on (`showIf`) and take an element's words from it
 * (`fromSetting`). Only a public one reaches the shop. The backend's lib/siteSettings.ts checks each.
 */
export type SettingKind = "toggle" | "number" | "text" | "words" | "choice" | "color";
export type SiteSetting = {
  key: string;
  kind: SettingKind;
  label: W;
  note?: W;
  /** Its section on the owner's form (the module's name). */
  group?: W;
  /** The shop's pages read it (else it stays on the server). */
  public?: boolean;
  default?: boolean | number | string | W;
  min?: number;
  max?: number;
  whole?: boolean;
  unit?: W;
  long?: boolean;
  options?: Array<{ id: string; name: W }>;
};

/**
 * A whole site's panel (wave 1.2): its own pages in the admin's menu, under its name, made of parts that read its
 * tables (by their keys, `@table:bookings`) and its settings. The backend's lib/sitePanel.ts checks and draws them,
 * each part only for a member who may read what it reads.
 */
export type PanelCond = { field: string; op: "is" | "isNot" | "empty" | "notEmpty"; value?: string | number | boolean };
/** A number on the panel: how many rows match, in a window of days (compared with the window before it). */
export type PanelNumber = { key: string; label: W; table: string; where?: PanelCond[]; window?: "today" | "week" | "month"; compare?: boolean };
/** A queue's button: the fields it sets on the row ("confirmed"). */
export type PanelDecision = { key: string; label: W; set: Record<string, string | number | boolean>; tone?: "good" | "bad" };
/** A quick action: a setting it sets ("close online booking"). */
export type PanelAction = { key: string; label: W; note?: W; setting: string; value: string | number | boolean };
export type PanelPart =
  | { kind: "numbers"; key: string; items: PanelNumber[] }
  | { kind: "queue"; key: string; title: W; table: string; where: PanelCond[]; show: string[]; decisions: PanelDecision[]; empty?: W; limit?: number }
  | { kind: "view"; key: string; title: W; table: string; where?: PanelCond[]; columns: string[]; sort?: { field: string; dir: "asc" | "desc" }; limit?: number }
  | { kind: "settings"; key: string; title?: W; keys: string[] }
  | { kind: "actions"; key: string; title?: W; items: PanelAction[] }
  /** Rows a day over the last days, split by a choice's options. */
  | { kind: "chart"; key: string; title: W; table: string; where?: PanelCond[]; days?: number; split?: string }
  /** Rows in columns by a choice's options; a card moves to another column. */
  | { kind: "kanban"; key: string; title: W; table: string; where?: PanelCond[]; field: string; show: string[]; limit?: number }
  /** Rows on a month by a date; a row moves to another day. */
  | { kind: "calendar"; key: string; title: W; table: string; where?: PanelCond[]; date: string; show: string[]; color?: string }
  /** Everything about one person (by a phone or an email) across the site's tables. */
  | { kind: "people"; key: string; title: W; by: string; name?: string; tables: PanelPeopleTable[] }
  /** A period's rows counted by a choice's options, and the period's rows as a file. */
  | { kind: "report"; key: string; title: W; table: string; where?: PanelCond[]; by: string; columns: string[] }
  /** Rows with an address, each on a map. */
  | { kind: "map"; key: string; title: W; table: string; where?: PanelCond[]; label: string; address: string; show?: string[] }
  /** A code read by the camera (or typed) finds a row; buttons decide it. */
  | { kind: "scanner"; key: string; title: W; table: string; match: string; show: string[]; decisions: PanelDecision[] };
export type PanelPeopleTable = { table: string; title: W; show: string[] };
export type PanelPage = { key: string; name: W; icon: "today" | "lists" | "settings" | "calendar" | "people" | "chart"; parts: PanelPart[] };
/**
 * What a module brings to its site's panel: numbers, actions and a person's tables joined with the others', its
 * own parts on «اليوم», «الحجوزات» (a calendar, a board), «التقارير» and «القوائم».
 */
export type PanelBits = { numbers?: PanelNumber[]; today?: PanelPart[]; board?: PanelPart[]; reports?: PanelPart[]; lists?: PanelPart[]; actions?: PanelAction[]; people?: PanelPeopleTable[] };

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
