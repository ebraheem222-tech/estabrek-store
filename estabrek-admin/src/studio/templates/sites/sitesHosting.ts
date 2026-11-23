/**
 * The last two game sites (wave G7d2 of docs/sites-300-plan.ar.md): a game server hosting company (plans for each game,
 * ordered and paid for through the store itself, a status page of its machines read as websites, and support tickets)
 * and a server list (owners add their servers for the staff's yes, each one's live status read by our server, and a
 * daily vote from signed-in players, the month's votes ranking them).
 */
import { w } from "../words";
import { site } from "./blueprint";

const GAMES_SUPPORT: Array<[string, ReturnType<typeof w>]> = [
  ["minecraft", w("ماينكرافت", "Minecraft", "מיינקראפט")],
  ["fivem", w("FiveM", "FiveM", "FiveM")],
  ["survival", w("Rust و Valheim", "Rust and Valheim", "Rust ו־Valheim")],
];

/** 319: a game server hosting company: plans for each game, ordering through the store, a status page, and support. */
export const GAME_HOSTING = site({
  key: "site-game-hosting",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("استضافة سيرفرات ألعاب: سحابة اللعب", "Game server hosting: Play Cloud", "אחסון שרתי משחקים: Play Cloud"),
  note: w("موقع شركة استضافة سيرفرات ألعاب: خطط لكل لعبة بأسعارها، «اطلب سيرفرك» بالدفع من المتجر نفسه و«سيرفراتي» بمعلومات الدخول، صفحة حالة الأجهزة (كل جهاز شغّال ولا واقف وقدّيش بيرد)، تذاكر دعم، وأسئلة.", "A game server hosting company's site: plans for each game with their prices, «order your server» paid through the store itself and «my servers» with the access details, a status page of the machines (each one up or down and how fast it answers), support tickets, and questions.", "אתר לחברת אחסון שרתי משחקים: תוכניות לכל משחק עם המחירים, «להזמין שרת» בתשלום דרך החנות עצמה ו«השרתים שלי» עם פרטי הגישה, עמוד מצב המכונות (כל מכונה פועלת או לא וכמה מהר היא עונה), פניות תמיכה ושאלות."),
  biz: { name: w("سحابة اللعب", "Play Cloud", "Play Cloud"), address: w("أونلاين", "Online", "אונליין"), hours: w("الدعم 24/7", "Support 24/7", "תמיכה 24/7"), phone: "0", email: "support@playcloud.example", city: "" },
  pack: {
    label: w("سحابة اللعب", "Play Cloud", "Play Cloud"),
    eyebrow: w("استضافة سيرفرات ألعاب", "Game server hosting", "אחסון שרתי משחקים"),
    title: w("سيرفرك جاهز بدقايق", "Your server, ready in minutes", "השרת שלכם, מוכן בדקות"),
    sub: w("ماينكرافت، FiveM، Rust و Valheim على أجهزة سريعة بأوروبا والخليج. بتدفع بالشهر وبتلغي إيمتى ما بدّك.", "Minecraft, FiveM, Rust and Valheim on fast machines in Europe and the Gulf. Pay monthly, cancel whenever you like.", "מיינקראפט, FiveM, Rust ו־Valheim על מכונות מהירות באירופה ובמפרץ. משלמים חודשית ומבטלים מתי שרוצים."),
    cta: w("شوف الخطط", "See the plans", "לראות את התוכניות"),
    product: w("الخطط", "The plans", "התוכניות"),
    story: w("كنا نستأجر سيرفرات لأصحابنا ونتعب من البطء والدعم، فبنينا استضافة متل ما بدنا إياها.", "We rented servers for our friends and got tired of slowness and poor support, so we built hosting the way we wanted it.", "שכרנו שרתים לחברים ונמאס לנו מאיטיות ותמיכה גרועה, אז בנינו אחסון כמו שרצינו."),
    collection: w("الخطط", "The plans", "התוכניות"),
    icon: "star",
  },
  home: "/cloud",
  modules: {
    status: {
      game: "web",
      address: "https://panel.playcloud.example",
      discord: "https://discord.gg/playcloud",
      join: w("افتح لوحة التحكم", "Open the control panel", "לפתוח את לוח הבקרה"),
      steps: [
        [w("اختار خطة", "Pick a plan", "לבחור תוכנית"), w("حسب لعبتك وكم لاعب عندك.", "By your game and how many players you have.", "לפי המשחק וכמה שחקנים יש לכם.")],
        [w("ادفع من هون", "Pay here", "לשלם כאן"), w("صفحة دفع آمنة، بالشهر.", "A safe payment page, monthly.", "עמוד תשלום מאובטח, חודשי.")],
        [w("فوت على لوحتك", "Open your panel", "להיכנס ללוח"), w("معلومات الدخول بتوصلك عالإيميل وبصفحة «سيرفراتي».", "The access details reach you by email and on «my servers».", "פרטי הגישה מגיעים במייל וב«השרתים שלי».")],
      ],
    },
    servers: {
      title: w("حالة الأجهزة", "Machines' status", "מצב המכונות"),
      sub: w("كل جهاز هلّق: شغّال ولا واقف، وقدّيش بيرد. منفحصها كل دقيقة.", "Each machine now: up or down, and how fast it answers. Checked every minute.", "כל מכונה עכשיו: פועלת או לא, וכמה מהר היא עונה. נבדק כל דקה."),
      list: [
        { key: "fra1", title: w("فرانكفورت 1", "Frankfurt 1", "פרנקפורט 1"), line: w("ماينكرافت و FiveM.", "Minecraft and FiveM.", "מיינקראפט ו־FiveM."), game: "web", address: "https://fra1.playcloud.example/health" },
        { key: "ams1", title: w("أمستردام 1", "Amsterdam 1", "אמסטרדם 1"), line: w("Rust و Valheim.", "Rust and Valheim.", "Rust ו־Valheim."), game: "web", address: "https://ams1.playcloud.example/health" },
        { key: "dxb1", title: w("دبي 1", "Dubai 1", "דובאי 1"), line: w("أقرب جهاز للخليج والشرق الأوسط.", "The closest machine to the Gulf and the Middle East.", "המכונה הקרובה ביותר למפרץ ולמזרח התיכון."), game: "web", address: "https://dxb1.playcloud.example/health" },
      ],
    },
    offers: {
      table: "plans",
      page: "/plans",
      title: w("الخطط", "Plans", "תוכניות"),
      sub: w("بالشهر، بلا عقد. كل خطة فيها حماية من الهجمات ونسخ احتياطية كل يوم.", "Monthly, no contract. Every plan has attack protection and daily backups.", "חודשי, בלי התחייבות. כל תוכנית כוללת הגנה מהתקפות וגיבויים יומיים."),
      item: w("الخطة", "Plan", "תוכנית"),
      look: "cards",
      groups: GAMES_SUPPORT,
      price: w("السعر بالشهر", "Price a month", "מחיר לחודש"),
      extra: w("شو فيها", "What it holds", "מה כלול"),
      rows: [
        { slug: "mc-2gb", title: w("ماينكرافت صغير", "Minecraft small", "מיינקראפט קטן"), text: w("لأصحاب وعيلة: سرفايفل بلا تقطيع.", "For friends and family: survival with no lag.", "לחברים ולמשפחה: הישרדות בלי לאגים."), group: "minecraft", price: 25, extra: w("2 GB · لحد 10 لاعبين", "2 GB · up to 10 players", "2 GB · עד 10 שחקנים") },
        { slug: "mc-6gb", title: w("ماينكرافت كبير", "Minecraft large", "מיינקראפט גדול"), text: w("لسيرفر عام ببلجنات كتير.", "For a public server with many plugins.", "לשרת ציבורי עם הרבה פלאגינים."), group: "minecraft", price: 60, extra: w("6 GB · لحد 60 لاعب", "6 GB · up to 60 players", "6 GB · עד 60 שחקנים"), featured: true },
        { slug: "fivem-48", title: w("FiveM 48", "FiveM 48", "FiveM 48"), text: w("سيرفر رول بلاي بيبلّش.", "A roleplay server getting started.", "שרת רולפליי שמתחיל."), group: "fivem", price: 90, extra: w("8 GB · 48 لاعب", "8 GB · 48 players", "8 GB · 48 שחקנים"), featured: true },
        { slug: "fivem-128", title: w("FiveM 128", "FiveM 128", "FiveM 128"), text: w("لمدينة كاملة بسكربتات تقيلة.", "For a whole city with heavy scripts.", "לעיר שלמה עם סקריפטים כבדים."), group: "fivem", price: 180, extra: w("16 GB · 128 لاعب", "16 GB · 128 players", "16 GB · 128 שחקנים") },
        { slug: "rust-100", title: w("Rust 100", "Rust 100", "Rust 100"), text: w("مسح شهري ومودات Oxide.", "Monthly wipes and Oxide mods.", "מחיקה חודשית ומודים של Oxide."), group: "survival", price: 120, extra: w("12 GB · 100 لاعب", "12 GB · 100 players", "12 GB · 100 שחקנים"), featured: true },
        { slug: "valheim-10", title: w("Valheim 10", "Valheim 10", "Valheim 10"), text: w("عالم واحد لعشرة أصحاب.", "One world for ten friends.", "עולם אחד לעשרה חברים."), group: "survival", price: 35, extra: w("4 GB · 10 لاعبين", "4 GB · 10 players", "4 GB · 10 שחקנים") },
      ],
    },
    hosting: {
      title: w("اطلب سيرفر", "Order a server", "להזמין שרת"),
      sub: w("اختار الخطة والمكان والاسم، وادفع. منجهّزه ومنبعتلك معلومات الدخول.", "Pick the plan, the place and the name, and pay. We set it up and send you the access details.", "בחרו תוכנית, מיקום ושם, ושלמו. אנחנו מקימים ושולחים את פרטי הגישה."),
      locations: [
        ["fra", w("فرانكفورت", "Frankfurt", "פרנקפורט")],
        ["ams", w("أمستردام", "Amsterdam", "אמסטרדם")],
        ["dxb", w("دبي", "Dubai", "דובאי")],
      ],
    },
    tickets: {
      title: w("الدعم", "Support", "תמיכה"),
      sub: w("مشكلة بسيرفرك؟ افتح تذكرة والفريق بيرد بسرعة، ليل نهار.", "A problem with your server? Open a ticket and the team answers fast, day and night.", "בעיה בשרת? פתחו פנייה והצוות יענה מהר, יום ולילה."),
      products: GAMES_SUPPORT,
    },
    questions: { rows: [
      { q: w("بقدر ألغي إيمتى ما بدّي؟", "Can I cancel whenever I like?", "אפשר לבטל מתי שרוצים?"), a: w("أيوا، الدفع بالشهر وبلا عقد. بتضل الخطة لآخر الشهر المدفوع.", "Yes, payment is monthly with no contract. The plan runs to the end of the paid month.", "כן, התשלום חודשי בלי התחייבות. התוכנית פעילה עד סוף החודש ששולם.") },
      { q: w("قدّيش بياخد ليجهز؟", "How long does it take to be ready?", "כמה זמן לוקח עד שזה מוכן?"), a: w("عادة أقل من ساعة بعد الدفع، وبيوصلك إيميل.", "Usually under an hour after paying, and you get an email.", "בדרך כלל פחות משעה אחרי התשלום, ומקבלים מייל.") },
      { q: w("شو يعني حالة الأجهزة؟", "What is the machines' status?", "מה זה מצב המכונות?"), a: w("كل جهاز منفحصه كل دقيقة: إذا واقف بتشوفه هون قبل ما تسأل.", "We check each machine every minute: if one is down, you see it here before you ask.", "בודקים כל מכונה כל דקה: אם אחת לא פועלת, רואים את זה כאן עוד לפני ששואלים.") },
    ] },
    contact: {},
    notify: {},
  },
});

/** 320: a server list: owners add their servers for the staff's yes, each one's live status, and a daily vote. */
export const SERVER_LIST = site({
  key: "site-server-list",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("قائمة سيرفرات: ساحة السيرفرات", "Server list: Server Square", "רשימת שרתים: Server Square"),
  note: w("موقع قائمة سيرفرات: أصحاب السيرفرات بيضيفوها وبتستنّى موافقة الطاقم، كل سيرفر بحالته الحيّة (بنسأله كل كم دقيقة)، قسم لكل لعبة مرتّب حسب أصوات الشهر، تصويت مرّة باليوم لكل لاعب فايت بحسابه، والقوانين.", "A server list's site: server owners add theirs for the staff's yes, each server with its live status (asked every few minutes), a section for each game ranked by the month's votes, a vote a day from each signed-in player, and the rules.", "אתר לרשימת שרתים: בעלי שרתים מוסיפים את שלהם לאישור הצוות, כל שרת עם המצב החי שלו (נבדק כל כמה דקות), קטע לכל משחק מדורג לפי ההצבעות של החודש, הצבעה ביום מכל שחקן מחובר, והחוקים."),
  biz: { name: w("ساحة السيرفرات", "Server Square", "Server Square"), address: w("أونلاين", "Online", "אונליין"), hours: w("القائمة مفتوحة 24/7", "The list is open 24/7", "הרשימה פתוחה 24/7"), phone: "0", email: "team@serversquare.example", city: "" },
  pack: {
    label: w("ساحة السيرفرات", "Server Square", "Server Square"),
    eyebrow: w("قائمة سيرفرات ألعاب", "A game server list", "רשימת שרתי משחקים"),
    title: w("لاقي سيرفرك الجاي", "Find your next server", "מצאו את השרת הבא שלכם"),
    sub: w("سيرفرات FiveM وماينكرافت و Rust، كل واحد بحالته هلّق وكم واحد عليه. صوّت لسيرفرك كل يوم.", "FiveM, Minecraft and Rust servers, each with how it is now and how many are on it. Vote for yours every day.", "שרתי FiveM, מיינקראפט ו־Rust, כל אחד עם המצב שלו עכשיו וכמה מחוברים. הצביעו לשרת שלכם כל יום."),
    cta: w("شوف القائمة", "See the list", "לראות את הרשימה"),
    product: w("السيرفرات", "The servers", "השרתים"),
    story: w("تعبنا من قوائم مليانة سيرفرات طافية وأصوات مشتراة، فعملنا قائمة بتفحص كل سيرفر بنفسها.", "We got tired of lists full of dead servers and bought votes, so we made one that checks every server itself.", "נמאס לנו מרשימות מלאות שרתים מתים והצבעות קנויות, אז בנינו רשימה שבודקת כל שרת בעצמה."),
    collection: w("الأوائل", "The top", "המובילים"),
    icon: "star",
  },
  home: "/square",
  modules: {
    status: {
      game: "discord",
      address: "https://discord.gg/serversquare",
      // The list's Discord is its status: no second button for it.
      discord: "",
      join: w("فوت عالديسكورد", "Join the Discord", "להצטרף לדיסקורד"),
      steps: [
        [w("دوّر على سيرفر", "Look for a server", "לחפש שרת"), w("حسب اللعبة، والأكتر أصوات أول.", "By game, the most voted first.", "לפי משחק, אלה עם הכי הרבה הצבעות קודם.")],
        [w("انسخ العنوان", "Copy the address", "להעתיק את הכתובת"), w("وفوت عليه من اللعبة.", "And join it from the game.", "ולהתחבר אליו מהמשחק.")],
        [w("صوّت كل يوم", "Vote every day", "להצביע כל יום"), w("فوت بحسابك وصوّت لسيرفرك المفضّل.", "Sign in and vote for your favourite server.", "התחברו והצביעו לשרת האהוב עליכם.")],
      ],
    },
    listings: {
      title: w("القائمة", "The list", "הרשימה"),
      sub: w("قسم لكل لعبة، مرتّبة حسب أصوات الشهر. الحالة بتنفحص كل كم دقيقة.", "A section for each game, ranked by the month's votes. The status is checked every few minutes.", "קטע לכל משחק, מדורג לפי ההצבעות של החודש. המצב נבדק כל כמה דקות."),
      games: [
        ["fivem", w("FiveM", "FiveM", "FiveM")],
        ["minecraft", w("ماينكرافت Java", "Minecraft Java", "Minecraft Java")],
        ["bedrock", w("ماينكرافت Bedrock", "Minecraft Bedrock", "Minecraft Bedrock")],
        ["steam", w("Rust وألعاب Steam", "Rust and Steam games", "Rust ומשחקי Steam")],
      ],
      rows: [
        { slug: "dew-city", name: "Dew City RP", game: "fivem", address: "play.dewcity.example", about: w("رول بلاي جدّي بوايتلست، شرطة وإسعاف.", "Serious whitelisted roleplay, police and EMS.", "רולפליי רציני עם רשימה לבנה, משטרה ואמבולנס."), tags: w("رول بلاي، وايتلست، عربي", "roleplay, whitelist, Arabic", "רולפליי, רשימה לבנה, ערבית"), discord: "https://discord.gg/dewcity", votes: 412 },
        { slug: "cedar-smp", name: "Cedar SMP", game: "minecraft", address: "mc.cedarsmp.example", about: w("سرفايفل هادي بلا غش، وأحداث كل جمعة.", "Calm survival with no cheating, and events every Friday.", "הישרדות רגועה בלי רמאות, ואירועים בכל שישי."), tags: w("سرفايفل، عيلة", "survival, family", "הישרדות, משפחה"), discord: "https://discord.gg/cedarsmp", votes: 287 },
        { slug: "island-be", name: "Island BE", game: "bedrock", address: "be.islandbe.example:19132", about: w("سكاي بلوك من التلفون والكونسول.", "Skyblock from phones and consoles.", "סקייבלוק מהטלפון ומהקונסולה."), tags: w("سكاي بلوك، Bedrock", "skyblock, Bedrock", "סקייבלוק, Bedrock"), discord: "", votes: 96 },
        { slug: "ash-isle", name: "Ash Isle", game: "steam", address: "rust.ashisle.example:28015", about: w("Rust بمسح كل خميس وفرق لحد 4.", "Rust with a wipe every Thursday and teams of up to 4.", "Rust עם מחיקה בכל חמישי וקבוצות של עד 4."), tags: w("Rust، مسح أسبوعي", "Rust, weekly wipe", "Rust, מחיקה שבועית"), discord: "https://discord.gg/ashisle", votes: 158 },
      ],
    },
    rules: {
      title: w("قوانين القائمة", "The list's rules", "חוקי הרשימה"),
      sub: w("عشان القائمة تضل صادقة.", "So the list stays honest.", "כדי שהרשימה תישאר הוגנת."),
      changed: w("آخر تعديل 21 تشرين التاني: زدنا 2.3 عن شراء الأصوات.", "Last changed on 21 November: we added 2.3 on buying votes.", "שינוי אחרון ב־21 בנובמבר: הוספנו את 2.3 על קניית הצבעות."),
      date: "2026-11-21",
      sections: [
        { key: "servers", name: w("السيرفرات", "Servers", "שרתים"), rows: [
          { n: "1.1", title: w("سيرفرك إلك", "Your own server", "השרת שלכם"), text: w("بتضيف بس سيرفر إنت صاحبه أو من طاقمه.", "Add only a server you own or are on the staff of.", "מוסיפים רק שרת שאתם הבעלים שלו או בצוות שלו.") },
          { n: "1.2", title: w("عنوان حقيقي", "A real address", "כתובת אמיתית"), text: w("العنوان لازم يكون عام وشغّال. السيرفر الطافي كتير بينشال.", "The address must be public and working. A server that is often down is taken off.", "הכתובת חייבת להיות ציבורית ופועלת. שרת שלא פועל הרבה יוסר.") },
        ] },
        { key: "votes", name: w("الأصوات", "Votes", "הצבעות"), rows: [
          { n: "2.1", title: w("صوت باليوم", "A vote a day", "הצבעה ביום"), text: w("كل لاعب فايت بحسابه بيصوّت مرّة باليوم لكل سيرفر.", "Each signed-in player votes once a day for each server.", "כל שחקן מחובר מצביע פעם ביום לכל שרת.") },
          { n: "2.2", title: w("بلا حسابات وهمية", "No fake accounts", "בלי חשבונות מזויפים"), text: w("حسابات كتير لنفس الشخص بتنمسح، وسيرفره بينشال.", "Many accounts for one person are removed, and their server taken off.", "חשבונות רבים לאותו אדם נמחקים, והשרת שלו יוסר.") },
          { n: "2.3", title: w("ما في شراء أصوات", "No buying votes", "בלי קניית הצבעות"), text: w("ممنوع تعطي جوائز بمصاري مقابل الأصوات.", "No paid rewards in return for votes.", "אסור לתת פרסים בכסף תמורת הצבעות.") },
        ] },
      ],
    },
    questions: { rows: [
      { q: w("كيف بضيف سيرفري؟", "How do I add my server?", "איך מוסיפים את השרת שלי?"), a: w("فوت بحسابك واملا «ضيف سيرفرك» بصفحة القائمة. بيطلع بعد موافقة الطاقم.", "Sign in and fill in «add your server» on the list page. It shows once the staff say yes.", "התחברו ומלאו «הוסיפו את השרת שלכם» בעמוד הרשימה. הוא יופיע אחרי אישור הצוות.") },
      { q: w("كيف بتعرفوا إذا السيرفر شغّال؟", "How do you know a server is up?", "איך אתם יודעים ששרת פועל?"), a: w("السيرفر تبعنا بيسأل كل سيرفر بالقائمة كل كم دقيقة، متل ما بتسأله اللعبة.", "Our server asks each listed server every few minutes, the way the game asks it.", "השרת שלנו שואל כל שרת ברשימה כל כמה דקות, כמו שהמשחק שואל אותו.") },
      { q: w("إمتى الأصوات بتبلّش من جديد؟", "When do the votes start over?", "מתי ההצבעות מתחילות מחדש?"), a: w("أول كل شهر، عشان كل سيرفر إله فرصة.", "On the first of each month, so every server has a chance.", "בתחילת כל חודש, כדי שלכל שרת תהיה הזדמנות.") },
    ] },
    contact: {},
    notify: {},
  },
});
