/** Original, hand-composed designs inspired by the merchant's local reference collection. */
import { BTN, EB, H, HEAD, SHELF, T, part, type TK } from "../lib";
import { STYLES, type Style } from "../styles";
import { cols, el, grid, row, stack, t, type Node, type Style as Css } from "../tree";
import type { Template } from "./types";

type Art = "foundry" | "kinetic" | "lantern";
const artSrc = (family: Art, n = 1) => `/templates/experimental/${family}-${n}.svg`;
const picture = (k: TK, family: Art, n: number, title: string, style?: Css) => el(k, "image", {
  src: artSrc(family, n), alt: t(title),
}, { style: { width: "100%", fit: "cover", aspect: "5 / 4", ...style }, motion: { enter: { kind: "fade", duration: .8 }, hover: { kind: "tilt", amount: .5 } } });
const line = (k: TK) => el(k, "divider", {}, { style: { color: "border", margin: [24, 0, 24, 0] } });
const shop = t("اكتشف المجموعة|Explore the collection|גלו את הקולקציה");
const note = t("اختر القطعة وافتح صفحتها للاطلاع على التفاصيل المتاحة.|Choose an item and open its page to see the available details.|בחרו פריט ופתחו את העמוד שלו לפרטים הזמינים.");

const titles: Record<Art, string[]> = {
  foundry: ["نظام العمل|Workspace systems|מערכות עבודה", "تفاصيل أدق|A closer look|מבט מקרוב", "كل شيء متصل|Everything connected|הכול מחובר"],
  kinetic: ["شكل ولون|Form and colour|צורה וצבע", "تجارب بصرية|Visual experiments|ניסויים חזותיים", "مساحة للخيال|Space to imagine|מקום לדמיון"],
  lantern: ["ضوء المساء|Evening light|אור הערב", "ملمس دافئ|A warm texture|מרקם חם", "لحظات هادئة|Quiet moments|רגעים שקטים"],
};
const gallery = (k: TK, family: Art, vertical = false) => el(k, "showcase", {
  label: t("اكتشف مجموعاتنا|Explore our collections|גלו את הקולקציות שלנו"),
  layout: vertical ? "vertical" : "horizontal", activation: family === "foundry" ? "hover" : "click",
  initial: family === "kinetic" ? 1 : 0, ratio: family === "kinetic" ? 3 : 4,
  height: family === "kinetic" ? 580 : 500, duration: family === "lantern" ? .8 : .5, overlay: .45,
  items: titles[family].map((title, i) => ({ title: t(title), text: note, image: artSrc(family, i + 1), cta: shop, href: "/shop" })),
}, { style: { radius: family === "lantern" ? 20 : 0 } });

function products(k: TK, family: Art, columns: number): Node {
  // Samples belong to the gallery only. Installed designs use the merchant's catalog.
  const previewK = { ...k, pic: (name: string) => artSrc(family, Number(name) || 1) };
  return SHELF(previewK, titles[family].map((name, i) => ({ pic: String(i + 1), name: t(name), price: "—" })), {
    columns, look: family === "foundry" ? "spec" : family === "lantern" ? "boxed" : "plain",
    title: t("من المجموعة|From the collection|מתוך הקולקציה"), aspect: family === "kinetic" ? "4 / 5" : "1 / 1",
  });
}

const foundryStyle: Style = {
  ...STYLES.lab, id: "foundry", name: t("مَصنع|Foundry|סדנה"),
  seed: { mode: "dark", bg: "#101619", ink: "#edf2ec", accent: "#d5fa43", strong: "#d5fa43" }, pop: "#d5fa43", popInk: "#101619",
  fonts: { display: ["space-grotesk", "changa", "rubik"], text: ["ibm-plex-mono", "ibm-plex-sans-arabic", "heebo"] },
  head: { scale: 1.2, weight: 600, caps: true, line: 1.05 }, density: "normal", motion: "snappy",
  img: { radius: 0, frame: "line" }, button: { radius: 0, variant: "solid", caps: true },
};
const kineticStyle: Style = {
  ...STYLES.street, id: "kinetic", name: t("حركة وشكل|Kinetic Form|צורה בתנועה"),
  seed: { mode: "light", bg: "#f3f0e8", ink: "#171915", accent: "#647027", strong: "#171915" }, pop: "#d7eb77", popInk: "#171915",
  fonts: { display: ["anton", "lalezar", "secular-one"], text: ["dm-sans", "cairo", "assistant"] },
  head: { scale: 1.75, weight: 400, caps: true, line: .98 }, density: "dense", motion: "bouncy",
};
const lanternStyle: Style = {
  ...STYLES.atelier, id: "lantern", name: t("ليالي مضيئة|Lantern Nights|לילות מוארים"),
  seed: { mode: "dark", bg: "#13232a", ink: "#f7ead1", accent: "#efc384", strong: "#efc384" }, pop: "#efc384", popInk: "#13232a",
  fonts: { display: ["cormorant-garamond", "amiri", "frank-ruhl-libre"], text: ["jost", "noto-naskh-arabic", "assistant"] },
  head: { scale: 1.25, weight: 500, caps: false, line: 1.15 }, density: "airy", motion: "cinematic",
  img: { radius: 18, frame: "none" }, button: { radius: 999, variant: "outline", caps: false },
};

function foundryHome(k: TK): Node[] {
  return [
    part(k, t("مقدمة تقنية|Technical introduction|פתיחה טכנית"), [
      row(k, [EB(k, t("تصميم يتبع الفكرة|Designed around the idea|עיצוב סביב הרעיון")), T(k, t("01 / EXPLORE"), { size: 12, motion: false })], { style: { justify: "between", margin: [0, 0, 36, 0] } }),
      cols(k, [5, 7], [[H(k, t("مساحة عمل.\nرؤية جديدة.|A workspace.\nA new perspective.|סביבת עבודה.\nנקודת מבט חדשה."), 1, { size: 78 }), T(k, t("أدوات وتفاصيل تختارها على طريقتك. اكتشف المجموعة من زاوية أقرب.|Tools and details, chosen your way. Explore the collection from a closer angle.|כלים ופרטים בדרך שלכם. גלו את הקולקציה מזווית קרובה יותר.")), BTN(k, shop, "/shop")], [picture(k, "foundry", 1, "دراسة في الشكل والتقنية|A study of form and technology|מחקר של צורה וטכנולוגיה")]], { style: { gap: 32 } }),
      line(k), row(k, titles.foundry.map((title) => EB(k, t(title))), { style: { justify: "between", gap: 24 } }),
    ], { pad: [64, 24, 48, 24], style: { pattern: { kind: "grid", color: "#9eb99e", size: 52, opacity: .06 } } }),
    part(k, t("ألواح المجموعة|Collection panels|לוחות הקולקציה"), [HEAD(k, t("افتح زاوية مختلفة.|Open a different angle.|פתחו זווית אחרת.")), gallery(k, "foundry")], { tone: "surface" }),
    part(k, t("تفاصيل التصميم|Design details|פרטי העיצוב"), [
      cols(k, [1, 2], [[EB(k, t("02 / التفاصيل|02 / DETAILS|02 / פרטים")), H(k, t("الفكرة في كل تفصيل.|The idea is in the details.|הרעיון נמצא בפרטים."), 2)], [grid(k, 2, [
        stack(k, [el(k, "icon", { name: "check" }), H(k, t("مساحة للترتيب|Room to organise|מקום לסדר"), 3), T(k, note)], { style: { bg: "surface", pad: [28, 28, 28, 28] } }),
        stack(k, [el(k, "icon", { name: "sparkle" }), H(k, t("اختر ما يناسبك|Choose what fits|בחרו מה שמתאים"), 3), BTN(k, t("تصفح الخيارات|Browse options|עיינו באפשרויות"), "/shop", "alt")], { style: { bg: "surface", pad: [28, 28, 28, 28] } }),
      ], { style: { gap: 16 } })]], { style: { gap: 48 } }),
    ]),
    part(k, t("دليل الاكتشاف|Discovery guide|מדריך לגילוי"), [
      H(k, t("كل مجموعة، بطريقتها.|Every collection, its own way.|כל קולקציה בדרכה."), 2),
      el(k, "tabs", { look: "boxed", items: titles.foundry.map((label, i) => ({ label: t(label), text: note, image: artSrc("foundry", i + 1) })) }),
    ], { tone: "surface" }),
    part(k, t("اختيارات المتجر|Store selections|בחירות החנות"), [HEAD(k, t("من على الرف.|Off the shelf.|מהמדף."), { label: shop, href: "/shop" }), products(k, "foundry", 3)]),
    part(k, t("زاوية أخرى|Another perspective|נקודת מבט נוספת"), [
      row(k, [T(k, t("03 / IN FOCUS"), { size: 13, motion: false }), line(k)], { style: { justify: "between" } }),
      picture(k, "foundry", 2, "تفاصيل هندسية|Geometric details|פרטים גאומטריים", { aspect: "16 / 7" }),
      row(k, [H(k, t("ابدأ من التفاصيل.|Start with the details.|התחילו מהפרטים."), 3), BTN(k, shop, "/shop")], { style: { justify: "between", margin: [24, 0, 0, 0] } }),
    ], { tone: "surface", pad: [56, 24, 56, 24] }),
    part(k, t("ابق قريباً|Stay close|הישארו קרובים"), [cols(k, [1, 1], [[H(k, t("فكرة جديدة لمجموعتك.|A new idea for your collection.|רעיון חדש לקולקציה שלכם."), 2)], [el(k, "form", { kind: "newsletter", title: t("أخبار المجموعة|Collection updates|עדכוני הקולקציה") })]])], { tone: "pop" }),
  ];
}

function kineticHome(k: TK): Node[] {
  return [
    part(k, t("افتتاح بصري|Visual opening|פתיחה חזותית"), [
      row(k, [EB(k, t("مساحة حرة للأشياء الجميلة|An open space for beautiful things|מרחב פתוח לדברים יפים")), T(k, t("FORM / COLOUR / PLAY"), { size: 11, motion: false })], { style: { justify: "between" } }),
      H(k, t("خارج\nالمألوف.|BEYOND\nTHE ORDINARY.|מחוץ\nלשגרה."), 1, { size: 140, style: { maxWidth: "100%", margin: [28, 0, 28, 0] }, phone: { size: 68, sizeMin: 48 } }),
      cols(k, [7, 3], [[picture(k, "kinetic", 1, "دراسة بصرية بالأشكال والألوان|A visual study in form and colour|מחקר חזותי בצורות וצבעים", { aspect: "16 / 10" })], [stack(k, [T(k, t("أشكال تلفت النظر، وقطع تحمل شخصيتك. خذ وقتك واكتشف ما يشبهك.|Eye-catching forms and pieces with personality. Take your time and find what feels like you.|צורות שמושכות את העין ופריטים מלאי אופי. קחו את הזמן וגלו מה מתאים לכם.")), BTN(k, shop, "/shop")], { style: { justify: "end", height: "100%", gap: 32 } })]], { style: { gap: 32 } }),
    ], { pad: [44, 24, 72, 24] }),
    part(k, t("شريط الأفكار|Ideas ticker|רצועת רעיונות"), [el(k, "marquee", { items: [t("أشكال جديدة|NEW FORMS|צורות חדשות"), t("تفاصيل مختلفة|DIFFERENT DETAILS|פרטים שונים"), t("على طريقتك|YOUR OWN WAY|בדרך שלכם")], speed: 35, separator: "✳" }, { style: { size: 32, weight: 700 } })], { tone: "pop", full: true, pad: [28, 0, 28, 0] }),
    part(k, t("المعرض المتحرك|Moving gallery|גלריה בתנועה"), [
      row(k, [H(k, t("اختر. افتح. اكتشف.|PICK. OPEN. EXPLORE.|בחרו. פתחו. גלו."), 2), EB(k, t("تجربة بصرية|A visual experience|חוויה חזותית"))], { style: { justify: "between", margin: [0, 0, 32, 0] } }),
      gallery(k, "kinetic"),
    ]),
    part(k, t("بطاقات الإلهام|Inspiration cards|כרטיסי השראה"), [grid(k, 3, [
      stack(k, [EB(k, t("01 / الشكل|01 / FORM|01 / צורה")), H(k, t("جرأة في الخط.|A bolder line.|קו נועז."), 3), picture(k, "kinetic", 2, titles.kinetic[1], { aspect: "1 / 1", rotateZ: -4 })], { style: { gap: 24 } }),
      stack(k, [picture(k, "kinetic", 3, titles.kinetic[2], { aspect: "1 / 1", radius: 999 }), H(k, t("لون يحرك الفكرة.|Colour moves the idea.|צבע מניע את הרעיון."), 3), T(k, note)], { style: { gap: 24, pad: [60, 0, 0, 0] }, phone: { pad: [0, 0, 0, 0] } }),
      stack(k, [H(k, t("اعمل مساحة\nللمختلف.|MAKE ROOM\nFOR DIFFERENT.|פנו מקום\nלשונה."), 2), BTN(k, shop, "/shop", "alt"), el(k, "icon", { name: "sparkle" }, { style: { iconSize: 112, color: "accent" }, motion: { loop: { kind: "spin", duration: 20 } } })], { style: { pad: [32, 24, 32, 24], bg: "#e7a2c3", justify: "between" } }),
    ], { style: { gap: 32 } })], { tone: "surface" }),
    part(k, t("قطع مختارة|Selected pieces|פריטים נבחרים"), [H(k, t("أشياء تستحق\nمساحة عندك.|OBJECTS WORTH\nMAKING ROOM FOR.|דברים ששווה\nלפנות להם מקום."), 2), line(k), products(k, "kinetic", 3)]),
    part(k, t("عن المجموعة|About the collection|על הקולקציה"), [
      cols(k, [1, 1], [[picture(k, "kinetic", 2, titles.kinetic[1], { aspect: "4 / 5" })], [EB(k, t("كل قطعة بداية|Every piece is a beginning|כל פריט הוא התחלה")), H(k, t("اختيار صغير.\nأثر واضح.|A SMALL CHOICE.\nA CLEAR IMPRESSION.|בחירה קטנה.\nרושם ברור."), 2), T(k, note), el(k, "accordion", { single: true, look: "plus", items: [
        { q: t("كيف أختار القطعة؟|How do I choose a piece?|איך בוחרים פריט?"), a: note },
        { q: t("أين أجد المزيد من التفاصيل؟|Where can I find more details?|איפה אפשר למצוא פרטים נוספים?"), a: t("افتح صفحة القطعة أو تواصل معنا لأي سؤال.|Open the item page or contact us with your questions.|פתחו את עמוד הפריט או צרו קשר לכל שאלה.") },
      ] })]], { style: { gap: 64 } }),
    ], { tone: "pop" }),
    part(k, t("تواصل مع الفكرة|Connect with the idea|מתחברים לרעיון"), [
      stack(k, [EB(k, t("خلي الفكرة تكمل|Keep the idea moving|ממשיכים את הרעיון")), H(k, t("شو اختيارك\nالجاي؟|WHAT WILL\nYOU PICK NEXT?|מה תהיה\nהבחירה הבאה?"), 2, { size: 88 }), row(k, [BTN(k, shop, "/shop"), BTN(k, t("احكي معنا|Talk to us|דברו איתנו"), "/contact", "alt")], { style: { justify: "center" } })], { style: { align: "center", textAlign: "center", gap: 28 } }),
    ], { pad: [104, 24, 104, 24] }),
  ];
}

function lanternHome(k: TK): Node[] {
  const hero = part(k, t("ليلة مضيئة|A glowing evening|ערב מואר"), [
    cols(k, [1, 1], [[EB(k, t("أشياء لها حضور هادئ|Objects with a quiet presence|חפצים עם נוכחות שקטה")), H(k, t("ضوء صغير.\nشعور مختلف.|A little light.\nA different feeling.|אור קטן.\nתחושה אחרת."), 1, { size: 86 }), T(k, t("تفاصيل للبيت، وللحظات اللي منحبها. استكشف عالماً من الألوان الدافئة والأشكال الهادئة.|Details for home, and the moments we love. Explore a world of warm colours and quiet forms.|פרטים לבית ולרגעים שאנחנו אוהבים. גלו עולם של צבעים חמים וצורות שקטות.")), row(k, [BTN(k, shop, "/shop"), BTN(k, t("تعرّف علينا|Meet the store|הכירו את החנות"), "/about", "alt")])], [el(k, "model3d", {
      model: "lantern", poster: artSrc("lantern"), label: t("فانوس ثلاثي الأبعاد، اسحب لتدويره|A 3D lantern, drag to turn|פנס תלת ממדי, גררו לסיבוב"),
      finish: "matte", colours: { screen: "#ffe6b2", body: "#efc384", trim: "#815b3d", accent: "#b26d4d", glow: "#fff1bf", metal: "#7b6848" },
      knobs: { width: 1, height: 1.15, ribs: 12, handle: .7 }, anim: { type: "float", speed: .5, amount: .35 },
      lights: { preset: "warm" }, floor: "none", drag: true, tilt: true, auto: .12,
    }, { style: { height: "560px", width: "100%" }, phone: { height: "380px" } })]], { style: { gap: 48 } }),
    line(k), row(k, [T(k, t("خذ لحظة.|Take a moment.|קחו רגע."), { size: 14 }), T(k, t("للبيت، ولحظاتك.|For home, for your moments.|לבית ולרגעים שלכם."), { size: 14 })], { style: { justify: "between" } }),
  ], { pad: [80, 24, 48, 24], style: { mesh: { colors: ["#13232a", "#2d3935", "#40392d"], soft: 65, move: true, speed: .4 } } });
  hero.props.particles = { kind: "fireflies", color: "#efc384", amount: .4, speed: .4 };
  return [
    hero,
    part(k, t("قصة المساء|An evening story|סיפור של ערב"), [
      stack(k, [EB(k, t("دع الأشياء تتحدث|Let the objects speak|תנו לחפצים לדבר")), H(k, t("أحياناً، أبسط التفاصيل\nبتغيّر المكان كله.|Sometimes the smallest detail\nchanges the whole room.|לפעמים הפרט הקטן ביותר\nמשנה את כל החדר."), 2, { style: { maxWidth: "840px" } }), T(k, note, { style: { maxWidth: "560px" } })], { style: { align: "center", textAlign: "center", gap: 28 } }),
    ], { pad: [120, 24, 120, 24] }),
    part(k, t("مجموعات بأجواء دافئة|Warm collections|קולקציות חמות"), [cols(k, [2, 3], [[EB(k, t("ضوء / ملمس / إحساس|LIGHT / TEXTURE / FEELING|אור / מרקם / תחושה")), H(k, t("لكل زاوية\nحكاية.|Every corner\nhas a story.|לכל פינה\nיש סיפור."), 2), BTN(k, shop, "/shop")], [gallery(k, "lantern", true)]], { style: { gap: 64 } })], { tone: "surface" }),
    part(k, t("اختيارات مضيئة|Glowing selections|בחירות מוארות"), [HEAD(k, t("تفاصيل قريبة للقلب.|Details close to the heart.|פרטים שקרובים ללב."), { label: shop, href: "/shop" }), products(k, "lantern", 3)]),
    part(k, t("مذكرات الضوء|Light journal|יומן האור"), [
      grid(k, 2, [stack(k, [picture(k, "lantern", 2, titles.lantern[1], { aspect: "4 / 5", radius: 160 }), H(k, t("هدوء، على مهل.|Quiet, in its own time.|שקט, בקצב שלו."), 3)], { style: { gap: 24 } }), stack(k, [EB(k, t("زاوية من الحكاية|A corner of the story|פינה מהסיפור")), H(k, t("للمكان اللي\nبتحب ترجعله.|For the place\nyou love coming back to.|למקום\nשאתם אוהבים לחזור אליו."), 2), T(k, note), picture(k, "lantern", 3, titles.lantern[2], { aspect: "16 / 9" }), BTN(k, shop, "/shop", "alt")], { style: { gap: 28, pad: [80, 24, 0, 24] }, phone: { pad: [0, 0, 0, 0] } })], { style: { gap: 64 } }),
    ], { tone: "surface" }),
    part(k, t("تفاصيل قبل الاختيار|Details before choosing|פרטים לפני הבחירה"), [
      row(k, [EB(k, t("نساعدك تختار|Helping you choose|עוזרים לכם לבחור")), H(k, t("اسأل عن التفاصيل.|Ask about the details.|שאלו על הפרטים."), 2)], { style: { justify: "between", margin: [0, 0, 36, 0] } }),
      el(k, "accordion", { single: true, look: "lines", items: [
        { q: t("أين أجد أبعاد القطعة؟|Where can I find the dimensions?|איפה מוצאים את המידות?"), a: t("التفاصيل المتاحة موجودة في صفحة كل قطعة. تواصل معنا لو حابب تتأكد من إشي معيّن.|Available details are on each item page. Contact us if you would like to check something specific.|הפרטים הזמינים מופיעים בעמוד של כל פריט. צרו קשר כדי לברר משהו מסוים.") },
        { q: t("كيف أتواصل مع المتجر؟|How do I contact the store?|איך יוצרים קשר עם החנות?"), a: t("افتح صفحة التواصل واكتب لنا سؤالك.|Open the contact page and send us your question.|פתחו את עמוד יצירת הקשר ושלחו לנו את השאלה שלכם.") },
      ] }),
    ]),
    part(k, t("رسالة من المتجر|A note from the store|פתק מהחנות"), [
      stack(k, [H(k, t("خلي لك ضوء قريب.|Keep a little light close.|שמרו אור קטן קרוב."), 2), T(k, t("تعرف على إضافات المجموعة وأخبار المتجر.|Discover collection additions and store news.|גלו תוספות לקולקציה וחדשות מהחנות.")), el(k, "form", { kind: "newsletter", title: t("رسائل المتجر|Store notes|עדכוני החנות") })], { style: { maxWidth: "640px", margin: [0, 0, 0, 0], gap: 28 } }),
    ], { tone: "surface", style: { pattern: { kind: "dots", color: "#efc384", size: 32, opacity: .1 } } }),
  ];
}

export const EXPERIMENTAL_TEMPLATES: Template[] = ([
  { id: "electronics-foundry", category: "electronics", name: t("مَصنع · تقني|Foundry · Technical|סדנה · טכנולוגי"), blurb: t("خطوط هندسية، ألوان صناعية وألواح صور تفاعلية.|Geometric lines, industrial colours and expanding image panels.|קווים גאומטריים, צבעים תעשייתיים ולוחות תמונה מתרחבים."), style: foundryStyle, tags: ["tech", "dark", "interactive", "experimental"], brand: t("فورم|FORM|פורם"), header: { kind: "minimal" }, footer: { kind: "columns", line: t("أفكار واضحة. تفاصيل تختارها.|Clear ideas. Details you choose.|רעיונות ברורים. פרטים לבחירתכם.") }, home: foundryHome },
  { id: "art-kinetic", category: "art", name: t("كينتيك · معرض حر|Kinetic · Open Gallery|קינטיק · גלריה פתוחה"), blurb: t("خط كبير، ألوان جريئة ومعرض يتفاعل مع اختيارك.|Oversized type, bold colours and a gallery that responds to your choices.|אותיות גדולות, צבעים נועזים וגלריה שמגיבה לבחירות שלכם."), style: kineticStyle, tags: ["art", "bold", "playful", "interactive", "experimental"], brand: t("شكل|FORME|צורה"), header: { kind: "bar" }, footer: { kind: "giant", line: t("مساحة للأشياء المختلفة.|Room for different things.|מקום לדברים שונים.") }, home: kineticHome },
  { id: "home-lantern", category: "home", name: t("فانوس · ليالي دافئة|Lantern · Warm Nights|פנס · לילות חמים"), blurb: t("أجواء ليلية، تفاصيل دافئة وفانوس ثلاثي الأبعاد قابل للتخصيص.|A night palette, warm details and a customisable 3D lantern.|צבעי לילה, פרטים חמים ופנס תלת ממדי להתאמה אישית."), style: lanternStyle, tags: ["home", "dark", "cinematic", "3d", "experimental"], brand: t("وهج|GLOW|זוהר"), header: { kind: "minimal" }, footer: { kind: "line", line: t("تفاصيل للبيت وللحظاتك.|Details for home and your moments.|פרטים לבית ולרגעים שלכם.") }, home: lanternHome },
] satisfies Template[]).map((template) => ({
  ...template,
  navigation: { menu: [shop, t("تفاصيل المجموعة|Collection details|פרטי הקולקציה"), t("تواصل معنا|Contact us|צרו קשר")], highlights: [template.name, template.blurb] },
}));
