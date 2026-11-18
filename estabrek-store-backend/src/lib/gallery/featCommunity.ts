/**
 * Ready features for community and content: boards people post and vote on (each post waits for the
 * shop to publish it), and pages listing what the shop publishes (a blog, a menu, branches…).
 */
import { L, cond, f, i, on, s, table, where } from "./kit.js";
import { feature } from "./featKit.js";
import { A } from "./featAsk.js";

const T = (ar: string, en: string, he: string) => L(ar, en, he);
/** A "+1" on a row: its count goes up by one (once a shopper, by the voters table). */
const upvote = (slug: string) => ({
  key: "vote",
  name: "صوّت",
  inputs: [i.text("id", { required: true, max: 40 })],
  on: on.call(slug, "customer" as const, 30),
  do: [
    s.find("voters", "mine", [where("row", "is", "{{input.id}}"), where("by", "is", "{{caller.email}}")], { limit: 1 }),
    s.when([cond("{{mine}}", "notEmpty")], [s.stop("صوّت من قبل")]),
    s.add("voters", { row: "{{input.id}}", by: "{{caller.email}}" }),
    s.get("main", "{{input.id}}", "row"),
    s.set("n", "{{row.votes}}"),
    s.set("n", 1, "add"),
    s.change("main", "{{input.id}}", { votes: "{{n}}" }),
    s.ret("{{n}}"),
  ],
});
const VOTERS = (slug: string) => table("voters", `${slug}-votes`, T("مين صوّت", "Who voted", "מי הצביע"), [f.text("row", T("على شو", "On", "על"), { required: true }), f.email("by", T("مين", "Who", "מי"), { required: true })]);
const VOTES = f.number("votes", T("الأصوات", "Votes", "קולות"), { default: 0 });
/** Shown once the shop publishes it. */
const MODERATED = T("كل مشاركة بتستنى موافقتك قبل ما تبين (انشرها من الجدول).", "Each post waits for your approval before it shows (publish it from the table).", "כל פרסום ממתין לאישור לפני שמוצג (מפרסמים מהטבלה).");
const withModeration = (note: ReturnType<typeof L>) => L(`${note.ar} ${MODERATED.ar}`, `${note.en} ${MODERATED.en}`, `${note.he} ${MODERATED.he}`);

export const FEAT_COMMUNITY = [
  feature({
    key: "feat-ideas-board",
    category: "community",
    name: T("لوح الأفكار والتصويت", "An ideas board with votes", "לוח רעיונות והצבעה"),
    note: withModeration(T("الزباين بيقترحوا منتجات أو أفكار وبيصوّتوا عليها (صوت لكل واحد).", "Shoppers suggest products or ideas and vote on them (a vote each).", "לקוחות מציעים מוצרים או רעיונות ומצביעים (קול לכל אחד).")),
    table: { slug: "ideas", name: T("الأفكار", "Ideas", "רעיונות"), fields: [VOTES] },
    ask: { fields: [A.text("title", T("الفكرة", "Idea", "רעיון"), true), A.details(false)], button: T("اقترح", "Suggest", "הצעה"), done: "شكراً! بتبين بعد ما نراجعها 💡", title: "فكرة جديدة" },
    page: { slug: "/ideas", title: T("أفكاركم", "Your ideas", "הרעיונות שלכם"), intro: T("اقترح، وصوّت للي بتحبه.", "Suggest, and vote for what you like.", "הציעו, והצביעו למה שאהבתם."), list: { feed: "live", title: T("الأفكار", "Ideas", "רעיונות"), card: [["title", T("الفكرة", "Idea", "רעיון")], ["votes", T("الأصوات", "Votes", "קולות")]], empty: T("لسا ما في أفكار.", "No ideas yet.", "עדיין אין רעיונות."), action: { label: T("👍 صوّت", "👍 Vote", "👍 הצבעה"), fn: "ideas-vote" } } },
    extra: { tables: [VOTERS("ideas")], fns: [upvote("ideas-vote")] },
  }),
  feature({
    key: "feat-feature-requests",
    category: "community",
    name: T("طلبات منتجات جديدة", "New product requests", "בקשות למוצרים חדשים"),
    note: withModeration(T("«بدّي تجيبوا…»: الزباين بيطلبوا منتجات وبيصوّتوا، لتعرف شو تطلب من المورّد.", "“Please stock…”: shoppers ask for products and vote, so you know what to order.", "«תביאו בבקשה…»: לקוחות מבקשים מוצרים ומצביעים, כדי לדעת מה להזמין.")),
    table: { slug: "product-requests", name: T("طلبات المنتجات", "Product requests", "בקשות מוצרים"), fields: [VOTES] },
    ask: { fields: [A.text("title", T("شو بدّك نجيب", "What should we stock", "מה להביא"), true), A.text("link", T("رابط أو صورة", "A link or picture", "קישור או תמונה"))], button: T("اطلب", "Request", "בקשה"), done: "انضاف طلبك، صوّتوا!", title: "طلب منتج" },
    page: { slug: "/requests-board", title: T("شو بدكم نجيب؟", "What should we stock?", "מה להביא?"), intro: T("الأكتر تصويت بنجيبه أول.", "The most voted comes first.", "המבוקש ביותר מגיע ראשון."), list: { feed: "live", title: T("الطلبات", "Requests", "בקשות"), card: [["title", T("المنتج", "Product", "מוצר")], ["votes", T("الأصوات", "Votes", "קולות")]], empty: T("ما في طلبات.", "No requests.", "אין בקשות."), action: { label: T("👍 بدّي كمان", "👍 Me too", "👍 גם אני"), fn: "product-requests-vote" } } },
    extra: { tables: [VOTERS("product-requests")], fns: [upvote("product-requests-vote")] },
  }),
  feature({
    key: "feat-photo-contest",
    category: "community",
    name: T("مسابقة صور", "A photo contest", "תחרות צילום"),
    note: withModeration(T("الزباين بيشاركوا صورهم بالمنتج (رابط)، والكل بيصوّت؛ الأكتر أصوات بيربح.", "Shoppers share photos with the product (a link), everyone votes; the most voted wins.", "לקוחות משתפים תמונות עם המוצר (קישור), כולם מצביעים; המוביל זוכה.")),
    table: { slug: "contest-entries", name: T("مشاركات المسابقة", "Contest entries", "השתתפויות בתחרות"), fields: [VOTES] },
    ask: { fields: [A.text("title", T("اسم الصورة", "Photo title", "שם התמונה"), true), A.text("photo", T("رابط الصورة", "Photo link", "קישור לתמונה"), true)], button: T("شارك", "Enter", "השתתפות"), done: "مشاركتك بتبين بعد المراجعة 📸", title: "مشاركة بالمسابقة" },
    page: { slug: "/contest", title: T("مسابقة الصور", "Photo contest", "תחרות צילום"), intro: T("صوّرنا، وصوّت للأحلى.", "Take a photo, vote for the best.", "צלמו, והצביעו ליפה ביותר."), list: { feed: "live", title: T("المشاركات", "Entries", "השתתפויות"), card: [["title", T("الصورة", "Photo", "תמונה")], ["votes", T("الأصوات", "Votes", "קולות")]], empty: T("لسا ما في مشاركات.", "No entries yet.", "עדיין אין השתתפויות."), action: { label: T("❤️ صوّت", "❤️ Vote", "❤️ הצבעה"), fn: "contest-vote" } } },
    extra: { tables: [VOTERS("contest")], fns: [upvote("contest-vote")] },
  }),
  feature({
    key: "feat-testimonials",
    category: "content",
    name: T("حيط آراء الزباين", "A testimonials wall", "קיר המלצות"),
    note: withModeration(T("الزباين بيكتبوا رأيهم مع نجوم، والمنشور بيبين على حيط بالصفحة.", "Shoppers write their opinion with stars, and the published ones show on a wall.", "לקוחות כותבים דעה עם כוכבים, והמפורסמות מוצגות על קיר.")),
    table: { slug: "testimonials", name: T("آراء الزباين", "Testimonials", "המלצות") },
    ask: { fields: [A.name(), A.number("stars", T("النجوم", "Stars", "כוכבים"), 1, 5, true), A.long("text", T("رأيك", "Your words", "המילים שלכם"), true)], button: T("شارك رأيك", "Share", "שיתוף"), done: "شكراً! رأيك بيبين قريب 🌸", title: "رأي زبون" },
    page: { slug: "/love", title: T("شو قالوا عنا", "What people say", "מה אומרים עלינו"), intro: T("كلام زباين حقيقيين.", "Real customers' words.", "מילים של לקוחות אמיתיים."), list: { feed: "show", title: T("آراء", "Words", "המלצות"), card: [["text", T("الرأي", "Words", "המלצה")], ["name", T("الاسم", "Name", "שם")], ["stars", T("النجوم", "Stars", "כוכבים")]], empty: T("لسا ما في آراء.", "No testimonials yet.", "עדיין אין המלצות.") } },
  }),
  feature({
    key: "feat-customer-lookbook",
    category: "community",
    name: T("لوك بوك الزباين", "Customers' lookbook", "לוקבוק לקוחות"),
    note: withModeration(T("الزبون بيشارك إطلالته بالقطع (رابط صورة ووصف).", "A shopper shares their look with the pieces (a photo link and a caption).", "לקוח משתף את הלוק שלו (קישור לתמונה וכיתוב).")),
    table: { slug: "community-looks", name: T("إطلالات الزباين", "Customers' looks", "לוקים של לקוחות") },
    ask: { fields: [A.text("photo", T("رابط الصورة", "Photo link", "קישור לתמונה"), true), A.text("caption", T("وصف", "Caption", "כיתוב")), A.text("pieces", T("القطع اللي لابستها", "Pieces worn", "פריטים"))], button: T("شارك إطلالتك", "Share your look", "שתפו את הלוק"), done: "حلو! بتبين بعد المراجعة ✨", title: "إطلالة زبون" },
    page: { slug: "/looks", title: T("إطلالاتكم", "Your looks", "הלוקים שלכם"), intro: T("كيف لبستوا قطعنا.", "How you wear our pieces.", "איך אתם לובשים את הפריטים."), list: { feed: "show", title: T("إطلالات", "Looks", "לוקים"), card: [["caption", T("الوصف", "Caption", "כיתוב")], ["pieces", T("القطع", "Pieces", "פריטים")]], empty: T("لسا ما في إطلالات.", "No looks yet.", "עדיין אין לוקים.") } },
  }),
  feature({
    key: "feat-qa-board",
    category: "community",
    name: T("لوح الأسئلة والأجوبة", "A Q&A board", "לוח שאלות ותשובות"),
    note: T("الزباين بيسألوا، إنت بتكتب الجواب بالجدول وبتنشر؛ الأسئلة المنشورة بتفيد الكل.", "Shoppers ask; you write the answer in the table and publish; published questions help everyone.", "לקוחות שואלים; כותבים תשובה בטבלה ומפרסמים; שאלות מפורסמות עוזרות לכולם."),
    table: { slug: "questions-board", name: T("الأسئلة", "Questions", "שאלות"), fields: [f.long("answer", T("الجواب", "Answer", "תשובה"))] },
    ask: { fields: [A.text("question", T("سؤالك", "Your question", "השאלה שלכם"), true), A.text("product", T("عن أي منتج", "About which product", "על איזה מוצר"))], who: "public", button: T("اسأل", "Ask", "שאלה"), done: "وصل سؤالك، الجواب بيبين هون.", title: "سؤال جديد" },
    page: { slug: "/questions", title: T("أسئلة وأجوبة", "Questions and answers", "שאלות ותשובות"), intro: T("اسأل شو بدّك.", "Ask anything.", "שאלו כל דבר."), list: { feed: "show", title: T("أسئلة انرد عليها", "Answered questions", "שאלות שנענו"), card: [["question", T("السؤال", "Question", "שאלה")], ["answer", T("الجواب", "Answer", "תשובה")]], empty: T("لسا ما في أسئلة.", "No questions yet.", "עדיין אין שאלות.") } },
  }),
  feature({
    key: "feat-forum",
    category: "community",
    name: T("منتدى بسيط", "A simple forum", "פורום פשוט"),
    note: withModeration(T("الأعضاء بيفتحوا مواضيع بقسم، والمواضيع المنشورة بتبين للكل.", "Members open topics in a section, and published topics show to all.", "חברים פותחים נושאים בקטגוריה, והנושאים המפורסמים מוצגים לכולם.")),
    table: { slug: "forum-topics", name: T("مواضيع المنتدى", "Forum topics", "נושאי פורום") },
    ask: { fields: [A.text("title", T("الموضوع", "Topic", "נושא"), true), A.pick("section", T("القسم", "Section", "קטגוריה"), [["general", T("عام", "General", "כללי")], ["style", T("ستايل", "Style", "סטייל")], ["help", T("مساعدة", "Help", "עזרה")]]), A.long("body", T("اكتب", "Write", "כתבו"), true)], button: T("انشر", "Post", "פרסום"), done: "موضوعك بيبين بعد المراجعة.", title: "موضوع جديد" },
    page: { slug: "/forum", title: T("المنتدى", "Forum", "פורום"), intro: T("احكوا، اسألوا، وساعدوا بعض.", "Talk, ask, help each other.", "דברו, שאלו, עזרו זה לזה."), list: { feed: "show", title: T("المواضيع", "Topics", "נושאים"), card: [["title", T("الموضوع", "Topic", "נושא")], ["section", T("القسم", "Section", "קטגוריה")], ["body", T("النص", "Text", "טקסט")]], empty: T("لسا ما في مواضيع.", "No topics yet.", "עדיין אין נושאים.") } },
  }),
  feature({
    key: "feat-member-directory",
    category: "community",
    name: T("دليل الأعضاء", "A member directory", "מדריך חברים"),
    note: withModeration(T("الأعضاء اللي بيوافقوا بيسجّلوا اسمهم ومجالهم ومدينتهم بدليل عام.", "Members who agree list their name, field and city in a public directory.", "חברים שמסכימים רושמים שם, תחום ועיר במדריך פומבי.")),
    table: { slug: "directory", name: T("الدليل", "Directory", "מדריך") },
    ask: { fields: [A.name(), A.text("field", T("المجال", "Field", "תחום"), true), A.text("city", T("المدينة", "City", "עיר")), A.text("link", T("رابط صفحتك", "Your page", "העמוד שלכם"))], button: T("ضيفني للدليل", "Add me", "הוסיפו אותי"), done: "بتبين بالدليل بعد المراجعة.", title: "عضو بالدليل", once: "name" },
    page: { slug: "/directory", title: T("دليل الأعضاء", "Member directory", "מדריך חברים"), intro: T("تعرّفوا على بعض.", "Get to know each other.", "הכירו זה את זה."), list: { feed: "show", title: T("الأعضاء", "Members", "חברים"), card: [["name", T("الاسم", "Name", "שם")], ["field", T("المجال", "Field", "תחום")], ["city", T("المدينة", "City", "עיר")]], empty: T("الدليل فاضي.", "The directory is empty.", "המדריך ריק.") } },
  }),
  feature({
    key: "feat-classifieds",
    category: "community",
    name: T("سوق المستعمل", "A second-hand board", "לוח יד שנייה"),
    note: withModeration(T("الأعضاء بيعرضوا قطع مستعملة للبيع أو التبديل بسعر وتلفون.", "Members offer second-hand pieces to sell or swap, with a price and a phone.", "חברים מציעים פריטים משומשים למכירה או החלפה, עם מחיר וטלפון.")),
    table: { slug: "second-hand", name: T("إعلانات المستعمل", "Second-hand listings", "מודעות יד שנייה") },
    ask: { fields: [A.text("title", T("القطعة", "Item", "פריט"), true), A.number("price", T("السعر", "Price", "מחיר"), 0, 100000), A.pick("deal", T("بيع ولا تبديل", "Sell or swap", "מכירה או החלפה"), [["sell", T("بيع", "Sell", "מכירה")], ["swap", T("تبديل", "Swap", "החלפה")]]), A.phone()], button: T("انشر إعلان", "Post a listing", "פרסום מודעה"), done: "إعلانك بيبين بعد المراجعة.", title: "إعلان مستعمل" },
    page: { slug: "/second-hand", title: T("سوق المستعمل", "Second-hand board", "לוח יד שנייה"), intro: T("قطع لسا إلها عمر.", "Pieces with life left in them.", "פריטים שעוד יש בהם חיים."), list: { feed: "show", title: T("الإعلانات", "Listings", "מודעות"), card: [["title", T("القطعة", "Item", "פריט")], ["price", T("السعر", "Price", "מחיר")], ["deal", T("بيع/تبديل", "Sell/swap", "מכירה/החלפה")]], empty: T("ما في إعلانات.", "No listings.", "אין מודעות.") } },
  }),
  feature({
    key: "feat-challenges",
    category: "community",
    name: T("تحدّي الشهر", "Challenge of the month", "אתגר החודש"),
    note: T("الأعضاء بيسجّلوا بالتحدّي وبيحدّثوا تقدّمهم، وبيشوفوا تقدّمهم بصفحتهم.", "Members join the challenge and update their progress, and see it on their page.", "חברים מצטרפים לאתגר ומעדכנים התקדמות, ורואים אותה בעמוד."),
    table: { slug: "challenge", name: T("المشاركين بالتحدّي", "Challenge members", "משתתפי האתגר"), fields: [f.number("progress", T("التقدّم %", "Progress %", "התקדמות %"), { default: 0, min: 0, max: 100 })] },
    ask: { fields: [A.name(), A.text("goal", T("هدفك", "Your goal", "המטרה שלכם"), true)], button: T("انضم", "Join", "הצטרפות"), done: "انضميت! بالتوفيق 💪", title: "مشارك بالتحدّي" },
    page: { slug: "/challenge", title: T("تحدّي الشهر", "Challenge of the month", "אתגר החודש"), intro: T("هدف واحد، شهر واحد.", "One goal, one month.", "מטרה אחת, חודש אחד."), list: { feed: "mine", title: T("تحدّيي", "My challenge", "האתגר שלי"), card: [["goal", T("الهدف", "Goal", "מטרה")], ["progress", T("التقدّم", "Progress", "התקדמות")]], empty: T("مش مسجّل.", "Not joined.", "לא הצטרפתם.") } },
    extra: { fns: [{ key: "progress", name: "حدّث التقدّم", inputs: [i.num("progress", { required: true, min: 0, max: 100 })], on: on.call("challenge-progress", "customer", 10), do: [s.find("main", "mine", [where("name", "is", "{{caller.name}}")], { limit: 1 }), s.when([cond("{{mine}}", "empty")], [s.stop("سجّل بالتحدّي أول")]), s.change("main", "{{mine.0.id}}", { progress: "{{input.progress}}" }), s.ret("{{input.progress}}%")] }] },
  }),
  /* ---------------- Pages of what the shop publishes ---------------- */
  feature({
    key: "feat-blog",
    category: "content",
    name: T("المدونة", "A blog", "בלוג"),
    note: T("مقالات بعنوان وصورة وملخص؛ المنشورة بتبين بصفحة، وفي فورم اشتراك بالمقالات الجديدة.", "Articles with a title, picture and summary; the published ones show on a page, with a form to follow new posts.", "מאמרים עם כותרת, תמונה ותקציר; המפורסמים מוצגים בעמוד, עם טופס הרשמה לפוסטים חדשים."),
    table: { slug: "posts", name: T("المقالات", "Posts", "פוסטים"), fields: [f.text("title", T("العنوان", "Title", "כותרת"), { required: true }), f.image("cover", T("الصورة", "Picture", "תמונה")), f.long("excerpt", T("الملخص", "Summary", "תקציר")), f.long("body", T("النص", "Text", "טקסט"))] },
    page: { slug: "/journal", title: T("المدونة", "Journal", "יומן"), intro: T("قصص، نصايح، وكواليس.", "Stories, tips and behind the scenes.", "סיפורים, טיפים ומאחורי הקלעים."), list: { feed: "show", title: T("آخر المقالات", "Latest posts", "פוסטים אחרונים"), card: [["title", T("العنوان", "Title", "כותרת")], ["excerpt", T("الملخص", "Summary", "תקציר")]], empty: T("لسا ما في مقالات.", "No posts yet.", "עדיין אין פוסטים.") } },
    form: { fields: [A.email()], fn: "blog-follow", button: T("خبّرني بالجديد", "Tell me about new posts", "עדכנו אותי") },
    extra: { tables: [table("followers", "blog-followers", T("متابعين المدونة", "Blog followers", "עוקבי הבלוג"), [f.email("email", T("الإيميل", "Email", "מייל"), { required: true, unique: true })])], fns: [{ key: "follow", name: "تابع المدونة", inputs: [i.email("email", { required: true })], on: on.call("blog-follow", "public", 5), do: [s.find("followers", "have", [where("email", "is", "{{input.email}}")], { limit: 1 }), s.when([cond("{{have}}", "empty")], [s.add("followers", { email: "{{input.email}}" })]), s.ret("تمام! منبعتلك كل مقال جديد.")] }] },
  }),
  feature({
    key: "feat-faq-page",
    category: "content",
    name: T("صفحة الأسئلة الشائعة", "An FAQ page", "עמוד שאלות נפוצות"),
    note: T("أسئلة وأجوبة بأقسام بتنشرها من الجدول، وفورم «ما لقيت سؤالك؟».", "Questions and answers in topics you publish from the table, and a “didn't find your question?” form.", "שאלות ותשובות בנושאים שמפרסמים מהטבלה, וטופס «לא מצאתם?»."),
    table: { slug: "faq-page", name: T("الأسئلة الشائعة", "FAQ", "שאלות נפוצות"), fields: [f.text("question", T("السؤال", "Question", "שאלה"), { required: true }), f.long("answer", T("الجواب", "Answer", "תשובה")), f.select("topic", T("الموضوع", "Topic", "נושא"), [["orders", T("الطلبات", "Orders", "הזמנות")], ["shipping", T("الشحن", "Shipping", "משלוח")], ["returns", T("الإرجاع", "Returns", "החזרות")], ["other", T("غير", "Other", "אחר")]], { default: "other" })] },
    page: { slug: "/help", title: T("أسئلة شائعة", "FAQ", "שאלות נפוצות"), intro: T("الأجوبة على أكتر شي بينسأل.", "Answers to what's asked most.", "תשובות למה שנשאל הכי הרבה."), list: { feed: "show", title: T("الأسئلة", "Questions", "שאלות"), card: [["question", T("السؤال", "Question", "שאלה")], ["answer", T("الجواب", "Answer", "תשובה")]], empty: T("لسا ما في أسئلة.", "No questions yet.", "עדיין אין שאלות.") } },
    form: { fields: [A.text("question", T("سؤالك", "Your question", "השאלה שלכם"), true), A.email()], fn: "faq-ask", button: T("اسأل", "Ask", "שאלה") },
    extra: { fns: [{ key: "ask", name: "سؤال جديد", inputs: [i.text("question", { required: true, min: 5, max: 300 }), i.email("email", { required: true })], on: on.call("faq-ask", "public", 3), do: [s.add("main", { question: "{{input.question}}" }), s.email("سؤال جديد للصفحة", "{{input.question}}\n\nللرد: {{input.email}}"), s.ret("وصل سؤالك، منرد عليك ومنضيفه للصفحة.")] }] },
  }),
  feature({
    key: "feat-menu",
    category: "content",
    name: T("قائمة المطعم", "A restaurant menu", "תפריט מסעדה"),
    note: T("الأصناف بأقسامها وأسعارها وصورها، من جدول بتعدّله بأي وقت؛ اللي خلص بتخبّيه.", "Dishes with sections, prices and pictures, from a table you edit any time; hide what's sold out.", "מנות עם קטגוריות, מחירים ותמונות, מטבלה שעורכים בכל זמן; מסתירים את מה שנגמר."),
    table: { slug: "menu-items", name: T("أصناف القائمة", "Menu items", "פריטי תפריט"), fields: [f.text("dish", T("الصنف", "Dish", "מנה"), { required: true }), f.long("about", T("الوصف", "Description", "תיאור")), f.money("price", T("السعر", "Price", "מחיר")), f.image("photo", T("صورة", "Photo", "תמונה")), f.select("section", T("القسم", "Section", "קטגוריה"), [["starters", T("مقبلات", "Starters", "ראשונות")], ["mains", T("رئيسي", "Mains", "עיקריות")], ["desserts", T("حلو", "Desserts", "קינוחים")], ["drinks", T("مشروبات", "Drinks", "משקאות")]], { required: true })] },
    page: { slug: "/menu", title: T("القائمة", "Menu", "תפריט"), intro: T("طبخ البيت، كل يوم.", "Home cooking, every day.", "בישול ביתי, כל יום."), list: { feed: "show", title: T("أصنافنا", "Our dishes", "המנות שלנו"), card: [["dish", T("الصنف", "Dish", "מנה")], ["about", T("الوصف", "Description", "תיאור")], ["price", T("السعر", "Price", "מחיר")]], empty: T("القائمة عم تتجهّز.", "The menu is being prepared.", "התפריט בהכנה.") } },
  }),
  feature({
    key: "feat-branches-page",
    category: "content",
    name: T("صفحة الفروع", "A branches page", "עמוד סניפים"),
    note: T("الفروع بعنوانها وتلفونها وساعاتها ورابط الخريطة، من جدول.", "Branches with address, phone, hours and a map link, from a table.", "סניפים עם כתובת, טלפון, שעות וקישור למפה, מטבלה."),
    table: { slug: "branches-page", name: T("الفروع", "Branches", "סניפים"), fields: [f.text("name", T("الفرع", "Branch", "סניף"), { required: true }), f.text("city", T("المدينة", "City", "עיר")), f.long("address", T("العنوان", "Address", "כתובת")), f.phone("phone", T("التلفون", "Phone", "טלפון")), f.text("hours", T("الساعات", "Hours", "שעות")), f.link("map", T("الخريطة", "Map", "מפה"))] },
    page: { slug: "/branches", title: T("فروعنا", "Our branches", "הסניפים שלנו"), intro: T("لاقينا بأقرب فرع.", "Find us at the nearest branch.", "מצאו אותנו בסניף הקרוב."), list: { feed: "show", title: T("الفروع", "Branches", "סניפים"), card: [["name", T("الفرع", "Branch", "סניף")], ["address", T("العنوان", "Address", "כתובת")], ["hours", T("الساعات", "Hours", "שעות")], ["phone", T("التلفون", "Phone", "טלפון")]], empty: T("قريباً.", "Coming soon.", "בקרוב.") } },
  }),
  feature({
    key: "feat-team-page",
    category: "content",
    name: T("صفحة الفريق", "A team page", "עמוד צוות"),
    note: T("مين إحنا: الاسم والدور والصورة وكلمة عن كل واحد، من جدول.", "Who we are: name, role, photo and a line about each, from a table.", "מי אנחנו: שם, תפקיד, תמונה ומשפט על כל אחד, מטבלה."),
    table: { slug: "team-page", name: T("الفريق", "Team", "צוות"), fields: [f.text("name", T("الاسم", "Name", "שם"), { required: true }), f.text("role", T("الدور", "Role", "תפקיד")), f.image("photo", T("الصورة", "Photo", "תמונה")), f.long("bio", T("عنه", "About", "עליו"))] },
    page: { slug: "/team", title: T("فريقنا", "Our team", "הצוות שלנו"), intro: T("الناس ورا كل قطعة.", "The people behind every piece.", "האנשים מאחורי כל פריט."), list: { feed: "show", title: T("الفريق", "Team", "צוות"), card: [["name", T("الاسم", "Name", "שם")], ["role", T("الدور", "Role", "תפקיד")], ["bio", T("عنه", "About", "עליו")]], empty: T("قريباً.", "Coming soon.", "בקרוב."), } },
  }),
  feature({
    key: "feat-events-calendar",
    category: "content",
    name: T("روزنامة الفعاليات", "An events calendar", "לוח אירועים"),
    note: T("الفعاليات الجاية من جدول، وفورم «ذكّرني» بيسجّل الزبون ليوصله تذكير.", "Upcoming events from a table, and a “remind me” form that signs a shopper up for a reminder.", "אירועים קרובים מטבלה, וטופס «תזכירו לי» שרושם לתזכורת."),
    table: { slug: "events-calendar", name: T("الفعاليات", "Events", "אירועים"), fields: [f.text("title", T("الفعالية", "Event", "אירוע"), { required: true }), f.datetime("startsAt", T("الموعد", "When", "מתי"), { required: true }), f.text("place", T("المكان", "Place", "מקום")), f.long("about", T("عنها", "About", "על האירוע"))] },
    page: { slug: "/events", title: T("الفعاليات", "Events", "אירועים"), intro: T("شو جاي عنا.", "What's coming up.", "מה בקרוב."), list: { feed: "show", title: T("الجاي", "Coming up", "בקרוב"), card: [["title", T("الفعالية", "Event", "אירוע")], ["startsAt", T("الموعد", "When", "מתי")], ["place", T("المكان", "Place", "מקום")]], empty: T("ما في فعاليات هلأ.", "No events now.", "אין אירועים כרגע.") } },
    form: { fields: [A.text("event", T("أي فعالية", "Which event", "איזה אירוע"), true), A.phone()], fn: "event-remind", button: T("ذكّرني", "Remind me", "תזכירו לי") },
    extra: {
      tables: [table("remind", "event-reminders", T("تذكيرات الفعاليات", "Event reminders", "תזכורות לאירועים"), [f.text("event", T("الفعالية", "Event", "אירוע"), { required: true }), f.phone("phone", T("التلفون", "Phone", "טלפון"), { required: true }), f.bool("sent", T("انبعت", "Sent", "נשלח"), { default: false })])],
      fns: [
        { key: "remind", name: "سجّل تذكير", inputs: [i.text("event", { required: true, max: 120 }), i.phone("phone", { required: true })], on: on.call("event-remind", "public", 5), do: [s.add("remind", { event: "{{input.event}}", phone: "{{input.phone}}" }), s.ret("منذكّرك قبل بيوم ⏰")] },
        { key: "send", name: "ابعت التذكيرات", note: "كل يوم الساعة 10: فعاليات بكرا", inputs: [i.text("at")], on: on.daily("10:00"), do: [s.code("const t = new Date(Date.now() + 26 * 3600e3); return { from: t.toISOString().slice(0, 10) + 'T00:00:00.000Z', to: t.toISOString().slice(0, 10) + 'T23:59:59.999Z' };", {}, "tomorrow"), s.find("main", "soon", [where("startsAt", "between", "{{tomorrow.from}}", "{{tomorrow.to}}")], { limit: 10 }), s.each("{{soon}}", "ev", [s.find("remind", "people", [where("event", "is", "{{ev.title}}"), where("sent", "isFalse")], { limit: 20 }), s.each("{{people}}", "p", [s.whatsapp("تذكير: «{{ev.title}}» بكرا 🎉", "{{p.phone}}"), s.change("remind", "{{p.id}}", { sent: true })])])] },
      ],
    },
  }),
  feature({
    key: "feat-recipes",
    category: "content",
    name: T("وصفات", "Recipes", "מתכונים"),
    note: T("وصفات بمكوّناتها وطريقتها وصورها، لمتاجر الأكل والبهارات والأدوات.", "Recipes with ingredients, method and pictures, for food, spice and kitchenware shops.", "מתכונים עם מרכיבים, אופן הכנה ותמונות, לחנויות אוכל, תבלינים וכלים."),
    table: { slug: "recipe-book", name: T("الوصفات", "Recipes", "מתכונים"), fields: [f.text("title", T("الوصفة", "Recipe", "מתכון"), { required: true }), f.image("photo", T("الصورة", "Photo", "תמונה")), f.number("minutes", T("الدقايق", "Minutes", "דקות")), f.long("ingredients", T("المكوّنات", "Ingredients", "מרכיבים")), f.long("method", T("الطريقة", "Method", "אופן הכנה"))] },
    page: { slug: "/recipes", title: T("وصفاتنا", "Our recipes", "המתכונים שלנו"), intro: T("طبخات بمنتجاتنا.", "Dishes made with our products.", "מנות עם המוצרים שלנו."), list: { feed: "show", title: T("الوصفات", "Recipes", "מתכונים"), card: [["title", T("الوصفة", "Recipe", "מתכון")], ["minutes", T("الدقايق", "Minutes", "דקות")], ["ingredients", T("المكوّنات", "Ingredients", "מרכיבים")]], empty: T("الوصفات جاية.", "Recipes coming.", "מתכונים בדרך.") } },
  }),
  feature({
    key: "feat-portfolio-page",
    category: "content",
    name: T("أعمالنا", "Our work", "העבודות שלנו"),
    note: T("معرض أعمال سابقة بصورها وقصتها، وفورم «بدّي متله».", "A gallery of past work with pictures and stories, and an “I want one like it” form.", "גלריית עבודות קודמות עם תמונות וסיפור, וטופס «רוצה כזה»."),
    table: { slug: "our-work", name: T("الأعمال", "Work", "עבודות"), fields: [f.text("title", T("العمل", "Work", "עבודה"), { required: true }), f.image("cover", T("الصورة", "Picture", "תמונה")), f.long("story", T("القصة", "Story", "סיפור"))] },
    page: { slug: "/work", title: T("أعمالنا", "Our work", "העבודות שלנו"), intro: T("شي عملناه وبنفتخر فيه.", "Things we made and are proud of.", "דברים שעשינו וגאים בהם."), list: { feed: "show", title: T("الأعمال", "Work", "עבודות"), card: [["title", T("العمل", "Work", "עבודה")], ["story", T("القصة", "Story", "סיפור")]], empty: T("قريباً.", "Coming soon.", "בקרוב.") } },
    form: { fields: [A.name(), A.phone(), A.long("idea", T("فكرتك", "Your idea", "הרעיון שלכם"), true)], fn: "want-one", button: T("بدّي متله", "I want one", "רוצה כזה") },
    extra: { tables: [table("leads", "work-leads", T("طلبات من صفحة الأعمال", "Requests from the work page", "בקשות מעמוד העבודות"), [f.text("name", T("الاسم", "Name", "שם"), { required: true }), f.phone("phone", T("التلفون", "Phone", "טלפון"), { required: true }), f.long("idea", T("الفكرة", "Idea", "רעיון"))])], fns: [{ key: "want", name: "بدّي متله", inputs: [i.text("name", { required: true, max: 80 }), i.phone("phone", { required: true }), i.text("idea", { required: true, max: 2000 })], on: on.call("want-one", "public", 3), do: [s.add("leads", { name: "{{input.name}}", phone: "{{input.phone}}", idea: "{{input.idea}}" }), s.whatsapp("طلب من صفحة الأعمال: {{input.name}} {{input.phone}}"), s.ret("وصل! منحكيك قريب.")] }] },
  }),
  feature({
    key: "feat-press",
    category: "content",
    name: T("حكوا عنا", "In the press", "כתבו עלינו"),
    note: T("مقالات ولقاءات حكت عنك، بالرابط والمصدر والتاريخ.", "Articles and interviews about you, with link, source and date.", "כתבות וראיונות עליכם, עם קישור, מקור ותאריך."),
    table: { slug: "press", name: T("حكوا عنا", "Press", "עיתונות"), fields: [f.text("title", T("العنوان", "Title", "כותרת"), { required: true }), f.text("source", T("المصدر", "Source", "מקור")), f.date("day", T("التاريخ", "Date", "תאריך")), f.link("link", T("الرابط", "Link", "קישור"))] },
    page: { slug: "/press", title: T("حكوا عنا", "In the press", "כתבו עלינו"), intro: T("شو انكتب عنا.", "What was written about us.", "מה נכתב עלינו."), list: { feed: "show", title: T("المقالات", "Articles", "כתבות"), card: [["title", T("العنوان", "Title", "כותרת")], ["source", T("المصدر", "Source", "מקור")], ["day", T("التاريخ", "Date", "תאריך")]], empty: T("قريباً.", "Coming soon.", "בקרוב.") } },
  }),
  feature({
    key: "feat-knowledge-base",
    category: "content",
    name: T("مركز المساعدة", "A help center", "מרכז עזרה"),
    note: T("شروحات بخطوات بأقسام، وزر «فادتني» بيعدّ قديش كل شرح بيفيد.", "Step-by-step guides in sections, and a “this helped” button that counts how useful each is.", "מדריכים צעד אחר צעד בקטגוריות, וכפתור «עזר לי» שסופר כמה כל מדריך מועיל."),
    table: { slug: "guides", name: T("الشروحات", "Guides", "מדריכים"), fields: [f.text("title", T("الشرح", "Guide", "מדריך"), { required: true }), f.long("steps", T("الخطوات", "Steps", "צעדים")), f.number("helped", T("فادت", "Helped", "עזר"), { default: 0 })] },
    page: { slug: "/guides", title: T("مركز المساعدة", "Help center", "מרכז עזרה"), intro: T("كيف بتعمل كل شي، خطوة بخطوة.", "How to do everything, step by step.", "איך עושים הכול, צעד אחר צעד."), list: { feed: "live", title: T("الشروحات", "Guides", "מדריכים"), card: [["title", T("الشرح", "Guide", "מדריך")], ["steps", T("الخطوات", "Steps", "צעדים")]], empty: T("الشروحات جاية.", "Guides coming.", "מדריכים בדרך."), action: { label: T("فادتني 👍", "This helped 👍", "עזר לי 👍"), fn: "guide-helped" } } },
    extra: { fns: [{ key: "helped", name: "فادتني", inputs: [i.text("id", { required: true, max: 40 })], on: on.call("guide-helped", "customer", 20), do: [s.get("main", "{{input.id}}", "g"), s.set("n", "{{g.helped}}"), s.set("n", 1, "add"), s.change("main", "{{input.id}}", { helped: "{{n}}" }), s.ret("شكراً!")] }] },
  }),
];
