/**
 * The words templates come with, in the shop's three languages: each kind of store's own
 * (its opening, a piece it sells, its story) and the words every store shares (perks,
 * questions, policies, campaigns). Shop words speak to everyone (plural), never to one
 * gender. Pure data: the backend's test builds every template from here.
 */

export type W = { ar: string; en: string; he: string };
export const w = (ar: string, en: string, he: string): W => ({ ar, en, he });

/** The kinds of store (the shop's storeThemes ThemeFamily). */
export const FAMILIES = ["fashion", "shoes", "electronics", "gaming", "beauty", "jewelry", "books", "art", "home", "food", "kids", "sports", "pets", "flowers", "music", "general"] as const;
export type Family = (typeof FAMILIES)[number];
export const isFamily = (v: unknown): v is Family => typeof v === "string" && (FAMILIES as readonly string[]).includes(v);

/** The shop's built-in icons (backend ICON_NAMES): no drawing to carry. */
export type IconName = "heart" | "star" | "truck" | "shield" | "gift" | "phone" | "whatsapp" | "mail" | "check" | "sparkle" | "bag" | "return";

export type Pack = {
  label: W;
  /** One of the shop's built-in 3D models that suits it (storeThemes/three/kinds.ts). */
  model: string;
  icon: IconName;
  /** Its special section on a home: a 3D model, a picture with points, the steps of an order, or quotes. */
  special: "model" | "lookbook" | "steps" | "quotes";
  /** Particles that suit its playful openings (none: calm ones only). */
  particles?: "bubbles" | "hearts" | "stars" | "sparkles" | "links" | "fireflies";
  eyebrow: W;
  title: W;
  sub: W;
  cta: W;
  /** A piece it might sell. */
  product: W;
  story: W;
  collection: W;
};

export const PACKS: Record<Family, Pack> = {
  fashion: {
    label: w("أزياء", "Fashion", "אופנה"), model: "hanger", icon: "sparkle", special: "lookbook", particles: "sparkles",
    eyebrow: w("مجموعة الموسم", "The season's collection", "קולקציית העונה"),
    title: w("أناقة بتحكي عنكم", "Style that speaks for you", "סטייל שמדבר בשבילכם"),
    sub: w("قطع مختارة بعناية، بخامات ناعمة وقصّات بتدوم.", "Pieces chosen with care, in soft fabrics and cuts that last.", "פריטים שנבחרו בקפידה, בדים רכים וגזרות שנשארות."),
    cta: w("تسوّقوا المجموعة", "Shop the collection", "לקולקציה"),
    product: w("فستان كتان", "Linen dress", "שמלת פשתן"),
    story: w("بلّشنا من حب بسيط للقماش الحلو، وصرنا متجر بيلبّس آلاف الناس.", "We began with a simple love of good fabric, and now we dress thousands.", "התחלנו מאהבה פשוטה לבד טוב, והיום אנחנו מלבישים אלפים."),
    collection: w("إطلالات الصيف", "Summer looks", "לוקים של קיץ"),
  },
  shoes: {
    label: w("أحذية", "Shoes", "נעליים"), model: "sneaker", icon: "check", special: "model",
    eyebrow: w("خطوتكم الجاية", "Your next step", "הצעד הבא שלכם"),
    title: w("مريحة من أول خطوة", "Comfortable from the first step", "נוחות מהצעד הראשון"),
    sub: w("أحذية للمشي والشغل والسهرة، بمقاسات لكل العيلة.", "Shoes for walking, work and evenings out, in sizes for the whole family.", "נעליים להליכה, לעבודה ולערב, במידות לכל המשפחה."),
    cta: w("اختاروا مقاسكم", "Find your size", "למצוא מידה"),
    product: w("حذاء رياضي خفيف", "Light trainers", "סניקרס קלות"),
    story: w("منختار كل موديل بعد ما نجرّبه بحالنا.", "We pick every pair only after trying it ourselves.", "אנחנו בוחרים כל זוג רק אחרי שניסינו אותו בעצמנו."),
    collection: w("تشكيلة المشي", "The walking edit", "קולקציית ההליכה"),
  },
  electronics: {
    label: w("إلكترونيات", "Electronics", "אלקטרוניקה"), model: "phone", icon: "shield", special: "model", particles: "links",
    eyebrow: w("وصل حديثاً", "Just in", "הגיע עכשיו"),
    title: w("تقنية بتسهّل يومكم", "Tech that makes your day easier", "טכנולוגיה שמקלה על היום"),
    sub: w("أجهزة أصلية بكفالة، توصيل سريع ودعم بعد البيع.", "Genuine devices with warranty, fast delivery and after-sales support.", "מכשירים מקוריים באחריות, משלוח מהיר ותמיכה אחרי הקנייה."),
    cta: w("تسوّقوا الأجهزة", "Shop devices", "לכל המכשירים"),
    product: w("هاتف ذكي جديد", "A new smartphone", "סמארטפון חדש"),
    story: w("منفحص كل جهاز قبل ما يوصلكم، ومنضل معكم بعد الشراء.", "We test every device before it reaches you, and stay with you after.", "אנחנו בודקים כל מכשיר לפני שהוא מגיע אליכם, ונשארים איתכם גם אחרי."),
    collection: w("إكسسوارات ذكية", "Smart accessories", "אביזרים חכמים"),
  },
  gaming: {
    label: w("ألعاب فيديو", "Gaming", "גיימינג"), model: "controller", icon: "star", special: "model", particles: "stars",
    eyebrow: w("المستوى التالي", "Next level", "השלב הבא"),
    title: w("جاهزين للعبة؟", "Ready to play?", "מוכנים לשחק?"),
    sub: w("أجهزة وألعاب وإكسسوارات للاعبين الجدّيين.", "Consoles, games and gear for serious players.", "קונסולות, משחקים וציוד לגיימרים רציניים."),
    cta: w("يلا نلعب", "Let's play", "יאללה לשחק"),
    product: w("يد تحكم لاسلكية", "Wireless controller", "שלט אלחוטי"),
    story: w("نحنا لاعبين قبل ما نكون متجر، ومنعرف شو بدكم.", "We're players before we're a store, so we know what you want.", "אנחנו גיימרים לפני שאנחנו חנות, אז אנחנו יודעים מה אתם רוצים."),
    collection: w("عدّة البث", "Streaming gear", "ציוד סטרימינג"),
  },
  beauty: {
    label: w("تجميل وعناية", "Beauty", "יופי וטיפוח"), model: "perfume", icon: "sparkle", special: "quotes", particles: "bubbles",
    eyebrow: w("روتينكم الجديد", "Your new routine", "השגרה החדשה שלכם"),
    title: w("جمال طبيعي كل يوم", "Natural beauty, every day", "יופי טבעי בכל יום"),
    sub: w("عناية بالبشرة ومكياج ومنتجات أصلية من ماركات بتحبوها.", "Skincare, make-up and genuine products from brands you love.", "טיפוח, איפור ומוצרים מקוריים ממותגים שאתם אוהבים."),
    cta: w("اكتشفوا المنتجات", "Discover the products", "לגלות את המוצרים"),
    product: w("عطر الموسم", "The season's perfume", "הבושם של העונה"),
    story: w("منؤمن إنو العناية بالنفس مش رفاهية، هي عادة حلوة.", "We believe self-care isn't a luxury, it's a lovely habit.", "אנחנו מאמינים שטיפוח עצמי הוא לא מותרות, אלא הרגל טוב."),
    collection: w("عناية المسا", "Evening care", "טיפוח ערב"),
  },
  jewelry: {
    label: w("مجوهرات", "Jewellery", "תכשיטים"), model: "ring", icon: "sparkle", special: "model", particles: "sparkles",
    eyebrow: w("صُنعت لتدوم", "Made to last", "נוצר כדי להישאר"),
    title: w("لمعة لكل مناسبة", "A sparkle for every occasion", "ניצוץ לכל אירוע"),
    sub: w("ذهب وفضة وأحجار مختارة، بتغليف هدية مجاني.", "Gold, silver and chosen stones, with free gift wrapping.", "זהב, כסף ואבנים נבחרות, עם אריזת מתנה חינם."),
    cta: w("تسوّقوا القطع", "Shop the pieces", "לתכשיטים"),
    product: w("خاتم فضة", "Silver ring", "טבעת כסף"),
    story: w("كل قطعة عنّا بتنصنع بإيد حرفيين بيحبوا شغلهم.", "Each piece is made by craftspeople who love their work.", "כל תכשיט נעשה בידי אומנים שאוהבים את עבודתם."),
    collection: w("مجموعة الأعراس", "The wedding collection", "קולקציית החתונה"),
  },
  books: {
    label: w("كتب", "Books", "ספרים"), model: "book", icon: "star", special: "quotes",
    eyebrow: w("قراءات جديدة", "New reads", "קריאה חדשה"),
    title: w("كتابكم الجاي بستناكم", "Your next book is waiting", "הספר הבא שלכם מחכה"),
    sub: w("روايات وكتب أطفال وتطوير ذات، بالعربي والعبري والإنجليزي.", "Novels, children's books and self-help, in Arabic, Hebrew and English.", "רומנים, ספרי ילדים ופיתוח אישי, בערבית, בעברית ובאנגלית."),
    cta: w("تصفّحوا الكتب", "Browse the books", "לעיין בספרים"),
    product: w("رواية الشهر", "Novel of the month", "רומן החודש"),
    story: w("بلّشنا مكتبة صغيرة بالحارة، وصار عنّا قرّاء بكل البلاد.", "We began as a small neighbourhood bookshop; now we have readers everywhere.", "התחלנו כחנות ספרים שכונתית קטנה, והיום יש לנו קוראים בכל הארץ."),
    collection: w("الأكثر قراءة", "Most read", "הנקראים ביותר"),
  },
  art: {
    label: w("فن", "Art", "אמנות"), model: "frame", icon: "sparkle", special: "lookbook", particles: "fireflies",
    eyebrow: w("من المرسم", "From the studio", "מהסטודיו"),
    title: w("فن بيعطي لبيتكم روح", "Art that gives your home a soul", "אמנות שנותנת לבית נשמה"),
    sub: w("لوحات أصلية وطبعات محدودة وأدوات رسم لكل فنان.", "Original paintings, limited prints and supplies for every artist.", "ציורים מקוריים, הדפסים במהדורה מוגבלת וחומרים לכל אמן."),
    cta: w("شوفوا الأعمال", "See the works", "לעבודות"),
    product: w("طبعة محدودة", "Limited print", "הדפס במהדורה מוגבלת"),
    story: w("منشتغل مع فنانين محليين ومنوصّل شغلهم لبيوت جديدة.", "We work with local artists and bring their work to new homes.", "אנחנו עובדים עם אמנים מקומיים ומביאים את עבודתם לבתים חדשים."),
    collection: w("أعمال جديدة", "New works", "עבודות חדשות"),
  },
  home: {
    label: w("بيت وديكور", "Home", "בית ועיצוב"), model: "lamp", icon: "heart", special: "lookbook",
    eyebrow: w("بيت أدفى", "A warmer home", "בית חם יותר"),
    title: w("تفاصيل بتحلّي البيت", "Details that make a home", "פרטים שעושים בית"),
    sub: w("إضاءة وأواني وديكور بلمسة دافية لكل زاوية.", "Lighting, tableware and decor with a warm touch for every corner.", "תאורה, כלים ועיצוב עם נגיעה חמה לכל פינה."),
    cta: w("زيّنوا بيتكم", "Style your home", "לעצב את הבית"),
    product: w("أباجورة سيراميك", "Ceramic lamp", "מנורת קרמיקה"),
    story: w("منختار قطع بتعيش سنين، مش موضة موسم.", "We choose pieces that live for years, not one season's trend.", "אנחנו בוחרים פריטים שחיים שנים, לא טרנד של עונה."),
    collection: w("ركن القهوة", "The coffee corner", "פינת הקפה"),
  },
  food: {
    label: w("أكل وحلويات", "Food", "אוכל ומתוקים"), model: "cake", icon: "heart", special: "steps",
    eyebrow: w("طازة اليوم", "Fresh today", "טרי היום"),
    title: w("طعم البيت لباب بيتكم", "The taste of home, to your door", "טעם של בית, עד הדלת"),
    sub: w("حلويات ومخبوزات ومونة منعملها كل يوم بمكونات طبيعية.", "Sweets, bakes and pantry goods made daily from natural ingredients.", "מתוקים, מאפים ומזווה שאנחנו מכינים כל יום ממרכיבים טבעיים."),
    cta: w("اطلبوا هلّق", "Order now", "להזמין עכשיו"),
    product: w("كيكة الاحتفال", "Celebration cake", "עוגת חגיגה"),
    story: w("وصفات ستّي، بمطبخ نضيف وإيدين بتحب الشغل.", "Grandma's recipes, a clean kitchen and hands that love the work.", "המתכונים של סבתא, מטבח נקי וידיים שאוהבות את העבודה."),
    collection: w("صواني المناسبات", "Party platters", "מגשי אירוח"),
  },
  kids: {
    label: w("أطفال", "Kids", "ילדים"), model: "teddy", icon: "heart", special: "model", particles: "bubbles",
    eyebrow: w("للصغار", "For little ones", "לקטנטנים"),
    title: w("لعب وضحك كل يوم", "Play and laughter every day", "משחק וצחוק בכל יום"),
    sub: w("ألعاب آمنة وملابس ناعمة وهدايا بتفرّح الصغار والكبار.", "Safe toys, soft clothes and gifts that delight young and old.", "צעצועים בטוחים, בגדים רכים ומתנות שמשמחות קטנים וגדולים."),
    cta: w("تسوّقوا للصغار", "Shop for kids", "לקנות לילדים"),
    product: w("دبدوب قطن", "Cotton teddy", "דובי כותנה"),
    story: w("كأهالي، منختار كل لعبة كأنها لولادنا.", "As parents, we choose every toy as if for our own children.", "כהורים, אנחנו בוחרים כל צעצוע כאילו הוא לילדים שלנו."),
    collection: w("هدايا الولادة", "Newborn gifts", "מתנות ללידה"),
  },
  sports: {
    label: w("رياضة", "Sports", "ספורט"), model: "dumbbell", icon: "star", special: "model",
    eyebrow: w("يلا نتحرّك", "Let's move", "יאללה לזוז"),
    title: w("أقوى كل يوم", "Stronger every day", "חזקים יותר בכל יום"),
    sub: w("ملابس ومعدّات رياضية للتمرين بالبيت والنادي والملعب.", "Sportswear and gear for home, gym and pitch.", "בגדים וציוד ספורט לבית, לחדר הכושר ולמגרש."),
    cta: w("جهّزوا حالكم", "Gear up", "להצטייד"),
    product: w("دمبل قابل للتعديل", "Adjustable dumbbell", "משקולת מתכווננת"),
    story: w("منحب الرياضة، ومنجرّب كل منتج بتمريننا قبل ما نبيعه.", "We love sport, and test every product in our own training first.", "אנחנו אוהבים ספורט ובודקים כל מוצר באימונים שלנו לפני שמוכרים אותו."),
    collection: w("عدّة الجري", "Running kit", "ציוד ריצה"),
  },
  pets: {
    label: w("حيوانات أليفة", "Pets", "חיות מחמד"), model: "bone", icon: "heart", special: "quotes", particles: "hearts",
    eyebrow: w("لأصحابنا الصغار", "For our little friends", "לחברים הקטנים שלנו"),
    title: w("كل إشي لحيوانكم المدلّل", "Everything for your favourite pet", "הכול לחיית המחמד האהובה"),
    sub: w("أكل صحي وألعاب ومستلزمات عناية للقطط والكلاب.", "Healthy food, toys and care for cats and dogs.", "מזון בריא, צעצועים וטיפוח לחתולים ולכלבים."),
    cta: w("تسوّقوا لحيوانكم", "Shop for your pet", "לקנות לחיית המחמד"),
    product: w("عظمة مضغ طبيعية", "Natural chew bone", "עצם לעיסה טבעית"),
    story: w("عنّا قطتين وكلب، وهنّي أول مين بيجرّب كل منتج.", "We have two cats and a dog, and they test every product first.", "יש לנו שני חתולים וכלב, והם הראשונים שבודקים כל מוצר."),
    collection: w("ألعاب ونشاط", "Toys and play", "צעצועים ומשחק"),
  },
  flowers: {
    label: w("ورد ونباتات", "Flowers", "פרחים וצמחים"), model: "vase", icon: "heart", special: "steps", particles: "fireflies",
    eyebrow: w("طازة من المشتل", "Fresh from the nursery", "טרי מהמשתלה"),
    title: w("ورد بيحكي اللي ما بينقال", "Flowers say what words can't", "פרחים אומרים מה שמילים לא"),
    sub: w("باقات ونباتات بتوصل بنفس اليوم، مع كرت بإسمكم.", "Bouquets and plants delivered the same day, with a card in your name.", "זרים וצמחים במשלוח באותו היום, עם כרטיס בשמכם."),
    cta: w("اختاروا باقة", "Choose a bouquet", "לבחור זר"),
    product: w("باقة جوري", "Rose bouquet", "זר ורדים"),
    story: w("منرتّب كل باقة بإيدينا الصبح، وبتوصل وهي بعدها فايحة.", "We arrange every bouquet by hand each morning, so it arrives fresh.", "אנחנו מסדרים כל זר בעבודת יד בבוקר, כדי שיגיע טרי."),
    collection: w("باقات المناسبات", "Occasion bouquets", "זרים לאירועים"),
  },
  music: {
    label: w("موسيقى", "Music", "מוזיקה"), model: "guitar", icon: "star", special: "model", particles: "links",
    eyebrow: w("صوت أحلى", "Better sound", "סאונד טוב יותר"),
    title: w("خلّوا الموسيقى تحكي", "Let the music speak", "תנו למוזיקה לדבר"),
    sub: w("آلات وأسطوانات ومعدّات صوت للمبتدئين والمحترفين.", "Instruments, records and audio gear for beginners and pros.", "כלים, תקליטים וציוד סאונד למתחילים ולמקצוענים."),
    cta: w("اكتشفوا الآلات", "Explore instruments", "לגלות כלים"),
    product: w("جيتار أكوستيك", "Acoustic guitar", "גיטרה אקוסטית"),
    story: w("عازفين بيبيعوا لعازفين، ومنضبط كل آلة قبل ما تطلع.", "Musicians selling to musicians; we set up every instrument before it ships.", "מוזיקאים שמוכרים למוזיקאים; אנחנו מכווננים כל כלי לפני שהוא יוצא."),
    collection: w("ركن الفينيل", "The vinyl corner", "פינת הוויניל"),
  },
  general: {
    label: w("متجر عام", "General store", "חנות כללית"), model: "handbag", icon: "bag", special: "quotes",
    eyebrow: w("كل اللي بدكم ياه", "Everything you need", "כל מה שצריך"),
    title: w("تسوّق أسهل، أسعار أحلى", "Easier shopping, better prices", "קנייה קלה, מחירים טובים"),
    sub: w("آلاف المنتجات لكل يوم، بتوصل لباب البيت.", "Thousands of everyday products, delivered to your door.", "אלפי מוצרים לכל יום, עד הדלת."),
    cta: w("تسوّقوا هلّق", "Shop now", "לקנות עכשיו"),
    product: w("منتج الأسبوع", "Product of the week", "מוצר השבוע"),
    story: w("متجر صغير بقلب كبير: منختار الأحسن بأحسن سعر.", "A small store with a big heart: the best at the best price.", "חנות קטנה עם לב גדול: הכי טוב במחיר הכי טוב."),
    collection: w("عروض الأسبوع", "This week's deals", "מבצעי השבוע"),
  },
};

/* ------------------------------------------------------------ shared words */

export const C = {
  storeName: w("اسم المتجر", "Store name", "שם החנות"),
  shop: w("تسوّقوا هلّق", "Shop now", "לקנות עכשיו"),
  more: w("اعرفوا أكتر", "Learn more", "לפרטים נוספים"),
  all: w("شوفوا الكل", "See everything", "לראות הכול"),
  contactUs: w("تواصلوا معنا", "Contact us", "צרו קשר"),
  ourStory: w("قصتنا", "Our story", "הסיפור שלנו"),
  newIn: w("وصل جديد", "New in", "חדש בחנות"),
  best: w("الأكثر مبيعاً", "Best sellers", "רבי מכר"),
  byCategory: w("تسوّقوا حسب القسم", "Shop by category", "לפי קטגוריה"),
  picked: w("اخترنالكم", "Picked for you", "בחרנו בשבילכם"),
  why: w("ليش تختارونا؟", "Why choose us?", "למה לבחור בנו?"),
  said: w("شو حكوا عنّا", "What people say", "מה אומרים עלינו"),
  questions: w("أسئلة بتتكرر", "Common questions", "שאלות נפוצות"),
  team: w("الناس ورا المتجر", "The people behind the store", "האנשים מאחורי החנות"),
  brands: w("ماركات منشتغل معها", "Brands we carry", "המותגים שלנו"),
  howItWorks: w("كيف بتشتغل؟", "How it works", "איך זה עובד?"),
  numbers: w("أرقامنا", "In numbers", "במספרים"),
  join: w("انضمّوا لقائمتنا", "Join our list", "הצטרפו לרשימה"),
  joinSub: w("عروض قبل الكل، وقطع جديدة كل أسبوع. بدون إزعاج.", "Offers before anyone else and new pieces every week. No spam.", "מבצעים לפני כולם ופריטים חדשים כל שבוע. בלי ספאם."),
  follow: w("تابعونا", "Follow us", "עקבו אחרינו"),
  visit: w("زورونا", "Visit us", "בואו לבקר"),
  address: w("شارع الكرمل 12، الناصرة", "12 Carmel St, Nazareth", "רחוב הכרמל 12, נצרת"),
  hours: w("من السبت للخميس، 9 الصبح لـ 8 المسا", "Saturday to Thursday, 9am to 8pm", "שבת עד חמישי, 9:00 עד 20:00"),
  phoneLine: w("تلفون وواتساب: 050-000-0000", "Phone and WhatsApp: 050-000-0000", "טלפון ווואטסאפ: 050-000-0000"),
  mailLine: w("hello@example.com", "hello@example.com", "hello@example.com"),
  writeUs: w("ابعتولنا رسالة", "Send us a message", "שלחו לנו הודעה"),
  writeSub: w("منرد خلال يوم عمل واحد.", "We reply within one working day.", "אנחנו עונים תוך יום עסקים אחד."),
  details: w("التفاصيل", "The details", "הפרטים"),
  look: w("تسوّقوا الإطلالة", "Shop the look", "לקנות את הלוק"),
  watch: w("شوفوا الفيديو", "Watch the film", "לצפות בסרטון"),
  compare: w("قبل وبعد", "Before and after", "לפני ואחרי"),
  plans: w("اختاروا الباقة", "Choose a bundle", "בחרו חבילה"),
  ends: w("العرض بيخلص بعد", "The offer ends in", "המבצע נגמר בעוד"),
  started: w("بلّش العرض!", "The offer is on!", "המבצע התחיל!"),
  code: w("الكود", "Code", "קוד"),
  welcome: w("أهلاً فيكم", "Welcome", "ברוכים הבאים"),
  firstOrder: w("خصم 10٪ على أول طلب", "10% off your first order", "10% הנחה על ההזמנה הראשונה"),
  firstOrderSub: w("استعملوا الكود WELCOME10 عند الدفع.", "Use the code WELCOME10 at checkout.", "השתמשו בקוד WELCOME10 בתשלום."),
  waitStay: w("لحظة، قبل ما تروحوا!", "Wait, before you go!", "רגע, לפני שאתם הולכים!"),
  waitSub: w("خدوا توصيل مجاني على طلبكم اليوم.", "Take free delivery on your order today.", "קחו משלוח חינם על ההזמנה היום."),
  notFound: w("الصفحة مش موجودة", "This page isn't here", "הדף לא נמצא"),
  notFoundSub: w("يمكن انتقلت أو انكتب الرابط غلط. خلّينا نرجّعكم للمتجر.", "It may have moved, or the link is mistyped. Let's get you back to the store.", "אולי הוא עבר, או שהקישור שגוי. בואו נחזור לחנות."),
  home: w("للصفحة الرئيسية", "Back home", "לדף הבית"),
  soon: w("قريباً جداً", "Coming very soon", "בקרוב מאוד"),
  soonSub: w("منحضّر لإشي حلو. سجّلوا لتعرفوا أول ما نفتح.", "We're getting something lovely ready. Sign up to hear the moment we open.", "אנחנו מכינים משהו יפה. הירשמו כדי לשמוע ברגע שנפתח."),
  sizes: w("دليل المقاسات", "Size guide", "מדריך מידות"),
  sizesSub: w("قيسوا حالكم مرة، واختاروا مقاسكم بثقة.", "Measure once, then choose your size with confidence.", "מודדים פעם אחת ובוחרים מידה בביטחון."),
  shipping: w("الشحن والإرجاع", "Delivery and returns", "משלוחים והחזרות"),
  shippingSub: w("كل اللي لازم تعرفوه عن وصول طلبكم وإرجاعه.", "Everything to know about your order arriving, and sending it back.", "כל מה שצריך לדעת על הגעת ההזמנה ועל החזרתה."),
  gifts: w("دليل الهدايا", "Gift guide", "מדריך מתנות"),
  giftsSub: w("هدية لكل حدا ولكل ميزانية.", "A gift for everyone, and every budget.", "מתנה לכל אחד ולכל תקציב."),
  about: w("مين نحنا", "About us", "מי אנחנו"),
  values: w("اللي منؤمن فيه", "What we believe in", "במה אנחנו מאמינים"),
  launch: w("إطلاق جديد", "New launch", "השקה חדשה"),
  preorder: w("اطلبوه قبل الكل", "Order it before anyone", "הזמינו לפני כולם"),
  links: w("كل روابطنا", "All our links", "כל הקישורים שלנו"),
  wholesale: w("للتجّار والجملة", "Wholesale and trade", "סיטונאות ועסקים"),
  wholesaleSub: w("أسعار خاصة للمحلات والشركات، وتوصيل لكل البلاد.", "Special prices for shops and companies, with delivery nationwide.", "מחירים מיוחדים לחנויות ולחברות, עם משלוח לכל הארץ."),
  loyalty: w("نادي الزباين", "The members' club", "מועדון הלקוחות"),
  loyaltySub: w("نقاط على كل طلب، وهدايا بعيد ميلادكم.", "Points on every order, and a gift on your birthday.", "נקודות על כל הזמנה ומתנה ביום ההולדת."),
};

/** Perks: a title and a line each, with an icon. */
export const PERKS: Array<{ icon: IconName; title: W; text: W }> = [
  { icon: "truck", title: w("توصيل سريع", "Fast delivery", "משלוח מהיר"), text: w("لباب البيت خلال 2–4 أيام عمل.", "To your door in 2–4 working days.", "עד הבית תוך 2–4 ימי עסקים.") },
  { icon: "return", title: w("إرجاع سهل", "Easy returns", "החזרה קלה"), text: w("14 يوم لترجعوا أو تبدّلوا.", "14 days to return or exchange.", "14 יום להחזרה או להחלפה.") },
  { icon: "shield", title: w("دفع آمن", "Secure payment", "תשלום מאובטח"), text: w("بطاقة أو كاش عند الاستلام.", "Card, or cash on delivery.", "בכרטיס או במזומן במסירה.") },
  { icon: "gift", title: w("تغليف هدية", "Gift wrapping", "אריזת מתנה"), text: w("مع كرت بكلمتكم، ببلاش.", "With a card in your words, free.", "עם כרטיס במילים שלכם, בחינם.") },
  { icon: "whatsapp", title: w("نحنا معكم", "Here for you", "אנחנו כאן בשבילכם"), text: w("جاوبنا عالواتساب بكل وقت.", "Ask us on WhatsApp anytime.", "שאלו אותנו בוואטסאפ בכל זמן.") },
  { icon: "star", title: w("جودة مضمونة", "Quality you can trust", "איכות מובטחת"), text: w("منفحص كل قطعة قبل ما تطلع.", "We check every piece before it ships.", "אנחנו בודקים כל פריט לפני המשלוח.") },
];

export const STATS: Array<{ n: W; label: W }> = [
  { n: w("+12,000", "12,000+", "12,000+"), label: w("زبون مبسوط", "happy customers", "לקוחות מרוצים") },
  { n: w("4.9", "4.9", "4.9"), label: w("تقييم الزباين", "customer rating", "דירוג לקוחות") },
  { n: w("48", "48", "48"), label: w("ساعة للتوصيل", "hours to delivery", "שעות למשלוח") },
  { n: w("100٪", "100%", "100%"), label: w("منتجات أصلية", "genuine products", "מוצרים מקוריים") },
];

export const STEPS: Array<{ title: W; text: W }> = [
  { title: w("اختاروا", "Choose", "בוחרים"), text: w("تصفّحوا وحطّوا اللي عجبكم بالسلة.", "Browse and put what you like in the bag.", "מעיינים ומוסיפים לסל את מה שאהבתם.") },
  { title: w("اطلبوا", "Order", "מזמינים"), text: w("ادفعوا بالبطاقة أو كاش عند الاستلام.", "Pay by card, or cash on delivery.", "משלמים בכרטיס או במזומן במסירה.") },
  { title: w("استلموا", "Receive", "מקבלים"), text: w("بيوصلكم لباب البيت مغلّف بعناية.", "It reaches your door, carefully wrapped.", "זה מגיע עד הדלת, ארוז בקפידה.") },
];

export const VALUES: Array<{ icon: IconName; title: W; text: W }> = [
  { icon: "heart", title: w("بحب", "With care", "באהבה"), text: w("كل طلب منحضّره كأنو هدية.", "We prepare every order like a gift.", "כל הזמנה מוכנה כמו מתנה.") },
  { icon: "check", title: w("بصدق", "Honestly", "ביושר"), text: w("أسعار واضحة وصور حقيقية.", "Clear prices and real photos.", "מחירים ברורים ותמונות אמיתיות.") },
  { icon: "sparkle", title: w("بإتقان", "With craft", "בקפידה"), text: w("منختار الأحسن، مش الأرخص.", "We choose the best, not the cheapest.", "אנחנו בוחרים את הטוב, לא את הזול.") },
];

export const SHIPPING_QA: Array<[W, W]> = [
  [w("قديش بياخد التوصيل؟", "How long does delivery take?", "כמה זמן לוקח המשלוח?"), w("من يومين لأربع أيام عمل لكل البلاد، ونفس اليوم بالمنطقة القريبة.", "Two to four working days nationwide, the same day nearby.", "שניים עד ארבעה ימי עסקים לכל הארץ, ובאותו היום באזור הקרוב.")],
  [w("قديش سعر التوصيل؟", "How much is delivery?", "כמה עולה משלוח?"), w("₪25، ومجاني فوق ₪200.", "₪25, and free over ₪200.", "₪25, וחינם מעל ₪200.")],
  [w("كيف برجّع أو ببدّل؟", "How do I return or exchange?", "איך מחזירים או מחליפים?"), w("خلال 14 يوم من الاستلام، والقطعة بحالتها الأصلية مع الفاتورة.", "Within 14 days of delivery, unused and with the receipt.", "תוך 14 יום מהקבלה, במצב מקורי ועם הקבלה.")],
  [w("إمتى بيرجعلي المبلغ؟", "When do I get my money back?", "מתי מקבלים את הכסף בחזרה?"), w("خلال 5 أيام عمل من وصول القطعة لعنّا.", "Within 5 working days of the piece reaching us.", "תוך 5 ימי עסקים מרגע שהפריט מגיע אלינו.")],
  [w("بتوصلوا لبرّا البلاد؟", "Do you ship abroad?", "שולחים לחו״ל?"), w("مش هلّق، بس قريباً إن شاء الله.", "Not yet, but soon.", "עדיין לא, אבל בקרוב.")],
];

export const SIZE_TABS: Array<[W, W]> = [
  [w("نسائي", "Women", "נשים"), w("S: صدر 84–88 سم\nM: صدر 89–94 سم\nL: صدر 95–100 سم\nXL: صدر 101–106 سم", "S: chest 84–88 cm\nM: chest 89–94 cm\nL: chest 95–100 cm\nXL: chest 101–106 cm", "S: חזה 84–88 ס״מ\nM: חזה 89–94 ס״מ\nL: חזה 95–100 ס״מ\nXL: חזה 101–106 ס״מ")],
  [w("رجالي", "Men", "גברים"), w("S: صدر 90–95 سم\nM: صدر 96–101 سم\nL: صدر 102–107 سم\nXL: صدر 108–113 سم", "S: chest 90–95 cm\nM: chest 96–101 cm\nL: chest 102–107 cm\nXL: chest 108–113 cm", "S: חזה 90–95 ס״מ\nM: חזה 96–101 ס״מ\nL: חזה 102–107 ס״מ\nXL: חזה 108–113 ס״מ")],
  [w("أطفال", "Kids", "ילדים"), w("2–3 سنين: طول 92–98 سم\n4–5 سنين: 104–110 سم\n6–7 سنين: 116–122 سم\n8–9 سنين: 128–134 سم", "2–3 years: height 92–98 cm\n4–5 years: 104–110 cm\n6–7 years: 116–122 cm\n8–9 years: 128–134 cm", "2–3 שנים: גובה 92–98 ס״מ\n4–5 שנים: 104–110 ס״מ\n6–7 שנים: 116–122 ס״מ\n8–9 שנים: 128–134 ס״מ")],
  [w("أحذية", "Shoes", "נעליים"), w("37: قدم 23.5 سم\n38: 24 سم\n39: 25 سم\n40: 25.5 سم\n41: 26.5 سم\n42: 27 سم", "37: foot 23.5 cm\n38: 24 cm\n39: 25 cm\n40: 25.5 cm\n41: 26.5 cm\n42: 27 cm", "37: כף רגל 23.5 ס״מ\n38: 24 ס״מ\n39: 25 ס״מ\n40: 25.5 ס״מ\n41: 26.5 ס״מ\n42: 27 ס״מ")],
];

export const MEASURE: Array<[W, W]> = [
  [w("كيف بقيس الصدر؟", "How do I measure my chest?", "איך מודדים חזה?"), w("حطّوا المتر حوالين أعرض نقطة بالصدر، تحت الإبط، بدون شد.", "Put the tape around the fullest part of the chest, under the arms, without pulling.", "מניחים את סרט המדידה סביב החלק הרחב של החזה, מתחת לבית השחי, בלי למתוח.")],
  [w("بين مقاسين؟", "Between two sizes?", "בין שתי מידות?"), w("اختاروا الأكبر إذا بتحبوا اللبس الواسع، والأصغر للقصّة المحددة.", "Choose the larger for a loose fit, the smaller for a closer cut.", "בחרו את הגדולה לגזרה רחבה, ואת הקטנה לגזרה צמודה.")],
  [w("ما ضبط المقاس؟", "The size isn't right?", "המידה לא מתאימה?"), w("التبديل ببلاش خلال 14 يوم.", "Exchanges are free within 14 days.", "החלפה בחינם תוך 14 יום.")],
];

export const BUDGETS: Array<{ title: W; text: W; href: string }> = [
  { title: w("أقل من ₪100", "Under ₪100", "עד ₪100"), text: w("هدايا صغيرة بتفرّح.", "Small gifts that bring a smile.", "מתנות קטנות שמשמחות."), href: "/shop?sort=price" },
  { title: w("أقل من ₪250", "Under ₪250", "עד ₪250"), text: w("للأصحاب والعيلة.", "For friends and family.", "לחברים ולמשפחה."), href: "/shop" },
  { title: w("هدايا فخمة", "Luxury gifts", "מתנות יוקרה"), text: w("للمناسبات الكبيرة.", "For the big occasions.", "לאירועים הגדולים."), href: "/shop?sort=price-desc" },
];

export const LINKS_MAIN: Array<[W, string]> = [
  [w("كل القطع", "Everything", "הכול"), "/shop"],
  [w("وصل جديد", "New in", "חדש"), "/shop?sort=new"],
  [w("من نحن", "About us", "עלינו"), "/about"],
  [w("تواصل", "Contact", "צור קשר"), "/contact"],
];
export const LINKS_HELP: Array<[W, string]> = [
  [w("الشحن والإرجاع", "Delivery and returns", "משלוחים והחזרות"), "/policies"],
  [w("الأسئلة الشائعة", "Questions", "שאלות נפוצות"), "/faq"],
  [w("حسابي", "My account", "החשבון שלי"), "/account"],
];
export const LINKS_SOCIAL: Array<[W, string]> = [
  [w("إنستغرام", "Instagram", "אינסטגרם"), "https://instagram.com/"],
  [w("فيسبوك", "Facebook", "פייסבוק"), "https://facebook.com/"],
  [w("تيك توك", "TikTok", "טיקטוק"), "https://tiktok.com/"],
];

export const RUNNING: W[] = [
  w("شحن مجاني فوق ₪200", "Free delivery over ₪200", "משלוח חינם מעל ₪200"),
  w("إرجاع خلال 14 يوم", "Returns within 14 days", "החזרה תוך 14 יום"),
  w("دفع آمن", "Secure payment", "תשלום מאובטח"),
  w("تغليف هدية ببلاش", "Free gift wrapping", "אריזת מתנה חינם"),
];

/* ---------------------------------------------------------------- campaigns */

export type Campaign = {
  key: string;
  name: W;
  title: W;
  sub: W;
  /** The running line of its strip. */
  strip: W;
  /** Its own colours: the background, the words on it, and what stands out. */
  colors: { bg: string; fg: string; pop: string };
  particles?: "snow" | "stars" | "bubbles" | "confetti" | "hearts" | "sparkles" | "fireflies" | "links";
  /** What kind of moment it is (the gallery's filter). */
  kind: "holiday" | "sale" | "season" | "launch" | "store";
};

const cp = (key: string, kind: Campaign["kind"], name: W, title: W, sub: W, strip: W, colors: Campaign["colors"], particles?: Campaign["particles"]): Campaign => ({ key, kind, name, title, sub, strip, colors, ...(particles ? { particles } : {}) });

export const CAMPAIGNS: Campaign[] = [
  cp("ramadan", "holiday", w("رمضان", "Ramadan", "רמדאן"), w("رمضان كريم", "Ramadan Kareem", "רמדאן כרים"), w("سهراتكم أحلى مع تشكيلة رمضان، وتوصيل قبل الفطور.", "Make your evenings lovelier with the Ramadan edit, delivered before iftar.", "ערבים יפים יותר עם קולקציית הרמדאן, במשלוח לפני האיפטאר."), w("عروض رمضان لكل الشهر", "Ramadan offers all month long", "מבצעי רמדאן כל החודש"), { bg: "#1d2a4d", fg: "#fdf6e3", pop: "#e2b857" }, "stars"),
  cp("eid-fitr", "holiday", w("عيد الفطر", "Eid al-Fitr", "עיד אל-פיטר"), w("عيدكم مبارك", "Eid Mubarak", "עיד מובארכ"), w("لبسة العيد وهداياه، كلها بمكان واحد.", "Eid outfits and gifts, all in one place.", "בגדי חג ומתנות, הכול במקום אחד."), w("خصم العيد لحد 30٪", "Eid sale: up to 30% off", "מבצע חג: עד 30% הנחה"), { bg: "#0f5c4d", fg: "#fffaf0", pop: "#f2c94c" }, "sparkles"),
  cp("eid-adha", "holiday", w("عيد الأضحى", "Eid al-Adha", "עיד אל-אדחא"), w("أضحى مبارك", "Blessed Eid al-Adha", "עיד אל-אדחא מבורך"), w("هدايا العيد للعيلة كلها، بتغليف خاص.", "Eid gifts for the whole family, specially wrapped.", "מתנות חג לכל המשפחה, באריזה מיוחדת."), w("توصيل قبل العيد لكل البلاد", "Delivery before Eid, nationwide", "משלוח לפני החג לכל הארץ"), { bg: "#4a2c1d", fg: "#fff8ee", pop: "#e0b25b" }, "sparkles"),
  cp("christmas", "holiday", w("الميلاد", "Christmas", "חג המולד"), w("ميلاد مجيد", "Merry Christmas", "חג מולד שמח"), w("هدايا تحت الشجرة لكل اللي بتحبوهم.", "Gifts under the tree for everyone you love.", "מתנות מתחת לעץ לכל מי שאתם אוהבים."), w("تغليف هدايا الميلاد ببلاش", "Free Christmas gift wrapping", "אריזת מתנות חג חינם"), { bg: "#7f1d1d", fg: "#fff7ed", pop: "#4ade80" }, "snow"),
  cp("new-year", "holiday", w("رأس السنة", "New Year", "השנה החדשה"), w("سنة جديدة حلوة", "A lovely new year", "שנה חדשה ויפה"), w("ابدأوا السنة بإشي جديد إلكم.", "Start the year with something new for you.", "התחילו את השנה עם משהו חדש בשבילכם."), w("عروض آخر السنة", "Year-end offers", "מבצעי סוף שנה"), { bg: "#111827", fg: "#f9fafb", pop: "#fbbf24" }, "confetti"),
  cp("valentine", "holiday", w("عيد الحب", "Valentine's Day", "יום האהבה"), w("هدية من القلب", "A gift from the heart", "מתנה מהלב"), w("أفكار هدايا لعيد الحب، بتوصل بالوقت.", "Valentine's gift ideas, delivered on time.", "רעיונות למתנות ליום האהבה, שמגיעות בזמן."), w("كرت حب ببلاش مع كل طلب", "A free love note with every order", "פתק אהבה חינם עם כל הזמנה"), { bg: "#9d174d", fg: "#fff1f2", pop: "#fda4af" }, "hearts"),
  cp("mothers-day", "holiday", w("عيد الأم", "Mother's Day", "יום האם"), w("لأحلى أم", "For the best mum", "לאמא הכי טובה"), w("هدايا بتقول شكراً، بتوصل لعندها مع كرت منكم.", "Gifts that say thank you, delivered to her with your card.", "מתנות שאומרות תודה, עד אליה עם כרטיס מכם."), w("هدايا عيد الأم بخصم 15٪", "Mother's Day gifts, 15% off", "מתנות ליום האם ב-15% הנחה"), { bg: "#fce7f3", fg: "#831843", pop: "#db2777" }, "hearts"),
  cp("fathers-day", "holiday", w("عيد الأب", "Father's Day", "יום האב"), w("لأبوي البطل", "For our hero, Dad", "לאבא הגיבור"), w("هدايا عملية وأنيقة لكل الآباء.", "Practical, stylish gifts for every dad.", "מתנות שימושיות ואלגנטיות לכל אבא."), w("توصيل مجاني لهدايا عيد الأب", "Free delivery on Father's Day gifts", "משלוח חינם למתנות יום האב"), { bg: "#1e3a5f", fg: "#f0f9ff", pop: "#7dd3fc" }),
  cp("womens-day", "holiday", w("يوم المرأة", "Women's Day", "יום האישה"), w("لكل امرأة ملهمة", "For every inspiring woman", "לכל אישה מעוררת השראה"), w("احتفلوا فيها بهدية بتشبهها.", "Celebrate her with a gift that's just like her.", "חגגו אותה עם מתנה שמתאימה לה."), w("عرض يوم المرأة", "Women's Day offer", "מבצע יום האישה"), { bg: "#581c87", fg: "#faf5ff", pop: "#e9d5ff" }, "sparkles"),
  cp("black-friday", "sale", w("الجمعة السودا", "Black Friday", "בלאק פריידי"), w("أكبر تخفيضات السنة", "The biggest sale of the year", "המבצע הגדול של השנה"), w("خصومات لحد 50٪ على كل المتجر، لفترة محدودة.", "Up to 50% off the whole store, for a limited time.", "עד 50% הנחה על כל החנות, לזמן מוגבל."), w("الجمعة السودا · لحد 50٪", "Black Friday · up to 50% off", "בלאק פריידי · עד 50%"), { bg: "#0a0a0a", fg: "#fafafa", pop: "#facc15" }),
  cp("white-friday", "sale", w("الجمعة البيضا", "White Friday", "וייט פריידי"), w("الجمعة البيضا", "White Friday", "וייט פריידי"), w("عروض نضيفة وأسعار أنضف.", "Clean offers, cleaner prices.", "מבצעים נקיים, מחירים נקיים עוד יותר."), w("خصومات الجمعة البيضا", "White Friday deals", "מבצעי וייט פריידי"), { bg: "#ffffff", fg: "#111111", pop: "#2563eb" }, "sparkles"),
  cp("cyber-monday", "sale", w("سايبر مندي", "Cyber Monday", "סייבר מאנדיי"), w("سايبر مندي", "Cyber Monday", "סייבר מאנדיי"), w("عروض أونلاين بس، ليوم واحد.", "Online-only deals, for one day.", "מבצעים אונליין בלבד, ליום אחד."), w("يوم واحد بس", "One day only", "יום אחד בלבד"), { bg: "#0b1e3f", fg: "#e0f2fe", pop: "#22d3ee" }, "links"),
  cp("singles-day", "sale", w("11.11", "11.11", "11.11"), w("عروض 11.11", "11.11 deals", "מבצעי 11.11"), w("يوم العروض العالمي وصل لعنّا.", "The world's deals day is here.", "יום המבצעים העולמי הגיע אלינו."), w("11.11 · خصم على كل إشي", "11.11 · something off everything", "11.11 · הנחה על הכול"), { bg: "#ea580c", fg: "#fff7ed", pop: "#fde047" }, "confetti"),
  cp("double-twelve", "sale", w("12.12", "12.12", "12.12"), w("عروض 12.12", "12.12 deals", "מבצעי 12.12"), w("آخر فرصة للعروض الكبيرة قبل آخر السنة.", "The last big deals before the year ends.", "ההזדמנות האחרונה למבצעים גדולים לפני סוף השנה."), w("12.12 · خصومات مضاعفة", "12.12 · double discounts", "12.12 · הנחות כפולות"), { bg: "#b91c1c", fg: "#fef2f2", pop: "#fde68a" }, "confetti"),
  cp("back-to-school", "season", w("العودة للمدارس", "Back to school", "חזרה לבית הספר"), w("جاهزين للمدرسة؟", "Ready for school?", "מוכנים לבית הספר?"), w("كل اللي بيلزم الطلاب بمكان واحد.", "Everything students need, in one place.", "כל מה שתלמידים צריכים, במקום אחד."), w("عروض العودة للمدارس", "Back-to-school offers", "מבצעי חזרה ללימודים"), { bg: "#fde047", fg: "#1e3a8a", pop: "#1d4ed8" }),
  cp("summer-sale", "season", w("تخفيضات الصيف", "Summer sale", "מבצע קיץ"), w("صيف أحلى بأسعار أحلى", "A better summer at better prices", "קיץ טוב יותר במחירים טובים יותר"), w("خصومات لحد 40٪ على تشكيلة الصيف.", "Up to 40% off the summer edit.", "עד 40% הנחה על קולקציית הקיץ."), w("تخفيضات الصيف بلّشت", "The summer sale is on", "מבצע הקיץ התחיל"), { bg: "#0369a1", fg: "#f0f9ff", pop: "#fbbf24" }, "bubbles"),
  cp("winter-sale", "season", w("تخفيضات الشتا", "Winter sale", "מבצע חורף"), w("دفا الشتا بخصم", "Winter warmth, on sale", "חום החורף, במבצע"), w("قطع الشتا بأسعار بتدفّي القلب.", "Winter pieces at heart-warming prices.", "פריטי חורף במחירים שמחממים את הלב."), w("خصم الشتا لحد 40٪", "Winter sale: up to 40% off", "מבצע חורף: עד 40%"), { bg: "#e0f2fe", fg: "#0c4a6e", pop: "#0284c7" }, "snow"),
  cp("end-of-season", "season", w("نهاية الموسم", "End of season", "סוף עונה"), w("آخر قطع الموسم", "The season's last pieces", "הפריטים האחרונים של העונה"), w("لما بتخلص، بتخلص. الحقوا مقاسكم.", "When they're gone, they're gone. Catch your size.", "כשנגמר, נגמר. תפסו את המידה שלכם."), w("نهاية الموسم · لحد 60٪", "End of season · up to 60% off", "סוף עונה · עד 60%"), { bg: "#3f2a1d", fg: "#fff7ed", pop: "#fb923c" }),
  cp("spring", "season", w("مجموعة الربيع", "Spring collection", "קולקציית אביב"), w("الربيع وصل", "Spring is here", "האביב הגיע"), w("ألوان فاتحة وقطع خفيفة لأيام أحلى.", "Light colours and airy pieces for brighter days.", "צבעים בהירים ופריטים קלילים לימים יפים."), w("مجموعة الربيع الجديدة", "The new spring collection", "קולקציית האביב החדשה"), { bg: "#ecfdf5", fg: "#14532d", pop: "#16a34a" }, "fireflies"),
  cp("autumn", "season", w("مجموعة الخريف", "Autumn collection", "קולקציית סתיו"), w("ألوان الخريف", "Autumn colours", "צבעי הסתיו"), w("دفا ناعم وألوان دافية للموسم الجديد.", "Soft warmth and warm colours for the new season.", "חום רך וצבעים חמים לעונה החדשה."), w("وصلت مجموعة الخريف", "The autumn collection is in", "קולקציית הסתיו הגיעה"), { bg: "#431407", fg: "#fff7ed", pop: "#f59e0b" }),
  cp("launch", "launch", w("إطلاق منتج", "Product launch", "השקת מוצר"), w("وصل أخيراً", "It's finally here", "זה סוף סוף כאן"), w("أحدث منتج عنّا، بكميات محدودة بالإطلاق.", "Our newest product, in limited numbers at launch.", "המוצר החדש שלנו, בכמות מוגבלת בהשקה."), w("الإطلاق الجديد متوفر هلّق", "The new launch is available now", "ההשקה החדשה זמינה עכשיו"), { bg: "#0f172a", fg: "#f8fafc", pop: "#a78bfa" }, "stars"),
  cp("coming-soon", "launch", w("قريباً", "Coming soon", "בקרוב"), w("إشي جديد جاي", "Something new is coming", "משהו חדש מגיע"), w("سجّلوا لتكونوا أول من يعرف.", "Sign up to be the first to know.", "הירשמו כדי להיות הראשונים לדעת."), w("قريباً جداً", "Very soon", "בקרוב מאוד"), { bg: "#18181b", fg: "#fafafa", pop: "#f472b6" }, "fireflies"),
  cp("pre-order", "launch", w("طلب مسبق", "Pre-order", "הזמנה מוקדמת"), w("احجزوا قطعتكم", "Reserve yours", "שריינו את שלכם"), w("اطلبوا هلّق، وبيوصلكم أول ما ينزل.", "Order now and it ships the moment it lands.", "הזמינו עכשיו, וזה יישלח ברגע שיגיע."), w("الطلب المسبق مفتوح", "Pre-orders are open", "ההזמנות המוקדמות פתוחות"), { bg: "#1e1b4b", fg: "#eef2ff", pop: "#facc15" }),
  cp("back-in-stock", "launch", w("رجع للمخزن", "Back in stock", "חזר למלאי"), w("رجع!", "It's back!", "זה חזר!"), w("المنتج اللي خلص بسرعة رجع، بس مش لكتير.", "The piece that sold out fast is back, but not for long.", "הפריט שאזל מהר חזר, אבל לא להרבה זמן."), w("رجع للمخزن بكمية محدودة", "Back in stock, in limited numbers", "חזר למלאי בכמות מוגבלת"), { bg: "#042f2e", fg: "#f0fdfa", pop: "#5eead4" }),
  cp("limited", "launch", w("إصدار محدود", "Limited edition", "מהדורה מוגבלת"), w("إصدار محدود", "Limited edition", "מהדורה מוגבלת"), w("قطع مرقّمة، وما رح تتكرر.", "Numbered pieces that won't come again.", "פריטים ממוספרים שלא יחזרו."), w("كمية محدودة جداً", "Very limited numbers", "כמות מוגבלת מאוד"), { bg: "#171717", fg: "#fafafa", pop: "#d4af37" }, "sparkles"),
  cp("flash-sale", "sale", w("عرض خاطف", "Flash sale", "מבצע בזק"), w("عرض لساعات بس", "A sale for hours only", "מבצע לשעות בלבד"), w("خصومات قوية لحد ما يخلص العدّاد.", "Big discounts until the clock runs out.", "הנחות גדולות עד שהשעון נגמר."), w("العرض الخاطف شغّال", "The flash sale is on", "מבצע הבזק פעיל"), { bg: "#e11d48", fg: "#fff1f2", pop: "#fde047" }),
  cp("free-shipping", "sale", w("توصيل مجاني", "Free delivery", "משלוח חינם"), w("التوصيل علينا", "Delivery's on us", "המשלוח עלינו"), w("توصيل مجاني على كل الطلبات هالويكند.", "Free delivery on every order this weekend.", "משלוח חינם על כל ההזמנות בסוף השבוע."), w("توصيل مجاني لكل البلاد", "Free delivery nationwide", "משלוח חינם לכל הארץ"), { bg: "#065f46", fg: "#ecfdf5", pop: "#6ee7b7" }),
  cp("bundle", "sale", w("عرض الباقات", "Bundle offer", "מבצע חבילות"), w("اشتروا 2 والتالتة ببلاش", "Buy 2, get the third free", "קנו 2, השלישי חינם"), w("اختاروا تلات قطع وادفعوا تمن تنتين.", "Pick three pieces and pay for two.", "בחרו שלושה פריטים ושלמו על שניים."), w("2+1 على كل المتجر", "2+1 across the store", "2+1 על כל החנות"), { bg: "#4c1d95", fg: "#f5f3ff", pop: "#c4b5fd" }),
  cp("clearance", "sale", w("تصفية", "Clearance", "חיסול"), w("تصفية نهائية", "Final clearance", "חיסול סופי"), w("أسعار ما رح تشوفوها مرة تانية.", "Prices you won't see again.", "מחירים שלא תראו שוב."), w("تصفية · كل إشي لازم يطلع", "Clearance · everything must go", "חיסול · הכול חייב לצאת"), { bg: "#9a3412", fg: "#fff7ed", pop: "#fed7aa" }),
  cp("weekend", "sale", w("عروض الويكند", "Weekend deals", "מבצעי סוף שבוע"), w("ويكند العروض", "Deals weekend", "סוף שבוע של מבצעים"), w("من الخميس للسبت، عروض على أحلى القطع.", "Thursday to Saturday, deals on the loveliest pieces.", "מחמישי עד שבת, מבצעים על הפריטים היפים ביותר."), w("عروض الويكند بلّشت", "Weekend deals are on", "מבצעי סוף השבוע התחילו"), { bg: "#c2410c", fg: "#fff7ed", pop: "#fde68a" }),
  cp("anniversary", "store", w("عيد ميلاد المتجر", "Our anniversary", "יום ההולדת של החנות"), w("عيد ميلادنا، والهدية إلكم", "It's our birthday, and the gift is yours", "יום ההולדת שלנו, והמתנה שלכם"), w("شكراً لأنكم معنا، خصم خاص لكل الزباين.", "Thank you for being with us: a special discount for everyone.", "תודה שאתם איתנו: הנחה מיוחדת לכולם."), w("احتفال عيد الميلاد · خصم 20٪", "Birthday celebration · 20% off", "חגיגת יום הולדת · 20% הנחה"), { bg: "#9d174d", fg: "#fdf2f8", pop: "#fcd34d" }, "confetti"),
  cp("graduation", "holiday", w("التخرّج", "Graduation", "סיום לימודים"), w("مبروك التخرّج", "Congratulations, graduates", "מזל טוב לבוגרים"), w("هدايا التخرّج اللي بتنحفظ.", "Graduation gifts worth keeping.", "מתנות סיום שכדאי לשמור."), w("هدايا التخرّج", "Graduation gifts", "מתנות לסיום לימודים"), { bg: "#1f2937", fg: "#f9fafb", pop: "#fbbf24" }, "confetti"),
  cp("weddings", "season", w("موسم الأعراس", "Wedding season", "עונת החתונות"), w("موسم الأعراس", "Wedding season", "עונת החתונות"), w("كل اللي بدكم ياه للعرس، من الهدية للإطلالة.", "Everything for the wedding, from the gift to the look.", "כל מה שצריך לחתונה, מהמתנה ועד הלוק."), w("تشكيلة الأعراس وصلت", "The wedding edit is in", "קולקציית החתונות הגיעה"), { bg: "#fffbeb", fg: "#78350f", pop: "#b45309" }, "hearts"),
  cp("gift-season", "season", w("موسم الهدايا", "Gift season", "עונת המתנות"), w("هدايا لكل حدا", "Gifts for everyone", "מתנות לכולם"), w("أفكار هدايا مرتّبة حسب الميزانية والشخص.", "Gift ideas sorted by budget and by person.", "רעיונות למתנות לפי תקציב ולפי אדם."), w("تغليف هدايا ببلاش", "Free gift wrapping", "אריזת מתנה חינם"), { bg: "#7f1d1d", fg: "#fff1f2", pop: "#fecaca" }, "sparkles"),
  cp("members", "store", w("نادي الزباين", "Members' club", "מועדון לקוחות"), w("انضمّوا للنادي", "Join the club", "הצטרפו למועדון"), w("نقاط على كل طلب، وعروض للأعضاء بس.", "Points on every order, and members-only offers.", "נקודות על כל הזמנה ומבצעים לחברים בלבד."), w("عروض حصرية للأعضاء", "Members-only offers", "מבצעים לחברי מועדון"), { bg: "#334155", fg: "#f8fafc", pop: "#fcd34d" }),
  cp("refer", "store", w("ادعوا صاحبكم", "Refer a friend", "הזמינו חבר"), w("شاركوا الحب", "Share the love", "שתפו את האהבה"), w("ابعتوا الرابط لصاحبكم، وتنينكم بتاخدوا ₪30.", "Send your link to a friend, and you both get ₪30.", "שלחו את הקישור לחבר, ושניכם תקבלו ₪30."), w("₪30 إلكم و₪30 لصاحبكم", "₪30 for you, ₪30 for your friend", "₪30 לכם ו-₪30 לחבר"), { bg: "#1d4ed8", fg: "#eff6ff", pop: "#fde047" }, "hearts"),
  cp("hanukkah", "holiday", w("حانوكا", "Hanukkah", "חנוכה"), w("حانوكا سعيد", "Happy Hanukkah", "חנוכה שמח"), w("هدايا لتمان ليالي.", "Gifts for eight nights.", "מתנות לשמונה לילות."), w("عروض حانوكا", "Hanukkah offers", "מבצעי חנוכה"), { bg: "#1e3a8a", fg: "#eff6ff", pop: "#fbbf24" }, "stars"),
  cp("rosh-hashanah", "holiday", w("رأس السنة العبرية", "Rosh Hashanah", "ראש השנה"), w("سنة حلوة", "A sweet new year", "שנה טובה ומתוקה"), w("هدايا للعيد وللعيلة، بتوصل قبل العيد.", "Holiday gifts for the family, delivered before the holiday.", "מתנות לחג ולמשפחה, במשלוח לפני החג."), w("توصيل قبل العيد", "Delivery before the holiday", "משלוח לפני החג"), { bg: "#7f1d1d", fg: "#fffbeb", pop: "#fbbf24" }),
  cp("passover", "holiday", w("عيد الفصح العبري", "Passover", "פסח"), w("عيد ربيعي سعيد", "A happy spring holiday", "חג אביב שמח"), w("كل اللي بدكم ياه للعيد والسفرة.", "Everything for the holiday table.", "כל מה שצריך לשולחן החג."), w("عروض العيد", "Holiday offers", "מבצעי החג"), { bg: "#365314", fg: "#f7fee7", pop: "#bef264" }, "fireflies"),
  cp("easter", "holiday", w("الفصح المجيد", "Easter", "חג הפסחא"), w("فصح مجيد", "Happy Easter", "פסחא שמח"), w("ألوان الربيع وهدايا العيد.", "Spring colours and holiday gifts.", "צבעי אביב ומתנות לחג."), w("عروض الفصح", "Easter offers", "מבצעי פסחא"), { bg: "#f5f3ff", fg: "#4c1d95", pop: "#8b5cf6" }, "sparkles"),
];
