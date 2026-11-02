/**
 * Each design's signature section (phase 11.2): the section only it has, as one of a set of
 * mechanics (home/signatures.tsx draws them) set up with the design's own options and words.
 * Where a mechanic shows things, they're the store's own (its products, its categories, its
 * opening picture); a calculator says it's a rough guide; nothing is made up about the store.
 *
 * Words written short as "Arabic|English|Hebrew" (a number or a size alone stands for all three).
 */
import type { Words } from "./axes";

export const MECHANICS = [
  "finder", "meter", "builder", "compare", "steps", "checklist", "timeline", "script", "draw", "falling", "lens", "mixer",
  "calc", "timer", "beforeafter", "runway", "wave", "hotspots", "wheel", "hex", "seats", "search", "typewriter", "flip", "wall",
] as const;
export type Mechanic = (typeof MECHANICS)[number];
export type Signature = {
  m: Mechanic;
  /** Choices, stops, steps or names (a finder with none offers the store's categories). */
  items?: Words[];
  /** A timeline's tip for each stage. */
  tips?: Words[];
  /** A builder's box size, a timer's minutes. */
  n?: number;
  /** Which kind of calculator, what a script is written on, what falls, a timer's end, before-and-after's look. */
  as?: string;
};

const W = (s: string): Words => {
  const [ar, en = ar, he = en] = s.split("|");
  return { ar, en, he };
};
const L = (...xs: string[]) => xs.map(W);
const S = (m: Mechanic, extra: Omit<Signature, "m"> = {}): Signature => ({ m, ...extra });

export const SIGNATURES: Record<string, Signature> = {
  "womens-fashion": S("runway"),
  "mens-fashion": S("finder", { items: L("ضيّق|Slim|צר", "عادي|Regular|רגיל", "واسع|Relaxed|רחב") }),
  "modest-fashion": S("finder", { items: L("شيفون|Chiffon|שיפון", "كريب|Crepe|קרפ", "كتان|Linen|פשתן", "حرير|Silk|משי") }),
  "kids-clothing": S("finder", { items: L("0–2 سنين|0–2 years|0–2 שנים", "3–5 سنين|3–5 years|3–5 שנים", "6–8 سنين|6–8 years|6–8 שנים", "9–12 سنة|9–12 years|9–12 שנים") }),
  "shoes-sneakers": S("compare"),
  "bags-leather": S("lens"),
  "gold-jewelry": S("meter", { items: L("18 قيراط|18 karat|18 קראט", "21 قيراط|21 karat|21 קראט", "24 قيراط|24 karat|24 קראט") }),
  "silver-handmade": S("steps", { items: L("صب الفضة|Casting the silver|יציקת הכסף", "تشكيل باليد|Shaping by hand|עיצוב ביד", "التلميع|Polishing|ליטוש", "ختم الصانع|The maker's stamp|חותמת האומן") }),
  watches: S("lens"),
  eyewear: S("finder", { items: L("وجه مدوّر|Round face|פנים עגולות", "وجه مربع|Square face|פנים מרובעות", "وجه بيضاوي|Oval face|פנים סגלגלות", "وجه قلب|Heart-shaped face|פנים בצורת לב") }),
  sportswear: S("finder", { items: L("جري|Running|ריצה", "جيم|Gym|חדר כושר", "يوغا|Yoga|יוגה", "مشي|Walking|הליכה") }),
  sleepwear: S("meter", { items: L("قطن|Cotton|כותנה", "مودال|Modal|מודאל", "ساتان|Satin|סאטן", "حرير|Silk|משי") }),
  "oud-perfume": S("steps", { as: "pyramid", items: L("القمة: حمضيات|Top: citrus|ראש: הדרים", "القلب: ورد وزعفران|Heart: rose and saffron|לב: ורד וזעפרן", "القاعدة: عود ومسك|Base: oud and musk|בסיס: עוד ומאסק") }),
  makeup: S("meter", { items: L("فاتح|Light|בהיר", "وسط|Medium|בינוני", "حنطي|Tan|שזוף", "غامق|Deep|כהה") }),
  skincare: S("checklist", { items: L("نظّفي|Cleanse|ניקוי", "سيروم|Serum|סרום", "رطّبي|Moisturise|לחות", "واقي شمس|Sunscreen|קרם הגנה") }),
  "barber-hair": S("steps", { items: L("اختار الحلّاق|Pick a barber|בחרו ספר", "اختار الوقت|Pick a time|בחרו שעה", "تعال وارتاح|Come in and relax|בואו ותירגעו") }),
  "henna-bridal": S("draw", { as: "henna" }),
  nails: S("mixer"),
  "natural-soap": S("falling", { as: "leaves" }),
  "mens-grooming": S("finder", { items: L("لحية خفيفة|Stubble|זיפים", "لحية قصيرة|Short beard|זקן קצר", "لحية كاملة|Full beard|זקן מלא", "سكسوكة|Goatee|זקנקן") }),
  "mobile-phones": S("compare"),
  "phone-accessories": S("finder"),
  laptops: S("meter", { as: "memory", items: L("8GB", "16GB", "32GB", "64GB") }),
  gaming: S("builder", { n: 4 }),
  cameras: S("lens", { as: "zoom" }),
  audio: S("wave"),
  "smart-living": S("finder", { items: L("الصالون|Living room|סלון", "المطبخ|Kitchen|מטבח", "غرفة النوم|Bedroom|חדר שינה", "المدخل|Entrance|כניסה") }),
  "gadgets-drones": S("draw", { as: "path" }),
  "printers-office": S("finder"),
  "phone-repair": S("steps", { as: "tracker", items: L("استلمنا الجهاز|Received|התקבל", "انفحص|Checked|נבדק", "تصلّح|Repaired|תוקן", "جاهز تستلمه|Ready to collect|מוכן לאיסוף") }),
  furniture: S("hotspots"),
  "home-decor": S("builder", { n: 6, as: "board" }),
  kitchenware: S("builder", { n: 5 }),
  bedding: S("meter", { items: L("200 خيط|200 threads|200 חוטים", "400 خيط|400 threads|400 חוטים", "600 خيط|600 threads|600 חוטים", "800 خيط|800 threads|800 חוטים") }),
  lighting: S("beforeafter", { as: "lights" }),
  rugs: S("lens", { as: "knot" }),
  "plants-garden": S("finder", { items: L("ضو قوي|Bright light|אור חזק", "ضو نص نص|Some light|אור חלקי", "ضو قليل|Low light|מעט אור") }),
  "hardware-tools": S("finder", { items: L("دهان|Painting|צביעה", "رفوف|Shelves|מדפים", "سباكة|Plumbing|אינסטלציה", "كهربا|Electrics|חשמל") }),
  cleaning: S("meter", { items: L("كل أسبوعين|Every 2 weeks|כל שבועיים", "كل شهر|Every month|כל חודש", "كل شهرين|Every 2 months|כל חודשיים") }),
  "wall-art": S("wall"),
  sweets: S("builder", { n: 6, as: "tray" }),
  coffee: S("meter", { items: L("فاتح|Light|בהיר", "وسط|Medium|בינוני", "غامق|Dark|כהה", "إسبرسو|Espresso|אספרסו") }),
  tea: S("timer", { as: "steep", n: 3 }),
  chocolate: S("meter", { items: L("55%", "70%", "85%", "100%") }),
  "dates-nuts": S("builder", { n: 8, as: "box" }),
  spices: S("wheel"),
  butcher: S("finder", { items: L("كتف|Shoulder|כתף", "ريش|Ribs|צלעות", "فخذ|Leg|ירך", "فيليه|Fillet|פילה") }),
  "fish-market": S("runway"),
  "organic-grocery": S("steps", { as: "farm", items: L("المزرعة|The farm|החווה", "القطف|The picking|הקטיף", "التغليف|The packing|האריזה", "لبيتك|To your home|אליכם הביתה") }),
  restaurant: S("steps", { as: "tracker", items: L("انطلب|Ordered|הוזמן", "عالنار|Cooking|בהכנה", "بالطريق|On the way|בדרך", "وصل|Delivered|נמסר") }),
  "juice-bar": S("mixer", { as: "fruit" }),
  honey: S("hex"),
  pharmacy: S("steps", { items: L("صوّر الوصفة|Photograph the prescription|צלמו את המרשם", "ابعتها إلنا|Send it to us|שלחו לנו", "الصيدلي بيجهّزها|The pharmacist prepares it|הרוקח מכין", "بتوصلك|It reaches you|זה מגיע אליכם") }),
  vitamins: S("timeline", { items: L("الصبح|Morning|בוקר", "الظهر|Noon|צהריים", "المسا|Evening|ערב"), tips: L("مع الفطور|With breakfast|עם ארוחת הבוקר", "مع الغدا|With lunch|עם ארוחת הצהריים", "قبل النوم|Before bed|לפני השינה") }),
  "medical-equipment": S("compare"),
  "baby-care": S("timeline", { items: L("0–3 أشهر|0–3 months|0–3 חודשים", "4–6 أشهر|4–6 months|4–6 חודשים", "7–12 شهر|7–12 months|7–12 חודשים"), tips: L("حفاضات وكريمات لطيفة|Nappies and gentle creams|חיתולים וקרמים עדינים", "أول أكل وملاعق ناعمة|First foods and soft spoons|אוכל ראשון וכפיות רכות", "ألعاب وحركة|Toys and moving about|צעצועים ותנועה") }),
  "sports-nutrition": S("calc", { as: "protein" }),
  maternity: S("timeline", { items: L("الثلث الأول|First trimester|שליש ראשון", "الثلث التاني|Second trimester|שליש שני", "الثلث التالت|Third trimester|שליש שלישי"), tips: L("راحة وفيتامينات|Rest and vitamins|מנוחה וויטמינים", "ملابس مريحة|Comfortable clothes|בגדים נוחים", "تجهيز للولادة|Getting ready for the birth|הכנה ללידה") }),
  toys: S("falling", { as: "toys" }),
  "baby-gear": S("compare"),
  stationery: S("checklist", { items: L("دفاتر|Notebooks|מחברות", "أقلام|Pens|עטים", "شنطة|A bag|תיק", "مقلمة|A pencil case|קלמר", "ألوان|Colours|צבעים") }),
  "kids-books": S("flip"),
  "party-supplies": S("finder", { items: L("عيد ميلاد|Birthday|יום הולדת", "تخرّج|Graduation|סיום לימודים", "عرس|Wedding|חתונה", "مولود جديد|New baby|תינוק חדש") }),
  "learning-games": S("finder", { items: L("حساب|Maths|חשבון", "لغة|Language|שפה", "علوم|Science|מדעים", "فن|Art|אמנות") }),
  books: S("typewriter"),
  "music-instruments": S("wave", { as: "strings" }),
  "art-supplies": S("mixer", { as: "paint" }),
  crafts: S("checklist", { items: L("صف 1: عقدة البداية|Row 1: the slip knot|שורה 1: לולאת התחלה", "صف 2: غرزة عادية|Row 2: knit stitch|שורה 2: עין רגילה", "صف 3: غرزة مقلوبة|Row 3: purl stitch|שורה 3: עין הפוכה", "صف 4: سكّر الشغلة|Row 4: bind off|שורה 4: סגירה") }),
  collectibles: S("meter", { items: L("عادي|Common|נפוץ", "نادر|Rare|נדיר", "نادر جداً|Very rare|נדיר מאוד", "أسطوري|Legendary|אגדי") }),
  "board-games": S("finder", { items: L("2 لاعبين|2 players|2 שחקנים", "3–4 لاعبين|3–4 players|3–4 שחקנים", "5–6 لاعبين|5–6 players|5–6 שחקנים", "7 وأكتر|7 or more|7 ומעלה") }),
  "art-gallery": S("runway", { as: "slow" }),
  calligraphy: S("script"),
  "tickets-events": S("seats"),
  "vinyl-records": S("wheel", { as: "record" }),
  "gym-equipment": S("calc", { as: "gym" }),
  bikes: S("calc", { as: "bike" }),
  camping: S("checklist", { items: L("خيمة|A tent|אוהל", "كيس نوم|A sleeping bag|שק שינה", "مصباح|A lamp|פנס", "مي كفاية|Enough water|מספיק מים", "إسعاف أولي|First aid|עזרה ראשונה") }),
  fishing: S("finder", { items: L("بحر|Sea|ים", "بحيرة|Lake|אגם", "نهر|River|נהר") }),
  football: S("script", { as: "shirt" }),
  "beach-swim": S("timeline", { items: L("الصبح بكير|Early morning|בוקר מוקדם", "الظهر|Midday|צהריים", "العصر|Late afternoon|אחר הצהריים"), tips: L("أحلى وقت للسباحة|The best time to swim|הזמן הכי טוב לשחות", "شمس قوية: ظل وواقي|Strong sun: shade and sunscreen|שמש חזקה: צל וקרם הגנה", "مشوار عالشط|A walk on the shore|הליכה על החוף") }),
  "car-accessories": S("finder"),
  "spare-parts": S("search"),
  motorcycles: S("wave", { as: "rev" }),
  "car-care": S("beforeafter", { as: "shine" }),
  "pet-store": S("finder", { items: L("قطة|Cat|חתול", "كلب|Dog|כלב", "عصفور|Bird|ציפור", "أرنب|Rabbit|ארנב") }),
  aquarium: S("calc", { as: "tank" }),
  "pet-grooming": S("steps", { items: L("احجز|Book|הזמינו", "حمّام|A bath|רחצה", "قص وتمشيط|A trim and brush|תספורת והברשה", "استلمه نضيف|Collect them clean|איסוף נקי") }),
  "online-courses": S("timeline", { items: L("الأساسيات|The basics|היסודות", "التطبيق|Practice|תרגול", "الاحتراف|Mastery|מקצוענות"), tips: L("أول خطوة سهلة|An easy first step|צעד ראשון קל", "مشاريع صغيرة|Small projects|פרויקטים קטנים", "شهادة بآخر المسار|A certificate at the end|תעודה בסוף המסלול") }),
  "game-keys": S("typewriter", { as: "key" }),
  "gift-cards": S("script", { as: "card" }),
  "print-on-demand": S("script", { as: "mug" }),
  photography: S("finder", { items: L("عرس|Wedding|חתונה", "عيلة|Family|משפחה", "منتجات|Products|מוצרים", "مواليد|Newborns|תינוקות") }),
  "beauty-salon": S("finder"),
  "cleaning-services": S("meter", { items: L("غرفة وحدة|One room|חדר אחד", "غرفتين|Two rooms|שני חדרים", "3 غرف|Three rooms|שלושה חדרים", "4 غرف وأكتر|Four rooms or more|ארבעה חדרים ומעלה") }),
  "wedding-planning": S("timer", { as: "date" }),
  flowers: S("falling", { as: "petals" }),
  "gift-hampers": S("builder", { n: 6, as: "hamper" }),
  "wedding-supplies": S("hotspots"),
  balloons: S("mixer", { as: "balloons" }),
  "handmade-market": S("runway"),
  supermarket: S("builder", { n: 10, as: "basket" }),
  deals: S("timer", { as: "midnight" }),
  wholesale: S("meter", { items: L("10 قطع وأكتر|10 or more|10 ומעלה", "50 قطعة وأكتر|50 or more|50 ומעלה", "100 قطعة وأكتر|100 or more|100 ומעלה", "500 قطعة وأكتر|500 or more|500 ומעלה") }),
  "second-hand": S("flip"),
};
