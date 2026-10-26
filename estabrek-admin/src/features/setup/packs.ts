// What a new store starts with, per kind of store (admin → إعداد المتجر): the theme it
// opens with, its categories, product types (from the ready-made type templates), its home
// page and its main menu, in Arabic, English and Hebrew. Pure data: the wizard sends it to
// the backend (POST /admin/setup/apply), which checks it and makes ordinary rows the owner
// edits afterwards like any other content.
import type { Industry } from "../../lib/storeIdentity";

export type W = { ar: string; en: string; he: string };
const w = (ar: string, en: string, he: string): W => ({ ar, en, he });

export type PackCategory = { slug: string; name: W; children?: Array<{ slug: string; name: W }> };
export type PackId = Industry | "modest";
export type Pack = {
  id: PackId;
  /** What the store identity records (modest = women's fashion). */
  industry: Industry;
  audience: "women" | "everyone";
  icon: string;
  label: W;
  hint: W;
  /** Theme families the wizard offers, the first the closest. */
  families: string[];
  /** The theme it starts with (null = the rose design). */
  theme: string | null;
  hero: { eyebrow: W; title: W; subtitle: W; cta: W };
  categories: PackCategory[];
  /** Ready-made product types (features/catalog/types/typeTemplates.ts ids). */
  types: string[];
};

const c = (slug: string, ar: string, en: string, he: string, children?: Array<[string, string, string, string]>): PackCategory => ({
  slug,
  name: w(ar, en, he),
  ...(children ? { children: children.map(([s, a, e, h]) => ({ slug: s, name: w(a, e, h) })) } : {}),
});

export const PACKS: Pack[] = [
  {
    id: "modest",
    industry: "fashion",
    audience: "women",
    icon: "🧕",
    label: w("أزياء محتشمة وحجاب", "Modest fashion & hijab", "אופנה צנועה וחיג'אב"),
    hint: w("حجابات، عبايات، فساتين", "Hijabs, abayas, dresses", "צעיפים, עבאיות, שמלות"),
    families: ["fashion"],
    theme: null,
    hero: {
      eyebrow: w("المجموعة الجديدة", "The new collection", "הקולקציה החדשה"),
      title: w("أناقة تليق بكِ", "Elegance that suits you", "אלגנטיות שמתאימה לך"),
      subtitle: w("حجابات وعبايات وفساتين محتشمة بأقمشة ناعمة وألوان تشبهكِ.", "Hijabs, abayas and modest dresses in soft fabrics and colours like you.", "צעיפים, עבאיות ושמלות צנועות בבדים רכים ובצבעים שדומים לך."),
      cta: w("تسوّقي المجموعة", "Shop the collection", "לקולקציה"),
    },
    categories: [
      c("hijabs", "حجابات", "Hijabs", "צעיפים", [["hijabs-daily", "حجاب يومي", "Everyday hijabs", "צעיפים ליום-יום"], ["hijabs-chiffon", "شيفون", "Chiffon", "שיפון"]]),
      c("abayas", "عبايات", "Abayas", "עבאיות"),
      c("dresses", "فساتين", "Dresses", "שמלות"),
      c("modest-sets", "أطقم", "Sets", "סטים"),
      c("modest-accessories", "إكسسوارات", "Accessories", "אקססוריז"),
    ],
    types: ["clothes", "accessories"],
  },
  {
    id: "fashion",
    industry: "fashion",
    audience: "everyone",
    icon: "👗",
    label: w("ملابس وأزياء", "Clothing & fashion", "ביגוד ואופנה"),
    hint: w("نسائي، رجالي، أطفال", "Women, men, kids", "נשים, גברים, ילדים"),
    families: ["fashion", "shoes"],
    theme: "runway-3d",
    hero: {
      eyebrow: w("موسم جديد", "New season", "עונה חדשה"),
      title: w("إطلالتك تبدأ هنا", "Your look starts here", "הלוק שלך מתחיל כאן"),
      subtitle: w("ملابس عصرية بجودة عالية لكل يوم ولكل مناسبة.", "Modern clothing in great quality, for every day and every occasion.", "ביגוד עכשווי באיכות גבוהה, לכל יום ולכל אירוע."),
      cta: w("تسوّق الجديد", "Shop new arrivals", "לקנות חדש"),
    },
    categories: [
      c("women", "نسائي", "Women", "נשים", [["women-tops", "بلايز", "Tops", "חולצות"], ["women-dresses", "فساتين", "Dresses", "שמלות"]]),
      c("men", "رجالي", "Men", "גברים", [["men-shirts", "قمصان", "Shirts", "חולצות מכופתרות"], ["men-trousers", "بناطيل", "Trousers", "מכנסיים"]]),
      c("kids-clothing", "أطفال", "Kids", "ילדים"),
      c("bags", "شنط", "Bags", "תיקים"),
      c("fashion-accessories", "إكسسوارات", "Accessories", "אקססוריז"),
    ],
    types: ["clothes", "bags", "accessories"],
  },
  {
    id: "shoes",
    industry: "shoes",
    audience: "everyone",
    icon: "👟",
    label: w("أحذية", "Shoes", "נעליים"),
    hint: w("رياضي، رسمي، صنادل", "Sneakers, formal, sandals", "סניקרס, אלגנט, סנדלים"),
    families: ["shoes", "fashion", "sports"],
    theme: "sneaker-lab",
    hero: {
      eyebrow: w("وصل الإصدار", "Just landed", "נחת עכשיו"),
      title: w("كل خطوة أخف", "Every step lighter", "כל צעד קל יותר"),
      subtitle: w("أحذية رياضية ورسمية وصنادل بكل المقاسات، مع تبديل سهل للمقاس.", "Sneakers, formal shoes and sandals in every size, with easy size swaps.", "סניקרס, נעליים אלגנטיות וסנדלים בכל המידות, עם החלפת מידה קלה."),
      cta: w("تسوّق الأحذية", "Shop shoes", "לקנות נעליים"),
    },
    categories: [
      c("sneakers", "أحذية رياضية", "Sneakers", "סניקרס"),
      c("formal-shoes", "أحذية رسمية", "Formal shoes", "נעליים אלגנטיות"),
      c("sandals", "صنادل", "Sandals", "סנדלים"),
      c("boots", "بوت", "Boots", "מגפיים"),
      c("kids-shoes", "أحذية أطفال", "Kids' shoes", "נעלי ילדים"),
    ],
    types: ["shoes", "accessories"],
  },
  {
    id: "beauty",
    industry: "beauty",
    audience: "everyone",
    icon: "💄",
    label: w("تجميل وعطور", "Beauty & perfume", "יופי ובשמים"),
    hint: w("مكياج، عناية، عطور", "Make-up, care, perfume", "איפור, טיפוח, בשמים"),
    families: ["beauty"],
    theme: "perfume-oud",
    hero: {
      eyebrow: w("جمالك بعناية", "Beauty, with care", "יופי בקפידה"),
      title: w("اهتمّ بنفسك", "Treat yourself", "לפנק את עצמך"),
      subtitle: w("عطور أصلية ومكياج ومنتجات عناية مختارة لكل أنواع البشرة.", "Original perfumes, make-up and care for every skin type.", "בשמים מקוריים, איפור ומוצרי טיפוח לכל סוגי העור."),
      cta: w("تسوّق الآن", "Shop now", "לקנות עכשיו"),
    },
    categories: [
      c("perfumes", "عطور", "Perfumes", "בשמים", [["perfumes-oud", "عود ومسك", "Oud & musk", "עוד ומאסק"], ["perfumes-french", "عطور فرنسية", "French perfume", "בשמים צרפתיים"]]),
      c("makeup", "مكياج", "Make-up", "איפור"),
      c("skincare", "عناية بالبشرة", "Skincare", "טיפוח העור"),
      c("haircare", "عناية بالشعر", "Haircare", "טיפוח השיער"),
      c("beauty-gifts", "هدايا", "Gift sets", "מארזי מתנה"),
    ],
    types: ["perfume", "cosmetics"],
  },
  {
    id: "jewelry",
    industry: "jewelry",
    audience: "everyone",
    icon: "💍",
    label: w("مجوهرات وساعات", "Jewellery & watches", "תכשיטים ושעונים"),
    hint: w("ذهب، فضة، ساعات", "Gold, silver, watches", "זהב, כסף, שעונים"),
    families: ["jewelry", "beauty"],
    theme: "gold-souq",
    hero: {
      eyebrow: w("قطع مختارة", "Selected pieces", "פריטים נבחרים"),
      title: w("بريق يدوم", "A shine that lasts", "ברק שנשאר"),
      subtitle: w("خواتم وعقود وأساور وساعات، بشهادة أصالة وتغليف فاخر.", "Rings, necklaces, bracelets and watches, certified and beautifully packed.", "טבעות, שרשראות, צמידים ושעונים, עם תעודה ואריזה מהודרת."),
      cta: w("اكتشف المجموعة", "Discover the collection", "לגלות את הקולקציה"),
    },
    categories: [
      c("rings", "خواتم", "Rings", "טבעות"),
      c("necklaces", "عقود", "Necklaces", "שרשראות"),
      c("bracelets", "أساور", "Bracelets", "צמידים"),
      c("earrings", "حلق", "Earrings", "עגילים"),
      c("watches", "ساعات", "Watches", "שעונים"),
    ],
    types: ["jewellery", "wearables"],
  },
  {
    id: "phones",
    industry: "phones",
    audience: "everyone",
    icon: "📱",
    label: w("موبايلات وإكسسوارات", "Phones & accessories", "טלפונים ואביזרים"),
    hint: w("أجهزة، شواحن، سماعات", "Devices, chargers, earbuds", "מכשירים, מטענים, אוזניות"),
    families: ["electronics"],
    theme: "phone-hub",
    hero: {
      eyebrow: w("أحدث الإصدارات", "Latest releases", "ההשקות האחרונות"),
      title: w("جهازك الجاي هون", "Your next phone is here", "הטלפון הבא שלך כאן"),
      subtitle: w("موبايلات أصلية بضمان رسمي، وكل الإكسسوارات اللي بتحتاجها.", "Original phones with official warranty, and every accessory you need.", "טלפונים מקוריים עם אחריות רשמית, וכל האביזרים שצריך."),
      cta: w("تسوّق الموبايلات", "Shop phones", "לקנות טלפונים"),
    },
    categories: [
      c("phones", "موبايلات", "Phones", "טלפונים", [["iphone", "آيفون", "iPhone", "אייפון"], ["samsung", "سامسونج", "Samsung", "סמסונג"]]),
      c("tablets", "تابلت", "Tablets", "טאבלטים"),
      c("smartwatches", "ساعات ذكية", "Smart watches", "שעונים חכמים"),
      c("earbuds", "سماعات", "Earbuds & headphones", "אוזניות"),
      c("chargers", "شواحن وكوابل", "Chargers & cables", "מטענים וכבלים"),
      c("cases", "كفرات وحماية", "Cases & protection", "כיסויים ומגנים"),
    ],
    types: ["phones", "wearables", "audio", "accessories"],
  },
  {
    id: "computers",
    industry: "computers",
    audience: "everyone",
    icon: "💻",
    label: w("كمبيوترات ولابتوبات", "Computers & laptops", "מחשבים ולפטופים"),
    hint: w("لابتوبات، شاشات، قطع", "Laptops, monitors, parts", "לפטופים, מסכים, רכיבים"),
    families: ["electronics", "gaming"],
    theme: "laptop-lab",
    hero: {
      eyebrow: w("كمبيوترات", "Computers", "מחשבים"),
      title: w("اشتغل أسرع", "Work faster", "לעבוד מהר יותר"),
      subtitle: w("لابتوبات وشاشات وقطع كمبيوتر من أهم الماركات، مع نصيحة تختار فيها الأنسب.", "Laptops, monitors and parts from the top brands, with advice to choose the right one.", "לפטופים, מסכים ורכיבי מחשב מהמותגים המובילים, עם ייעוץ לבחירה נכונה."),
      cta: w("تسوّق الكمبيوترات", "Shop computers", "לקנות מחשבים"),
    },
    categories: [
      c("laptops", "لابتوبات", "Laptops", "לפטופים"),
      c("desktops", "أجهزة مكتبية", "Desktops", "מחשבים נייחים"),
      c("monitors", "شاشات", "Monitors", "מסכים"),
      c("components", "قطع كمبيوتر", "Components", "רכיבים", [["graphics-cards", "كروت شاشة", "Graphics cards", "כרטיסי מסך"], ["storage", "تخزين", "Storage", "אחסון"]]),
      c("peripherals", "كيبورد وماوس", "Keyboards & mice", "מקלדות ועכברים"),
    ],
    types: ["laptops", "accessories", "software"],
  },
  {
    id: "electronics",
    industry: "electronics",
    audience: "everyone",
    icon: "🔌",
    label: w("إلكترونيات", "Electronics", "אלקטרוניקה"),
    hint: w("شاشات، صوتيات، أجهزة بيت", "TVs, audio, appliances", "טלוויזיות, שמע, מכשירי בית"),
    families: ["electronics"],
    theme: "circuit",
    hero: {
      eyebrow: w("تقنية الجيل الجديد", "Next-gen tech", "טכנולוגיה מהדור הבא"),
      title: w("أداء بلا حدود", "Performance without limits", "ביצועים בלי גבולות"),
      subtitle: w("شاشات وصوتيات وأجهزة منزلية ذكية بضمان رسمي وتوصيل لباب البيت.", "TVs, audio and smart home devices with official warranty, delivered to your door.", "מסכים, שמע ומכשירי בית חכם עם אחריות רשמית ומשלוח עד הבית."),
      cta: w("تسوّق الإلكترونيات", "Shop electronics", "לקנות אלקטרוניקה"),
    },
    categories: [
      c("tvs", "شاشات وتلفزيونات", "TVs & screens", "מסכים וטלוויזיות"),
      c("audio", "صوتيات", "Audio", "שמע"),
      c("smart-home", "البيت الذكي", "Smart home", "בית חכם"),
      c("cameras", "كاميرات", "Cameras", "מצלמות"),
      c("appliances", "أجهزة منزلية", "Appliances", "מכשירי חשמל"),
    ],
    types: ["audio", "accessories", "kitchen"],
  },
  {
    id: "gaming",
    industry: "gaming",
    audience: "everyone",
    icon: "🎮",
    label: w("ألعاب وأجهزة ألعاب", "Games & consoles", "משחקים וקונסולות"),
    hint: w("بلايستيشن، اكس بوكس، بطاقات", "PlayStation, Xbox, cards", "פלייסטיישן, אקסבוקס, כרטיסים"),
    families: ["gaming"],
    theme: "neon-arcade",
    hero: {
      eyebrow: w("إصدار جديد", "New drop", "דרופ חדש"),
      title: w("العب على المستوى التالي", "Play the next level", "לשחק בשלב הבא"),
      subtitle: w("أجهزة، ألعاب أصلية وبطاقات شحن بأسعار للاعبين الحقيقيين.", "Consoles, original games and gift cards at prices for real players.", "קונסולות, משחקים מקוריים וכרטיסי טעינה במחירים לגיימרים אמיתיים."),
      cta: w("ابدأ اللعب", "Start playing", "להתחיל לשחק"),
    },
    categories: [
      c("consoles", "أجهزة", "Consoles", "קונסולות"),
      c("video-games", "ألعاب", "Games", "משחקים", [["ps-games", "بلايستيشن", "PlayStation", "פלייסטיישן"], ["xbox-games", "اكس بوكس", "Xbox", "אקסבוקס"]]),
      c("gaming-accessories", "إكسسوارات", "Accessories", "אביזרים"),
      c("gift-cards", "بطاقات وشحن", "Cards & top-ups", "כרטיסים וטעינות"),
    ],
    types: ["video_games", "game_keys", "accessories"],
  },
  {
    id: "books",
    industry: "books",
    audience: "everyone",
    icon: "📚",
    label: w("كتب ومكتبة", "Books & stationery", "ספרים וכלי כתיבה"),
    hint: w("روايات، أطفال، قرطاسية", "Novels, kids, stationery", "רומנים, ילדים, כלי כתיבה"),
    families: ["books", "kids"],
    theme: "ink-library",
    hero: {
      eyebrow: w("صفحة جديدة", "A new page", "דף חדש"),
      title: w("حكايات تنتظرك", "Stories await you", "סיפורים מחכים לך"),
      subtitle: w("روايات وكتب فكر وتاريخ وكتب أطفال وقرطاسية، بالعربي والإنجليزي.", "Novels, ideas, history, children's books and stationery, in Arabic and English.", "רומנים, הגות, היסטוריה, ספרי ילדים וכלי כתיבה, בערבית ובאנגלית."),
      cta: w("تصفّح الكتب", "Browse books", "לדפדף בספרים"),
    },
    categories: [
      c("novels", "روايات", "Novels", "רומנים"),
      c("history", "تاريخ وفكر", "History & ideas", "היסטוריה והגות"),
      c("childrens-books", "كتب أطفال", "Children's books", "ספרי ילדים"),
      c("religion", "دين", "Religion", "דת"),
      c("stationery", "قرطاسية", "Stationery", "כלי כתיבה"),
    ],
    types: ["books"],
  },
  {
    id: "art",
    industry: "art",
    audience: "everyone",
    icon: "🎨",
    label: w("فن وأدوات رسم", "Art & art supplies", "אמנות וחומרי ציור"),
    hint: w("لوحات، ألوان، فخار", "Paintings, paints, ceramics", "ציורים, צבעים, קרמיקה"),
    families: ["art", "home"],
    theme: "white-gallery",
    hero: {
      eyebrow: w("المعرض الحالي", "Now showing", "מוצג עכשיו"),
      title: w("فن للبيت", "Art for the home", "אמנות לבית"),
      subtitle: w("لوحات أصلية وطبعات محدودة وأدوات رسم لكل فنان.", "Original paintings, limited prints and supplies for every artist.", "ציורים מקוריים, הדפסים מוגבלים וחומרים לכל אמן."),
      cta: w("ادخل المعرض", "Enter the gallery", "להיכנס לגלריה"),
    },
    categories: [
      c("paintings", "لوحات", "Paintings", "ציורים"),
      c("prints", "طبعات", "Prints", "הדפסים"),
      c("ceramics", "فخار وخزف", "Ceramics", "קרמיקה"),
      c("art-supplies", "أدوات رسم", "Art supplies", "חומרי ציור", [["paints", "ألوان", "Paints", "צבעים"], ["brushes", "فراشي", "Brushes", "מכחולים"]]),
    ],
    types: ["decor", "accessories"],
  },
  {
    id: "home",
    industry: "home",
    audience: "everyone",
    icon: "🛋️",
    label: w("بيت وأثاث", "Home & furniture", "בית ורהיטים"),
    hint: w("أثاث، إضاءة، مطبخ", "Furniture, lighting, kitchen", "רהיטים, תאורה, מטבח"),
    families: ["home", "art"],
    theme: "nordic-nest",
    hero: {
      eyebrow: w("بيت هادئ", "A calm home", "בית רגוע"),
      title: w("بسيط ودافئ", "Simple and warm", "פשוט וחם"),
      subtitle: w("أثاث بخطوط نظيفة، إضاءة دافئة وقطع ديكور تجعل البيت أهدأ.", "Furniture in clean lines, warm lighting and decor that makes home calmer.", "רהיטים בקווים נקיים, תאורה חמה ופריטי עיצוב שמרגיעים את הבית."),
      cta: w("تسوّق البيت", "Shop the home", "לקנות לבית"),
    },
    categories: [
      c("furniture", "أثاث", "Furniture", "רהיטים", [["living-room", "صالون", "Living room", "סלון"], ["bedroom", "غرفة نوم", "Bedroom", "חדר שינה"]]),
      c("lighting", "إضاءة", "Lighting", "תאורה"),
      c("kitchen", "مطبخ", "Kitchen", "מטבח"),
      c("decor", "ديكور", "Decor", "עיצוב"),
      c("textiles", "مفارش ووسائد", "Textiles", "טקסטיל"),
    ],
    types: ["furniture", "kitchen", "decor"],
  },
  {
    id: "food",
    industry: "food",
    audience: "everyone",
    icon: "☕",
    label: w("أكل وحلويات وقهوة", "Food, sweets & coffee", "אוכל, מתוקים וקפה"),
    hint: w("قهوة، تمور، حلويات", "Coffee, dates, sweets", "קפה, תמרים, מתוקים"),
    families: ["food"],
    theme: "coffee-roast",
    hero: {
      eyebrow: w("طازج", "Fresh", "טרי"),
      title: w("طعم ما بيتنسى", "A taste to remember", "טעם שלא שוכחים"),
      subtitle: w("قهوة محمّصة، تمور، حلويات ومعجنات طازجة، ومن عنا لبابك.", "Roasted coffee, dates, sweets and fresh pastries, from us to your door.", "קפה קלוי, תמרים, מתוקים ומאפים טריים, מאיתנו עד הדלת."),
      cta: w("اطلب الآن", "Order now", "להזמין עכשיו"),
    },
    categories: [
      c("coffee", "قهوة", "Coffee", "קפה"),
      c("dates", "تمور", "Dates", "תמרים"),
      c("sweets", "حلويات", "Sweets", "מתוקים"),
      c("bakery", "مخبوزات", "Bakery", "מאפים"),
      c("food-gifts", "علب هدايا", "Gift boxes", "מארזי מתנה"),
    ],
    types: ["food"],
  },
  {
    id: "kids",
    industry: "kids",
    audience: "everyone",
    icon: "🧸",
    label: w("أطفال وألعاب", "Kids & toys", "ילדים וצעצועים"),
    hint: w("ألعاب، مواليد، مدرسة", "Toys, baby, school", "צעצועים, תינוקות, בית ספר"),
    families: ["kids", "books"],
    theme: "toy-blocks",
    hero: {
      eyebrow: w("وقت اللعب!", "Playtime!", "זמן משחק!"),
      title: w("العب وتعلّم", "Play and learn", "לשחק וללמוד"),
      subtitle: w("ألعاب آمنة ومفيدة، مستلزمات مواليد وأغراض مدرسة لكل عمر.", "Safe, smart toys, baby essentials and school supplies for every age.", "צעצועים בטוחים ומחכימים, מוצרי תינוקות וציוד לבית הספר לכל גיל."),
      cta: w("تسوّق الألعاب", "Shop toys", "לקנות צעצועים"),
    },
    categories: [
      c("toys", "ألعاب", "Toys", "צעצועים", [["building-toys", "ألعاب تركيب", "Building toys", "צעצועי הרכבה"], ["board-games", "ألعاب طاولة", "Board games", "משחקי קופסה"]]),
      c("baby", "مواليد", "Baby", "תינוקות"),
      c("kids-clothes", "ملابس أطفال", "Kids' clothes", "בגדי ילדים"),
      c("school", "مدرسة", "School", "בית ספר"),
    ],
    types: ["toys", "baby", "clothes"],
  },
  {
    id: "sports",
    industry: "sports",
    audience: "everyone",
    icon: "⚽",
    label: w("رياضة ولياقة", "Sport & fitness", "ספורט וכושר"),
    hint: w("ملابس، أوزان، كرات", "Wear, weights, balls", "ביגוד, משקולות, כדורים"),
    families: ["sports", "shoes"],
    theme: "stadium-pro",
    hero: {
      eyebrow: w("موسم جديد", "New season", "עונה חדשה"),
      title: w("العب للفوز", "Play to win", "לשחק לנצח"),
      subtitle: w("ملابس رياضية، أحذية ومعدات تدريب للبيت والنادي والملعب.", "Sportswear, shoes and training gear for home, gym and pitch.", "ביגוד ספורט, נעליים וציוד אימון לבית, לחדר הכושר ולמגרש."),
      cta: w("تسوّق الرياضة", "Shop sport", "לקנות ספורט"),
    },
    categories: [
      c("sportswear", "ملابس رياضية", "Sportswear", "ביגוד ספורט"),
      c("fitness", "معدات لياقة", "Fitness equipment", "ציוד כושר"),
      c("football", "كرة قدم", "Football", "כדורגל"),
      c("outdoor", "رحلات وتخييم", "Outdoor", "טיולים וקמפינג"),
      c("sports-shoes", "أحذية رياضية", "Sports shoes", "נעלי ספורט"),
    ],
    types: ["sports", "clothes", "shoes"],
  },
  {
    id: "pets",
    industry: "pets",
    audience: "everyone",
    icon: "🐾",
    label: w("حيوانات أليفة", "Pets", "חיות מחמד"),
    hint: w("أكل، ألعاب، أحواض", "Food, toys, aquariums", "אוכל, צעצועים, אקווריומים"),
    families: ["pets"],
    theme: "paw-park",
    hero: {
      eyebrow: w("للحبايب", "For your best friend", "לחבר הכי טוב"),
      title: w("كل شي لحيوانك", "Everything for your pet", "הכל לחיית המחמד"),
      subtitle: w("أكل صحي، ألعاب، أسرّة وإكسسوارات للكلاب والقطط والطيور والأسماك.", "Healthy food, toys, beds and accessories for dogs, cats, birds and fish.", "אוכל בריא, צעצועים, מיטות ואביזרים לכלבים, חתולים, ציפורים ודגים."),
      cta: w("تسوّق للحيوانات", "Shop for pets", "לקנות לחיות"),
    },
    categories: [
      c("dogs", "كلاب", "Dogs", "כלבים"),
      c("cats", "قطط", "Cats", "חתולים"),
      c("birds", "طيور", "Birds", "ציפורים"),
      c("fish", "أسماك وأحواض", "Fish & aquariums", "דגים ואקווריומים"),
    ],
    types: ["pets", "food"],
  },
  {
    id: "flowers",
    industry: "flowers",
    audience: "everyone",
    icon: "💐",
    label: w("زهور ونباتات", "Flowers & plants", "פרחים וצמחים"),
    hint: w("باقات، نباتات، هدايا", "Bouquets, plants, gifts", "זרים, צמחים, מתנות"),
    families: ["flowers", "home"],
    theme: "florist-rose",
    hero: {
      eyebrow: w("زهور اليوم", "Today's flowers", "הפרחים של היום"),
      title: w("قلها بالورد", "Say it with flowers", "להגיד בפרחים"),
      subtitle: w("باقات طازجة ونباتات منزلية وهدايا، توصيل بنفس اليوم مع بطاقة باسمك.", "Fresh bouquets, house plants and gifts, same-day delivery with your own card.", "זרים טריים, צמחי בית ומתנות, משלוח באותו יום עם כרטיס אישי."),
      cta: w("أرسل باقة", "Send a bouquet", "לשלוח זר"),
    },
    categories: [
      c("bouquets", "باقات", "Bouquets", "זרים"),
      c("plants", "نباتات", "Plants", "צמחים"),
      c("weddings", "أعراس ومناسبات", "Weddings & events", "חתונות ואירועים"),
      c("flower-gifts", "هدايا", "Gifts", "מתנות"),
    ],
    types: ["decor"],
  },
  {
    id: "music",
    industry: "music",
    audience: "everyone",
    icon: "🎸",
    label: w("موسيقى وآلات", "Music & instruments", "מוזיקה וכלי נגינה"),
    hint: w("آلات، أسطوانات، صوتيات", "Instruments, records, audio", "כלים, תקליטים, שמע"),
    families: ["music", "electronics"],
    theme: "vinyl-store",
    hero: {
      eyebrow: w("للموسيقيين", "For musicians", "למוזיקאים"),
      title: w("اعزف حكايتك", "Play your story", "לנגן את הסיפור"),
      subtitle: w("آلات موسيقية مضبوطة وجاهزة للعزف، أسطوانات وسماعات لعشاق الصوت.", "Instruments set up and ready to play, records and headphones for sound lovers.", "כלי נגינה מכוונים ומוכנים, תקליטים ואוזניות לאוהבי צליל."),
      cta: w("تسوّق الآلات", "Shop instruments", "לקנות כלים"),
    },
    categories: [
      c("guitars", "جيتارات", "Guitars", "גיטרות"),
      c("oud", "عود", "Oud", "עוד"),
      c("keyboards-pianos", "بيانو وكيبورد", "Pianos & keyboards", "פסנתרים וקלידים"),
      c("records", "أسطوانات", "Records", "תקליטים"),
      c("music-audio", "سماعات وصوتيات", "Headphones & audio", "אוזניות ושמע"),
    ],
    types: ["audio", "accessories"],
  },
  {
    id: "general",
    industry: "general",
    audience: "everyone",
    icon: "🛍️",
    label: w("متجر عام", "General store", "חנות כללית"),
    hint: w("كل شيء بمكان واحد", "Everything in one place", "הכל במקום אחד"),
    families: ["general"],
    theme: "mega-market",
    hero: {
      eyebrow: w("كل شيء بمكان واحد", "Everything in one place", "הכל במקום אחד"),
      title: w("تسوّق أذكى", "Shop smarter", "לקנות חכם יותר"),
      subtitle: w("منتجات مختارة من البيت للموضة للإلكترونيات، بعروض كل يوم.", "Chosen products from home to fashion to electronics, with deals every day.", "מוצרים נבחרים מהבית ועד אופנה ואלקטרוניקה, עם מבצעים כל יום."),
      cta: w("ابدأ التسوّق", "Start shopping", "להתחיל לקנות"),
    },
    categories: [
      c("home-living", "البيت", "Home", "בית"),
      c("fashion-all", "أزياء", "Fashion", "אופנה"),
      c("electronics-all", "إلكترونيات", "Electronics", "אלקטרוניקה"),
      c("beauty-all", "تجميل", "Beauty", "יופי"),
      c("deals", "عروض", "Deals", "מבצעים"),
    ],
    types: ["clothes", "accessories", "kitchen"],
  },
];

export const packById = (id: string | null | undefined) => PACKS.find((p) => p.id === id) ?? null;

/* ------------------------------------------------------------ the home page */

// Section titles and the questions every store gets, worded for everyone (no "her"/"him").
const T = {
  arrivals: w("وصل حديثاً", "New arrivals", "הגיע עכשיו"),
  collections: w("تسوّق حسب القسم", "Shop by category", "לפי קטגוריה"),
  best: w("الأكثر طلباً", "Most wanted", "הכי מבוקשים"),
  faq: w("أسئلة متكررة", "Questions", "שאלות נפוצות"),
  contact: w("تواصل معنا", "Contact us", "צור קשר"),
  ctaTitle: w("محتاج مساعدة بالاختيار؟", "Need help choosing?", "צריכים עזרה בבחירה?"),
  ctaText: w("احكي معنا ومنساعدك تلاقي الأنسب لك.", "Talk to us and we'll help you find the right one.", "דברו איתנו ונעזור למצוא את המתאים."),
  allCategories: w("كل الأقسام", "All categories", "כל הקטגוריות"),
};
const FAQ: Array<{ q: W; a: W }> = [
  {
    q: w("قديش بياخد التوصيل؟", "How long does delivery take?", "כמה זמן לוקח המשלוח?"),
    a: w("عادة من يوم لثلاث أيام عمل حسب المنطقة، وبنبعتلك رسالة لما يطلع الطلب.", "Usually one to three working days depending on the area; we message you when the order leaves.", "בדרך כלל יום עד שלושה ימי עסקים לפי האזור; נשלח הודעה כשההזמנה יוצאת."),
  },
  {
    q: w("بقدر أبدّل أو أرجّع؟", "Can I exchange or return?", "אפשר להחליף או להחזיר?"),
    a: w("أكيد، خلال 14 يوم من الاستلام إذا المنتج بحالته الأصلية.", "Of course, within 14 days of delivery if the item is in its original condition.", "בטח, תוך 14 יום מהקבלה אם המוצר במצבו המקורי."),
  },
  {
    q: w("كيف بقدر أدفع؟", "How can I pay?", "איך אפשר לשלם?"),
    a: w("بالدفع عند الاستلام، أو حسب طرق الدفع المفعّلة بالمتجر.", "Cash on delivery, or with the payment methods the store offers.", "תשלום במסירה, או באמצעי התשלום שהחנות מציעה."),
  },
];

type Lang = "ar" | "en" | "he";
const per = <T,>(make: (l: Lang) => T): Record<Lang, T> => ({ ar: make("ar"), en: make("en"), he: make("he") });

export type SetupSection = { type: string; data: Record<Lang, Record<string, unknown>> };

/** The home page's sections, in the three languages: opening, new arrivals, categories, best sellers, questions, help. */
export function homeSections(pack: Pack): SetupSection[] {
  const tiles = pack.categories.map((cat) => ({ href: `/c/${cat.slug}`, name: cat.name }));
  return [
    {
      type: "HERO",
      data: per((l) => ({
        eyebrow: pack.hero.eyebrow[l],
        title: pack.hero.title[l],
        subtitle: pack.hero.subtitle[l],
        align: "center",
        primaryButton: { label: pack.hero.cta[l], href: "/shop" },
        secondaryButton: { label: T.allCategories[l], href: "/shop" },
      })),
    },
    { type: "NEW_ARRIVALS_SLIDER", data: per((l) => ({ title: T.arrivals[l], limit: 8 })) },
    { type: "COLLECTIONS_GRID", data: per((l) => ({ title: T.collections[l], columns: 4, items: tiles.map((t) => ({ label: t.name[l], href: t.href })) })) },
    { type: "BEST_SELLERS_SLIDER", data: per((l) => ({ title: T.best[l], limit: 8 })) },
    { type: "FAQ", data: per((l) => ({ title: T.faq[l], items: FAQ.map((f) => ({ question: f.q[l], answer: f.a[l] })) })) },
    { type: "CTA", data: per((l) => ({ title: T.ctaTitle[l], subtitle: T.ctaText[l], align: "center", buttonLabel: T.contact[l], buttonHref: "/contact" })) },
  ];
}

/** The main menu: the pack's top categories, then the shop and contact. */
export function packMenu(pack: Pack): Array<{ label: W; href: string }> {
  return [
    ...pack.categories.slice(0, 5).map((cat) => ({ label: cat.name, href: `/c/${cat.slug}` })),
    { label: w("كل المنتجات", "All products", "כל המוצרים"), href: "/shop" },
    { label: T.contact, href: "/contact" },
  ];
}

export const HOME_NAME = w("الرئيسية", "Home", "דף הבית");
