/**
 * Ready functions a shop page runs: a form sent, or a button pressed (their call address). Some take
 * anyone (`public`, with a few calls a minute), most a signed-in shopper (`customer`: the row they add
 * is theirs, `{{caller}}`). Each keeps what was sent in a table of the owner's and tells whoever
 * should know.
 */
import { L, access, cond, f, fnEntry, i, on, s, table, where, type GalleryEntry } from "./kit.js";

const STATUS_NEW = (more: Array<[string, ReturnType<typeof L>]> = []) =>
  f.select("status", L("الحالة", "Status", "סטטוס"), [["new", L("جديد", "New", "חדש")], ...more, ["done", L("خلص", "Done", "טופל")]], { default: "new" });

export const FN_FORMS: GalleryEntry[] = [
  fnEntry({
    key: "contact-form",
    category: "forms",
    name: L("فورم «تواصل معنا»", "A “contact us” form", "טופס «צרו קשר»"),
    note: L("الاسم والإيميل والرسالة بينحفظوا بجدول «رسائل التواصل» وبيوصل إيميل للمتجر. لأي زائر، 5 رسايل بالدقيقة.", "Name, email and message are kept in a «Contact messages» table and the shop gets an email. For any visitor, 5 a minute.", "שם, מייל והודעה נשמרים בטבלת «הודעות יצירת קשר» והחנות מקבלת מייל. לכל מבקר, 5 בדקה."),
    tables: [table("messages", "contact-messages", L("رسائل التواصل", "Contact messages", "הודעות יצירת קשר"), [f.text("name", L("الاسم", "Name", "שם"), { required: true }), f.email("email", L("الإيميل", "Email", "מייל"), { required: true }), f.long("message", L("الرسالة", "Message", "הודעה"), { required: true }), STATUS_NEW()])],
    fns: [
      {
        key: "send",
        name: "رسالة تواصل",
        inputs: [i.text("name", { required: true, max: 80 }), i.email("email", { required: true }), i.text("message", { required: true, min: 5, max: 2000 })],
        on: on.call("contact-us", "public", 5),
        do: [s.add("messages", { name: "{{input.name}}", email: "{{input.email}}", message: "{{input.message}}" }), s.email("رسالة من {{input.name}}", "{{input.message}}\n\nللرد: {{input.email}}"), s.ret("وصلت رسالتك، منرد عليك قريب.")],
      },
    ],
  }),
  fnEntry({
    key: "newsletter-signup",
    category: "marketing",
    name: L("اشتراك بالنشرة", "Newsletter sign-up", "הרשמה לניוזלטר"),
    note: L("إيميل واحد مرة وحدة: اللي مشترك من قبل بينقاله، والجديد بينحفظ بجدول المشتركين.", "One email, once: an address already signed up is told so, a new one is kept in the subscribers' table.", "מייל אחד, פעם אחת: כתובת שכבר רשומה מקבלת הודעה, חדשה נשמרת בטבלת המנויים."),
    tables: [table("subs", "newsletter", L("مشتركين النشرة", "Newsletter subscribers", "מנויי ניוזלטר"), [f.email("email", L("الإيميل", "Email", "מייל"), { required: true, unique: true }), f.text("source", L("من وين", "Source", "מקור")), f.bool("active", L("مشترك", "Subscribed", "רשום"), { default: true })])],
    fns: [
      {
        key: "join",
        name: "اشترك بالنشرة",
        inputs: [i.email("email", { required: true }), i.text("source", { max: 60 })],
        on: on.call("newsletter-join", "public", 5),
        do: [
          s.find("subs", "found", [where("email", "is", "{{input.email}}")], { limit: 1 }),
          s.when([cond("{{found}}", "notEmpty")], [s.when([cond("{{found.0.active}}", "eq", true)], [s.ret("إنت مشترك من قبل 💌")], [s.change("subs", "{{found.0.id}}", { active: true }), s.ret("رجّعناك للنشرة 💌")])]),
          s.add("subs", { email: "{{input.email}}", source: "{{input.source}}" }),
          s.ret("اشتركت! أول رسالة بتوصلك قريب."),
        ],
      },
      {
        key: "leave",
        name: "إلغاء الاشتراك",
        inputs: [i.email("email", { required: true })],
        on: on.call("newsletter-leave", "public", 5),
        do: [s.find("subs", "found", [where("email", "is", "{{input.email}}")], { limit: 1 }), s.when([cond("{{found}}", "notEmpty")], [s.change("subs", "{{found.0.id}}", { active: false })]), s.ret("لغينا اشتراكك. منشتاقلك!")],
      },
    ],
  }),
  fnEntry({
    key: "callback-request",
    category: "forms",
    name: L("«رنّولي» طلب اتصال", "“Call me back” request", "בקשת «תחזרו אליי»"),
    note: L("الزائر بيترك رقمه ووقت مناسب، وبيوصل واتساب للمتجر وبينحفظ الطلب.", "A visitor leaves a number and a good time; the shop gets a WhatsApp and the request is kept.", "המבקר משאיר מספר ושעה נוחה; החנות מקבלת וואטסאפ והבקשה נשמרת."),
    tables: [table("calls", "callback-requests", L("طلبات اتصال", "Callback requests", "בקשות חזרה"), [f.text("name", L("الاسم", "Name", "שם")), f.phone("phone", L("التلفون", "Phone", "טלפון"), { required: true }), f.text("when", L("الوقت المناسب", "Good time", "שעה נוחה")), STATUS_NEW([["called", L("اتصلنا", "Called", "התקשרנו")]])])],
    fns: [
      {
        key: "ask",
        name: "طلب اتصال",
        inputs: [i.text("name", { max: 80 }), i.phone("phone", { required: true }), i.text("when", { max: 80 })],
        on: on.call("call-me", "public", 5),
        do: [s.add("calls", { name: "{{input.name}}", phone: "{{input.phone}}", when: "{{input.when}}" }), s.whatsapp("📞 {{input.name}} بدّه نرنّله على {{input.phone}} ({{input.when}})"), s.ret("تمام، منرنّلك بأقرب وقت.")],
      },
    ],
  }),
  fnEntry({
    key: "quote-request",
    category: "forms",
    name: L("طلب عرض سعر", "Request a quote", "בקשת הצעת מחיר"),
    note: L("للكميات والطلبات الخاصة: شو بدّه، كم، ولإيمتى. بينحفظ وبيوصل إيميل للمتجر.", "For quantities and special orders: what, how many, by when. Kept, and the shop gets an email.", "לכמויות והזמנות מיוחדות: מה, כמה, ועד מתי. נשמר והחנות מקבלת מייל."),
    tables: [table("quotes", "quote-requests", L("طلبات عروض الأسعار", "Quote requests", "בקשות הצעת מחיר"), [f.text("name", L("الاسم", "Name", "שם"), { required: true }), f.email("email", L("الإيميل", "Email", "מייל"), { required: true }), f.text("what", L("شو بدّه", "What", "מה"), { required: true }), f.number("quantity", L("الكمية", "Quantity", "כמות")), f.date("by", L("لإيمتى", "By", "עד")), f.money("offer", L("السعر اللي عرضناه", "Our price", "המחיר שהצענו")), STATUS_NEW([["sent", L("بعتنا العرض", "Quote sent", "נשלחה הצעה")]])])],
    fns: [
      {
        key: "ask",
        name: "طلب عرض سعر",
        inputs: [i.text("name", { required: true, max: 80 }), i.email("email", { required: true }), i.text("what", { required: true, max: 300 }), i.num("quantity", { min: 1, max: 100000 }), i.text("by", { format: "date" })],
        on: on.call("quote-request", "public", 3),
        do: [s.add("quotes", { name: "{{input.name}}", email: "{{input.email}}", what: "{{input.what}}", quantity: "{{input.quantity}}", by: "{{input.by}}" }), s.email("طلب عرض سعر: {{input.what}}", "{{input.name}} ({{input.email}}) بدّه {{input.quantity}} من «{{input.what}}» لـ {{input.by}}."), s.ret("وصل طلبك، العرض بيوصلك على الإيميل.")],
      },
    ],
  }),
  fnEntry({
    key: "wholesale-application",
    category: "customers",
    name: L("طلب حساب جملة", "Wholesale account application", "בקשה לחשבון סיטונאי"),
    note: L("محل أو شركة بتطلب أسعار جملة: الطلب بيستنى موافقتك، وبيرن الجرس.", "A shop or company asks for wholesale prices: the request waits for your approval and rings the bell.", "חנות או חברה מבקשת מחירי סיטונאות: הבקשה ממתינה לאישור ומצלצלת בפעמון."),
    tables: [table("apps", "wholesale-applications", L("طلبات الجملة", "Wholesale applications", "בקשות סיטונאות"), [f.text("company", L("الشركة", "Company", "חברה"), { required: true }), f.text("taxId", L("رقم المشغّل", "Tax number", "מספר עוסק")), f.text("contact", L("المسؤول", "Contact", "איש קשר")), f.email("email", L("الإيميل", "Email", "מייל"), { required: true }), f.phone("phone", L("التلفون", "Phone", "טלפון")), f.select("status", L("الحالة", "Status", "סטטוס"), [["waiting", L("ناطر", "Waiting", "ממתין")], ["approved", L("موافق", "Approved", "אושר")], ["declined", L("مرفوض", "Declined", "נדחה")]], { default: "waiting" })])],
    fns: [
      {
        key: "apply",
        name: "طلب جملة",
        inputs: [i.text("company", { required: true, max: 120 }), i.text("taxId", { max: 20 }), i.text("contact", { max: 80 }), i.email("email", { required: true }), i.phone("phone")],
        on: on.call("wholesale-apply", "public", 3),
        do: [s.find("apps", "found", [where("email", "is", "{{input.email}}")], { limit: 1 }), s.when([cond("{{found}}", "notEmpty")], [s.stop("في طلب من هالإيميل من قبل، عم نراجعه")]), s.add("apps", { company: "{{input.company}}", taxId: "{{input.taxId}}", contact: "{{input.contact}}", email: "{{input.email}}", phone: "{{input.phone}}" }), s.bell("طلب جملة من {{input.company}}", "{{input.contact}} · {{input.email}}"), s.ret("وصل طلبك، منرد عليك خلال يومين.")],
      },
    ],
  }),
  fnEntry({
    key: "product-question",
    category: "support",
    name: L("سؤال عن منتج", "A question about a product", "שאלה על מוצר"),
    note: L("زر «اسأل عن المنتج» بصفحة المنتج: السؤال بينحفظ مع اسم المنتج وبيرن الجرس.", "An “ask about this product” button on its page: the question is kept with the product's name and rings the bell.", "כפתור «שאלו על המוצר» בעמוד שלו: השאלה נשמרת עם שם המוצר ומצלצלת בפעמון."),
    tables: [table("questions", "product-questions", L("أسئلة المنتجات", "Product questions", "שאלות על מוצרים"), [f.text("product", L("المنتج", "Product", "מוצר"), { required: true }), f.long("question", L("السؤال", "Question", "שאלה"), { required: true }), f.email("email", L("إيميل للرد", "Email to answer", "מייל לתשובה")), f.long("answer", L("الجواب", "Answer", "תשובה"))], access("public", "off"))],
    fns: [
      {
        key: "ask",
        name: "سؤال عن منتج",
        inputs: [i.text("product", { required: true, max: 120 }), i.text("question", { required: true, min: 5, max: 1000 }), i.email("email")],
        on: on.call("ask-product", "public", 5),
        do: [s.add("questions", { product: "{{input.product}}", question: "{{input.question}}", email: "{{input.email}}" }), s.bell("سؤال عن {{input.product}}", "{{input.question}}"), s.ret("وصل سؤالك. الجواب بينشر هون وبيوصلك إذا تركت إيميل.")],
      },
    ],
  }),
  fnEntry({
    key: "size-advice",
    category: "utilities",
    name: L("نصيحة مقاس", "Size advice", "המלצת מידה"),
    note: L("من الطول والوزن بيقترح مقاس (S حتى XXL). عدّل الجدول جوّا الكود حسب قياساتك.", "From height and weight, suggests a size (S to XXL). Change the table inside the code to your own measures.", "מגובה ומשקל ממליץ על מידה (S עד XXL). משנים את הטבלה בתוך הקוד למידות שלכם."),
    fns: [
      {
        key: "advise",
        name: "نصيحة مقاس",
        inputs: [i.num("height", { required: true, min: 120, max: 220 }), i.num("weight", { required: true, min: 30, max: 200 })],
        on: on.call("size-advice", "public", 20),
        do: [
          s.code(
            "const h = Number(input.height), w = Number(input.weight); const bmi = w / Math.pow(h / 100, 2); const sizes = [[19, 'S'], [22, 'M'], [25, 'L'], [28, 'XL']]; let size = 'XXL'; for (const [top, name] of sizes) { if (bmi < top) { size = name; break; } } if (h > 180 && size === 'S') size = 'M'; return size;",
            { height: "{{input.height}}", weight: "{{input.weight}}" },
            "size",
          ),
          s.ret("{{size}}"),
        ],
        tests: [
          { id: "small", name: "160 سم و 45 كيلو", input: { height: 160, weight: 45 }, expect: { ok: true, value: "S" } },
          { id: "large", name: "175 سم و 72 كيلو", input: { height: 175, weight: 72 }, expect: { ok: true, value: "L" } },
        ],
      },
    ],
  }),
  fnEntry({
    key: "back-in-stock-signup",
    category: "marketing",
    name: L("خبّرني لما يرجع", "Tell me when it's back", "תודיעו לי כשחוזר"),
    note: L("الزبون بيسجّل على منتج خلص، وبينحفظ بقائمة. لما يرجع، شغّل «بلّغ الناطرين» وبتوصلهم رسالة.", "A shopper signs up for a product that's out, kept in a list. When it's back, run “tell the waiting” and they get a message.", "לקוח נרשם למוצר שאזל, ונשמר ברשימה. כשהוא חוזר, מריצים «עדכנו את הממתינים» והם מקבלים הודעה."),
    tables: [table("waiting", "back-in-stock", L("ناطرين المنتجات", "Waiting for products", "ממתינים למוצרים"), [f.text("product", L("المنتج", "Product", "מוצר"), { required: true }), f.phone("phone", L("التلفون", "Phone", "טלפון"), { required: true }), f.bool("told", L("انبلّغ", "Told", "עודכן"), { default: false })])],
    fns: [
      {
        key: "join",
        name: "سجّل على منتج",
        inputs: [i.text("product", { required: true, max: 120 }), i.phone("phone", { required: true })],
        on: on.call("notify-me", "public", 5),
        do: [s.find("waiting", "found", [where("product", "is", "{{input.product}}"), where("phone", "is", "{{input.phone}}"), where("told", "isFalse")], { limit: 1 }), s.when([cond("{{found}}", "empty")], [s.add("waiting", { product: "{{input.product}}", phone: "{{input.phone}}" })]), s.ret("تمام! أول ما يرجع منبعتلك.")],
      },
      {
        key: "tell",
        name: "بلّغ الناطرين",
        note: "شغّلها من صفحتها لما المنتج يرجع (اكتب اسمه)",
        inputs: [i.text("product", { required: true, max: 120 })],
        do: [s.find("waiting", "people", [where("product", "is", "{{input.product}}"), where("told", "isFalse")], { limit: 20 }), s.each("{{people}}", "p", [s.whatsapp("رجع «{{input.product}}» 🎉 الحق عليه قبل ما يخلص.", "{{p.phone}}"), s.change("waiting", "{{p.id}}", { told: true })]), s.ret("{{people.length}}")],
      },
    ],
  }),
  fnEntry({
    key: "feedback-rating",
    category: "support",
    name: L("تقييم سريع بعد الشراء", "A quick rating after buying", "דירוג מהיר אחרי קנייה"),
    note: L("نجوم من 1 لـ 5 وتعليق. تقييم 2 وتحت بيرن الجرس فوراً لتلحق الزبون.", "Stars 1 to 5 and a comment. 2 or less rings the bell at once, so you can reach the customer.", "כוכבים 1 עד 5 והערה. 2 ומטה מצלצל מיד, כדי להגיע ללקוח."),
    tables: [table("ratings", "ratings", L("التقييمات", "Ratings", "דירוגים"), [f.number("stars", L("النجوم", "Stars", "כוכבים"), { required: true, min: 1, max: 5 }), f.long("comment", L("التعليق", "Comment", "הערה")), f.text("orderId", L("الطلب", "Order", "הזמנה"))], access("off", "off"))],
    fns: [
      {
        key: "rate",
        name: "تقييم",
        inputs: [i.num("stars", { required: true, min: 1, max: 5 }), i.text("comment", { max: 1000 }), i.text("orderId", { max: 40 })],
        on: on.call("rate-us", "customer", 5),
        do: [s.add("ratings", { stars: "{{input.stars}}", comment: "{{input.comment}}", orderId: "{{input.orderId}}" }, { owner: "{{caller}}" }), s.when([cond("{{input.stars}}", "lte", 2)], [s.bell("تقييم {{input.stars}} من {{caller.name}}", "{{input.comment}}")]), s.ret("شكراً على رأيك 🌸")],
      },
    ],
  }),
  fnEntry({
    key: "nps-survey",
    category: "reports",
    name: L("سؤال «بتنصح فينا؟» (NPS)", "“Would you recommend us?” (NPS)", "«הייתם ממליצים עלינו?» (NPS)"),
    note: L("علامة من 0 لـ 10: بينحسب إذا الزبون مروّج أو محايد أو منتقد وبينحفظ، وبتطلع النسبة من الجدول.", "A score of 0 to 10: worked out as promoter, passive or detractor and kept; read the share from the table.", "ציון 0 עד 10: מסווג כממליץ, ניטרלי או מבקר ונשמר; את השיעור קוראים מהטבלה."),
    tables: [table("nps", "nps-answers", L("أجوبة NPS", "NPS answers", "תשובות NPS"), [f.number("score", L("العلامة", "Score", "ציון"), { required: true, min: 0, max: 10 }), f.select("group", L("المجموعة", "Group", "קבוצה"), [["promoter", L("مروّج", "Promoter", "ממליץ")], ["passive", L("محايد", "Passive", "ניטרלי")], ["detractor", L("منتقد", "Detractor", "מבקר")]]), f.long("why", L("ليش", "Why", "למה"))])],
    fns: [
      {
        key: "answer",
        name: "جواب NPS",
        inputs: [i.num("score", { required: true, min: 0, max: 10 }), i.text("why", { max: 1000 })],
        on: on.call("nps", "public", 5),
        do: [s.code("const n = Number(input.score); return n >= 9 ? 'promoter' : n >= 7 ? 'passive' : 'detractor';", { score: "{{input.score}}" }, "group"), s.add("nps", { score: "{{input.score}}", group: "{{group}}", why: "{{input.why}}" }), s.ret("شكراً!")],
      },
      {
        key: "score",
        name: "نتيجة NPS",
        note: "بترجّع النتيجة من -100 لـ 100",
        do: [
          s.find("nps", "all", [], { limit: 200, sort: [{ field: "$createdAt", dir: "desc" }] }),
          s.code("const rows = input.rows || []; if (!rows.length) return 0; const p = rows.filter((r) => r.group === 'promoter').length; const d = rows.filter((r) => r.group === 'detractor').length; return Math.round(((p - d) / rows.length) * 100);", { rows: "{{all}}" }, "nps"),
          s.ret("{{nps}}"),
        ],
      },
    ],
  }),
  fnEntry({
    key: "event-rsvp",
    category: "bookings",
    name: L("تسجيل حضور فعالية", "Event RSVP", "אישור הגעה לאירוע"),
    note: L("الزبون بيسجّل حاله ومين معه. لما توصل العدد (50) التسجيل بيسكّر لحاله.", "A shopper signs up with their guests. At capacity (50) sign-up closes by itself.", "לקוח נרשם עם האורחים שלו. במלוא התפוסה (50) ההרשמה נסגרת מעצמה."),
    tables: [table("rsvp", "event-rsvp", L("الحضور", "RSVPs", "אישורי הגעה"), [f.text("name", L("الاسم", "Name", "שם"), { required: true }), f.number("guests", L("كم شخص", "People", "אנשים"), { default: 1, min: 1, max: 10 }), f.phone("phone", L("التلفون", "Phone", "טלפון"))], access("customer", "off"))],
    fns: [
      {
        key: "join",
        name: "سجّلني بالفعالية",
        inputs: [i.text("name", { required: true, max: 80 }), i.num("guests", { min: 1, max: 10 }), i.phone("phone")],
        on: on.call("event-rsvp", "customer", 5),
        do: [
          s.find("rsvp", "mine", [where("phone", "is", "{{input.phone}}")], { limit: 1 }),
          s.when([cond("{{mine}}", "notEmpty")], [s.stop("إنت مسجّل من قبل")]),
          s.find("rsvp", "all", [], { limit: 200 }),
          s.code("const taken = (input.rows || []).reduce((n, r) => n + Number(r.guests || 1), 0); return 50 - taken;", { rows: "{{all}}" }, "left"),
          s.when([cond("{{left}}", "lt", "{{input.guests}}")], [s.stop("آسفين، الأماكن خلصت")]),
          s.add("rsvp", { name: "{{input.name}}", guests: "{{input.guests}}", phone: "{{input.phone}}" }, { owner: "{{caller}}" }),
          s.ret("سجّلناك! بنشوفك هناك 🎉"),
        ],
      },
    ],
  }),
  fnEntry({
    key: "giveaway-entry",
    category: "marketing",
    name: L("الاشتراك بالسحب", "Giveaway entry", "השתתפות בהגרלה"),
    note: L("كل زبون مسجّل بيشترك مرة وحدة وبياخد رقم مشاركة. السحب نفسه بالـ function التانية.", "Each signed-in shopper enters once and gets an entry number. The draw is the second function.", "כל לקוח רשום משתתף פעם אחת ומקבל מספר השתתפות. ההגרלה היא הפונקציה השנייה."),
    tables: [table("entries", "giveaway-entries", L("المشتركين بالسحب", "Giveaway entries", "משתתפי הגרלה"), [f.text("name", L("الاسم", "Name", "שם")), f.email("email", L("الإيميل", "Email", "מייל"), { required: true, unique: true }), f.bool("winner", L("ربح", "Won", "זכה"), { default: false })], access("customer", "off"))],
    fns: [
      {
        key: "enter",
        name: "اشترك بالسحب",
        on: on.call("giveaway-enter", "customer", 3),
        do: [s.find("entries", "mine", [where("email", "is", "{{caller.email}}")], { limit: 1 }), s.when([cond("{{mine}}", "notEmpty")], [s.stop("إنت مشترك من قبل، بالتوفيق!")]), s.add("entries", { name: "{{caller.name}}", email: "{{caller.email}}" }, { owner: "{{caller}}" }), s.find("entries", "all", [], { limit: 200 }), s.ret("اشتركت! رقمك {{all.length}}")],
      },
      {
        key: "draw",
        name: "اسحب الرابح",
        note: "شغّلها من صفحتها يوم السحب",
        do: [
          s.find("entries", "all", [where("winner", "isFalse")], { limit: 200 }),
          s.when([cond("{{all}}", "empty")], [s.stop("ما في مشتركين")]),
          s.code("return Math.floor(Math.random() * input.n);", { n: "{{all.length}}" }, "pick"),
          s.code("return input.rows[input.k];", { rows: "{{all}}", k: "{{pick}}" }, "winner"),
          s.change("entries", "{{winner.id}}", { winner: true }),
          s.email("مبروك! ربحت بالسحب 🎉", "أهلا {{winner.name}}، إنت الرابح بالسحب. منتواصل معك قريب.", "{{winner.email}}"),
          s.ret("{{winner.name}}"),
        ],
      },
    ],
  }),
  fnEntry({
    key: "complaint",
    category: "support",
    name: L("شكوى على طلب", "A complaint about an order", "תלונה על הזמנה"),
    note: L("الزبون بيكتب رقم الطلب والمشكلة: بتنحفظ إله، بيوصلك إيميل وجرس، وبتقدر ترد من الجدول.", "A shopper writes the order and the problem: kept as theirs, you get an email and a bell, and answer from the table.", "לקוח כותב את ההזמנה והבעיה: נשמר אצלו, מקבלים מייל ופעמון, ועונים מהטבלה."),
    tables: [table("complaints", "complaints", L("الشكاوى", "Complaints", "תלונות"), [f.text("orderId", L("الطلب", "Order", "הזמנה"), { required: true }), f.long("problem", L("المشكلة", "Problem", "בעיה"), { required: true }), f.long("answer", L("ردّنا", "Our answer", "התשובה שלנו")), STATUS_NEW([["working", L("عم نشتغل عليها", "Working on it", "בטיפול")]])], access("customer", "off"))],
    fns: [
      {
        key: "file",
        name: "شكوى",
        inputs: [i.text("orderId", { required: true, max: 40 }), i.text("problem", { required: true, min: 10, max: 2000 })],
        on: on.call("complain", "customer", 3),
        do: [s.add("complaints", { orderId: "{{input.orderId}}", problem: "{{input.problem}}" }, { owner: "{{caller}}" }), s.email("شكوى على الطلب {{input.orderId}}", "{{caller.name}} ({{caller.email}}):\n{{input.problem}}"), s.bell("شكوى على الطلب {{input.orderId}}", "{{input.problem}}"), s.ret("وصلت شكواك، ومنرد عليك اليوم.")],
      },
    ],
  }),
  fnEntry({
    key: "appointment-request",
    category: "bookings",
    name: L("حجز موعد بوقت فاضي", "Book a free time slot", "קביעת תור בשעה פנויה"),
    note: L("الزبون بيختار يوم وساعة؛ الوقت المحجوز ما بينحجز مرتين، والحجز بيوصل للطرفين.", "A shopper picks a day and an hour; a taken slot can't be booked twice, and both sides are told.", "לקוח בוחר יום ושעה; משבצת תפוסה לא נקבעת פעמיים, ושני הצדדים מקבלים הודעה."),
    tables: [table("slots", "appointments", L("المواعيد", "Appointments", "תורים"), [f.date("day", L("اليوم", "Day", "יום"), { required: true }), f.text("hour", L("الساعة", "Hour", "שעה"), { required: true }), f.text("name", L("الاسم", "Name", "שם")), f.phone("phone", L("التلفون", "Phone", "טלפון"), { required: true }), f.text("note", L("ملاحظة", "Note", "הערה"))], access("customer", "off"))],
    fns: [
      {
        key: "book",
        name: "احجز موعد",
        inputs: [i.text("day", { required: true, format: "date" }), i.text("hour", { required: true, choices: ["10:00", "11:00", "12:00", "13:00", "16:00", "17:00", "18:00"] }), i.text("name", { max: 80 }), i.phone("phone", { required: true }), i.text("note", { max: 300 })],
        on: on.call("book-slot", "customer", 5),
        do: [
          s.find("slots", "taken", [where("day", "is", "{{input.day}}"), where("hour", "is", "{{input.hour}}")], { limit: 1 }),
          s.when([cond("{{taken}}", "notEmpty")], [s.stop("هالوقت محجوز، اختار وقت تاني")]),
          s.add("slots", { day: "{{input.day}}", hour: "{{input.hour}}", name: "{{input.name}}", phone: "{{input.phone}}", note: "{{input.note}}" }, { owner: "{{caller}}" }),
          s.whatsapp("حجزنالك موعد يوم {{input.day}} الساعة {{input.hour}} ✅", "{{input.phone}}"),
          s.bell("موعد جديد: {{input.day}} {{input.hour}}", "{{input.name}} · {{input.phone}}"),
          s.ret("تم الحجز ✅"),
        ],
      },
    ],
  }),
  fnEntry({
    key: "custom-order-request",
    category: "forms",
    name: L("طلب تفصيل خاص", "A custom-made request", "בקשת הזמנה בהתאמה אישית"),
    note: L("الزبون بيوصف شو بدّه وميزانيته؛ بينحفظ إله ليتابع الحالة من صفحته.", "A shopper describes what they want and a budget; kept as theirs, to follow its state from their page.", "לקוח מתאר מה הוא רוצה ותקציב; נשמר אצלו, כדי לעקוב אחרי המצב מהעמוד שלו."),
    tables: [table("custom", "custom-orders", L("طلبات التفصيل", "Custom orders", "הזמנות בהתאמה"), [f.long("details", L("التفاصيل", "Details", "פרטים"), { required: true }), f.money("budget", L("الميزانية", "Budget", "תקציב")), f.date("by", L("لإيمتى", "By", "עד")), f.money("price", L("السعر", "Price", "מחיר")), STATUS_NEW([["priced", L("انسعّر", "Priced", "תומחר")], ["making", L("عم ينعمل", "Being made", "בהכנה")]])], access("customer", "off"))],
    fns: [
      {
        key: "ask",
        name: "طلب تفصيل",
        inputs: [i.text("details", { required: true, min: 10, max: 2000 }), i.num("budget", { min: 0 }), i.text("by", { format: "date" })],
        on: on.call("custom-order", "customer", 3),
        do: [s.add("custom", { details: "{{input.details}}", budget: "{{input.budget}}", by: "{{input.by}}" }, { owner: "{{caller}}" }), s.bell("طلب تفصيل من {{caller.name}}", "{{input.details}}"), s.ret("وصل طلبك. السعر بيبين بصفحتك.")],
      },
    ],
  }),
  fnEntry({
    key: "job-application",
    category: "forms",
    name: L("طلب توظيف", "Job application", "מועמדות לעבודה"),
    note: L("الاسم، الوظيفة، رابط السيرة الذاتية وكلمتين عن حاله. بينحفظ وبيوصل إيميل.", "Name, the job, a link to the CV and a few words. Kept, and you get an email.", "שם, המשרה, קישור לקורות חיים וכמה מילים. נשמר ומקבלים מייל."),
    tables: [table("jobs", "job-applications", L("طلبات التوظيف", "Job applications", "מועמדויות"), [f.text("name", L("الاسم", "Name", "שם"), { required: true }), f.email("email", L("الإيميل", "Email", "מייל"), { required: true }), f.text("role", L("الوظيفة", "Role", "תפקיד"), { required: true }), f.link("cv", L("السيرة الذاتية", "CV", "קורות חיים")), f.long("about", L("عن حاله", "About", "על עצמו")), f.select("stage", L("المرحلة", "Stage", "שלב"), [["new", L("جديد", "New", "חדש")], ["interview", L("مقابلة", "Interview", "ראיון")], ["hired", L("انقبل", "Hired", "התקבל")], ["no", L("لا", "No", "לא")]], { default: "new" })])],
    fns: [
      {
        key: "apply",
        name: "طلب توظيف",
        inputs: [i.text("name", { required: true, max: 80 }), i.email("email", { required: true }), i.text("role", { required: true, max: 80 }), i.text("cv", { format: "url" }), i.text("about", { max: 2000 })],
        on: on.call("apply-job", "public", 3),
        do: [s.add("jobs", { name: "{{input.name}}", email: "{{input.email}}", role: "{{input.role}}", cv: "{{input.cv}}", about: "{{input.about}}" }), s.email("طلب توظيف: {{input.role}}", "{{input.name}} ({{input.email}})\n{{input.cv}}\n\n{{input.about}}"), s.ret("وصل طلبك، بالتوفيق!")],
      },
    ],
  }),
  fnEntry({
    key: "poll-vote",
    category: "community",
    name: L("تصويت: صوت واحد لكل زبون", "A poll: one vote per shopper", "סקר: קול אחד לכל לקוח"),
    note: L("الزبون بيختار خيار، وصوته بيتغيّر إذا صوّت كمان مرة. وفي function بترجّع النتيجة.", "A shopper picks an option; voting again changes their vote. Another function gives the results.", "לקוח בוחר אפשרות; הצבעה נוספת משנה את הקול. פונקציה נוספת מחזירה את התוצאות."),
    tables: [table("votes", "poll-votes", L("الأصوات", "Votes", "קולות"), [f.text("poll", L("التصويت", "Poll", "סקר"), { required: true }), f.text("choice", L("الاختيار", "Choice", "בחירה"), { required: true }), f.email("voter", L("المصوّت", "Voter", "מצביע"), { required: true })], access("off", "off"))],
    fns: [
      {
        key: "vote",
        name: "صوّت",
        inputs: [i.text("poll", { required: true, max: 60 }), i.text("choice", { required: true, max: 60 })],
        on: on.call("poll-vote", "customer", 10),
        do: [s.find("votes", "mine", [where("poll", "is", "{{input.poll}}"), where("voter", "is", "{{caller.email}}")], { limit: 1 }), s.when([cond("{{mine}}", "empty")], [s.add("votes", { poll: "{{input.poll}}", choice: "{{input.choice}}", voter: "{{caller.email}}" }, { owner: "{{caller}}" })], [s.change("votes", "{{mine.0.id}}", { choice: "{{input.choice}}" })]), s.ret("انحسب صوتك ✅")],
      },
      {
        key: "results",
        name: "نتيجة التصويت",
        inputs: [i.text("poll", { required: true, max: 60 })],
        on: on.call("poll-results", "public", 30),
        do: [s.find("votes", "all", [where("poll", "is", "{{input.poll}}")], { limit: 200 }), s.code("const out = {}; for (const v of input.rows || []) out[v.choice] = (out[v.choice] || 0) + 1; return out;", { rows: "{{all}}" }, "count"), s.ret("{{count}}")],
      },
    ],
  }),
  fnEntry({
    key: "like-toggle",
    category: "community",
    name: L("زر «عجبني»", "A “like” button", "כפתור «אהבתי»"),
    note: L("كبسة بتعطي لايك، وكبسة تانية بتشيله. بترجّع إذا معجب هلأ.", "One press likes, a second takes it back. Gives back whether it's liked now.", "לחיצה אחת עושה לייק, שנייה מבטלת. מחזירה אם עכשיו יש לייק."),
    tables: [table("likes", "likes", L("الإعجابات", "Likes", "לייקים"), [f.text("item", L("الشي", "Item", "פריט"), { required: true }), f.email("by", L("من", "By", "מאת"), { required: true })], access("public", "off"))],
    fns: [
      {
        key: "toggle",
        name: "عجبني",
        inputs: [i.text("item", { required: true, max: 120 })],
        on: on.call("like", "customer", 30),
        do: [s.find("likes", "mine", [where("item", "is", "{{input.item}}"), where("by", "is", "{{caller.email}}")], { limit: 1 }), s.when([cond("{{mine}}", "notEmpty")], [s.del("likes", "{{mine.0.id}}"), s.ret(false)]), s.add("likes", { item: "{{input.item}}", by: "{{caller.email}}" }, { owner: "{{caller}}" }), s.ret(true)],
      },
    ],
  }),
  fnEntry({
    key: "save-for-later",
    category: "customers",
    name: L("«احفظه لبعدين»", "“Save for later”", "«שמירה לאחר כך»"),
    note: L("قائمة للزبون نفسه بأشياء بدّه يرجعلها، بتبين بصفحته وما حدا غيره بيشوفها.", "A shopper's own list of things to come back to, shown on their page and seen by nobody else.", "רשימה אישית של דברים לחזור אליהם, מוצגת בעמוד של הלקוח ואף אחד אחר לא רואה."),
    tables: [table("saved", "saved-for-later", L("محفوظ لبعدين", "Saved for later", "שמור לאחר כך"), [f.text("item", L("الشي", "Item", "פריט"), { required: true }), f.link("link", L("الرابط", "Link", "קישור")), f.text("note", L("ملاحظة", "Note", "הערה"))], access("customer", "customer", "customer", "customer"))],
    fns: [
      {
        key: "save",
        name: "احفظ لبعدين",
        inputs: [i.text("item", { required: true, max: 120 }), i.text("link", { max: 300 }), i.text("note", { max: 200 })],
        on: on.call("save-later", "customer", 20),
        do: [s.add("saved", { item: "{{input.item}}", link: "{{input.link}}", note: "{{input.note}}" }, { owner: "{{caller}}" }), s.ret("انحفظ 🔖")],
      },
    ],
  }),
  fnEntry({
    key: "referral-code",
    category: "marketing",
    name: L("كود دعوة لكل زبون", "An invite code for each shopper", "קוד הזמנה לכל לקוח"),
    note: L("كل زبون بياخد كود خاص إله يشاركه؛ كود مستعمل بيتسجّل لصاحبه، لتكافئه.", "Each shopper gets their own code to share; a code used is credited to its owner, so you can reward them.", "כל לקוח מקבל קוד משלו לשתף; קוד שנוצל נזקף לבעליו, כדי לתגמל אותו."),
    tables: [
      table("codes", "invite-codes", L("أكواد الدعوة", "Invite codes", "קודי הזמנה"), [f.text("code", L("الكود", "Code", "קוד"), { required: true, unique: true }), f.email("owner", L("صاحبه", "Owner", "בעלים"), { required: true, unique: true }), f.number("used", L("انستعمل", "Used", "נוצל"), { default: 0 })], access("customer", "off")),
      table("uses", "invite-uses", L("استعمال الدعوات", "Invite uses", "ניצולי הזמנות"), [f.text("code", L("الكود", "Code", "קוד"), { required: true }), f.email("by", L("مين استعمله", "Used by", "נוצל ע״י"), { required: true, unique: true })]),
    ],
    fns: [
      {
        key: "mine",
        name: "كود الدعوة تبعي",
        on: on.call("my-invite-code", "customer", 10),
        do: [
          s.find("codes", "have", [where("owner", "is", "{{caller.email}}")], { limit: 1 }),
          s.when([cond("{{have}}", "notEmpty")], [s.ret("{{have.0.code}}")]),
          s.code("const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = ''; for (let k = 0; k < 6; k++) c += abc[Math.floor(Math.random() * abc.length)]; return c;", {}, "code"),
          s.add("codes", { code: "{{code}}", owner: "{{caller.email}}" }, { owner: "{{caller}}" }),
          s.ret("{{code}}"),
        ],
      },
      {
        key: "use",
        name: "استعمل كود دعوة",
        inputs: [i.text("code", { required: true, min: 4, max: 12 })],
        on: on.call("use-invite-code", "customer", 5),
        do: [
          s.find("codes", "c", [where("code", "is", "{{input.code}}")], { limit: 1 }),
          s.when([cond("{{c}}", "empty")], [s.stop("الكود مش صحيح")]),
          s.when([cond("{{c.0.owner}}", "eq", "{{caller.email}}")], [s.stop("ما بتقدر تستعمل كودك إنت")]),
          s.find("uses", "before", [where("by", "is", "{{caller.email}}")], { limit: 1 }),
          s.when([cond("{{before}}", "notEmpty")], [s.stop("استعملت كود دعوة من قبل")]),
          s.add("uses", { code: "{{input.code}}", by: "{{caller.email}}" }),
          s.set("n", "{{c.0.used}}"),
          s.set("n", 1, "add"),
          s.change("codes", "{{c.0.id}}", { used: "{{n}}" }),
          s.ret("أهلا فيك! الكود انحسب لصاحبك 🎁"),
        ],
      },
    ],
  }),
  fnEntry({
    key: "gift-message",
    category: "orders",
    name: L("رسالة هدية مع الطلب", "A gift message with the order", "הקדשה למתנה עם ההזמנה"),
    note: L("بعد الطلب، الزبون بيكتب رسالة للهدية؛ بتنحفظ مع رقم الطلب لتنطبع بالكرت.", "After ordering, a shopper writes a gift message; kept with the order's number to print on the card.", "אחרי ההזמנה, לקוח כותב הקדשה; נשמרת עם מספר ההזמנה להדפסה על הכרטיס."),
    tables: [table("gifts", "gift-messages", L("رسائل الهدايا", "Gift messages", "הקדשות"), [f.text("orderId", L("الطلب", "Order", "הזמנה"), { required: true }), f.text("to", L("لمين", "To", "אל")), f.long("message", L("الرسالة", "Message", "הודעה"), { required: true, max: 300 }), f.bool("printed", L("انطبعت", "Printed", "הודפס"), { default: false })], access("customer", "off"))],
    fns: [
      {
        key: "write",
        name: "رسالة هدية",
        inputs: [i.text("orderId", { required: true, max: 40 }), i.text("to", { max: 60 }), i.text("message", { required: true, min: 2, max: 300 })],
        on: on.call("gift-message", "customer", 5),
        do: [s.add("gifts", { orderId: "{{input.orderId}}", to: "{{input.to}}", message: "{{input.message}}" }, { owner: "{{caller}}" }), s.ret("حلو! الرسالة بتنطبع مع الهدية 🎁")],
      },
    ],
  }),
  fnEntry({
    key: "store-visit",
    category: "bookings",
    name: L("زيارة للمحل", "A visit to the shop", "ביקור בחנות"),
    note: L("الزبون بيحجز زيارة للمحل ليجرّب، لحد 4 زيارات بنفس الساعة.", "A shopper books a visit to try things on, up to 4 visits in the same hour.", "לקוח קובע ביקור כדי למדוד, עד 4 ביקורים באותה שעה."),
    tables: [table("visits", "store-visits", L("زيارات المحل", "Shop visits", "ביקורים בחנות"), [f.date("day", L("اليوم", "Day", "יום"), { required: true }), f.text("hour", L("الساعة", "Hour", "שעה"), { required: true }), f.text("name", L("الاسم", "Name", "שם")), f.phone("phone", L("التلفون", "Phone", "טלפון"))], access("customer", "off"))],
    fns: [
      {
        key: "book",
        name: "احجز زيارة",
        inputs: [i.text("day", { required: true, format: "date" }), i.text("hour", { required: true, choices: ["10:00", "12:00", "14:00", "16:00", "18:00"] }), i.phone("phone", { required: true })],
        on: on.call("visit-shop", "customer", 5),
        do: [s.find("visits", "same", [where("day", "is", "{{input.day}}"), where("hour", "is", "{{input.hour}}")], { limit: 10 }), s.when([cond("{{same.length}}", "gte", 4)], [s.stop("هالساعة مليانة، جرّب ساعة تانية")]), s.add("visits", { day: "{{input.day}}", hour: "{{input.hour}}", name: "{{caller.name}}", phone: "{{input.phone}}" }, { owner: "{{caller}}" }), s.ret("بنستناك {{input.day}} الساعة {{input.hour}} 🛍️")],
      },
    ],
  }),
  fnEntry({
    key: "affiliate-signup",
    category: "marketing",
    name: L("الانضمام كمسوّق", "Join as an affiliate", "הצטרפות כשותף שיווקי"),
    note: L("صاحب صفحة أو مؤثر بيطلب يصير مسوّق: بيستنى موافقتك، وبينحفظ رابط صفحته وعدد متابعينه.", "A page owner or influencer asks to become an affiliate: waits for your approval, with their page and followers kept.", "בעל עמוד או משפיען מבקש להיות שותף: ממתין לאישור, עם העמוד ומספר העוקבים."),
    tables: [table("affiliates", "affiliates", L("المسوّقين", "Affiliates", "שותפים"), [f.text("name", L("الاسم", "Name", "שם"), { required: true }), f.email("email", L("الإيميل", "Email", "מייל"), { required: true, unique: true }), f.link("page", L("صفحته", "Their page", "העמוד שלו")), f.number("followers", L("المتابعين", "Followers", "עוקבים")), f.select("status", L("الحالة", "Status", "סטטוס"), [["waiting", L("ناطر", "Waiting", "ממתין")], ["approved", L("موافق", "Approved", "אושר")], ["declined", L("مرفوض", "Declined", "נדחה")]], { default: "waiting" })])],
    fns: [
      {
        key: "apply",
        name: "طلب مسوّق",
        inputs: [i.text("name", { required: true, max: 80 }), i.email("email", { required: true }), i.text("page", { format: "url" }), i.num("followers", { min: 0 })],
        on: on.call("affiliate-apply", "public", 3),
        do: [s.find("affiliates", "found", [where("email", "is", "{{input.email}}")], { limit: 1 }), s.when([cond("{{found}}", "notEmpty")], [s.stop("في طلب من هالإيميل من قبل")]), s.add("affiliates", { name: "{{input.name}}", email: "{{input.email}}", page: "{{input.page}}", followers: "{{input.followers}}" }), s.bell("طلب مسوّق: {{input.name}}", "{{input.page}} · {{input.followers}} متابع"), s.ret("وصل طلبك، منرد عليك قريب.")],
      },
    ],
  }),
  fnEntry({
    key: "suggestion-box",
    category: "community",
    name: L("صندوق الاقتراحات", "A suggestion box", "תיבת הצעות"),
    note: L("الزبون بيقترح منتج أو فكرة؛ الاقتراحات بتبين للكل وبيصوّتوا عليها بزر.", "Shoppers suggest a product or an idea; suggestions show to everyone and get votes with a button.", "לקוחות מציעים מוצר או רעיון; ההצעות מוצגות לכולם ומקבלות הצבעות בכפתור."),
    tables: [table("ideas", "suggestions", L("الاقتراحات", "Suggestions", "הצעות"), [f.text("title", L("الاقتراح", "Suggestion", "הצעה"), { required: true }), f.long("details", L("التفاصيل", "Details", "פרטים")), f.number("votes", L("الأصوات", "Votes", "קולות"), { default: 0 })], access("public", "off"))],
    fns: [
      {
        key: "suggest",
        name: "اقترح",
        inputs: [i.text("title", { required: true, min: 3, max: 120 }), i.text("details", { max: 1000 })],
        on: on.call("suggest", "customer", 3),
        do: [s.add("ideas", { title: "{{input.title}}", details: "{{input.details}}" }, { owner: "{{caller}}", status: "PUBLISHED" }), s.ret("شكراً على اقتراحك 💡")],
      },
      {
        key: "upvote",
        name: "صوّت لاقتراح",
        inputs: [i.text("id", { required: true, max: 40 })],
        on: on.call("suggest-vote", "customer", 30),
        do: [s.get("ideas", "{{input.id}}", "idea"), s.set("n", "{{idea.votes}}"), s.set("n", 1, "add"), s.change("ideas", "{{input.id}}", { votes: "{{n}}" }), s.ret("{{n}}")],
      },
    ],
  }),
  fnEntry({
    key: "volunteer-signup",
    category: "community",
    name: L("التسجيل كمتطوّع", "Volunteer sign-up", "הרשמה להתנדבות"),
    note: L("للحملات والفعاليات: الاسم، الأيام اللي بيقدر فيها، وشو بيعرف يعمل.", "For campaigns and events: name, the days they can, and what they can do.", "לקמפיינים ואירועים: שם, הימים שאפשר, ומה יודעים לעשות."),
    tables: [table("volunteers", "volunteers", L("المتطوّعين", "Volunteers", "מתנדבים"), [f.text("name", L("الاسم", "Name", "שם"), { required: true }), f.phone("phone", L("التلفون", "Phone", "טלפון"), { required: true }), f.text("days", L("الأيام", "Days", "ימים")), f.long("skills", L("شو بيعرف", "Skills", "כישורים"))])],
    fns: [
      {
        key: "join",
        name: "تطوّع",
        inputs: [i.text("name", { required: true, max: 80 }), i.phone("phone", { required: true }), i.text("days", { max: 120 }), i.text("skills", { max: 600 })],
        on: on.call("volunteer", "public", 3),
        do: [s.add("volunteers", { name: "{{input.name}}", phone: "{{input.phone}}", days: "{{input.days}}", skills: "{{input.skills}}" }), s.whatsapp("شكراً {{input.name}} 💚 سجّلناك متطوّع، ومنتواصل معك.", "{{input.phone}}"), s.ret("سجّلناك! شكراً.")],
      },
    ],
  }),
];
