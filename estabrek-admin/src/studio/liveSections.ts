/**
 * Forty ready sections, each built on one of the forty new drawn backgrounds (the shop's
 * pageTree/sceneCanvas.ts): occasions and offers, store kinds, openings and content. Every
 * word, picture, button, widget and the background itself stays editable in the studio.
 * Original compositions (ideas from common shop layouts, nothing copied); pictures are the
 * editor's own placeholders under /templates/<kind>/. Only type imports here, so the backend
 * tests can check every section with the same rules as a saved page.
 */
import type { PageTreeNode as N } from "../api/pages.api";
import type { Lang } from "../lib/lang";

type Ids = (prefix: string) => string;
type W = { ar: string; en: string; he: string };
/** "عربي|English|עברית" */
const w = (s: string): W => { const [ar, en, he] = s.split("|"); return { ar, en, he: he ?? en }; };

export type LiveGroup = "occasion" | "store" | "content";
export const LIVE_GROUPS: Array<[LiveGroup, W]> = [
  ["occasion", w("مناسبات وعروض بخلفيات حيّة|Occasions and offers, live backgrounds|אירועים ומבצעים, רקעים חיים")],
  ["store", w("أقسام لأنواع المتاجر بخلفيات حيّة|Store-kind sections, live backgrounds|מקטעים לסוגי חנויות, רקעים חיים")],
  ["content", w("افتتاحيات ومحتوى بخلفيات حيّة|Openings and content, live backgrounds|פתיחים ותוכן, רקעים חיים")],
];

const L = (kind: string, scene: string, group: LiveGroup, name: string) => ({ kind: `live-${kind}`, scene, group, name: w(name) });
export const LIVE_SECTIONS = [
  L("aurora", "aurora", "content", "افتتاحية الشفق|Aurora opening|פתיח זוהר"),
  L("lanterns", "lanterns", "occasion", "عروض ليالي رمضان|Ramadan nights offer|מבצעי לילות הרמדאן"),
  L("crescent", "crescent", "occasion", "تهنئة العيد ومختارات|Eid greeting and picks|ברכת חג ומבחר"),
  L("petals", "petals", "occasion", "مجموعة العرائس|Bridal collection|קולקציית כלות"),
  L("confetti", "confetti", "occasion", "التخفيضات الكبرى|The big sale|המבצע הגדול"),
  L("fireflies", "fireflies", "content", "حكايتنا بالأرقام|Our story in numbers|הסיפור שלנו במספרים"),
  L("bokeh", "bokeh", "occasion", "دليل الهدايا|Gift guide|מדריך מתנות"),
  L("sparkles", "sparkles", "occasion", "وصل حديثاً|New arrivals|הגיע עכשיו"),
  L("galaxy", "galaxy", "occasion", "إطلاق منتج جديد|New product launch|השקת מוצר חדש"),
  L("synthwave", "synthwave", "store", "عالم ألعاب ريترو|Retro gaming world|עולם גיימינג רטרו"),
  L("circuit", "circuit", "store", "مواصفات تقنية|Tech specs|מפרט טכני"),
  L("equalizer", "equalizer", "content", "بودكاست وحلقات|Podcast episodes|פרקי פודקאסט"),
  L("heartbeat", "heartbeat", "content", "صحة ولياقة بالأرقام|Health in numbers|בריאות במספרים"),
  L("dunes", "dunes", "store", "عطور الصحراء والعود|Desert oud perfumes|בושמי עוד מדבריים"),
  L("arabesque", "arabesque", "store", "حِرف تراثية|Heritage crafts|מלאכות מסורת"),
  L("honeycomb", "honeycomb", "store", "طبيعي وعضوي|Natural and organic|טבעי ואורגני"),
  L("lowpoly", "lowpoly", "content", "استوديو إبداعي|Creative studio|סטודיו יצירתי"),
  L("memphis", "memphis", "store", "عالم الأطفال|Kids' world|עולם הילדים"),
  L("shapes", "shapes", "content", "مزايا المتجر بشبكة|Store perks bento|יתרונות החנות ברשת"),
  L("weave", "weave", "store", "أقمشة وخامات|Fabrics and textures|בדים וטקסטורות"),
  L("dotwave", "dotwave", "content", "باقات واشتراكات|Plans and memberships|חבילות ומינויים"),
  L("topography", "topography", "store", "معدات المغامرة|Adventure gear|ציוד הרפתקאות"),
  L("mountains", "mountains", "content", "افتتاحية القمم مع بحث|Summit opening with search|פתיח פסגות עם חיפוש"),
  L("clouds", "clouds", "store", "راحة ونوم هادئ|Comfort and calm sleep|נוחות ושינה רגועה"),
  L("rain", "rain", "store", "قائمة يوم ماطر|Rainy day menu|תפריט ליום גשום"),
  L("smoke", "smoke", "store", "بخور ومباخر|Incense and burners|קטורת ומקטרות"),
  L("bubbles", "bubbles", "store", "نتائج العناية بالبشرة|Skincare results|תוצאות טיפוח"),
  L("lava", "lava", "store", "إصدار ريترو محدود|Limited retro drop|דרופ רטרו מוגבל"),
  L("silk", "silk", "store", "فخامة هادئة|Quiet luxury|יוקרה שקטה"),
  L("gems", "gems", "store", "مجوهرات تحت الضوء|Jewelry spotlight|תכשיטים בזרקור"),
  L("beams", "beams", "occasion", "ليلة الإطلاق|Launch night|ערב ההשקה"),
  L("tunnel", "tunnel", "occasion", "عرض اليوم فقط|Today-only flash offer|מבצע בזק להיום"),
  L("radar", "radar", "content", "توصيل سريع وتتبع|Fast delivery tracking|משלוח מהיר ומעקב"),
  L("helix", "helix", "store", "تركيبات مدروسة|Studied formulas|נוסחאות מבוססות"),
  L("orbits", "orbits", "content", "كل شي مترابط|Everything connected|הכול מחובר"),
  L("ripples", "ripples", "store", "سبا واسترخاء|Spa and calm|ספא ורוגע"),
  L("flow", "flow", "content", "النشرة البريدية|Newsletter sign-up|הרשמה לניוזלטר"),
  L("sunburst", "sunburst", "content", "تواصل معنا|Contact us|צרו קשר"),
  L("hearts", "hearts", "content", "جدار المراجعات|Reviews wall|קיר ביקורות"),
  L("leaves", "leaves", "occasion", "تشكيلة الخريف|Autumn collection|קולקציית הסתיו"),
] as const;
export type LiveKind = typeof LIVE_SECTIONS[number]["kind"];
export const isLiveKind = (kind: string): kind is LiveKind => LIVE_SECTIONS.some(s => s.kind === kind);

type Style = Record<string, unknown>;
type Paint = { bg: string; ink: string; accent: string; c1: string; c2: string; soft?: string };

/** A new section of `kind` in the language being edited (null for any other kind). */
export function makeLiveSection(kind: string, lang: Lang, ids: Ids): N | null {
  const def = LIVE_SECTIONS.find(s => s.kind === kind);
  if (!def) return null;
  const say = (s: string) => ({ [lang]: w(s)[lang] });
  const node = (type: string, props: Record<string, unknown>, base?: Style, extra?: { mobile?: Style; motion?: Record<string, unknown>; children?: N[] }): N => ({
    id: ids(type.slice(0, 5)), type, props,
    ...(base || extra?.mobile ? { style: { ...(base ? { base } : {}), ...(extra?.mobile ? { mobile: extra.mobile } : {}) } } : {}),
    ...(extra?.motion ? { motion: extra.motion } : {}),
    ...(extra?.children ? { children: extra.children } : {}),
  });
  const pic = (kindOf: string, n: number | "hero" | "story") => `/templates/${kindOf}/${typeof n === "number" ? `product-${n}` : n}.svg`;
  let p: Paint = { bg: "#ffffff", ink: "#111111", accent: "accent", c1: "accent", c2: "text" };

  /* ----- pieces */
  const eyebrow = (s: string, color?: string) => node("text", { text: say(s) }, { size: 13, weight: 700, letterSpacing: 3, caps: "upper", color: color ?? p.accent }, { motion: { enter: { kind: "fade", duration: .6 } } });
  const title = (s: string, size = 56, extra: Style = {}) => node("heading", { text: say(s), level: 2 }, { size, sizeMin: Math.max(28, Math.round(size * .55)), lineHeight: 1.08, weight: 800, balance: "balance", ...extra }, { mobile: { size: Math.min(size, 40) }, motion: { enter: { kind: "words", duration: .8, stagger: .06 } } });
  const sub = (s: string, size = 24) => node("heading", { text: say(s), level: 3 }, { size, lineHeight: 1.2, weight: 700 });
  const lead = (s: string, extra: Style = {}) => node("text", { text: say(s) }, { size: 18, lineHeight: 1.7, maxWidth: "620px", opacity: .86, ...extra }, { motion: { enter: { kind: "up", duration: .7, delay: .15, distance: 24 } } });
  const small = (s: string, extra: Style = {}) => node("text", { text: say(s) }, { size: 15, lineHeight: 1.6, opacity: .8, ...extra });
  const button = (s: string, href = "/shop", variant: "solid" | "outline" | "link" = "solid", extra: Style = {}) => node("button", { label: say(s), href, variant }, Object.keys(extra).length ? extra : undefined);
  const stack = (children: N[], base: Style = {}, mobile?: Style) => node("stack", {}, { gap: 20, ...base }, { children, mobile });
  const row = (children: N[], base: Style = {}) => node("stack", {}, { direction: "row", wrap: true, gap: 12, align: "center", ...base }, { children, mobile: { direction: "column", align: "stretch" } });
  const grid = (children: N[], columns: number, base: Style = {}, tablet?: number): N => ({ ...node("grid", {}, { columns, gap: 24, ...base }, { children }), style: { base: { columns, gap: 24, ...base }, ...(tablet ? { tablet: { columns: tablet } } : {}), mobile: { columns: 1 } } });
  // A button straight in a column keeps its own width (a column stretches what it holds).
  const own = (list: N[]) => list.map(n => (n.type === "button" ? row([n]) : n));
  const split = (a: N[], b: N[], base: Style = {}) => grid([stack(own(a), { justify: "center" }), stack(own(b), { justify: "center" })], 2, { gap: 48, align: "center", ...base });
  const img = (src: string, alt: string, base: Style = {}) => node("image", { src, alt: say(alt) }, { width: "100%", fit: "cover", radius: 24, aspect: "4 / 3", ...base }, { motion: { enter: { kind: "zoom-in", duration: .9 } } });
  const icon = (name: string, color?: string) => node("icon", { name }, { iconSize: 28, color: color ?? p.accent });
  const card = (children: N[], base: Style = {}) => stack(children, { gap: 12, pad: [28, 24, 28, 24], radius: 20, bg: p.soft ?? "#ffffff14", ...base });
  const stat = (num: string, label: string, base: Style = {}) => stack([node("heading", { text: { [lang]: num }, level: 3 }, { size: 44, weight: 800, lineHeight: 1, color: p.accent }, { motion: { enter: { kind: "count", duration: 1.4 } } }), small(label)], { gap: 6, ...base });
  const centred: Style = { textAlign: "center", align: "center" };
  const countdown = (until: string, look: "boxes" | "plain" = "boxes") => node("countdown", { until, look });
  const marquee = (items: string[], separator = "✦", base: Style = {}) => node("marquee", { items: items.map(say), speed: 28, pause: true, separator }, { size: 18, weight: 600, pad: [14, 0, 14, 0], ...base });
  const products = (source: "new" | "best", limit: number, layout: "grid" | "row", columns: number, cardLook = "lift") => node("products", { source, limit, layout, columns, card: cardLook });
  const testimonials = (items: Array<[string, string, string]>, layout: "grid" | "row" | "single", columns?: number) => node("testimonials", { items: items.map(([quote, name, role]) => ({ quote: say(quote), name: say(name), role: say(role), stars: 5 })), layout, ...(columns ? { columns } : {}) });
  const gallery = (items: Array<[string, string, string]>, layout: "grid" | "masonry" | "bento", extra: Record<string, unknown> = {}) => node("filterGallery", { items: items.map(([t, src, cat]) => ({ title: say(t), image: src, category: say(cat), href: "/shop", cta: say("شاهد|View|לצפייה") })), layout, columns: 3, gap: 20, hoverEffect: "zoom", lightbox: true, searchable: false, activation: "click", ...extra });
  const accordion = (items: Array<[string, string]>, look: "lines" | "cards" | "plus" = "plus") => node("accordion", { items: items.map(([q, a]) => ({ q: say(q), a: say(a) })), single: true, look });
  const tabs = (items: Array<[string, string, string?]>, look: "pills" | "underline" | "boxed" = "pills") => node("tabs", { items: items.map(([label, text, image]) => ({ label: say(label), text: say(text), ...(image ? { image } : {}) })), look });
  const hotspots = (src: string, alt: string, items: Array<[number, number, string, string]>) => node("hotspots", { src, alt: say(alt), items: items.map(([x, y, t, text]) => ({ x, y, title: say(t), text: say(text), href: "/shop" })) }, { width: "100%" });
  const schedule = (layout: "cards" | "table" | "timeline", items: Array<[string, string, string, string]>) => node("schedule", { layout, filterDays: false, showLocation: false, items: items.map(([day, time, t, text]) => ({ day: say(day), time, title: say(t), text: say(text) })) });

  let children: N[] = [];
  let style: Style = {};
  switch (def.kind) {
    case "live-aurora":
      p = { bg: "#070b1f", ink: "#eef2ff", accent: "#5eead4", c1: "#5eead4", c2: "#a78bfa" };
      style = { minHeight: "88vh", justify: "center", ...centred };
      children = [stack([
        eyebrow("مجموعة جديدة|New collection|קולקציה חדשה"),
        title("ضوء جديد لكل يوم|A new light for every day|אור חדש לכל יום", 76),
        lead("قطع مختارة بعناية، تصلك لباب البيت بسرعة.|Carefully chosen pieces, delivered to your door fast.|פריטים שנבחרו בקפידה, עד הבית במהירות."),
        row([button("تسوّق الآن|Shop now|לקנייה"), button("شاهد المجموعة|See the collection|לצפייה בקולקציה", "/shop", "outline")], { justify: "center" }),
      ], { ...centred, gap: 24, maxWidth: "860px" }),
      marquee(["شحن سريع|Fast shipping|משלוח מהיר", "إرجاع سهل|Easy returns|החזרה קלה", "دفع آمن|Secure payment|תשלום מאובטח", "دعم كل أيام الأسبوع|Support all week|תמיכה כל השבוע"], "✦", { opacity: .8 })];
      break;
    case "live-lanterns":
      p = { bg: "#0f2a2e", ink: "#fff7e6", accent: "#f5b84a", c1: "#f5b84a", c2: "#fff1cf" };
      style = { minHeight: "80vh", justify: "center", ...centred };
      children = [stack([
        eyebrow("رمضان كريم|Ramadan Kareem|רמדאן כרים"),
        title("سهرات أحلى بعروض أكبر|Sweeter nights, bigger offers|לילות מתוקים יותר, מבצעים גדולים יותר", 68),
        lead("خصومات خاصة كل ليلة حتى العيد، وتغليف هدايا مجاني.|Special discounts every night until Eid, with free gift wrapping.|הנחות מיוחדות בכל לילה עד החג, ועטיפת מתנה חינם."),
        countdown("2027-02-08T00:00"),
        button("اكتشف عروض رمضان|Explore Ramadan offers|לגלות את מבצעי הרמדאן"),
      ], { ...centred, gap: 26, maxWidth: "820px" })];
      break;
    case "live-crescent":
      p = { bg: "#121a3a", ink: "#f8f4ea", accent: "#ffe6a7", c1: "#ffe6a7", c2: "#fdf6e3" };
      children = [split([
        eyebrow("عيد سعيد|Happy Eid|חג שמח"),
        title("هدايا العيد جاهزة|Eid gifts are ready|מתנות החג מוכנות", 60),
        lead("تغليف هدايا مجاني وتوصيل قبل العيد لكل الطلبات.|Free gift wrapping and delivery before Eid on every order.|עטיפת מתנה חינם ומשלוח לפני החג בכל הזמנה."),
        button("تسوّق هدايا العيد|Shop Eid gifts|לקניית מתנות לחג"),
      ], [products("new", 4, "grid", 2, "soft")])];
      break;
    case "live-petals":
      p = { bg: "#fff5f7", ink: "#4a1d2f", accent: "#be185d", c1: "#f9a8d4", c2: "#fde2e4" };
      children = [split([img(pic("fashion", "story"), "فستان من مجموعة العرائس|A dress from the bridal collection|שמלה מקולקציית הכלות", { aspect: "4 / 5", radius: 32 })], [
        eyebrow("مجموعة العرائس|Bridal collection|קולקציית כלות"),
        title("لأجمل يوم في العمر|For the most beautiful day|ליום היפה ביותר", 58),
        lead("تصاميم ناعمة بخامات فاخرة، مع قياس وتعديل مجاني.|Soft designs in fine fabrics, with free fitting and alterations.|עיצובים רכים מבדים יוקרתיים, עם מדידה והתאמה חינם."),
        button("احجز موعد قياس|Book a fitting|קביעת מדידה", "/contact"),
        testimonials([["كان الفستان أحلى مما تخيّلت، والخدمة رائعة.|The dress was lovelier than I imagined, and the service was wonderful.|השמלה הייתה יפה ממה שדמיינתי, והשירות נפלא.", "ريم|Reem|רים", "عروس 2026|Bride 2026|כלה 2026"]], "single"),
      ])];
      break;
    case "live-confetti":
      p = { bg: "#fff7ed", ink: "#1f1235", accent: "#e11d48", c1: "#f43f5e", c2: "#facc15" };
      style = { ...centred };
      children = [stack([
        eyebrow("لفترة محدودة|Limited time|לזמן מוגבל"),
        title("حتى 50% خصم|Up to 50% off|עד 50% הנחה", 104, { weight: 900, fill: { color: "#f43f5e", to: "#7c3aed", angle: 90 } }),
        lead("على مئات المنتجات المختارة. الكمية محدودة، والعرض بينتهي قريباً.|On hundreds of chosen products. Stock is limited and the offer ends soon.|על מאות מוצרים נבחרים. המלאי מוגבל והמבצע מסתיים בקרוב."),
        countdown("2026-12-31T23:59", "plain"),
        row([button("تسوّق التخفيضات|Shop the sale|לקניות במבצע"), button("كل المنتجات|All products|כל המוצרים", "/shop", "outline")], { justify: "center" }),
      ], { ...centred, gap: 24 })];
      break;
    case "live-fireflies":
      p = { bg: "#0c1a12", ink: "#ecfdf5", accent: "#fde68a", c1: "#fde68a", c2: "#fef3c7" };
      children = [split([img(pic("home", "story"), "ورشتنا|Our workshop|הסדנה שלנו", { aspect: "1 / 1" })], [
        eyebrow("من البداية|From the start|מההתחלה"),
        title("صنعنا شيئاً نحبه، لتحبه أنت كمان|We made something we love, for you to love too|יצרנו משהו שאנחנו אוהבים, כדי שגם אתם תאהבו", 48),
        lead("بدأنا من فكرة صغيرة، واليوم نوصل لآلاف البيوت بنفس الشغف والاهتمام بالتفاصيل.|We started with a small idea; today we reach thousands of homes with the same care for detail.|התחלנו מרעיון קטן, והיום אנחנו מגיעים לאלפי בתים עם אותה תשומת לב לפרטים."),
        grid([stat("+12", "سنة خبرة|years of craft|שנות ניסיון"), stat("+40K", "عميل سعيد|happy customers|לקוחות מרוצים"), stat("4.9", "متوسط التقييم|average rating|דירוג ממוצע")], 3, { gap: 16 }),
      ])];
      break;
    case "live-bokeh":
      p = { bg: "#1c1022", ink: "#fff1f2", accent: "#fbbf24", c1: "#fbbf24", c2: "#f472b6" };
      style = { ...centred };
      children = [
        stack([eyebrow("هدايا لكل شخص|Gifts for everyone|מתנות לכולם"), title("لاقِ الهدية المثالية|Find the perfect gift|מצאו את המתנה המושלמת", 60), lead("اختر حسب الشخص أو المناسبة، ونحنا منغلّفها إلك.|Choose by person or occasion, and we'll wrap it for you.|בחרו לפי אדם או אירוע, ואנחנו נעטוף בשבילכם.")], { ...centred }),
        node("categories", { limit: 6, look: "circle", columns: 6 }),
        row([button("كل الهدايا|All gifts|כל המתנות", "/shop", "outline")], { justify: "center" }),
      ];
      break;
    case "live-sparkles":
      p = { bg: "#faf5ff", ink: "#2e1065", accent: "#7c3aed", c1: "#c084fc", c2: "#f59e0b" };
      children = [
        row([stack([eyebrow("وصل حديثاً|Just landed|הגיע עכשיו"), title("الجديد يلمع هالأسبوع|What's new shines this week|החדש נוצץ השבוע", 52)], { gap: 10 }), button("عرض الكل|View all|לכל המוצרים", "/shop", "outline")], { justify: "between", align: "end" }),
        products("new", 8, "row", 4),
      ];
      break;
    case "live-galaxy":
      p = { bg: "#05030f", ink: "#ede9fe", accent: "#c4b5fd", c1: "#818cf8", c2: "#f0abfc" };
      children = [split([
        eyebrow("قريباً|Coming soon|בקרוב"),
        title("الجيل الجديد وصل تقريباً|The next generation is almost here|הדור הבא כמעט כאן", 58),
        lead("سجّل اهتمامك لتكون أول من يطلبه بسعر الإطلاق.|Register your interest to be first to order at the launch price.|הירשמו כדי להיות הראשונים להזמין במחיר ההשקה."),
        countdown("2027-01-15T19:00"),
        button("سجّل اهتمامك|Register your interest|הרשמה לעדכונים", "/contact"),
      ], [node("model3d", { model: "phone", anim: { type: "float", speed: 1, amount: 1, trigger: "always" }, auto: .5, drag: true, tilt: true, floor: "disc", lights: { preset: "neon" } }, { width: "100%", height: "460px" })])];
      break;
    case "live-synthwave":
      p = { bg: "#12001f", ink: "#fdf4ff", accent: "#f472b6", c1: "#f472b6", c2: "#fbbf24" };
      style = { ...centred };
      children = [
        stack([eyebrow("Level up|Level up|Level up"), title("العب على طريقتك|Play your way|שחקו בדרך שלכם", 72, { weight: 900, fill: { color: "#f472b6", to: "#22d3ee", angle: 90 } }), lead("أجهزة، يدّات وإكسسوارات بأسعار تخلّيك تكمّل اللعب.|Consoles, controllers and gear at prices that keep you playing.|קונסולות, שלטים ואביזרים במחירים שישאירו אתכם במשחק.")], { ...centred }),
        gallery([["أجهزة الألعاب|Consoles|קונסולות", pic("gaming", 1), "أجهزة|Hardware|חומרה"], ["يدّات تحكم|Controllers|שלטים", pic("gaming", 2), "إكسسوارات|Gear|אביזרים"], ["سماعات|Headsets|אוזניות", pic("gaming", 3), "إكسسوارات|Gear|אביזרים"], ["كراسي ألعاب|Gaming chairs|כיסאות גיימינג", pic("gaming", 4), "أثاث|Furniture|ריהוט"], ["ألعاب جديدة|New games|משחקים חדשים", pic("gaming", 5), "ألعاب|Games|משחקים"]], "bento", { hoverEffect: "tilt" }),
      ];
      break;
    case "live-circuit": {
      p = { bg: "#04121a", ink: "#e0f2fe", accent: "#22d3ee", c1: "#22d3ee", c2: "#a3e635" };
      const yes = { state: "yes" }, no = { state: "no" };
      children = [split([img(pic("electronics", "hero"), "الجهاز من قريب|The device up close|המכשיר מקרוב", { radius: 16 })], [
        eyebrow("تقنية|Technology|טכנולוגיה"),
        title("قوة في كل تفصيلة|Power in every detail|עוצמה בכל פרט", 52),
        node("comparison", {
          stickyHeader: false,
          columns: [{ title: say("الأساسي|Standard|בסיסי") }, { title: say("الاحترافي|Pro|מקצועי"), highlight: true, href: "/shop", cta: say("اطلبه|Order|להזמנה") }],
          rows: [
            { label: say("بطارية تدوم يوماً كاملاً|All-day battery|סוללה ליום שלם"), values: [yes, yes] },
            { label: say("شاشة عالية الدقة|High-resolution screen|מסך ברזולוציה גבוהה"), values: [yes, yes] },
            { label: say("شحن سريع|Fast charging|טעינה מהירה"), values: [no, yes] },
            { label: say("الضمان|Warranty|אחריות"), values: [{ state: "text", text: say("سنة|1 year|שנה") }, { state: "text", text: say("سنتان|2 years|שנתיים") }] },
          ],
        }),
      ])];
      break;
    }
    case "live-equalizer":
      p = { bg: "#0b1120", ink: "#ecfeff", accent: "#34d399", c1: "#34d399", c2: "#60a5fa" };
      style = { ...centred };
      children = [
        stack([eyebrow("استمع الآن|Listen now|האזינו עכשיו"), title("حلقات جديدة كل أسبوع|New episodes every week|פרקים חדשים בכל שבוע", 60), lead("قصص، نصائح ولقاءات مع ناس بيحبوا اللي بيعملوه.|Stories, tips and talks with people who love what they do.|סיפורים, טיפים ושיחות עם אנשים שאוהבים את מה שהם עושים.")], { ...centred }),
        schedule("cards", [["الحلقة 12|Episode 12|פרק 12", "42:10", "كيف تختار هديتك|How to choose a gift|איך לבחור מתנה", "دليل سريع لكل المناسبات.|A quick guide for every occasion.|מדריך קצר לכל אירוע."], ["الحلقة 13|Episode 13|פרק 13", "38:45", "ورا الكواليس|Behind the scenes|מאחורי הקלעים", "يوم كامل مع فريقنا.|A full day with our team.|יום שלם עם הצוות שלנו."], ["الحلقة 14|Episode 14|פרק 14", "51:02", "أسئلتكم|Your questions|השאלות שלכם", "نجاوب على أكثر الأسئلة.|We answer the most asked questions.|עונים על השאלות הנפוצות."]]),
        row([button("كل الحلقات|All episodes|כל הפרקים", "/blog", "outline")], { justify: "center" }),
      ];
      break;
    case "live-heartbeat": {
      p = { bg: "#fff1f2", ink: "#4c0519", accent: "#e11d48", c1: "#f43f5e", c2: "#fb7185" };
      style = { ...centred };
      const box = { bg: "#ffffff", shadow: "md", ...centred };
      children = [
        stack([eyebrow("صحتك أولاً|Your health first|הבריאות שלכם קודם"), title("اهتم بنبضك كل يوم|Care for your pulse every day|דאגו לדופק שלכם בכל יום", 60)], { ...centred }),
        grid([card([stat("+250", "منتج صحي|healthy products|מוצרי בריאות")], box), card([stat("24/7", "استشارة|advice|ייעוץ")], box), card([stat("100%", "مكونات طبيعية|natural ingredients|רכיבים טבעיים")], box), card([stat("48h", "توصيل|delivery|משלוח")], box)], 4, { gap: 16 }, 2),
        row([button("ابدأ رحلتك|Start your journey|התחילו את המסע")], { justify: "center" }),
      ];
      break;
    }
    case "live-dunes":
      p = { bg: "#fbf3e4", ink: "#422006", accent: "#b45309", c1: "#d97706", c2: "#fcd34d" };
      children = [split([
        eyebrow("عطور شرقية|Oriental fragrances|בשמים מזרחיים"),
        title("رائحة الرمال الذهبية|The scent of golden sands|הניחוח של חולות הזהב", 60, { font: "serif" }),
        lead("عود معتّق وعنبر دافئ، مركّبة يدوياً لتدوم طول اليوم.|Aged oud and warm amber, blended by hand to last all day.|עוד מיושן וענבר חם, מורכבים ביד כדי להחזיק כל היום."),
        marquee(["عود|Oud|עוד", "عنبر|Amber|ענבר", "مسك|Musk|מושק", "زعفران|Saffron|זעפרן", "ورد طائفي|Taif rose|ורד טאיף"], "•", { size: 16 }),
        button("اكتشف العطور|Discover the fragrances|לגלות את הבשמים"),
      ], [img(pic("perfume", "hero"), "زجاجة عطر|A perfume bottle|בקבוק בושם", { aspect: "4 / 5", radius: 28 })])];
      break;
    case "live-arabesque": {
      p = { bg: "#fdf8f0", ink: "#3b2a1a", accent: "#0f766e", c1: "#b45309", c2: "#0f766e" };
      style = { ...centred };
      const frame = { bg: "#fffdf8", border: { width: 1, color: "#b4530940" }, radius: 4, ...centred };
      children = [
        stack([eyebrow("صناعة يدوية|Handmade|עבודת יד"), title("تراث يُصنع بحب|Heritage made with love|מורשת שנעשית באהבה", 60, { font: "serif" }), lead("كل قطعة بتحكي حكاية حرفيين ورثوا الصنعة جيل بعد جيل.|Each piece tells the story of artisans who inherited the craft generation after generation.|כל פריט מספר את סיפורם של אומנים שירשו את המלאכה דור אחר דור.")], { ...centred }),
        grid([
          card([icon("sparkle"), sub("تطريز يدوي|Hand embroidery|רקמת יד"), small("غرزة غرزة، بإتقان وصبر.|Stitch by stitch, with patience and skill.|תפר אחר תפר, בסבלנות ובמיומנות.")], frame),
          card([icon("shield"), sub("خامات أصيلة|Authentic materials|חומרים מקוריים"), small("نختارها من مصادر موثوقة.|Chosen from trusted sources.|נבחרים ממקורות אמינים.")], frame),
          card([icon("gift"), sub("هدية لها قيمة|A gift with meaning|מתנה עם משמעות"), small("تغليف تراثي جاهز للإهداء.|Heritage wrapping, ready to give.|עטיפה מסורתית, מוכנה למתנה.")], frame),
        ], 3),
      ];
      break;
    }
    case "live-honeycomb": {
      p = { bg: "#fffbeb", ink: "#451a03", accent: "#b45309", c1: "#f59e0b", c2: "#fbbf24" };
      const point = (s: string) => row([icon("check"), small(s, { opacity: 1 })], { gap: 10, wrap: false });
      children = [split([
        eyebrow("طبيعي 100%|100% natural|100% טבעי"),
        title("من الطبيعة إلى مائدتك|From nature to your table|מהטבע לשולחן שלכם", 56),
        lead("منتجات عضوية من مزارع محلية، طازجة وبدون إضافات.|Organic products from local farms, fresh and without additives.|מוצרים אורגניים מחוות מקומיות, טריים וללא תוספים."),
        grid([point("بدون مواد حافظة|No preservatives|ללא חומרים משמרים"), point("من مزارع محلية|From local farms|מחוות מקומיות"), point("تغليف صديق للبيئة|Eco-friendly packaging|אריזה ידידותית לסביבה"), point("توصيل طازج|Delivered fresh|משלוח טרי")], 2, { gap: 12 }),
        button("تسوّق الطبيعي|Shop natural|לקנייה טבעית"),
      ], [img(pic("food", "hero"), "منتجات طبيعية|Natural products|מוצרים טבעיים", { aspect: "1 / 1", radius: 999 })])];
      break;
    }
    case "live-lowpoly":
      p = { bg: "#0f0f1a", ink: "#eef2ff", accent: "#a5b4fc", c1: "#6366f1", c2: "#ec4899" };
      children = [
        stack([eyebrow("استوديو|Studio|סטודיו"), title("أفكار بتتحوّل لأعمال|Ideas that become work|רעיונות שהופכים לעבודות", 60), lead("مرّر على كل لوحة لتشوف القصة كاملة.|Hover over each panel to see the full story.|העבירו את העכבר על כל לוח כדי לראות את הסיפור המלא.")], { maxWidth: "720px" }),
        node("showcase", { items: [1, 2, 3, 4].map(n => ({ title: say(["هوية بصرية|Brand identity|זהות מותגית", "تصوير منتجات|Product photography|צילום מוצרים", "تغليف|Packaging|אריזה", "حملات|Campaigns|קמפיינים"][n - 1]), text: say("تفاصيل المشروع والنتيجة.|The project's details and the result.|פרטי הפרויקט והתוצאה."), image: pic("art", n), href: "/shop", cta: say("شاهد|View|לצפייה") })), layout: "horizontal", activation: "hover", initial: 0, ratio: 4, height: 460, duration: .6, overlay: .45 }),
      ];
      break;
    case "live-memphis":
      p = { bg: "#fefce8", ink: "#1e293b", accent: "#ea580c", c1: "#f97316", c2: "#06b6d4" };
      style = { ...centred };
      children = [
        stack([eyebrow("للصغار|For little ones|לקטנטנים"), title("ألعاب وملابس بتفرّح القلب|Toys and clothes that bring joy|צעצועים ובגדים שמשמחים את הלב", 64, { weight: 900 }), lead("ألوان مبهجة وخامات آمنة لكل الأعمار.|Cheerful colours and safe materials for every age.|צבעים שמחים וחומרים בטוחים לכל הגילים.")], { ...centred }),
        node("categories", { limit: 6, look: "pill", columns: 6 }),
        row([button("تسوّق للأطفال|Shop for kids|לקניות לילדים", "/shop", "solid", { radius: 999 }), button("أفكار هدايا|Gift ideas|רעיונות למתנות", "/shop", "outline", { radius: 999 })], { justify: "center" }),
      ];
      break;
    case "live-shapes": {
      p = { bg: "#f8fafc", ink: "#0f172a", accent: "#7c3aed", c1: "#8b5cf6", c2: "#14b8a6" };
      const perk = (ic: string, t: string, s: string, wide = false): N => {
        const c = card([icon(ic), sub(t, 22), small(s)], { bg: "#ffffff", shadow: "sm", border: { width: 1, color: "#e2e8f0" } });
        return wide ? { ...c, style: { base: { ...(c.style as { base: Style }).base, col: "span 2" }, mobile: { col: "span 1" } } } : c;
      };
      children = [
        stack([eyebrow("ليش تشتري منّا|Why shop with us|למה לקנות אצלנו"), title("كل شي سهل من أول كبسة|Easy from the very first click|הכול קל מהקליק הראשון", 56)], { ...centred }),
        grid([
          perk("truck", "شحن سريع|Fast shipping|משלוח מהיר", "توصيل خلال يومين لمعظم المناطق.|Delivery within two days to most areas.|משלוח תוך יומיים לרוב האזורים.", true),
          perk("return", "إرجاع سهل|Easy returns|החזרה קלה", "إرجاع خلال 30 يوماً.|Returns within 30 days.|החזרה תוך 30 יום."),
          perk("shield", "دفع آمن|Secure payment|תשלום מאובטח", "بطاقات ومحافظ رقمية.|Cards and digital wallets.|כרטיסים וארנקים דיגיטליים."),
          perk("gift", "تغليف هدايا|Gift wrapping|עטיפת מתנה", "مع بطاقة باسمك.|With a card in your name.|עם כרטיס בשמכם."),
          perk("whatsapp", "دعم على واتساب|WhatsApp support|תמיכה בוואטסאפ", "نرد بسرعة على كل سؤال.|We answer every question fast.|עונים מהר על כל שאלה.", true),
        ], 3, { gap: 16 }),
      ];
      break;
    }
    case "live-weave":
      p = { bg: "#faf6ef", ink: "#292524", accent: "#a16207", c1: "#a16207", c2: "#78350f" };
      children = [
        stack([eyebrow("الخامة تفرق|Fabric matters|הבד עושה את ההבדל"), title("أقمشة تحسّها قبل ما تلبسها|Fabrics you feel before you wear them|בדים שמרגישים עוד לפני שלובשים", 56), lead("اختار حسب الخامة: قطن، حرير أو كتان.|Choose by fabric: cotton, silk or linen.|בחרו לפי בד: כותנה, משי או פשתן.")], { maxWidth: "720px" }),
        gallery([1, 2, 3, 4, 5, 6].map(n => [["قميص|Shirt|חולצה", "فستان|Dress|שמלה", "شال|Scarf|צעיף", "بلوزة|Blouse|חולצה", "تنورة|Skirt|חצאית", "جاكيت|Jacket|ז'קט"][n - 1], pic("fashion", n), ["قطن|Cotton|כותנה", "حرير|Silk|משי", "كتان|Linen|פשתן"][n % 3]] as [string, string, string]), "masonry", { filters: true }),
      ];
      break;
    case "live-dotwave":
      p = { bg: "#f5f7ff", ink: "#1e1b4b", accent: "#4f46e5", c1: "#6366f1", c2: "#22d3ee" };
      style = { ...centred };
      children = [
        stack([eyebrow("اشتراكات|Memberships|מינויים"), title("اختار الباقة اللي بتناسبك|Choose the plan that fits you|בחרו את החבילה שמתאימה לכם", 56), lead("بدّل بين شهري وسنوي ووفّر أكثر.|Switch between monthly and yearly to save more.|עברו בין חודשי לשנתי וחסכו יותר.")], { ...centred }),
        node("pricing", { billing: true, initialBilling: "monthly", items: [
          { name: say("أساسي|Basic|בסיסי"), price: say("29 ₪|29 ₪|29 ₪"), period: say("شهرياً|/month|לחודש"), yearlyPrice: say("290 ₪|290 ₪|290 ₪"), yearlyPeriod: say("سنوياً|/year|לשנה"), features: say("توصيل مجاني لطلب واحد\nخصم 5%|Free delivery on one order\n5% off|משלוח חינם להזמנה אחת\n5% הנחה"), cta: say("اشترك|Subscribe|הרשמה"), href: "/contact" },
          { name: say("مميز|Plus|פלוס"), price: say("59 ₪|59 ₪|59 ₪"), period: say("شهرياً|/month|לחודש"), yearlyPrice: say("590 ₪|590 ₪|590 ₪"), yearlyPeriod: say("سنوياً|/year|לשנה"), features: say("توصيل مجاني دائماً\nخصم 10%\nهدية شهرية|Always free delivery\n10% off\nA monthly gift|משלוח חינם תמיד\n10% הנחה\nמתנה חודשית"), badge: say("الأكثر طلباً|Most popular|הכי פופולרי"), featured: true, cta: say("اشترك|Subscribe|הרשמה"), href: "/contact" },
          { name: say("احترافي|Pro|מקצועי"), price: say("99 ₪|99 ₪|99 ₪"), period: say("شهرياً|/month|לחודש"), yearlyPrice: say("990 ₪|990 ₪|990 ₪"), yearlyPeriod: say("سنوياً|/year|לשנה"), features: say("كل مزايا المميز\nخصم 20%\nدعم خاص|Everything in Plus\n20% off\nPriority support|כל מה שבפלוס\n20% הנחה\nתמיכה מועדפת"), cta: say("اشترك|Subscribe|הרשמה"), href: "/contact" },
        ] }),
      ];
      break;
    case "live-topography":
      p = { bg: "#f0fdf4", ink: "#052e16", accent: "#15803d", c1: "#16a34a", c2: "#84cc16" };
      children = [split([hotspots(pic("outdoor", "hero"), "معدات التخييم|Camping gear|ציוד קמפינג", [[28, 40, "خيمة خفيفة|Light tent|אוהל קל", "تنصب بدقيقتين.|Pitches in two minutes.|מוקם בשתי דקות."], [62, 58, "حقيبة ظهر|Backpack|תרמיל", "مقاومة للماء.|Water resistant.|עמיד במים."], [48, 76, "حذاء مشي|Hiking boots|נעלי הליכה", "ثبات على كل طريق.|Grip on every trail.|אחיזה בכל שביל."]])], [
        eyebrow("استكشف|Explore|לגלות"),
        title("جاهز لأي طريق|Ready for any trail|מוכנים לכל שביל", 58),
        lead("كبس على النقاط لتشوف كل قطعة، وجهّز رحلتك الجاية.|Tap the points to see each piece and get your next trip ready.|לחצו על הנקודות כדי לראות כל פריט ולהתכונן לטיול הבא."),
        button("تسوّق معدات المغامرة|Shop adventure gear|לקניית ציוד הרפתקאות"),
      ])];
      break;
    case "live-mountains":
      p = { bg: "#0f172a", ink: "#f8fafc", accent: "#cbd5e1", c1: "#94a3b8", c2: "#e2e8f0" };
      style = { minHeight: "82vh", justify: "center", ...centred };
      children = [stack([
        eyebrow("ابدأ من هون|Start here|מתחילים כאן"),
        title("القمة بتبلّش بخطوة|The summit starts with a step|הפסגה מתחילה בצעד", 80),
        lead("لاقِ اللي بدّك ياه بثواني.|Find what you need in seconds.|מצאו את מה שאתם צריכים בשניות."),
        node("search", { look: "glass", placeholder: say("ابحث عن منتج…|Search for a product…|חיפוש מוצר…"), button: say("بحث|Search|חיפוש") }, { width: "100%", maxWidth: "560px" }),
        row([button("الأكثر مبيعاً|Best sellers|רבי מכר"), button("وصل حديثاً|New in|חדש באתר", "/shop", "outline")], { justify: "center" }),
      ], { ...centred, gap: 24, maxWidth: "900px" })];
      break;
    case "live-clouds":
      p = { bg: "#e0f2fe", ink: "#0c4a6e", accent: "#0369a1", c1: "#ffffff", c2: "#bfdbfe" };
      children = [
        split([
          eyebrow("نوم أهدأ|Calmer sleep|שינה רגועה יותר"),
          title("كأنك نايم على غيمة|Like sleeping on a cloud|כמו לישון על ענן", 60),
          lead("مخدّات وأغطية ناعمة بتخلّي كل ليلة أريح.|Soft pillows and covers that make every night more restful.|כריות ושמיכות רכות שהופכות כל לילה לנינוח יותר."),
          button("تسوّق الراحة|Shop comfort|לקניית נוחות"),
        ], [img(pic("home", "hero"), "غرفة نوم هادئة|A calm bedroom|חדר שינה רגוע", { radius: 32 })]),
        testimonials([["أحسن نومة من سنين!|Best sleep in years!|השינה הכי טובה מזה שנים!", "سلمى|Salma|סלמה", "زبونة|Customer|לקוחה"], ["ناعمة وجودتها عالية.|Soft and high quality.|רך ואיכותי.", "يوسف|Yousef|יוסף", "زبون|Customer|לקוח"], ["التوصيل كان سريع جداً.|Delivery was very fast.|המשלוח היה מהיר מאוד.", "نور|Nour|נור", "زبونة|Customer|לקוחה"]], "row", 3),
      ];
      break;
    case "live-rain":
      p = { bg: "#1e293b", ink: "#f1f5f9", accent: "#93c5fd", c1: "#93c5fd", c2: "#cbd5e1" };
      children = [split([img(pic("coffee", "hero"), "فنجان قهوة|A cup of coffee|כוס קפה", { aspect: "4 / 5" })], [
        eyebrow("دافئ ولذيذ|Warm and tasty|חם וטעים"),
        title("مطر برّا، دفا جوّا|Rain outside, warmth inside|גשם בחוץ, חום בפנים", 58),
        tabs([["قهوة|Coffee|קפה", "محمّصة طازجة كل أسبوع، من حبوب مختارة.|Freshly roasted every week from chosen beans.|קלוי טרי בכל שבוע מפולים נבחרים.", pic("coffee", 1)], ["شاي|Tea|תה", "خلطات أعشاب دافئة ليوم ماطر.|Warm herbal blends for a rainy day.|תערובות צמחים חמות ליום גשום.", pic("coffee", 2)], ["حلويات|Sweets|מתוקים", "مخبوزات طازجة بتحلّي المزاج.|Fresh bakes to sweeten the mood.|מאפים טריים שממתיקים את מצב הרוח.", pic("coffee", 3)]]),
      ])];
      break;
    case "live-smoke": {
      p = { bg: "#1c1917", ink: "#fafaf9", accent: "#d6d3d1", c1: "#a8a29e", c2: "#e7e5e4" };
      style = { ...centred };
      const item = (n: number, name: string, price: string) => card([img(pic("perfume", n), name, { aspect: "1 / 1", radius: 16 }), sub(name, 20), small(price, { opacity: .7 }), button("أضف للسلة|Add to cart|הוספה לסל", "/shop", "link")], { bg: "#ffffff0d", border: { width: 1, color: "#ffffff1f" }, ...centred });
      children = [
        stack([eyebrow("بخور ومباخر|Incense and burners|קטורת ומקטרות"), title("عبق بيملأ البيت|A fragrance that fills the home|ניחוח שממלא את הבית", 58, { font: "serif" })], { ...centred }),
        grid([item(1, "بخور العود|Oud incense|קטורת עוד", "120 ₪"), item(2, "مبخرة نحاس|Brass burner|מקטר נחושת", "180 ₪"), item(3, "دخون الورد|Rose bakhoor|בחור ורדים", "95 ₪")], 3),
      ];
      break;
    }
    case "live-bubbles":
      p = { bg: "#ecfeff", ink: "#164e63", accent: "#0e7490", c1: "#67e8f9", c2: "#f0abfc" };
      children = [split([node("beforeAfter", { before: pic("beauty", 1), after: pic("beauty", 2), beforeLabel: say("قبل|Before|לפני"), afterLabel: say("بعد|After|אחרי"), start: 50 }, { width: "100%", height: "420px", radius: 24 })], [
        eyebrow("عناية بالبشرة|Skincare|טיפוח העור"),
        title("بشرة أنعم خلال 4 أسابيع|Softer skin in 4 weeks|עור רך יותר בתוך 4 שבועות", 54),
        accordion([["لأي نوع بشرة؟|For which skin type?|לאיזה סוג עור?", "مناسب لكل أنواع البشرة، حتى الحساسة.|Suitable for all skin types, even sensitive.|מתאים לכל סוגי העור, גם רגיש."], ["كيف أستعمله؟|How do I use it?|איך משתמשים?", "مرتين يومياً على بشرة نظيفة.|Twice a day on clean skin.|פעמיים ביום על עור נקי."], ["متى بتبيّن النتيجة؟|When will I see results?|מתי רואים תוצאות?", "خلال أسبوعين لأربعة أسابيع.|Within two to four weeks.|תוך שבועיים עד ארבעה שבועות."]]),
      ])];
      break;
    case "live-lava":
      p = { bg: "#2a0e2e", ink: "#fff7ed", accent: "#fb923c", c1: "#fb923c", c2: "#f472b6" };
      style = { ...centred };
      children = [
        stack([eyebrow("إصدار محدود|Limited drop|דרופ מוגבל"), title("ريترو رجع، وبأحلى شكل|Retro is back, better than ever|הרטרו חזר, טוב מתמיד", 64, { weight: 900 })], { ...centred }),
        node("slider", { effect: "coverflow", zoom: 1.05, loop: true, arrows: true, dots: true, progress: true, aspect: "4 / 3", slides: [1, 2, 3, 4].map(n => ({ src: pic("shoes", n), kind: "image", alt: say("حذاء ريترو|Retro shoe|נעל רטרו"), title: say(`موديل ${n}|Model ${n}|דגם ${n}`), cta: say("اطلبه|Order it|להזמנה"), href: "/shop" })) }, { width: "100%" }),
        row([button("تسوّق الإصدار|Shop the drop|לקניית הדרופ")], { justify: "center" }),
      ];
      break;
    case "live-silk":
      p = { bg: "#111111", ink: "#f5efe6", accent: "#d6b98c", c1: "#d6b98c", c2: "#f5e6c8" };
      style = { minHeight: "70vh", justify: "center", ...centred };
      children = [stack([
        eyebrow("Maison|Maison|Maison", "#d6b98c"),
        title("الفخامة في البساطة|Luxury lies in simplicity|היוקרה שבפשטות", 66, { font: "serif", weight: 400, letterSpacing: 1 }),
        lead("قطع قليلة، مصنوعة لتعيش معك سنين.|Few pieces, made to stay with you for years.|מעט פריטים, שנעשו להישאר אתכם שנים."),
        button("اكتشف المجموعة|Discover the collection|לגלות את הקולקציה", "/shop", "outline"),
        node("divider", {}, { width: "120px", opacity: .4 }),
        row([small("صنع يدوي|Handmade|עבודת יד"), small("خامات نادرة|Rare materials|חומרים נדירים"), small("إصدار محدود|Limited edition|מהדורה מוגבלת")], { justify: "center", gap: 32 }),
      ], { ...centred, gap: 26, maxWidth: "760px" })];
      break;
    case "live-gems":
      p = { bg: "#1e1b2e", ink: "#faf5ff", accent: "#e9d5ff", c1: "#e9d5ff", c2: "#fef9c3" };
      children = [split([
        eyebrow("مجوهرات|Jewelry|תכשיטים"),
        title("لمعة بتدوم للأبد|A sparkle that lasts forever|ברק שנשאר לנצח", 60, { font: "serif" }),
        lead("ذهب وفضة وأحجار مختارة، مع شهادة جودة لكل قطعة.|Gold, silver and chosen stones, with a quality certificate for every piece.|זהב, כסף ואבנים נבחרות, עם תעודת איכות לכל פריט."),
        button("تسوّق المجوهرات|Shop jewelry|לקניית תכשיטים"),
      ], [hotspots(pic("jewelry", "hero"), "مجموعة مجوهرات|A jewelry set|סט תכשיטים", [[34, 38, "خاتم|Ring|טבעת", "ذهب عيار 18.|18k gold.|זהב 18 קראט."], [58, 30, "عقد|Necklace|שרשרת", "حجر طبيعي.|Natural stone.|אבן טבעית."], [70, 64, "أقراط|Earrings|עגילים", "فضة نقية.|Pure silver.|כסף טהור."]])])];
      break;
    case "live-beams":
      p = { bg: "#0a0a14", ink: "#fafafa", accent: "#f0abfc", c1: "#f0abfc", c2: "#93c5fd" };
      style = { ...centred };
      children = [
        stack([eyebrow("حدث حصري|Exclusive event|אירוע בלעדי"), title("ليلة الإطلاق الكبرى|The grand launch night|ערב ההשקה הגדול", 72), countdown("2027-01-15T19:00")], { ...centred, gap: 22 }),
        schedule("timeline", [["الليلة|Tonight|הערב", "19:00", "الاستقبال|Welcome|קבלת פנים", "مشروبات وموسيقى.|Drinks and music.|משקאות ומוזיקה."], ["الليلة|Tonight|הערב", "20:00", "الكشف عن المجموعة|The reveal|החשיפה", "أول نظرة على الجديد.|A first look at what's new.|מבט ראשון על החדש."], ["الليلة|Tonight|הערב", "21:00", "تسوّق حصري|Exclusive shopping|קנייה בלעדית", "أسعار خاصة للحضور.|Special prices for guests.|מחירים מיוחדים לאורחים."]]),
        row([button("احجز مقعدك|Reserve your seat|שריינו מקום", "/contact")], { justify: "center" }),
      ];
      break;
    case "live-tunnel":
      p = { bg: "#020617", ink: "#f0f9ff", accent: "#22d3ee", c1: "#22d3ee", c2: "#e879f9" };
      style = { minHeight: "76vh", justify: "center", ...centred };
      children = [stack([
        eyebrow("عرض خاطف|Flash offer|מבצע בזק"),
        title("بس اليوم|Today only|רק היום", 120, { weight: 900, fill: { color: "#22d3ee", to: "#e879f9", angle: 90 } }),
        lead("خصم إضافي 20% على كل شي بالسلة، لحد نص الليل.|An extra 20% off everything in your cart, until midnight.|20% הנחה נוספת על כל מה שבסל, עד חצות."),
        button("استغل العرض|Grab the offer|לניצול המבצע"),
      ], { ...centred, gap: 22 }), marquee(["خصم 20%|20% off|20% הנחה", "بس اليوم|Today only|רק היום", "توصيل مجاني|Free delivery|משלוח חינם"], "⚡", { size: 22, weight: 800 })];
      break;
    case "live-radar": {
      p = { bg: "#04150c", ink: "#ecfdf5", accent: "#4ade80", c1: "#4ade80", c2: "#bbf7d0" };
      const step = (n: string, t: string, s: string) => stack([node("heading", { text: { [lang]: n }, level: 3 }, { size: 36, weight: 800, color: p.accent, font: "mono" }), sub(t, 20), small(s)], { gap: 8 });
      children = [split([
        eyebrow("توصيل سريع|Fast delivery|משלוח מהיר"),
        title("طلبك على الطريق|Your order is on its way|ההזמנה בדרך אליכם", 56),
        grid([step("01", "اطلب|Order|מזמינים", "بثواني من موبايلك.|In seconds from your phone.|בשניות מהטלפון."), step("02", "نجهّز|We pack|אורזים", "بنفس اليوم.|The same day.|באותו יום."), step("03", "نوصّل|We deliver|מוסרים", "لباب بيتك.|To your door.|עד הדלת.")], 3, { gap: 16 }),
      ], [node("map", { query: say("الناصرة|Nazareth|נצרת")[lang] ?? "Nazareth", zoom: 12, label: say("منطقة التوصيل|Delivery area|אזור המשלוח") }, { width: "100%", height: "380px", radius: 20 })])];
      break;
    }
    case "live-helix":
      p = { bg: "#f0f9ff", ink: "#0c4a6e", accent: "#0284c7", c1: "#38bdf8", c2: "#a78bfa" };
      children = [split([
        eyebrow("علم وعناية|Science and care|מדע וטיפוח"),
        title("مكوّنات مدروسة بدقة|Precisely studied ingredients|רכיבים שנחקרו בקפידה", 54),
        tabs([["فيتامينات|Vitamins|ויטמינים", "جرعات يومية متوازنة.|Balanced daily doses.|מינונים יומיים מאוזנים."], ["معادن|Minerals|מינרלים", "لطاقة تدوم طول اليوم.|For energy that lasts all day.|לאנרגיה שנמשכת כל היום."], ["أعشاب|Herbs|צמחים", "مستخلصات طبيعية مختارة.|Chosen natural extracts.|תמציות טבעיות נבחרות."]], "underline"),
      ], [node("chart", { kind: "donut", showValues: true, label: say("تركيبة المنتج|The formula|הנוסחה"), items: [{ label: say("فيتامينات|Vitamins|ויטמינים"), value: 45, color: "#38bdf8" }, { label: say("معادن|Minerals|מינרלים"), value: 30, color: "#a78bfa" }, { label: say("أعشاب|Herbs|צמחים"), value: 25, color: "#34d399" }] })])];
      break;
    case "live-orbits": {
      p = { bg: "#0b0b1a", ink: "#ede9fe", accent: "#fcd34d", c1: "#a78bfa", c2: "#fcd34d" };
      style = { ...centred };
      const glass = { bg: "#ffffff0f", backdrop: { blur: 14 }, border: { width: 1, color: "#ffffff26" }, ...centred };
      children = [
        stack([eyebrow("منظومة واحدة|One system|מערכת אחת"), title("كل شي مترابط لراحتك|Everything connected for you|הכול מחובר בשבילכם", 58), lead("الطلب والدفع والتوصيل والدعم، كلهم بمكان واحد.|Ordering, payment, delivery and support, all in one place.|הזמנה, תשלום, משלוח ותמיכה, הכול במקום אחד.")], { ...centred }),
        grid([card([icon("bag"), sub("طلب سهل|Easy ordering|הזמנה קלה", 20)], glass), card([icon("shield"), sub("دفع آمن|Secure payment|תשלום מאובטח", 20)], glass), card([icon("truck"), sub("توصيل متتبَّع|Tracked delivery|משלוח במעקב", 20)], glass), card([icon("whatsapp"), sub("دعم فوري|Instant support|תמיכה מיידית", 20)], glass)], 4, { gap: 16 }, 2),
      ];
      break;
    }
    case "live-ripples":
      p = { bg: "#f0fdfa", ink: "#134e4a", accent: "#0f766e", c1: "#5eead4", c2: "#99f6e4" };
      children = [split([
        eyebrow("سبا|Spa|ספא"),
        title("لحظة هدوء إلك|A calm moment for you|רגע של שקט בשבילכם", 58),
        lead("جلسات استرخاء وعناية بأيدي مختصين.|Relaxation and care sessions by specialists.|טיפולי רגיעה וטיפוח בידי מומחים."),
        button("احجز جلستك|Book your session|הזמינו טיפול", "/contact"),
      ], [accordion([["مساج استرخاء|Relaxing massage|עיסוי מרגיע", "60 دقيقة لتخفيف التوتر.|60 minutes to ease tension.|60 דקות להפגת מתחים."], ["عناية بالوجه|Facial care|טיפול פנים", "تنظيف عميق وترطيب.|Deep cleansing and hydration.|ניקוי עמוק ולחות."], ["حمّام بخار|Steam bath|אמבט אדים", "دفا يريّح الجسم.|Warmth that relaxes the body.|חום שמרגיע את הגוף."], ["باقة الأصدقاء|Friends package|חבילת חברים", "جلسة لشخصين بسعر خاص.|A session for two at a special price.|טיפול לשניים במחיר מיוחד."]], "cards")])];
      break;
    case "live-flow":
      p = { bg: "#0f172a", ink: "#f8fafc", accent: "#a5b4fc", c1: "#818cf8", c2: "#2dd4bf" };
      style = { ...centred };
      children = [stack([
        eyebrow("النشرة البريدية|Newsletter|ניוזלטר"),
        title("خلّيك أول من يعرف|Be the first to know|היו הראשונים לדעת", 52),
        lead("عروض خاصة وأخبار المنتجات الجديدة، مرة بالأسبوع وبس.|Special offers and new product news, once a week only.|מבצעים מיוחדים וחדשות על מוצרים חדשים, פעם בשבוע בלבד."),
        node("form", { kind: "newsletter" }, { width: "100%" }),
      ], { ...centred, gap: 18, maxWidth: "640px", pad: [44, 32, 44, 32], radius: 28, bg: "#ffffff0d", backdrop: { blur: 18 }, border: { width: 1, color: "#ffffff26" } })];
      break;
    case "live-sunburst": {
      p = { bg: "#fff7ed", ink: "#431407", accent: "#c2410c", c1: "#fb923c", c2: "#fde68a" };
      const reach = (ic: string, s: string) => row([icon(ic), small(s, { opacity: 1, weight: 600 })], { gap: 10, wrap: false });
      children = [split([
        eyebrow("تواصل معنا|Contact us|צרו קשר"),
        title("نحنا هون لنساعدك|We're here to help|אנחנו כאן לעזור", 56),
        lead("اسألنا عن أي منتج أو طلب، ومنرد عليك بأسرع وقت.|Ask us about any product or order and we'll answer as soon as we can.|שאלו אותנו על כל מוצר או הזמנה ונענה בהקדם."),
        stack([reach("phone", "اتصل بنا|Call us|התקשרו אלינו"), reach("whatsapp", "راسلنا على واتساب|Message us on WhatsApp|כתבו לנו בוואטסאפ"), reach("mail", "راسلنا بالبريد|Email us|שלחו לנו מייל")], { gap: 12 }),
      ], [node("form", { kind: "contact" }, { width: "100%", pad: [28, 24, 28, 24], radius: 24, bg: "#ffffff", shadow: "md" })])];
      break;
    }
    case "live-hearts":
      p = { bg: "#fff1f2", ink: "#4c0519", accent: "#e11d48", c1: "#fb7185", c2: "#fda4af" };
      style = { ...centred };
      children = [
        stack([eyebrow("بكلمات عملائنا|In our customers' words|במילים של הלקוחות"), title("حب حقيقي من ناس حقيقيين|Real love from real people|אהבה אמיתית מאנשים אמיתיים", 56)], { ...centred }),
        testimonials([
          ["الجودة فوق الممتاز والتغليف بيجنن.|Excellent quality and lovely packaging.|איכות מעולה ואריזה מקסימה.", "لينا|Lina|לינה", "زبونة دائمة|Regular customer|לקוחה קבועה"],
          ["وصل الطلب بيوم واحد!|The order arrived in one day!|ההזמנה הגיעה תוך יום!", "أحمد|Ahmad|אחמד", "زبون|Customer|לקוח"],
          ["خدمة العملاء لطيفة وسريعة.|Kind and quick customer service.|שירות לקוחות נחמד ומהיר.", "مريم|Maryam|מרים", "زبونة|Customer|לקוחה"],
          ["صار متجري المفضّل.|It's become my favourite shop.|זו החנות האהובה עליי.", "سامي|Sami|סאמי", "زبون|Customer|לקוח"],
          ["المقاسات مضبوطة تماماً.|The sizes are spot on.|המידות מדויקות לגמרי.", "هدى|Huda|הודא", "زبونة|Customer|לקוחה"],
          ["هدية مثالية لأمي.|A perfect gift for my mother.|מתנה מושלמת לאמא שלי.", "كريم|Karim|כרים", "زبون|Customer|לקוח"],
        ], "grid", 3),
      ];
      break;
    case "live-leaves":
      p = { bg: "#fff7ed", ink: "#431407", accent: "#c2410c", c1: "#ea580c", c2: "#ca8a04" };
      children = [
        row([stack([eyebrow("موسم جديد|New season|עונה חדשה"), title("ألوان الخريف وصلت|Autumn colours have arrived|צבעי הסתיו הגיעו", 56)], { gap: 10 }), button("تسوّق الخريف|Shop autumn|לקניות סתיו", "/shop", "outline")], { justify: "between", align: "end" }),
        gallery([1, 2, 3, 4, 5, 6].map(n => [["معطف|Coat|מעיל", "كنزة|Sweater|סוודר", "حذاء|Boots|מגפיים", "شال|Scarf|צעיף", "حقيبة|Bag|תיק", "قبعة|Hat|כובע"][n - 1], pic(n % 2 ? "fashion" : "shoes", n), n % 2 ? "ملابس|Clothing|ביגוד" : "أحذية|Shoes|נעליים"] as [string, string, string]), "grid", { filters: true, hoverEffect: "zoom" }),
      ];
      break;
    default:
      return null;
  }
  // A contained section lays its words out in an inner box that doesn't take the section's own gap or
  // centring, so everything sits in one spaced holder; a tall opening keeps its height there, centred.
  const { minHeight, textAlign } = style as { minHeight?: string; textAlign?: string };
  const tall = typeof minHeight === "string" && /^\d+vh$/.test(minHeight) ? `${Math.round(parseInt(minHeight, 10) * .8)}vh` : undefined;
  const holder = stack(children, { gap: 40, width: "100%", ...(tall ? { minHeight: tall, justify: "center" } : {}) }, { gap: 28 });
  return {
    id: ids("sec"), type: "section", name: def.name[lang],
    props: { contained: true, scene: { kind: def.scene, color: p.c1, secondary: p.c2, amount: 40, speed: 1, intensity: 1, interactive: true } },
    style: { base: { pad: [104, 24, 104, 24], bg: p.bg, color: p.ink, ...(textAlign ? { textAlign } : {}) }, mobile: { pad: [64, 16, 64, 16] } },
    children: [holder],
  };
}
