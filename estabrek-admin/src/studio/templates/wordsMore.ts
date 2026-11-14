/**
 * More ready words for the section library (sectionsStore.ts, sectionsTrust.ts): reviews, questions about paying,
 * a product's facts, branches, opening hours, a week's programme, what sets the store apart, and the small lines
 * the new sections say. In the three languages, like words.ts.
 */
import { w, type IconName, type W } from "./words";

export const X = {
  percent: w("20٪", "20%", "20%"),
  ourTime: w("الساعة عنّا هلّق", "Our time now", "השעה אצלנו עכשיו"),
  askUs: w("عندكم سؤال؟ احكوا معنا عالواتساب", "A question? Talk to us on WhatsApp", "יש שאלה? דברו איתנו בוואטסאפ"),
  whatsapp: w("واتساب", "WhatsApp", "וואטסאפ"),
  callUs: w("اتصلوا فينا", "Call us", "התקשרו אלינו"),
  dealToday: w("عرض اليوم", "Today's deal", "מבצע היום"),
  letterTitle: w("كلمة من القلب", "A word from the heart", "מילה מהלב"),
  letterMore: w("كل قطعة عنّا اخترناها بإيدينا وجرّبناها قبل ما نعرضها عليكم. وإذا ما عجبتكم، بترجع ببساطة.", "We chose every piece by hand and tried it before offering it to you. And if you don't love it, sending it back is simple.", "בחרנו כל פריט בעצמנו וניסינו אותו לפני שהצענו לכם. ואם לא אהבתם, פשוט מחזירים."),
  journey: w("مشوارنا", "Our journey", "המסע שלנו"),
  gallery: w("من عالمنا", "From our world", "מהעולם שלנו"),
  gallerySub: w("صور من المتجر، من الزباين ومن ورا الكواليس.", "Pictures from the store, from customers and from behind the scenes.", "תמונות מהחנות, מהלקוחות ומאחורי הקלעים."),
  brandsSub: w("منشتغل مع أسماء بتثقوا فيها.", "We work with names you trust.", "אנחנו עובדים עם שמות שאתם סומכים עליהם."),
  press: w("حكوا عنّا", "As seen in", "כתבו עלינו"),
  pressQuote: w("«متجر صغير بذوق كبير، وخدمة بتخلّيك ترجع.»", "“A small store with great taste, and service that brings you back.”", "״חנות קטנה עם טעם גדול, ושירות שמחזיר אתכם שוב.״"),
  guarantee: w("ضمان الرضا 100٪", "A 100% happiness promise", "הבטחת שביעות רצון 100%"),
  guaranteeSub: w("إذا ما عجبتكم القطعة، رجّعوها خلال 14 يوم وبنرجّعلكم المبلغ كامل. بدون أسئلة.", "If you don't love the piece, send it back within 14 days and we refund all of it. No questions.", "אם לא אהבתם את הפריט, החזירו אותו תוך 14 יום ונחזיר את כל הסכום. בלי שאלות."),
  ratingBig: w("4.9", "4.9", "4.9"),
  programme: w("برنامج الأسبوع", "This week's programme", "התכנית השבועית"),
  programmeSub: w("ورشات، بث مباشر وعروض خاصة. احجزوا مكانكم.", "Workshops, live sessions and special offers. Save your place.", "סדנאות, שידורים חיים ומבצעים מיוחדים. שריינו מקום."),
  hoursTitle: w("ساعات الدوام", "Opening hours", "שעות פתיחה"),
  open: w("المتجر مفتوح", "The store is open", "החנות פתוחה"),
  closed: w("مسكّرين", "Closed", "סגור"),
  half: w("دوام قصير", "A short day", "יום קצר"),
  usVsOthers: w("ليش نحنا؟", "Why us?", "למה אנחנו?"),
  us: w("عنّا", "With us", "אצלנו"),
  others: w("عند غيرنا", "Elsewhere", "במקומות אחרים"),
  loved: w("شو أكتر إشي بيحبّوه الزباين", "What customers love most", "מה הלקוחות הכי אוהבים"),
  growth: w("كل سنة منكبر معكم", "Every year we grow with you", "כל שנה אנחנו גדלים איתכם"),
  ordersYear: w("طلبات بالسنة", "Orders a year", "הזמנות בשנה"),
  whereFrom: w("من وين زبايننا", "Where our customers are", "מאיפה הלקוחות שלנו"),
  happy: w("زبون مبسوط وبعدنا منعدّ", "happy customers, and counting", "לקוחות מרוצים, ועוד סופרים"),
  enjoy: w("استمتعوا", "Enjoy", "נהנים"),
  enjoySub: w("وإذا في أي إشي، نحنا عالواتساب.", "And if there's anything at all, we're on WhatsApp.", "ואם יש משהו, אנחנו בוואטסאפ."),
  payTitle: w("الدفع", "Paying", "תשלום"),
  needHelp: w("محتاجين مساعدة؟", "Need a hand?", "צריכים עזרה?"),
  needHelpSub: w("فريقنا بيرد خلال دقايق بساعات الدوام.", "Our team answers within minutes during opening hours.", "הצוות שלנו עונה תוך דקות בשעות הפעילות."),
  shopCard: w("تسوّقوا التشكيلة", "Shop the collection", "לקנות את הקולקציה"),
  talkCard: w("احكوا مع حدا منّا", "Talk to one of us", "דברו עם אחד מאיתנו"),
  whatYouGet: w("شو بتاخدوا؟", "What do you get?", "מה מקבלים?"),
  gets: [
    w("خصم 10٪ على أول طلب", "10% off your first order", "10% הנחה על ההזמנה הראשונה"),
    w("عروض قبل الكل", "Offers before anyone else", "מבצעים לפני כולם"),
    w("قطع جديدة كل أسبوع", "New pieces every week", "פריטים חדשים כל שבוע"),
  ],
  howCode: w("كيف بستعمل الكود؟", "How do I use the code?", "איך משתמשים בקוד?"),
  monthly: w("بالشهر", "a month", "לחודש"),
  yearly: w("بالسنة", "a year", "לשנה"),
  choose: w("اختاروا", "Choose", "לבחירה"),
  loved2: w("الأشهر", "Most loved", "הכי אהוב"),
  onePlan: w("باقة وحدة، فيها كل إشي", "One bundle with everything in it", "חבילה אחת עם הכול"),
  founder: w("المؤسِّسة", "The founder", "המייסדת"),
  before: w("قبل", "Before", "לפני"),
  after: w("بعد", "After", "אחרי"),
  specs: w("المواصفات", "Specifications", "מפרט"),
  branches: w("فروعنا", "Our branches", "הסניפים שלנו"),
  directions: w("كيف بوصل؟", "Get directions", "איך מגיעים?"),
  topLine: w("توصيل مجاني فوق ₪200 · إرجاع خلال 14 يوم", "Free delivery over ₪200 · Returns within 14 days", "משלוח חינם מעל ₪200 · החזרה תוך 14 יום"),
  maintenance: w("راجعين بعد شوي", "Back in a little while", "חוזרים עוד מעט"),
  maintenanceSub: w("منعمل تحسينات صغيرة عالمتجر. جرّبوا بعد كم دقيقة، أو احكوا معنا عالواتساب.", "We're making a few small improvements. Try again in a few minutes, or talk to us on WhatsApp.", "אנחנו עושים כמה שיפורים קטנים. נסו שוב בעוד כמה דקות, או דברו איתנו בוואטסאפ."),
  orderIn: w("وصلنا طلبكم!", "Your order is in!", "ההזמנה התקבלה!"),
  orderInSub: w("بعتنالكم التفاصيل عالإيميل. هيك بيمشي الطلب من هلّق:", "We've emailed you the details. Here is what happens next:", "שלחנו את הפרטים במייל. כך זה ממשיך מכאן:"),
  emptyCart: w("سلتكم فاضية", "Your bag is empty", "הסל שלכם ריק"),
  emptyCartSub: w("خلّينا نعبّيها. هاي قطع بيحبّوها الزباين.", "Let's fill it. Here are pieces customers love.", "בואו נמלא אותו. הנה פריטים שהלקוחות אוהבים."),
  searchHere: w("دوّروا عن إشي تاني", "Look for something else", "חפשו משהו אחר"),
  flash: w("عرض خاطف، لساعات بس", "A flash sale, for hours only", "מבצע בזק, לשעות בלבד"),
  freeShip: w("توصيل مجاني على طلبكم اليوم", "Free delivery on your order today", "משלוח חינם על ההזמנה היום"),
  lastChance: w("آخر فرصة", "Last chance", "הזדמנות אחרונה"),
  seeAllReviews: w("شوفوا كل الآراء", "See every review", "לכל הביקורות"),
  secure: w("دفع آمن ومشفّر", "Secure, encrypted payment", "תשלום מאובטח ומוצפן"),
  inStock: w("موجود بالمخزن", "In stock", "במלאי"),
};

/** Six reviews (the first three are the section library's own). */
export const MORE_QUOTES: Array<{ quote: W; name: W; role: W }> = [
  { quote: w("وصل بسرعة وطلع متل الصور بالزبط.", "Arrived fast and exactly like the photos.", "הגיע מהר ובדיוק כמו בתמונות."), name: w("سارة م.", "Sarah M.", "שרה מ."), role: w("حيفا", "Haifa", "חיפה") },
  { quote: w("ردّوا عليّ عالواتساب بدقايق وساعدوني أختار.", "They answered on WhatsApp in minutes and helped me choose.", "ענו לי בוואטסאפ תוך דקות ועזרו לי לבחור."), name: w("أحمد ك.", "Ahmad K.", "אחמד כ."), role: w("الناصرة", "Nazareth", "נצרת") },
  { quote: w("تالت طلب إلي، وأكيد مش الأخير.", "My third order, and surely not the last.", "ההזמנה השלישית שלי, ובטוח לא האחרונה."), name: w("ليلى ن.", "Layla N.", "ליילה נ."), role: w("عكا", "Acre", "עכו") },
  { quote: w("التغليف لحاله هدية. اشتريتها لأمي وانبسطت كتير.", "The wrapping alone is a gift. I bought it for my mum and she loved it.", "האריזה לבדה היא מתנה. קניתי לאמא שלי והיא שמחה מאוד."), name: w("رنا ح.", "Rana H.", "רנא ח."), role: w("شفاعمرو", "Shefa-Amr", "שפרעם") },
  { quote: w("بدّلت المقاس بدون أي وجع راس.", "I exchanged the size with no fuss at all.", "החלפתי מידה בלי שום כאב ראש."), name: w("يوسف ع.", "Yousef A.", "יוסף ע."), role: w("يافا", "Jaffa", "יפו") },
  { quote: w("الجودة أحسن من اللي توقّعته بهالسعر.", "The quality is better than I expected at this price.", "האיכות טובה ממה שציפיתי במחיר הזה."), name: w("ميرا س.", "Mira S.", "מירה ס."), role: w("القدس", "Jerusalem", "ירושלים") },
];

export const PAY_QA: Array<[W, W]> = [
  [w("كيف بقدر أدفع؟", "How can I pay?", "איך אפשר לשלם?"), w("ببطاقة الاعتماد، أو كاش عند الاستلام.", "By credit card, or cash on delivery.", "בכרטיס אשראי, או במזומן במסירה.")],
  [w("الدفع آمن؟", "Is paying safe?", "התשלום מאובטח?"), w("أكيد. الدفع بيمر عن طريق شركة دفع مرخّصة، وما منحفظ رقم بطاقتكم.", "Yes. Payment goes through a licensed provider and we never keep your card number.", "בוודאי. התשלום עובר דרך חברת סליקה מורשית ואנחנו לא שומרים את מספר הכרטיס.")],
  [w("في تقسيط؟", "Can I pay in instalments?", "אפשר לשלם בתשלומים?"), w("آه، لحد 3 دفعات بدون فوايد على الطلبات فوق ₪300.", "Yes, up to three interest-free payments on orders over ₪300.", "כן, עד שלושה תשלומים ללא ריבית בהזמנות מעל ₪300.")],
];

/** A product's facts, a label and its value. */
export const SPECS: Array<[W, W]> = [
  [w("المادة", "Material", "חומר"), w("خامات مختارة بعناية", "Carefully chosen materials", "חומרים שנבחרו בקפידה")],
  [w("القياس", "Size", "מידה"), w("شوفوا دليل المقاسات", "See the size guide", "ראו את מדריך המידות")],
  [w("العناية", "Care", "טיפול"), w("تنضيف خفيف وحفظ بمكان ناشف", "Clean gently and keep somewhere dry", "ניקוי עדין ושמירה במקום יבש")],
  [w("التوصيل", "Delivery", "משלוח"), w("2–4 أيام عمل", "2–4 working days", "2–4 ימי עסקים")],
  [w("الضمان", "Warranty", "אחריות"), w("سنة كاملة", "A full year", "שנה מלאה")],
];

export const BRANCHES: Array<{ name: W; address: W; hours: W; query: string }> = [
  { name: w("فرع الناصرة", "Nazareth branch", "סניף נצרת"), address: w("شارع الكرمل 12", "12 Carmel St", "רחוב הכרמל 12"), hours: w("9:00 – 20:00", "9:00 – 20:00", "9:00 – 20:00"), query: "Nazareth" },
  { name: w("فرع حيفا", "Haifa branch", "סניף חיפה"), address: w("شارع الجبل 40", "40 Mountain St", "רחוב ההר 40"), hours: w("10:00 – 21:00", "10:00 – 21:00", "10:00 – 21:00"), query: "Haifa" },
  { name: w("فرع عكا", "Acre branch", "סניף עכו"), address: w("السوق القديم 7", "7 Old Market", "השוק העתיק 7"), hours: w("9:00 – 18:00", "9:00 – 18:00", "9:00 – 18:00"), query: "Acre" },
];

/** The week's opening hours: the days, the hours, what it is. */
export const HOURS: Array<{ day: W; time: string; title: W }> = [
  { day: w("السبت – الأربعا", "Saturday – Wednesday", "שבת – רביעי"), time: "9:00 – 20:00", title: X.open },
  { day: w("الخميس", "Thursday", "חמישי"), time: "9:00 – 22:00", title: X.open },
  { day: w("الجمعة", "Friday", "שישי"), time: "9:00 – 14:00", title: X.half },
  { day: w("الأحد", "Sunday", "ראשון"), time: "—", title: X.closed },
];

export const EVENTS: Array<{ day: W; time: string; title: W; text: W; speaker: W; location: W }> = [
  { day: w("الاثنين", "Monday", "שני"), time: "18:00", title: w("ورشة: كيف تختاروا الهدية", "Workshop: choosing the right gift", "סדנה: איך בוחרים מתנה"), text: w("ساعة من الأفكار والتجربة، مع ضيافة.", "An hour of ideas and trying things, with refreshments.", "שעה של רעיונות והתנסות, עם כיבוד."), speaker: w("ليلى", "Layla", "ליילה"), location: w("المتجر", "The store", "החנות") },
  { day: w("الأربعا", "Wednesday", "רביעי"), time: "20:00", title: w("بث مباشر: وصل جديد", "Live: new arrivals", "שידור חי: חדש בחנות"), text: w("منفتح الكراتين سوا ومنجاوب على أسئلتكم.", "We open the boxes together and answer your questions.", "פותחים את הקרטונים יחד ועונים על שאלות."), speaker: w("عمر", "Omar", "עומר"), location: w("إنستغرام", "Instagram", "אינסטגרם") },
  { day: w("الخميس", "Thursday", "חמישי"), time: "17:00", title: w("سهرة الزباين", "Customers' evening", "ערב לקוחות"), text: w("خصم خاص للحاضرين، وسحب على هدية.", "A special discount for those who come, and a gift draw.", "הנחה מיוחדת למגיעים והגרלת מתנה."), speaker: w("دانا", "Dana", "דנה"), location: w("المتجر", "The store", "החנות") },
  { day: w("السبت", "Saturday", "שבת"), time: "11:00", title: w("صباح العيلة", "Family morning", "בוקר משפחתי"), text: w("فعاليات للأولاد وقهوة للأهل.", "Activities for the children and coffee for the parents.", "פעילויות לילדים וקפה להורים."), speaker: w("الفريق", "The team", "הצוות"), location: w("المتجر", "The store", "החנות") },
];

/** What sets the store apart: a line, and whether it holds here and elsewhere. */
export const VERSUS: Array<[W, boolean, boolean]> = [
  [w("توصيل خلال 2–4 أيام", "Delivery in 2–4 days", "משלוח תוך 2–4 ימים"), true, false],
  [w("إرجاع ببلاش خلال 14 يوم", "Free returns within 14 days", "החזרה חינם תוך 14 יום"), true, false],
  [w("رد عالواتساب بدقايق", "WhatsApp replies in minutes", "מענה בוואטסאפ תוך דקות"), true, false],
  [w("دفع عند الاستلام", "Cash on delivery", "תשלום במסירה"), true, true],
  [w("تغليف هدية ببلاش", "Free gift wrapping", "אריזת מתנה חינם"), true, false],
];

/** What customers love most, out of a hundred. */
export const LOVED: Array<[W, number]> = [
  [w("الجودة", "Quality", "איכות"), 96],
  [w("سرعة التوصيل", "Delivery speed", "מהירות המשלוח"), 92],
  [w("خدمة الزباين", "Customer care", "שירות הלקוחות"), 98],
  [w("التغليف", "Wrapping", "אריזה"), 89],
];
export const GROWTH: Array<[W, number]> = [
  [w("2021", "2021", "2021"), 1200],
  [w("2022", "2022", "2022"), 3400],
  [w("2023", "2023", "2023"), 6100],
  [w("2024", "2024", "2024"), 9800],
  [w("2025", "2025", "2025"), 12000],
];
export const REGIONS: Array<[W, number]> = [
  [w("الشمال", "The north", "הצפון"), 46],
  [w("المركز", "The centre", "המרכז"), 31],
  [w("الجنوب", "The south", "הדרום"), 14],
  [w("القدس", "Jerusalem", "ירושלים"), 9],
];

/** Small offers side by side. */
export const DEALS: Array<{ icon: IconName; title: W; text: W }> = [
  { icon: "gift", title: w("اشتروا 2 والتالتة ببلاش", "Buy 2, get the third free", "קנו 2, השלישי חינם"), text: w("على كل قطع التشكيلة الجديدة.", "On every piece of the new collection.", "על כל פריטי הקולקציה החדשה.") },
  { icon: "truck", title: w("توصيل مجاني فوق ₪200", "Free delivery over ₪200", "משלוח חינם מעל ₪200"), text: w("لكل البلاد، خلال 2–4 أيام.", "Nationwide, in 2–4 days.", "לכל הארץ, תוך 2–4 ימים.") },
  { icon: "sparkle", title: w("خصم 10٪ لأول طلب", "10% off a first order", "10% הנחה להזמנה ראשונה"), text: w("مع الكود WELCOME10.", "With the code WELCOME10.", "עם הקוד WELCOME10.") },
];
export const CODE_STEPS: Array<{ title: W; text: W }> = [
  { title: w("عبّوا السلة", "Fill your bag", "ממלאים את הסל"), text: w("اختاروا القطع اللي عجبتكم.", "Choose the pieces you like.", "בוחרים את הפריטים שאהבתם.") },
  { title: w("اكتبوا الكود", "Type the code", "מקלידים את הקוד"), text: w("بخانة «كود الخصم» بصفحة الدفع.", "In the “discount code” box at checkout.", "בתיבת ״קוד הנחה״ בדף התשלום."), },
  { title: w("وفّروا", "Save", "חוסכים"), text: w("الخصم بينزل لحاله من المجموع.", "The discount comes off the total by itself.", "ההנחה יורדת מהסכום אוטומטית.") },
];

/** A club's plans: a month's price and a year's. */
export const CLUB: Array<{ name: W; month: string; year: string; features: W; featured?: boolean }> = [
  { name: w("عضوية فضية", "Silver", "כסף"), month: "₪19", year: "₪190", features: w("توصيل مجاني\nخصم 5٪ دايماً", "Free delivery\n5% off always", "משלוח חינם\n5% הנחה תמיד") },
  { name: w("عضوية ذهبية", "Gold", "זהב"), month: "₪39", year: "₪390", features: w("توصيل مجاني سريع\nخصم 10٪ دايماً\nهدية بعيد ميلادكم", "Free fast delivery\n10% off always\nA birthday gift", "משלוח מהיר חינם\n10% הנחה תמיד\nמתנת יום הולדת"), featured: true },
  { name: w("عضوية ماسية", "Diamond", "יהלום"), month: "₪69", year: "₪690", features: w("كل مزايا الذهبية\nخصم 15٪ دايماً\nوصول مبكر لكل جديد", "Everything in Gold\n15% off always\nEarly access to what's new", "כל ההטבות של זהב\n15% הנחה תמיד\nגישה מוקדמת לכל חדש") },
];

/** What a bundle holds, line by line (for a table of the three bundles). */
export const BUNDLE_ROWS: Array<[W, [string | boolean, string | boolean, string | boolean]]> = [
  [w("عدد القطع", "Pieces", "מספר פריטים"), ["2", "4", "8"]],
  [w("توصيل سريع", "Fast delivery", "משלוח מהיר"), [false, true, true]],
  [w("تغليف هدية", "Gift wrapping", "אריזת מתנה"), [false, true, true]],
  [w("إرجاع مجاني", "Free returns", "החזרה חינם"), [false, false, true]],
];

export const FOURTH_PERSON: [W, W] = [w("سامر", "Samer", "סאמר"), w("التوصيل", "Delivery", "משלוחים")];
export const TRUST_BADGES: Array<{ icon: IconName; title: W }> = [
  { icon: "shield", title: X.secure },
  { icon: "truck", title: w("توصيل لكل البلاد", "Delivery nationwide", "משלוח לכל הארץ") },
  { icon: "return", title: w("إرجاع خلال 14 يوم", "Returns within 14 days", "החזרה תוך 14 יום") },
  { icon: "check", title: w("منتجات أصلية 100٪", "100% genuine products", "מוצרים מקוריים 100%") },
];
export const FINISHES: W[] = [w("مطفي", "Matte", "מט"), w("معدني", "Metal", "מתכת"), w("زجاجي", "Glass", "זכוכית")];
