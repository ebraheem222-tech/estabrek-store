/**
 * The hundred moving-particle kinds a section can have behind it (the shop's
 * pageTree/particles.ts PARTICLE_DEFS), in groups, each with a mark and its name in the
 * admin's three languages ("عربي|English|עברית").
 */
import { adminLang } from "../lib/lang";

const say = (s: string) => () => { const [ar, en, he] = s.split("|"); return { ar, en, he: he ?? en }[adminLang()]; };
type Kind = [id: string, mark: string, name: () => string];
const K = (id: string, mark: string, name: string): Kind => [id, mark, say(name)];

export const PARTICLE_GROUPS: Array<{ key: string; title: () => string; kinds: Kind[] }> = [
  { key: "weather", title: say("طقس ومطر|Weather|מזג אוויר"), kinds: [
    K("snow", "❄", "ثلج|Snow|שלג"), K("snow-heavy", "❅", "ثلج كثيف|Heavy snow|שלג כבד"), K("snowflakes", "❆", "ندف ثلج|Snowflakes|פתיתי שלג"),
    K("blizzard", "🌨", "عاصفة ثلجية|Blizzard|סופת שלג"), K("raindrops", "💧", "قطرات مطر|Raindrops|טיפות גשם"), K("drizzle", "┆", "رذاذ|Drizzle|טפטוף"),
    K("clouds", "☁", "غيوم|Clouds|עננים"), K("sunshine", "☀", "شموس|Suns|שמשות"), K("bolts", "⚡", "برق|Lightning bolts|ברקים"),
  ] },
  { key: "night", title: say("سماء الليل|Night sky|שמי לילה"), kinds: [
    K("stars", "✦", "نجوم|Stars|כוכבים"), K("twinkle-stars", "★", "نجوم تلمع|Twinkling stars|כוכבים מנצנצים"), K("star-dust", "·", "غبار نجوم|Star dust|אבק כוכבים"),
    K("shooting", "☄", "شهب|Shooting stars|כוכבים נופלים"), K("moons", "☾", "أقمار|Moons|ירחים"), K("night-mix", "🌙", "ليل وهلال|Night mix|לילה וסהר"),
    K("constellation", "⁂", "كوكبات|Constellation|קבוצות כוכבים"), K("galaxy-dust", "✧", "غبار المجرة|Galaxy dust|אבק גלקטי"), K("orbs", "●", "كرات ضوء|Orbs|כדורי אור"),
    K("fireflies", "✺", "يراعات|Fireflies|גחליליות"), K("fireflies-warm", "✹", "يراعات دافئة|Warm fireflies|גחליליות חמות"),
  ] },
  { key: "nature", title: say("طبيعة|Nature|טבע"), kinds: [
    K("leaves", "🍃", "أوراق|Leaves|עלים"), K("leaves-wind", "🍂", "أوراق بالريح|Leaves in the wind|עלים ברוח"), K("petals", "✿", "بتلات|Petals|עלי כותרת"),
    K("sakura", "❀", "زهر الكرز|Blossoms|פריחה"), K("feathers", "🪶", "ريش|Feathers|נוצות"), K("butterflies", "🦋", "فراشات|Butterflies|פרפרים"),
    K("birds", "🕊", "طيور|Birds|ציפורים"), K("pollen", "∴", "حبوب لقاح|Pollen|אבקה"), K("dandelion", "✻", "هندباء|Dandelion|שן הארי"),
    K("nature-mix", "🌿", "طبيعة منوّعة|Nature mix|טבע מעורב"),
  ] },
  { key: "water", title: say("ماء|Water|מים"), kinds: [
    K("bubbles", "◦", "فقاعات|Bubbles|בועות"), K("bubbles-big", "○", "فقاعات كبيرة|Big bubbles|בועות גדולות"), K("foam", "⁘", "رغوة|Foam|קצף"),
    K("bubble-pop", "◎", "فقاعات نابضة|Pulsing bubbles|בועות פועמות"), K("ocean-mix", "🌊", "بحر|Ocean mix|ים"),
  ] },
  { key: "party", title: say("احتفال|Celebration|חגיגה"), kinds: [
    K("confetti", "🎊", "قصاصات|Confetti|קונפטי"), K("confetti-fall", "🎉", "قصاصات متساقطة|Falling confetti|קונפטי נופל"), K("ribbons", "〰", "شرائط|Ribbons|סרטים"),
    K("balloons", "🎈", "بالونات|Balloons|בלונים"), K("gifts", "🎁", "هدايا|Gifts|מתנות"), K("hearts", "♥", "قلوب|Hearts|לבבות"),
    K("hearts-fall", "♡", "قلوب نازلة|Falling hearts|לבבות נופלים"), K("hearts-pulse", "💗", "قلوب نابضة|Pulsing hearts|לבבות פועמים"), K("sparkles", "✧", "لمعات|Sparkles|ניצוצות"),
    K("glitter", "✨", "لمعان|Glitter|נצנצים"), K("stars-gold", "⭐", "نجوم ذهبية|Gold stars|כוכבי זהב"), K("diamonds", "◆", "ألماس|Diamonds|יהלומים"),
    K("rings", "💍", "خواتم|Rings|טבעות"), K("party-mix", "🥳", "حفلة|Party mix|מסיבה"), K("wedding", "💒", "عرس|Wedding|חתונה"),
  ] },
  { key: "occasions", title: say("مناسبات ومواسم|Occasions and seasons|אירועים ועונות"), kinds: [
    K("lanterns", "🏮", "فوانيس|Lanterns|פנסים"), K("ramadan", "🌙", "رمضان|Ramadan|רמדאן"), K("eid", "🎁", "عيد|Eid|חג"),
    K("star8", "✷", "نجمة ثمانية|Eight-point stars|כוכבים בני שמונה"), K("winter-mix", "❄", "شتاء|Winter|חורף"), K("spring-mix", "🌸", "ربيع|Spring|אביב"),
    K("autumn-mix", "🍁", "خريف|Autumn|סתיו"), K("summer", "☀", "صيف|Summer|קיץ"), K("kids", "🧸", "أطفال|Kids|ילדים"),
    K("valentine", "💝", "عيد الحب|Valentine's|יום האהבה"),
  ] },
  { key: "shopping", title: say("تسوّق وموسيقى|Shopping and music|קניות ומוזיקה"), kinds: [
    K("coins", "🪙", "عملات|Coins|מטבעות"), K("percent", "%", "نسب خصم|Discounts|הנחות"), K("tags", "🏷", "بطاقات سعر|Price tags|תגי מחיר"),
    K("sale-mix", "⚡", "تخفيضات|Sale mix|מבצעים"), K("bags", "🛍", "أكياس تسوّق|Shopping bags|שקיות קניות"), K("coffee", "☕", "حبوب قهوة|Coffee beans|פולי קפה"),
    K("notes", "♪", "نوتات|Music notes|תווים"), K("notes-fall", "♫", "نوتات نازلة|Falling notes|תווים נופלים"), K("music-mix", "🎵", "موسيقى|Music mix|מוזיקה"),
  ] },
  { key: "geometry", title: say("أشكال هندسية|Geometry|גאומטריה"), kinds: [
    K("links", "⋰", "شبكة|Links|רשת"), K("network", "⋱", "شبكة كثيفة|Dense network|רשת צפופה"), K("network-wide", "⌇", "شبكة واسعة|Wide network|רשת רחבה"),
    K("molecules", "⚛", "جزيئات|Molecules|מולקולות"), K("bouncing", "⚪", "كرات بتنط|Bouncing balls|כדורים קופצים"), K("triangles", "▲", "مثلثات|Triangles|משולשים"),
    K("squares", "■", "مربعات|Squares|ריבועים"), K("hexagons", "⬢", "سداسيات|Hexagons|משושים"), K("shapes-mix", "◆", "أشكال منوّعة|Shapes mix|צורות מעורבות"),
    K("circles-outline", "◯", "دوائر مفرّغة|Circle outlines|עיגולים חלולים"), K("squares-outline", "□", "مربعات مفرّغة|Square outlines|ריבועים חלולים"), K("triangles-outline", "△", "مثلثات مفرّغة|Triangle outlines|משולשים חלולים"),
    K("hexagons-outline", "⬡", "سداسيات مفرّغة|Hexagon outlines|משושים חלולים"), K("stars-outline", "☆", "نجوم مفرّغة|Star outlines|כוכבים חלולים"), K("plus", "✚", "علامات زائد|Plus signs|סימני פלוס"),
    K("dots-drift", "⋯", "نقاط ماشية|Drifting dots|נקודות נודדות"), K("pulse-dots", "⦿", "نقاط نابضة|Pulsing dots|נקודות פועמות"), K("lines", "╱", "خطوط|Lines|קווים"),
  ] },
  { key: "tech", title: say("تقنية وضوء|Tech and light|טכנולוגיה ואור"), kinds: [
    K("pixels", "▪", "بكسلات|Pixels|פיקסלים"), K("data-up", "⇡", "بيانات صاعدة|Rising data|נתונים עולים"), K("sparks", "✶", "شرر|Sparks|גיצים"),
    K("embers", "🔥", "جمر|Embers|גחלים"), K("glow-dots", "◉", "نقاط مضيئة|Glowing dots|נקודות זוהרות"), K("neon-lines", "⟋", "خطوط نيون|Neon lines|קווי ניאון"),
    K("comets", "☄", "مذنّبات|Comets|שביטים"), K("magic-dust", "✨", "غبار سحري|Magic dust|אבק קסום"), K("bokeh", "⬤", "بوكيه|Bokeh|בוקה"),
    K("fairy-lights", "💡", "أضواء جنيّة|Fairy lights|אורות פיות"), K("aurora-dust", "🌌", "غبار الشفق|Aurora dust|אבק זוהר"), K("snow-globe", "🔮", "كرة ثلج|Snow globe|כדור שלג"),
    K("rose-rain", "🌹", "مطر ورد|Rose rain|גשם ורדים"),
  ] },
];
export const PARTICLE_IDS = PARTICLE_GROUPS.flatMap(g => g.kinds.map(([id]) => id));
