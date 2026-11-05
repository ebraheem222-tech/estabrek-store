/**
 * Shoes: ten templates, each its own world (phase 11.3, wave 1). Street, race day, a
 * leather atelier, kids at play, quiet minimal, a retro poster, a night drop, a fashion
 * magazine, the trail, the lab. Each wears its own style and puts its own parts together.
 */
import { KIDS_SHOES, SHOES, SHOE_FAQ, SHOE_PROMISES, SHOE_REVIEWS, cats, soon } from "../content/shoes";
import type { TK } from "../lib";
import { MODERN as Mo } from "../modern";
import { OPENINGS as O, PARTS as P } from "../sections";
import { STYLES } from "../styles";
import { t, type Node } from "../tree";
import type { Template } from "./types";

const S = SHOES;
const promises = SHOE_PROMISES;

// Live pages keep the compositions but start with shopping guidance. Gallery stories,
// policies, reviews and product specifications belong only to the illustrative preview.
const LIVE = {
  shop: t("تصفّح الأحذية|Browse shoes|עיינו בנעליים"),
  intro: t("اكتشف القصّات والألوان، واقرأ تفاصيل كل زوج على صفحة المنتج.|Explore shapes and colours, and read the details of each pair on its product page.|גלו גזרות וצבעים וקראו את פרטי כל זוג בדף המוצר."),
  title: t("خطوتك، بطريقتك|Your step, your way|הצעד שלך, בדרך שלך"),
  fresh: t("اكتشف المجموعة|Explore the collection|גלו את הקולקציה"),
  collections: t("تصفّح الأقسام|Browse collections|עיינו בקטגוריות"),
  guide: t("قبل ما تختار|Before you choose|לפני שבוחרים"),
  story: t("مساحة لأسلوبك|Make room for your style|מקום לסגנון שלכם"),
  storyText: t("اختَر حسب يومك وطريقتك باللبس. قارن المعلومات المعروضة لكل زوج قبل الطلب.|Choose for your day and the way you dress. Compare the information shown for each pair before ordering.|בחרו לפי היום וסגנון הלבוש שלכם. השוו את המידע המוצג לכל זוג לפני ההזמנה."),
  fit: t("المقاس والقصّة|Sizing and fit|מידה וגזרה"),
  fitText: t("راجع جدول المقاسات وملاحظات القصّة على صفحة المنتج، واسألنا إذا احتجت توضيح.|Check the size chart and fit notes on the product page, and ask us if you need clarification.|בדקו את טבלת המידות והערות הגזרה בדף המוצר ושאלו אם דרושה הבהרה."),
  materials: t("الخامات والتفاصيل|Materials and details|חומרים ופרטים"),
  materialsText: t("اقرأ وصف الخامات والتفاصيل المذكورة لكل زوج على صفحة المنتج.|Read the materials and construction details listed for each pair on the product page.|קראו את החומרים ופרטי המבנה המופיעים לכל זוג בדף המוצר."),
  care: t("العناية والاستخدام|Care and use|טיפול ושימוש"),
  careText: t("اتبع تعليمات العناية والاستخدام الخاصة بالمنتج اللي اخترته.|Follow the care and usage instructions for the product you choose.|פעלו לפי הוראות הטיפול והשימוש של המוצר שתבחרו."),
  help: t("عندك سؤال؟|Have a question?|יש שאלה?"),
  contactText: t("تواصل معنا عن تفاصيل المنتج أو الطلب من صفحة التواصل.|Use the contact page to ask about product or order details.|פנו דרך דף יצירת הקשר לשאלות על פרטי מוצר או הזמנה."),
  letter: t("خلّيك قريب|Stay in the loop|נשארים בעניינים"),
  email: t("سجّل بريدك لتتابع أخبار المتجر والمجموعة.|Sign up for news about the store and collection.|הירשמו לעדכונים על החנות והקולקציה."),
};
const liveDetails = () => [
  { title: LIVE.fit, text: LIVE.fitText, pic: "detail-1" },
  { title: LIVE.materials, text: LIVE.materialsText, pic: "detail-2" },
  { title: LIVE.care, text: LIVE.careText, pic: "detail-3" },
];
const liveFaq = () => [
  { q: t("كيف أختار المقاس؟|How do I choose a size?|איך בוחרים מידה?"), a: LIVE.fitText },
  { q: t("وين بلاقي تفاصيل المنتج؟|Where can I find product details?|איפה מוצאים פרטי מוצר?"), a: LIVE.materialsText },
  { q: t("كيف أسأل عن التوصيل والإرجاع؟|How do I ask about delivery and returns?|איך שואלים על משלוח והחזרות?"), a: LIVE.contactText },
];

function merchantHome(k: TK, id: string): Node[] {
  const details = liveDetails();
  const pics = ["shoe-1", "shoe-2", "shoe-3", "shoe-4", "shoe-5"];
  const hero = (pic: string) => ({ eyebrow: LIVE.fresh, title: LIVE.title, sub: LIVE.intro, cta: LIVE.shop, pic });
  const shelf = (look: "plain" | "boxed" | "round" | "overlay" | "spec", columns: number, aspect = "1 / 1") => P.shelf(k, LIVE.fresh, S, look, columns, { aspect });
  const promises = details.map((x) => ({ ...x, icon: "check" }));
  const points = details.map((x, i) => ({ x: 22 + i * 28, y: 30 + i * 17, title: x.title, text: x.text }));
  const tabs = (look: "pills" | "underline" | "boxed") => P.tabs(k, LIVE.guide, LIVE.intro, details.map((x) => ({ label: x.title, text: x.text, pic: x.pic })), look);
  const board = (pic: string, tall = false) => Mo.bento(k, LIVE.story, [
    { kind: "photo", pic, title: LIVE.story, text: LIVE.storyText, wide: true, tall },
    { kind: "product", item: S[0] },
    { kind: "cta", title: LIVE.guide, cta: LIVE.shop, wide: true },
  ]);
  const journal = details.map((x) => ({ pic: x.pic, kind: LIVE.guide, title: x.title }));
  const newsletter = () => P.letterCentered(k, LIVE.letter, LIVE.email);
  switch (id) {
    case "shoes-street": return [
      O.giantWord(k, { ...hero("hero-street"), word: t("{{store.name}}") }),
      P.marquee(k, [LIVE.fit, LIVE.materials, LIVE.care]),
      P.splitPair(k, { ...cats("men")[0], cta: LIVE.shop }, { ...cats("women")[0], cta: LIVE.shop }),
      shelf("overlay", 4), board("life-5", true),
      P.lookbook(k, LIVE.story, pics, LIVE.storyText), P.wide(k, "life-8", LIVE.guide, LIVE.intro, LIVE.shop),
      P.faq(k, LIVE.help, liveFaq(), "cards"), P.letterBand(k, LIVE.letter, LIVE.email, "pop"),
    ];
    case "shoes-race": return [
      O.splitTilt(k, { ...hero("hero-run"), badge: LIVE.shop }), P.promises(k, promises, "surface"),
      P.categories(k, LIVE.collections, cats("running", "trail", "sneakers", "sandals"), "pill", 4),
      P.pointed(k, LIVE.guide, LIVE.intro, "detail-1", points),
      Mo.statement(k, LIVE.story, { eyebrow: LIVE.guide }), shelf("boxed", 4), tabs("pills"),
      P.faq(k, LIVE.help, liveFaq(), "lines"), P.letterBand(k, LIVE.letter, LIVE.email, "accent"),
    ];
    case "shoes-atelier": return [
      O.cinematic(k, hero("hero-atelier")), P.chapters(k, LIVE.story, details),
      Mo.carousel(k, LIVE.fresh, S.slice(0, 4), "surface"), P.statement(k, LIVE.storyText),
      P.materials(k, LIVE.guide, details, "bg"), P.faq(k, LIVE.help, liveFaq(), "lines"), newsletter(),
    ];
    case "shoes-kids": return [
      O.bubbles(k, { ...hero("hero-kids"), title: t("للّعب ولليوم العادي|For play and everyday life|למשחק וליום יום") }),
      P.categories(k, LIVE.collections, cats("kids", "sneakers", "sandals", "boots"), "pill", 4),
      shelf("round", 4), board("ugc-2"), P.promises(k, promises, "pop"), tabs("boxed"),
      P.faq(k, LIVE.help, liveFaq(), "cards"), P.steps(k, LIVE.guide, details), newsletter(),
    ];
    case "shoes-quiet": return [
      O.quiet(k, hero("hero-quiet")), P.promiseLine(k, details),
      P.shelfFeatured(k, LIVE.fresh, S.slice(0, 5), LIVE.shop), P.statement(k, LIVE.storyText),
      P.categoryList(k, LIVE.collections, cats("sneakers", "formal", "sandals", "boots", "kids")),
      Mo.pinned(k, { eyebrow: LIVE.guide, title: LIVE.story, text: LIVE.intro, cta: LIVE.shop, pics: details.map((x) => ({ pic: x.pic, caption: x.title })) }),
      P.letterLine(k, LIVE.letter),
    ];
    case "shoes-retro": return [
      O.poster(k, { ...hero("hero-retro"), badge: t("على ذوقك|Your style|בסגנון שלך") }),
      Mo.outline(k, [LIVE.fit, LIVE.materials, LIVE.care], "pop"), P.shelfRanked(k, LIVE.fresh, S.slice(0, 3)),
      P.categories(k, LIVE.collections, cats("sneakers", "women", "men", "kids"), "tall", 4),
      P.steps(k, LIVE.guide, details, "pop"), P.lookbook(k, LIVE.story, pics),
      P.faq(k, LIVE.help, liveFaq(), "plus"), newsletter(),
    ];
    case "shoes-night": return [
      O.drop(k, { ...hero("hero-night"), label: t("بعد الغروب|After dark|אחרי השקיעה") }),
      shelf("overlay", 4), Mo.statement(k, LIVE.story, { from: "accent", to: STYLES.night.pop }),
      P.wide(k, "life-8", LIVE.guide, LIVE.intro, LIVE.shop), P.steps(k, LIVE.guide, details, "surface"),
      P.numbers(k, [["Fit", LIVE.fit], ["Details", LIVE.materials], ["Care", LIVE.care]]),
      P.faq(k, LIVE.help, liveFaq(), "cards"), P.letterBand(k, LIVE.letter, LIVE.email, "accent"),
    ];
    case "shoes-edit": return [
      O.cover(k, { ...hero("hero-edit"), issue: t("{{store.name}}"), body: LIVE.storyText }),
      P.essay(k, LIVE.story, LIVE.storyText, LIVE.guide),
      Mo.pinned(k, { eyebrow: LIVE.guide, title: LIVE.story, text: LIVE.intro, cta: LIVE.shop, pics: details.map((x) => ({ pic: x.pic, caption: x.title })) }),
      shelf("spec", 4, "3 / 4"), P.journal(k, LIVE.guide, journal), P.statement(k, LIVE.intro), newsletter(),
    ];
    case "shoes-trail": return [
      O.landscape(k, { ...hero("hero-trail"), stats: details.map((x) => [x.title, LIVE.guide]) }),
      P.categories(k, LIVE.collections, cats("trail", "boots", "running", "sandals"), "overlay", 4),
      tabs("pills"), shelf("boxed", 3, "4 / 3"), P.steps(k, LIVE.guide, details),
      Mo.glass(k, "trail-1", LIVE.guide, details, LIVE.shop), P.faq(k, LIVE.help, liveFaq(), "plus"),
      P.letterBand(k, LIVE.letter, LIVE.email, "pop"),
    ];
    default: return [
      O.specs(k, { ...hero("hero-lab"), points, numbers: [["Fit", LIVE.fit], ["Details", LIVE.materials], ["Care", LIVE.care], ["Choice", LIVE.guide]] }),
      P.compare(k, LIVE.fresh, S.slice(0, 3).map((x) => ({ pic: x.pic, name: LIVE.fresh, specs: [] }))),
      P.layers(k, LIVE.guide, "detail-1", details), shelf("spec", 4), board("detail-1", true),
      P.faq(k, LIVE.help, liveFaq(), "plus"), P.letterLine(k, LIVE.letter),
    ];
  }
}

const GALLERY_SHOE_TEMPLATES: Template[] = [
  {
    id: "shoes-street", category: "shoes",
    brand: t("فولت|VOLT|וולט"), header: { kind: "ticker" }, footer: { kind: "giant", tone: "ink", line: t("سنيكرز للي بيمشي بصوت عالي.|Sneakers for walking loud.|סניקרס למי שהולך בקול.") }, style: STYLES.street, tags: ["bold", "street"],
    name: t("ستريت فولت|Street Volt|סטריט וולט"),
    blurb: t("حروف ضخمة وأخضر فاقع ونَفَس الشارع|Huge letters, acid green and the street's breath|אותיות ענקיות, ירוק חומצי ונשימת הרחוב"),
    home: (k: TK) => [
      O.giantWord(k, { word: t("امشِ\nبصوتك|WALK\nLOUD|ללכת\nבקול"), title: t("الإصدار الجديد نزل|The new drop is in|ההשקה החדשה כאן"), sub: t("سنيكرز للي ما بيمشي متل الكل.|Sneakers for those who don't walk like everyone.|סניקרס למי שלא הולך כמו כולם."), cta: t("تسوّق الإصدار|Shop the drop|לקנייה"), cta2: t("كل السنيكرز|All sneakers|כל הסניקרס"), pic: "hero-street" }),
      P.marquee(k, [t("إصدار جديد|New drop|השקה חדשה"), t("تبديل مقاس ببلاش|Free size swaps|החלפת מידה חינם"), t("توصيل خلال يومين|Two-day delivery|משלוח תוך יומיים"), t("كميات محدودة|Limited pairs|זוגות מוגבלים")]),
      P.splitPair(k, { ...cats("men")[0], cta: t("رجالي|Shop men|לגברים") }, { ...cats("women")[0], cta: t("نسائي|Shop women|לנשים") }),
      P.shelf(k, t("طازة من العلبة|Fresh out of the box|טרי מהקופסה"), S, "overlay", 4, { link: t("شوف الكل|See all|לכל המוצרים"), aspect: "1 / 1" }),
      Mo.bento(k, t("لوحة الإصدار|The drop board|לוח ההשקה"), [
        { kind: "photo", pic: "life-5", title: t("صُنعت للمدينة|Made for the city|עשויות לעיר"), text: t("نعل بيتحمّل الإسفلت كل يوم|A sole for asphalt, every day|סוליה לאספלט, כל יום"), wide: true, tall: true },
        { kind: "stat", value: t("300"), label: t("زوج بكل إصدار|pairs a drop|זוגות בהשקה") },
        { kind: "product", item: S[7] },
        { kind: "quote", text: t("أحلى سنيكرز لبستها هالسنة.|The best sneakers I wore this year.|הסניקרס הכי טובות שנעלתי השנה."), by: t("— سامر|— Samer|— סאמר") },
        { kind: "cta", title: t("بدك تعرف أول؟|Want to hear first?|רוצים לשמוע ראשונים?"), cta: t("سجّل|Sign up|להרשמה") },
      ]),
      P.lookbook(k, t("الشارع لابسها|Worn on the street|נעולים ברחוב"), ["life-1", "life-2", "life-3", "life-4", "life-5"], t("صور من زباينا ومن مدينتنا.|Shots from our customers and our city.|צילומים מהלקוחות ומהעיר שלנו.")),
      P.countdown(k, t("الإصدار الجاي|The next drop|ההשקה הבאה"), t("سجّل لتعرف أول واحد، الكمية ما بتكفي الكل.|Sign up to hear first; there won't be enough for everyone.|הירשמו לשמוע ראשונים; לא יהיה מספיק לכולם."), soon(9), t("ذكّرني|Remind me|תזכירו לי"), "ink"),
      P.ugc(k, "#WALKLOUD", t("صوّر حذاك وتاغنا|Shoot your pair and tag us|צלמו את הזוג ותייגו אותנו"), ["ugc-1", "ugc-2", "ugc-3", "ugc-4", "ugc-5", "ugc-6"]),
      P.letterBand(k, t("ولا إصدار بيفوتك|Never miss a drop|לא מפספסים שום השקה"), t("رسالة وحدة قبل كل إصدار، وبس.|One letter before each drop. That's it.|מכתב אחד לפני כל השקה. זהו."), "pop"),
    ],
  },
  {
    id: "shoes-race", category: "shoes",
    brand: t("بيس|PACE|פייס"), header: { kind: "bar" }, footer: { kind: "columns", tone: "ink", line: t("أحذية جري لكل مسافة.|Running shoes for every distance.|נעלי ריצה לכל מרחק.") }, style: STYLES.runner, tags: ["sport", "bold"],
    name: t("يوم السباق|Race Day|יום המרוץ"),
    blurb: t("أزرق كهربا، زوايا مايلة وسرعة بكل قسم|Electric blue, tilted angles and speed in every part|כחול חשמלי, זוויות מוטות ומהירות בכל חלק"),
    home: (k: TK) => [
      O.splitTilt(k, { eyebrow: t("للجري اليومي|For the daily run|לריצה היומית"), title: t("أسرع من مبارح|Faster than yesterday|מהיר יותר מאתמול"), sub: t("رغوة بترجّعلك الطاقة مع كل خطوة، ونعل بيمسك بالمطر.|Foam that gives back energy with every stride, and grip that holds in the rain.|קצף שמחזיר אנרגיה בכל צעד, ואחיזה שמחזיקה בגשם."), cta: t("تسوّق الجري|Shop running|לריצה"), cta2: t("لاقي حذاك|Find your shoe|מצאו את הנעל"), pic: "hero-run", badge: t("جديد 2026|New 2026|חדש 2026") }),
      P.promises(k, promises.slice(0, 3), "surface"),
      P.categories(k, t("وين بتركض؟|Where do you run?|איפה רצים?"), cats("running", "trail", "sneakers", "sandals"), "pill", 4),
      P.pointed(k, t("مبنية للسرعة|Built for speed|בנויה למהירות"), t("كل جزء محسوب: وزن أقل، دفعة أقوى، راحة لآخر كيلو.|Every part counts: less weight, more push, comfort to the last kilometre.|כל חלק נחשב: פחות משקל, יותר דחיפה, נוחות עד הקילומטר האחרון."), "detail-1", [
        { x: 30, y: 62, title: t("رغوة مرتدّة|Rebound foam|קצף קפיצי"), text: t("بترجّع 85٪ من الطاقة|Returns 85% of energy|מחזיר 85% מהאנרגיה") },
        { x: 64, y: 70, title: t("صفيحة كربون|Carbon plate|לוחית קרבון"), text: t("دفعة لقدّام|A push forward|דחיפה קדימה") },
        { x: 52, y: 30, title: t("شبك بيتنفّس|Breathing mesh|רשת נושמת"), text: t("أخف من 230 غرام|Under 230 g|פחות מ־230 גרם") },
      ]),
      Mo.statement(k, t("كل ثانية بتفرق.|Every second counts.|כל שנייה קובעת."), { eyebrow: t("مبنية للسباق|Built to race|בנויה למרוץ") }),
      P.shelf(k, t("الأسرع عنّا|Our fastest|המהירות ביותר"), S.slice(0, 4), "boxed", 4),
      P.tabs(k, t("لاقي مقاسك|Find your size|מצאו את המידה"), t("اختار طريقة ركضك وبنقلّك شو بيناسبك.|Pick how you run and we'll tell you what suits.|בחרו איך אתם רצים ונגיד מה מתאים."), [
        { label: t("مسطّح|Neutral|ניטרלי"), text: t("خطوتك مستقيمة: خود رانر برو بمقاسك العادي.|Your stride is straight: take the Runner Pro in your usual size.|הצעד ישר: Runner Pro במידה הרגילה."), pic: "detail-2" },
        { label: t("للداخل|Overpronation|פרונציה"), text: t("رجلك بتميل لجوّا: بدك دعم من جنب، اسألنا نختار سوا.|Your foot rolls in: you need side support — ask us and we'll pick together.|כף הרגל נוטה פנימה: צריך תמיכה צידית — שאלו אותנו ונבחר יחד."), pic: "detail-3" },
        { label: t("مسافات طويلة|Long distance|מרחקים ארוכים"), text: t("نص مقاس أكبر، لأن الرجل بتنفخ بعد 15 كيلو.|Half a size up: feet swell after 15 km.|חצי מידה למעלה: הרגליים מתנפחות אחרי 15 ק\"מ."), pic: "detail-4" },
      ], "pills", "surface"),
      P.reviews(k, t("شو بيحكوا العدّائين|What runners say|מה הרצים אומרים"), SHOE_REVIEWS.slice(0, 3), "grid"),
      P.letterBand(k, t("خطط تدريب ببلاش|Free training plans|תוכניות אימון בחינם"), t("خطة أسبوعية بتوصلك، من أول 5 كيلو لأول ماراثون.|A weekly plan, from your first 5 km to your first marathon.|תוכנית שבועית, מה־5 ק\"מ הראשונים ועד המרתון הראשון."), "accent"),
    ],
  },
  {
    id: "shoes-atelier", category: "shoes",
    brand: t("أتيليه نور|Atelier Noor|אטלייה נור"), header: { kind: "centered" }, footer: { kind: "columns", tone: "surface", line: t("أحذية جلد مخيّطة باليد.|Leather shoes, stitched by hand.|נעלי עור, תפורות ביד.") }, style: STYLES.atelier, tags: ["luxury", "editorial"],
    name: t("أتيليه الجلد|Leather Atelier|אטליה העור"),
    blurb: t("سينمائي وهادي، خط سيريف وجلد مخيّط باليد|Cinematic and calm, serif type and hand-stitched leather|קולנועי ורגוע, אותיות סריף ועור תפור ביד"),
    home: (k: TK) => [
      O.cinematic(k, { eyebrow: t("صناعة يدوية منذ 1998|Handmade since 1998|עבודת יד מאז 1998"), title: t("حذاء بيعيش معك|A shoe that lives with you|נעל שחיה איתך"), sub: t("جلد طبيعي، خياطة باليد، ونعل بيتبدّل لما يخلص.|Natural leather, hand stitching, and a sole that's replaced when it wears out.|עור טבעי, תפירה ביד, וסוליה שמוחלפת כשהיא נשחקת."), cta: t("اكتشف المجموعة|Discover the collection|לגלות את הקולקציה"), pic: "hero-atelier" }),
      P.chapters(k, t("من الجلد للخطوة|From hide to stride|מהעור אל הצעד"), [
        { pic: "craft-1", title: t("الجلد|The leather|העור"), text: t("بنختار جلد العجل من مدابغ عمرها مية سنة، مدبوغ نباتياً.|We pick calfskin from century-old tanneries, vegetable-tanned.|אנחנו בוחרים עור עגל ממבורסקאות בנות מאה שנה, בעיבוד צמחי.") },
        { pic: "craft-2", title: t("القالب|The last|האימום"), text: t("كل موديل إله قالب خشب منحوت، ليمسك الحذاء شكل الرجل.|Every model has a carved wooden last so the shoe holds the foot's shape.|לכל דגם אימום עץ מגולף, כדי שהנעל תחזיק את צורת הרגל.") },
        { pic: "craft-3", title: t("الخياطة|The stitch|התפר"), text: t("خياطة غوديير باليد: 200 غرزة بكل فردة.|Goodyear welting by hand: 200 stitches in each shoe.|תפירת גודייר ביד: 200 תפרים בכל נעל.") },
      ]),
      Mo.carousel(k, t("المجموعة|The collection|הקולקציה"), [S[5], S[2], S[4], S[0]], "surface"),
      P.quote(k, t("«الحذاء المنيح ما بيتلبس، بيتعوّد عليك.»|“A good shoe isn't worn in. It gets used to you.”|„נעל טובה לא נשחקת. היא מתרגלת אליך.”"), t("معلّم الأتيليه|The atelier's master|מאסטר האטליה"), "surface"),
      P.materials(k, t("ثلاث جلود|Three leathers|שלושה עורות"), [
        { pic: "craft-4", title: t("جلد عجل|Calfskin|עור עגל"), text: t("ناعم ولمّيع، للمناسبات.|Smooth and bright, for occasions.|חלק ומבריק, לאירועים.") },
        { pic: "detail-2", title: t("شمواه|Suede|זמש"), text: t("مخملي ودافي، للنهار.|Velvety and warm, for daytime.|קטיפתי וחמים, ליום.") },
        { pic: "detail-3", title: t("كوردوفان|Cordovan|קורדובן"), text: t("أقوى جلد، بيدوم عمر.|The toughest leather, for a lifetime.|העור החזק ביותר, לכל החיים.") },
      ], "bg"),
      P.faq(k, t("عناية ومقاسات|Care and sizing|טיפול ומידות"), SHOE_FAQ, "lines"),
      P.letterCentered(k, t("دعوة للأتيليه|An invitation to the atelier|הזמנה לאטליה"), t("أيام مفتوحة ومجموعات قبل الكل.|Open days and collections before anyone else.|ימים פתוחים וקולקציות לפני כולם."), "surface"),
    ],
  },
  {
    id: "shoes-kids", category: "shoes",
    brand: t("هوب هوب|Hop Hop|הופ הופ"), header: { kind: "bar" }, footer: { kind: "columns", tone: "soft", line: t("أحذية للصغار من أول خطوة.|Shoes for little ones from the first step.|נעליים לקטנטנים מהצעד הראשון.") }, style: STYLES.playground, tags: ["playful", "kids"],
    name: t("ساحة اللعب|Playground|מגרש משחקים"),
    blurb: t("ألوان فرحانة وأشكال مدوّرة وكل إشي بينطّ|Happy colours, round shapes and everything bouncing|צבעים שמחים, צורות עגולות והכל קופץ"),
    home: (k: TK) => [
      O.bubbles(k, { eyebrow: t("للصغار من أول خطوة|For little ones from the first step|לקטנטנים מהצעד הראשון"), title: t("خطوات صغيرة، مغامرات كبيرة|Small steps, big adventures|צעדים קטנים, הרפתקאות גדולות"), sub: t("أحذية خفيفة بتلبس لحالها وبتتحمّل كل نطّة.|Light shoes they put on alone, made for every jump.|נעליים קלות שנועלים לבד ומחזיקות כל קפיצה."), cta: t("تسوّق الأطفال|Shop kids|לילדים"), cta2: t("دليل المقاسات|Size guide|מדריך מידות"), pic: "hero-kids" }),
      P.categories(k, t("قديش عمره؟|How old?|בן כמה?"), [
        { pic: "kid-3", name: t("أول خطوة|First steps|צעדים ראשונים") }, { pic: "kid-2", name: t("2–4 سنين|2–4 years|2–4 שנים") }, { pic: "cat-kids", name: t("5–8 سنين|5–8 years|5–8 שנים") }, { pic: "kid-1", name: t("9–12 سنة|9–12 years|9–12 שנים") },
      ], "pill", 4),
      P.shelf(k, t("المفضّلة عند الصغار|Little ones' favourites|האהובות על הקטנים"), KIDS_SHOES, "round", 4),
      Mo.bento(k, t("عالم الصغار|Their little world|העולם הקטן שלהם"), [
        { kind: "photo", pic: "ugc-2", title: t("جاهزين بثواني|Ready in seconds|מוכנים בשניות"), text: t("لزقة بدل الربّاط|A strap, not laces|סקוץ' במקום שרוכים"), tall: true },
        { kind: "stat", value: t("60"), label: t("يوم لتبديل المقاس|days to swap a size|ימים להחלפת מידה") },
        { kind: "stat", value: t("4.9"), label: t("تقييم الأهل|parents' rating|דירוג ההורים") },
        { kind: "quote", text: t("أخيراً حذاء بيلبسه لحاله!|Finally a shoe he puts on himself!|סוף סוף נעל שהוא נועל לבד!"), by: t("— رنا|— Rana|— רנא") },
        { kind: "cta", title: t("هدية لأول طلب|A gift on the first order|מתנה בהזמנה הראשונה"), cta: t("تسوّق|Shop|לקנייה"), wide: true },
      ], "soft"),
      P.promises(k, [
        { icon: "sparkle", title: t("بتضوي|They light up|נדלקות"), text: t("أضواء بالنعل مع كل خطوة|Lights in the sole with every step|אורות בסוליה בכל צעד") },
        { icon: "check", title: t("بيلبسها لحاله|On by themselves|נועלים לבד"), text: t("لزقة بدل الربّاط|A strap instead of laces|סקוץ' במקום שרוכים") },
        { icon: "heart", title: t("طرية على الرجل|Soft on the foot|רכות לרגל"), text: t("مواد آمنة ومرنة|Safe, flexible materials|חומרים בטוחים וגמישים") },
        { icon: "return", title: t("كبر؟ بدّل!|Grew? Swap!|גדל? מחליפים!"), text: t("تبديل مقاس خلال 60 يوم|Size swaps within 60 days|החלפת מידה תוך 60 יום") },
      ], "pop"),
      P.tabs(k, t("كيف تقيس رجل الصغير|Measuring little feet|איך מודדים רגל קטנה"), t("ثلاث خطوات بالبيت وبتعرف المقاس.|Three steps at home and you'll know the size.|שלושה צעדים בבית ויודעים את המידה."), [
        { label: t("1. ورقة وقلم|1. Paper and pen|1. נייר ועט"), text: t("خلّيه يوقف عالورقة وارسم حول رجله.|Have them stand on paper and trace around the foot.|מעמידים על דף ומשרטטים מסביב לכף הרגל.") },
        { label: t("2. قيس|2. Measure|2. מודדים"), text: t("قيس من الكعب لأطول إصبع.|Measure heel to longest toe.|מודדים מהעקב לבוהן הארוכה.") },
        { label: t("3. زيد سنتي|3. Add a centimetre|3. מוסיפים סנטימטר"), text: t("زيد سنتيمتر واحد ليضل في مجال يكبر.|Add one centimetre so there's room to grow.|מוסיפים סנטימטר אחד כדי שיהיה מקום לגדול.") },
      ], "boxed", "soft"),
      P.reviews(k, t("الأهل بيحكوا|Parents say|ההורים אומרים"), [SHOE_REVIEWS[3], SHOE_REVIEWS[1]], "row"),
      P.coupon(k, t("رجعة للمدرسة|Back to school|חזרה לבית הספר"), t("خصم 15٪ على كل أحذية المدرسة.|15% off every school shoe.|15% הנחה על כל נעלי בית הספר."), "SCHOOL15", t("استعمل الكود|Use the code|להשתמש בקוד")),
      P.letterCentered(k, t("مفاجآت للصغار|Surprises for little ones|הפתעות לקטנים"), t("هدية بعيد ميلاده، وعروض قبل المدرسة.|A birthday gift and offers before school.|מתנה ליום ההולדת ומבצעים לפני בית הספר."), "soft"),
    ],
  },
  {
    id: "shoes-quiet", category: "shoes",
    brand: t("بلين|Plain|פליין"), header: { kind: "minimal" }, footer: { kind: "line", tone: "bg", line: t("أساسيات بتدوم.|Essentials that last.|בסיס שמחזיק.") }, style: STYLES.quiet, tags: ["minimal", "calm"],
    name: t("هدوء|Quiet Step|צעד שקט"),
    blurb: t("مساحة بيضا كتير، خط صغير وكل إشي بمكانه|Lots of white space, small type, everything in its place|הרבה לבן, אותיות קטנות, הכל במקומו"),
    home: (k: TK) => [
      O.quiet(k, { eyebrow: t("مجموعة الأساسيات|The essentials|הבסיס"), title: t("أقل، بس أحسن|Less, but better|פחות, אבל טוב יותר"), sub: t("أحذية بسيطة بتمشي مع كل إشي، مصنوعة لتدوم سنين.|Simple shoes that go with everything, made to last years.|נעליים פשוטות שמתאימות לכל דבר, עשויות להחזיק שנים."), cta: t("تسوّق الأساسيات|Shop the essentials|לקולקציית הבסיס"), pic: "hero-quiet" }),
      P.promiseLine(k, promises),
      P.shelfFeatured(k, t("مختارات الموسم|The season's picks|הבחירות של העונה"), [S[2], S[0], S[4], S[6], S[7]], t("شوف التفاصيل|See the details|לפרטים")),
      P.statement(k, t("بنصنع موديلات قليلة، وبنهتم بكل واحد. ما في موضة كل أسبوع، في حذاء بتحبه سنين.|We make few models and care for each one. No fashion every week; a shoe you'll love for years.|אנחנו מייצרים מעט דגמים ומקפידים על כל אחד. בלי אופנה כל שבוע; נעל שתאהבו שנים.")),
      P.categoryList(k, t("التصنيفات|Categories|קטגוריות"), cats("sneakers", "formal", "sandals", "boots", "kids")),
      Mo.pinned(k, { eyebrow: t("صُنع ليدوم|Made to last|עשוי להחזיק"), title: t("حذاء واحد، كل الأيام|One shoe, every day|נעל אחת, כל הימים"), text: t("جلد ناعم بيتعتّق منيح، نعل بيتبدّل، ولون بيمشي مع كل إشي.|Soft leather that ages well, a sole that can be replaced, a colour that goes with everything.|עור רך שמזדקן יפה, סוליה שאפשר להחליף, וצבע שהולך עם הכל."), cta: t("تسوّق الأساسيات|Shop the essentials|לקולקציית הבסיס"), pics: [
        { pic: "life-6", caption: t("أبيض ناعم، مع الجينز أو البدلة.|Soft white, with jeans or a suit.|לבן רך, עם ג'ינס או חליפה.") },
        { pic: "life-7", caption: t("شمواه بنعل عسلي للخريف.|Suede on a gum sole for autumn.|זמש על סוליית גומי לסתיו.") },
        { pic: "shoe-3", caption: t("نعل مطاطي طبيعي.|A natural rubber sole.|סוליית גומי טבעי.") },
      ] }),
      P.letterLine(k, t("رسالة بالشهر، مش أكتر.|One letter a month. No more.|מכתב אחד בחודש. לא יותר.")),
    ],
  },
  {
    id: "shoes-retro", category: "shoes",
    brand: t("كورت كلَب|Court Club|קורט קלאב"), header: { kind: "bar", tone: "pop" }, footer: { kind: "giant", tone: "accent", line: t("كلاسيكيات الملاعب من جديد.|Court classics, again.|קלאסיקות המגרש, מחדש.") }, style: STYLES.retro, tags: ["retro", "playful", "bold"],
    name: t("ريترو كورت|Retro Court|רטרו קורט"),
    blurb: t("بوستر سبعيني، إطارات سميكة وظلال قاسية|A seventies poster, thick frames and hard shadows|פוסטר משנות השבעים, מסגרות עבות וצללים חדים"),
    home: (k: TK) => [
      O.poster(k, { eyebrow: t("رجعت من الثمانينات|Back from the eighties|חזרה משנות השמונים"), title: t("كورت 85|Court 85|קורט 85"), sub: t("نفس الشكل اللي حبّيتوه بالملاعب، بجلد أنعم ونعل أريح.|The look you loved on the courts, with softer leather and a comfier sole.|המראה שאהבתם במגרשים, עם עור רך יותר וסוליה נוחה יותר."), cta: t("خدها هلق|Get them now|לקנות עכשיו"), cta2: t("كل الريترو|All retro|כל הרטרו"), pic: "hero-retro", badge: t("ريترو!|Retro!|רטרו!") }),
      Mo.outline(k, [t("كلاسيك|Classic|קלאסי"), t("ريترو|Retro|רטרו"), t("كورت 85|Court 85|קורט 85")], "pop"),
      P.shelfRanked(k, t("التوب 3|The top 3|הטופ 3"), [S[4], S[2], S[7]]),
      P.categories(k, t("اختار الستايل|Pick a style|בחרו סגנון"), cats("sneakers", "women", "men", "kids"), "tall", 4),
      P.coupon(k, t("كوبون الملعب|The court coupon|קופון המגרש"), t("10٪ على أول طلب، لأنك رجعت للكلاسيك.|10% off your first order, for going back to classic.|10% על ההזמנה הראשונה, כי חזרתם לקלאסיקה."), "RETRO10", t("تسوّق|Shop|לקנייה")),
      P.ugc(k, "#COURT85", t("بالملاعب وبالشارع|On courts and streets|במגרשים וברחובות"), ["ugc-1", "ugc-2", "ugc-3", "ugc-4", "ugc-5", "ugc-6"], true),
      P.reviews(k, t("قالوا عنها|They said|אמרו עליהן"), [SHOE_REVIEWS[1]], "single", "surface"),
      P.letterCentered(k, t("انضم للنادي|Join the club|הצטרפו למועדון"), t("إصدارات ريترو محدودة لأعضاء النادي أول.|Limited retro releases for club members first.|השקות רטרו מוגבלות קודם לחברי המועדון."), "accent"),
    ],
  },
  {
    id: "shoes-night", category: "shoes",
    brand: t("آفتر آورز|AFTERHOURS|אפטר אוורס"), header: { kind: "ticker" }, footer: { kind: "giant", tone: "surface", line: t("إصدارات محدودة بعد نص الليل.|Limited drops after midnight.|השקות מוגבלות אחרי חצות.") }, style: STYLES.night, tags: ["dark", "drop", "bold"],
    name: t("إصدار الليل|Night Drop|השקת לילה"),
    blurb: t("أسود ونيون وعدّاد للإصدار الجاي|Black, neon and a countdown to the next release|שחור, ניאון וספירה לאחור להשקה הבאה"),
    home: (k: TK) => [
      O.drop(k, { label: t("إصدار رقم 07|Drop 07|השקה 07"), title: t("ميدنايت رانر|Midnight Runner|מידנייט ראנר"), sub: t("300 زوج بس. بتنزل نص الليل بالضبط.|Only 300 pairs. Out at midnight sharp.|רק 300 זוגות. יוצא בחצות בדיוק."), cta: t("ادخل السحب|Enter the raffle|להשתתף בהגרלה"), cta2: t("ذكّرني|Remind me|תזכירו לי"), pic: "hero-night", until: soon(4) }),
      P.shelf(k, t("إصدارات سابقة|Past drops|השקות קודמות"), S.slice(0, 4), "overlay", 4, { aspect: "1 / 1", link: t("الأرشيف|The archive|הארכיון") }),
      Mo.statement(k, t("بعد نص الليل، الشارع إلنا.|After midnight, the street is ours.|אחרי חצות, הרחוב שלנו."), { from: "accent", to: STYLES.night.pop }),
      P.wide(k, "life-8", t("بعد نص الليل|After midnight|אחרי חצות"), t("صوّرناها بشوارع المدينة الفاضية.|We shot it in the city's empty streets.|צילמנו אותה ברחובות הריקים של העיר."), t("شوف اللوك بوك|See the lookbook|ללוקבוק")),
      P.steps(k, t("كيف بيشتغل الإصدار|How a drop works|איך עובדת השקה"), [
        { title: t("سجّل|Sign up|נרשמים"), text: t("حساب واحد لكل شخص.|One account per person.|חשבון אחד לאדם.") },
        { title: t("ادخل السحب|Enter the raffle|נכנסים להגרלה"), text: t("قبل الإصدار بـ48 ساعة.|48 hours before the drop.|48 שעות לפני ההשקה.") },
        { title: t("اربح واشتري|Win and buy|זוכים וקונים"), text: t("بتوصلك رسالة ومعك ساعة.|You get a message and an hour.|מקבלים הודעה ושעה.") },
      ], "surface"),
      P.numbers(k, [["300", t("زوج بكل إصدار|pairs per drop|זוגות בכל השקה")], ["7", t("دقايق لخلص آخر واحد|minutes to sell out|דקות עד שנגמר")], ["12k", t("بالسحب الأخير|in the last raffle|בהגרלה האחרונה")]]),
      P.faq(k, t("أسئلة الإصدار|Drop questions|שאלות על ההשקה"), [
        { q: t("فيني أشتري أكتر من زوج؟|Can I buy more than one pair?|אפשר לקנות יותר מזוג?"), a: t("لا، زوج واحد لكل شخص ليوصل لأكتر ناس.|No: one pair each, so more people get one.|לא: זוג אחד לאדם, כדי שיותר אנשים יקבלו.") },
        SHOE_FAQ[1], SHOE_FAQ[2],
      ], "cards"),
      P.letterBand(k, t("كن أول من يعرف|Be first to know|היו הראשונים לדעת"), t("إشعار قبل كل إصدار بساعة.|A heads-up an hour before every drop.|התראה שעה לפני כל השקה."), "accent"),
    ],
  },
  {
    id: "shoes-edit", category: "shoes",
    brand: t("مجلة النعل|The Sole Review|ביקורת הסוליה"), header: { kind: "centered" }, footer: { kind: "columns", tone: "surface", line: t("مجلة وموسم من الأحذية.|A magazine and a season of shoes.|מגזין ועונה של נעליים.") }, style: STYLES.edit, tags: ["editorial", "luxury"],
    name: t("مجلة الأحذية|The Shoe Edit|מגזין הנעליים"),
    blurb: t("غلاف مجلة، خط سيريف كبير ومقالات|A magazine cover, big serif type and essays|שער של מגזין, סריף גדול ומאמרים"),
    home: (k: TK) => [
      O.cover(k, { issue: t("العدد 12 · خريف|No. 12 · Autumn|גיליון 12 · סתיו"), title: t("كعب أوطى، ستايل أعلى|Lower heels, higher style|עקב נמוך, סטייל גבוה"), body: t("هالموسم الأحذية بتنزل لتحت والقصّات بتصير أنضف. جمعنا القطع اللي رح تلبسها كل يوم من أيلول لآذار، مع حكايات اللي صنعوها.|This season shoes come down and cuts get cleaner. We gathered the pieces you'll wear every day from September to March, with the stories of those who made them.|העונה הנעליים יורדות והגזרות נקיות יותר. אספנו את הפריטים שתנעלו כל יום מספטמבר עד מרץ, עם הסיפורים של מי שיצר אותם."), sub: t("الصورة: لوفر جلد بني|Pictured: brown leather loafer|בתמונה: מוקסין עור חום"), cta: t("اقرأ العدد|Read the issue|לקרוא את הגיליון"), pic: "hero-edit" }),
      P.essay(k, t("رسالة المحررة|The editor's letter|מכתב העורכת"), t("كل موسم بنسأل نفس السؤال: شو اللي بيخلّي الحذاء يعيش؟ الجواب دايماً بسيط، جلد منيح وقصّة ما بتتعب منها. بهالعدد بنحكي مع ثلاث صنّاع، وبنمشي معهم من الورشة للشارع، وبنختار عشر قطع بتستاهل مكان بخزانتك.|Every season we ask the same question: what makes a shoe last? The answer is always simple: good leather and a cut you won't tire of. In this issue we talk to three makers, walk with them from the workshop to the street, and pick ten pieces worth a place in your wardrobe.|בכל עונה אנחנו שואלים אותה שאלה: מה גורם לנעל להחזיק? התשובה תמיד פשוטה: עור טוב וגזרה שלא נמאסת. בגיליון הזה דיברנו עם שלושה יוצרים, הלכנו איתם מהסדנה לרחוב, ובחרנו עשרה פריטים ששווים מקום בארון."), t("«الحذاء أول شي بيلاحظه الناس، وآخر شي بينسوه.»|“Shoes are the first thing people notice and the last they forget.”|„נעליים הן הדבר הראשון שאנשים שמים לב אליו והאחרון שהם שוכחים.”")),
      Mo.pinned(k, { eyebrow: t("الموضوع الرئيسي|The cover story|כתבת השער"), title: t("ثلاث صنّاع، ورشة وحدة|Three makers, one workshop|שלושה יוצרים, סדנה אחת"), text: t("أسبوع مع اللي بيقصّوا الجلد وبيخيّطوا النعل بإيديهم، من أول غرزة لآخر لمعة.|A week with those who cut the leather and stitch the soles by hand, from the first stitch to the last shine.|שבוע עם מי שחותכים את העור ותופרים את הסוליות ביד, מהתפר הראשון ועד הברק האחרון."), cta: t("اقرأ القصة|Read the story|לקריאת הכתבה"), pics: [
        { pic: "craft-1", caption: t("قصّ الجلد على الطاولة.|Cutting leather on the bench.|חיתוך העור על השולחן.") },
        { pic: "craft-3", caption: t("تفاصيل البروغ.|The brogue's detail.|פרטי הברוג.") },
        { pic: "craft-2", caption: t("عدّة الصنعة.|The tools of the trade.|כלי המלאכה.") },
      ] }),
      P.shelf(k, t("عشر قطع للموسم|Ten for the season|עשרה לעונה"), S, "spec", 4, { aspect: "3 / 4" }),
      P.journal(k, t("من العدد|From the issue|מהגיליון"), [
        { pic: "craft-1", kind: t("بورتريه|Portrait|דיוקן"), title: t("صانع الأحذية الأخير بالحارة|The last shoemaker on the street|הסנדלר האחרון ברחוב") },
        { pic: "life-6", kind: t("ستايل|Style|סטייל"), title: t("خمس طرق تلبس فيها اللوفر|Five ways to wear loafers|חמש דרכים לנעול מוקסינים") },
        { pic: "detail-2", kind: t("دليل|Guide|מדריך"), title: t("كيف تعتني بالشمواه|How to care for suede|איך מטפלים בזמש") },
      ]),
      P.quote(k, t("«مشيت فيها من باريس لروما، وما فكّرت فيها ولا مرة.»|“I walked from Paris to Rome in them and never once thought about them.”|„הלכתי בהן מפריז לרומא ולא חשבתי עליהן אפילו פעם אחת.”"), t("قارئة من العدد 11|A reader from issue 11|קוראת מגיליון 11"), "pop"),
      P.letterCentered(k, t("اشترك بالمجلة|Subscribe to the edit|הירשמו למגזין"), t("عدد جديد كل موسم، مباشرة لإيميلك.|A new issue every season, straight to your inbox.|גיליון חדש בכל עונה, ישר למייל."), "bg"),
    ],
  },
  {
    id: "shoes-trail", category: "shoes",
    brand: t("ريدج لاين|Ridgeline|רידג׳ליין"), header: { kind: "bar" }, footer: { kind: "columns", tone: "ink", line: t("أحذية للدروب والجبال.|Shoes for trails and mountains.|נעליים לשבילים ולהרים.") }, style: STYLES.trail, tags: ["outdoor", "sport"],
    name: t("بداية الدرب|Trailhead|תחילת השביל"),
    blurb: t("جبال وأرقام الدرب وألوان التراب|Mountains, trail numbers and earth colours|הרים, נתוני שביל וצבעי אדמה"),
    home: (k: TK) => [
      O.landscape(k, { eyebrow: t("للطرق اللي ما إلها خريطة|For roads without maps|לדרכים בלי מפה"), title: t("الدرب بيبلش من رجليك|The trail starts at your feet|השביל מתחיל ברגליים"), cta: t("أحذية الجبال|Hiking shoes|נעלי טיולים"), cta2: t("جري الدروب|Trail running|ריצת שטח"), pic: "hero-trail", stats: [[t("2,140 م|2,140 m|2,140 מ'"), t("ارتفاع|Altitude|גובה")], [t("18 كم|18 km|18 ק\"מ"), t("مسافة|Distance|מרחק")], [t("4.9"), t("تقييم|Rating|דירוג")]] }),
      P.categories(k, t("لكل درب حذاؤه|A shoe for every trail|נעל לכל שביל"), cats("trail", "boots", "running", "sandals"), "overlay", 4),
      P.tabs(k, t("شو تحت رجليك؟|What's underfoot?|מה מתחת לרגליים?"), t("اختار الأرض وبنقلّك أي نعل بيمسك.|Pick the ground and we'll tell you which sole grips.|בחרו את הקרקע ונגיד איזו סוליה אוחזת."), [
        { label: t("صخر|Rock|סלע"), text: t("نعل مطاطي ناعم بأسنان قصيرة، بيلزق عالصخر الناشف.|Soft rubber with short lugs that sticks to dry rock.|גומי רך עם זיזים קצרים שנדבק לסלע יבש."), pic: "trail-1" },
        { label: t("طين|Mud|בוץ"), text: t("أسنان 6 ملم متباعدة، بتنضّف حالها مع كل خطوة.|6 mm lugs, spaced so they clear with every step.|זיזים של 6 מ\"מ, מרווחים כך שמתנקים בכל צעד."), pic: "trail-2" },
        { label: t("ثلج|Snow|שלג"), text: t("بوت عازل للمي وعنق عالي وحرارة لتحت الصفر.|A waterproof boot, high collar, warm below zero.|מגף עמיד במים, צוואר גבוה, חם מתחת לאפס."), pic: "trail-3" },
      ], "underline", "surface"),
      P.shelf(k, t("جاهزة للدرب|Trail-ready|מוכנות לשביל"), [S[3], S[1], S[7], S[6]], "boxed", 4),
      P.steps(k, t("كيف تختار حذاء الجبل|Choosing a hiking shoe|איך בוחרים נעל טיולים"), [
        { title: t("قدّيش طويل الدرب؟|How long is the trail?|כמה ארוך השביל?"), text: t("لأقل من يوم، حذاء خفيف بيكفي.|Under a day, a light shoe will do.|לפחות מיום, נעל קלה מספיקה.") },
        { title: t("شو الحمل؟|What's the load?|מה המשקל?"), text: t("شنطة تقيلة؟ خود بوت بعنق عالي.|A heavy pack? Take a high-collar boot.|תיק כבד? מגף עם צוואר גבוה.") },
        { title: t("جرّبها عشيّة|Try them in the evening|מודדים בערב"), text: t("الرجل بتكبر آخر النهار، قيس وقتها.|Feet swell late in the day; fit them then.|הרגליים מתנפחות בסוף היום; מודדים אז.") },
      ]),
      Mo.glass(k, "trail-1", t("جاهزة لكل أرض|Ready for any ground|מוכנה לכל קרקע"), [
        { title: t("نعل بيمسك|A sole that grips|סוליה שאוחזת"), text: t("أسنان 5 ملم على الصخر والتراب|5 mm lugs for rock and dirt|זיזים של 5 מ\"מ לסלע ולעפר") },
        { title: t("ما بتدخلها مي|Keeps water out|לא נכנסים מים"), text: t("غشاء بيتنفّس وبيصد المطر|A breathable, rain-proof membrane|ממברנה נושמת שעוצרת גשם") },
        { title: t("كاحل محمي|A protected ankle|קרסול מוגן"), text: t("عنق مبطّن للنزلات|A padded collar for descents|צווארון מרופד לירידות") },
      ], t("أحذية الجبال|Hiking shoes|נעלי טיולים")),
      P.reviews(k, t("من الدروب|From the trails|מהשבילים"), [SHOE_REVIEWS[0], SHOE_REVIEWS[2]], "row"),
      P.letterBand(k, t("خرائط ودروب كل شهر|Maps and trails every month|מפות ושבילים כל חודש"), t("درب جديد مع نصايح التجهيز.|A new trail with gear tips.|שביל חדש עם טיפים לציוד."), "pop"),
    ],
  },
  {
    id: "shoes-lab", category: "shoes",
    brand: t("لاب/04|LAB/04|LAB/04"), header: { kind: "minimal" }, footer: { kind: "line", tone: "surface", line: t("أحذية مقاسة بالمليمتر.|Shoes measured in millimetres.|נעליים שנמדדו במילימטרים.") }, style: STYLES.lab, tags: ["tech", "minimal"],
    name: t("مختبر الحركة|Motion Lab|מעבדת התנועה"),
    blurb: t("أرقام ومواصفات وكل جزء مشروح|Numbers, specs and every part explained|מספרים, מפרטים וכל חלק מוסבר"),
    home: (k: TK) => [
      O.specs(k, { eyebrow: t("الجيل الرابع|Generation 4|דור 4"), title: t("حذاء مقاس بالمليمتر|A shoe measured in millimetres|נעל שנמדדה במילימטרים"), sub: t("كل رقم فيها جرّبناه بالمختبر قبل ما نجرّبه عالطريق.|Every number in it was tested in the lab before the road.|כל מספר בה נבדק במעבדה לפני הכביש."), cta: t("اطلب الجيل 4|Order Gen 4|להזמנת דור 4"), cta2: t("قارن الموديلات|Compare models|השוואת דגמים"), pic: "hero-lab",
        points: [
          { x: 22, y: 64, title: t("كعب 36 ملم|36 mm heel|עקב 36 מ\"מ"), text: t("امتصاص صدمة أعلى|More shock absorbed|יותר בלימת זעזועים") },
          { x: 50, y: 34, title: t("نسيج محبوك|Knit upper|עליון סרוג"), text: t("قطعة وحدة بلا خياطة|One piece, no seams|חלק אחד, בלי תפרים") },
          { x: 78, y: 70, title: t("مقدمة 28 ملم|28 mm forefoot|קדמה 28 מ\"מ"), text: t("انحدار 8 ملم|An 8 mm drop|ירידה של 8 מ\"מ") },
        ],
        numbers: [["238g", t("الوزن|Weight|משקל")], ["8mm", t("الانحدار|Drop|ירידה")], ["36mm", t("الارتفاع|Stack|גובה")], ["600km", t("العمر|Life|אורך חיים")]] }),
      P.compare(k, t("قارن الموديلات|Compare the models|השוואת הדגמים"), [
        { pic: "shoe-2", name: t("رانر برو|Runner Pro|ראנר פרו"), specs: [[t("الوزن|Weight|משקל"), "238g"], [t("الانحدار|Drop|ירידה"), "8mm"], [t("للمسافة|For|למרחק"), "5–42km"]] },
        { pic: "shoe-1", name: t("أير ستريت 1|Air Street 1|אייר סטריט 1"), specs: [[t("الوزن|Weight|משקל"), "312g"], [t("الانحدار|Drop|ירידה"), "10mm"], [t("للمسافة|For|למרחק"), "0–10km"]] },
        { pic: "shoe-4", name: t("تريل X|Trail X|טרייל X"), specs: [[t("الوزن|Weight|משקל"), "296g"], [t("الانحدار|Drop|ירידה"), "6mm"], [t("للمسافة|For|למרחק"), "5–60km"]] },
      ]),
      P.layers(k, t("من شو مصنوعة؟|What's it made of?|ממה היא עשויה?"), "detail-1", [
        { title: t("النسيج|The upper|העליון"), text: t("خيط معاد تدويره، 70٪ أخف من الجلد.|Recycled yarn, 70% lighter than leather.|חוט ממוחזר, קל ב־70% מעור.") },
        { title: t("الرغوة|The foam|הקצף"), text: t("رغوة نيتروجين بترجّع الطاقة.|Nitrogen foam that returns energy.|קצף חנקן שמחזיר אנרגיה.") },
        { title: t("الصفيحة|The plate|הלוחית"), text: t("ألياف كربون لدفعة لقدّام.|Carbon fibre for a forward push.|סיבי פחמן לדחיפה קדימה.") },
        { title: t("النعل|The outsole|הסוליה"), text: t("مطاط بيدوم 600 كيلو.|Rubber good for 600 km.|גומי שמחזיק 600 ק\"מ.") },
      ]),
      P.shelf(k, t("كل الموديلات|Every model|כל הדגמים"), S.slice(0, 8), "spec", 4, { aspect: "1 / 1" }),
      Mo.bento(k, t("المختبر بالأرقام|The lab in numbers|המעבדה במספרים"), [
        { kind: "photo", pic: "detail-1", title: t("41 اختبار لكل موديل|41 tests per model|41 בדיקות לכל דגם"), text: t("ثني، احتكاك، مي، حرارة|Flex, wear, water, heat|כיפוף, שחיקה, מים, חום"), wide: true, tall: true },
        { kind: "stat", value: t("1.2M"), label: t("خطوة بالمختبر|steps in the lab|צעדים במעבדה") },
        { kind: "stat", value: t("0"), label: t("مواد حيوانية|animal materials|חומרים מן החי") },
        { kind: "product", item: S[1] },
        { kind: "quote", text: t("كل رقم بالمواصفات مقاس، مش مكتوب.|Every number in the spec is measured, not written.|כל מספר במפרט נמדד, לא נכתב."), by: t("— فريق المختبر|— The lab team|— צוות המעבדה") },
      ], "surface"),
      P.faq(k, t("أسئلة تقنية|Technical questions|שאלות טכניות"), [
        { q: t("شو يعني الانحدار؟|What does drop mean?|מה זה ירידה?"), a: t("الفرق بين ارتفاع الكعب والمقدمة. أقل يعني خطوة أطبع.|The difference between heel and forefoot height. Lower means a more natural stride.|ההפרש בין גובה העקב לקדמה. נמוך יותר — צעד טבעי יותר.") },
        { q: t("قديش بتعيش الرغوة؟|How long does the foam last?|כמה זמן מחזיק הקצף?"), a: t("حوالي 600 كيلومتر جري.|About 600 km of running.|כ־600 ק\"מ של ריצה.") },
        SHOE_FAQ[0],
      ], "plus"),
      P.letterLine(k, t("تقارير المختبر بإيميلك|Lab reports in your inbox|דוחות המעבדה במייל")),
    ],
  },
];

export const SHOE_TEMPLATES: Template[] = GALLERY_SHOE_TEMPLATES.map((template) => ({
  ...template,
  home: (k: TK) => k.demo ? template.home(k) : merchantHome(k, template.id),
}));
