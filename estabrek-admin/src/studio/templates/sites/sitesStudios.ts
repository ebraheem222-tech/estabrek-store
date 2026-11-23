/**
 * Game studios' sites (wave G7d1 of docs/sites-300-plan.ar.md): a FiveM script studio (its scripts and MLOs sold through
 * its own Tebex webstore, as Cfx.re's rules ask: protected "escrow" files reach the buyer's Cfx.re account) and a
 * Minecraft plugin studio (its plugins and maps sold by the store itself, each with its serial, licence and download).
 * Both have docs for each product by version, a changelog, support tickets, and their Discord as their pulse.
 */
import { w } from "../words";
import { site } from "./blueprint";

/** The FiveM studio's products: its docs, changelog and tickets name them. */
const FIVEM_PRODUCTS: Array<[string, ReturnType<typeof w>]> = [
  ["garage", w("كراج متقدّم", "Advanced garage", "מוסך מתקדם")],
  ["phone", w("تلفون المدينة", "City phone", "טלפון העיר")],
  ["policeMlo", w("MLO مركز شرطة", "Police station MLO", "MLO תחנת משטרה")],
];
/** 304: a FiveM script studio: scripts and MLOs on Tebex, docs, a changelog for each script, and support tickets. */
export const FIVEM_STUDIO = site({
  key: "site-fivem-studio",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("استوديو سكربتات FiveM: سكربتات النخلة", "FiveM script studio: Palm Scripts", "סטודיו סקריפטים ל־FiveM: Palm Scripts"),
  note: w("موقع استوديو سكربتات و MLO لـ FiveM: المنتجات من متجر Tebex تبع الاستوديو (الملفات المحمية بتوصل على حساب Cfx.re)، توثيق لكل سكربت بنسخته، التحديثات لكل سكربت، تذاكر دعم، الفريق، والديسكورد.", "A FiveM script and MLO studio's site: the products from the studio's Tebex webstore (protected files reach the buyer's Cfx.re account), docs for each script by version, each script's changelog, support tickets, the team, and the Discord.", "אתר לסטודיו סקריפטים ו־MLO ל־FiveM: המוצרים מחנות ה־Tebex של הסטודיו (קבצים מוגנים מגיעים לחשבון Cfx.re של הקונה), תיעוד לכל סקריפט לפי גרסה, יומן שינויים לכל סקריפט, פניות תמיכה, הצוות והדיסקורד."),
  biz: { name: w("سكربتات النخلة", "Palm Scripts", "Palm Scripts"), address: w("أونلاين", "Online", "אונליין"), hours: w("الدعم من الأحد للخميس", "Support Sunday to Thursday", "תמיכה מראשון עד חמישי"), phone: "0", email: "support@palmscripts.example", city: "" },
  pack: {
    label: w("سكربتات النخلة", "Palm Scripts", "Palm Scripts"),
    eyebrow: w("سكربتات و MLO لـ FiveM", "Scripts and MLOs for FiveM", "סקריפטים ו־MLO ל־FiveM"),
    title: w("سكربتات بتشتغل من أول مرّة", "Scripts that work the first time", "סקריפטים שעובדים מהפעם הראשונה"),
    sub: w("لـ ESX و QBCore، خفيفة على السيرفر، ومعها توثيق ودعم حقيقي.", "For ESX and QBCore, light on the server, with docs and real support.", "ל־ESX ול־QBCore, קלים על השרת, עם תיעוד ותמיכה אמיתית."),
    cta: w("شوف السكربتات", "See the scripts", "לראות את הסקריפטים"),
    product: w("السكربتات", "The scripts", "הסקריפטים"),
    story: w("بلّشنا نكتب سكربتات لسيرفرنا، وصار في سيرفرات كتير بدها نفسها. هلّق هاد شغلنا.", "We started writing scripts for our own server, then many servers wanted them. Now it's our work.", "התחלנו לכתוב סקריפטים לשרת שלנו, ואז הרבה שרתים רצו אותם. עכשיו זו העבודה שלנו."),
    collection: w("آخر التحديثات", "Latest updates", "העדכונים האחרונים"),
    icon: "star",
  },
  home: "/studio",
  modules: {
    status: {
      game: "discord",
      address: "https://discord.gg/palmscripts",
      // The studio's Discord is its status: no second button for it.
      discord: "",
      join: w("فوت عالديسكورد", "Join the Discord", "להצטרף לדיסקורד"),
      steps: [
        [w("اشتري عند Tebex", "Buy on Tebex", "לקנות ב־Tebex"), w("كل سكربت محمي، وبيوصل على حساب Cfx.re تبعك.", "Each script is protected, and reaches your Cfx.re account.", "כל סקריפט מוגן, ומגיע לחשבון Cfx.re שלכם.")],
        [w("نزّله من Keymaster", "Download it from Keymaster", "להוריד מ־Keymaster"), w("من «Granted Assets» بحساب Cfx.re.", "From «Granted Assets» on your Cfx.re account.", "מ־«Granted Assets» בחשבון Cfx.re.")],
        [w("ركّبه بالتوثيق", "Install it with the docs", "להתקין עם התיעוד"), w("خطوة بخطوة لكل سكربت، وإذا علقت افتح تذكرة.", "Step by step for each script; if you get stuck, open a ticket.", "צעד אחר צעד לכל סקריפט; אם נתקעים, פותחים פנייה.")],
      ],
    },
    packages: {
      title: w("السكربتات", "Scripts", "סקריפטים"),
      sub: w("كل السكربتات و MLO من متجرنا على Tebex. الدفع والتسليم عند Tebex.", "Every script and MLO from our Tebex webstore. Payment and delivery on Tebex.", "כל הסקריפטים וה־MLO מחנות ה־Tebex שלנו. התשלום והמסירה ב־Tebex."),
      pick: w("سكربتاتنا", "Our scripts", "הסקריפטים שלנו"),
      pickSub: w("كل سكربت محمي (escrow) وبيوصلك على حساب Cfx.re تبعك. الدفع عند Tebex، شريك البيع الرسمي لـ FiveM.", "Each script is protected (escrow) and reaches your Cfx.re account. Payment on Tebex, FiveM's official selling partner.", "כל סקריפט מוגן (escrow) ומגיע לחשבון Cfx.re שלכם. התשלום ב־Tebex, שותף המכירות הרשמי של FiveM."),
    },
    docs: {
      title: w("التوثيق", "Docs", "תיעוד"),
      sub: w("تركيب، إعداد وأوامر لكل سكربت، بنسخته.", "Installing, setting up and commands for each script, by its version.", "התקנה, הגדרה ופקודות לכל סקריפט, לפי הגרסה."),
      products: FIVEM_PRODUCTS,
      rows: [
        { slug: "garage-install", product: "garage", title: w("تركيب الكراج", "Installing the garage", "התקנת המוסך"), version: "2.1", body: w("حط المجلّد بـ resources، زيد ensure palm-garage بـ server.cfg، وشغّل ملف SQL مرّة وحدة. بيشتغل مع ESX و QBCore بلا تغيير.", "Put the folder in resources, add ensure palm-garage to server.cfg, and run the SQL file once. It works with ESX and QBCore unchanged.", "שימו את התיקייה ב־resources, הוסיפו ensure palm-garage ל־server.cfg, והריצו את קובץ ה־SQL פעם אחת. עובד עם ESX ו־QBCore בלי שינוי.") },
        { slug: "garage-config", product: "garage", title: w("إعدادات الكراج", "The garage's settings", "הגדרות המוסך"), version: "2.1", body: w("بملف config.lua: أماكن الكراجات، سعر الحجز، وكم سيارة لكل لاعب.", "In config.lua: the garages' places, the impound price, and how many cars each player has.", "בקובץ config.lua: מיקומי המוסכים, מחיר הגרירה, וכמה רכבים לכל שחקן.") },
        { slug: "phone-install", product: "phone", title: w("تركيب التلفون", "Installing the phone", "התקנת הטלפון"), version: "1.4", body: w("بدّه oxmysql. حط المجلّد، زيد ensure palm-phone، وغيّر اللغة من config.", "It needs oxmysql. Put the folder in, add ensure palm-phone, and change the language in config.", "צריך oxmysql. שימו את התיקייה, הוסיפו ensure palm-phone, ושנו את השפה ב־config.") },
        { slug: "police-mlo-install", product: "policeMlo", title: w("تركيب مركز الشرطة", "Installing the police station", "התקנת תחנת המשטרה"), version: "1.0", body: w("MLO بيحل محل المركز بوسط المدينة. شيل أي MLO تاني بنفس المكان قبل.", "The MLO replaces the station downtown. Remove any other MLO in the same place first.", "ה־MLO מחליף את התחנה במרכז העיר. הסירו קודם כל MLO אחר באותו מקום.") },
      ],
    },
    releases: {
      title: w("التحديثات", "Changelog", "יומן שינויים"),
      sub: w("كل نسخة لكل سكربت، الأحدث أول.", "Every version of every script, newest first.", "כל גרסה של כל סקריפט, החדשות קודם."),
      products: FIVEM_PRODUCTS,
      rows: [
        { product: "garage", version: "2.1.0", date: "2026-11-18", kind: "added", changes: w("حجز السيارات (impound) مع سعر بيحدّده السيرفر.", "Impounding cars, with a price the server sets.", "גרירת רכבים, עם מחיר שהשרת קובע.") },
        { product: "phone", version: "1.4.2", date: "2026-11-12", kind: "fixed", changes: w("الرسائل الصوتية ما كانت توصل بعد ريستارت.", "Voice messages didn't arrive after a restart.", "הודעות קוליות לא הגיעו אחרי ריסטרט.") },
        { product: "garage", version: "2.0.0", date: "2026-10-30", kind: "changed", changes: w("واجهة جديدة، وصار يشتغل مع QBCore.", "A new interface, and it now works with QBCore.", "ממשק חדש, ועכשיו עובד עם QBCore.") },
        { product: "policeMlo", version: "1.0.0", date: "2026-10-20", kind: "added", changes: w("أول نسخة: ثلاث طوابق وزنازين وموقف.", "The first version: three floors, cells and a car park.", "הגרסה הראשונה: שלוש קומות, תאים וחניון.") },
      ],
    },
    tickets: {
      title: w("الدعم", "Support", "תמיכה"),
      sub: w("علقت بتركيب أو لقيت غلط؟ افتح تذكرة والفريق بيرد خلال يوم شغل.", "Stuck installing or found a bug? Open a ticket and the team answers within a working day.", "נתקעתם בהתקנה או מצאתם באג? פתחו פנייה והצוות יענה תוך יום עבודה."),
      products: FIVEM_PRODUCTS,
    },
    team: {
      title: w("الفريق", "The team", "הצוות"),
      sub: w("اللي بيكتبوا كل سطر.", "Those who write every line.", "מי שכותבים כל שורה."),
      rows: [
        { name: w("سليم", "Salim", "סלים"), role: w("Lua والسيرفر", "Lua and the server side", "Lua וצד השרת"), bio: w("بيكتب سكربتات FiveM من 2019.", "Writing FiveM scripts since 2019.", "כותב סקריפטים ל־FiveM מאז 2019.") },
        { name: w("ريم", "Reem", "רים"), role: w("الواجهات و MLO", "Interfaces and MLOs", "ממשקים ו־MLO"), bio: w("بتصمّم كل شاشة وكل غرفة.", "Designs every screen and every room.", "מעצבת כל מסך וכל חדר.") },
      ],
    },
    questions: { rows: [
      { q: w("بيشتغل مع إطاري؟", "Does it work with my framework?", "זה עובד עם הפריימוורק שלי?"), a: w("كل سكربت بيشتغل مع ESX و QBCore، ومكتوب بصفحته شو بدّه.", "Every script works with ESX and QBCore, and its page says what it needs.", "כל סקריפט עובד עם ESX ו־QBCore, ובעמוד שלו כתוב מה הוא צריך.") },
      { q: w("ليش الملفات محمية؟", "Why are the files protected?", "למה הקבצים מוגנים?"), a: w("هيك Tebex و Cfx.re بيحموا شغلنا. الإعدادات كلها مفتوحة بملف config.", "That's how Tebex and Cfx.re protect our work. All the settings are open in the config file.", "כך Tebex ו־Cfx.re מגינים על העבודה שלנו. כל ההגדרות פתוחות בקובץ ה־config.") },
      { q: w("بقدر أرجّع سكربت؟", "Can I return a script?", "אפשר להחזיר סקריפט?"), a: w("الاسترجاع حسب قواعد Tebex. إذا في مشكلة، افتح تذكرة أول ومنحلّها.", "Refunds follow Tebex's rules. If something's wrong, open a ticket first and we'll fix it.", "החזרים לפי הכללים של Tebex. אם יש בעיה, פתחו פנייה קודם ונפתור אותה.") },
    ] },
    contact: {},
    notify: {},
  },
});

/** The Minecraft studio's products. */
const MC_PRODUCTS: Array<[string, ReturnType<typeof w>]> = [
  ["claims", w("حماية الأراضي", "Land claims", "הגנת שטחים")],
  ["shops", w("دكاكين اللاعبين", "Player shops", "חנויות שחקנים")],
  ["lobbyMap", w("خريطة لوبي جاهزة", "A ready lobby map", "מפת לובי מוכנה")],
];
/** 309: a Minecraft plugin and map studio: sold by the store with serials and licences, docs, a changelog, tickets. */
export const MINECRAFT_STUDIO = site({
  key: "site-minecraft-studio",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("استوديو بلجنات وخرايط ماينكرافت: القمّة", "Minecraft plugin and map studio: Summit", "סטודיו פלאגינים ומפות למיינקראפט: Summit"),
  note: w("موقع استوديو بلجنات وخرايط ماينكرافت: المنتجات من المتجر نفسه (كل وحدة برقم رخصة وتنزيل محمي)، توثيق لكل منتج بنسخته، التحديثات، تذاكر دعم، والديسكورد.", "A Minecraft plugin and map studio's site: the products from the store itself (each with a licence serial and a protected download), docs for each product by version, the changelog, support tickets, and the Discord.", "אתר לסטודיו פלאגינים ומפות למיינקראפט: המוצרים מהחנות עצמה (כל אחד עם מספר רישיון והורדה מוגנת), תיעוד לכל מוצר לפי גרסה, יומן שינויים, פניות תמיכה והדיסקורד."),
  biz: { name: w("القمّة", "Summit", "Summit"), address: w("أونلاين", "Online", "אונליין"), hours: w("الدعم من الأحد للخميس", "Support Sunday to Thursday", "תמיכה מראשון עד חמישי"), phone: "0", email: "support@summitplugins.example", city: "" },
  pack: {
    label: w("القمّة", "Summit", "Summit"),
    eyebrow: w("بلجنات وخرايط لماينكرافت Java", "Plugins and maps for Minecraft Java", "פלאגינים ומפות למיינקראפט Java"),
    title: w("بلجنات خفيفة لسيرفرات كبيرة", "Light plugins for big servers", "פלאגינים קלים לשרתים גדולים"),
    sub: w("لـ Paper و Spigot، مع توثيق لكل نسخة، ورخصة لسيرفرك.", "For Paper and Spigot, with docs for every version, and a licence for your server.", "ל־Paper ול־Spigot, עם תיעוד לכל גרסה, ורישיון לשרת שלכם."),
    cta: w("شوف البلجنات", "See the plugins", "לראות את הפלאגינים"),
    product: w("البلجنات", "The plugins", "הפלאגינים"),
    story: w("كنا نشغّل سيرفر ماينكرافت وما لقينا بلجنات خفيفة متل ما بدنا، فكتبناها.", "We ran a Minecraft server and couldn't find plugins as light as we wanted, so we wrote them.", "הרצנו שרת מיינקראפט ולא מצאנו פלאגינים קלים כמו שרצינו, אז כתבנו אותם."),
    collection: w("آخر التحديثات", "Latest updates", "העדכונים האחרונים"),
    icon: "star",
  },
  home: "/studio",
  modules: {
    status: {
      game: "discord",
      address: "https://discord.gg/summitplugins",
      // The studio's Discord is its status: no second button for it.
      discord: "",
      join: w("فوت عالديسكورد", "Join the Discord", "להצטרף לדיסקורד"),
      steps: [
        [w("اشتري من هون", "Buy here", "לקנות כאן"), w("كل بلجن بصفحته بالمتجر، والدفع من المتجر.", "Each plugin on its page in the store, paid for in the store.", "כל פלאגין בעמוד שלו בחנות, והתשלום בחנות.")],
        [w("خود رخصتك", "Take your licence", "לקבל את הרישיון"), w("رقم الرخصة ورابط التنزيل بصفحة طلبك.", "The licence serial and the download link are on your order's page.", "מספר הרישיון וקישור ההורדה בעמוד ההזמנה שלכם.")],
        [w("ركّبه بالتوثيق", "Install it with the docs", "להתקין עם התיעוד"), w("حط الملف بـ plugins، وكل شي مشروح لكل نسخة.", "Put the file in plugins; everything is explained for each version.", "שימו את הקובץ ב־plugins; הכול מוסבר לכל גרסה.")],
      ],
    },
    goods: {
      title: w("البلجنات والخرايط", "Plugins and maps", "פלאגינים ומפות"),
      sub: w("كل منتج برخصة لسيرفرك، ونسخ جديدة ببلاش.", "Each product with a licence for your server, and new versions for free.", "כל מוצר עם רישיון לשרת שלכם, וגרסאות חדשות בחינם."),
      page: "/plugins",
      how: w("بعد الدفع، رقم الرخصة ورابط التنزيل بيطلعوا بصفحة طلبك. الملف بيوصل مضغوط ومحمي، وكلمة السر هي رقم رخصتك. والنسخ الجديدة بتوصلك على نفس الرابط.", "After paying, the licence serial and the download link show on your order's page. The file comes zipped and protected, and its password is your licence serial. New versions reach you on the same link.", "אחרי התשלום, מספר הרישיון וקישור ההורדה מופיעים בעמוד ההזמנה. הקובץ מגיע דחוס ומוגן, והסיסמה היא מספר הרישיון שלכם. גרסאות חדשות מגיעות באותו קישור."),
      minecraft: true,
    },
    docs: {
      title: w("التوثيق", "Docs", "תיעוד"),
      sub: w("تركيب، أوامر وصلاحيات لكل منتج، بنسخته.", "Installing, commands and permissions for each product, by its version.", "התקנה, פקודות והרשאות לכל מוצר, לפי הגרסה."),
      products: MC_PRODUCTS,
      rows: [
        { slug: "claims-commands", product: "claims", title: w("أوامر حماية الأراضي", "Land claims' commands", "פקודות הגנת השטחים"), version: "3.2", body: w("/claim بيحمي الأرض اللي واقف عليها، /trust بيعطي صاحبك يبني، و /unclaim بيرجعها.", "/claim protects the land you stand on, /trust lets a friend build, and /unclaim gives it back.", "/claim מגן על השטח שעומדים עליו, /trust נותן לחבר לבנות, ו־/unclaim מחזיר אותו.") },
        { slug: "claims-permissions", product: "claims", title: w("الصلاحيات", "Permissions", "הרשאות"), version: "3.2", body: w("summit.claims.use للكل، و summit.claims.admin للطاقم. بتشتغل مع LuckPerms.", "summit.claims.use for everyone, and summit.claims.admin for the staff. Works with LuckPerms.", "summit.claims.use לכולם, ו־summit.claims.admin לצוות. עובד עם LuckPerms.") },
        { slug: "shops-setup", product: "shops", title: w("فتح دكانة", "Opening a shop", "פתיחת חנות"), version: "1.6", body: w("حط صندوق، وعليه لافتة فيها [shop] والسعر.", "Place a chest, with a sign on it saying [shop] and the price.", "שימו תיבה, ועליה שלט עם [shop] והמחיר.") },
        { slug: "lobby-install", product: "lobbyMap", title: w("تركيب اللوبي", "Installing the lobby", "התקנת הלובי"), version: "1.0", body: w("فك الضغط بمجلّد السيرفر وسمّي العالم lobby بـ server.properties.", "Unzip it in the server's folder and name the world lobby in server.properties.", "חלצו בתיקיית השרת וקראו לעולם lobby ב־server.properties.") },
      ],
    },
    releases: {
      title: w("التحديثات", "Changelog", "יומן שינויים"),
      sub: w("كل نسخة لكل منتج، الأحدث أول.", "Every version of every product, newest first.", "כל גרסה של כל מוצר, החדשות קודם."),
      products: MC_PRODUCTS,
      rows: [
        { product: "claims", version: "3.2.0", date: "2026-11-19", kind: "added", changes: w("دعم 1.21، وحدود للأراضي حسب الرتبة.", "Support for 1.21, and land limits by rank.", "תמיכה ב־1.21, ומגבלות שטח לפי דרגה.") },
        { product: "shops", version: "1.6.1", date: "2026-11-11", kind: "fixed", changes: w("الدكانة كانت تبيع وهي فاضية بعد ريستارت.", "A shop sold while empty after a restart.", "חנות מכרה כשהייתה ריקה אחרי ריסטרט.") },
        { product: "lobbyMap", version: "1.0.0", date: "2026-10-28", kind: "added", changes: w("أول نسخة: جزيرة لوبي ببوابات لخمس ألعاب.", "The first version: a lobby island with gates to five games.", "הגרסה הראשונה: אי לובי עם שערים לחמישה משחקים.") },
      ],
    },
    tickets: {
      title: w("الدعم", "Support", "תמיכה"),
      sub: w("علقت أو لقيت غلط؟ افتح تذكرة ومعها نسخة السيرفر والبلجن.", "Stuck or found a bug? Open a ticket with your server's and the plugin's version.", "נתקעתם או מצאתם באג? פתחו פנייה עם הגרסה של השרת ושל הפלאגין."),
      products: MC_PRODUCTS,
    },
    questions: { rows: [
      { q: w("على أي نسخ بيشتغل؟", "Which versions does it run on?", "על אילו גרסאות זה רץ?"), a: w("Paper و Spigot من 1.20 لفوق، ومكتوب بصفحة كل منتج.", "Paper and Spigot from 1.20 up; each product's page says so.", "Paper ו־Spigot מ־1.20 ומעלה; כתוב בעמוד של כל מוצר.") },
      { q: w("الرخصة لكم سيرفر؟", "How many servers is the licence for?", "לכמה שרתים הרישיון?"), a: w("لشبكة وحدة: كل سيرفراتها. لشبكة تانية بدّك رخصة تانية.", "For one network: all its servers. Another network needs another licence.", "לרשת אחת: כל השרתים שלה. לרשת אחרת צריך רישיון נוסף.") },
      { q: w("النسخ الجديدة ببلاش؟", "Are new versions free?", "גרסאות חדשות בחינם?"), a: w("أيوا، كل نسخ المنتج بتوصلك على نفس رابط التنزيل.", "Yes, every version of the product reaches you on the same download link.", "כן, כל גרסה של המוצר מגיעה אליכם באותו קישור הורדה.") },
    ] },
    contact: {},
    notify: {},
  },
});
