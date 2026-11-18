/**
 * Ready functions that run on the store's clock (a schedule: every so many minutes, or every day at an
 * hour): reports, reminders, tidying up, and watching things outside. Each holds the table it reads,
 * so it installs whole; point it at a table of your own by changing the step's table.
 */
import { L, cond, f, fnEntry, i, on, s, table, where, type GalleryEntry } from "./kit.js";

const AT = [i.text("at")];
/** The day on the store's clock (Palestine/Israel, UTC+2 in winter): "2026-11-18". */
const TODAY = "return new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);";
const daysFromNow = (days: number) => `return new Date(Date.now() + 2 * 3600e3 + ${days} * 86400e3).toISOString().slice(0, 10);`;
const hoursAgo = (hours: number) => `return new Date(Date.now() - ${hours} * 3600e3).toISOString();`;

const TASKS = table("tasks", "tasks", L("المهام", "Tasks", "משימות"), [
  f.text("title", L("المهمة", "Task", "משימה"), { required: true }),
  f.text("who", L("مين", "Who", "מי")),
  f.phone("phone", L("تلفونه", "Phone", "טלפון")),
  f.date("due", L("موعدها", "Due", "תאריך יעד")),
  f.bool("done", L("خلصت", "Done", "בוצע"), { default: false }),
]);

export const FN_SCHEDULES: GalleryEntry[] = [
  fnEntry({
    key: "daily-messages-report",
    category: "reports",
    name: L("تقرير الرسائل اليومي", "Daily messages report", "דוח הודעות יומי"),
    note: L("كل يوم الساعة 9: كم رسالة تواصل وصلت آخر 24 ساعة، بإيميل.", "Every day at 9: how many contact messages came in the last 24 hours, by email.", "כל יום ב-9: כמה הודעות יצירת קשר הגיעו ב-24 השעות האחרונות, במייל."),
    tables: [table("messages", "contact-messages", L("رسائل التواصل", "Contact messages", "הודעות יצירת קשר"), [f.text("name", L("الاسم", "Name", "שם"), { required: true }), f.email("email", L("الإيميل", "Email", "מייל")), f.long("message", L("الرسالة", "Message", "הודעה"))])],
    fns: [{ key: "report", name: "تقرير الرسائل", inputs: AT, on: on.daily("09:00"), do: [s.code(hoursAgo(24), {}, "since"), s.find("messages", "fresh", [where("$createdAt", "gte", "{{since}}")], { limit: 200 }), s.email("وصلك {{fresh.length}} رسالة بآخر 24 ساعة", "افتح جدول «رسائل التواصل» لتقراهم.")] }],
  }),
  fnEntry({
    key: "weekly-summary",
    category: "reports",
    name: L("ملخص الأسبوع بالجرس", "The week's summary in the bell", "סיכום שבועי בפעמון"),
    note: L("كل ساعة 8 الصبح: كم سطر انضاف آخر 7 أيام بجدولك، بجرس الإدارة (بيشتغل كل يوم ويقول عن الأسبوع).", "Every morning at 8: how many rows were added to your table in the last 7 days, in the admin's bell.", "כל בוקר ב-8: כמה שורות נוספו לטבלה ב-7 הימים האחרונים, בפעמון הניהול."),
    tables: [table("leads", "leads", L("الزباين المحتملين", "Leads", "לידים"), [f.text("name", L("الاسم", "Name", "שם"), { required: true }), f.phone("phone", L("التلفون", "Phone", "טלפון")), f.email("email", L("الإيميل", "Email", "מייל"))])],
    fns: [{ key: "sum", name: "ملخص الأسبوع", inputs: AT, on: on.daily("08:00"), do: [s.code(hoursAgo(7 * 24), {}, "since"), s.find("leads", "week", [where("$createdAt", "gte", "{{since}}")], { limit: 200 }), s.bell("آخر 7 أيام: {{week.length}} زبون محتمل جديد")] }],
  }),
  fnEntry({
    key: "cleanup-old-rows",
    category: "operations",
    name: L("تنظيف السطور القديمة", "Clean up old rows", "ניקוי שורות ישנות"),
    note: L("كل ليلة: سطور السجل الأقدم من 90 يوم بتروح عالسلة (بترجع منها لـ 30 يوم).", "Every night: log rows older than 90 days go to the trash (back from it for 30 days).", "כל לילה: שורות יומן ישנות מ-90 יום עוברות לפח (אפשר להחזיר 30 יום)."),
    tables: [table("log", "activity-log", L("سجل النشاط", "Activity log", "יומן פעילות"), [f.text("what", L("شو صار", "What", "מה"), { required: true }), f.text("who", L("مين", "Who", "מי"))])],
    fns: [{ key: "clean", name: "نظّف السجل", inputs: AT, on: on.daily("03:00"), do: [s.code(hoursAgo(90 * 24), {}, "before"), s.find("log", "old", [where("$createdAt", "lt", "{{before}}")], { limit: 200 }), s.each("{{old}}", "r", [s.del("log", "{{r.id}}")]), s.ret("{{old.length}}")] }],
  }),
  fnEntry({
    key: "archive-done-tasks",
    category: "operations",
    name: L("أرشفة المهام اللي خلصت", "Archive finished tasks", "העברת משימות שבוצעו לארכיון"),
    note: L("كل ليلة: المهام اللي خلصت بتتأرشف، لتضل القائمة نضيفة.", "Every night: finished tasks are archived, so the list stays clean.", "כל לילה: משימות שבוצעו עוברות לארכיון, כדי שהרשימה תישאר נקייה."),
    tables: [TASKS],
    fns: [{ key: "archive", name: "أرشف المهام الخالصة", inputs: AT, on: on.daily("02:00"), do: [s.find("tasks", "done", [where("done", "isTrue"), where("$status", "isNot", "ARCHIVED")], { limit: 200 }), s.each("{{done}}", "t", [s.change("tasks", "{{t.id}}", {}, { status: "ARCHIVED" })]), s.ret("{{done.length}}")] }],
  }),
  fnEntry({
    key: "tasks-due-today",
    category: "operations",
    name: L("تذكير بمهام اليوم", "Today's tasks reminder", "תזכורת למשימות היום"),
    note: L("كل يوم الساعة 8: كل واحد بيوصله واتساب بالمهام اللي موعدها اليوم ولسا ما خلصت.", "Every day at 8: each person gets a WhatsApp with their tasks due today and not done.", "כל יום ב-8: כל אחד מקבל וואטסאפ עם המשימות שלו להיום שעוד לא בוצעו."),
    tables: [TASKS],
    fns: [{ key: "remind", name: "مهام اليوم", inputs: AT, on: on.daily("08:00"), do: [s.code(TODAY, {}, "today"), s.find("tasks", "due", [where("due", "is", "{{today}}"), where("done", "isFalse"), where("phone", "notEmpty")], { limit: 50 }), s.each("{{due}}", "t", [s.whatsapp("تذكير لليوم ✅ {{t.title}}", "{{t.phone}}")])] }],
  }),
  fnEntry({
    key: "overdue-tasks",
    category: "operations",
    name: L("مهام متأخرة", "Overdue tasks", "משימות באיחור"),
    note: L("كل يوم الساعة 5 المسا: جرس فيه كم مهمة فات موعدها ولسا ما خلصت.", "Every day at 5 pm: a bell with how many tasks are past due and not done.", "כל יום ב-17:00: פעמון עם מספר המשימות שעבר מועדן ולא בוצעו."),
    tables: [TASKS],
    fns: [{ key: "check", name: "المهام المتأخرة", inputs: AT, on: on.daily("17:00"), do: [s.code(TODAY, {}, "today"), s.find("tasks", "late", [where("due", "lt", "{{today}}"), where("done", "isFalse")], { limit: 200 }), s.when([cond("{{late}}", "notEmpty")], [s.bell("في {{late.length}} مهمة متأخرة", "أولها: {{late.0.title}}")])] }],
  }),
  fnEntry({
    key: "birthday-greetings",
    category: "customers",
    name: L("معايدة عيد الميلاد", "Birthday greetings", "ברכת יום הולדת"),
    note: L("كل يوم الساعة 10: الزباين اللي عيد ميلادهم اليوم بتوصلهم معايدة مع كود هدية.", "Every day at 10: customers whose birthday is today get a greeting with a gift code.", "כל יום ב-10: לקוחות שיום ההולדת שלהם היום מקבלים ברכה עם קוד מתנה."),
    tables: [table("people", "customer-birthdays", L("أعياد ميلاد الزباين", "Customer birthdays", "ימי הולדת של לקוחות"), [f.text("name", L("الاسم", "Name", "שם"), { required: true }), f.phone("phone", L("التلفون", "Phone", "טלפון"), { required: true }), f.text("monthDay", L("اليوم (شهر-يوم)", "Day (month-day)", "יום (חודש-יום)"), { required: true, help: L("متل 11-18", "like 11-18", "כמו 11-18") })])],
    fns: [{ key: "greet", name: "معايدة", inputs: AT, on: on.daily("10:00"), do: [s.code("return new Date(Date.now() + 2 * 3600e3).toISOString().slice(5, 10);", {}, "md"), s.find("people", "today", [where("monthDay", "is", "{{md}}")], { limit: 50 }), s.each("{{today}}", "p", [s.whatsapp("كل سنة وإنت سالم/ة يا {{p.name}} 🎂 هديتك منا: كود BDAY10 بخصم 10%.", "{{p.phone}}")])] }],
  }),
  fnEntry({
    key: "subscription-expiry",
    category: "customers",
    name: L("اشتراك قرّب يخلص", "A subscription about to end", "מנוי שעומד להסתיים"),
    note: L("كل يوم: الاشتراكات اللي بتخلص بعد 3 أيام بتوصل أصحابها رسالة تجديد.", "Every day: subscriptions ending in 3 days get a renewal message to their owners.", "כל יום: מנויים שמסתיימים בעוד 3 ימים מקבלים הודעת חידוש."),
    tables: [table("subs", "subscriptions", L("الاشتراكات", "Subscriptions", "מנויים"), [f.text("name", L("الاسم", "Name", "שם"), { required: true }), f.email("email", L("الإيميل", "Email", "מייל"), { required: true }), f.text("plan", L("الخطة", "Plan", "תוכנית")), f.date("ends", L("بتخلص", "Ends", "מסתיים"), { required: true }), f.bool("warned", L("انبعتله", "Warned", "הוזהר"), { default: false })])],
    fns: [{ key: "warn", name: "تجديد الاشتراك", inputs: AT, on: on.daily("09:30"), do: [s.code(daysFromNow(3), {}, "soon"), s.find("subs", "ending", [where("ends", "lte", "{{soon}}"), where("warned", "isFalse")], { limit: 50 }), s.each("{{ending}}", "x", [s.email("اشتراكك بيخلص {{x.ends}}", "أهلا {{x.name}}، اشتراكك ({{x.plan}}) بيخلص {{x.ends}}. جدّده لتضل الخدمة شغّالة.", "{{x.email}}"), s.change("subs", "{{x.id}}", { warned: true })])] }],
  }),
  fnEntry({
    key: "overdue-invoices",
    category: "finance",
    name: L("تذكير بالفواتير المتأخرة", "Overdue invoice reminders", "תזכורת לחשבוניות באיחור"),
    note: L("كل يوم أحد وكل يوم: الفواتير اللي موعدها فات ولسا مش مدفوعة بتوصل أصحابها تذكير بإيميل، مرة كل أسبوع.", "Daily: unpaid invoices past their date get an email reminder to their owners, once a week each.", "כל יום: חשבוניות שלא שולמו ועבר מועדן מקבלות תזכורת במייל, פעם בשבוע לכל אחת."),
    tables: [table("invoices", "invoices", L("الفواتير", "Invoices", "חשבוניות"), [f.text("number", L("الرقم", "Number", "מספר"), { required: true, unique: true }), f.text("client", L("الزبون", "Client", "לקוח"), { required: true }), f.email("email", L("الإيميل", "Email", "מייל"), { required: true }), f.money("amount", L("المبلغ", "Amount", "סכום"), { required: true }), f.date("due", L("موعد الدفع", "Due", "לתשלום עד"), { required: true }), f.bool("paid", L("مدفوعة", "Paid", "שולם"), { default: false }), f.date("reminded", L("آخر تذكير", "Last reminder", "תזכורת אחרונה"))])],
    fns: [
      {
        key: "remind",
        name: "ذكّر بالفواتير",
        inputs: AT,
        on: on.daily("10:00"),
        do: [
          s.code(TODAY, {}, "today"),
          s.code(daysFromNow(-7), {}, "weekAgo"),
          s.find("invoices", "late", [where("paid", "isFalse"), where("due", "lt", "{{today}}")], { limit: 50 }),
          s.each("{{late}}", "inv", [s.when([cond("{{inv.reminded}}", "empty"), cond("{{inv.reminded}}", "lte", "{{weekAgo}}")], [s.email("تذكير: الفاتورة {{inv.number}}", "أهلا {{inv.client}}، الفاتورة {{inv.number}} بمبلغ {{inv.amount}} كان موعدها {{inv.due}}. شكراً إنك بتدفعها بأقرب وقت.", "{{inv.email}}"), s.change("invoices", "{{inv.id}}", { reminded: "{{today}}" })], undefined, "any")]),
        ],
      },
    ],
  }),
  fnEntry({
    key: "stale-leads",
    category: "customers",
    name: L("زباين محتملين ما حدا حكاهم", "Leads nobody called", "לידים שאף אחד לא חזר אליהם"),
    note: L("كل يوم الضهر: الزباين المحتملين اللي إلهم أكتر من يومين وما انتواصل معهم بيرنّوا الجرس.", "Every noon: leads older than two days that nobody contacted ring the bell.", "כל צהריים: לידים מעל יומיים שאף אחד לא יצר איתם קשר מצלצלים בפעמון."),
    tables: [table("leads", "leads", L("الزباين المحتملين", "Leads", "לידים"), [f.text("name", L("الاسم", "Name", "שם"), { required: true }), f.phone("phone", L("التلفون", "Phone", "טלפון")), f.bool("contacted", L("انتواصلنا", "Contacted", "נוצר קשר"), { default: false })])],
    fns: [{ key: "check", name: "زباين محتملين نسيناهم", inputs: AT, on: on.daily("12:00"), do: [s.code(hoursAgo(48), {}, "before"), s.find("leads", "stale", [where("contacted", "isFalse"), where("$createdAt", "lt", "{{before}}")], { limit: 100 }), s.when([cond("{{stale}}", "notEmpty")], [s.bell("{{stale.length}} زبون محتمل بستنوا اتصال", "أقدمهم: {{stale.0.name}}")])] }],
  }),
  fnEntry({
    key: "publish-scheduled",
    category: "content",
    name: L("نشر بالوقت المحدد", "Publish at a set time", "פרסום בזמן שנקבע"),
    note: L("كل ربع ساعة: السطور اللي وقت نشرها إجا بتنشر لحالها (منشورات، عروض، أخبار).", "Every quarter hour: rows whose publishing time has come publish by themselves (posts, offers, news).", "כל רבע שעה: שורות שהגיע זמן הפרסום שלהן מתפרסמות מעצמן (פוסטים, מבצעים, חדשות)."),
    tables: [table("posts", "scheduled-posts", L("منشورات مجدولة", "Scheduled posts", "פוסטים מתוזמנים"), [f.text("title", L("العنوان", "Title", "כותרת"), { required: true }), f.long("body", L("النص", "Text", "טקסט")), f.datetime("publishAt", L("وقت النشر", "Publish at", "פרסום ב-"), { required: true })])],
    fns: [{ key: "publish", name: "انشر اللي إجا وقته", inputs: AT, on: on.every(15), do: [s.find("posts", "due", [where("$status", "is", "DRAFT"), where("publishAt", "lte", "{{now}}")], { limit: 50 }), s.each("{{due}}", "p", [s.change("posts", "{{p.id}}", {}, { status: "PUBLISHED" })]), s.ret("{{due.length}}")] }],
  }),
  fnEntry({
    key: "unpublish-expired",
    category: "content",
    name: L("إخفاء العروض اللي خلصت", "Hide offers that ended", "הסתרת מבצעים שהסתיימו"),
    note: L("كل ساعة: العروض اللي تاريخ نهايتها فات بتتأرشف، فما بتبين بالمتجر.", "Every hour: offers past their end date are archived, so they don't show in the shop.", "כל שעה: מבצעים שתאריך הסיום שלהם עבר עוברים לארכיון, ולא מוצגים בחנות."),
    tables: [table("offers", "offers", L("العروض", "Offers", "מבצעים"), [f.text("title", L("العرض", "Offer", "מבצע"), { required: true }), f.long("details", L("التفاصيل", "Details", "פרטים")), f.datetime("endsAt", L("بيخلص", "Ends", "מסתיים"), { required: true })])],
    fns: [{ key: "hide", name: "أخفي العروض الخالصة", inputs: AT, on: on.every(60), do: [s.find("offers", "over", [where("$status", "is", "PUBLISHED"), where("endsAt", "lt", "{{now}}")], { limit: 100 }), s.each("{{over}}", "o", [s.change("offers", "{{o.id}}", {}, { status: "ARCHIVED" })]), s.ret("{{over.length}}")] }],
  }),
  fnEntry({
    key: "waitlist-expire",
    category: "operations",
    name: L("تنظيف قائمة الانتظار", "Tidy the waiting list", "ניקוי רשימת ההמתנה"),
    note: L("كل أسبوع: اللي سجّلوا على منتج من أكتر من 60 يوم وما رجع بينشالوا.", "Every week: sign-ups for a product older than 60 days, still not back, are removed.", "כל שבוע: הרשמות למוצר ישנות מ-60 יום, שעדיין לא חזר, נמחקות."),
    tables: [table("waiting", "back-in-stock", L("ناطرين المنتجات", "Waiting for products", "ממתינים למוצרים"), [f.text("product", L("المنتج", "Product", "מוצר"), { required: true }), f.phone("phone", L("التلفون", "Phone", "טלפון")), f.bool("told", L("انبلّغ", "Told", "עודכן"), { default: false })])],
    fns: [{ key: "expire", name: "نظّف الانتظار", inputs: AT, on: on.every(7 * 24 * 60), do: [s.code(hoursAgo(60 * 24), {}, "before"), s.find("waiting", "old", [where("$createdAt", "lt", "{{before}}")], { limit: 200 }), s.each("{{old}}", "w", [s.del("waiting", "{{w.id}}")])] }],
  }),
  fnEntry({
    key: "supplies-reorder",
    category: "operations",
    name: L("طلب مستلزمات لما تقل", "Reorder supplies when low", "הזמנת חומרים כשנגמרים"),
    note: L("جدول مستلزماتك (أكياس، علب، لاصقات) بكمياتها؛ كل يوم الصبح بيبعت للمورّد قائمة باللي نزل تحت الحد.", "Your supplies (bags, boxes, labels) with quantities; each morning the supplier gets a list of what fell below its minimum.", "טבלת החומרים שלכם (שקיות, קופסאות, מדבקות) עם כמויות; כל בוקר הספק מקבל רשימה של מה שירד מתחת למינימום."),
    tables: [table("supplies", "supplies", L("المستلزمات", "Supplies", "חומרים"), [f.text("item", L("الصنف", "Item", "פריט"), { required: true }), f.number("qty", L("الكمية", "Quantity", "כמות"), { default: 0 }), f.number("min", L("الحد الأدنى", "Minimum", "מינימום"), { default: 10 }), f.email("supplier", L("إيميل المورّد", "Supplier's email", "מייל הספק"))])],
    fns: [
      {
        key: "reorder",
        name: "اطلب المستلزمات",
        inputs: AT,
        on: on.daily("07:30"),
        do: [s.find("supplies", "all", [], { limit: 200 }), s.code("return (input.rows || []).filter((r) => Number(r.qty) < Number(r.min) && r.supplier);", { rows: "{{all}}" }, "low"), s.each("{{low}}", "x", [s.email("طلب: {{x.item}}", "مرحبا، بدنا نطلب «{{x.item}}». الكمية عنا {{x.qty}} والحد {{x.min}}. شكراً!", "{{x.supplier}}")]), s.ret("{{low.length}}")],
      },
    ],
  }),
  fnEntry({
    key: "uptime-check",
    category: "integrations",
    name: L("فحص موقع كل 5 دقايق", "Check a site every 5 minutes", "בדיקת אתר כל 5 דקות"),
    note: L("بيفتح عنوان (موقعك، صفحة دفع، نظام تاني)؛ إذا ما جاوب صح بيرن الجرس وبيبعت واتساب. بتسمح بالموقع من «الاتصالات والأسرار».", "Opens an address (your site, a payment page, another system); if it doesn't answer right it rings the bell and sends a WhatsApp. Allow the site in “Connections and secrets”.", "פותח כתובת (האתר שלכם, דף תשלום, מערכת אחרת); אם לא עונה כמו שצריך מצלצל ושולח וואטסאפ. מאשרים את האתר ב«חיבורים וסודות»."),
    tables: [table("checks", "uptime-checks", L("فحوصات الموقع", "Site checks", "בדיקות אתר"), [f.number("status", L("الجواب", "Status", "סטטוס")), f.bool("ok", L("تمام", "Up", "תקין"))])],
    fns: [{ key: "check", name: "افحص الموقع", inputs: AT, on: on.every(5), do: [s.http("GET", "https://status.example.com/health", { anyStatus: true, as: "res" }), s.when([cond("{{res.ok}}", "ne", true)], [s.add("checks", { status: "{{res.status}}", ok: false }), s.bell("الموقع ما بيجاوب ({{res.status}})"), s.whatsapp("⚠️ الموقع ما بيجاوب: {{res.status}}")])], fail: [s.bell("الموقع مش واصل", "{{error}}")] }],
  }),
  fnEntry({
    key: "exchange-rates",
    category: "finance",
    name: L("أسعار العملات كل يوم", "Daily exchange rates", "שערי מטבע יומיים"),
    note: L("كل يوم الصبح بيقرأ سعر الدولار واليورو من خدمة أسعار وبيحفظهم بجدول، لتسعّر منهم.", "Each morning reads the dollar's and euro's rate from a rates service and keeps them in a table to price with.", "כל בוקר קורא את שער הדולר והאירו משירות שערים ושומר בטבלה לתמחור."),
    tables: [table("rates", "exchange-rates", L("أسعار العملات", "Exchange rates", "שערי מטבע"), [f.date("day", L("اليوم", "Day", "יום"), { required: true, unique: true }), f.number("usd", L("الدولار", "USD", "דולר")), f.number("eur", L("اليورو", "EUR", "אירו"))])],
    fns: [
      {
        key: "fetch",
        name: "اقرأ أسعار العملات",
        inputs: AT,
        on: on.daily("08:15"),
        do: [s.http("GET", "https://rates.example.com/latest?base=ILS", { as: "res" }), s.code(TODAY, {}, "today"), s.code("const r = (input.body && input.body.rates) || {}; return { usd: r.USD ? Math.round((1 / r.USD) * 1000) / 1000 : null, eur: r.EUR ? Math.round((1 / r.EUR) * 1000) / 1000 : null };", { body: "{{res.body}}" }, "rate"), s.add("rates", { day: "{{today}}", usd: "{{rate.usd}}", eur: "{{rate.eur}}" })],
      },
    ],
  }),
  fnEntry({
    key: "tip-of-the-day",
    category: "content",
    name: L("نصيحة اليوم", "Tip of the day", "טיפ היום"),
    note: L("جدول نصايح؛ كل يوم بتنشر وحدة بالدور، والباقي بيتخبّى. بتعرض «النصيحة المنشورة» بأي صفحة.", "A table of tips; each day one is published in turn, the rest hidden. Show “the published tip” on any page.", "טבלת טיפים; כל יום אחד מתפרסם בתורו, והשאר מוסתרים. מציגים את «הטיפ המפורסם» בכל עמוד."),
    tables: [table("tips", "tips", L("النصايح", "Tips", "טיפים"), [f.text("tip", L("النصيحة", "Tip", "טיפ"), { required: true }), f.number("order", L("الترتيب", "Order", "סדר"), { default: 0 })])],
    fns: [
      {
        key: "rotate",
        name: "نصيحة اليوم",
        inputs: AT,
        on: on.daily("06:00"),
        do: [
          s.find("tips", "all", [], { limit: 200, sort: [{ field: "order", dir: "asc" }] }),
          s.when([cond("{{all}}", "empty")], [s.stop("ما في نصايح")]),
          s.code("return Math.floor(Date.now() / 86400e3) % input.n;", { n: "{{all.length}}" }, "k"),
          s.each("{{all}}", "tip", [s.when([cond("{{index}}", "eq", "{{k}}")], [s.change("tips", "{{tip.id}}", {}, { status: "PUBLISHED" })], [s.change("tips", "{{tip.id}}", {}, { status: "DRAFT" })])]),
        ],
      },
    ],
  }),
  fnEntry({
    key: "monthly-top-customers",
    category: "reports",
    name: L("أحسن زباين الشهر", "Top customers of the month", "הלקוחות המובילים של החודש"),
    note: L("أول كل شهر: أعلى 5 زباين صرفاً من جدول «صرف الزباين» بجرس الإدارة، لتشكرهم.", "On the 1st of each month: the 5 highest spenders from «Customer spend» in the admin's bell, to thank them.", "בראשון לכל חודש: 5 הלקוחות שהוציאו הכי הרבה מ«הוצאת לקוחות» בפעמון, כדי להודות להם."),
    tables: [table("spend", "customer-spend", L("صرف الزباين", "Customer spend", "הוצאת לקוחות"), [f.phone("phone", L("التلفون", "Phone", "טלפון"), { required: true, unique: true }), f.text("name", L("الاسم", "Name", "שם")), f.money("spent", L("صرف لهلأ", "Spent so far", "הוצאה עד כה"), { default: 0 })])],
    fns: [
      {
        key: "top",
        name: "أحسن زباين",
        inputs: AT,
        on: on.daily("09:00"),
        do: [
          s.code("return new Date(Date.now() + 2 * 3600e3).getUTCDate();", {}, "day"),
          s.when([cond("{{day}}", "ne", 1)], [s.stop("مش أول الشهر")]),
          s.find("spend", "best", [], { limit: 5, sort: [{ field: "spent", dir: "desc" }] }),
          s.code("return (input.rows || []).map((r, k) => (k + 1) + '. ' + (r.name || r.phone) + ' (' + r.spent + ')').join('\\n');", { rows: "{{best}}" }, "list"),
          s.bell("أحسن 5 زباين 🏆", "{{list}}"),
        ],
      },
    ],
  }),
  fnEntry({
    key: "weekly-low-ratings",
    category: "reports",
    name: L("ملخص التقييمات الضعيفة", "Weak ratings digest", "סיכום דירוגים חלשים"),
    note: L("كل يوم جمعة: التقييمات 3 نجوم وتحت من آخر أسبوع بإيميل واحد، لتعرف شو بدّه تصليح.", "Every Friday: ratings of 3 stars or less from the last week in one email, to know what needs fixing.", "כל שישי: דירוגים של 3 כוכבים ומטה מהשבוע האחרון במייל אחד, כדי לדעת מה לתקן."),
    tables: [table("ratings", "ratings", L("التقييمات", "Ratings", "דירוגים"), [f.number("stars", L("النجوم", "Stars", "כוכבים"), { required: true, min: 1, max: 5 }), f.long("comment", L("التعليق", "Comment", "הערה"))])],
    fns: [
      {
        key: "digest",
        name: "التقييمات الضعيفة",
        inputs: AT,
        on: on.daily("09:00"),
        do: [
          s.code("return new Date(Date.now() + 2 * 3600e3).getUTCDay();", {}, "weekday"),
          s.when([cond("{{weekday}}", "ne", 5)], [s.stop("مش جمعة")]),
          s.code(hoursAgo(7 * 24), {}, "since"),
          s.find("ratings", "weak", [where("stars", "lte", 3), where("$createdAt", "gte", "{{since}}")], { limit: 100 }),
          s.when([cond("{{weak}}", "empty")], [s.stop("ما في تقييمات ضعيفة هالأسبوع 🎉")]),
          s.code("return (input.rows || []).map((r) => '★'.repeat(Number(r.stars)) + ' ' + (r.comment || '')).join('\\n');", { rows: "{{weak}}" }, "text"),
          s.email("{{weak.length}} تقييم ضعيف هالأسبوع", "{{text}}"),
        ],
      },
    ],
  }),
  fnEntry({
    key: "daily-count-to-sheet",
    category: "integrations",
    name: L("عدد اليوم لشيت", "Today's count to a sheet", "ספירת היום לגיליון"),
    note: L("كل ليلة: كم سطر انضاف اليوم لجدولك بينكتب سطر بـ Google Sheets، لتعمل منه رسوم.", "Every night: how many rows your table got today is written as a row in Google Sheets, to chart from.", "כל לילה: כמה שורות נוספו היום לטבלה נכתב כשורה ב-Google Sheets, לגרפים."),
    tables: [table("signups", "signups", L("التسجيلات", "Sign-ups", "הרשמות"), [f.text("name", L("الاسم", "Name", "שם"), { required: true }), f.email("email", L("الإيميل", "Email", "מייל"))])],
    fns: [{ key: "count", name: "عدد اليوم للشيت", inputs: AT, on: on.daily("23:30"), do: [s.code(hoursAgo(24), {}, "since"), s.code(TODAY, {}, "today"), s.find("signups", "fresh", [where("$createdAt", "gte", "{{since}}")], { limit: 200 }), s.ready("append", { cells: '["{{today}}",{{fresh.length}}]' })] }],
  }),
  fnEntry({
    key: "follow-up-quotes",
    category: "customers",
    name: L("متابعة عروض الأسعار", "Follow up on quotes", "מעקב אחרי הצעות מחיר"),
    note: L("عرض سعر انبعت من 5 أيام وما رد عليه الزبون بيوصله إيميل متابعة، مرة وحدة.", "A quote sent 5 days ago with no answer gets a follow-up email, once.", "הצעת מחיר שנשלחה לפני 5 ימים בלי תשובה מקבלת מייל מעקב, פעם אחת."),
    tables: [table("quotes", "quote-requests", L("طلبات عروض الأسعار", "Quote requests", "בקשות הצעת מחיר"), [f.text("name", L("الاسم", "Name", "שם"), { required: true }), f.email("email", L("الإيميل", "Email", "מייל"), { required: true }), f.text("what", L("شو بدّه", "What", "מה")), f.date("sentOn", L("انبعت العرض", "Quote sent on", "ההצעה נשלחה ב")), f.bool("followed", L("تابعنا", "Followed up", "בוצע מעקב"), { default: false })])],
    fns: [{ key: "follow", name: "تابع العروض", inputs: AT, on: on.daily("10:30"), do: [s.code(daysFromNow(-5), {}, "before"), s.find("quotes", "quiet", [where("sentOn", "lte", "{{before}}"), where("followed", "isFalse")], { limit: 30 }), s.each("{{quiet}}", "q", [s.email("بخصوص «{{q.what}}»", "أهلا {{q.name}}، بعتنالك عرض سعر لـ «{{q.what}}». إذا عندك أي سؤال، رد على هالإيميل وبنساعدك.", "{{q.email}}"), s.change("quotes", "{{q.id}}", { followed: true })])] }],
  }),
  fnEntry({
    key: "empty-cart-of-the-week",
    category: "marketing",
    name: L("تذكير المحفوظات", "Saved items reminder", "תזכורת לפריטים שמורים"),
    note: L("كل يوم خميس: اللي حفظ أشياء «لبعدين» من أكتر من أسبوع بتوصله رسالة لطيفة بإيميله.", "Every Thursday: those who saved things “for later” over a week ago get a gentle email.", "כל חמישי: מי ששמר פריטים «לאחר כך» לפני יותר משבוע מקבל מייל עדין."),
    tables: [table("saved", "saved-items", L("أشياء محفوظة", "Saved items", "פריטים שמורים"), [f.text("item", L("الشي", "Item", "פריט"), { required: true }), f.email("email", L("الإيميل", "Email", "מייל"), { required: true }), f.bool("reminded", L("انذكّر", "Reminded", "תוזכר"), { default: false })])],
    fns: [
      {
        key: "remind",
        name: "ذكّر بالمحفوظات",
        inputs: AT,
        on: on.daily("18:00"),
        do: [s.code("return new Date(Date.now() + 2 * 3600e3).getUTCDay();", {}, "weekday"), s.when([cond("{{weekday}}", "ne", 4)], [s.stop("مش خميس")]), s.code(hoursAgo(7 * 24), {}, "before"), s.find("saved", "old", [where("reminded", "isFalse"), where("$createdAt", "lt", "{{before}}")], { limit: 20 }), s.each("{{old}}", "x", [s.email("لسا بتفكّر بـ «{{x.item}}»؟", "حفظته لبعدين، وهو لسا هون ناطرك 💛", "{{x.email}}"), s.change("saved", "{{x.id}}", { reminded: true })])],
      },
    ],
  }),
];
