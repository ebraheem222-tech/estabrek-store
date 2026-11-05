import type { ThemeFamily, Words } from "../../types";
import { t } from "../tree";
import { ADDITIONAL_INDUSTRIES } from "./catalogContent";

/** Merchant-facing content is separate from compositions so a new industry needs no renderer. */
export type Industry = {
  id: string; label: Words; family: ThemeFamily; kinds: string[]; brand: Words;
  title: Words; intro: Words; story: Words; guide: Words;
  products: Words[]; collections: Words[]; details: Words[];
};
export type IndustryInput = Omit<Industry, "label" | "brand" | "title" | "intro" | "story" | "guide" | "products" | "collections" | "details"> & {
  label: string; brand: string; title: string; intro: string; story: string; guide: string;
  products: string[]; collections: string[]; details: string[];
};
export const industry = (x: IndustryInput): Industry => ({ ...x, label: t(x.label), brand: t(x.brand), title: t(x.title), intro: t(x.intro), story: t(x.story), guide: t(x.guide), products: x.products.map(t), collections: x.collections.map(t), details: x.details.map(t) });

export const INDUSTRIES: Industry[] = [
  industry({
    id: "fashion", label: "ملابس وأزياء|Fashion|אופנה", family: "fashion", kinds: ["womens-fashion", "mens-fashion", "modest-fashion", "bags-leather"], brand: "نسيج|Naseej|נאסיג׳",
    title: "قطع بتشبهك|Wear your own story|ללבוש את הסיפור שלך",
    intro: "قصّات مريحة وألوان بتتناسق، من أول مشوار لآخر السهرة.|Easy silhouettes and colours that work together, from your first errand to your evening out.|גזרות נוחות וצבעים שמשתלבים, מהסידור הראשון ועד הערב.",
    story: "نبدأ من القماش، نجرّب القصّة ونراجع التفاصيل. مجموعة بتقدر تنسّقها بطريقتك وترجع تلبسها كل موسم.|We start with fabric, try the cut and refine the details. A collection to style your way and return to every season.|מתחילים בבד, מנסים את הגזרה ומדייקים את הפרטים. קולקציה שאפשר לשלב בדרך שלך וללבוש בכל עונה.",
    guide: "قارن قياساتك بجدول كل قطعة، واختَر القصّة اللي بتريحك.|Compare your measurements with each item's size chart and choose the fit you prefer.|השוו את המידות לטבלה של כל פריט ובחרו את הגזרה הנוחה לכם.",
    products: ["قميص كتان|Linen shirt|חולצת פשתן", "طقم يومي|Everyday set|סט ליום יום", "فستان ناعم|Flowing dress|שמלה נשפכת", "جاكيت خفيف|Light jacket|ז׳קט קל", "بنطلون واسع|Wide-leg trousers|מכנסיים רחבים", "حقيبة قماش|Canvas bag|תיק בד"],
    collections: ["أساسيات|Essentials|פריטי בסיס", "أطقم|Sets|סטים", "مناسبات|Occasion wear|בגדים לאירועים", "إكسسوارات|Accessories|אביזרים"],
    details: ["ملمس القماش|Fabric feel|מגע הבד", "القصّة والمقاس|Cut and fit|גזרה ומידה", "طريقة العناية|Care instructions|הוראות טיפול"],
  }),
  industry({
    id: "beauty", label: "تجميل وعناية|Beauty & skincare|יופי וטיפוח", family: "beauty", kinds: ["makeup", "skincare", "natural-soap", "barber-hair"], brand: "ندى|Nada|נאדה",
    title: "وقت صغير، إلك|A little time for you|קצת זמן לעצמך",
    intro: "اكتشف روتين عناية بسيط، بمنتجات واضحة وتفاصيل تساعدك تختار.|Discover a simple care routine, with clear product information to help you choose.|גלו שגרת טיפוח פשוטה, עם מידע ברור שעוזר לבחור.",
    story: "كل بشرة إلها احتياجاتها. بنعرض المكوّنات وطريقة الاستخدام حتى تبني روتين بناسبك، خطوة خطوة.|Every skin has its own needs. Explore ingredients and usage instructions to build your routine, step by step.|לכל עור צרכים משלו. בוחנים רכיבים והוראות שימוש ובונים שגרה שמתאימה לכם, צעד אחר צעד.",
    guide: "اقرأ المكوّنات والتحذيرات، وجرّب المنتج حسب تعليماته.|Read ingredients and precautions, and follow the product's instructions.|קראו את הרכיבים והאזהרות ופעלו לפי הוראות המוצר.",
    products: ["غسول وجه|Face cleanser|תרחיץ פנים", "كريم ترطيب|Moisturiser|קרם לחות", "سيروم عناية|Care serum|סרום טיפוח", "زيت للجسم|Body oil|שמן גוף", "ماسك عناية|Care mask|מסכת טיפוח", "مجموعة روتين|Routine set|ערכת שגרה"],
    collections: ["للوجه|Face|פנים", "للجسم|Body|גוף", "للشعر|Hair|שיער", "مجموعات|Sets|ערכות"],
    details: ["المكوّنات|Ingredients|רכיבים", "الملمس|Texture|מרקם", "الاستخدام|Application|שימוש"],
  }),
  industry({
    id: "perfume", label: "عطور وعود|Perfume & oud|בשמים ועוד", family: "beauty", kinds: ["oud-perfume"], brand: "أثر|Athar|את׳ר",
    title: "رائحة إلها حكاية|A scent with a story|ניחוח עם סיפור",
    intro: "من أول نفحة لآخر أثر، اكتشف العطر اللي بتحب ترجعله.|From the first note to the lasting impression, discover a scent to come back to.|מהתו הראשון ועד הרושם שנשאר, גלו ניחוח שתרצו לחזור אליו.",
    story: "خشب وزهر ولمسات دافئة. استكشف طبقات العطر ومكوّناته، واختَر الرائحة اللي بتكمّل يومك.|Woods, florals and warm accents. Explore a fragrance's layers and notes, and find the scent that completes your day.|עצים, פרחים ונגיעות חמימות. גלו את שכבות הבושם ואת התווים שמשלימים את היום שלכם.",
    guide: "اقرأ النوتات والتركيز والحجم، وجرّب عيّنة لما تكون متاحة.|Explore notes, concentration and volume, and try a sample where available.|בדקו תווים, ריכוז ונפח, ונסו דוגמית כשהיא זמינה.",
    products: ["عود دافئ|Warm oud|עוד חמים", "ورد المساء|Evening rose|ורד הערב", "مسك ناعم|Soft musk|מושק רך", "حمضيات الصباح|Morning citrus|הדרי הבוקר", "عنبر|Amber|ענבר", "مجموعة اكتشاف|Discovery set|ערכת גילוי"],
    collections: ["خشبية|Woody|עציים", "زهرية|Floral|פרחוניים", "شرقية|Oriental|מזרחיים", "هدايا|Gifts|מתנות"],
    details: ["نوتات الافتتاح|Top notes|תווי פתיחה", "قلب العطر|Heart notes|תווי לב", "القاعدة|Base notes|תווי בסיס"],
  }),
  industry({
    id: "jewelry", label: "مجوهرات وإكسسوارات|Jewelry|תכשיטים", family: "jewelry", kinds: ["gold-jewelry", "silver-handmade", "watches"], brand: "لمعة|Lam'a|למעה",
    title: "تفصيل صغير، معنى كبير|Small details, lasting meaning|פרטים קטנים, משמעות גדולה",
    intro: "قطع للاحتفاظ باللحظات، وإضافة لمسة خاصة لكل يوم.|Pieces to hold a moment and add something personal to every day.|פריטים ששומרים רגע ומוסיפים מגע אישי לכל יום.",
    story: "من أول رسمة لآخر لمعة، التفاصيل بتعمل الفرق. اكتشف الخامة والمقاس والتشطيب قبل ما تختار قطعتك.|From the first sketch to the final polish, details matter. Explore material, sizing and finish before choosing your piece.|מהסקיצה הראשונה ועד הליטוש האחרון, הפרטים חשובים. בדקו חומר, מידה וגימור לפני הבחירה.",
    guide: "استعمل دليل القياس، وراجع نوع المعدن وتعليمات العناية.|Use the sizing guide and review the metal and care instructions.|היעזרו במדריך המידות ובדקו את סוג המתכת והוראות הטיפול.",
    products: ["خاتم بسيط|Simple ring|טבעת פשוטה", "عقد رقيق|Fine necklace|שרשרת עדינה", "أقراط دائرية|Hoop earrings|עגילי חישוק", "سوار يومي|Everyday bracelet|צמיד ליום יום", "قلادة ذكرى|Keepsake pendant|תליון למזכרת", "طقم هدية|Gift set|ערכת מתנה"],
    collections: ["خواتم|Rings|טבעות", "عقود|Necklaces|שרשראות", "أقراط|Earrings|עגילים", "أساور|Bracelets|צמידים"],
    details: ["المعدن|Metal|מתכת", "التشطيب|Finish|גימור", "القياس|Sizing|מידה"],
  }),
  industry({
    id: "electronics", label: "إلكترونيات وأجهزة|Electronics|אלקטרוניקה", family: "electronics", kinds: ["mobile-phones", "laptops", "audio", "smart-living"], brand: "نقطة|Nuqta|נוקטה",
    title: "تقنية بتناسب يومك|Tech that fits your day|טכנולוגיה שמתאימה ליום שלך",
    intro: "أجهزة للعمل، الدراسة والترفيه. قارن التفاصيل واختَر اللي بناسب احتياجك.|Devices for work, study and entertainment. Compare the details and choose for your needs.|מכשירים לעבודה, לימודים ופנאי. השוו פרטים ובחרו לפי הצרכים שלכם.",
    story: "المواصفات لازم تكون واضحة. بنرتّب المعلومات اللي بتهمك، من التوافق للمنافذ، حتى تكون المقارنة أسهل.|Specifications should be clear. Find the information that matters, from compatibility to connections, for easier comparisons.|המפרט צריך להיות ברור. מצאו את המידע החשוב, מתאימות ועד חיבורים, להשוואה קלה יותר.",
    guide: "راجع التوافق والمواصفات والضمان المذكور بصفحة الجهاز قبل الطلب.|Check compatibility, specifications and the warranty listed on the product page before ordering.|בדקו תאימות, מפרט ואחריות בדף המוצר לפני ההזמנה.",
    products: ["هاتف ذكي|Smartphone|טלפון חכם", "لابتوب يومي|Everyday laptop|מחשב נייד", "سماعات لاسلكية|Wireless headphones|אוזניות אלחוטיות", "ساعة ذكية|Smartwatch|שעון חכם", "شاحن مكتبي|Desk charger|מטען שולחני", "مكبر صوت|Speaker|רמקול"],
    collections: ["موبايلات|Phones|טלפונים", "كمبيوترات|Computers|מחשבים", "صوتيات|Audio|שמע", "إكسسوارات|Accessories|אביזרים"],
    details: ["التوافق|Compatibility|תאימות", "المواصفات|Specifications|מפרט", "المحتويات|What's included|תכולה"],
  }),
  industry({
    id: "gaming", label: "ألعاب وقيمنق|Gaming|גיימינג", family: "gaming", kinds: ["gaming"], brand: "ريسباون|Respawn|ריספאון",
    title: "جهّز مساحتك للّعب|Build your play space|בנו את פינת המשחק שלכם",
    intro: "اختَر عدّتك، نسّق مكتبك، وخلي كل جلسة لعب بطريقتك.|Choose your gear, build your setup and make every session your own.|בחרו ציוד, סדרו את העמדה והפכו כל משחק לשלכם.",
    story: "من حركة الماوس لصوت الخطوة، كل تفصيل بالعدّة مهم. استكشف الأجهزة حسب منصّتك وطريقتك باللعب.|From a mouse movement to a footstep, every detail counts. Explore gear for your platform and your way of playing.|מתנועת העכבר ועד צליל הצעד, כל פרט חשוב. גלו ציוד לפלטפורמה ולסגנון המשחק שלכם.",
    guide: "اختَر منصّتك أول، وراجع التوافق والمنافذ قبل إضافة العدّة.|Choose your platform first, then check compatibility and connections.|בחרו קודם פלטפורמה ואז בדקו תאימות וחיבורים.",
    products: ["يد تحكم|Controller|בקר", "كيبورد ميكانيكي|Mechanical keyboard|מקלדת מכנית", "ماوس ألعاب|Gaming mouse|עכבר גיימינג", "سماعة ألعاب|Gaming headset|אוזניות גיימינג", "سطح مكتب|Desk mat|משטח שולחן", "إضاءة للمكتب|Desk lighting|תאורת שולחן"],
    collections: ["كونسول|Console|קונסולה", "كمبيوتر|PC|מחשב", "صوتيات|Audio|שמע", "المكتب|Setup|עמדה"],
    details: ["المنصّة|Platform|פלטפורמה", "الاتصال|Connection|חיבור", "التحكم|Controls|שליטה"],
  }),
  industry({
    id: "home", label: "أثاث وديكور|Furniture & home|רהיטים ובית", family: "home", kinds: ["furniture", "home-decor", "lighting", "rugs"], brand: "دار|Dar|דאר",
    title: "مساحة بتحب ترجع إلها|A space to come home to|מקום שכיף לחזור אליו",
    intro: "قطع بتنسجم مع بيتك، من زاوية القراءة لغرفة الجلوس.|Pieces that belong in your home, from the reading nook to the living room.|פריטים שמשתלבים בבית, מפינת הקריאה ועד הסלון.",
    story: "البيت بيتكوّن شوي شوي. بنجمع الخامات والأشكال اللي بتتناغم، وبنوضّح القياسات حتى تتخيّل كل قطعة بمكانها.|A home grows over time. Explore materials and shapes that work together, with measurements to imagine each piece in place.|בית נבנה בהדרגה. גלו חומרים וצורות שמשתלבים, עם מידות שעוזרות לדמיין כל פריט במקומו.",
    guide: "قِس المساحة وفتحات الأبواب، وراجع الأبعاد وطريقة التركيب.|Measure your space and doorways, and check dimensions and assembly details.|מדדו את החלל והפתחים ובדקו מידות ופרטי הרכבה.",
    products: ["كرسي استرخاء|Lounge chair|כיסא נוח", "طاولة جانبية|Side table|שולחן צד", "مصباح قراءة|Reading lamp|מנורת קריאה", "وسادة ناعمة|Soft cushion|כרית רכה", "مزهرية|Vase|אגרטל", "رف حائط|Wall shelf|מדף קיר"],
    collections: ["للجلوس|Seating|ישיבה", "طاولات|Tables|שולחנות", "إضاءة|Lighting|תאורה", "ديكور|Decor|עיצוב"],
    details: ["الأبعاد|Dimensions|מידות", "الخامات|Materials|חומרים", "التركيب والعناية|Assembly & care|הרכבה וטיפול"],
  }),
  industry({
    id: "coffee", label: "قهوة ومحمصة|Coffee & roastery|קפה וקלייה", family: "food", kinds: ["coffee", "tea"], brand: "بُن|Bunn|בון",
    title: "بداية اليوم، على مزاجك|Start the day your way|מתחילים את היום בדרך שלך",
    intro: "حبوب، أدوات وتحميصات مختلفة. اكتشف فنجانك خطوة خطوة.|Beans, tools and different roasts. Discover your cup, one brew at a time.|פולים, כלים ודרגות קלייה שונות. גלו את הכוס שלכם, חליטה אחר חליטה.",
    story: "من الحبة للفنجان، كل خطوة بتغيّر الطعم. تعرّف على المنشأ والتحميص والطحنة، وجرّب الوصفة اللي بتناسبك.|From bean to cup, every step shapes the flavour. Explore origin, roast and grind, then find your brewing recipe.|מהפול לכוס, כל שלב משנה את הטעם. גלו מקור, קלייה וטחינה ומצאו את מתכון החליטה שלכם.",
    guide: "اختَر الطحنة حسب أداتك وراجع تاريخ التحميص وتعليمات الحفظ.|Choose a grind for your brewer and check the roast date and storage instructions.|בחרו טחינה לכלי שלכם ובדקו תאריך קלייה והוראות אחסון.",
    products: ["حبوب إسبريسو|Espresso beans|פולי אספרסו", "قهوة فلتر|Filter coffee|קפה פילטר", "طاحونة يدوية|Hand grinder|מטחנה ידנית", "أداة تقطير|Pour-over brewer|כלי לחליטת פילטר", "كوب يومي|Daily mug|ספל יומי", "علبة تذوّق|Tasting box|מארז טעימות"],
    collections: ["حبوب|Beans|פולים", "مطاحن|Grinders|מטחנות", "أدوات|Brewers|כלי חליטה", "أكواب|Cups|ספלים"],
    details: ["المنشأ|Origin|מקור", "التحميص|Roast|קלייה", "الطحنة|Grind|טחינה"],
  }),
  industry({
    id: "food", label: "أكل وحلويات|Food & sweets|אוכל וממתקים", family: "food", kinds: ["sweets", "chocolate", "restaurant", "organic-grocery", "dates-nuts"], brand: "سفرة|Sufra|סופרה",
    title: "للّمة طعم تاني|Good food brings us together|אוכל טוב מחבר בינינו",
    intro: "اختيارات للمائدة، للمشاركة وللهدية. رتّب طلبك حسب ذوقك.|Something for the table, to share or to give. Build your order around your taste.|משהו לשולחן, לחלוק או לתת במתנה. הרכיבו הזמנה לפי הטעם שלכם.",
    story: "الوصفة بتبدأ بالمكوّنات. اكتشف النكهات وحجم الحصّة وطريقة الحفظ قبل ما تختار لجمعتك الجايّة.|A recipe starts with its ingredients. Explore flavours, portion sizes and storage before your next gathering.|מתכון מתחיל ברכיבים. גלו טעמים, גודל מנות והוראות אחסון לפני המפגש הבא.",
    guide: "راجع المكوّنات ومسبّبات الحساسية ووقت التحضير قبل تأكيد الطلب.|Check ingredients, allergens and preparation times before confirming your order.|בדקו רכיבים, אלרגנים וזמני הכנה לפני אישור ההזמנה.",
    products: ["علبة حلويات|Sweets box|מארז ממתקים", "تشكيلة تمر|Date selection|מבחר תמרים", "شوكولاتة|Chocolate|שוקולד", "مكسرات|Nuts|אגוזים", "علبة مشاركة|Sharing box|מארז לחלוקה", "سلة هدية|Gift hamper|סלסלת מתנה"],
    collections: ["للمشاركة|To share|לחלוקה", "حلويات|Sweets|ממתקים", "للمائدة|For the table|לשולחן", "هدايا|Gifts|מתנות"],
    details: ["المكوّنات|Ingredients|רכיבים", "الحساسية|Allergens|אלרגנים", "الحفظ|Storage|אחסון"],
  }),
  industry({
    id: "kids", label: "أطفال وألعاب|Kids & toys|ילדים וצעצועים", family: "kids", kinds: ["toys", "baby-gear", "learning-games", "kids-books"], brand: "فسحة|Fusha|פוסחה",
    title: "مساحة صغيرة لخيال كبير|Little things, big imagination|דברים קטנים, דמיון גדול",
    intro: "اختيارات للّعب، القراءة والاكتشاف. دور على اللي بناسب عمر طفلك واهتمامه.|Play, read and explore. Find something for your child's age and interests.|לשחק, לקרוא ולגלות. מצאו משהו לגיל ולתחומי העניין של ילדכם.",
    story: "أجمل لعبة هي اللي بتفتح باب لخيال جديد. بنرتّب الخيارات حسب العمر والنشاط، وبنبيّن تفاصيل كل قطعة.|The best play opens a door to imagination. Browse by age and activity, with clear details for every item.|המשחק הטוב פותח דלת לדמיון. עיינו לפי גיל ופעילות, עם פרטים ברורים לכל פריט.",
    guide: "راجع العمر الموصى فيه والتحذيرات، واختَر النشاط مع طفلك.|Check recommended ages and warnings, and choose an activity with your child.|בדקו גיל מומלץ ואזהרות ובחרו פעילות יחד עם ילדכם.",
    products: ["مكعبات بناء|Building blocks|קוביות בנייה", "كتاب مصوّر|Picture book|ספר תמונות", "لعبة تركيب|Puzzle|פאזל", "دمية قماش|Soft toy|בובת בד", "عدة رسم|Art kit|ערכת יצירה", "لعبة توازن|Balancing game|משחק שיווי משקל"],
    collections: ["للصغار|Little ones|לקטנטנים", "بناء وتركيب|Build & puzzle|בנייה והרכבה", "كتب وقصص|Books & stories|ספרים וסיפורים", "رسم وخيال|Art & imagination|יצירה ודמיון"],
    details: ["العمر المقترح|Suggested age|גיל מומלץ", "الخامات|Materials|חומרים", "طريقة اللعب|How to play|איך משחקים"],
  }),
  ...ADDITIONAL_INDUSTRIES.map(industry),
];
