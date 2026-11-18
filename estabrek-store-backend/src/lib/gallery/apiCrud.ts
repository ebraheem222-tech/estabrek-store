/**
 * Ready APIs, part 1: a whole REST resource over one table (an address of the store's own for each
 * job: list, one, add, replace, delete), for an app, a partner or another system. Reading is open to
 * anyone, a signed-in shopper or a key, as each says; writing needs a key, or is the shopper's own.
 * Every address is under /v1/api.
 */
import { L, apiEntry, cond, f, i, on, s, table, where, type Category, type GalleryEntry } from "./kit.js";

type Field = ReturnType<typeof f.text>;
type Input = ReturnType<typeof i.text>;
type Who = "public" | "key" | "customer";

/** A field as the address takes it: words and choices as text, numbers as numbers, yes/no as yes/no. */
function inputOf(fl: Field, required: boolean): Input {
  const req = required && fl.required === true ? { required: true } : {};
  switch (fl.type) {
    case "number":
    case "money":
      return i.num(fl.id, { ...req, ...(typeof fl.min === "number" ? { min: fl.min } : {}), ...(typeof fl.max === "number" ? { max: fl.max } : {}) });
    case "boolean":
      return i.bool(fl.id, req);
    case "email":
      return i.email(fl.id, req);
    case "phone":
      return i.phone(fl.id, req);
    case "date":
      return i.text(fl.id, { ...req, format: "date" });
    case "link":
      return i.text(fl.id, { ...req, format: "url" });
    case "select":
      return i.text(fl.id, { ...req, choices: (fl.options as Array<{ id: string }>).map((o) => o.id) });
    default:
      return i.text(fl.id, { ...req, max: fl.type === "longText" ? 5000 : 300 });
  }
}

/**
 * A resource: `base` is its address (and its table's), `fields` its table's, `search` the field `?q=`
 * looks in. `read` and `write` say who may.
 */
function crud(o: { key: string; category: Category; name: ReturnType<typeof L>; note: ReturnType<typeof L>; base: string; table: ReturnType<typeof L>; fields: Field[]; search: string; read: Who; write: Exclude<Who, "public"> }): GalleryEntry {
  const own = o.write === "customer";
  const values = Object.fromEntries(o.fields.map((fl) => [fl.id, `{{input.${fl.id}}}`]));
  return apiEntry({
    key: o.key,
    category: o.category,
    name: o.name,
    note: o.note,
    tables: [table("items", o.base, o.table, o.fields)],
    fns: [
      { key: "list", name: `GET ${o.base}`, inputs: [i.text("q", { max: 100 })], on: on.route("GET", o.base, o.read, { perMinute: 120 }), do: [s.when([cond("{{input.q}}", "empty")], [s.find("items", "rows", [], { limit: 100, sort: [{ field: "$createdAt", dir: "desc" }] })], [s.find("items", "rows", [where(o.search, "contains", "{{input.q}}")], { limit: 100, sort: [{ field: "$createdAt", dir: "desc" }] })]), s.ret("{{rows}}")] },
      { key: "one", name: `GET ${o.base}/:id`, inputs: [i.text("id", { required: true, max: 40 })], on: on.route("GET", `${o.base}/:id`, o.read, { perMinute: 120 }), do: [s.get("items", "{{input.id}}", "row"), s.ret("{{row}}")] },
      { key: "add", name: `POST ${o.base}`, inputs: o.fields.map((fl) => inputOf(fl, true)), on: on.route("POST", o.base, o.write, { status: 201, perMinute: 60 }), do: [s.add("items", values, { as: "row", status: "PUBLISHED", ...(own ? { owner: "{{caller}}" } : {}) }), s.ret("{{row}}")] },
      { key: "replace", name: `PUT ${o.base}/:id`, inputs: [i.text("id", { required: true, max: 40 }), ...o.fields.map((fl) => inputOf(fl, true))], on: on.route("PUT", `${o.base}/:id`, o.write, { perMinute: 60 }), do: [s.change("items", "{{input.id}}", values, { as: "row" }), s.ret("{{row}}")] },
      { key: "remove", name: `DELETE ${o.base}/:id`, inputs: [i.text("id", { required: true, max: 40 })], on: on.route("DELETE", `${o.base}/:id`, o.write, { perMinute: 60 }), do: [s.del("items", "{{input.id}}"), s.ret({ deleted: "{{input.id}}" })] },
    ],
  });
}

const N = (ar: string, en: string, he: string) => L(ar, en, he);
const crudNote = (what: ReturnType<typeof L>, who: ReturnType<typeof L>) =>
  L(`${what.ar}: خمس عناوين جاهزة (قائمة مع بحث، واحد، إضافة، تعديل، حذف) تحت /v1/api. ${who.ar}`, `${what.en}: five ready addresses (a list with search, one, add, replace, delete) under /v1/api. ${who.en}`, `${what.he}: חמש כתובות מוכנות (רשימה עם חיפוש, אחד, הוספה, החלפה, מחיקה) תחת /v1/api. ${who.he}`);
const KEY_ONLY = L("الكل بمفتاح API.", "All with an API key.", "הכול עם מפתח API.");
const PUBLIC_READ = L("القراءة للكل، والكتابة بمفتاح.", "Reading for anyone, writing with a key.", "קריאה לכולם, כתיבה עם מפתח.");
const SHOPPER_OWN = L("الزبون المسجّل بيقرأ ويكتب سطوره هو بس.", "A signed-in shopper reads and writes their own rows only.", "לקוח מחובר קורא וכותב רק את השורות שלו.");

export const API_CRUD: GalleryEntry[] = [
  crud({ key: "api-contacts", category: "customers", name: N("API جهات الاتصال", "Contacts API", "API אנשי קשר"), note: crudNote(N("جهات اتصالك لتطبيق أو CRM", "Your contacts for an app or a CRM", "אנשי הקשר שלכם לאפליקציה או CRM"), KEY_ONLY), base: "contacts", table: N("جهات الاتصال", "Contacts", "אנשי קשר"), fields: [f.text("name", N("الاسم", "Name", "שם"), { required: true }), f.email("email", N("الإيميل", "Email", "מייל")), f.phone("phone", N("التلفون", "Phone", "טלפון")), f.text("company", N("الشركة", "Company", "חברה")), f.long("notes", N("ملاحظات", "Notes", "הערות"))], search: "name", read: "key", write: "key" }),
  crud({ key: "api-notes", category: "operations", name: N("API الملاحظات", "Notes API", "API פתקים"), note: crudNote(N("ملاحظات الفريق", "The team's notes", "פתקי הצוות"), KEY_ONLY), base: "notes", table: N("الملاحظات", "Notes", "פתקים"), fields: [f.text("title", N("العنوان", "Title", "כותרת"), { required: true }), f.long("body", N("النص", "Text", "טקסט")), f.text("tag", N("وسم", "Tag", "תגית"))], search: "title", read: "key", write: "key" }),
  crud({ key: "api-team-tasks", category: "operations", name: N("API مهام الفريق", "Team tasks API", "API משימות צוות"), note: crudNote(N("مهام لتطبيق الفريق", "Tasks for the team's app", "משימות לאפליקציית הצוות"), KEY_ONLY), base: "team-tasks", table: N("مهام الفريق", "Team tasks", "משימות צוות"), fields: [f.text("title", N("المهمة", "Task", "משימה"), { required: true }), f.text("who", N("مين", "Who", "מי")), f.date("due", N("موعدها", "Due", "יעד")), f.bool("done", N("خلصت", "Done", "בוצע"), { default: false })], search: "title", read: "key", write: "key" }),
  crud({ key: "api-events", category: "content", name: N("API الفعاليات", "Events API", "API אירועים"), note: crudNote(N("الفعاليات والورشات", "Events and workshops", "אירועים וסדנאות"), PUBLIC_READ), base: "events", table: N("الفعاليات", "Events", "אירועים"), fields: [f.text("title", N("الفعالية", "Event", "אירוע"), { required: true }), f.datetime("startsAt", N("بتبلّش", "Starts", "מתחיל"), { required: true }), f.text("place", N("المكان", "Place", "מקום")), f.number("seats", N("المقاعد", "Seats", "מקומות"), { min: 0 }), f.long("details", N("التفاصيل", "Details", "פרטים"))], search: "title", read: "public", write: "key" }),
  crud({ key: "api-faq", category: "content", name: N("API الأسئلة والأجوبة", "FAQ API", "API שאלות נפוצות"), note: crudNote(N("أسئلة وأجوبة لتطبيق أو بوت", "Questions and answers for an app or a bot", "שאלות ותשובות לאפליקציה או בוט"), PUBLIC_READ), base: "faq", table: N("أسئلة وأجوبة", "FAQ", "שאלות נפוצות"), fields: [f.text("question", N("السؤال", "Question", "שאלה"), { required: true }), f.long("answer", N("الجواب", "Answer", "תשובה"), { required: true }), f.select("topic", N("الموضوع", "Topic", "נושא"), [["orders", N("الطلبات", "Orders", "הזמנות")], ["shipping", N("الشحن", "Shipping", "משלוח")], ["returns", N("الإرجاع", "Returns", "החזרות")], ["other", N("غير", "Other", "אחר")]], { default: "other" })], search: "question", read: "public", write: "key" }),
  crud({ key: "api-branches", category: "content", name: N("API الفروع", "Branches API", "API סניפים"), note: crudNote(N("فروعك بعناوينها وساعاتها", "Your branches with addresses and hours", "הסניפים עם כתובות ושעות"), PUBLIC_READ), base: "branches", table: N("الفروع", "Branches", "סניפים"), fields: [f.text("name", N("الفرع", "Branch", "סניף"), { required: true }), f.text("city", N("المدينة", "City", "עיר")), f.long("address", N("العنوان", "Address", "כתובת")), f.phone("phone", N("التلفون", "Phone", "טלפון")), f.text("hours", N("الساعات", "Hours", "שעות"))], search: "city", read: "public", write: "key" }),
  crud({ key: "api-suppliers", category: "operations", name: N("API المورّدين", "Suppliers API", "API ספקים"), note: crudNote(N("المورّدين وشروطهم", "Suppliers and their terms", "ספקים ותנאים"), KEY_ONLY), base: "suppliers", table: N("المورّدين", "Suppliers", "ספקים"), fields: [f.text("name", N("المورّد", "Supplier", "ספק"), { required: true }), f.email("email", N("الإيميل", "Email", "מייל")), f.phone("phone", N("التلفون", "Phone", "טלפון")), f.number("leadDays", N("أيام التوريد", "Lead days", "ימי אספקה"), { min: 0 }), f.long("terms", N("الشروط", "Terms", "תנאים"))], search: "name", read: "key", write: "key" }),
  crud({ key: "api-expenses", category: "finance", name: N("API المصاريف", "Expenses API", "API הוצאות"), note: crudNote(N("المصاريف من تطبيق المحاسبة", "Expenses from the bookkeeping app", "הוצאות מאפליקציית ההנהלה"), KEY_ONLY), base: "expense-items", table: N("المصاريف", "Expenses", "הוצאות"), fields: [f.text("what", N("شو", "What", "מה"), { required: true }), f.money("amount", N("المبلغ", "Amount", "סכום"), { required: true, min: 0 }), f.date("day", N("اليوم", "Day", "יום")), f.select("kind", N("النوع", "Kind", "סוג"), [["stock", N("بضاعة", "Stock", "סחורה")], ["ads", N("إعلانات", "Ads", "פרסום")], ["rent", N("إيجار", "Rent", "שכירות")], ["other", N("غير", "Other", "אחר")]], { default: "other" })], search: "what", read: "key", write: "key" }),
  crud({ key: "api-vendors-products", category: "operations", name: N("API منتجات إضافية", "Extra products API", "API מוצרים נוספים"), note: crudNote(N("كتالوج تاني لمنتجات مش بالمتجر (للجملة أو للمعارض)", "A second catalog for products not in the shop (wholesale, fairs)", "קטלוג נוסף למוצרים שלא בחנות (סיטונאות, ירידים)"), PUBLIC_READ), base: "catalog-extra", table: N("منتجات إضافية", "Extra products", "מוצרים נוספים"), fields: [f.text("name", N("المنتج", "Product", "מוצר"), { required: true }), f.text("sku", N("الرمز", "SKU", "מק״ט"), { unique: true }), f.money("price", N("السعر", "Price", "מחיר"), { min: 0 }), f.image("image", N("الصورة", "Picture", "תמונה")), f.long("description", N("الوصف", "Description", "תיאור"))], search: "name", read: "public", write: "key" }),
  crud({ key: "api-recipes", category: "content", name: N("API الوصفات", "Recipes API", "API מתכונים"), note: crudNote(N("وصفات لمتجر أكل أو بهارات", "Recipes for a food or spice shop", "מתכונים לחנות אוכל או תבלינים"), PUBLIC_READ), base: "recipes", table: N("الوصفات", "Recipes", "מתכונים"), fields: [f.text("title", N("الوصفة", "Recipe", "מתכון"), { required: true }), f.number("minutes", N("الدقايق", "Minutes", "דקות"), { min: 0 }), f.long("ingredients", N("المكوّنات", "Ingredients", "מרכיבים")), f.long("steps", N("الطريقة", "Method", "אופן הכנה")), f.image("photo", N("صورة", "Photo", "תמונה"))], search: "title", read: "public", write: "key" }),
  crud({ key: "api-jobs", category: "content", name: N("API الوظائف", "Jobs API", "API משרות"), note: crudNote(N("الوظايف المفتوحة", "Open jobs", "משרות פתוחות"), PUBLIC_READ), base: "jobs", table: N("الوظائف", "Jobs", "משרות"), fields: [f.text("title", N("الوظيفة", "Job", "משרה"), { required: true }), f.text("place", N("المكان", "Place", "מקום")), f.select("type", N("النوع", "Type", "סוג"), [["full", N("دوام كامل", "Full time", "משרה מלאה")], ["part", N("جزئي", "Part time", "חלקית")]], { default: "full" }), f.long("about", N("عن الوظيفة", "About", "על המשרה"))], search: "title", read: "public", write: "key" }),
  crud({ key: "api-listings", category: "content", name: N("API إعلانات (عقارات وسيارات)", "Listings API (homes, cars)", "API מודעות (דירות, רכבים)"), note: crudNote(N("إعلانات بسعر ومكان وصورة", "Listings with a price, a place and a picture", "מודעות עם מחיר, מקום ותמונה"), PUBLIC_READ), base: "listings", table: N("الإعلانات", "Listings", "מודעות"), fields: [f.text("title", N("العنوان", "Title", "כותרת"), { required: true }), f.money("price", N("السعر", "Price", "מחיר"), { min: 0 }), f.text("city", N("المدينة", "City", "עיר")), f.image("photo", N("صورة", "Photo", "תמונה")), f.long("details", N("التفاصيل", "Details", "פרטים"))], search: "title", read: "public", write: "key" }),
  crud({ key: "api-my-addresses", category: "customers", name: N("API عناوين الزبون", "Shopper addresses API", "API כתובות לקוח"), note: crudNote(N("دفتر عناوين الزبون للتوصيل", "A shopper's address book for deliveries", "פנקס הכתובות של הלקוח למשלוחים"), SHOPPER_OWN), base: "my-addresses", table: N("عناوين الزباين", "Shopper addresses", "כתובות לקוחות"), fields: [f.text("label", N("اسم العنوان", "Label", "כינוי"), { required: true }), f.text("city", N("المدينة", "City", "עיר"), { required: true }), f.long("street", N("الشارع والتفاصيل", "Street and details", "רחוב ופרטים")), f.phone("phone", N("تلفون للتوصيل", "Delivery phone", "טלפון למשלוח"))], search: "label", read: "customer", write: "customer" }),
  crud({ key: "api-my-wishlist", category: "customers", name: N("API قائمة الأمنيات", "Wishlist API", "API רשימת משאלות"), note: crudNote(N("قائمة أمنيات الزبون لتطبيق الجوال", "A shopper's wishlist for the mobile app", "רשימת המשאלות של הלקוח לאפליקציה"), SHOPPER_OWN), base: "my-wishlist", table: N("قوائم الأمنيات", "Wishlists", "רשימות משאלות"), fields: [f.text("item", N("الشي", "Item", "פריט"), { required: true }), f.link("link", N("الرابط", "Link", "קישור")), f.number("priority", N("الأهمية", "Priority", "עדיפות"), { min: 1, max: 5 })], search: "item", read: "customer", write: "customer" }),
  crud({ key: "api-my-measurements", category: "customers", name: N("API قياسات الزبون", "Shopper measurements API", "API מידות לקוח"), note: crudNote(N("قياسات الزبون للتفصيل", "A shopper's measurements for tailoring", "מידות הלקוח לתפירה"), SHOPPER_OWN), base: "my-measurements", table: N("قياسات الزباين", "Shopper measurements", "מידות לקוחות"), fields: [f.text("label", N("لمين", "For whom", "עבור"), { required: true }), f.number("height", N("الطول", "Height", "גובה"), { min: 50, max: 230 }), f.number("chest", N("الصدر", "Chest", "חזה"), { min: 30, max: 200 }), f.number("waist", N("الخصر", "Waist", "מותן"), { min: 30, max: 200 }), f.number("hips", N("الورك", "Hips", "ירכיים"), { min: 30, max: 200 })], search: "label", read: "customer", write: "customer" }),
  crud({ key: "api-my-notes", category: "customers", name: N("API ملاحظات الزبون", "Shopper notes API", "API פתקי לקוח"), note: crudNote(N("ملاحظات خاصة للزبون بحسابه", "Private notes in a shopper's account", "פתקים פרטיים בחשבון הלקוח"), SHOPPER_OWN), base: "my-notes", table: N("ملاحظات الزباين", "Shopper notes", "פתקי לקוחות"), fields: [f.text("title", N("العنوان", "Title", "כותרת"), { required: true }), f.long("body", N("النص", "Text", "טקסט"))], search: "title", read: "customer", write: "customer" }),
  crud({ key: "api-courses", category: "content", name: N("API الدورات", "Courses API", "API קורסים"), note: crudNote(N("دورات وورشات بمواعيدها وأسعارها", "Courses and workshops with dates and prices", "קורסים וסדנאות עם מועדים ומחירים"), PUBLIC_READ), base: "courses", table: N("الدورات", "Courses", "קורסים"), fields: [f.text("title", N("الدورة", "Course", "קורס"), { required: true }), f.date("starts", N("بتبلّش", "Starts", "מתחיל")), f.number("lessons", N("الدروس", "Lessons", "שיעורים"), { min: 1 }), f.money("price", N("السعر", "Price", "מחיר"), { min: 0 }), f.long("about", N("عن الدورة", "About", "על הקורס"))], search: "title", read: "public", write: "key" }),
  crud({ key: "api-portfolio", category: "content", name: N("API أعمالنا", "Portfolio API", "API תיק עבודות"), note: crudNote(N("أعمال سابقة بصورها", "Past work with its pictures", "עבודות קודמות עם תמונות"), PUBLIC_READ), base: "portfolio", table: N("أعمالنا", "Portfolio", "תיק עבודות"), fields: [f.text("title", N("العمل", "Work", "עבודה"), { required: true }), f.text("client", N("الزبون", "Client", "לקוח")), f.image("cover", N("الصورة", "Picture", "תמונה")), f.long("story", N("القصة", "Story", "סיפור"))], search: "title", read: "public", write: "key" }),
  crud({ key: "api-glossary", category: "content", name: N("API قاموس المصطلحات", "Glossary API", "API מילון מונחים"), note: crudNote(N("مصطلحات وشرحها (أقمشة، مواد، قياسات)", "Terms and their meaning (fabrics, materials, sizes)", "מונחים ופירושם (בדים, חומרים, מידות)"), PUBLIC_READ), base: "glossary", table: N("المصطلحات", "Glossary", "מונחים"), fields: [f.text("term", N("المصطلح", "Term", "מונח"), { required: true, unique: true }), f.long("meaning", N("المعنى", "Meaning", "פירוש"), { required: true })], search: "term", read: "public", write: "key" }),
  crud({ key: "api-assets", category: "operations", name: N("API معدّات المحل", "Equipment API", "API ציוד"), note: crudNote(N("معدّات وأجهزة المحل ومين ماسكها", "The shop's equipment and who holds it", "ציוד החנות ומי מחזיק אותו"), KEY_ONLY), base: "equipment", table: N("المعدّات", "Equipment", "ציוד"), fields: [f.text("name", N("الجهاز", "Item", "פריט"), { required: true }), f.text("serial", N("الرقم التسلسلي", "Serial", "מספר סידורי")), f.text("holder", N("مع مين", "Held by", "אצל")), f.date("warrantyEnds", N("الكفالة لـ", "Warranty until", "אחריות עד"))], search: "name", read: "key", write: "key" }),
];
