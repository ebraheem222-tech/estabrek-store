/**
 * Premium sections in the section DNA (plan 3.9a of docs/themes-library-plan.ar.md): the theme library's tricks that
 * now live in the editor, put to work in sections a store uses as they are. WebGL and live grounds in the store's own
 * colours (aurora, plasma, a gem, the earth with its flights…), letters that answer the pointer or flip like a
 * station's board, pictures left along the pointer's way, cards on a ring or a helix, a cube, a book, a phone turning
 * with the scroll, a deck that fans out, columns that drift, a tunnel, a timeline that draws itself, a coupon to
 * scratch, a game of pairs, a light that shows a second picture, and the charts (flights, sunburst, 3D bars, flows).
 * Each kind is layouts worn in the looks that suit them, built from the kit's pieces like every DNA section.
 */
import { COLS, GRID, ICON, IMG, STACK, pic, type Ctx, type N } from "../build";
import { RUNNING, STATS, w, type IconName, type W } from "../words";
import { button, buttons, card, el, head, isLight, over, picture, rule, say, section, storePanel, text } from "./kit";
import type { Look } from "./looks";
import type { Layout } from "./heroes";

type S = Record<string, unknown>;

/* ---------------------------------------------------------------- words */

const M = {
  move: w("حرّكوا الماوس فوقها", "Move the pointer over it", "הזיזו את העכבר מעליה"),
  reach: w("منوصل لكل مكان", "We deliver everywhere", "אנחנו מגיעים לכל מקום"),
  reachSub: w("طلبكم بيطير من عنا لعندكم، وبتتابعوه خطوة خطوة.", "Your order flies from us to you, and you follow it step by step.", "ההזמנה שלכם טסה מאיתנו אליכם, ואתם עוקבים צעד אחר צעד."),
  ring: w("كل قطعة بحكاية", "Every piece has a story", "לכל פריט יש סיפור"),
  ringSub: w("لفّوا الحلقة بإيدكم وشوفوا المجموعة من كل الجهات.", "Turn the ring by hand and see the collection from every side.", "סובבו את הטבעת ביד וראו את הקולקציה מכל הכיוונים."),
  pieces: [w("القطعة الأولى", "The first piece", "הפריט הראשון"), w("الأكثر طلباً", "Most wanted", "הכי מבוקש"), w("جديد", "New in", "חדש"), w("إصدار محدود", "Limited", "מהדורה מוגבלת"), w("المفضّلة", "The favourite", "המועדף"), w("للهدايا", "For gifts", "למתנות"), w("الأساسية", "The essential", "הבסיסי"), w("الموسم", "The season", "העונה")],
  fan: w("المجموعة بتنفرد قدامكم", "The collection spreads out before you", "הקולקציה נפרשת לפניכם"),
  fanSub: w("مرّروا لتحت وشوفوا كل القطع تاخد مكانها.", "Scroll down and watch each piece find its place.", "גללו למטה וראו כל פריט מוצא את מקומו."),
  drift: w("تفاصيل بتتحرّك معكم", "Details that move with you", "פרטים שזזים איתכם"),
  depth: w("ادخلوا لجوّا المجموعة", "Step into the collection", "היכנסו לתוך הקולקציה"),
  depthCards: [w("الخامة", "The material", "החומר"), w("القصّة", "The cut", "הגזרה"), w("اللون", "The colour", "הצבע"), w("اللمسة الأخيرة", "The last touch", "הנגיעה האחרונה"), w("لإلكم", "For you", "בשבילכם")],
  dive: w("لإلكم", "For you", "בשבילכם"),
  diveSub: w("كل شي بنعمله بيبلّش بسؤال وحيد: شو بيحبّوا؟", "Everything we make starts with one question: what will they love?", "כל מה שאנחנו עושים מתחיל בשאלה אחת: מה הם יאהבו?"),
  timeline: w("طريقنا لهون", "How we got here", "הדרך שלנו לכאן"),
  steps: [
    [w("2018", "2018", "2018"), w("الفكرة", "The idea", "הרעיון"), w("بلّشنا من طاولة صغيرة وحلم كبير.", "We started at a small table with a big dream.", "התחלנו בשולחן קטן עם חלום גדול.")],
    [w("2020", "2020", "2020"), w("أول محل", "The first shop", "החנות הראשונה"), w("فتحنا بابنا لأول زبون.", "We opened our door to the first customer.", "פתחנו את הדלת ללקוח הראשון.")],
    [w("2023", "2023", "2023"), w("أونلاين", "Online", "אונליין"), w("صرنا نوصل لكل البلد.", "We began delivering across the country.", "התחלנו לשלוח לכל הארץ.")],
    [w("اليوم", "Today", "היום"), w("إنتو", "You", "אתם"), w("آلاف الزباين، ونفس الحب.", "Thousands of customers, the same love.", "אלפי לקוחות, אותה אהבה.")],
  ] as Array<[W, W, W]>,
  book: w("حكايتنا بكتاب", "Our story, as a book", "הסיפור שלנו, כספר"),
  bookPages: [
    [w("الفصل الأول", "Chapter one", "פרק ראשון"), w("كل شي بلّش بحب بسيط.", "It all began with a simple love.", "הכל התחיל באהבה פשוטה.")],
    [w("الصنعة", "The craft", "המלאכה"), w("بنختار كل خامة بإيدنا.", "We choose every material by hand.", "אנחנו בוחרים כל חומר ביד.")],
    [w("الناس", "The people", "האנשים"), w("فريق صغير بقلب كبير.", "A small team with a big heart.", "צוות קטן עם לב גדול.")],
    [w("إنتو", "You", "אתם"), w("كل طلب بيكمّل الحكاية.", "Every order carries the story on.", "כל הזמנה ממשיכה את הסיפור.")],
  ] as Array<[W, W]>,
  helix: w("اللي بيميّزنا", "What sets us apart", "מה שמייחד אותנו"),
  values: [w("خامات منقّاة", "Chosen materials", "חומרים נבחרים"), w("صنعة بإيد", "Made by hand", "עבודת יד"), w("توصيل سريع", "Fast delivery", "משלוח מהיר"), w("إرجاع سهل", "Easy returns", "החזרה קלה"), w("تغليف هدية", "Gift wrapping", "אריזת מתנה"), w("دعم حقيقي", "Real support", "תמיכה אמיתית"), w("أسعار عادلة", "Fair prices", "מחירים הוגנים"), w("ضمان", "A guarantee", "אחריות")],
  cube: w("المجموعة من كل الجهات", "The collection from every side", "הקולקציה מכל הצדדים"),
  cubeSub: w("اسحبوا المكعّب ليلف، وكل وجه مجموعة.", "Drag the cube round: every face is a collection.", "גררו את הקובייה: כל פאה היא קולקציה."),
  phone: w("تسوّقوا من موبايلكم", "Shop from your phone", "קנו מהטלפון"),
  phoneSub: w("اختاروا، ادفعوا، وتابعوا الطلب، كلّه بدقيقة.", "Choose, pay and follow the order, all in a minute.", "בחרו, שלמו ועקבו אחר ההזמנה, הכל בדקה."),
  screens: [
    [w("اختاروا", "Choose", "בחרו"), w("القطعة اللي بتحبّوها", "The piece you love", "הפריט שאתם אוהבים")],
    [w("ادفعوا", "Pay", "שלמו"), w("بطاقة أو عند الباب", "By card or at the door", "בכרטיס או בדלת")],
    [w("استلموا", "Receive", "קבלו"), w("على باب البيت", "At your door", "עד הדלת")],
  ] as Array<[W, W]>,
  scratch: w("اخدشوا واربحوا", "Scratch and win", "גרדו וזכו"),
  scratchSub: w("تحت الغطا هدية إلكم. الخصم بينضاف للسلة لحاله.", "A gift for you hides under the cover. The discount goes into your bag by itself.", "מתנה בשבילכם מתחת לכיסוי. ההנחה נכנסת לסל לבד."),
  prize: w("خصم 15٪", "15% off", "15% הנחה"),
  cover: w("اخدشوا هون", "Scratch here", "גרדו כאן"),
  pairs: w("لاقوا الأزواج", "Find the pairs", "מצאו את הזוגות"),
  pairsSub: w("لاقوا كل الأزواج بأقل من 16 حركة واربحوا خصم.", "Find every pair in under 16 moves and win a discount.", "מצאו את כל הזוגות בפחות מ־16 מהלכים וזכו בהנחה."),
  pairsPrize: w("خصم 10٪", "10% off", "10% הנחה"),
  flash: w("شوفوا اللي ما بينشاف", "See what can't be seen", "ראו את מה שלא רואים"),
  flashSub: w("مرّروا الضو فوق الصورة لتبيّن التفاصيل من جوّا.", "Run the light over the picture to see the details inside.", "העבירו את האור מעל התמונה כדי לראות את הפרטים מבפנים."),
  flights: w("وين بيوصلوا طلباتنا", "Where our orders go", "לאן ההזמנות שלנו מגיעות"),
  flightsSub: w("من مستودعنا لكل هالمدن، وكم يوم بتاخد.", "From our warehouse to all these cities, and how many days it takes.", "מהמחסן שלנו לכל הערים האלה, וכמה ימים זה לוקח."),
  days: w("أيام", "days", "ימים"),
  inside: w("شو في جوّا", "What's inside", "מה יש בפנים"),
  insideSub: w("كبسوا على أي حلقة لتفتحوها.", "Tap a ring to open it.", "הקישו על טבעת כדי לפתוח אותה."),
  month: w("شهرنا بالأرقام", "Our month in numbers", "החודש שלנו במספרים"),
  monthSub: w("الطلبات كل يوم، أسبوع ورا أسبوع.", "Orders each day, week after week.", "הזמנות בכל יום, שבוע אחרי שבוע."),
  journey: w("من الفكرة لإيدكم", "From the idea to your hands", "מהרעיון לידיים שלכם"),
  journeySub: w("كل قطعة بتمرق بهالطريق قبل ما توصلكم.", "Every piece travels this road before it reaches you.", "כל פריט עובר בדרך הזאת לפני שהוא מגיע אליכם."),
};
const t3 = (s: string) => w(s, s, s);
const week = (n: number) => w(`الأسبوع ${n}`, `Week ${n}`, `שבוע ${n}`);
const DAYS3 = [w("أحد", "Sun", "א׳"), w("اثنين", "Mon", "ב׳"), w("ثلاثاء", "Tue", "ג׳"), w("أربعاء", "Wed", "ד׳"), w("خميس", "Thu", "ה׳")];

/* --------------------------------------------------------------- pieces */

/** Each look's WebGL ground (the theme library's shaders and live canvases, the shop's pageTree/shader.ts). */
const SHADER: Record<string, string> = {
  airy: "aurora", editorial: "ink", heavy: "plasma", luxe: "gem", brutal: "cells", pillow: "mesh", glass: "caustic", ink: "ink",
  carved: "terrain", marker: "mesh", gallery: "chrome", tilted: "kaleido", arches: "sun", blobs: "oil", mono: "dither", duotone: "kaleido",
  noir: "hole", neon: "portal", retro: "synth", paper: "ink", sport: "tunnel", candy: "bubbles", organic: "ocean", minimal: "mesh",
};
/** Each mood's live canvas (birds, a galaxy, koi…), for a ground that moves without being a picture. */
const CANVAS: Record<Look["mood"], string> = { calm: "constellation", bold: "magnetic", luxe: "galaxy", playful: "koi", tech: "flow", classic: "murmuration" };

/**
 * A section on a live WebGL ground in the store's own colours, dark before it draws (and where WebGL can't),
 * words white on it (a veil keeps them readable).
 */
function liveGround(c: Ctx, L: Look, kids: N[], name: W, kind: string, o: { center?: boolean; pad?: [number, number, number, number]; tall?: boolean } = {}): N {
  const s = section(c, L, kids, name, { center: o.center, plainGround: true, pad: o.pad ?? [L.pad + 40, 24, L.pad + 40, 24] });
  const base = (s.style?.base ?? {}) as S;
  return {
    ...s,
    props: { ...s.props, shader: { kind, c1: "accent", c2: "accent-soft", rainbow: false, mouse: true, grain: 0.05, veil: 0.4 } },
    style: { ...s.style, base: { ...base, bg: "#0b0b14", color: "white", ...(o.tall ? { minHeight: "88vh", justify: "center" } : {}) } },
  };
}
/** Words in a light box (a book's page, a phone's screen, a card on a ring) are the page's own, whatever the section's skin. */
const lightOf = (c: Ctx): Ctx => ({ ...c, skin: "plain" });
/** A heading whose letters lean to the pointer (rich motion only). */
const leaning = (n: N, c: Ctx): N => (c.motion === "rich" ? { ...n, motion: { ...(n.motion ?? {}), fx: { kind: "proximity" } } } : n);
/** The small line flipping in like a station's board. */
const flapping = (n: N | null): N | null => (n ? { ...n, motion: { ...(n.motion ?? {}), enter: { kind: "flap", duration: 1.2 } } } : n);
/** Words running along, faster as the page scrolls faster. */
const runner = (c: Ctx, over: boolean): N => el(c, "marquee", { items: RUNNING.slice(0, 5).map((r) => say(c, r)), speed: 36, separator: "✦", velocity: true }, { color: over ? "white" : "text", size: 15, weight: 600, margin: [40, 0, 0, 0], width: "100%" });
/** Centred words for the top of a section. */
function top(c: Ctx, L: Look, title: W, sub: W, o: { over?: boolean; eyebrow?: W } = {}): N {
  const eb = o.eyebrow ? over(c, L, o.eyebrow, { center: true, onPic: o.over }) : null;
  return STACK(c, [...(eb ? [eb] : []), head(c, L, title, 2, { center: true, over: o.over }), ...rule(c, L), text(c, L, sub, { center: true, max: "640px", over: o.over })], { gap: 14, align: "center", textAlign: "center", margin: [0, 0, 40, 0] });
}
/** Words at the start of a row of two. */
function side(c: Ctx, L: Look, title: W, sub: W, o: { over?: boolean; cta?: [W, string]; eyebrow?: W } = {}): N {
  const eb = o.eyebrow ? over(c, L, o.eyebrow, { onPic: o.over }) : null;
  return STACK(c, [...(eb ? [eb] : []), head(c, L, title, 2, { over: o.over }), ...rule(c, L), text(c, L, sub, { max: "520px", over: o.over }), ...(o.cta ? [button(c, L, o.cta[0], o.cta[1], "solid", { over: o.over })] : [])], { gap: 16 });
}
/** A picture card for a 3D layout or a deck: a picture and its name under it. */
function picCard(c: Ctx, L: Look, name: W, o: { width?: string; height?: string; dark?: boolean; i?: number } = {}): N {
  return STACK(c, [
    IMG(c, name, { aspect: "4/5", radius: Math.min(18, L.pic.radius || 12), motion: false }),
    head(o.dark ? { ...c, skin: "dark" } : lightOf(c), L, name, 4, { size: 18 }),
  ], { width: o.width ?? "220px", gap: 10, pad: [12, 12, 16, 12], radius: Math.min(24, (L.pic.radius || 12) + 6), bg: o.dark ? "text" : "bg", color: o.dark ? "bg" : "text", shadow: "lg", ...(o.height ? { height: o.height } : {}) });
}
/**
 * A box laid out in 3D (pageTree/Space3D.tsx): a ring, a helix, a cube, a book or a phone. What it holds stands in a
 * row that wraps: where it's measured from, and how it stays for a visitor who asked for less motion (flat).
 */
const space = (c: Ctx, kind: "ring" | "helix" | "cube" | "book" | "phone", kids: N[], s: S = {}, more: S = {}): N => {
  const box = STACK(c, kids, { width: "100%", direction: "row", wrap: true, justify: "center", gap: 16, ...s });
  return { ...box, props: { ...box.props, space: { kind, ...more } } };
};
/** A box whose children move with the scroll (pageTree/scrollTricksLib.ts). */
const scrolled = (n: N, scroll: S): N => ({ ...n, motion: { ...(n.motion ?? {}), scroll } });
/** A chart of the editor's (pageTree/ChartKinds.tsx), on a light panel where the section is dark. */
const chart = (c: Ctx, L: Look, props: S): N => storePanel(c, L, [el(c, "chart", { showValues: true, ...props }, { width: "100%" })]);
const item = (c: Ctx, label: W, value: number, more: S = {}) => ({ label: say(c, label), value, ...more });

/* ======================================================= premium openings */

export const WOW_OPEN_LAYOUTS: Layout[] = [
  { key: "shader-center", name: w("خلفية حيّة بالنص", "A live ground, words in the middle", "רקע חי, מילים באמצע"), build: (c, L) =>
    liveGround(c, L, [STACK(c, [
      ...[flapping(over(c, L, c.pack.eyebrow, { center: true, onPic: true }))].filter((n): n is N => !!n),
      leaning(head(c, L, c.pack.title, 1, { center: true, over: true, size: 72 }), c),
      text(c, L, c.pack.sub, { center: true, max: "620px", over: true }),
      buttons(c, L, { center: true, over: true }),
      runner(c, true),
    ], { gap: 18, align: "center", textAlign: "center", width: "100%" })], c.pack.title, SHADER[L.key] ?? "aurora", { center: true, tall: true }) },
  { key: "shader-split", name: w("خلفية حيّة وصورة بزجاج", "A live ground and a picture under glass", "רקע חי ותמונה מאחורי זכוכית"), build: (c, L) =>
    liveGround(c, L, [COLS(c, [11, 10], [
      [STACK(c, [...[flapping(over(c, L, c.pack.eyebrow, { onPic: true }))].filter((n): n is N => !!n), leaning(head(c, L, c.pack.title, 1, { over: true }), c), text(c, L, c.pack.sub, { over: true, max: "520px" }), buttons(c, L, { over: true })], { gap: 18 })],
      [(() => { const glass = L.card === "glass"; const k: Ctx = glass ? c : { ...c, skin: "plain" }; return card(c, L, [{ ...IMG(c, c.pack.product, { aspect: "4/5", radius: 14, motion: false }), props: { src: pic(c), alt: say(c, c.pack.product), glfx: { kind: "liquid", strength: 0.6 } } }, head(k, L, c.pack.product, 4, { size: 20, over: glass }), text(k, L, c.pack.collection, { over: glass })], { pad: [16, 16, 20, 16] }, { onPic: true }); })()],
    ], { gap: 56, align: "center", phone: "stack" })], c.pack.title, SHADER[L.key] ?? "plasma", { tall: true }) },
  { key: "trail-giant", name: w("صور بتلحق الماوس وعنوان عملاق", "Pictures trailing the pointer, a giant title", "תמונות שעוקבות אחרי העכבר, כותרת ענקית"), build: (c, L) => {
    const s = section(c, L, [STACK(c, [
      over(c, L, M.move, { center: true }) ?? text(c, L, M.move, { center: true }),
      leaning(head(c, L, c.pack.collection, 1, { center: true, size: 120 }), c),
      text(c, L, c.pack.sub, { center: true, max: "600px" }),
      buttons(c, L, { center: true }),
    ], { gap: 20, align: "center", textAlign: "center", width: "100%" })], c.pack.collection, { center: true, pad: [L.pad + 60, 24, L.pad + 60, 24] });
    return { ...s, props: { ...s.props, trail: { images: Array.from({ length: 6 }, () => pic(c)), size: 190 } } };
  } },
  { key: "ring-stage", name: w("كلام وحلقة 3D", "Words and a 3D ring", "מילים וטבעת תלת־ממד"), build: (c, L) =>
    section(c, L, [COLS(c, [2, 3], [
      [STACK(c, [over(c, L, c.pack.eyebrow) ?? text(c, L, c.pack.eyebrow), head(c, L, c.pack.title, 1), ...rule(c, L), text(c, L, M.ringSub, { max: "460px" }), buttons(c, L)].filter(Boolean) as N[], { gap: 16 })],
      [space(c, "ring", M.pieces.slice(0, 7).map((n, i) => picCard(c, L, n, { width: "170px", dark: !isLight(c) && i % 2 === 0 })), {}, { speed: 0.6, drag: true })],
    ], { gap: 32, align: "center", phone: "stack" })], c.pack.title) },
  { key: "earth-reach", name: w("الأرض وطياراتها", "The earth and its flights", "כדור הארץ והטיסות שלו"), build: (c, L) =>
    liveGround(c, L, [STACK(c, [
      ...[flapping(over(c, L, c.pack.eyebrow, { center: true, onPic: true }))].filter((n): n is N => !!n),
      leaning(head(c, L, M.reach, 1, { center: true, over: true, size: 68 }), c),
      text(c, L, M.reachSub, { center: true, max: "560px", over: true }),
      GRID(c, 3, STATS.slice(0, 3).map((s) => STACK(c, [head(c, L, s.n, 3, { center: true, over: true, size: 40 }), text(c, L, s.label, { center: true, over: true })], { gap: 4, align: "center" })), { gap: 24, phone: 3 }),
      buttons(c, L, { center: true, over: true }),
    ], { gap: 20, align: "center", textAlign: "center", width: "100%" })], M.reach, "earth", { center: true, tall: true }) },
  { key: "canvas-word", name: w("عنوان على أرض بتتحرّك", "A title on a ground that moves", "כותרת על רקע שזז"), build: (c, L) =>
    liveGround(c, L, [STACK(c, [
      ...[flapping(over(c, L, c.pack.label, { center: true, onPic: true }))].filter((n): n is N => !!n),
      leaning(head(c, L, c.pack.collection, 1, { center: true, over: true, size: 96 }), c),
      text(c, L, c.pack.story, { center: true, max: "600px", over: true }),
      button(c, L, c.pack.cta, "/shop", "solid", { over: true }),
    ], { gap: 20, align: "center", textAlign: "center", width: "100%" })], c.pack.collection, CANVAS[L.mood], { center: true, tall: true }) },
];
export const WOW_OPEN_PICKS: Record<string, string[]> = {
  "shader-center": ["airy", "heavy", "neon", "organic", "noir"],
  "shader-split": ["glass", "luxe", "retro", "candy", "duotone"],
  "trail-giant": ["brutal", "editorial", "minimal", "sport"],
  "ring-stage": ["pillow", "gallery", "neon", "mono"],
  "earth-reach": ["mono", "luxe", "minimal", "glass"],
  "canvas-word": ["arches", "tilted", "paper", "ink"],
};

/* ========================================================= premium stories */

export const WOW_STORY_LAYOUTS: Layout[] = [
  { key: "fan", name: w("مروحة صور بتنفرد", "A fan of pictures spreading out", "מניפת תמונות שנפרשת"), build: (c, L) =>
    section(c, L, [top(c, L, M.fan, M.fanSub, { eyebrow: c.pack.collection }), scrolled(STACK(c, M.pieces.slice(0, 5).map((n) => picCard(c, L, n, { width: "200px" })), { direction: "row", gap: 20, justify: "center", wrap: true }), { kind: "fan" })], M.fan, { center: true }) },
  { key: "drift", name: w("أعمدة صور بتمشي", "Columns of pictures drifting", "עמודות תמונות נודדות"), build: (c, L) =>
    section(c, L, [COLS(c, [4, 7], [
      [side(c, L, M.drift, c.pack.story, { cta: [c.pack.cta, "/shop"], eyebrow: c.pack.collection })],
      [scrolled(GRID(c, 3, Array.from({ length: 6 }, (_, i) => picture(c, L, M.pieces[i], { aspect: i % 2 ? "3/4" : "4/5", bare: true, radius: L.pic.radius })), { gap: 16, phone: 2 }), { kind: "drift", speed: 1 })],
    ], { gap: 48, align: "center", phone: "stack" })], M.drift) },
  { key: "depth", name: w("نفق بالعمق", "A tunnel in depth", "מנהרה לעומק"), build: (c, L) =>
    section(c, L, [top(c, L, M.depth, c.pack.sub), scrolled(STACK(c, M.depthCards.map((n, i) => card(c, L, [picture(c, L, n, { aspect: "16/10", bare: true }), head(c, L, n, 3, { center: true, size: 26 })], { width: "100%", maxWidth: "560px", self: "center", align: "center" })), { gap: 24, align: "center" }), { kind: "depth", length: 300 })], M.depth, { center: true }) },
  { key: "dive", name: w("كلمة كبيرة بتغطسوا فيها", "A big word to dive into", "מילה גדולה לצלול לתוכה"), build: (c, L) =>
    section(c, L, [
      scrolled(head(c, L, M.dive, 2, { center: true, size: 160, paint: true }), { kind: "through", length: 250 }),
      text(c, L, M.diveSub, { center: true, max: "560px" }),
      STACK(c, [button(c, L, c.pack.cta, "/shop")], { align: "center", margin: [24, 0, 0, 0] }),
    ], M.dive, { center: true }) },
  { key: "timeline", name: w("خط زمني بيرسم حاله", "A timeline that draws itself", "ציר זמן שמצייר את עצמו"), build: (c, L) =>
    section(c, L, [COLS(c, [2, 3], [
      [side(c, L, M.timeline, c.pack.story, { eyebrow: c.pack.label })],
      [scrolled(STACK(c, M.steps.map(([year, title, sub]) => STACK(c, [over(c, L, year) ?? text(c, L, year), head(c, L, title, 3, { size: 26 }), text(c, L, sub)], { gap: 6, pad: [0, 0, 0, 28] })), { gap: 40 }), { kind: "timeline" })],
    ], { gap: 56, align: "start", phone: "stack" })], M.timeline) },
  { key: "book", name: w("الحكاية بكتاب بيتقلّب", "The story as a book that turns", "הסיפור כספר שמתהפך"), build: (c, L) =>
    section(c, L, [top(c, L, M.book, c.pack.story), space(c, "book", [
      ...M.bookPages.flatMap(([title, sub], i) => [
        STACK(c, [over(lightOf(c), L, t3(`0${i + 1}`)) ?? text(lightOf(c), L, t3(`0${i + 1}`)), head(lightOf(c), L, title, 3, { size: 30 }), text(lightOf(c), L, sub)], { gap: 10, pad: [36, 32, 36, 32], bg: "bg", color: "text", justify: "center" }),
        STACK(c, [IMG(c, title, { aspect: "4/5", radius: 0, motion: false })], { pad: [0, 0, 0, 0], bg: "surface" }),
      ]),
    ], { maxWidth: "860px", self: "center" })], M.book, { center: true }) },
  { key: "helix", name: w("حلزون اللي بيميّزنا", "A helix of what sets us apart", "סליל של מה שמייחד אותנו"), build: (c, L) =>
    section(c, L, [top(c, L, M.helix, c.pack.sub, { eyebrow: c.pack.label }), space(c, "helix", M.values.map((v, i) => card(c, L, [ICON(c, (["sparkle", "heart", "truck", "return", "gift", "phone", "star", "shield"] as IconName[])[i], { size: 28, motion: false }), head(c, L, v, 4, { size: 18 })], { width: "190px", align: "center", textAlign: "center" })), {}, { speed: 0.5, drag: true })], M.helix, { center: true }) },
];
export const WOW_STORY_PICKS: Record<string, string[]> = {
  fan: ["candy", "tilted", "pillow", "arches"],
  drift: ["editorial", "gallery", "minimal", "noir"],
  depth: ["neon", "noir", "paper", "mono"],
  dive: ["heavy", "brutal", "sport", "duotone"],
  timeline: ["paper", "organic", "airy", "noir"],
  book: ["luxe", "editorial", "paper", "carved"],
  helix: ["retro", "blobs", "noir", "sport"],
};

/* ========================================================= premium selling */

export const WOW_SELL_LAYOUTS: Layout[] = [
  { key: "cube", name: w("مكعّب مجموعات", "A cube of collections", "קובייה של קולקציות"), build: (c, L) =>
    section(c, L, [COLS(c, [9, 11], [
      [side(c, L, M.cube, M.cubeSub, { cta: [c.pack.cta, "/shop"], eyebrow: c.pack.collection })],
      [space(c, "cube", M.pieces.slice(0, 6).map((n) => STACK(c, [IMG(c, n, { aspect: "4/3", radius: 10, motion: false }), head(lightOf(c), L, n, 3, { size: 20 })], { width: "190px", height: "190px", gap: 8, pad: [12, 12, 12, 12], bg: "bg", color: "text", justify: "center" })), {}, { speed: 0.4, drag: true })],
    ], { gap: 48, align: "center", phone: "stack" })], M.cube) },
  { key: "phone", name: w("موبايل بيلف مع التمرير", "A phone turning with the scroll", "טלפון שמסתובב בגלילה"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [
      [side(c, L, M.phone, M.phoneSub, { cta: [c.pack.cta, "/shop"], eyebrow: c.pack.label })],
      [space(c, "phone", M.screens.map(([title, sub], i) => STACK(c, [IMG(c, title, { aspect: "1/1", radius: 16, motion: false }), head(lightOf(c), L, title, 3, { size: 26 }), text(lightOf(c), L, sub), STACK(c, [], { height: "10px", width: `${40 + i * 25}%`, radius: 999, bg: "accent" })], { width: "190px", gap: 12, pad: [20, 18, 20, 18], bg: "bg", color: "text" })))],
    ], { gap: 48, align: "center", phone: "stack" })], M.phone) },
  { key: "scratch", name: w("كوبون بتخدشوه", "A coupon to scratch", "קופון לגרד"), build: (c, L) =>
    section(c, L, [COLS(c, [1, 1], [
      [side(c, L, M.scratch, M.scratchSub, { eyebrow: c.pack.collection })],
      [storePanel(c, L, [el(c, "scratchCard", { title: say(c, M.scratch), prize: say(c, M.prize), coverText: say(c, M.cover), look: L.mood === "luxe" ? "gold" : L.mood === "playful" ? "pink" : L.mood === "tech" ? "silver" : "brand", height: 220, once: true }, { width: "100%" })])],
    ], { gap: 48, align: "center", phone: "stack" })], M.scratch) },
  { key: "pairs", name: w("لعبة أزواج بخصم", "A game of pairs with a discount", "משחק זוגות עם הנחה"), build: (c, L) =>
    section(c, L, [top(c, L, M.pairs, M.pairsSub), STACK(c, [storePanel(c, L, [el(c, "memoryGame", { title: say(c, M.pairs), prize: say(c, M.pairsPrize), moves: 16, faces: (["heart", "star", "gift", "sparkle", "bag", "truck"] as IconName[]).map((icon) => ({ icon })) }, { width: "100%" })], { maxWidth: "720px", width: "100%", self: "center" })], { width: "100%", align: "center" })], M.pairs, { center: true }) },
  { key: "flash", name: w("ضو بيكشف صورة تانية", "A light showing a second picture", "אור שחושף תמונה שנייה"), build: (c, L) =>
    section(c, L, [COLS(c, [3, 2], [
      [(() => { const p = IMG(c, c.pack.product, { aspect: "4/3", radius: L.pic.radius }); return { ...p, props: { ...p.props, flash: { src: pic(c), radius: 170 } } }; })()],
      [side(c, L, M.flash, M.flashSub, { cta: [c.pack.cta, "/shop"], eyebrow: M.move })],
    ], { gap: 48, align: "center", phone: "stack" })], M.flash) },
  { key: "ring-shop", name: w("حلقة قطع للبيع", "A ring of pieces for sale", "טבעת פריטים למכירה"), build: (c, L) =>
    section(c, L, [top(c, L, M.ring, M.ringSub, { eyebrow: c.pack.collection }), space(c, "ring", M.pieces.map((n, i) => STACK(c, [IMG(c, n, { aspect: "4/5", radius: 12, motion: false }), head(lightOf(c), L, n, 4, { size: 17 }), text(lightOf(c), L, t3(`₪${120 + i * 35}`))], { width: "180px", gap: 8, pad: [10, 10, 14, 10], radius: 16, bg: "bg", color: "text", shadow: "lg" })), {}, { speed: 0.5, drag: true, tilt: -8 }), STACK(c, [button(c, L, c.pack.cta, "/shop")], { align: "center", margin: [24, 0, 0, 0] })], M.ring, { center: true }) },
];
export const WOW_SELL_PICKS: Record<string, string[]> = {
  cube: ["neon", "brutal", "paper", "candy"],
  phone: ["minimal", "pillow", "mono", "candy"],
  scratch: ["luxe", "candy", "retro", "arches"],
  pairs: ["blobs", "tilted", "noir", "sport"],
  flash: ["noir", "editorial", "gallery", "ink"],
  "ring-shop": ["organic", "duotone", "noir", "marker"],
};

/* ============================================================ premium data */

export const WOW_DATA_LAYOUTS: Layout[] = [
  { key: "flights", name: w("خريطة طيارات التوصيل", "A map of delivery flights", "מפת טיסות משלוח"), build: (c, L) =>
    section(c, L, [top(c, L, M.flights, M.flightsSub, { eyebrow: c.pack.label }), chart(c, L, {
      kind: "flights", label: say(c, M.flights), hub: "dubai", unit: say(c, M.days),
      items: [["london", 5], ["paris", 5], ["istanbul", 3], ["cairo", 2], ["amman", 2], ["mumbai", 4], ["nairobi", 4]].map(([city, d]) => ({ label: {}, value: d as number, city: city as string })),
    })], M.flights, { center: true }) },
  { key: "sunburst", name: w("حلقات شو في جوّا", "Rings of what's inside", "טבעות של מה שבפנים"), build: (c, L) =>
    section(c, L, [COLS(c, [2, 3], [
      [side(c, L, M.inside, M.insideSub, { eyebrow: c.pack.product })],
      [chart(c, L, { kind: "sunburst", label: say(c, M.inside), unit: say(c, t3("%")), items: [
        item(c, w("قطن", "Cotton", "כותנה"), 40, { group: say(c, w("الخامة", "The material", "החומר")) }), item(c, w("بطانة", "Lining", "בטנה"), 15, { group: say(c, w("الخامة", "The material", "החומר")) }),
        item(c, w("خياطة", "Stitching", "תפירה"), 20, { group: say(c, w("الصنعة", "The craft", "המלאכה")) }), item(c, w("تشطيب", "Finishing", "גימור"), 10, { group: say(c, w("الصنعة", "The craft", "המלאכה")) }),
        item(c, w("تغليف", "Packaging", "אריזה"), 15),
      ] })],
    ], { gap: 40, align: "center", phone: "stack" })], M.inside) },
  { key: "bars3d", name: w("شهر بأعمدة 3D", "A month in 3D bars", "חודש בעמודות תלת־ממד"), build: (c, L) =>
    section(c, L, [top(c, L, M.month, M.monthSub, { eyebrow: c.pack.label }), chart(c, L, {
      kind: "bars3d", label: say(c, M.month),
      items: [1, 2, 3].flatMap((wk) => DAYS3.map((d, i) => item(c, d, 12 + ((i * 7 + wk * 11) % 19) * 3, { group: say(c, week(wk)) }))),
    })], M.month, { center: true }) },
  { key: "sankey", name: w("طريق القطعة لإلكم", "A piece's road to you", "הדרך של פריט אליכם"), build: (c, L) => {
    const f = (a: W, b: W, v: number) => item(c, a, v, { to: say(c, b) });
    const [field, studio, shop, you, gift] = [w("الخامات", "Materials", "חומרים"), w("المشغل", "The workshop", "הסדנה"), w("المتجر", "The shop", "החנות"), w("إلكم", "To you", "אליכם"), w("هدايا", "As gifts", "כמתנות")];
    return section(c, L, [top(c, L, M.journey, M.journeySub), chart(c, L, { kind: "sankey", label: say(c, M.journey), items: [f(field, studio, 100), f(studio, shop, 60), f(studio, you, 40), f(shop, you, 45), f(shop, gift, 15)] })], M.journey, { center: true });
  } },
];
export const WOW_DATA_PICKS: Record<string, string[]> = {
  flights: ["minimal", "noir", "glass", "airy"],
  sunburst: ["organic", "pillow", "luxe", "neon"],
  bars3d: ["mono", "neon", "sport", "candy"],
  sankey: ["paper", "duotone", "carved", "noir"],
};
