/**
 * The shoes category's words and samples (phase 11.3), shared by its templates: sample
 * shoes and categories for the gallery, what a shoe shop promises, asks and is told. Each
 * template writes its own headlines; this is what they draw from. Pictures by name
 * (kits/photos.ts), the shop's placeholders until the category's set is in.
 */
import type { Sample, SampleCat } from "../lib";
import { t } from "../tree";

export const SHOES: Sample[] = [
  { pic: "shoe-1", name: t("أير ستريت 1|Air Street 1|אייר סטריט 1"), price: "429", note: t("جلد ناعم، نعل مرن|Soft leather, flexible sole|עור רך, סוליה גמישה"), tag: t("جديد|New|חדש") },
  { pic: "shoe-2", name: t("رانر برو|Runner Pro|ראנר פרו"), price: "559", note: t("أسود بكل إشي|Black with everything|שחור שהולך עם הכל") },
  { pic: "shoe-3", name: t("كلاسيك لو|Classic Low|קלאסיק לואו"), price: "319", note: t("أبيض بكل إشي|White with everything|לבן שהולך עם הכל") },
  { pic: "shoe-4", name: t("تريل X|Trail X|טרייל X"), price: "619", note: t("قبضة على الصخر|Grip on rock|אחיזה על סלע"), tag: t("الأكثر مبيعاً|Best seller|רב מכר") },
  { pic: "shoe-5", name: t("كورت 85|Court 85|קורט 85"), price: "379", note: t("ريترو من الملعب|Retro from the court|רטרו מהמגרש") },
  { pic: "shoe-6", name: t("لوفر جلد|Leather loafer|מוקסין עור"), price: "689", note: t("مخيّط باليد|Stitched by hand|תפור ביד") },
  { pic: "shoe-7", name: t("كلاود سلايد|Cloud Slide|קלאוד סלייד"), price: "189", note: t("للبيت والبحر|For home and the beach|לבית ולים") },
  { pic: "shoe-8", name: t("هاي توب ناو|Hi-Top Now|היי־טופ נאו"), price: "479", note: t("عنق عالي، ستايل أعلى|High top, higher style|צוואר גבוה, סטייל גבוה יותר") },
];
export const KIDS_SHOES: Sample[] = [
  { pic: "kid-1", name: t("قفّاز النجوم|Star Hopper|קופץ הכוכבים"), price: "169", note: t("بتضوي مع كل خطوة|Lights up with every step|נדלקת בכל צעד"), tag: t("بتضوي|Lights up|מאירה") },
  { pic: "kid-2", name: t("لزقة سريعة|Quick Strap|סקוץ' מהיר"), price: "149", note: t("بيلبسها لحاله|They put it on alone|נועלים לבד") },
  { pic: "kid-3", name: t("أول خطوة|First Steps|צעדים ראשונים"), price: "129", note: t("نعل طري للصغار|Soft sole for little ones|סוליה רכה לקטנטנים") },
  { pic: "cat-kids", name: t("سنيكر ملوّن|Colour Sneaker|סניקר צבעוני"), price: "139", note: t("نعل ما بيزحلق|A sole that doesn't slip|סוליה שלא מחליקה") },
];

export const SHOE_CATS: Record<string, SampleCat> = {
  men: { pic: "cat-men", name: t("رجالي|Men|גברים") },
  women: { pic: "cat-women", name: t("نسائي|Women|נשים") },
  kids: { pic: "cat-kids", name: t("أطفال|Kids|ילדים") },
  running: { pic: "cat-run", name: t("جري|Running|ריצה") },
  sneakers: { pic: "cat-sneakers", name: t("سنيكرز|Sneakers|סניקרס") },
  trail: { pic: "cat-trail", name: t("مشي جبال|Hiking|טיולים") },
  boots: { pic: "cat-boots", name: t("بوتات|Boots|מגפיים") },
  sandals: { pic: "cat-sandals", name: t("صنادل|Sandals|סנדלים") },
  formal: { pic: "cat-formal", name: t("رسمي|Formal|רשמי") },
};
export const cats = (...ids: string[]) => ids.map((id) => SHOE_CATS[id]);

export const SHOE_PROMISES = [
  { icon: "truck", title: t("توصيل مجاني|Free delivery|משלוח חינם"), text: t("لكل الطلبات فوق 300|On every order over 300|לכל הזמנה מעל 300") },
  { icon: "return", title: t("تبديل مقاس ببلاش|Free size swaps|החלפת מידה חינם"), text: t("خلال 30 يوم|Within 30 days|תוך 30 יום") },
  { icon: "shield", title: t("كفالة سنة|A year's warranty|אחריות לשנה"), text: t("على النعل والخياطة|On the sole and the stitching|על הסוליה והתפרים") },
  { icon: "star", title: t("4.9 من 5|4.9 out of 5|4.9 מתוך 5"), text: t("من أكثر من 3,000 زبون|From over 3,000 customers|מיותר מ־3,000 לקוחות") },
];

export const SHOE_FAQ = [
  { q: t("كيف بعرف مقاسي؟|How do I find my size?|איך יודעים מה המידה?"), a: t("قيس رجلك من الكعب لأطول إصبع بالسنتيمتر وقارن بجدول المقاسات. إذا كنت بين مقاسين، خود الأكبر.|Measure your foot from heel to longest toe in centimetres and match the size chart. Between two sizes, take the bigger one.|מודדים את כף הרגל מהעקב עד הבוהן הארוכה בסנטימטרים ומשווים לטבלת המידות. בין שתי מידות — לוקחים את הגדולה.") },
  { q: t("إذا ما زبط المقاس؟|What if it doesn't fit?|ומה אם המידה לא מתאימה?"), a: t("بتبدّله ببلاش خلال 30 يوم، بس يكون نضيف وبكرتونته.|Swap it free within 30 days, clean and in its box.|מחליפים בחינם תוך 30 יום, נקי ובקופסה.") },
  { q: t("قديش بياخد التوصيل؟|How long does delivery take?|כמה זמן לוקח המשלוח?"), a: t("من يوم لثلاث أيام عمل لكل البلاد.|One to three working days, everywhere.|יום עד שלושה ימי עסקים לכל הארץ.") },
  { q: t("كيف بنضّف الجلد؟|How do I clean leather?|איך מנקים עור?"), a: t("بقماشة رطبة وصابون خفيف، وبعدين كريم جلد. بلاش غسالة.|A damp cloth and mild soap, then leather cream. No washing machine.|מטלית לחה וסבון עדין, ואז קרם לעור. לא במכונת כביסה.") },
];

export const SHOE_REVIEWS = [
  { quote: t("أخف حذاء جري لبسته، ركضت فيه 20 كيلو من أول يوم.|The lightest running shoe I've worn: 20 km on the first day.|נעל הריצה הכי קלה שנעלתי: 20 ק\"מ ביום הראשון."), name: t("سامر|Samer|סאמר"), role: t("عدّاء مسافات|Distance runner|רץ למרחקים"), stars: 5 },
  { quote: t("طلبت مقاسين وبدّلت واحد ببلاش، والتوصيل كان تاني يوم.|Ordered two sizes, swapped one free, delivered the next day.|הזמנתי שתי מידות, החלפתי אחת בחינם, וזה הגיע למחרת."), name: t("لينا|Lina|לינה"), role: t("زبونة من أول سنة|A customer since year one|לקוחה מהשנה הראשונה"), stars: 5 },
  { quote: t("الجلد بيتحسّن مع الوقت، صار على قد رجلي تماماً.|The leather gets better with time; it's shaped to my foot now.|העור משתבח עם הזמן, עכשיו הוא בדיוק בצורת הרגל שלי."), name: t("يوسف|Yousef|יוסף"), role: t("محامي|Lawyer|עורך דין"), stars: 5 },
  { quote: t("ابني ما بدّو يشلحها، حتى بالنوم!|My son won't take them off, even to sleep!|הבן שלי לא מוכן להוריד אותן, אפילו לישון!"), name: t("رنا|Rana|רנא"), role: t("أم لولدين|Mother of two|אמא לשניים"), stars: 5 },
];

/** Days ahead, as a countdown takes it (a store sets its own). */
export const soon = (days: number) => {
  const d = new Date(Date.UTC(2026, 0, 1) + Math.ceil((Date.now() - Date.UTC(2026, 0, 1)) / 86_400_000 + days) * 86_400_000);
  return `${d.toISOString().slice(0, 10)}T20:00`;
};
