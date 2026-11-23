/**
 * The game servers' family (wave G6c of docs/sites-300-plan.ar.md): six themes of our own for a game server's site
 * (FiveM, Minecraft, Rust and the rest): night neon, square pixels, rough survival, racing stripes, clean e-sports
 * and a fantasy guild. Each paints the whole site in its colours and fonts, and gives the server's own parts (its live
 * status, the wipe countdown, rankings, streamers, the store's packages) and its buttons a shape of their own
 * (app/server-themes.css): glowing lines, square blocks with a hard shadow, torn edges, a stripe and a slanted button,
 * thin clean lines, a double gold frame. Nothing here is a game's own: no logo, drawing or font of theirs (the pixels
 * are squares we draw, not any game's blocks or letters), and a game is named only in words.
 */
import type { StoreTheme, Words } from "../types";
import { copy, font, tones, w } from "./kit";

/** What every server theme's home shows where the site has nothing of its own. */
const PACKAGES = w("الباقات", "Packages", "חבילות");
const SECTIONS = w("الأقسام", "Sections", "מדורים");
const STRIP: Words[] = [w("السيرفر شغّال 24/7", "Up 24/7", "השרת פועל 24/7"), w("ديسكورد نشيط", "An active Discord", "דיסקורד פעיל"), w("إدارة عادلة", "Fair staff", "צוות הוגן"), w("تحديثات كل أسبوع", "Updates every week", "עדכונים כל שבוע")];

export const SERVER_THEMES: StoreTheme[] = [
  {
    id: "night-neon",
    name: w("ليل نيون", "Night Neon", "לילה ניאון"),
    family: "servers",
    blurb: w("سماوي وفوشي على ليل غامق: خطوط بتضوّي حول حالة السيرفر وأرقامه.", "Cyan and magenta on a deep night: lines that glow around the server's status and numbers.", "טורקיז ומג'נטה על לילה עמוק: קווים זוהרים סביב מצב השרת והמספרים."),
    mode: "dark",
    palettes: { dark: tones("dark", "#07060f", "#22d3ee", "#f472d0", "#f1f5ff"), light: tones("light", "#f5f7ff", "#0891b2", "#a21caf", "#0b0b1a") },
    fonts: font("changa", "readex"),
    round: 0.6,
    pill: "999px",
    shadow: "glow",
    hero: "spotlight",
    motion: "arcade",
    svg: "neon",
    card: "spec",
    kit: { icons: "ph-thin", decor: { pattern: "grid", edge: "none" } },
    copy: copy(
      w("المدينة صاحية", "The city is awake", "העיר ערה"),
      w("الليل\nإلنا", "The night\nis ours", "הלילה\nשלנו"),
      w("سيرفر بيضل شغّال، ناس بتلعب كل ليلة، وفريق بيسهر عالمدينة.", "A server that stays up, people playing every night, and a team that looks after the city.", "שרת שנשאר למעלה, אנשים שמשחקים כל לילה, וצוות ששומר על העיר."),
      w("فوت هلّق", "Join now", "להצטרף עכשיו"),
      PACKAGES, SECTIONS, STRIP,
    ),
  },
  {
    id: "square-pixel",
    name: w("بكسل مربّع", "Square Pixel", "פיקסל מרובע"),
    family: "servers",
    blurb: w("مربّعات بألوان صريحة وظل قاسي: كل إشي بلوكات من رسمنا، بلا زوايا مدوّرة.", "Bold-coloured squares and a hard shadow: everything in blocks we draw, no round corners.", "ריבועים בצבעים נועזים וצל קשה: הכול בבלוקים שאנחנו מציירים, בלי פינות מעוגלות."),
    mode: "light",
    palettes: { light: tones("light", "#f6f2e7", "#2b7de9", "#d7263d", "#161616"), dark: tones("dark", "#14121c", "#5aa9ff", "#ff5a6e", "#f6f2e7") },
    fonts: font("lalezar", "readex"),
    round: 0,
    pill: "0px",
    shadow: "deep",
    hero: "playful",
    motion: "arcade",
    svg: "pixel",
    card: "pixel",
    kit: { icons: "ph-bold", button: { look: "shadow" }, box: { look: "pop" }, decor: { shape: "rect", pattern: "checks", edge: "zigzag" } },
    copy: copy(
      w("عالم من مربّعات", "A world of squares", "עולם של ריבועים"),
      w("ابنوا\nسوا", "Build it\ntogether", "לבנות\nביחד"),
      w("سيرفر سرفايفل ودّي: ابنوا، استكشفوا، وتاجروا مع ناس بتحب اللعبة متلكم.", "A friendly survival server: build, explore and trade with people who love the game as you do.", "שרת הישרדות ידידותי: לבנות, לחקור ולסחור עם אנשים שאוהבים את המשחק כמוכם."),
      w("انسخ العنوان", "Copy the address", "להעתיק את הכתובת"),
      PACKAGES, SECTIONS, STRIP,
    ),
  },
  {
    id: "rough-survival",
    name: w("سرفايفل خشن", "Rough Survival", "הישרדות קשוחה"),
    family: "servers",
    blurb: w("رماد وجمر وحديد: حواف مقطوعة وخطوط مخدوشة لسيرفرات البقاء والمسح.", "Ash, embers and iron: torn edges and scratched lines for survival and wipe servers.", "אפר, גחלים וברזל: קצוות קרועים וקווים שרוטים לשרתי הישרדות ומחיקה."),
    mode: "dark",
    palettes: { dark: tones("dark", "#16130f", "#d9822b", "#e8a54b", "#efe6d8"), light: tones("light", "#ede6da", "#9a4f12", "#6b2f0a", "#1f1a14") },
    fonts: font("kufi", "tajawal"),
    round: 0.15,
    pill: "3px",
    shadow: "deep",
    hero: "split",
    motion: "sporty",
    svg: "ember",
    card: "angled",
    kit: { icons: "tabler", decor: { shape: "slant", pattern: "hatch", edge: "zigzag" } },
    copy: copy(
      w("ابدأ من الصفر", "Start from nothing", "להתחיל מאפס"),
      w("ابقَ\nعايش", "Stay\nalive", "להישאר\nבחיים"),
      w("خريطة جديدة كل مسح، قوانين واضحة، وإدارة بتلاحق الغشّاشين.", "A new map every wipe, clear rules, and staff who go after cheaters.", "מפה חדשה בכל מחיקה, חוקים ברורים וצוות שרודף אחרי רמאים."),
      w("شوف إمتى المسح", "See the next wipe", "מתי המחיקה הבאה"),
      PACKAGES, SECTIONS, STRIP,
    ),
  },
  {
    id: "race-stripes",
    name: w("سباق بخطوط", "Race Stripes", "פסי מירוץ"),
    family: "servers",
    blurb: w("أبيض وأحمر وأصفر بخطوط سباق: كبسات مايلة وعدّاد بشريط مربّعات.", "White, red and yellow with racing stripes: slanted buttons and a countdown under a chequered strip.", "לבן, אדום וצהוב עם פסי מירוץ: כפתורים נטויים וספירה לאחור מתחת לפס משובץ."),
    mode: "light",
    palettes: { light: tones("light", "#f7f7f5", "#f5b700", "#d90429", "#0d0d0d"), dark: tones("dark", "#0c0c0d", "#ffcc33", "#ff3b3b", "#f5f5f5") },
    fonts: font("changa", "rubik"),
    round: 0.3,
    pill: "4px",
    shadow: "soft",
    hero: "split",
    motion: "sporty",
    svg: "track",
    card: "angled",
    kit: { icons: "ph-bold", decor: { shape: "slant", pattern: "stripes", edge: "slant" } },
    copy: copy(
      w("على خط البداية", "On the starting line", "על קו הזינוק"),
      w("أسرع\nلفّة", "The fastest\nlap", "ההקפה\nהמהירה"),
      w("سباقات كل أسبوع، ترتيب للّفات، وجوايز للأوائل.", "Races every week, a ranking of lap times, and prizes for the top drivers.", "מירוצים כל שבוע, דירוג זמני הקפה ופרסים לראשונים."),
      w("سجّل بالسباق", "Sign up to race", "להירשם למירוץ"),
      PACKAGES, SECTIONS, STRIP,
    ),
  },
  {
    id: "clean-esports",
    name: w("إي-سبورت نظيف", "Clean E-sports", "אי-ספורט נקי"),
    family: "servers",
    blurb: w("أبيض وأزرق بخطوط رفيعة: أرقام واضحة وترتيب مرتّب متل لوحة بطولة.", "White and blue in thin lines: clear numbers and tidy rankings, like a tournament board.", "לבן וכחול בקווים דקים: מספרים ברורים ודירוג מסודר, כמו לוח טורניר."),
    mode: "light",
    palettes: { light: tones("light", "#f7f9fc", "#3b82f6", "#1e3a8a", "#0b1220"), dark: tones("dark", "#0a0f1a", "#60a5fa", "#93c5fd", "#eef3fb") },
    fonts: font("readex", "rubik"),
    round: 0.5,
    pill: "8px",
    shadow: "flat",
    hero: "mono",
    motion: "precise",
    svg: "arena",
    card: "spec",
    kit: { icons: "tabler", focus: "ring", decor: { shape: "rounded", pattern: "lines", edge: "none" } },
    copy: copy(
      w("الموسم بلّش", "The season is on", "העונה התחילה"),
      w("العب\nلتربح", "Play\nto win", "לשחק\nכדי לנצח"),
      w("بطولات ومباريات مرتّبة، ترتيب حيّ، وفرق بتتنافس كل أسبوع.", "Organised tournaments and matches, live rankings, and teams competing every week.", "טורנירים ומשחקים מסודרים, דירוג חי וקבוצות שמתחרות כל שבוע."),
      w("شوف الترتيب", "See the rankings", "לדירוג"),
      PACKAGES, SECTIONS, STRIP,
    ),
  },
  {
    id: "fantasy-guild",
    name: w("غيلد فانتازيا", "Fantasy Guild", "גילדת פנטזיה"),
    family: "servers",
    blurb: w("بنفسجي ليلي وذهب: إطارات مزدوجة بزوايا منقوشة لنقابات وسيرفرات المغامرة.", "Night purple and gold: double frames with carved corners for guilds and adventure servers.", "סגול לילי וזהב: מסגרות כפולות עם פינות מגולפות לגילדות ולשרתי הרפתקאות."),
    mode: "dark",
    palettes: { dark: tones("dark", "#120d16", "#c8a24a", "#e3c36f", "#f3ead8"), light: tones("light", "#f6f0e3", "#7b4fa0", "#4a2470", "#1e1428") },
    fonts: font("ruqaa", "tajawal"),
    round: 0.5,
    pill: "999px",
    shadow: "soft",
    hero: "editorial",
    motion: "luxe",
    svg: "fantasy",
    card: "frame",
    kit: { icons: "ph-duotone", decor: { shape: "shield", pattern: "none", edge: "arc" } },
    copy: copy(
      w("النقابة بتستناك", "The guild awaits", "הגילדה מחכה"),
      w("مغامرة\nبتجمعنا", "An adventure\nthat binds us", "הרפתקה\nשמאחדת אותנו"),
      w("غارات وفعاليات كل أسبوع، رتب للأعضاء، وقصص بنكتبها سوا.", "Raids and events every week, ranks for members, and stories we write together.", "פשיטות ואירועים כל שבוע, דרגות לחברים וסיפורים שכותבים ביחד."),
      w("قدّم للنقابة", "Apply to the guild", "להגיש מועמדות לגילדה"),
      PACKAGES, SECTIONS, STRIP,
    ),
  },
];

/** The family's themes, by the look each gives the server's own parts. */
export const SERVER_THEME_IDS = SERVER_THEMES.map((t) => t.id);
