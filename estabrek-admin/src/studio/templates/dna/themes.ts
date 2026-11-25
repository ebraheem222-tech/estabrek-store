/**
 * Plan 3.9b of the themes library: whole premium themes. A theme wears one look (dna/looks.ts) from the top of the
 * store to its bottom: the look's own header and footer, a home, an about page and a contact page, each page put
 * together from the DNA's layouts worn in that look (its premium ones among them: live grounds, 3D, scroll scenes,
 * games, charts). Most of a theme's sections are designs the gallery lists on their own too; the shop's gate
 * (tests/premium-themes.spec.ts) checks every page of every theme whole, on a store, with its header and footer.
 * Pure, like the rest of the DNA: the backend's test builds every page against the page tree's rules.
 */
import { STACK, withSkin, type Ctx, type N, type Skin } from "../build";
import { C, w, type W } from "../words";
import type { Layout } from "./heroes";
import { DNA_KINDS, PICTURE_GROUND } from "./kinds";
import { head, over, rule, section, text } from "./kit";
import { LOOK_BY_KEY, type Look } from "./looks";

export const THEME_PARTS = ["home", "about", "contact"] as const;
export type ThemePart = (typeof THEME_PARTS)[number];
export const THEME_PART_NAMES: Record<ThemePart | "header" | "footer", W> = {
  home: w("الرئيسية", "Home", "דף הבית"),
  about: w("من نحن", "About", "אודות"),
  contact: w("تواصل", "Contact", "צור קשר"),
  header: w("الهيدر", "Header", "כותרת עליונה"),
  footer: w("الفوتر", "Footer", "כותרת תחתונה"),
};

/**
 * A section of a theme's page: "<kind> <layout>" (a DNA kind's key and one of its layouts) worn in the theme's look,
 * in the look's first colour or, after "@", another of its colours; "top" is the page's own title (about, contact).
 */
type Slot = string;
export type PremiumTheme = {
  key: string;
  look: string;
  name: W;
  /** What the theme is, in a line (the gallery's card). */
  line: W;
  /** The look's own header and footer layouts (designs the gallery lists: dna-header-<layout>-<look>). */
  header: string;
  footer: string;
  pages: Record<ThemePart, Slot[]>;
};

const T = (key: string, look: string, name: W, line: W, [header, footer]: [string, string], home: Slot[], about: Slot[], contact: Slot[]): PremiumTheme =>
  ({ key, look, name, line, header, footer, pages: { home, about, contact } });

export const THEMES: PremiumTheme[] = [
  T("breeze", "airy", w("نسمة", "Breeze", "משב רוח"), w("أبيض وهوا ومساحة: كل قطعة بتتنفّس.", "White, air and room: every piece gets to breathe.", "לבן, אוויר ומרחב: לכל פריט יש מקום לנשום."), ["bar", "centre"],
    ["wowopen shader-center", "perks three@soft", "products head-grid", "wowstory timeline", "categories circles@soft", "wowsell phone", "reviews cards@surface", "news centre@soft"],
    ["top", "wowdata sunburst", "stats row@soft", "boxes steps", "reviews store-row@surface", "cta centre"],
    ["top", "contact cards@soft", "delivery timeline", "wowdata flights", "club join@surface"]),
  T("special-issue", "editorial", w("العدد الخاص", "Special Issue", "גיליון מיוחד"), w("متجر بيتقرا متل مجلة: عناوين كبيرة وصور بتحكي.", "A store that reads like a magazine: big titles and pictures that tell.", "חנות שנקראת כמו מגזין: כותרות גדולות ותמונות שמספרות."), ["promo", "columns"],
    ["wowopen trail-giant", "products words-grid@surface", "wowstory drift", "categories tall", "wowsell flash@dark", "reviews faces", "banner type-band", "news split@surface"],
    ["top", "wowstory book", "stats split@surface", "trust list", "perks side-list", "cta running@dark"],
    ["top", "contact form", "delivery questions@surface", "club points"]),
  T("impact", "heavy", w("ضربة", "Impact", "עוצמה"), w("حروف تقيلة وألوان صريحة لمتجر ما بيستحي.", "Heavy letters and plain colours for a store that isn't shy.", "אותיות כבדות וצבעים ישירים לחנות שלא מתביישת."), ["split", "giant"],
    ["wowopen shader-center", "products centre-grid", "wowstory dive", "offer flash@bold", "wowsell cube", "reviews running@dark", "banner wide", "news split"],
    ["top", "stats story", "wowdata bars3d", "trust values@bold", "perks numbered", "cta centre@dark"],
    ["top", "contact centre", "club points@bold", "drops teaser"]),
  T("velvet", "luxe", w("مخمل", "Velvet", "קטיפה"), w("هدوء غالي: لمسة ذهب، صور كبيرة وكلام قليل.", "Quiet and costly: a touch of gold, big pictures, few words.", "שקט ויוקרתי: נגיעת זהב, תמונות גדולות ומעט מילים."), ["centre", "news"],
    ["wowopen shader-split", "products promo-grid@surface", "wowstory book", "categories overlay", "wowsell scratch@dark", "reviews big-quote@surface", "banner big-two", "club tiers@dark"],
    ["top", "wowdata sunburst@surface", "stats story@dark", "perks around", "trust badge-cards@surface", "cta picture"],
    ["top", "contact panel@surface", "delivery promises", "giftcards three@dark"]),
  T("concrete", "brutal", w("خرسانة", "Concrete", "בטון"), w("خطوط عريضة وصناديق صريحة، بلا تجميل.", "Thick lines and plain boxes, no make-up.", "קווים עבים וקופסאות ישירות, בלי איפור."), ["bar", "card"],
    ["wowopen trail-giant", "products card-grid", "wowstory dive@soft", "categories banners", "wowsell cube", "offer tiers@soft", "reviews cards", "news coupon@bold"],
    ["top", "stats cards@soft", "trust badge-cards", "perks cards@soft", "shoplook big", "club tiers@bold"],
    ["top", "contact cards", "boxes steps@soft", "cta split@bold"]),
  T("cloud", "pillow", w("غيمة", "Cloud", "ענן"), w("زوايا طرية وألوان ناعمة متل المخدة.", "Soft corners and gentle colours, like a pillow.", "פינות רכות וצבעים עדינים, כמו כרית."), ["search", "news"],
    ["wowopen ring-stage", "products three@plain", "wowstory fan", "categories pills@plain", "wowsell phone", "reviews rating@plain", "offer code-card", "drops teaser"],
    ["top", "wowdata sunburst@plain", "stats story", "perks around@plain", "trust badge-cards", "cta card@plain"],
    ["top", "contact form@plain", "delivery zones", "club tiers@plain"]),
  T("crystal", "glass", w("بلّور", "Crystal", "קריסטל"), w("زجاج على أرض غامقة، وضو بيلحق الماوس.", "Glass on a dark ground, and light that follows the mouse.", "זכוכית על רקע כהה, ואור שעוקב אחרי העכבר."), ["capsule", "columns"],
    ["wowopen shader-split", "products card-grid", "wowstory depth", "categories card-circles@soft", "wowsell phone", "reviews big-quote", "perks bento@soft", "news perks"],
    ["top", "perks cards@soft", "stats cards", "reviews faces", "specs versus@soft", "cta split"],
    ["top", "contact form", "wowdata flights", "club points@soft"]),
  T("ink", "ink", w("حبر", "Ink", "דיו"), w("حروف بلون واحد بيذوب بلون تاني، على أرض ساكتة.", "Letters in a colour melting into another, on a quiet ground.", "אותיות בצבע שנמס לצבע אחר, על רקע שקט."), ["promo", "contact"],
    ["wowopen canvas-word", "products card-grid", "wowstory dive", "offer band@dark", "wowsell flash", "reviews rating", "banner colour-pic", "news perks@dark"],
    ["top", "stats split", "perks bento@dark", "boxes fill", "wowdata sankey", "cta centre@dark"],
    ["top", "contact hours", "delivery promises@dark", "club join"]),
  T("engraved", "carved", w("نقش", "Engraved", "חריטה"), w("حروف محفورة بخط رفيع وأرقام كبيرة متل لوح حجر.", "Letters cut in a thin line and big numbers, like a stone tablet.", "אותיות חרוטות בקו דק ומספרים גדולים, כמו לוח אבן."), ["capsule", "giant"],
    ["wowopen trail-giant", "products words-grid", "wowstory book@dark", "offer flash", "stats giant@dark", "reviews running", "wowsell cube", "news bar@dark"],
    ["top", "wowdata sankey", "trust values", "perks numbered@dark", "drops teaser", "cta running"],
    ["top", "contact questions", "delivery promises@dark", "news bar"]),
  T("sketchbook", "marker", w("دفتر رسم", "Sketchbook", "מחברת סקיצות"), w("خط قلم عريض تحت كل عنوان، وورق بيضحك.", "A thick pen line under every title, on paper that smiles.", "קו טוש עבה מתחת לכל כותרת, על נייר שמחייך."), ["centre", "perks"],
    ["wowopen canvas-word", "products words-grid", "wowstory fan@soft", "categories pills", "wowsell ring-shop@soft", "reviews faces", "offer tiers", "news coupon@soft"],
    ["top", "wowstory timeline", "trust guarantee@soft", "stats split", "cta choices@soft"],
    ["top", "contact questions", "delivery questions@soft", "news coupon"]),
  T("exhibit", "gallery", w("صالة عرض", "Exhibit", "תערוכה"), w("كل منتج معلّق متل لوحة بإطارها.", "Every product hung like a painting in its frame.", "כל מוצר תלוי כמו ציור במסגרת."), ["split", "contact"],
    ["wowopen ring-stage", "products promo-grid@plain", "wowstory drift", "categories banners@plain", "wowsell flash", "reviews wall@plain", "banner framed", "news bar@plain"],
    ["top", "wowstory book@plain", "trust press", "perks around@plain", "cta choices"],
    ["top", "contact hours@plain", "delivery questions", "news bar@plain"]),
  T("tilt", "tilted", w("مايلة", "Tilt", "הטיה"), w("كروت مايلة وحركة خفيفة: متجر بيلعب.", "Tilted cards and a little motion: a store at play.", "כרטיסים מוטים ותנועה קלה: חנות שמשחקת."), ["capsule", "centre"],
    ["wowopen canvas-word", "products promo-grid@plain", "wowstory fan", "shoplook list@plain", "wowsell pairs", "reviews wall@plain", "offer bundle@bold", "news picture"],
    ["top", "stats picture@plain", "perks around", "trust list@plain", "club refer", "cta picture@plain"],
    ["top", "contact hours", "delivery promises@plain", "news picture"]),
  T("arches", "arches", w("قناطر", "Arches", "קשתות"), w("صور بأقواس وظلّ دافي، متل بيت قديم.", "Pictures in arches and warm shade, like an old house.", "תמונות בקשתות וצל חמים, כמו בית ישן."), ["split", "centre"],
    ["wowopen canvas-word", "products row@soft", "wowstory fan", "categories picture-cats", "wowsell scratch@dark", "reviews quote-picture@soft", "banner trio", "news picture"],
    ["top", "wowstory book@soft", "stats picture", "trust guarantee@soft", "perks picture", "cta picture@dark"],
    ["top", "contact centre@soft", "delivery promises", "news picture@soft"]),
  T("bubbles", "blobs", w("فقاعات", "Bubbles", "בועות"), w("أشكال طرية بتسبح ورا المنتجات.", "Soft shapes floating behind the products.", "צורות רכות שצפות מאחורי המוצרים."), ["promo", "perks"],
    ["wowopen ring-stage", "products words-grid@plain", "wowstory helix", "banner big-two@plain", "wowsell pairs", "reviews wall@plain", "offer bundle", "news coupon@plain"],
    ["top", "trust values", "stats cards@plain", "boxes fill", "cta choices@plain"],
    ["top", "contact centre", "delivery zones@plain", "news coupon"]),
  T("monoline", "mono", w("شيفرة", "Monoline", "קוד"), w("خط آلة كاتبة وشبكة دقيقة لمتجر تقني.", "A typewriter face and a fine grid for a tech store.", "גופן מכונת כתיבה ורשת עדינה לחנות טכנולוגית."), ["search", "columns"],
    ["wowopen earth-reach", "products head-grid", "wowstory depth@dark", "offer band", "wowsell phone", "reviews rating@dark", "shoplook list", "news split"],
    ["top", "wowdata bars3d@dark", "stats story", "perks side-list", "specs table@dark", "cta card"],
    ["top", "contact panel", "delivery questions@dark", "finder split"]),
  T("two-tones", "duotone", w("لونين", "Two Tones", "שני גוונים"), w("كل صورة بلونين من ألوان المتجر.", "Every picture in two of the store's colours.", "כל תמונה בשני צבעים של החנות."), ["bar", "perks"],
    ["wowopen shader-split", "products promo-grid", "wowstory dive", "categories overlay", "wowsell ring-shop@bold", "reviews quote-picture", "shoplook side@bold", "news bar"],
    ["top", "wowdata sankey", "stats split", "trust values@bold", "offer split", "cta split"],
    ["top", "contact questions", "delivery promises@bold", "news bar"]),
  T("midnight", "noir", w("منتصف الليل", "Midnight", "חצות"), w("ليل كامل، وأضواء قليلة على القطع.", "A whole night, and a few lights on the pieces.", "לילה שלם, ומעט אורות על הפריטים."), ["bar", "giant"],
    ["wowopen shader-center", "products three", "wowstory drift", "categories picture-cats", "wowsell flash", "reviews cards", "wowsell pairs", "news picture"],
    ["top", "wowstory timeline", "wowdata sankey", "stats picture", "trust press", "reviews store-row", "cta centre"],
    ["top", "contact centre", "delivery questions", "wowdata flights", "trust guarantee"]),
  T("neon", "neon", w("نيون", "Neon", "ניאון"), w("ألوان بتتوهّج على أسود، وأرقام حيّة.", "Colour glowing on black, and live numbers.", "צבעים זוהרים על שחור, ומספרים חיים."), ["centre", "news"],
    ["wowopen ring-stage", "products centre-grid", "wowstory depth", "categories banners", "wowsell cube", "reviews big-quote", "offer code-card", "club tiers"],
    ["top", "wowdata sunburst", "stats divided", "trust badges", "wowdata bars3d", "reviews running", "cta running"],
    ["top", "contact cards", "delivery zones", "perks three", "club join"]),
  T("seventies", "retro", w("سبعينات", "Seventies", "שנות השבעים"), w("ألوان دافية وحروف مايلة بظلّ، من أيام زمان.", "Warm colours and slanted letters with a shadow, from back then.", "צבעים חמים ואותיות נטויות עם צל, מפעם."), ["promo", "contact"],
    ["wowopen shader-split", "products row@plain", "wowstory helix", "categories pills", "wowsell scratch@plain", "offer ticket@bold", "reviews rating", "news perks@plain"],
    ["top", "stats divided@plain", "perks bento", "trust guarantee@plain", "boxes sizes", "cta card@bold"],
    ["top", "contact panel", "delivery promises@plain", "club join"]),
  T("paper-thread", "paper", w("ورق وخيط", "Paper & Thread", "נייר וחוט"), w("ملمس ورق وخيوط، وصفحات بتتقلّب.", "The feel of paper and thread, and pages that turn.", "תחושה של נייר וחוט, ודפים שמתהפכים."), ["capsule", "contact"],
    ["wowopen canvas-word", "products words-grid@plain", "wowstory book", "categories card-circles@plain", "wowsell cube", "reviews quote-picture@plain", "offer ticket", "news bar@plain"],
    ["top", "wowstory timeline@plain", "wowdata sankey", "stats picture@plain", "trust list", "cta running@plain"],
    ["top", "contact hours@plain", "delivery questions", "news bar"]),
  T("sprint", "sport", w("سرعة", "Sprint", "ספרינט"), w("خطوط مايلة وأرقام كبيرة وطاقة عالية.", "Slanted lines, big numbers and high energy.", "קווים נטויים, מספרים גדולים והרבה אנרגיה."), ["mega", "giant"],
    ["wowopen trail-giant", "products tabs", "wowstory dive@dark", "categories picture-cats", "wowsell pairs@bold", "banner type-band", "reviews quote-picture", "news coupon@bold"],
    ["top", "wowdata bars3d", "stats split@bold", "perks side-list", "wowstory helix@dark", "specs picture", "cta choices"],
    ["top", "contact questions", "delivery timeline@dark", "club refer@bold"]),
  T("sugar", "candy", w("سكّر", "Sugar", "סוכר"), w("ألوان حلويات وأشكال بتنطّ.", "Sweet-shop colours and shapes that bounce.", "צבעי ממתקים וצורות שקופצות."), ["split", "card"],
    ["wowopen shader-split", "products three", "wowstory fan@bold", "categories circles", "wowsell scratch", "offer code-card@bold", "reviews running", "news centre"],
    ["top", "wowdata bars3d@bold", "stats row", "perks three", "trust badges@bold", "boxes steps", "cta card"],
    ["top", "contact cards", "delivery zones@bold", "club points"]),
  T("earth", "organic", w("أرض", "Earth", "אדמה"), w("ألوان طين وعشب، وأشكال من الطبيعة.", "Clay and herb colours, and shapes from nature.", "צבעי חימר ועשבים, וצורות מהטבע."), ["centre", "centre"],
    ["wowopen shader-center", "products centre-grid@plain", "wowstory timeline", "banner trio@plain", "wowsell ring-shop", "reviews big-quote@plain", "shoplook two", "news picture@plain"],
    ["top", "wowdata sunburst@plain", "stats split", "trust badges@plain", "perks three", "cta picture@plain"],
    ["top", "contact panel@plain", "delivery zones", "club refer@plain"]),
  T("hush", "minimal", w("هدوء", "Hush", "שקט"), w("مساحة بيضا، خط رفيع، وولا إشي زيادة.", "White space, a thin line, and nothing more.", "מרחב לבן, קו דק, ותו לא."), ["search", "columns"],
    ["wowopen earth-reach", "products row", "wowstory drift@surface", "banner duo", "wowsell phone@surface", "reviews wall", "shoplook two@surface", "news perks"],
    ["top", "stats divided@surface", "trust press", "perks numbered@surface", "specs picture", "cta split"],
    ["top", "contact form", "delivery zones@surface", "wowdata flights"]),
];

/** Every kind's layout by "<kind> <layout>". */
const LAYOUTS = new Map<string, Layout>();
for (const [, kind, layouts] of DNA_KINDS) for (const l of layouts) LAYOUTS.set(`${kind} ${l.key}`, l);

/** A slot's layout and colour, or why it can't be built (dna.test.ts asks every slot of every theme). */
export function slotOf(theme: PremiumTheme, slot: Slot): { kind: string; layout: Layout | null; skin: Skin; top: boolean; problem?: string } {
  const L = LOOK_BY_KEY.get(theme.look);
  if (!L) return { kind: "", layout: null, skin: "plain", top: false, problem: `no look "${theme.look}"` };
  const [what, colour] = slot.split("@");
  const skin = (colour ?? L.skins[0]) as Skin;
  if (!(L.skins as string[]).includes(skin)) return { kind: "", layout: null, skin, top: false, problem: `${slot}: ${theme.look} has no colour "${skin}"` };
  if (what === "top") return { kind: "top", layout: null, skin, top: true };
  const layout = LAYOUTS.get(what) ?? null;
  const kind = what.split(" ")[0];
  if (!layout) return { kind, layout, skin, top: false, problem: `${slot}: no such layout` };
  if (colour && PICTURE_GROUND.has(layout.key)) return { kind, layout, skin, top: false, problem: `${slot}: a layout on its own ground takes one colour` };
  return { kind, layout, skin, top: false };
}

/** The page's own title: the small line, the big heading and a line of words, in the look. */
const TOP: Record<Exclude<ThemePart, "home">, { eyebrow: W; title: W; sub: W }> = {
  about: { eyebrow: C.about, title: C.ourStory, sub: w("مين نحنا، شو منعمل، وليش منحبّه.", "Who we are, what we make, and why we love it.", "מי אנחנו, מה אנחנו עושים ולמה אנחנו אוהבים את זה.") },
  contact: { eyebrow: w("نحنا هون", "We're here", "אנחנו כאן"), title: C.contactUs, sub: C.writeSub },
};
function top(c: Ctx, L: Look, part: Exclude<ThemePart, "home">): N {
  const t = TOP[part];
  // The calm, rich and playful looks centre it; the bold, tech and classic ones set it at the start, as their openings do.
  const center = L.mood === "calm" || L.mood === "luxe" || L.mood === "playful";
  const e = over(c, L, t.eyebrow, { center });
  const words = STACK(c, [...(e ? [e] : []), head(c, L, t.title, 1, { center }), ...rule(c, L), text(c, L, t.sub, { center, max: "620px" })], { gap: 16, ...(center ? { align: "center", textAlign: "center" } : {}) });
  return section(c, L, [words], t.title, { center, pad: [Math.round(L.pad * 0.9), 24, Math.round(L.pad * 0.55), 24] });
}

export type ThemePage = { key: string; theme: PremiumTheme; part: ThemePart; look: Look; name: W; build: (c: Ctx) => N[] };
const nameOf = (theme: PremiumTheme, part: ThemePart): W =>
  w(`${theme.name.ar}: ${THEME_PART_NAMES[part].ar}`, `${theme.name.en}: ${THEME_PART_NAMES[part].en}`, `${theme.name.he}: ${THEME_PART_NAMES[part].he}`);

/** Every theme's pages, built for the store like any page (pages.ts lists them with the others). */
export const THEME_PAGES: ThemePage[] = THEMES.flatMap((theme) => {
  const look = LOOK_BY_KEY.get(theme.look);
  if (!look) throw new Error(`Premium theme ${theme.key}: no look "${theme.look}"`);
  return THEME_PARTS.map((part): ThemePage => ({
    key: `premium-${theme.key}-${part}`, theme, part, look, name: nameOf(theme, part),
    build: (c) => theme.pages[part].map((slot) => {
      const s = slotOf(theme, slot);
      if (s.problem) throw new Error(`Premium theme ${theme.key}: ${s.problem}`);
      const k = withSkin(c, s.skin);
      const built = s.top ? top(k, look, part as Exclude<ThemePart, "home">) : s.layout!.build(k, look);
      // A theme's sections spread their grounds over the whole screen, one after the other, as a whole site does.
      return { ...built, props: { ...built.props, bleed: true } };
    }),
  }));
});

/** The theme's header or footer: the look's own design of it, as the gallery lists it ("dna-header-mast-noir"). */
export const regionDesign = (theme: PremiumTheme, region: "header" | "footer") => `dna-${region}-${theme[region]}-${theme.look}`;
/** Its colour: the look's first (the design comes in the look's colours). */
export const regionSkin = (theme: PremiumTheme): Skin => (LOOK_BY_KEY.get(theme.look)?.skins[0] ?? "plain") as Skin;
