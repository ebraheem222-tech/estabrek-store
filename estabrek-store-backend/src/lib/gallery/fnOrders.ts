/**
 * Ready functions started by a new order (the store's event "order.created"): telling the shop and
 * the customer, keeping the order's numbers in a table of the owner's, and passing it to other systems.
 * What an order hands a function: ORDER_INPUTS (kit.ts).
 */
import { L, ORDER_INPUTS, cond, f, fnEntry, i, on, s, table, where, type GalleryEntry } from "./kit.js";

const ORDER_LINE = "طلب {{input.orderId}} من {{input.customerName}} ({{input.phone}}): {{input.total}} {{input.currency}}، {{input.items}} قطعة، {{input.city}}";

export const FN_ORDERS: GalleryEntry[] = [
  fnEntry({
    key: "order-alert-email",
    category: "orders",
    name: L("إيميل للمتجر مع كل طلب", "Email the shop on every order", "מייל לחנות על כל הזמנה"),
    note: L("أول ما ينعمل طلب، بيوصل إيميل لعنوان الطلبات بالإعدادات فيه كل التفاصيل.", "As soon as an order is placed, an email with its details goes to the orders address in the settings.", "ברגע שנוצרת הזמנה, נשלח מייל עם הפרטים לכתובת ההזמנות בהגדרות."),
    fns: [{ key: "alert", name: "إيميل طلب جديد", inputs: ORDER_INPUTS, on: on.order(), do: [s.email("طلب جديد {{input.orderId}}", ORDER_LINE)] }],
  }),
  fnEntry({
    key: "order-alert-whatsapp",
    category: "orders",
    name: L("واتساب للمتجر مع كل طلب", "WhatsApp the shop on every order", "וואטסאפ לחנות על כל הזמנה"),
    note: L("رسالة واتساب لرقم المتجر بكل طلب جديد.", "A WhatsApp message to the shop's number on every new order.", "הודעת וואטסאפ למספר החנות על כל הזמנה חדשה."),
    fns: [{ key: "alert", name: "واتساب طلب جديد", inputs: ORDER_INPUTS, on: on.order(), do: [s.whatsapp(ORDER_LINE)] }],
  }),
  fnEntry({
    key: "order-alert-sms",
    category: "orders",
    name: L("SMS للمتجر مع كل طلب", "Text the shop on every order", "SMS לחנות על כל הזמנה"),
    note: L("رسالة قصيرة لتلفون المتجر بكل طلب.", "A short text to the shop's phone on every order.", "הודעה קצרה לטלפון החנות על כל הזמנה."),
    fns: [{ key: "alert", name: "SMS طلب جديد", inputs: ORDER_INPUTS, on: on.order(), do: [s.sms("طلب جديد {{input.orderId}}: {{input.total}} {{input.currency}}")] }],
  }),
  fnEntry({
    key: "order-alert-bell",
    category: "orders",
    name: L("جرس بالإدارة مع كل طلب", "A bell in the admin on every order", "פעמון בניהול על כל הזמנה"),
    note: L("تنبيه بجرس لوحة الإدارة مع رابط لصفحة الطلبات.", "A notice in the admin's bell with a link to the orders.", "התראה בפעמון של הניהול עם קישור להזמנות."),
    fns: [{ key: "alert", name: "جرس طلب جديد", inputs: ORDER_INPUTS, on: on.order(), do: [s.bell("طلب جديد {{input.orderId}}", ORDER_LINE, "/admin/orders")] }],
  }),
  fnEntry({
    key: "big-order-alert",
    category: "orders",
    name: L("تنبيه للطلبات الكبيرة", "Alert on big orders", "התראה על הזמנות גדולות"),
    note: L("طلب فوق 500 بيرن الجرس وبيبعت واتساب، لتتابعه بنفسك.", "An order over 500 rings the bell and sends a WhatsApp, so you look after it yourself.", "הזמנה מעל 500 מצלצלת בפעמון ושולחת וואטסאפ, כדי לטפל בה אישית."),
    fns: [
      {
        key: "alert",
        name: "طلب كبير",
        inputs: ORDER_INPUTS,
        on: on.order(),
        do: [s.when([cond("{{input.total}}", "gte", 500)], [s.bell("طلب كبير: {{input.total}} {{input.currency}}", ORDER_LINE, "/admin/orders"), s.whatsapp("طلب كبير وصل! " + ORDER_LINE)])],
      },
    ],
  }),
  fnEntry({
    key: "order-thanks-whatsapp",
    category: "customers",
    name: L("شكر للزبون على واتساب", "Thank the customer on WhatsApp", "תודה ללקוח בוואטסאפ"),
    note: L("بعد كل طلب، رسالة شكر لرقم الزبون نفسه مع رقم الطلب.", "After each order, a thank-you message to the customer's own number with the order's number.", "אחרי כל הזמנה, הודעת תודה למספר של הלקוח עם מספר ההזמנה."),
    fns: [{ key: "thanks", name: "شكر على الطلب", inputs: ORDER_INPUTS, on: on.order(), do: [s.when([cond("{{input.phone}}", "notEmpty")], [s.whatsapp("أهلا {{input.customerName}} 🌸 وصلنا طلبك {{input.orderId}} وعم نجهّزه. شكراً إنك اخترتنا!", "{{input.phone}}")])] }],
  }),
  fnEntry({
    key: "order-log",
    category: "reports",
    name: L("سجل الطلبات بجدول", "An order log in a table", "יומן הזמנות בטבלה"),
    note: L("كل طلب بينكتب سطر بجدول «سجل الطلبات»: بتفلتر وبتصدّر لـ Excel متل ما بدك.", "Each order is written as a row of an «Order log» table: filter it and export it to Excel as you like.", "כל הזמנה נכתבת כשורה בטבלת «יומן הזמנות»: מסננים ומייצאים לאקסל כרצונכם."),
    tables: [table("log", "order-log", L("سجل الطلبات", "Order log", "יומן הזמנות"), [f.text("orderId", L("رقم الطلب", "Order", "הזמנה"), { required: true, unique: true }), f.text("customer", L("الزبون", "Customer", "לקוח")), f.phone("phone", L("التلفون", "Phone", "טלפון")), f.money("total", L("المبلغ", "Total", "סכום")), f.number("items", L("القطع", "Items", "פריטים")), f.text("city", L("المدينة", "City", "עיר"))])],
    fns: [{ key: "log", name: "سجّل الطلب", inputs: ORDER_INPUTS, on: on.order(), do: [s.add("log", { orderId: "{{input.orderId}}", customer: "{{input.customerName}}", phone: "{{input.phone}}", total: "{{input.total}}", items: "{{input.items}}", city: "{{input.city}}" }, { status: "PUBLISHED" })] }],
  }),
  fnEntry({
    key: "orders-by-city",
    category: "reports",
    name: L("عدّاد الطلبات لكل مدينة", "Orders counted per city", "ספירת הזמנות לפי עיר"),
    note: L("جدول فيه سطر لكل مدينة: كم طلب وكم مبلغ. بتعرف من وين زباينك.", "A table with a row per city: how many orders and how much. Know where your customers are.", "טבלה עם שורה לכל עיר: כמה הזמנות וכמה כסף. לדעת מאיפה הלקוחות."),
    tables: [table("cities", "orders-by-city", L("الطلبات حسب المدينة", "Orders by city", "הזמנות לפי עיר"), [f.text("city", L("المدينة", "City", "עיר"), { required: true, unique: true }), f.number("orders", L("الطلبات", "Orders", "הזמנות"), { default: 0 }), f.money("total", L("المجموع", "Total", "סה״כ"), { default: 0 })])],
    fns: [
      {
        key: "count",
        name: "عدّ الطلب لمدينته",
        inputs: ORDER_INPUTS,
        on: on.order(),
        do: [
          s.when([cond("{{input.city}}", "empty")], [s.stop("طلب بدون مدينة")]),
          s.find("cities", "found", [where("city", "is", "{{input.city}}")], { limit: 1 }),
          s.when(
            [cond("{{found}}", "empty")],
            [s.add("cities", { city: "{{input.city}}", orders: 1, total: "{{input.total}}" }, { status: "PUBLISHED" })],
            [s.set("orders", "{{found.0.orders}}"), s.set("orders", 1, "add"), s.set("sum", "{{found.0.total}}"), s.set("sum", "{{input.total}}", "add"), s.change("cities", "{{found.0.id}}", { orders: "{{orders}}", total: "{{sum}}" })],
          ),
        ],
      },
    ],
  }),
  fnEntry({
    key: "order-to-telegram",
    category: "integrations",
    name: L("الطلبات على تلغرام", "Orders on Telegram", "הזמנות בטלגרם"),
    note: L("كل طلب بيوصل رسالة لمجموعة تلغرام تبع الفريق. بتوصل تلغرام مرة وحدة من «الاتصالات والأسرار» وبتختاره بالخطوة.", "Each order reaches your team's Telegram group. Connect Telegram once in “Connections and secrets” and pick it in the step.", "כל הזמנה מגיעה לקבוצת הטלגרם של הצוות. מחברים טלגרם פעם אחת ב«חיבורים וסודות» ובוחרים אותו בשלב."),
    fns: [{ key: "send", name: "طلب على تلغرام", inputs: ORDER_INPUTS, on: on.order(), do: [s.ready("message", { text: "🛍️ " + ORDER_LINE })] }],
  }),
  fnEntry({
    key: "order-to-slack",
    category: "integrations",
    name: L("الطلبات على Slack", "Orders on Slack", "הזמנות בסלאק"),
    note: L("كل طلب برسالة لقناة Slack. بتوصل Slack مرة وحدة وبتختاره بالخطوة.", "Each order as a message in a Slack channel. Connect Slack once and pick it in the step.", "כל הזמנה כהודעה בערוץ סלאק. מחברים סלאק פעם אחת ובוחרים אותו בשלב."),
    fns: [{ key: "send", name: "طلب على Slack", inputs: ORDER_INPUTS, on: on.order(), do: [s.ready("message", { text: ":shopping_bags: " + ORDER_LINE })] }],
  }),
  fnEntry({
    key: "order-to-sheet",
    category: "integrations",
    name: L("الطلبات بـ Google Sheets", "Orders into Google Sheets", "הזמנות ל-Google Sheets"),
    note: L("كل طلب سطر جديد بشيت إلك. بتوصل حساب خدمة Google مرة وحدة وبتختار الشيت.", "Each order is a new row in a sheet of yours. Connect a Google service account once and pick the sheet.", "כל הזמנה היא שורה חדשה בגיליון שלכם. מחברים חשבון שירות של Google פעם אחת ובוחרים את הגיליון."),
    fns: [{ key: "append", name: "طلب لشيت", inputs: ORDER_INPUTS, on: on.order(), do: [s.ready("append", { cells: '["{{input.orderId}}","{{input.customerName}}","{{input.phone}}",{{input.total}},{{input.items}},"{{input.city}}","{{now}}"]' })] }],
  }),
  fnEntry({
    key: "order-to-erp",
    category: "integrations",
    name: L("الطلب لنظام الحسابات (ERP)", "Send the order to your ERP", "שליחת ההזמנה ל-ERP"),
    note: L("بيبعت الطلب لعنوان نظامك بمفتاحه (سر اسمه ERP_KEY). بتسمح بالموقع وبتحط المفتاح من «الاتصالات والأسرار».", "Sends the order to your system's address with its key (a secret named ERP_KEY). Allow the site and keep the key in “Connections and secrets”.", "שולח את ההזמנה לכתובת המערכת שלכם עם המפתח שלה (סוד בשם ERP_KEY). מאשרים את האתר ושומרים את המפתח ב«חיבורים וסודות»."),
    fns: [
      {
        key: "send",
        name: "طلب لنظام الحسابات",
        inputs: ORDER_INPUTS,
        on: on.order(),
        do: [s.http("POST", "https://erp.example.com/api/orders", { headers: { Authorization: "Bearer {{secret.ERP_KEY}}" }, body: { number: "{{input.orderId}}", customer: "{{input.customerName}}", phone: "{{input.phone}}", total: "{{input.total}}", currency: "{{input.currency}}", city: "{{input.city}}" }, as: "sent" })],
        fail: [s.bell("الطلب {{input.orderId}} ما وصل لنظام الحسابات", "{{error}}")],
      },
    ],
  }),
  fnEntry({
    key: "night-order-alert",
    category: "orders",
    name: L("طلب بالليل؟ خبّرني الصبح", "Night orders: tell me in the morning", "הזמנה בלילה? לספר לי בבוקר"),
    note: L("طلب بين 11 بالليل و7 الصبح ما بيزعجك: بينحط بقائمة «طلبات الليل» وبيوصلك ملخص الساعة 8.", "An order between 11 pm and 7 am doesn't wake you: it goes on a «Night orders» list and a summary reaches you at 8.", "הזמנה בין 23:00 ל-07:00 לא מעירה אתכם: היא נכנסת לרשימת «הזמנות לילה» וסיכום מגיע ב-8."),
    tables: [table("night", "night-orders", L("طلبات الليل", "Night orders", "הזמנות לילה"), [f.text("orderId", L("الطلب", "Order", "הזמנה"), { required: true }), f.money("total", L("المبلغ", "Total", "סכום")), f.bool("told", L("انقال", "Told", "דווח"), { default: false })])],
    fns: [
      {
        key: "keep",
        name: "طلب بالليل",
        inputs: ORDER_INPUTS,
        on: on.order(),
        do: [
          s.code("const h = (new Date().getUTCHours() + 2) % 24; return h >= 23 || h < 7;", {}, "night"),
          s.when([cond("{{night}}", "eq", true)], [s.add("night", { orderId: "{{input.orderId}}", total: "{{input.total}}" })], [s.whatsapp(ORDER_LINE)]),
        ],
      },
      {
        key: "morning",
        name: "ملخص طلبات الليل",
        inputs: [i.text("at")],
        on: on.daily("08:00"),
        do: [
          s.find("night", "orders", [where("told", "isFalse")], { limit: 100 }),
          s.when([cond("{{orders}}", "notEmpty")], [s.whatsapp("صباح الخير ☀️ إجاك {{orders.length}} طلب بالليل."), s.each("{{orders}}", "o", [s.change("night", "{{o.id}}", { told: true })])]),
        ],
      },
    ],
  }),
  fnEntry({
    key: "many-items-alert",
    category: "orders",
    name: L("طلب فيه قطع كتير", "An order with many items", "הזמנה עם הרבה פריטים"),
    note: L("طلب فيه 5 قطع وأكتر بيرن الجرس لتنتبه للتغليف.", "An order with 5 items or more rings the bell so packing gets attention.", "הזמנה עם 5 פריטים ומעלה מצלצלת כדי לשים לב לאריזה."),
    fns: [{ key: "alert", name: "طلب فيه قطع كتير", inputs: ORDER_INPUTS, on: on.order(), do: [s.when([cond("{{input.items}}", "gte", 5)], [s.bell("انتبه للتغليف: {{input.items}} قطع بالطلب {{input.orderId}}", undefined, "/admin/orders")])] }],
  }),
  fnEntry({
    key: "first-order-from-city",
    category: "marketing",
    name: L("أول طلب من مدينة جديدة", "First order from a new city", "הזמנה ראשונה מעיר חדשה"),
    note: L("بيقلك لما يوصل أول طلب من مدينة ما بعتّلها قبل، وبيحفظ قائمة مدنك.", "Tells you when the first order arrives from a city you never shipped to, and keeps your cities' list.", "מודיע כשמגיעה הזמנה ראשונה מעיר שלא שלחתם אליה, ושומר את רשימת הערים."),
    tables: [table("cities", "shipped-cities", L("المدن اللي بعتنالها", "Cities we ship to", "ערים ששלחנו אליהן"), [f.text("city", L("المدينة", "City", "עיר"), { required: true, unique: true }), f.text("firstOrder", L("أول طلب", "First order", "הזמנה ראשונה"))])],
    fns: [
      {
        key: "check",
        name: "مدينة جديدة؟",
        inputs: ORDER_INPUTS,
        on: on.order(),
        do: [s.when([cond("{{input.city}}", "empty")], [s.stop("طلب بدون مدينة")]), s.find("cities", "known", [where("city", "is", "{{input.city}}")], { limit: 1 }), s.when([cond("{{known}}", "empty"), cond("{{input.city}}", "notEmpty")], [s.add("cities", { city: "{{input.city}}", firstOrder: "{{input.orderId}}" }), s.bell("🎉 أول طلب من {{input.city}}", ORDER_LINE)])],
      },
    ],
  }),
  fnEntry({
    key: "customer-spend-vip",
    category: "customers",
    name: L("زباين VIP حسب الصرف", "VIP customers by spend", "לקוחות VIP לפי הוצאה"),
    note: L("بيجمع صرف كل زبون حسب رقمه، ولما يتعدّى 1000 بيصير VIP وبيوصلك تنبيه.", "Adds up each customer's spending by phone; past 1000 they become VIP and you're told.", "סוכם את ההוצאה של כל לקוח לפי טלפון; מעל 1000 הוא הופך ל-VIP ומקבלים התראה."),
    tables: [table("spend", "customer-spend", L("صرف الزباين", "Customer spend", "הוצאת לקוחות"), [f.phone("phone", L("التلفون", "Phone", "טלפון"), { required: true, unique: true }), f.text("name", L("الاسم", "Name", "שם")), f.money("spent", L("صرف لهلأ", "Spent so far", "הוצאה עד כה"), { default: 0 }), f.number("orders", L("طلبات", "Orders", "הזמנות"), { default: 0 }), f.bool("vip", L("VIP", "VIP", "VIP"), { default: false })])],
    fns: [
      {
        key: "add",
        name: "اجمع صرف الزبون",
        inputs: ORDER_INPUTS,
        on: on.order(),
        do: [
          s.when([cond("{{input.phone}}", "empty")], [s.stop("طلب بدون رقم تلفون")]),
          s.find("spend", "found", [where("phone", "is", "{{input.phone}}")], { limit: 1 }),
          s.when(
            [cond("{{found}}", "empty")],
            [s.add("spend", { phone: "{{input.phone}}", name: "{{input.customerName}}", spent: "{{input.total}}", orders: 1 }, { as: "row" }), s.set("spent", "{{input.total}}"), s.set("wasVip", false)],
            [s.set("spent", "{{found.0.spent}}"), s.set("spent", "{{input.total}}", "add"), s.set("count", "{{found.0.orders}}"), s.set("count", 1, "add"), s.set("wasVip", "{{found.0.vip}}"), s.change("spend", "{{found.0.id}}", { spent: "{{spent}}", orders: "{{count}}", name: "{{input.customerName}}" })],
          ),
          s.when([cond("{{spent}}", "gte", 1000), cond("{{wasVip}}", "ne", true)], [s.find("spend", "me", [where("phone", "is", "{{input.phone}}")], { limit: 1 }), s.change("spend", "{{me.0.id}}", { vip: true }), s.bell("⭐ زبون VIP جديد: {{input.customerName}}", "صرف لهلأ {{spent}}")]),
        ],
      },
    ],
  }),
  fnEntry({
    key: "order-points",
    category: "marketing",
    name: L("نقاط على كل طلب", "Points on every order", "נקודות על כל הזמנה"),
    note: L("نقطة على كل 10 من المبلغ، محفوظة حسب رقم التلفون، وبتوصل الزبون رسالة برصيده.", "A point per 10 spent, kept by phone number, and the customer gets a message with their balance.", "נקודה על כל 10 שהוצאו, לפי מספר טלפון, והלקוח מקבל הודעה עם היתרה."),
    tables: [table("points", "phone-points", L("نقاط الزباين", "Customer points", "נקודות לקוחות"), [f.phone("phone", L("التلفون", "Phone", "טלפון"), { required: true, unique: true }), f.number("points", L("النقاط", "Points", "נקודות"), { default: 0 })])],
    fns: [
      {
        key: "earn",
        name: "نقاط على الطلب",
        inputs: ORDER_INPUTS,
        on: on.order(),
        do: [
          s.code("return Math.floor(Number(input.total || 0) / 10);", { total: "{{input.total}}" }, "earned"),
          s.when([cond("{{earned}}", "lte", 0)], [s.stop("طلب صغير: ما في نقاط")]),
          s.when([cond("{{input.phone}}", "empty")], [s.stop("طلب بدون رقم تلفون")]),
          s.find("points", "found", [where("phone", "is", "{{input.phone}}")], { limit: 1 }),
          s.when([cond("{{found}}", "empty")], [s.add("points", { phone: "{{input.phone}}", points: "{{earned}}" }), s.set("balance", "{{earned}}")], [s.set("balance", "{{found.0.points}}"), s.set("balance", "{{earned}}", "add"), s.change("points", "{{found.0.id}}", { points: "{{balance}}" })]),
          s.whatsapp("ربحت {{earned}} نقطة على طلبك 🎁 رصيدك صار {{balance}} نقطة.", "{{input.phone}}"),
        ],
      },
    ],
  }),
  fnEntry({
    key: "daily-sales-goal",
    category: "reports",
    name: L("هدف مبيعات اليوم", "Today's sales goal", "יעד מכירות יומי"),
    note: L("بيجمع مبيعات كل يوم بجدول، ولما توصل الهدف (2000) بيوصلك تنبيه مرة وحدة.", "Adds up each day's sales in a table, and once the goal (2000) is reached you're told, once.", "סוכם את המכירות של כל יום בטבלה, וכשמגיעים ליעד (2000) מקבלים התראה פעם אחת."),
    tables: [table("days", "daily-sales", L("مبيعات الأيام", "Daily sales", "מכירות יומיות"), [f.date("day", L("اليوم", "Day", "יום"), { required: true, unique: true }), f.money("total", L("المبيعات", "Sales", "מכירות"), { default: 0 }), f.number("orders", L("الطلبات", "Orders", "הזמנות"), { default: 0 }), f.bool("reached", L("وصل الهدف", "Goal reached", "יעד הושג"), { default: false })])],
    fns: [
      {
        key: "add",
        name: "اجمع مبيعات اليوم",
        inputs: ORDER_INPUTS,
        on: on.order(),
        do: [
          s.code("return new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);", {}, "today"),
          s.find("days", "found", [where("day", "is", "{{today}}")], { limit: 1 }),
          s.when([cond("{{found}}", "empty")], [s.add("days", { day: "{{today}}", total: "{{input.total}}", orders: 1 }), s.set("sum", "{{input.total}}"), s.set("reached", false)], [s.set("sum", "{{found.0.total}}"), s.set("sum", "{{input.total}}", "add"), s.set("count", "{{found.0.orders}}"), s.set("count", 1, "add"), s.set("reached", "{{found.0.reached}}"), s.change("days", "{{found.0.id}}", { total: "{{sum}}", orders: "{{count}}" })]),
          s.when([cond("{{sum}}", "gte", 2000), cond("{{reached}}", "ne", true)], [s.find("days", "me", [where("day", "is", "{{today}}")], { limit: 1 }), s.change("days", "{{me.0.id}}", { reached: true }), s.bell("🎯 وصلت هدف اليوم: {{sum}}")]),
        ],
      },
    ],
  }),
  fnEntry({
    key: "order-check-before-shipping",
    category: "orders",
    name: L("طلب بدّه فحص قبل الشحن", "Orders to check before shipping", "הזמנות לבדיקה לפני משלוח"),
    note: L("طلب كبير كتير أو فيه قطع كتير بينحط بقائمة «للفحص» وبيرن الجرس، قبل ما يطلع.", "A very large order, or one with very many items, goes on a «to check» list and rings the bell before it ships.", "הזמנה גדולה מאוד, או עם הרבה מאוד פריטים, נכנסת לרשימת «לבדיקה» ומצלצלת לפני המשלוח."),
    tables: [table("check", "orders-to-check", L("طلبات للفحص", "Orders to check", "הזמנות לבדיקה"), [f.text("orderId", L("الطلب", "Order", "הזמנה"), { required: true }), f.text("why", L("ليش", "Why", "למה")), f.select("state", L("الحالة", "State", "מצב"), [["waiting", L("ناطر", "Waiting", "ממתין")], ["ok", L("تمام", "Fine", "תקין")], ["stopped", L("موقّف", "Stopped", "נעצר")]], { default: "waiting" })])],
    fns: [
      {
        key: "check",
        name: "افحص الطلب",
        inputs: ORDER_INPUTS,
        on: on.order(),
        do: [s.when([cond("{{input.total}}", "gte", 2000), cond("{{input.items}}", "gte", 10)], [s.add("check", { orderId: "{{input.orderId}}", why: "{{input.total}} {{input.currency}} · {{input.items}} قطع" }), s.bell("افحص الطلب {{input.orderId}} قبل الشحن", ORDER_LINE, "/admin/orders")], undefined, "any")],
      },
    ],
  }),
  fnEntry({
    key: "delivery-zone",
    category: "operations",
    name: L("منطقة التوصيل لكل طلب", "A delivery zone for each order", "אזור משלוח לכל הזמנה"),
    note: L("بيعرف منطقة التوصيل من المدينة وبيحط الطلب بخطة التوصيل، لتوزّع على السوّاقين.", "Finds the delivery zone from the city and puts the order on the delivery plan, to split between drivers.", "מזהה את אזור המשלוח לפי העיר ומכניס את ההזמנה לתוכנית המשלוחים, לחלוקה בין נהגים."),
    tables: [table("plan", "delivery-plan", L("خطة التوصيل", "Delivery plan", "תוכנית משלוחים"), [f.text("orderId", L("الطلب", "Order", "הזמנה"), { required: true }), f.text("city", L("المدينة", "City", "עיר")), f.select("zone", L("المنطقة", "Zone", "אזור"), [["north", L("شمال", "North", "צפון")], ["center", L("وسط", "Center", "מרכז")], ["south", L("جنوب", "South", "דרום")], ["other", L("غير", "Other", "אחר")]]), f.phone("phone", L("التلفون", "Phone", "טלפון"))])],
    fns: [
      {
        key: "zone",
        name: "منطقة التوصيل",
        inputs: ORDER_INPUTS,
        on: on.order(),
        do: [
          s.code(
            "const c = String(input.city || '').trim(); const zones = { north: ['جنين','نابلس','طولكرم','قلقيلية','طوباس'], center: ['رام الله','البيرة','القدس','أريحا','بيت لحم'], south: ['الخليل','دورا','يطا','حلحول'] }; for (const z in zones) if (zones[z].some((n) => c.includes(n))) return z; return 'other';",
            { city: "{{input.city}}" },
            "zone",
          ),
          s.add("plan", { orderId: "{{input.orderId}}", city: "{{input.city}}", zone: "{{zone}}", phone: "{{input.phone}}" }),
        ],
      },
    ],
  }),
  fnEntry({
    key: "review-request-later",
    category: "marketing",
    name: L("طلب تقييم بعد 3 أيام", "Ask for a review 3 days later", "בקשת חוות דעת אחרי 3 ימים"),
    note: L("الطلب بيتسجّل، وبعد 3 أيام بتروح للزبون رسالة واتساب بتطلب تقييمه، مرة وحدة.", "The order is noted, and 3 days later a WhatsApp message asks the customer for a review, once.", "ההזמנה נרשמת, ואחרי 3 ימים נשלחת ללקוח הודעת וואטסאפ שמבקשת חוות דעת, פעם אחת."),
    tables: [table("ask", "review-requests", L("طلبات التقييم", "Review requests", "בקשות חוות דעת"), [f.text("orderId", L("الطلب", "Order", "הזמנה"), { required: true }), f.text("name", L("الزبون", "Customer", "לקוח")), f.phone("phone", L("التلفون", "Phone", "טלפון")), f.date("due", L("موعد الرسالة", "Due", "מועד")), f.bool("sent", L("انبعتت", "Sent", "נשלחה"), { default: false })])],
    fns: [
      {
        key: "note",
        name: "سجّل لطلب التقييم",
        inputs: ORDER_INPUTS,
        on: on.order(),
        do: [s.code("return new Date(Date.now() + 3 * 86400e3).toISOString().slice(0, 10);", {}, "due"), s.add("ask", { orderId: "{{input.orderId}}", name: "{{input.customerName}}", phone: "{{input.phone}}", due: "{{due}}" })],
      },
      {
        key: "send",
        name: "ابعت طلبات التقييم",
        inputs: [i.text("at")],
        on: on.daily("11:00"),
        do: [
          s.code("return new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);", {}, "today"),
          s.find("ask", "due", [where("sent", "isFalse"), where("due", "lte", "{{today}}"), where("phone", "notEmpty")], { limit: 20 }),
          s.each("{{due}}", "r", [s.whatsapp("أهلا {{r.name}} 🌸 كيف لقيت طلبك {{r.orderId}}؟ رأيك بيفرق معنا كتير.", "{{r.phone}}"), s.change("ask", "{{r.id}}", { sent: true })]),
        ],
      },
    ],
  }),
  fnEntry({
    key: "order-gift-wrap-note",
    category: "orders",
    name: L("تذكير تغليف الهدايا", "Gift-wrap reminder", "תזכורת עטיפת מתנה"),
    note: L("قبل الأعياد: كل طلب بيرن الجرس بتذكير تسأل الزبون إذا بدّه تغليف هدية. شغّلها بالمواسم ووقّفها بعدين.", "Before holidays: each order rings a reminder to ask the customer about gift wrapping. Switch it on in season, off after.", "לפני חגים: כל הזמנה מצלצלת בתזכורת לשאול את הלקוח על עטיפת מתנה. מפעילים בעונה ומכבים אחרי."),
    fns: [{ key: "remind", name: "تذكير التغليف", inputs: ORDER_INPUTS, on: on.order(), do: [s.bell("اسأل {{input.customerName}} عن تغليف هدية", "الطلب {{input.orderId}} · {{input.phone}}", "/admin/orders")] }],
  }),
  fnEntry({
    key: "order-city-whatsapp-courier",
    category: "operations",
    name: L("الطلب لسوّاق المنطقة", "The order to the area's courier", "ההזמנה לשליח האזור"),
    note: L("جدول فيه سوّاق لكل مدينة؛ كل طلب بيوصل لسوّاق مدينته على واتساب.", "A table with a courier per city; each order reaches its city's courier on WhatsApp.", "טבלה עם שליח לכל עיר; כל הזמנה מגיעה לשליח של העיר בוואטסאפ."),
    tables: [table("couriers", "couriers", L("السوّاقين", "Couriers", "שליחים"), [f.text("city", L("المدينة", "City", "עיר"), { required: true, unique: true }), f.text("name", L("السوّاق", "Courier", "שליח")), f.phone("phone", L("تلفونه", "Phone", "טלפון"), { required: true })])],
    fns: [
      {
        key: "send",
        name: "للسوّاق",
        inputs: ORDER_INPUTS,
        on: on.order(),
        do: [s.when([cond("{{input.city}}", "empty")], [s.bell("طلب بدون مدينة: {{input.orderId}}")]), s.when([cond("{{input.city}}", "empty")], [s.stop("طلب بدون مدينة")]), s.find("couriers", "c", [where("city", "is", "{{input.city}}")], { limit: 1 }), s.when([cond("{{c}}", "empty")], [s.bell("ما في سوّاق لـ {{input.city}}", ORDER_LINE)], [s.whatsapp("طلب جديد إلك 🚚 " + ORDER_LINE, "{{c.0.phone}}")])],
      },
    ],
  }),
  fnEntry({
    key: "repeat-customer-thanks",
    category: "customers",
    name: L("شكر خاص للزبون اللي رجع", "A special thanks to returning customers", "תודה מיוחדת ללקוח שחוזר"),
    note: L("بيعرف الزبون من رقمه: من تاني طلب وطالع بتوصله رسالة شكر مختلفة مع رقم طلبه كم.", "Knows the customer by phone: from the second order on they get a different thank-you with which order it is.", "מזהה את הלקוח לפי הטלפון: מההזמנה השנייה והלאה הוא מקבל תודה אחרת עם מספר ההזמנה שלו."),
    tables: [table("seen", "returning-customers", L("الزباين اللي رجعوا", "Returning customers", "לקוחות חוזרים"), [f.phone("phone", L("التلفون", "Phone", "טלפון"), { required: true, unique: true }), f.number("orders", L("طلبات", "Orders", "הזמנות"), { default: 0 })])],
    fns: [
      {
        key: "thanks",
        name: "شكر للزبون اللي رجع",
        inputs: ORDER_INPUTS,
        on: on.order(),
        do: [
          s.when([cond("{{input.phone}}", "empty")], [s.stop("طلب بدون رقم تلفون")]),
          s.find("seen", "found", [where("phone", "is", "{{input.phone}}")], { limit: 1 }),
          s.when([cond("{{found}}", "empty")], [s.add("seen", { phone: "{{input.phone}}", orders: 1 })], [s.set("n", "{{found.0.orders}}"), s.set("n", 1, "add"), s.change("seen", "{{found.0.id}}", { orders: "{{n}}" }), s.whatsapp("{{input.customerName}}، هاد طلبك رقم {{n}} عنا 💛 شكراً إنك رجعت!", "{{input.phone}}")]),
        ],
      },
    ],
  }),
  fnEntry({
    key: "free-shipping-nudge",
    category: "marketing",
    name: L("كم ناقص للتوصيل المجاني", "How far from free shipping", "כמה חסר למשלוח חינם"),
    note: L("طلب قريب من حد التوصيل المجاني بيسجّل الفرق، لتعرف إذا الحد مناسب.", "An order close to the free-shipping line notes the gap, so you can tell if the line is right.", "הזמנה קרובה לרף המשלוח החינמי רושמת את הפער, כדי לדעת אם הרף מתאים."),
    tables: [table("near", "free-shipping-near", L("قريبة من التوصيل المجاني", "Near free shipping", "קרוב למשלוח חינם"), [f.text("orderId", L("الطلب", "Order", "הזמנה")), f.money("total", L("المبلغ", "Total", "סכום")), f.money("gap", L("الفرق", "Gap", "פער"))])],
    fns: [
      {
        key: "note",
        name: "قريب من المجاني",
        inputs: ORDER_INPUTS,
        on: on.order(),
        do: [s.code("const line = 300; const t = Number(input.total || 0); return t < line && t >= line * 0.8 ? line - t : 0;", { total: "{{input.total}}" }, "gap"), s.when([cond("{{gap}}", "gt", 0)], [s.add("near", { orderId: "{{input.orderId}}", total: "{{input.total}}", gap: "{{gap}}" })])],
      },
    ],
  }),
];
