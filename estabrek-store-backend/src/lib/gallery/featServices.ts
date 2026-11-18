/**
 * Ready features for services: bookings of every kind, support, and requests a business takes in.
 * Each is a table, its logic and a shop page (featKit.ts).
 */
import { L, cond, f, i, on, s, table, where } from "./kit.js";
import { feature } from "./featKit.js";
import { A, STATES } from "./featAsk.js";

const T = (ar: string, en: string, he: string) => L(ar, en, he);
const HOURS = (list: string[]) => list.map((h) => [`h${h.replace(":", "")}`, T(h, h, h)] as [string, ReturnType<typeof L>]);
const MINE = (title: ReturnType<typeof L>, card: Array<[string, ReturnType<typeof L>]>, empty: ReturnType<typeof L>) => ({ feed: "mine" as const, title, card, empty });

/** A booking: a day, an hour from the list, what for, and a phone; a slot taken once only. */
function booking(o: { key: string; name: ReturnType<typeof L>; note: ReturnType<typeof L>; slug: string; table: ReturnType<typeof L>; hours: string[]; what?: ReturnType<typeof A.pick>; extra?: Array<ReturnType<typeof A.text>>; title: ReturnType<typeof L>; intro: ReturnType<typeof L>; button: ReturnType<typeof L>; capacity?: number }) {
  const cap = o.capacity ?? 1;
  return feature({
    key: o.key,
    category: "bookings",
    name: o.name,
    note: o.note,
    table: { slug: o.slug, name: o.table },
    status: STATES.booking,
    statusTo: { field: "phone", by: "whatsapp" },
    page: { slug: `/${o.slug}`, title: o.title, intro: o.intro, list: MINE(T("حجوزاتي", "My bookings", "ההזמנות שלי"), [["day", T("اليوم", "Day", "יום")], ["hour", T("الساعة", "Hour", "שעה")]], T("ما في حجوزات.", "No bookings.", "אין הזמנות.")) },
    form: { fields: [A.date(), A.pick("hour", T("الساعة", "Hour", "שעה"), HOURS(o.hours)), ...(o.what ? [o.what] : []), ...(o.extra ?? []), A.phone()], fn: o.slug, button: o.button, keep: true },
    extra: {
      fns: [
        {
          key: "book",
          name: "احجز",
          inputs: [i.text("day", { required: true, format: "date" }), i.text("hour", { required: true, choices: HOURS(o.hours).map(([id]) => id) }), ...(o.what ? [i.text(o.what.id, { required: true, choices: (o.what.options ?? []).map(([id]) => id) })] : []), ...(o.extra ?? []).map((x) => (x.kind === "number" ? i.num(x.id, { min: x.min ?? 0, max: x.max ?? 1000 }) : i.text(x.id, { max: 300 }))), i.phone("phone", { required: true })],
          on: on.call(o.slug, "customer", 10),
          do: [
            s.find("main", "same", [where("day", "is", "{{input.day}}"), where("hour", "is", "{{input.hour}}"), where("status", "isNot", "cancelled")], { limit: 50 }),
            s.when([cond("{{same.length}}", "gte", cap)], [s.stop("هالوقت محجوز، اختار وقت تاني")]),
            s.add("main", { day: "{{input.day}}", hour: "{{input.hour}}", phone: "{{input.phone}}", ...(o.what ? { [o.what.id]: `{{input.${o.what.id}}}` } : {}), ...Object.fromEntries((o.extra ?? []).map((x) => [x.id, `{{input.${x.id}}}`])) }, { owner: "{{caller}}" }),
            s.bell("حجز جديد: {{input.day}}", "{{caller.name}} · {{input.phone}}", "/admin/data"),
            s.ret("وصل حجزك، منأكّدلك قريب ✅"),
          ],
        },
      ],
    },
  });
}

export const FEAT_SERVICES = [
  booking({ key: "feat-appointments", name: T("مواعيد المحل", "Shop appointments", "תורים בחנות"), note: T("الزبون بيحجز موعد بيوم وساعة؛ الوقت المحجوز ما بيتكرّر، وكل تأكيد أو إلغاء بيوصله واتساب.", "A shopper books a day and an hour; a taken slot isn't booked twice, and each confirmation or cancellation reaches them on WhatsApp.", "לקוח קובע יום ושעה; משבצת תפוסה לא נקבעת פעמיים, וכל אישור או ביטול מגיע בוואטסאפ."), slug: "appointments", table: T("المواعيد", "Appointments", "תורים"), hours: ["10:00", "11:00", "12:00", "13:00", "16:00", "17:00", "18:00"], title: T("احجز موعد", "Book an appointment", "קביעת תור"), intro: T("اختار اليوم والساعة، ومنأكّدلك.", "Pick the day and hour, and we confirm.", "בחרו יום ושעה, ונאשר."), button: T("احجز", "Book", "קביעה") }),
  booking({ key: "feat-table-reservations", name: T("حجز طاولة", "Table reservations", "הזמנת שולחן"), note: T("لمطعم أو كافيه: يوم وساعة وكم شخص، لحد 6 طاولات بالساعة.", "For a restaurant or café: a day, an hour and how many people, up to 6 tables an hour.", "למסעדה או בית קפה: יום, שעה וכמה אנשים, עד 6 שולחנות בשעה."), slug: "tables", table: T("حجوزات الطاولات", "Table bookings", "הזמנות שולחנות"), hours: ["12:00", "13:00", "14:00", "19:00", "20:00", "21:00"], extra: [A.number("people", T("كم شخص", "People", "אנשים"), 1, 20, true)], capacity: 6, title: T("احجز طاولتك", "Book your table", "הזמינו שולחן"), intro: T("منستناك!", "We'll be waiting!", "מחכים לכם!"), button: T("احجز طاولة", "Book a table", "הזמנת שולחן") }),
  booking({ key: "feat-salon", name: T("حجز بالصالون", "Salon booking", "תור לסלון"), note: T("قص، صبغة، أو تسريحة: الخدمة واليوم والساعة.", "A cut, colour or styling: the service, the day and the hour.", "תספורת, צבע או עיצוב: השירות, היום והשעה."), slug: "salon", table: T("حجوزات الصالون", "Salon bookings", "תורים לסלון"), hours: ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"], what: A.pick("service", T("الخدمة", "Service", "שירות"), [["cut", T("قص", "Cut", "תספורת")], ["colour", T("صبغة", "Colour", "צבע")], ["styling", T("تسريحة", "Styling", "עיצוב")]]), title: T("احجزي بالصالون", "Book at the salon", "קבעי תור בסלון"), intro: T("اختاري الخدمة والوقت.", "Choose the service and the time.", "בחרי שירות וזמן."), button: T("احجزي", "Book", "קביעה") }),
  booking({ key: "feat-clinic", name: T("مواعيد عيادة", "Clinic appointments", "תורים למרפאה"), note: T("سبب الزيارة واليوم والساعة؛ العيادة بتأكّد أو بتقترح وقت.", "The visit's reason, the day and the hour; the clinic confirms or suggests a time.", "סיבת הביקור, היום והשעה; המרפאה מאשרת או מציעה זמן."), slug: "clinic", table: T("مواعيد العيادة", "Clinic appointments", "תורים למרפאה"), hours: ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00"], what: A.pick("reason", T("سبب الزيارة", "Reason", "סיבה"), [["check", T("فحص", "Check-up", "בדיקה")], ["follow", T("متابعة", "Follow-up", "מעקב")], ["new", T("مشكلة جديدة", "New problem", "בעיה חדשה")]]), title: T("موعد بالعيادة", "A clinic appointment", "תור למרפאה"), intro: T("احجز، ومنتصل نأكّد.", "Book, and we call to confirm.", "קבעו, ונתקשר לאשר."), button: T("احجز موعد", "Book", "קביעת תור") }),
  booking({ key: "feat-car-wash", name: T("حجز غسيل سيارة", "Car wash booking", "תור לשטיפת רכב"), note: T("نوع الغسيل والساعة، لحد سيارتين بالساعة.", "The wash and the hour, up to two cars an hour.", "סוג השטיפה והשעה, עד שני רכבים בשעה."), slug: "car-wash", table: T("حجوزات الغسيل", "Wash bookings", "תורי שטיפה"), hours: ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"], what: A.pick("wash", T("الغسيل", "Wash", "שטיפה"), [["outside", T("برّا", "Outside", "חיצונית")], ["full", T("كامل", "Full", "מלאה")], ["polish", T("تلميع", "Polish", "פוליש")]]), capacity: 2, title: T("غسّل سيارتك", "Wash your car", "שטפו את הרכב"), intro: T("اختار الغسيل والوقت.", "Choose the wash and the time.", "בחרו שטיפה וזמן."), button: T("احجز", "Book", "קביעה") }),
  booking({ key: "feat-tutoring", name: T("حصص خصوصي", "Private lessons", "שיעורים פרטיים"), note: T("المادة واليوم والساعة، والمعلّم بيأكّد.", "The subject, the day and the hour; the teacher confirms.", "המקצוע, היום והשעה; המורה מאשר."), slug: "lessons", table: T("الحصص", "Lessons", "שיעורים"), hours: ["15:00", "16:00", "17:00", "18:00", "19:00"], what: A.pick("subject", T("المادة", "Subject", "מקצוע"), [["math", T("رياضيات", "Maths", "מתמטיקה")], ["english", T("إنجليزي", "English", "אנגלית")], ["science", T("علوم", "Science", "מדעים")], ["arabic", T("عربي", "Arabic", "ערבית")]]), title: T("احجز حصة", "Book a lesson", "קביעת שיעור"), intro: T("حصص فردية بالبيت أو أونلاين.", "One-to-one lessons at home or online.", "שיעורים אישיים בבית או אונליין."), button: T("احجز", "Book", "קביעה") }),
  booking({ key: "feat-pickup-slots", name: T("استلام من المحل بموعد", "Store pickup by appointment", "איסוף מהחנות בתיאום"), note: T("الزبون بيختار وقت استلام طلبه، لحد 5 استلامات بالساعة.", "A shopper picks a time to collect their order, up to 5 pickups an hour.", "לקוח בוחר זמן לאיסוף ההזמנה, עד 5 איסופים בשעה."), slug: "pickup", table: T("مواعيد الاستلام", "Pickup times", "זמני איסוף"), hours: ["10:00", "12:00", "14:00", "16:00", "18:00"], extra: [A.orderId()], capacity: 5, title: T("استلم من المحل", "Collect in store", "איסוף מהחנות"), intro: T("طلبك جاهز؟ اختار وقت تمرق.", "Order ready? Pick a time to drop by.", "ההזמנה מוכנה? בחרו זמן לקפוץ."), button: T("حجزلي وقت", "Book a time", "קביעת זמן") }),
  booking({ key: "feat-delivery-slots", name: T("موعد توصيل", "Delivery time slots", "חלונות משלוח"), note: T("الزبون بيختار فترة التوصيل اللي بتناسبه، لحد 8 توصيلات بالفترة.", "A shopper picks the delivery window that suits them, up to 8 deliveries a window.", "לקוח בוחר חלון משלוח שמתאים, עד 8 משלוחים בחלון."), slug: "delivery-time", table: T("مواعيد التوصيل", "Delivery slots", "חלונות משלוח"), hours: ["09:00", "13:00", "17:00"], extra: [A.orderId(), A.text("city", T("المدينة", "City", "עיר"), true)], capacity: 8, title: T("إيمتى بيناسبك التوصيل؟", "When should we deliver?", "מתי נוח לקבל?"), intro: T("اختار الفترة ومنوصّل فيها.", "Choose the window and we deliver in it.", "בחרו חלון ונגיע בו."), button: T("ثبّت الموعد", "Set the time", "קביעת הזמן") }),
  booking({ key: "feat-rentals", name: T("تأجير معدّات", "Equipment rental", "השכרת ציוד"), note: T("الزبون بيحجز قطعة للإيجار ليوم معيّن.", "A shopper books an item for rent on a given day.", "לקוח מזמין פריט להשכרה ליום מסוים."), slug: "rent", table: T("حجوزات الإيجار", "Rental bookings", "הזמנות השכרה"), hours: ["09:00", "14:00"], what: A.pick("item", T("القطعة", "Item", "פריט"), [["dress", T("فستان سهرة", "Evening dress", "שמלת ערב")], ["camera", T("كاميرا", "Camera", "מצלמה")], ["tent", T("خيمة", "Tent", "אוהל")]]), capacity: 3, title: T("استأجر", "Rent", "השכרה"), intro: T("ليش تشتري إذا بتقدر تستأجر؟", "Why buy when you can rent?", "למה לקנות כשאפשר לשכור?"), button: T("احجز", "Book", "קביעה") }),
  booking({ key: "feat-workshop-seats", name: T("مقاعد الورشة", "Workshop seats", "מקומות בסדנה"), note: T("ورشة بموعد، لحد 12 مقعد بكل موعد.", "A workshop session, up to 12 seats a session.", "סדנה במועד, עד 12 מקומות במועד."), slug: "workshop", table: T("مقاعد الورشات", "Workshop seats", "מקומות בסדנאות"), hours: ["10:00", "17:00"], capacity: 12, title: T("سجّل بالورشة", "Join the workshop", "הרשמה לסדנה"), intro: T("أماكن محدودة.", "Limited seats.", "מקומות מוגבלים."), button: T("سجّلني", "Sign me up", "רשמו אותי") }),
  booking({ key: "feat-fitness-classes", name: T("حصص رياضة", "Fitness classes", "שיעורי כושר"), note: T("الحصة والساعة، لحد 15 بالحصة.", "The class and the hour, up to 15 a class.", "השיעור והשעה, עד 15 בשיעור."), slug: "classes", table: T("حجوزات الحصص", "Class bookings", "הרשמה לשיעורים"), hours: ["07:00", "09:00", "18:00", "19:30"], what: A.pick("kind", T("الحصة", "Class", "שיעור"), [["yoga", T("يوغا", "Yoga", "יוגה")], ["pilates", T("بيلاتس", "Pilates", "פילאטיס")], ["hiit", T("تمارين قوية", "HIIT", "HIIT")]]), capacity: 15, title: T("احجز حصتك", "Book your class", "הרשמה לשיעור"), intro: T("كل يوم حصص جديدة.", "New classes every day.", "שיעורים חדשים כל יום."), button: T("احجز", "Book", "קביעה") }),
  booking({ key: "feat-consultations", name: T("استشارة أونلاين", "Online consultation", "ייעוץ אונליין"), note: T("موضوع الاستشارة والوقت؛ بتبعت رابط الاجتماع بالتأكيد.", "The consultation's topic and time; you send the meeting link with the confirmation.", "נושא הייעוץ והזמן; שולחים קישור לפגישה עם האישור."), slug: "consult", table: T("الاستشارات", "Consultations", "ייעוצים"), hours: ["10:00", "12:00", "15:00", "19:00"], extra: [A.text("topic", T("الموضوع", "Topic", "נושא"), true)], title: T("احجز استشارة", "Book a consultation", "קביעת ייעוץ"), intro: T("نص ساعة أونلاين مع مختص.", "Half an hour online with an expert.", "חצי שעה אונליין עם מומחה."), button: T("احجز", "Book", "קביעה") }),
  feature({
    key: "feat-support-tickets",
    category: "support",
    name: T("تذاكر الدعم", "Support tickets", "פניות תמיכה"),
    note: T("الزبون بيفتح تذكرة من صفحته، بتتابعها بالحالات وبتكتب الرد بالجدول، وبيوصله إيميل بكل تغيير.", "A shopper opens a ticket from their page; you move it through its states and write the answer in the table, and they get an email on each change.", "לקוח פותח פנייה מהעמוד שלו; מעבירים בין שלבים וכותבים תשובה בטבלה, והוא מקבל מייל בכל שינוי."),
    table: { slug: "support", name: T("تذاكر الدعم", "Support tickets", "פניות תמיכה"), fields: [f.long("answer", T("ردّنا", "Our answer", "התשובה שלנו"))] },
    status: [["open", T("مفتوحة", "Open", "פתוחה")], ["answered", T("انرد عليها", "Answered", "נענתה")], ["closed", T("تسكّرت", "Closed", "נסגרה")]],
    ask: { fields: [A.text("subject", T("الموضوع", "Subject", "נושא"), true), A.pick("topic", T("بخصوص", "About", "בנושא"), [["order", T("طلب", "An order", "הזמנה")], ["product", T("منتج", "A product", "מוצר")], ["account", T("حسابي", "My account", "החשבון שלי")], ["other", T("غير", "Other", "אחר")]]), A.details(true, T("احكيلنا", "Tell us", "ספרו לנו")), A.email()], button: T("افتح تذكرة", "Open a ticket", "פתיחת פנייה"), done: "فتحنا التذكرة، منرد عليك اليوم.", title: "تذكرة دعم" },
    statusTo: { field: "email", by: "email" },
    page: { slug: "/support", title: T("الدعم", "Support", "תמיכה"), intro: T("في شي مش ماشي؟ نحنا هون.", "Something not right? We're here.", "משהו לא מסתדר? אנחנו כאן."), list: MINE(T("تذاكري", "My tickets", "הפניות שלי"), [["subject", T("الموضوع", "Subject", "נושא")], ["answer", T("ردّنا", "Our answer", "התשובה שלנו")]], T("ما في تذاكر.", "No tickets.", "אין פניות.")) },
  }),
  feature({
    key: "feat-delivery-issues",
    category: "support",
    name: T("مشاكل التوصيل", "Delivery problems", "בעיות משלוח"),
    note: T("طلب ما وصل أو وصل ناقص أو متأخر: الزبون بيبلّغ وبتتابعه لحد ما ينحل.", "An order that didn't arrive, arrived short or late: the shopper reports it and you follow it until solved.", "הזמנה שלא הגיעה, הגיעה חסרה או באיחור: הלקוח מדווח ועוקבים עד הפתרון."),
    table: { slug: "delivery-issues", name: T("مشاكل التوصيل", "Delivery problems", "בעיות משלוח") },
    status: STATES.request,
    ask: { fields: [A.orderId(), A.pick("problem", T("المشكلة", "Problem", "בעיה"), [["late", T("تأخّر", "Late", "באיחור")], ["missing", T("ما وصل", "Didn't arrive", "לא הגיע")], ["short", T("ناقص", "Something missing", "חסר משהו")], ["damaged", T("انضرب", "Damaged", "נפגע")]]), A.details(false), A.phone()], button: T("بلّغ", "Report", "דיווח"), done: "وصل بلاغك، منحلّها بسرعة.", title: "مشكلة توصيل", tell: "whatsapp" },
    statusTo: { field: "phone", by: "whatsapp" },
    page: { slug: "/delivery-help", title: T("مشكلة بالتوصيل؟", "A delivery problem?", "בעיה במשלוח?"), intro: T("خبّرنا ومنزبّطها.", "Tell us and we'll fix it.", "ספרו לנו ונסדר."), list: MINE(T("بلاغاتي", "My reports", "הדיווחים שלי"), [["orderId", T("الطلب", "Order", "הזמנה")], ["problem", T("المشكلة", "Problem", "בעיה")]], T("ما في بلاغات.", "No reports.", "אין דיווחים.")) },
  }),
  feature({
    key: "feat-feedback-board",
    category: "support",
    name: T("ملاحظات واقتراحات الزباين", "Customer feedback", "משוב לקוחות"),
    note: T("الزبون بيترك ملاحظة (مدح، شكوى، اقتراح) وبيشوف ردّك عليها بصفحته.", "A shopper leaves feedback (praise, a complaint, an idea) and sees your answer on their page.", "לקוח משאיר משוב (מחמאה, תלונה, רעיון) ורואה את התשובה בעמוד שלו."),
    table: { slug: "feedback", name: T("الملاحظات", "Feedback", "משוב"), fields: [f.long("answer", T("ردّنا", "Our answer", "התשובה שלנו"))] },
    ask: { fields: [A.pick("kind", T("نوعها", "Kind", "סוג"), [["praise", T("مدح", "Praise", "מחמאה")], ["complaint", T("شكوى", "Complaint", "תלונה")], ["idea", T("اقتراح", "Idea", "רעיון")]]), A.details(true, T("ملاحظتك", "Your feedback", "המשוב שלכם"))], button: T("ابعت", "Send", "שליחה"), done: "شكراً، بنقراها كلها 💛", title: "ملاحظة زبون" },
    page: { slug: "/feedback", title: T("رأيك بيهمّنا", "Your opinion matters", "הדעה שלכם חשובה"), intro: T("احكيلنا شو عجبك وشو لا.", "Tell us what you liked and what not.", "ספרו מה אהבתם ומה לא."), list: MINE(T("ملاحظاتي", "My feedback", "המשוב שלי"), [["kind", T("نوعها", "Kind", "סוג")], ["answer", T("ردّنا", "Our answer", "התשובה שלנו")]], T("ما في ملاحظات.", "No feedback.", "אין משוב.")) },
  }),
  feature({
    key: "feat-lost-found",
    category: "support",
    name: T("المفقودات", "Lost and found", "אבידות ומציאות"),
    note: T("للمحلات والمطاعم والفعاليات: الزبون بيبلّغ عن شي ضاع، ولما تلاقيه بتغيّر الحالة وبيوصله خبر.", "For shops, restaurants and events: a visitor reports something lost; when you find it, change the state and they're told.", "לחנויות, מסעדות ואירועים: מבקר מדווח על אבידה; כשמוצאים משנים מצב והוא מקבל הודעה."),
    table: { slug: "lost-found", name: T("المفقودات", "Lost items", "אבידות") },
    status: [["looking", T("عم ندوّر", "Looking", "מחפשים")], ["found", T("لقيناه!", "Found!", "נמצא!")], ["notfound", T("ما لقيناه", "Not found", "לא נמצא")]],
    ask: { fields: [A.text("item", T("شو ضاع", "What was lost", "מה אבד"), true), A.date("lost", T("إيمتى", "When", "מתי"), false), A.long("where", T("وين تقريباً", "Roughly where", "בערך איפה")), A.phone()], who: "public", button: T("بلّغ", "Report", "דיווח"), done: "منفتّش ومنخبّرك.", title: "شي ضايع" },
    statusTo: { field: "phone", by: "whatsapp" },
    page: { slug: "/lost", title: T("ضيّعت شي عنا؟", "Lost something here?", "איבדתם משהו אצלנו?"), intro: T("احكيلنا شو هو ومنفتّش.", "Tell us what it is and we'll look.", "ספרו מה זה ונחפש.") },
  }),
  feature({
    key: "feat-maintenance",
    category: "operations",
    name: T("طلبات صيانة", "Maintenance requests", "בקשות תחזוקה"),
    note: T("للعماير والمكاتب: الساكن بيطلب صيانة مع المكان والأولوية، والفني بيتابع بالحالات.", "For buildings and offices: a tenant asks for maintenance with the place and urgency; the technician follows the states.", "לבניינים ומשרדים: דייר מבקש תחזוקה עם מקום ודחיפות; הטכנאי עוקב בשלבים."),
    table: { slug: "maintenance", name: T("طلبات الصيانة", "Maintenance requests", "בקשות תחזוקה") },
    status: [["new", T("جديد", "New", "חדש")], ["scheduled", T("انحدّد موعد", "Scheduled", "נקבע מועד")], ["fixed", T("انصلّح", "Fixed", "תוקן")]],
    ask: { fields: [A.text("place", T("المكان (شقة، مكتب)", "Place (flat, office)", "מקום (דירה, משרד)"), true), A.pick("kind", T("النوع", "Kind", "סוג"), [["water", T("مي", "Water", "מים")], ["power", T("كهربا", "Power", "חשמל")], ["ac", T("مكيّف", "Air con", "מיזוג")], ["other", T("غير", "Other", "אחר")]]), A.pick("urgency", T("قديش مستعجل", "How urgent", "כמה דחוף"), [["normal", T("عادي", "Normal", "רגיל")], ["urgent", T("مستعجل", "Urgent", "דחוף")]]), A.details(true), A.phone()], button: T("اطلب صيانة", "Request maintenance", "בקשת תחזוקה"), done: "وصل الطلب، الفني بيتواصل معك.", title: "طلب صيانة" },
    statusTo: { field: "phone", by: "whatsapp" },
    page: { slug: "/maintenance", title: T("صيانة", "Maintenance", "תחזוקה"), intro: T("خرب شي؟ خبّرنا.", "Something broke? Tell us.", "משהו התקלקל? ספרו לנו."), list: MINE(T("طلباتي", "My requests", "הבקשות שלי"), [["place", T("المكان", "Place", "מקום")], ["kind", T("النوع", "Kind", "סוג")]], T("ما في طلبات.", "No requests.", "אין בקשות.")) },
  }),
  feature({
    key: "feat-cleaning-requests",
    category: "bookings",
    name: T("طلبات تنظيف", "Cleaning requests", "הזמנת ניקיון"),
    note: T("نوع المكان وحجمه واليوم المطلوب؛ بتعطي سعر وموعد.", "The kind of place, its size and the day wanted; you give a price and a time.", "סוג המקום, הגודל והיום הרצוי; נותנים מחיר ומועד."),
    table: { slug: "cleaning", name: T("طلبات التنظيف", "Cleaning requests", "הזמנות ניקיון"), fields: [f.money("price", T("السعر", "Price", "מחיר"))] },
    status: STATES.booking,
    ask: { fields: [A.pick("place", T("المكان", "Place", "מקום"), [["home", T("بيت", "Home", "בית")], ["office", T("مكتب", "Office", "משרד")], ["shop", T("محل", "Shop", "חנות")]]), A.number("rooms", T("كم غرفة", "Rooms", "חדרים"), 1, 30, true), A.date(), A.text("city", T("المدينة", "City", "עיר"), true), A.phone()], button: T("اطلب تنظيف", "Request cleaning", "הזמנת ניקיון"), done: "منبعتلك السعر والموعد.", title: "طلب تنظيف" },
    statusTo: { field: "phone", by: "whatsapp" },
    page: { slug: "/cleaning", title: T("تنظيف", "Cleaning", "ניקיון"), intro: T("فريق مدرّب لبيتك أو مكتبك.", "A trained team for your home or office.", "צוות מיומן לבית או למשרד."), list: MINE(T("طلباتي", "My requests", "הבקשות שלי"), [["place", T("المكان", "Place", "מקום")], ["day", T("اليوم", "Day", "יום")], ["price", T("السعر", "Price", "מחיר")]], T("ما في طلبات.", "No requests.", "אין בקשות.")) },
  }),
  feature({
    key: "feat-course-enrollment",
    category: "bookings",
    name: T("التسجيل بالدورات", "Course enrollment", "הרשמה לקורסים"),
    note: T("الطالب بيختار الدورة وبيسجّل؛ بتأكّد التسجيل وبيوصله إيميل.", "A student picks a course and enrolls; you confirm and they get an email.", "תלמיד בוחר קורס ונרשם; מאשרים והוא מקבל מייל."),
    table: { slug: "enrollments", name: T("التسجيلات", "Enrollments", "הרשמות") },
    status: STATES.approval,
    ask: { fields: [A.pick("course", T("الدورة", "Course", "קורס"), [["sewing", T("خياطة", "Sewing", "תפירה")], ["design", T("تصميم أزياء", "Fashion design", "עיצוב אופנה")], ["photo", T("تصوير منتجات", "Product photography", "צילום מוצרים")]]), A.name(), A.email(), A.phone(false)], button: T("سجّلني", "Enroll me", "הרשמה"), done: "وصل تسجيلك، منأكّدلك على الإيميل.", title: "تسجيل بدورة", once: "email" },
    statusTo: { field: "email", by: "email" },
    page: { slug: "/courses", title: T("دوراتنا", "Our courses", "הקורסים שלנו"), intro: T("تعلّم بإيدك، مع ناس بيعرفوا.", "Learn by hand, with people who know.", "ללמוד בידיים, עם אנשים שיודעים."), list: MINE(T("تسجيلاتي", "My enrollments", "ההרשמות שלי"), [["course", T("الدورة", "Course", "קורס")]], T("مش مسجّل بدورات.", "No enrollments.", "אין הרשמות.")) },
  }),
  feature({
    key: "feat-event-tickets",
    category: "bookings",
    name: T("تذاكر فعالية", "Event tickets", "כרטיסים לאירוע"),
    note: T("الزبون بيحجز تذاكر (عادي أو VIP)، لحد 200 تذكرة؛ بتأكّد الدفع بالجدول وبيوصله تأكيد.", "A shopper books tickets (regular or VIP), up to 200; you confirm payment in the table and they get a confirmation.", "לקוח מזמין כרטיסים (רגיל או VIP), עד 200; מאשרים תשלום בטבלה והוא מקבל אישור."),
    table: { slug: "tickets-sold", name: T("التذاكر", "Tickets", "כרטיסים") },
    status: [["reserved", T("محجوزة", "Reserved", "שמורים")], ["paid", T("مدفوعة", "Paid", "שולמו")], ["cancelled", T("ملغية", "Cancelled", "בוטלו")]],
    statusTo: { field: "phone", by: "whatsapp" },
    form: { fields: [A.pick("kind", T("التذكرة", "Ticket", "כרטיס"), [["regular", T("عادي", "Regular", "רגיל")], ["vip", T("VIP", "VIP", "VIP")]]), A.number("qty", T("كم تذكرة", "How many", "כמה"), 1, 6, true), A.phone()], fn: "event-tickets", button: T("احجز تذاكر", "Book tickets", "הזמנת כרטיסים"), keep: true },
    page: { slug: "/tickets", title: T("تذاكر الفعالية", "Event tickets", "כרטיסים לאירוע"), intro: T("أماكن محدودة.", "Limited places.", "מקומות מוגבלים."), list: MINE(T("تذاكري", "My tickets", "הכרטיסים שלי"), [["kind", T("التذكرة", "Ticket", "כרטיס")], ["qty", T("العدد", "How many", "כמה")]], T("ما حجزت تذاكر.", "No tickets.", "אין כרטיסים.")) },
    extra: {
      fns: [
        {
          key: "book",
          name: "احجز تذاكر",
          inputs: [i.text("kind", { required: true, choices: ["regular", "vip"] }), i.num("qty", { required: true, min: 1, max: 6 }), i.phone("phone", { required: true })],
          on: on.call("event-tickets", "customer", 5),
          do: [s.find("main", "sold", [where("status", "isNot", "cancelled")], { limit: 200 }), s.code("return (input.rows || []).reduce((n, r) => n + Number(r.qty || 0), 0);", { rows: "{{sold}}" }, "taken"), s.set("after", "{{taken}}"), s.set("after", "{{input.qty}}", "add"), s.when([cond("{{after}}", "gt", 200)], [s.stop("التذاكر خلصت")]), s.add("main", { kind: "{{input.kind}}", qty: "{{input.qty}}", phone: "{{input.phone}}" }, { owner: "{{caller}}" }), s.ret("حجزنالك {{input.qty}} تذاكر 🎟️")],
        },
      ],
    },
  }),
  feature({
    key: "feat-volunteers",
    category: "community",
    name: T("المتطوّعين", "Volunteers", "מתנדבים"),
    note: T("الناس بيسجّلوا كمتطوّعين بالأيام والمهارات؛ بتقبلهم وبيوصلهم واتساب.", "People sign up to volunteer with their days and skills; you accept them and they get a WhatsApp.", "אנשים נרשמים להתנדב עם ימים וכישורים; מקבלים אותם והם מקבלים וואטסאפ."),
    table: { slug: "volunteer-list", name: T("المتطوّعين", "Volunteers", "מתנדבים") },
    status: STATES.approval,
    ask: { fields: [A.name(), A.phone(), A.text("days", T("الأيام اللي بتقدر", "Days you can", "ימים שאפשר")), A.long("skills", T("شو بتعرف تعمل", "What you can do", "מה אתם יודעים לעשות"))], who: "public", button: T("سجّلني متطوّع", "Sign me up", "רשמו אותי"), done: "شكراً 💚 منتواصل معك.", title: "متطوّع جديد" },
    statusTo: { field: "phone", by: "whatsapp" },
    page: { slug: "/volunteer", title: T("تطوّع معنا", "Volunteer with us", "התנדבו איתנו"), intro: T("ساعة من وقتك بتفرق.", "An hour of your time makes a difference.", "שעה מהזמן שלכם עושה הבדל.") },
  }),
  feature({
    key: "feat-job-board",
    category: "forms",
    name: T("التوظيف", "Hiring", "גיוס עובדים"),
    note: T("صفحة وظايف من جدول (المنشورة بس)، وفورم تقديم بيحفظ الطلب وبيبعت إيميل.", "A jobs page from a table (published ones only), and an apply form that keeps the application and sends an email.", "עמוד משרות מטבלה (רק מפורסמות), וטופס הגשה ששומר את המועמדות ושולח מייל."),
    table: { slug: "applications", name: T("طلبات التوظيف", "Applications", "מועמדויות") },
    status: [["new", T("جديد", "New", "חדש")], ["interview", T("مقابلة", "Interview", "ראיון")], ["hired", T("انقبل", "Hired", "התקבל")], ["no", T("مش هالمرة", "Not this time", "לא הפעם")]],
    ask: { fields: [A.name(), A.email(), A.text("role", T("الوظيفة", "Role", "תפקיד"), true), A.text("cv", T("رابط السيرة الذاتية", "Link to your CV", "קישור לקורות חיים")), A.long("about", T("عرّف عن حالك", "About you", "ספרו על עצמכם"))], who: "public", button: T("قدّم", "Apply", "הגשה"), done: "وصل طلبك، بالتوفيق!", title: "طلب توظيف", tell: "email", perMinute: 3 },
    statusTo: { field: "email", by: "email" },
    page: { slug: "/careers", title: T("اشتغل معنا", "Work with us", "עבדו איתנו"), intro: T("منحب نتعرّف عليك.", "We'd love to meet you.", "נשמח להכיר."), list: { feed: "show", table: "jobs", title: T("الوظايف المفتوحة", "Open roles", "משרות פתוחות"), card: [["title", T("الوظيفة", "Role", "תפקיד")], ["place", T("المكان", "Place", "מקום")], ["about", T("عنها", "About", "על המשרה")]], empty: T("ما في وظايف هلأ.", "No open roles now.", "אין משרות כרגע.") } },
    extra: { tables: [table("jobs", "open-jobs", T("الوظايف", "Jobs", "משרות"), [f.text("title", T("الوظيفة", "Role", "תפקיד"), { required: true }), f.text("place", T("المكان", "Place", "מקום")), f.long("about", T("عنها", "About", "על המשרה"))])] },
  }),
];
