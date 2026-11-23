/**
 * More whole sites for game servers (wave G7a of docs/sites-300-plan.ar.md), each from the modules G1–G6 built: an
 * open FiveM city, a FiveM racing and drift circuit, a Minecraft skyblock with seasons, a Minecraft server for families
 * and schools, a Garry's Mod roleplay town and a co-op survival camp. The Steam games (Garry's Mod, the co-op camp) have
 * no link and no store: their games' rules on selling aren't in the gate yet.
 */
import { w } from "../words";
import { site } from "./blueprint";
import { RANK_W } from "./siteWords";

const BANNED = { q: w("انبنّدت، شو بعمل؟", "I was banned, what do I do?", "קיבלתי באן, מה עושים?"), a: w("قدّم استئناف من صفحة «الاستئناف والبلاغ» برقم الباند.", "Appeal it on the appeals and reports page with the ban's number.", "הגישו ערעור בעמוד הערעורים והדיווחים עם מספר הבאן.") };
const RESPECT = { n: "1.1", title: w("احترم الكل", "Respect everyone", "כבוד לכולם"), text: w("ما في شتائم ولا عنصرية ولا تحرّش، باللعبة ولا بالديسكورد.", "No slurs, racism or harassment, in the game or on Discord.", "בלי קללות, גזענות או הטרדה, במשחק ובדיסקורד.") };
const ONE_ACCOUNT = { n: "1.3", title: w("حساب واحد", "One account", "חשבון אחד"), text: w("كل لاعب إله حساب واحد. الحسابات التانية بتنبنّد كلها.", "Each player has one account. Every other one gets banned.", "לכל שחקן חשבון אחד. כל חשבון נוסף נחסם.") };

/** 302: an open FiveM city, no application to join: a guide for the new player, packages on Tebex, rankings. */
export const FIVEM_OPEN = site({
  key: "site-fivem-open",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("سيرفر FiveM مفتوح: حي الميناء", "Open FiveM server: Harbour Quarter", "שרת FiveM פתוח: רובע הנמל"),
  note: w("موقع سيرفر FiveM مفتوح للكل بدون تقديم: الحالة الحيّة و«فوت هلّق»، دليل للاعب الجديد، القوانين، باقات Tebex، الترتيب، الستريمرز، الأخبار، الاستئناف والبلاغ، ورسائل.", "A site for a FiveM server open to all, no application: the live status and «join now», a guide for new players, rules, Tebex packages, rankings, streamers, news, appeals and reports, and messages.", "אתר לשרת FiveM פתוח לכולם, בלי הגשה: המצב החי ו«להתחבר עכשיו», מדריך לשחקנים חדשים, חוקים, חבילות Tebex, דירוג, סטרימרים, חדשות, ערעורים ודיווחים והודעות."),
  biz: { name: w("حي الميناء", "Harbour Quarter", "רובע הנמל"), address: w("أونلاين", "Online", "אונליין"), hours: w("السيرفر شغّال 24/7", "The server runs 24/7", "השרת פועל 24/7"), phone: "0", email: "crew@harbourquarter.example", city: "" },
  pack: {
    label: w("حي الميناء", "Harbour Quarter", "רובע הנמל"),
    eyebrow: w("سيرفر مفتوح، فوت بدون تقديم", "An open server, no application", "שרת פתוח, בלי הגשה"),
    title: w("الحي مفتوح للكل، وقصتك بتبلّش من المرفأ", "The quarter is open to all, and your story starts at the docks", "הרובע פתוח לכולם, והסיפור שלכם מתחיל ברציף"),
    sub: w("صيد، شغل عالمرفأ، تجارة وسيارات: فوت هلّق، والدليل بيمشي معك أول ساعة.", "Fishing, dock work, trading and cars: join now, and the guide walks you through your first hour.", "דיג, עבודה ברציף, מסחר ומכוניות: התחברו עכשיו, והמדריך ילווה אתכם בשעה הראשונה."),
    cta: w("فوت هلّق", "Join now", "להתחבר עכשיו"),
    product: w("الحي", "The quarter", "הרובע"),
    story: w("فتحنا الحي لكل اللي بدهم رول بلاي خفيف بدون انتظار ولا مقابلات.", "We opened the quarter for everyone who wants easy-going roleplay, without waiting or interviews.", "פתחנו את הרובע לכל מי שרוצה רולפליי קליל, בלי המתנה ובלי ראיונות."),
    collection: w("آخر الأخبار", "Latest news", "החדשות האחרונות"),
    icon: "star",
  },
  home: "/harbour",
  modules: {
    status: {
      game: "fivem",
      address: "cfx.re/join/hq7k2p",
      discord: "https://discord.gg/harbourquarter",
      join: w("فوت هلّق", "Join now", "להתחבר עכשיו"),
      steps: [
        [w("نزّل FiveM", "Get FiveM", "להוריד FiveM"), w("مع GTA V أصلية على الكمبيوتر.", "With a genuine GTA V on your PC.", "עם GTA V מקורי במחשב.")],
        [w("فوت هلّق", "Join now", "להתחבר עכשיו"), w("بدون تقديم: الكبسة بتفتحلك اللعبة عالسيرفر.", "No application: the button opens the game on the server.", "בלי הגשה: הכפתור פותח את המשחק על השרת.")],
        [w("اتبع الدليل", "Follow the guide", "לעקוב אחרי המדריך"), w("أول مهمة عالمرفأ بتعلّمك الشغل والمصاري.", "Your first job at the docks teaches you work and money.", "העבודה הראשונה ברציף מלמדת עבודה וכסף.")],
      ],
    },
    link: {},
    ranking: {
      title: w("الترتيب", "The rankings", "הדירוג"),
      sub: w("مين لعب أكتر بالحي، ومين اصطاد أكبر سمكة.", "Who played the most in the quarter, and who caught the biggest fish.", "מי שיחק הכי הרבה ברובע, ומי תפס את הדג הגדול ביותר."),
      boards: [
        { key: "playtime", title: RANK_W.playtime, sub: RANK_W.playtimeSub, unit: "minutes", how: "sum", best: "high" },
        { key: "fish", title: w("أكبر سمكة", "The biggest fish", "הדג הגדול ביותר"), sub: w("أتقل سمكة لكل صيّاد، بالغرام.", "Each angler's heaviest fish, in grams.", "הדג הכבד ביותר של כל דייג, בגרמים."), unit: "number", how: "best", best: "high" },
      ],
    },
    rules: {
      title: w("القوانين والدليل", "Rules and guide", "חוקים ומדריך"),
      sub: w("السيرفر مفتوح، بس القوانين للكل. والدليل تحت لأول يوم.", "The server is open, but the rules are for everyone. The guide for your first day is below.", "השרת פתוח, אבל החוקים לכולם. המדריך ליום הראשון למטה."),
      changed: w("آخر تعديل 21 تشرين التاني: زدنا دليل الصيد.", "Last changed on 21 November: we added the fishing guide.", "שינוי אחרון ב־21 בנובמבר: הוספנו את מדריך הדיג."),
      date: "2026-11-21",
      sections: [
        { key: "general", name: w("عام", "General", "כללי"), rows: [
          RESPECT,
          { n: "1.2", title: w("بدون قتل عشوائي", "No random killing", "בלי הריגה אקראית"), text: w("ما بتقتل حدا بدون قصة، وما بتدعس حدا بالسيارة عمداً.", "Don't kill anyone without a story, or run anyone over on purpose.", "לא הורגים בלי סיפור, ולא דורסים מישהו בכוונה.") },
          ONE_ACCOUNT,
        ] },
        { key: "guide", name: w("دليل اللاعب الجديد", "The new player's guide", "מדריך לשחקן החדש"), rows: [
          { n: "2.1", title: w("أول مصاري", "Your first money", "הכסף הראשון"), text: w("روح عالمرفأ، اشتغل بتفريغ البواخر، وبتطلع أول 5,000.", "Go to the docks, unload the ships, and earn your first 5,000.", "לכו לרציף, פרקו את האוניות, והרוויחו את 5,000 הראשונים.") },
          { n: "2.2", title: w("الصيد", "Fishing", "דיג"), text: w("اشتري صنارة من الدكان جنب الميناء، والسمك الكبير بالليل.", "Buy a rod at the shop by the harbour; the big fish come out at night.", "קנו חכה בחנות ליד הנמל; הדגים הגדולים יוצאים בלילה.") },
          { n: "2.3", title: w("بيتك الأول", "Your first home", "הבית הראשון"), text: w("الشقق الصغيرة بالحي القديم أرخص إشي، وبتحفظ أغراضك.", "The small flats in the old quarter are the cheapest, and they keep your things.", "הדירות הקטנות ברובע הישן הכי זולות, והן שומרות את הדברים שלכם.") },
        ] },
      ],
    },
    packages: {
      title: w("الباقات", "Packages", "חבילות"),
      sub: w("أولوية بالطابور، سيارات وأشكال: ادعم الحي من Tebex.", "Queue priority, cars and looks: support the quarter on Tebex.", "עדיפות בתור, מכוניות ומראות: תמכו ברובע ב־Tebex."),
    },
    news: {
      title: w("الأخبار", "News", "חדשות"),
      sub: w("شو انضاف للحي، والفعاليات الجاية.", "What's new in the quarter, and the events coming up.", "מה חדש ברובע, והאירועים הקרובים."),
      rows: [
        { slug: "fishing-contest", date: "2026-11-21", title: w("مسابقة الصيد السبت", "Saturday's fishing contest", "תחרות הדיג בשבת"), text: w("أكبر سمكة بتربح قارب.", "The biggest fish wins a boat.", "הדג הגדול ביותר זוכה בסירה."), body: w("السبت من 8 لـ 10 المسا عالمرفأ. أكبر سمكة بالترتيب بتربح قارب صغير.", "Saturday from 8 to 10 pm at the docks. The biggest fish on the rankings wins a small boat.", "שבת מ־20:00 עד 22:00 ברציף. הדג הגדול בדירוג זוכה בסירה קטנה.") },
        { slug: "new-docks", date: "2026-11-12", title: w("المرفأ صار أكبر", "The docks got bigger", "הרציף גדל"), text: w("رصيف جديد وشغل أكتر.", "A new pier and more work.", "מזח חדש ויותר עבודה."), body: w("انضاف رصيف تاني ورافعتين، وصار في شغل لعشرين واحد بنفس الوقت.", "We added a second pier and two cranes; there's now work for twenty at once.", "הוספנו מזח שני ושני מנופים; עכשיו יש עבודה לעשרים בבת אחת.") },
      ],
    },
    team: {
      title: w("الطاقم", "The crew", "הצוות"),
      sub: w("بيساعدوك بأول يوم، وبيضبطوا الحي.", "They help you on your first day, and keep the quarter in order.", "עוזרים ביום הראשון, ושומרים על הסדר ברובע."),
      rows: [
        { name: w("القبطان سليم", "Captain Salim", "הקפטן סלים"), role: w("المؤسّس", "Founder", "מייסד"), bio: w("بنى الحي من مرفأ صغير.", "He built the quarter from a little harbour.", "בנה את הרובע מנמל קטן.") },
        { name: w("ريم", "Reem", "רים"), role: w("مسؤولة اللاعبين الجداد", "New players' guide", "מלווה שחקנים חדשים"), bio: w("أول وحدة بتسلّم عليك بالمرفأ.", "The first to greet you at the docks.", "הראשונה שמקבלת אתכם ברציף.") },
      ],
    },
    streamers: {
      title: w("الستريمرز", "Streamers", "סטרימרים"),
      sub: w("مين بيبث الحي. اللي لايف هلّق أول.", "Who streams the quarter. Those live now come first.", "מי משדר את הרובע. מי שבשידור עכשיו ראשון."),
      rows: [
        { slug: "fisher-hadi", name: w("هادي الصيّاد", "Hadi the angler", "האדי הדייג"), twitch: "", about: w("ليالي الصيد، والسمكة اللي هربت.", "Fishing nights, and the one that got away.", "לילות דיג, והדג שברח.") },
        { slug: "dock-dana", name: w("دانا عالمرفأ", "Dana at the docks", "דנה ברציף"), twitch: "", about: w("من أول يوم لأول بيت.", "From day one to a first home.", "מהיום הראשון ועד הבית הראשון.") },
      ],
    },
    questions: { rows: [
      { q: w("لازم أقدّم؟", "Do I have to apply?", "צריך להגיש בקשה?"), a: w("لأ، السيرفر مفتوح للكل. فوت واتبع الدليل.", "No, the server is open to all. Join and follow the guide.", "לא, השרת פתוח לכולם. התחברו ועקבו אחרי המדריך.") },
      { q: w("في طابور؟", "Is there a queue?", "יש תור?"), a: w("بالسهرات أحياناً. باقة الأولوية بتخلّيك تفوت أسرع، وما بتعطيك شي تاني.", "Some evenings. The priority package gets you in faster, and nothing else.", "בחלק מהערבים. חבילת העדיפות מכניסה מהר יותר, ותו לא.") },
      { q: w("لازم مايك؟", "Do I need a microphone?", "צריך מיקרופון?"), a: w("أحسن، بس في ناس بتلعب بالشات بالأول.", "It's better, but some start out on chat.", "עדיף, אבל יש כאלה שמתחילים בצ'אט.") },
      BANNED,
    ] },
    appeals: {
      title: w("الاستئناف والبلاغ", "Appeals and reports", "ערעורים ודיווחים"),
      sub: w("انبنّدت وشايف إنه غلط، أو شفت حدا عم يخرّب عالناس؟ من هون.", "Banned and think it was wrong, or saw someone ruining it for others? Here.", "קיבלתם באן וחושבים שזו טעות, או ראיתם מישהו מקלקל לאחרים? כאן."),
      reasons: [
        ["cheating", w("غش أو هاكات", "Cheating or hacks", "רמאות או האקים")],
        ["rdm", w("قتل أو دعس بلا سبب", "Killing or running over for no reason", "הריגה או דריסה בלי סיבה")],
        ["toxic", w("شتائم أو تحرّش", "Insults or harassment", "קללות או הטרדה")],
        ["other", w("شي تاني", "Something else", "משהו אחר")],
      ],
    },
    contact: {},
    notify: {},
  },
});

/** 303: a FiveM racing and drift server: lap times on each track, the weekly race's countdown, its cars on Tebex. */
export const FIVEM_RACING = site({
  key: "site-fivem-racing",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("سيرفر FiveM سباقات ودرفت: حلبة الغروب", "FiveM racing and drift server: Sunset Circuit", "שרת מירוצים ודריפט FiveM: מסלול השקיעה"),
  note: w("موقع سيرفر سباقات ودرفت على FiveM: الحالة الحيّة و«فوت هلّق»، أسرع لفّة على كل حلبة ونقاط الدرفت، عدّاد للسباق الأسبوعي، معرض السيارات على Tebex، القوانين، الستريمرز، الأخبار، الاستئناف والبلاغ، ورسائل.", "A FiveM racing and drift server's site: the live status and «join now», the fastest lap on each track and drift scores, a countdown to the weekly race, the car showroom on Tebex, rules, streamers, news, appeals and reports, and messages.", "אתר לשרת מירוצים ודריפט ב־FiveM: המצב החי ו«להתחבר עכשיו», ההקפה המהירה בכל מסלול וניקוד דריפט, ספירה למירוץ השבועי, אולם התצוגה ב־Tebex, חוקים, סטרימרים, חדשות, ערעורים ודיווחים והודעות."),
  biz: { name: w("حلبة الغروب", "Sunset Circuit", "מסלול השקיעה"), address: w("أونلاين", "Online", "אונליין"), hours: w("السيرفر شغّال 24/7", "The server runs 24/7", "השרת פועל 24/7"), phone: "0", email: "pit@sunsetcircuit.example", city: "" },
  pack: {
    label: w("حلبة الغروب", "Sunset Circuit", "מסלול השקיעה"),
    eyebrow: w("سباقات ودرفت على FiveM", "Racing and drift on FiveM", "מירוצים ודריפט ב־FiveM"),
    title: w("كل جمعة سباق، وكل لفّة بتنحسب", "A race every Friday, and every lap counts", "מירוץ בכל שישי, וכל הקפה נספרת"),
    sub: w("أربع حلبات، ساحة درفت، وترتيب أسرع لفّة بيتحدّث لحاله.", "Four tracks, a drift yard, and a fastest-lap ranking that updates itself.", "ארבעה מסלולים, מגרש דריפט ודירוג הקפה מהירה שמתעדכן מעצמו."),
    cta: w("فوت هلّق", "Join now", "להתחבר עכשיו"),
    product: w("الحلبة", "The circuit", "המסלול"),
    story: w("بلّشنا كمجموعة بتحب السيارات، وصارت الحلبة بيت لكل اللي بيحب السرعة.", "We started as friends who love cars, and the circuit became home to everyone who loves speed.", "התחלנו כחברים שאוהבים מכוניות, והמסלול הפך לבית לכל מי שאוהב מהירות."),
    collection: w("آخر الأخبار", "Latest news", "החדשות האחרונות"),
    icon: "star",
  },
  home: "/circuit",
  modules: {
    status: {
      game: "fivem",
      address: "cfx.re/join/sc4r9x",
      discord: "https://discord.gg/sunsetcircuit",
      join: w("فوت هلّق", "Join now", "להתחבר עכשיו"),
      steps: [
        [w("نزّل FiveM", "Get FiveM", "להוריד FiveM"), w("مع GTA V أصلية، وستيرنغ إذا عندك.", "With a genuine GTA V, and a wheel if you have one.", "עם GTA V מקורי, והגה אם יש.")],
        [w("فوت هلّق", "Join now", "להתחבר עכשיו"), w("بتطلع بالبيت، وسيارة تجربة بالكراج.", "You start in the pits, with a trial car in the garage.", "מתחילים בפיטס, עם מכונית ניסיון במוסך.")],
        [w("لفّ لفّة", "Drive a lap", "לנסוע הקפה"), w("كل لفّة على حلبة بتنحسب بالترتيب لحالها.", "Every lap on a track counts on the rankings by itself.", "כל הקפה במסלול נספרת בדירוג מעצמה.")],
      ],
    },
    link: {},
    ranking: {
      title: w("أسرع لفّة", "The fastest laps", "ההקפות המהירות"),
      sub: w("أحسن وقت لكل سايق على كل حلبة، ونقاط الدرفت، اليوم وهالأسبوع ومن الأول.", "Each driver's best time on each track, and drift scores, today, this week and of all time.", "הזמן הטוב של כל נהג בכל מסלול, וניקוד דריפט, היום, השבוע ומאז ומעולם."),
      boards: [
        { key: "lap-harbour", title: w("حلبة الميناء", "The harbour track", "מסלול הנמל"), sub: w("لفّة وحدة حوالين الميناء.", "One lap around the harbour.", "הקפה אחת סביב הנמל."), unit: "lap", how: "best", best: "low" },
        { key: "lap-desert", title: w("حلبة الصحرا", "The desert track", "מסלול המדבר"), sub: w("طريق طويل وسريع بالرمل.", "A long, fast road through the sand.", "דרך ארוכה ומהירה בחול."), unit: "lap", how: "best", best: "low" },
        { key: "drift", title: w("نقاط الدرفت", "Drift scores", "ניקוד דריפט"), sub: w("أعلى نقاط بجولة وحدة بساحة الدرفت.", "The highest score in one run in the drift yard.", "הניקוד הגבוה בסיבוב אחד במגרש הדריפט."), unit: "number", how: "best", best: "high" },
      ],
    },
    wipe: {
      title: w("مواعيد السباقات", "Race days", "ימי המירוצים"),
      sub: w("إمتى السباق الجاي، وكيف بيمشي.", "When the next race is, and how it runs.", "מתי המירוץ הבא, ואיך הוא מתנהל."),
      line: w("سباق كبير كل جمعة الساعة 9 المسا، على حلبة جديدة كل أسبوع.", "A big race every Friday at 9 pm, on a different track each week.", "מירוץ גדול בכל שישי ב־21:00, על מסלול אחר בכל שבוע."),
      words: {
        next: w("السباق الجاي", "The next race", "המירוץ הבא"),
        done: w("السباق بلّش! فوت عالحلبة.", "The race is on! Get to the track.", "המירוץ התחיל! לכו למסלול."),
        none: w("موعد السباق الجاي بيطلع هون قريباً.", "The next race's date shows here soon.", "מועד המירוץ הבא יופיע כאן בקרוב."),
        what: w("كيف بيمشي السباق", "How a race runs", "איך המירוץ מתנהל"),
        whatSub: w("من التسجيل لخط النهاية.", "From signing up to the finish line.", "מההרשמה ועד קו הסיום."),
      },
      slug: "/races",
      every: "weekly",
      day: "fri",
      time: "21:00",
      zone: "amman",
      note: w("التسجيل بالديسكورد لحد الساعة 8، والتأهيل الساعة 8:30.", "Sign up on Discord until 8; qualifying at 8:30.", "הרשמה בדיסקורד עד 20:00; מקצה דירוג ב־20:30."),
      what: [
        [w("التأهيل", "Qualifying", "מקצה דירוג"), w("لفّتين، وأسرع لفّة بتحدد مكانك بالبداية.", "Two laps; your fastest sets your place on the grid.", "שתי הקפות; המהירה קובעת את המקום בזינוק.")],
        [w("السباق", "The race", "המירוץ"), w("عشر لفّات، والاحتكاك العمد ممنوع.", "Ten laps, and no deliberate contact.", "עשר הקפות, ובלי מגע מכוון.")],
        [w("الجوايز", "Prizes", "פרסים"), w("الأوائل التلاتة بياخدوا لقب الأسبوع بالديسكورد.", "The top three take the week's title on Discord.", "שלושת הראשונים מקבלים את תואר השבוע בדיסקורד.")],
      ],
    },
    packages: {
      title: w("معرض السيارات", "The showroom", "אולם התצוגה"),
      sub: w("سيارات، ألوان وتعديلات: ادعم الحلبة من Tebex.", "Cars, paint and tuning: support the circuit on Tebex.", "מכוניות, צבעים ושיפורים: תמכו במסלול ב־Tebex."),
    },
    rules: {
      title: w("قوانين الحلبة", "Track rules", "חוקי המסלול"),
      sub: w("سرعة بأخلاق. اقراها قبل أول سباق.", "Speed with manners. Read them before your first race.", "מהירות עם נימוס. קראו לפני המירוץ הראשון."),
      changed: w("آخر تعديل 19 تشرين التاني: وضّحنا 2.2 عن الاحتكاك.", "Last changed on 19 November: we made 2.2 on contact clearer.", "שינוי אחרון ב־19 בנובמבר: הבהרנו את 2.2 על מגע."),
      date: "2026-11-19",
      sections: [
        { key: "general", name: w("عام", "General", "כללי"), rows: [
          RESPECT,
          { n: "1.2", title: w("بدون غش", "No cheating", "בלי רמאות"), text: w("ولا مودات سرعة ولا تعديل عالفيزيا.", "No speed mods and no physics tweaks.", "בלי מודים של מהירות ובלי שינויי פיזיקה.") },
          ONE_ACCOUNT,
        ] },
        { key: "racing", name: w("بالسباق", "In a race", "במירוץ"), rows: [
          { n: "2.1", title: w("الحلبة بس", "The track only", "רק המסלול"), text: w("ما بتقصّ الطريق، واللفّة المقصوصة ما بتنحسب.", "Don't cut corners; a cut lap doesn't count.", "לא חותכים פניות; הקפה חתוכה לא נספרת.") },
          { n: "2.2", title: w("بدون احتكاك عمد", "No deliberate contact", "בלי מגע מכוון"), text: w("إذا ضربت حدا بالغلط، استنّاه يرجع قدامك.", "If you hit someone by mistake, let them back in front.", "אם פגעתם במישהו בטעות, תנו לו לחזור לפניכם.") },
          { n: "2.3", title: w("الشوارع مش حلبة", "The streets aren't a track", "הרחובות הם לא מסלול"), text: w("السرعة بالشوارع العامة بتنحسب عليك.", "Speeding on the public streets counts against you.", "מהירות ברחובות הציבוריים נרשמת לחובתכם.") },
        ] },
      ],
    },
    streamers: {
      title: w("الستريمرز", "Streamers", "סטרימרים"),
      sub: w("مين بيبث السباقات. اللي لايف هلّق أول.", "Who streams the races. Those live now come first.", "מי משדר את המירוצים. מי שבשידור עכשיו ראשון."),
      rows: [
        { slug: "drift-yazan", name: w("يزن درفت", "Yazan drifts", "יזן דריפט"), twitch: "", about: w("ساحة الدرفت كل ليلة، والنقاط العالية.", "The drift yard every night, and the high scores.", "מגרש הדריפט כל לילה, והניקוד הגבוה.") },
        { slug: "pit-lana", name: w("لانا بالبيت", "Lana in the pits", "לנה בפיטס"), twitch: "", about: w("بتعلّق على سباق الجمعة لفّة بلفّة.", "Calls Friday's race lap by lap.", "מפרשנת את מירוץ שישי הקפה אחר הקפה.") },
      ],
    },
    news: {
      title: w("الأخبار", "News", "חדשות"),
      sub: w("حلبات جديدة، نتايج السباقات، وتحديثات.", "New tracks, race results and updates.", "מסלולים חדשים, תוצאות מירוצים ועדכונים."),
      rows: [
        { slug: "desert-track", date: "2026-11-20", title: w("حلبة الصحرا فتحت", "The desert track is open", "מסלול המדבר נפתח"), text: w("أطول حلبة عنّا.", "Our longest track yet.", "המסלול הארוך ביותר שלנו."), body: w("سبع كيلو بالرمل والجبل. أسرع لفّة بتطلع بالترتيب من اليوم.", "Seven kilometres through sand and hills. The fastest lap is on the rankings from today.", "שבעה קילומטרים בחול ובגבעות. ההקפה המהירה בדירוג מהיום.") },
        { slug: "friday-results", date: "2026-11-15", title: w("نتايج سباق الجمعة", "Friday's results", "תוצאות מירוץ שישי"), text: w("فوز بفرق عُشر ثانية.", "A win by a tenth of a second.", "ניצחון בעשירית שנייה."), body: w("الأول سبق التاني بعُشر ثانية عالخط. الإعادة عند لانا بالبث.", "First beat second by a tenth at the line. Lana's stream has the replay.", "הראשון ניצח את השני בעשירית על הקו. השידור החוזר אצל לנה.") },
      ],
    },
    questions: { rows: [
      { q: w("لازم ستيرنغ؟", "Do I need a wheel?", "צריך הגה?"), a: w("لأ، الكيبورد والكونترولر كمان بيمشوا.", "No, keyboard and controller work too.", "לא, גם מקלדת ושלט עובדים.") },
      { q: w("كيف بطلع بالترتيب؟", "How do I get on the rankings?", "איך נכנסים לדירוג?"), a: w("لفّ لفّة كاملة على أي حلبة، والسيرفر بيبعت وقتك لحاله.", "Drive a full lap on any track; the server sends your time by itself.", "נסעו הקפה מלאה בכל מסלול; השרת שולח את הזמן מעצמו.") },
      { q: w("إمتى السباق؟", "When is the race?", "מתי המירוץ?"), a: w("كل جمعة الساعة 9 المسا. العدّاد بالصفحة الأولى.", "Every Friday at 9 pm. The countdown is on the first page.", "בכל שישי ב־21:00. הספירה בעמוד הראשון.") },
      BANNED,
    ] },
    appeals: {
      title: w("الاستئناف والبلاغ", "Appeals and reports", "ערעורים ודיווחים"),
      sub: w("انبنّدت وشايف إنه غلط، أو حدا ضربك عمداً بالسباق؟ من هون.", "Banned and think it was wrong, or someone rammed you on purpose? Here.", "קיבלתם באן וחושבים שזו טעות, או שמישהו נגח בכם בכוונה? כאן."),
      reasons: [
        ["cheating", w("غش أو مودات سرعة", "Cheating or speed mods", "רמאות או מודים של מהירות")],
        ["ramming", w("احتكاك عمد بالسباق", "Deliberate contact in a race", "מגע מכוון במירוץ")],
        ["toxic", w("شتائم أو تحرّش", "Insults or harassment", "קללות או הטרדה")],
        ["other", w("شي تاني", "Something else", "משהו אחר")],
      ],
    },
    contact: {},
    notify: {},
  },
});

/** 307: a Minecraft skyblock with an economy: the richest and the highest islands, seasons on a countdown, a looks-only store. */
export const MC_SKYBLOCK = site({
  key: "site-minecraft-skyblock",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("سيرفر ماينكرافت سكاي بلوك: جزر الغيم", "Minecraft skyblock server: Cloud Isles", "שרת סקייבלוק מיינקראפט: איי העננים"),
  note: w("موقع سيرفر سكاي بلوك لماينكرافت Java باقتصاد: الحالة الحيّة ونسخ العنوان، أغنى اللاعبين وأعلى الجزر، عدّاد للموسم الجاي، متجر أشكال بس ببوابة «بتعطي أفضلية؟»، القوانين، الأخبار، الاستئناف والبلاغ، ورسائل.", "A Minecraft Java skyblock server with an economy: the live status and the address to copy, the richest players and the highest islands, a countdown to the next season, a looks-only store behind the «gives an advantage?» gate, rules, news, appeals and reports, and messages.", "אתר לשרת סקייבלוק במיינקראפט Java עם כלכלה: המצב החי והעתקת הכתובת, השחקנים העשירים והאיים הגבוהים, ספירה לעונה הבאה, חנות מראות בלבד עם שער «נותנת יתרון?», חוקים, חדשות, ערעורים ודיווחים והודעות."),
  biz: { name: w("جزر الغيم", "Cloud Isles", "איי העננים"), address: w("أونلاين", "Online", "אונליין"), hours: w("السيرفر شغّال 24/7", "The server runs 24/7", "השרת פועל 24/7"), phone: "0", email: "team@cloudisles.example", city: "" },
  pack: {
    label: w("جزر الغيم", "Cloud Isles", "איי העננים"),
    eyebrow: w("سكاي بلوك لماينكرافت Java", "Skyblock for Minecraft Java", "סקייבלוק למיינקראפט Java"),
    title: w("جزيرة صغيرة بالسما، وكل إشي بيبلّش منها", "A little island in the sky, and everything starts from it", "אי קטן בשמיים, והכול מתחיל ממנו"),
    sub: w("كبّر جزيرتك، تاجر بالسوق، وطلّع جزيرتك بترتيب الموسم.", "Grow your island, trade at the market, and take your island up the season's rankings.", "הגדילו את האי, סחרו בשוק, והעלו את האי בדירוג העונה."),
    cta: w("انسخ العنوان", "Copy the address", "להעתיק את הכתובת"),
    product: w("الجزر", "The isles", "האיים"),
    story: w("فتحنا الجزر لناس بتحب تبني من ولا شي، وتتاجر بنضافة.", "We opened the isles for people who love building from nothing, and trading fairly.", "פתחנו את האיים לאנשים שאוהבים לבנות מכלום, ולסחור בהגינות."),
    collection: w("آخر الأخبار", "Latest news", "החדשות האחרונות"),
    icon: "star",
  },
  home: "/isles",
  modules: {
    status: {
      game: "minecraft",
      address: "play.cloudisles.example",
      discord: "https://discord.gg/cloudisles",
      join: w("انسخ العنوان", "Copy the address", "להעתיק את הכתובת"),
      steps: [
        [w("افتح ماينكرافت Java", "Open Minecraft Java", "לפתוח את מיינקראפט Java"), w("نسخة 1.21، بحساب أصلي.", "Version 1.21, on a genuine account.", "גרסה 1.21, עם חשבון מקורי.")],
        [w("ضيف السيرفر", "Add the server", "להוסיף את השרת"), w("Multiplayer ← Add Server، والصق العنوان.", "Multiplayer → Add Server, and paste the address.", "Multiplayer ← Add Server, ולהדביק את הכתובת.")],
        [w("اكتب /is", "Type /is", "להקליד /is"), w("بتطلعلك جزيرتك، ومعها شجرة وصندوق.", "Your island appears, with a tree and a chest.", "האי שלכם מופיע, עם עץ ותיבה.")],
      ],
    },
    link: {},
    ranking: {
      title: w("ترتيب الموسم", "The season's rankings", "דירוג העונה"),
      sub: w("مين لعب أكتر، مين أغنى واحد، وأعلى جزيرة بالموسم.", "Who played the most, who is the richest, and the highest island this season.", "מי שיחק הכי הרבה, מי העשיר ביותר, והאי הגבוה ביותר בעונה."),
      boards: [
        { key: "playtime", title: RANK_W.playtime, sub: RANK_W.playtimeSub, unit: "minutes", how: "sum", best: "high" },
        { key: "money", title: w("أغنى اللاعبين", "The richest players", "השחקנים העשירים"), sub: w("رصيد كل واحد، حسب آخر مرّة شافه السيرفر.", "Each one's balance, as the server last saw it.", "היתרה של כל אחד, כפי שהשרת ראה לאחרונה."), unit: "number", how: "latest", best: "high" },
        { key: "island", title: w("أعلى الجزر", "The highest islands", "האיים הגבוהים"), sub: w("مستوى كل جزيرة، من البلوكات اللي عليها.", "Each island's level, from the blocks on it.", "הרמה של כל אי, לפי הבלוקים שעליו."), unit: "number", how: "latest", best: "high" },
      ],
    },
    wipe: {
      title: w("المواسم", "Seasons", "עונות"),
      sub: w("إمتى بيبلّش الموسم الجاي، وشو بيضل معك.", "When the next season starts, and what you keep.", "מתי מתחילה העונה הבאה, ומה נשאר לכם."),
      line: w("موسم جديد أول سبت بكل شهر: جزر جديدة، وترتيب من الصفر.", "A new season on the first Saturday of each month: new islands, and the rankings from zero.", "עונה חדשה בשבת הראשונה של כל חודש: איים חדשים, ודירוג מאפס."),
      words: {
        next: w("الموسم الجاي", "The next season", "העונה הבאה"),
        done: w("الموسم الجديد بلّش! اكتب /is.", "The new season is on! Type /is.", "העונה החדשה התחילה! הקלידו /is."),
        none: w("موعد الموسم الجاي بيطلع هون قريباً.", "The next season's date shows here soon.", "מועד העונה הבאה יופיע כאן בקרוב."),
        what: w("شو بيصير مع كل موسم", "What each season brings", "מה כל עונה מביאה"),
        whatSub: w("شو بيبلّش من جديد، وشو بيضل.", "What starts over, and what stays.", "מה מתחיל מחדש, ומה נשאר."),
      },
      slug: "/season",
      every: "monthly",
      day: "sat",
      time: "18:00",
      zone: "riyadh",
      note: w("أوائل الموسم بياخدوا لقب الموسم، وبيضل معهم للأبد.", "The season's top players get its title, and keep it for good.", "המובילים בעונה מקבלים את תואר העונה, ושומרים אותו לתמיד."),
      what: [
        [w("الجزر", "The islands", "האיים"), w("كل واحد بيبلّش بجزيرة جديدة.", "Everyone starts on a new island.", "כל אחד מתחיל באי חדש.")],
        [w("المصاري", "Money", "כסף"), w("الرصيد بيرجع صفر.", "Balances go back to zero.", "היתרות חוזרות לאפס.")],
        [w("اللي بيضل", "What stays", "מה נשאר"), w("ألقابك وأشكالك من المتجر.", "Your titles and looks from the store.", "התארים והמראות מהחנות.")],
      ],
    },
    mcstore: {
      title: w("المتجر", "The store", "החנות"),
      sub: w("أشكال وألقاب بتدعم السيرفر. ولا شي هون بيخلّي جزيرتك أقوى.", "Looks and titles that support the server. Nothing here makes your island stronger.", "מראות ותארים שתומכים בשרת. שום דבר כאן לא מחזק את האי."),
      kinds: [
        ["rank", w("رتبة (شكل)", "Rank (looks)", "דרגה (מראה)")],
        ["cosmetic", w("شكل وتأثيرات", "Looks and effects", "מראה ואפקטים")],
        ["title", w("لقب", "Title", "תואר")],
        ["other", w("غير شي", "Something else", "משהו אחר")],
      ],
      rows: [
        { slug: "sky-rank", title: w("رتبة السما", "Sky rank", "דרגת שמיים"), kind: "rank", price: 18, text: w("اسم أزرق ولقب «السما» بالشات.", "A blue name and the «Sky» title in chat.", "שם כחול והתואר «שמיים» בצ'אט."), advantage: false, command: "lp user {player} parent add sky" },
        { slug: "cloud-trail", title: w("أثر الغيم", "Cloud trail", "שובל ענן"), kind: "cosmetic", price: 10, text: w("غيمة صغيرة بتلحقك.", "A little cloud that follows you.", "ענן קטן שהולך אחריכם."), advantage: false, command: "lp user {player} permission set trails.cloud" },
        { slug: "islander-title", title: w("لقب ابن الجزيرة", "The islander title", "התואר בן האי"), kind: "title", price: 6, text: w("لقب «ابن الجزيرة» جنب اسمك.", "The «Islander» title beside your name.", "התואר «בן האי» ליד השם."), advantage: false, command: "lp user {player} permission set tags.islander" },
        // An advantage in the game: never shown or sold (Mojang's rules); the panel lists it held back.
        { slug: "fast-generator", title: w("مولّد أسرع", "A faster generator", "גנרטור מהיר יותר"), kind: "other", price: 25, text: w("الحجر بيطلع أسرع بمرّتين.", "Cobblestone comes twice as fast.", "האבן נוצרת פי שניים מהר."), advantage: true, command: "is admin generator {player} 2" },
      ],
    },
    rules: {
      title: w("القوانين", "The rules", "החוקים"),
      sub: w("السوق نضيف والجزر آمنة. اقراها قبل أول تجارة.", "The market is fair and the islands safe. Read them before your first trade.", "השוק הוגן והאיים בטוחים. קראו לפני העסקה הראשונה."),
      changed: w("آخر تعديل 18 تشرين التاني: زدنا 2.2 عن الأسعار بالسوق.", "Last changed on 18 November: we added 2.2 on market prices.", "שינוי אחרון ב־18 בנובמבר: הוספנו את 2.2 על מחירים בשוק."),
      date: "2026-11-18",
      sections: [
        { key: "general", name: w("عام", "General", "כללי"), rows: [
          RESPECT,
          { n: "1.2", title: w("بدون غش", "No cheating", "בלי רמאות"), text: w("لا ماكرو ولا أوتو كليكر ولا مودات بتعطي أفضلية.", "No macros, no auto-clickers, no mods that give an edge.", "בלי מאקרו, בלי לחיצה אוטומטית ובלי מודים שנותנים יתרון.") },
          ONE_ACCOUNT,
        ] },
        { key: "market", name: w("السوق", "The market", "השוק"), rows: [
          { n: "2.1", title: w("بدون نصب", "No scams", "בלי עוקץ"), text: w("اللي بتتفق عليه بتسلّمه. النصب باند من أول مرّة.", "What you agree on, you deliver. A scam is a ban the first time.", "מה שסיכמתם, מספקים. עוקץ הוא באן מהפעם הראשונה.") },
          { n: "2.2", title: w("أسعار حقيقية", "Real prices", "מחירים אמיתיים"), text: w("ما بتشتري كل السوق عشان تغلّي الأسعار.", "Don't buy up the market to push prices up.", "לא קונים את כל השוק כדי להעלות מחירים.") },
        ] },
      ],
    },
    news: {
      title: w("الأخبار", "News", "חדשות"),
      sub: w("المواسم والفعاليات والتحديثات.", "Seasons, events and updates.", "עונות, אירועים ועדכונים."),
      rows: [
        { slug: "season-5", date: "2026-11-07", title: w("الموسم 5 بلّش", "Season 5 has begun", "עונה 5 התחילה"), text: w("جزر أكبر وسوق جديد.", "Bigger islands and a new market.", "איים גדולים יותר ושוק חדש."), body: w("الجزر صارت 150 بلوكة، والسوق صار فيه مزاد كل مسا.", "Islands are now 150 blocks, and the market has an auction every evening.", "האיים עכשיו 150 בלוקים, ובשוק יש מכירה פומבית כל ערב.") },
        { slug: "top-islands", date: "2026-11-01", title: w("أوائل الموسم 4", "Season 4's top islands", "המובילים בעונה 4"), text: w("مبروك للتلاتة الأوائل.", "Well done to the top three.", "כל הכבוד לשלושת הראשונים."), body: w("ألقاب الموسم 4 وصلت لأصحابها، وبتضل معهم.", "Season 4's titles have reached their owners, and they keep them.", "התארים של עונה 4 הגיעו לבעליהם, ונשארים איתם.") },
      ],
    },
    questions: { rows: [
      { q: w("كيف ببلّش؟", "How do I start?", "איך מתחילים?"), a: w("اكتب /is بعد ما تفوت، وبتطلعلك جزيرتك.", "Type /is once you're in, and your island appears.", "הקלידו /is אחרי שנכנסתם, והאי שלכם מופיע.") },
      { q: w("شو بيصير بآخر الموسم؟", "What happens at the end of a season?", "מה קורה בסוף העונה?"), a: w("الجزر والمصاري بيبلّشوا من جديد، والألقاب والأشكال بتضل.", "Islands and money start over; titles and looks stay.", "האיים והכסף מתחילים מחדש; התארים והמראות נשארים.") },
      { q: w("المتجر بيعطي أفضلية؟", "Does the store give an advantage?", "החנות נותנת יתרון?"), a: w("لأ، أشكال وألقاب بس.", "No, only looks and titles.", "לא, רק מראות ותארים.") },
      BANNED,
    ] },
    appeals: {
      title: w("الاستئناف والبلاغ", "Appeals and reports", "ערעורים ודיווחים"),
      sub: w("انبنّدت وشايف إنه غلط، أو حدا نصب عليك؟ من هون.", "Banned and think it was wrong, or someone scammed you? Here.", "קיבלתם באן וחושבים שזו טעות, או שמישהו עקץ אתכם? כאן."),
      reasons: [
        ["cheating", w("غش أو ماكرو", "Cheating or macros", "רמאות או מאקרו")],
        ["scam", w("نصب بالتجارة", "A scam in a trade", "עוקץ בעסקה")],
        ["toxic", w("شتائم أو تحرّش", "Insults or harassment", "קללות או הטרדה")],
        ["other", w("شي تاني", "Something else", "משהו אחר")],
      ],
    },
    contact: {},
    notify: {},
  },
});

/** 308: a Minecraft server for families and schools: in by a parent's or a teacher's application only, stricter rules, no store, no rankings. */
export const MC_FAMILY = site({
  key: "site-minecraft-family",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("سيرفر ماينكرافت للعيلة والمدارس: قرية الصغار", "Minecraft for families and schools: Little Village", "מיינקראפט למשפחות ולבתי ספר: הכפר הקטן"),
  note: w("موقع سيرفر ماينكرافت Java آمن للصغار: الدخول بطلب من الأهل أو المعلّم وموافقة الطاقم (وايتلست)، قوانين أشدّ، بدون متجر ولا ترتيب، الأخبار، أسئلة الأهل، الاستئناف والبلاغ، ورسائل.", "A Minecraft Java server safe for children: in only by a parent's or a teacher's application and the staff's approval (a whitelist), stricter rules, no store and no rankings, news, parents' questions, appeals and reports, and messages.", "אתר לשרת מיינקראפט Java בטוח לילדים: כניסה רק בבקשה של הורה או מורה ובאישור הצוות (רשימה לבנה), חוקים מחמירים יותר, בלי חנות ובלי דירוג, חדשות, שאלות הורים, ערעורים ודיווחים והודעות."),
  biz: { name: w("قرية الصغار", "Little Village", "הכפר הקטן"), address: w("أونلاين", "Online", "אונליין"), hours: w("السيرفر مفتوح من 3 العصر لـ 8 المسا", "The server is open from 3 to 8 pm", "השרת פתוח מ־15:00 עד 20:00"), phone: "0", email: "parents@littlevillage.example", city: "" },
  pack: {
    label: w("قرية الصغار", "Little Village", "הכפר הקטן"),
    eyebrow: w("ماينكرافت آمن للعيلة والمدارس", "Safe Minecraft for families and schools", "מיינקראפט בטוח למשפחות ולבתי ספר"),
    title: w("مكان آمن يبنوا فيه الصغار سوا", "A safe place for children to build together", "מקום בטוח שבו ילדים בונים יחד"),
    sub: w("كل لاعب دخل بموافقة أهله، الطاقم موجود دايماً، والشات مراقب.", "Every player came in with a parent's consent, the staff is always there, and the chat is watched.", "כל שחקן נכנס בהסכמת הוריו, הצוות תמיד שם, והצ'אט מנוטר."),
    cta: w("قدّم طلب لابنك", "Apply for your child", "להגיש בקשה לילד"),
    product: w("القرية", "The village", "הכפר"),
    story: w("عملنا القرية لأنه ولادنا بدهم يلعبوا مع صحابهم، ونحنا بدنا نعرف مع مين.", "We made the village because our children want to play with their friends, and we want to know with whom.", "יצרנו את הכפר כי הילדים שלנו רוצים לשחק עם החברים, ואנחנו רוצים לדעת עם מי."),
    collection: w("آخر الأخبار", "Latest news", "החדשות האחרונות"),
    icon: "star",
  },
  home: "/village",
  modules: {
    status: {
      game: "minecraft",
      address: "play.littlevillage.example",
      discord: "",
      join: w("انسخ العنوان", "Copy the address", "להעתיק את הכתובת"),
      steps: [
        [w("قدّم طلب", "Apply", "להגיש בקשה"), w("الأهل أو المعلّم بيقدّموا من صفحة التقديم.", "A parent or a teacher applies on the apply page.", "הורה או מורה מגישים בעמוד ההגשה.")],
        [w("اربط الحساب", "Link the account", "לקשר את החשבון"), w("بعد القبول، اكتب /link والكود من «حسابي» جوّا اللعبة.", "Once accepted, type /link and the code from «My account» in the game.", "אחרי האישור, מקלידים /link ואת הקוד מ«החשבון שלי» במשחק.")],
        [w("فوت والعب", "Join and play", "להיכנס ולשחק"), w("بنسخة 1.21 من ماينكرافت Java.", "With Minecraft Java 1.21.", "עם מיינקראפט Java 1.21.")],
      ],
    },
    link: {},
    rules: {
      title: w("القوانين", "The rules", "החוקים"),
      sub: w("قوانين القرية أشدّ من أي سيرفر تاني، عشان الكل يكون مرتاح.", "The village's rules are stricter than any other server's, so everyone feels at ease.", "חוקי הכפר מחמירים מכל שרת אחר, כדי שכולם ירגישו בנוח."),
      changed: w("آخر تعديل 16 تشرين التاني: زدنا 2.3 عن الصور والروابط.", "Last changed on 16 November: we added 2.3 on pictures and links.", "שינוי אחרון ב־16 בנובמבר: הוספנו את 2.3 על תמונות וקישורים."),
      date: "2026-11-16",
      sections: [
        { key: "kind", name: w("لطافة", "Kindness", "נחמדות"), rows: [
          { n: "1.1", title: w("احكي بلطف", "Speak kindly", "לדבר בנחמדות"), text: w("ولا كلمة بتزعّل حدا. الشات بيمسح الكلمات المش منيحة لحاله.", "Not a word that hurts anyone. The chat removes bad words by itself.", "אף מילה שפוגעת. הצ'אט מוחק מילים לא יפות מעצמו.") },
          { n: "1.2", title: w("بدون تخريب", "No breaking others' builds", "לא להרוס בנייה של אחרים"), text: w("ما بتلمس بنا ولا صندوق حدا تاني.", "Don't touch anyone else's builds or chests.", "לא נוגעים בבנייה או בתיבות של אחרים.") },
          { n: "1.3", title: w("بدون قتال لاعبين", "No fighting other players", "בלי קרבות בין שחקנים"), text: w("القتال مسكّر بالقرية كلها.", "Fighting is off across the whole village.", "הקרבות כבויים בכל הכפר.") },
        ] },
        { key: "safe", name: w("الأمان", "Safety", "בטיחות"), rows: [
          { n: "2.1", title: w("ما بتعطي معلوماتك", "Keep your details to yourself", "לא לשתף פרטים"), text: w("لا اسمك الكامل ولا عنوانك ولا مدرستك ولا رقمك.", "Not your full name, address, school or phone number.", "לא שם מלא, לא כתובת, לא בית ספר ולא מספר טלפון.") },
          { n: "2.2", title: w("احكي للطاقم", "Tell the staff", "לספר לצוות"), text: w("إذا حدا زعّلك، اكتب /help والطاقم بيوصل.", "If anyone upsets you, type /help and the staff comes.", "אם מישהו מציק, מקלידים /help והצוות מגיע.") },
          { n: "2.3", title: w("بدون صور وروابط", "No pictures or links", "בלי תמונות וקישורים"), text: w("الروابط مسكّرة بالشات.", "Links are switched off in chat.", "קישורים חסומים בצ'אט.") },
        ] },
      ],
    },
    apply: {
      title: w("التقديم", "Apply", "הגשה"),
      sub: w("الأهل بيقدّموا لولادهم، والمعلّمين لصفوفهم. منرد خلال يومين.", "Parents apply for their children, teachers for their classes. We reply within two days.", "הורים מגישים בשביל הילדים, מורים בשביל הכיתות. נענה תוך יומיים."),
      wait: 3,
      votes: 1,
      kinds: [
        { key: "child", name: w("لاعب صغير (بموافقة الأهل)", "A young player (with a parent's consent)", "שחקן צעיר (בהסכמת הורה)"), line: w("ولي الأمر بيقدّم، وبيوافق على القوانين.", "The parent applies, and agrees to the rules.", "ההורה מגיש, ומסכים לחוקים."), needs: w("عمر 7 لـ 14، وولي أمر بيقرأ القوانين معه.", "Aged 7 to 14, with a parent who reads the rules with them.", "גיל 7 עד 14, עם הורה שקורא איתו את החוקים."), question: w("شو اسم حساب ماينكرافت تبع ابنك، وكم عمره، ومع مين بيحب يلعب؟", "What is your child's Minecraft account name, how old are they, and who do they like to play with?", "מה שם חשבון המיינקראפט של הילד, בן כמה הוא, ועם מי הוא אוהב לשחק?") },
        { key: "class", name: w("صف مدرسة", "A school class", "כיתה בבית ספר"), line: w("المعلّم بيجيب صفّه لدرس بالقرية.", "A teacher brings their class for a lesson in the village.", "מורה מביא את הכיתה לשיעור בכפר."), needs: w("معلّم مسؤول، وموعد ثابت بالأسبوع.", "A teacher in charge, and a set time each week.", "מורה אחראי, ושעה קבועה בשבוע."), question: w("شو المدرسة والصف، كم طالب، وشو بدك تعلّمهم بالقرية؟", "Which school and class, how many pupils, and what do you want to teach them in the village?", "איזה בית ספר וכיתה, כמה תלמידים, ומה תרצו ללמד אותם בכפר?") },
      ],
    },
    news: {
      title: w("الأخبار", "News", "חדשות"),
      sub: w("فعاليات القرية ورسائل للأهل.", "The village's events, and notes for parents.", "אירועי הכפר והודעות להורים."),
      rows: [
        { slug: "build-week", date: "2026-11-17", title: w("أسبوع بناء المدرسة", "School build week", "שבוע בניית בית הספר"), text: w("الصغار عم يبنوا مدرسة القرية سوا.", "The children are building the village school together.", "הילדים בונים יחד את בית הספר של הכפר."), body: w("كل يوم من 4 لـ 6، والطاقم معهم. الصور بتنزل هون آخر الأسبوع.", "Every day from 4 to 6, with the staff. Pictures go up here at the end of the week.", "כל יום מ־16:00 עד 18:00, עם הצוות. התמונות יעלו כאן בסוף השבוע.") },
        { slug: "hours-note", date: "2026-11-05", title: w("ساعات السيرفر", "The server's hours", "שעות השרת"), text: w("من 3 العصر لـ 8 المسا.", "From 3 to 8 pm.", "מ־15:00 עד 20:00."), body: w("السيرفر بيسكّر الساعة 8 المسا كل يوم، عشان النوم والمدرسة.", "The server closes at 8 pm every day, for sleep and school.", "השרת נסגר ב־20:00 כל יום, בשביל שינה ובית ספר.") },
      ],
    },
    team: {
      title: w("الطاقم", "The staff", "הצוות"),
      sub: w("أهل ومعلّمين، وكلهم مفحوصين.", "Parents and teachers, every one of them checked.", "הורים ומורים, כולם נבדקו."),
      rows: [
        { name: w("أم سامر", "Umm Samer", "אום סאמר"), role: w("مؤسّسة القرية", "The village's founder", "מייסדת הכפר"), bio: w("معلّمة علوم، وأم لتلاتة لاعبين.", "A science teacher, and mother of three players.", "מורה למדעים, ואמא לשלושה שחקנים.") },
        { name: w("الأستاذ وليد", "Mr Walid", "המורה וליד"), role: w("مسؤول المدارس", "Schools lead", "אחראי בתי הספר"), bio: w("بيرتّب دروس الصفوف بالقرية.", "He arranges the classes' lessons in the village.", "מארגן את שיעורי הכיתות בכפר.") },
      ],
    },
    questions: { rows: [
      { q: w("مين بيشوف الشات؟", "Who watches the chat?", "מי רואה את הצ'אט?"), a: w("الطاقم بيشوفه كله، والكلمات المش منيحة بتنمسح لحالها.", "The staff sees all of it, and bad words are removed by themselves.", "הצוות רואה את כולו, ומילים לא יפות נמחקות מעצמן.") },
      { q: w("في شي للبيع؟", "Is anything for sale?", "יש משהו למכירה?"), a: w("لأ. ولا متجر ولا باقات بالقرية.", "No. There's no store and no packages in the village.", "לא. אין חנות ואין חבילות בכפר.") },
      { q: w("مين بيقدر يفوت؟", "Who can join?", "מי יכול להיכנס?"), a: w("بس اللي أهلهم أو معلّمهم قدّموا والطاقم قبلهم.", "Only those whose parent or teacher applied and the staff accepted.", "רק מי שההורה או המורה שלו הגיש והצוות אישר.") },
      { q: w("صار شي مزعج مع ابني، لمين بحكي؟", "Something upsetting happened to my child; who do I tell?", "קרה משהו לא נעים לילד; למי לפנות?"), a: w("ابعت بلاغ من صفحة «الاستئناف والبلاغ»، أو راسلنا. منرد بنفس اليوم.", "Send a report on the appeals and reports page, or message us. We reply the same day.", "שלחו דיווח בעמוד הערעורים והדיווחים, או כתבו לנו. נענה באותו יום.") },
    ] },
    appeals: {
      title: w("الاستئناف والبلاغ", "Appeals and reports", "ערעורים ודיווחים"),
      sub: w("للأهل والمعلّمين: بلاغ عن شي صار، أو استئناف على منع.", "For parents and teachers: report something that happened, or appeal a ban.", "להורים ולמורים: לדווח על משהו שקרה, או לערער על חסימה."),
      reasons: [
        ["unkind", w("كلام بيزعّل", "Hurtful words", "מילים פוגעות")],
        ["grief", w("تخريب بنا حدا", "Breaking someone's build", "הרס בנייה של מישהו")],
        ["details", w("حدا طلب معلومات شخصية", "Someone asked for personal details", "מישהו ביקש פרטים אישיים")],
        ["other", w("شي تاني", "Something else", "משהו אחר")],
      ],
    },
    contact: {},
    notify: {},
  },
});

/** 312: a Garry's Mod roleplay town (as FiveM's, with Steam): rules, jobs by application, appeals and reports. No store. */
export const GMOD_RP = site({
  key: "site-gmod-rp",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("سيرفر Garry's Mod رول بلاي: بلدة الكرز", "Garry's Mod roleplay server: Cherry Town", "שרת רולפליי Garry's Mod: עיירת הדובדבן"),
  note: w("موقع سيرفر رول بلاي على Garry's Mod: الحالة الحيّة من Steam و«فوت هلّق»، المحتوى من Workshop، القوانين، التقديم على الوظائف بتصويت الطاقم، الاستئناف والبلاغ، الطاقم، الستريمرز، الأخبار، أسئلة ورسائل.", "A Garry's Mod roleplay server's site: the live status from Steam and «join now», the content from the Workshop, rules, applying for jobs with the staff's votes, appeals and reports, staff, streamers, news, questions and messages.", "אתר לשרת רולפליי ב־Garry's Mod: המצב החי מ־Steam ו«להתחבר עכשיו», התוכן מה־Workshop, חוקים, הגשה לעבודות בהצבעת הצוות, ערעורים ודיווחים, צוות, סטרימרים, חדשות, שאלות והודעות."),
  biz: { name: w("بلدة الكرز", "Cherry Town", "עיירת הדובדבן"), address: w("أونلاين", "Online", "אונליין"), hours: w("السيرفر شغّال 24/7", "The server runs 24/7", "השרת פועל 24/7"), phone: "0", email: "staff@cherrytown.example", city: "" },
  pack: {
    label: w("بلدة الكرز", "Cherry Town", "עיירת הדובדבן"),
    eyebrow: w("رول بلاي على Garry's Mod", "Roleplay on Garry's Mod", "רולפליי ב־Garry's Mod"),
    title: w("بلدة صغيرة، وألف قصة", "A small town, and a thousand stories", "עיירה קטנה, ואלף סיפורים"),
    sub: w("افتح دكانك، صير شرطي أو عمدة، أو عيش على الهامش: البلدة بتتغيّر مع كل واحد.", "Open a shop, become a cop or the mayor, or live on the edge: the town changes with everyone.", "פתחו חנות, היו שוטרים או ראש העיר, או חיו בשוליים: העיירה משתנה עם כל אחד."),
    cta: w("فوت هلّق", "Join now", "להתחבר עכשיו"),
    product: w("البلدة", "The town", "העיירה"),
    story: w("بلّشنا البلدة بعشرة صحاب، وصار فيها مية ساكن كل ليلة.", "We started the town with ten friends, and now a hundred residents fill it each night.", "התחלנו את העיירה עם עשרה חברים, ועכשיו מאה תושבים ממלאים אותה כל לילה."),
    collection: w("آخر الأخبار", "Latest news", "החדשות האחרונות"),
    icon: "star",
  },
  home: "/town",
  modules: {
    status: {
      game: "steam",
      address: "play.cherrytown.example:27015",
      discord: "https://discord.gg/cherrytown",
      join: w("فوت هلّق", "Join now", "להתחבר עכשיו"),
      steps: [
        [w("افتح Garry's Mod", "Open Garry's Mod", "לפתוח את Garry's Mod"), w("من Steam، مع Counter-Strike: Source للخرايط إذا عندك.", "From Steam, with Counter-Strike: Source for the maps if you have it.", "מ־Steam, עם Counter-Strike: Source למפות אם יש.")],
        [w("اشترك بالمحتوى", "Subscribe to the content", "להירשם לתוכן"), w("مجموعة البلدة على Workshop، عشان ما يطلعلك شي ناقص.", "The town's Workshop collection, so nothing shows up missing.", "האוסף של העיירה ב־Workshop, כדי ששום דבר לא יחסר.")],
        [w("فوت هلّق", "Join now", "להתחבר עכשיו"), w("الكبسة بتفتح اللعبة عالسيرفر.", "The button opens the game on the server.", "הכפתור פותח את המשחק על השרת.")],
      ],
    },
    rules: {
      title: w("القوانين", "The rules", "החוקים"),
      sub: w("بلدة حلوة لأنه الكل بيلعب دوره. اقراها قبل ما تفوت.", "A good town because everyone plays their part. Read them before you join.", "עיירה טובה כי כל אחד ממלא את התפקיד. קראו לפני שנכנסים."),
      changed: w("آخر تعديل 17 تشرين التاني: زدنا 2.3 عن الدكاكين.", "Last changed on 17 November: we added 2.3 on shops.", "שינוי אחרון ב־17 בנובמבר: הוספנו את 2.3 על חנויות."),
      date: "2026-11-17",
      sections: [
        { key: "general", name: w("عام", "General", "כללי"), rows: [
          RESPECT,
          { n: "1.2", title: w("بدون إزعاج بالأغراض", "No prop abuse", "בלי שימוש לרעה בחפצים"), text: w("ما بتستعمل الأغراض لتطيّر حدا ولا لتسكّر الطريق.", "Don't use props to fling anyone or block the road.", "לא משתמשים בחפצים כדי להעיף מישהו או לחסום דרך.") },
          ONE_ACCOUNT,
        ] },
        { key: "roleplay", name: w("الرول بلاي", "Roleplay", "רולפליי"), rows: [
          { n: "2.1", title: w("قتل بسبب", "Killing needs a reason", "הריגה רק עם סיבה"), text: w("ما بتقتل حدا بدون قصة.", "Don't kill anyone without a story.", "לא הורגים בלי סיפור.") },
          { n: "2.2", title: w("حياة جديدة", "A new life", "חיים חדשים"), text: w("بعد ما تموت، بتنسى اللي صار قبلها.", "After you die, you forget what led to it.", "אחרי שמתים, שוכחים מה הוביל לזה.") },
          { n: "2.3", title: w("الدكاكين", "Shops", "חנויות"), text: w("الدكان لازم يكون فيه حدا عم يبيع، مش بس باب مسكّر.", "A shop needs someone selling in it, not just a locked door.", "בחנות צריך מישהו שמוכר, לא רק דלת נעולה.") },
        ] },
      ],
    },
    apply: {
      title: w("التقديم", "Apply", "הגשה"),
      sub: w("الشرطة، العمدة، أو طاقم الإدارة: قدّم لدورك.", "The police, the mayor, or the staff: apply for your part.", "המשטרה, ראש העיר, או הצוות: הגישו לתפקיד."),
      wait: 7,
      votes: 2,
      kinds: [
        { key: "police", name: w("الشرطة", "Police", "משטרה"), line: w("بتحمي البلدة وبتطبّق قوانين العمدة.", "You keep the town safe and enforce the mayor's laws.", "שומרים על העיירה ואוכפים את חוקי ראש העיר."), needs: w("16 وفوق، مايك، وأسبوعين باللعب عنّا.", "16 or older, a mic, and two weeks playing with us.", "גיל 16 ומעלה, מיקרופון ושבועיים אצלנו."), question: w("العمدة طلب منك تحبس حدا بدون سبب. شو بتعمل؟", "The mayor tells you to jail someone for no reason. What do you do?", "ראש העיר מבקש לעצור מישהו בלי סיבה. מה תעשו?") },
        { key: "mayor", name: w("العمدة", "Mayor", "ראש העיר"), line: w("بتحط قوانين البلدة وبتدير الشرطة.", "You set the town's laws and lead the police.", "קובעים את חוקי העיירה ומובילים את המשטרה."), needs: w("18 وفوق، وشهر باللعب عنّا.", "18 or older, and a month playing with us.", "גיל 18 ומעלה, וחודש אצלנו."), question: w("أول ثلاث قوانين بتحطهم إذا صرت عمدة، وليش؟", "The first three laws you'd set as mayor, and why?", "שלושת החוקים הראשונים שתקבעו כראש העיר, ולמה?") },
        { key: "staff", name: w("طاقم الإدارة", "The staff", "הצוות"), line: w("بتساعد اللاعبين وبتحل المشاكل.", "You help players and sort out problems.", "עוזרים לשחקנים ופותרים בעיות."), needs: w("18 وفوق، شهرين باللعب عنّا، وسجل نظيف.", "18 or older, two months playing with us, and a clean record.", "גיל 18 ומעלה, חודשיים אצלנו ותיק נקי."), question: w("لاعب عم يطيّر الكل بالأغراض. كيف بتتصرّف؟", "A player keeps flinging everyone with props. What do you do?", "שחקן מעיף את כולם עם חפצים. מה תעשו?") },
      ],
    },
    team: {
      title: w("الطاقم", "The staff", "הצוות"),
      sub: w("ساكنين بالبلدة من أول يوم.", "Residents of the town since day one.", "תושבי העיירה מהיום הראשון."),
      rows: [
        { name: w("كرم", "Karam", "כרם"), role: w("المؤسّس", "Founder", "מייסד"), bio: w("كتب قوانين البلدة الأولى على ورقة.", "He wrote the town's first rules on a sheet of paper.", "כתב את החוקים הראשונים של העיירה על דף.") },
        { name: w("هيا", "Haya", "היה"), role: w("مسؤولة الطاقم", "Head of staff", "ראש הצוות"), bio: w("بتردّ عالبلاغات قبل ما تبرد القهوة.", "She answers reports before the coffee cools.", "עונה לדיווחים לפני שהקפה מתקרר.") },
      ],
    },
    streamers: {
      title: w("الستريمرز", "Streamers", "סטרימרים"),
      sub: w("مين بيبث البلدة. اللي لايف هلّق أول.", "Who streams the town. Those live now come first.", "מי משדר את העיירה. מי שבשידור עכשיו ראשון."),
      rows: [
        { slug: "mayor-tarek", name: w("العمدة طارق", "Mayor Tarek", "ראש העיר טארק"), twitch: "", about: w("جلسات البلدية، والقرارات الصعبة.", "Town hall sittings, and the hard decisions.", "ישיבות העירייה, וההחלטות הקשות.") },
        { slug: "shop-mira", name: w("دكان ميرا", "Mira's shop", "החנות של מירה"), twitch: "", about: w("بتبيع كل إشي، وبتسمع كل القصص.", "She sells everything, and hears every story.", "מוכרת הכול, ושומעת כל סיפור.") },
      ],
    },
    news: {
      title: w("الأخبار", "News", "חדשות"),
      sub: w("شو جديد بالبلدة.", "What's new in the town.", "מה חדש בעיירה."),
      rows: [
        { slug: "elections", date: "2026-11-19", title: w("انتخابات العمدة", "The mayor's election", "הבחירות לראשות העיר"), text: w("التصويت السبت جوّا اللعبة.", "Voting is on Saturday, in the game.", "ההצבעה בשבת, במשחק."), body: w("تلات مرشّحين، ومناظرة الجمعة بالساحة. الفايز بيمسك البلدة شهر.", "Three candidates, and a debate on Friday in the square. The winner runs the town for a month.", "שלושה מועמדים, ועימות ביום שישי בכיכר. הזוכה מנהל את העיירה חודש.") },
        { slug: "new-map", date: "2026-11-08", title: w("خريطة البلدة كبرت", "The town's map got bigger", "המפה של העיירה גדלה"), text: w("حي جديد ومحطة قطار.", "A new district and a train station.", "שכונה חדשה ותחנת רכבת."), body: w("حدّثوا محتوى Workshop قبل ما تفوتوا، عشان تشوفوا الحي الجديد.", "Update the Workshop content before you join, to see the new district.", "עדכנו את תוכן ה־Workshop לפני הכניסה, כדי לראות את השכונה החדשה.") },
      ],
    },
    questions: { rows: [
      { q: w("ليش بشوف أغراض ناقصة؟", "Why do I see missing things?", "למה אני רואה דברים חסרים?"), a: w("اشترك بمجموعة البلدة على Workshop، وإذا بتقدر نزّل محتوى Counter-Strike: Source.", "Subscribe to the town's Workshop collection, and get Counter-Strike: Source's content if you can.", "הירשמו לאוסף של העיירה ב־Workshop, והורידו את התוכן של Counter-Strike: Source אם אפשר.") },
      { q: w("في متجر؟", "Is there a store?", "יש חנות?"), a: w("لسّا لأ. ولما يصير، ولا شي فيه رح يعطي أفضلية.", "Not yet. And when there is, nothing in it will give an advantage.", "עדיין לא. וכשתהיה, שום דבר בה לא ייתן יתרון.") },
      { q: w("كيف بصير شرطي؟", "How do I become a cop?", "איך נעשים שוטרים?"), a: w("قدّم من صفحة التقديم، والطاقم بيصوّت خلال أسبوع.", "Apply on the apply page; the staff votes within a week.", "הגישו בעמוד ההגשה; הצוות מצביע תוך שבוע.") },
      BANNED,
    ] },
    appeals: {
      title: w("الاستئناف والبلاغ", "Appeals and reports", "ערעורים ודיווחים"),
      sub: w("انبنّدت وشايف إنه غلط، أو شفت حدا عم يخرّب البلدة؟ من هون.", "Banned and think it was wrong, or saw someone wrecking the town? Here.", "קיבלתם באן וחושבים שזו טעות, או ראיתם מישהו הורס את העיירה? כאן."),
      reasons: [
        ["cheating", w("غش أو هاكات", "Cheating or hacks", "רמאות או האקים")],
        ["props", w("إزعاج بالأغراض", "Prop abuse", "שימוש לרעה בחפצים")],
        ["rdm", w("قتل بلا سبب", "Killing for no reason", "הריגה בלי סיבה")],
        ["toxic", w("شتائم أو تحرّش", "Insults or harassment", "קללות או הטרדה")],
        ["other", w("شي تاني", "Something else", "משהו אחר")],
      ],
    },
    contact: {},
    notify: {},
  },
});

/** 313: a co-op survival server (a Valheim or ARK kind of game): the mods to install, the update day on a countdown. */
export const COOP_SURVIVAL = site({
  key: "site-coop-survival",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("سيرفر سرفايفل جماعي: مخيّم الشمال", "Co-op survival server: Northern Camp", "שרת הישרדות שיתופי: מחנה הצפון"),
  note: w("موقع سيرفر سرفايفل جماعي (لألعاب متل Valheim و ARK على Steam): الحالة الحيّة و«فوت هلّق»، لائحة المودات اللي لازم تنزّلها، عدّاد ليوم التحديث وشو بيتغيّر، القوانين، الطاقم، الستريمرز، الأخبار، الاستئناف والبلاغ، ورسائل.", "A co-op survival server's site (for games like Valheim and ARK on Steam): the live status and «join now», the list of mods to install, a countdown to the update day and what changes, rules, staff, streamers, news, appeals and reports, and messages.", "אתר לשרת הישרדות שיתופי (למשחקים כמו Valheim ו־ARK ב־Steam): המצב החי ו«להתחבר עכשיו», רשימת המודים להתקנה, ספירה ליום העדכון ומה משתנה, חוקים, צוות, סטרימרים, חדשות, ערעורים ודיווחים והודעות."),
  biz: { name: w("مخيّم الشمال", "Northern Camp", "מחנה הצפון"), address: w("أونلاين", "Online", "אונליין"), hours: w("السيرفر شغّال 24/7", "The server runs 24/7", "השרת פועל 24/7"), phone: "0", email: "camp@northcamp.example", city: "" },
  pack: {
    label: w("مخيّم الشمال", "Northern Camp", "מחנה הצפון"),
    eyebrow: w("سرفايفل جماعي على Steam", "Co-op survival on Steam", "הישרדות שיתופית ב־Steam"),
    title: w("الشتا طويل، والقبيلة أقوى سوا", "The winter is long, and the clan is stronger together", "החורף ארוך, והשבט חזק יותר יחד"),
    sub: w("ابنوا قرية، اصطادوا، وواجهوا الوحوش الكبار سوا. تحديث كل أربعا.", "Build a village, hunt, and take on the great beasts together. An update every Wednesday.", "בנו כפר, צודו, והתמודדו יחד עם החיות הגדולות. עדכון בכל רביעי."),
    cta: w("فوت هلّق", "Join now", "להתחבר עכשיו"),
    product: w("المخيّم", "The camp", "המחנה"),
    story: w("بلّشنا بخيمة وحدة ونار، وصار المخيّم قرية فيها خمسين واحد.", "We started with one tent and a fire, and the camp became a village of fifty.", "התחלנו באוהל אחד ומדורה, והמחנה הפך לכפר של חמישים."),
    collection: w("آخر الأخبار", "Latest news", "החדשות האחרונות"),
    icon: "star",
  },
  home: "/camp",
  modules: {
    status: {
      game: "steam",
      address: "play.northcamp.example:27015",
      discord: "https://discord.gg/northcamp",
      join: w("فوت هلّق", "Join now", "להתחבר עכשיו"),
      steps: [
        [w("نزّل المودات", "Install the mods", "להתקין את המודים"), w("اللائحة بصفحة القوانين، بنفس النسخ اللي عالسيرفر.", "The list is on the rules page, at the server's versions.", "הרשימה בעמוד החוקים, באותן גרסאות כמו בשרת.")],
        [w("افتح اللعبة", "Open the game", "לפתוח את המשחק"), w("من Steam، على نفس نسخة السيرفر.", "From Steam, on the server's version.", "מ־Steam, באותה גרסה כמו השרת.")],
        [w("فوت هلّق", "Join now", "להתחבר עכשיו"), w("الكبسة بتفتح اللعبة عالسيرفر، والكلمة السر بالديسكورد.", "The button opens the game on the server; the password is on Discord.", "הכפתור פותח את המשחק על השרת; הסיסמה בדיסקורד.")],
      ],
    },
    wipe: {
      title: w("يوم التحديث", "Update day", "יום העדכון"),
      sub: w("إمتى التحديث الجاي، وشو بيتغيّر.", "When the next update is, and what changes.", "מתי העדכון הבא, ומה משתנה."),
      line: w("كل أربعا الساعة 6 المسا: المودات بتتحدّث، والسيرفر بيطفي ربع ساعة.", "Every Wednesday at 6 pm: the mods update, and the server is down for a quarter of an hour.", "בכל רביעי ב־18:00: המודים מתעדכנים, והשרת כבוי לרבע שעה."),
      words: {
        next: w("التحديث الجاي", "The next update", "העדכון הבא"),
        done: w("التحديث نزل! حدّثوا المودات وفوتوا.", "The update is out! Update your mods and join.", "העדכון יצא! עדכנו את המודים והתחברו."),
        none: w("موعد التحديث الجاي بيطلع هون قريباً.", "The next update's date shows here soon.", "מועד העדכון הבא יופיע כאן בקרוב."),
        what: w("شو بيصير يوم التحديث", "What happens on update day", "מה קורה ביום העדכון"),
        whatSub: w("عشان ما تتفاجأ.", "So nothing takes you by surprise.", "כדי ששום דבר לא יפתיע."),
      },
      slug: "/update-day",
      every: "weekly",
      day: "wed",
      time: "18:00",
      zone: "berlin",
      note: w("قبل التحديث بساعة منكتب بالديسكورد شو تغيّر.", "An hour before the update we post on Discord what changed.", "שעה לפני העדכון נכתוב בדיסקורד מה השתנה."),
      what: [
        [w("المودات", "The mods", "המודים"), w("بتتحدّث كلها لآخر نسخة، وبتنكتب باللائحة.", "They all move to their latest version, written on the list.", "כולם עוברים לגרסה האחרונה, שנכתבת ברשימה.")],
        [w("العالم", "The world", "העולם"), w("ما بينمسح: بيوتكم وأغراضكم بتضل.", "It isn't wiped: your homes and things stay.", "לא נמחק: הבתים והחפצים נשארים.")],
        [w("نسخة احتياط", "A backup", "גיבוי"), w("منحفظ نسخة من العالم قبل كل تحديث.", "We keep a copy of the world before every update.", "שומרים עותק של העולם לפני כל עדכון.")],
      ],
    },
    rules: {
      title: w("القوانين والمودات", "Rules and mods", "חוקים ומודים"),
      sub: w("المخيّم للكل. اقرأ القوانين، ونزّل المودات قبل ما تفوت.", "The camp is for everyone. Read the rules, and install the mods before you join.", "המחנה לכולם. קראו את החוקים, והתקינו את המודים לפני הכניסה."),
      changed: w("آخر تعديل 19 تشرين التاني: زدنا مود الخرايط.", "Last changed on 19 November: we added the map mod.", "שינוי אחרון ב־19 בנובמבר: הוספנו את מוד המפה."),
      date: "2026-11-19",
      sections: [
        { key: "general", name: w("عام", "General", "כללי"), rows: [
          RESPECT,
          { n: "1.2", title: w("بدون تخريب", "No griefing", "בלי הרס"), text: w("ما بتلمس بيت ولا صندوق حدا تاني.", "Don't touch anyone else's home or chests.", "לא נוגעים בבית או בתיבות של אחרים.") },
          { n: "1.3", title: w("الوحوش الكبار سوا", "Great beasts together", "חיות גדולות ביחד"), text: w("ما بتستدعي وحش كبير جنب قرية حدا.", "Don't summon a great beast next to someone's village.", "לא מזמנים חיה גדולה ליד כפר של מישהו.") },
        ] },
        { key: "mods", name: w("المودات المطلوبة", "Required mods", "מודים נדרשים"), rows: [
          { n: "2.1", title: w("محمّل المودات", "The mod loader", "טוען המודים"), text: w("أول إشي، وبنفس نسخة السيرفر.", "First of all, at the server's version.", "לפני הכול, באותה גרסה כמו השרת.") },
          { n: "2.2", title: w("مود الخرايط", "The map mod", "מוד המפה"), text: w("بيشارك الخريطة مع قبيلتك.", "Shares the map with your clan.", "משתף את המפה עם השבט.") },
          { n: "2.3", title: w("مود البناء", "The building mod", "מוד הבנייה"), text: w("قطع بناء زيادة، بدون ما يغيّر القتال.", "More building pieces, without changing combat.", "עוד חלקי בנייה, בלי לשנות את הקרבות.") },
        ] },
      ],
    },
    team: {
      title: w("الطاقم", "The staff", "הצוות"),
      sub: w("أول ناس بنوا بالمخيّم.", "The first to build in the camp.", "הראשונים שבנו במחנה."),
      rows: [
        { name: w("بشير", "Bashir", "בשיר"), role: w("المؤسّس", "Founder", "מייסד"), bio: w("ولّع أول نار بالمخيّم.", "He lit the camp's first fire.", "הדליק את המדורה הראשונה במחנה.") },
        { name: w("سلمى", "Salma", "סלמה"), role: w("مسؤولة المودات", "Mods keeper", "אחראית המודים"), bio: w("بتجرّب كل تحديث قبل ما ينزل.", "She tries every update before it goes out.", "בודקת כל עדכון לפני שהוא יוצא.") },
      ],
    },
    streamers: {
      title: w("الستريمرز", "Streamers", "סטרימרים"),
      sub: w("مين بيبث المخيّم. اللي لايف هلّق أول.", "Who streams the camp. Those live now come first.", "מי משדר את המחנה. מי שבשידור עכשיו ראשון."),
      rows: [
        { slug: "hunter-omar", name: w("عمر الصيّاد", "Omar the hunter", "עומר הצייד"), twitch: "", about: w("صيد الوحوش الكبار، ليلة الأربعا.", "Hunting great beasts, on Wednesday nights.", "ציד חיות גדולות, בלילות רביעי.") },
        { slug: "builder-nada", name: w("ندى بتبني", "Nada builds", "נדה בונה"), twitch: "", about: w("بيوت خشب بتتحمّل الشتا.", "Wooden houses that last the winter.", "בתי עץ ששורדים את החורף.") },
      ],
    },
    news: {
      title: w("الأخبار", "News", "חדשות"),
      sub: w("التحديثات والفعاليات.", "Updates and events.", "עדכונים ואירועים."),
      rows: [
        { slug: "map-mod", date: "2026-11-19", title: w("انضاف مود الخرايط", "The map mod is in", "מוד המפה נוסף"), text: w("خريطة وحدة للقبيلة.", "One map for the whole clan.", "מפה אחת לכל השבט."), body: w("نزّلوه قبل الأربعا، والسيرفر ما بيقبل بدونه بعد التحديث.", "Install it before Wednesday; after the update the server won't let you in without it.", "התקינו לפני רביעי; אחרי העדכון השרת לא יכניס בלעדיו.") },
        { slug: "boss-night", date: "2026-11-13", title: w("ليلة الوحش الكبير", "Great beast night", "ליל החיה הגדולה"), text: w("السبت، كل المخيّم سوا.", "Saturday, the whole camp together.", "שבת, כל המחנה יחד."), body: w("السبت الساعة 9 المسا منتجمّع بالساحة ومنطلع سوا.", "Saturday at 9 pm we gather in the square and set out together.", "בשבת ב־21:00 מתאספים בכיכר ויוצאים יחד.") },
      ],
    },
    questions: { rows: [
      { q: w("ليش ما بقدر أفوت؟", "Why can't I get in?", "למה אני לא מצליח להיכנס?"), a: w("غالباً المودات مش بنفس نسخة السيرفر. شوف اللائحة وحدّثها.", "Usually your mods aren't at the server's versions. Check the list and update them.", "בדרך כלל המודים לא באותה גרסה כמו השרת. בדקו את הרשימה ועדכנו.") },
      { q: w("العالم بينمسح؟", "Is the world wiped?", "העולם נמחק?"), a: w("لأ، التحديث كل أربعا ما بيمسح شي.", "No, Wednesday's update wipes nothing.", "לא, העדכון של רביעי לא מוחק כלום.") },
      { q: w("في متجر؟", "Is there a store?", "יש חנות?"), a: w("لأ، المخيّم بلاش وبيضل بلاش.", "No, the camp is free and stays free.", "לא, המחנה חינמי ונשאר חינמי.") },
      BANNED,
    ] },
    appeals: {
      title: w("الاستئناف والبلاغ", "Appeals and reports", "ערעורים ודיווחים"),
      sub: w("انبنّدت وشايف إنه غلط، أو حدا خرّب بيتك؟ من هون.", "Banned and think it was wrong, or someone wrecked your home? Here.", "קיבלתם באן וחושבים שזו טעות, או שמישהו הרס את הבית? כאן."),
      reasons: [
        ["cheating", w("غش أو مودات ممنوعة", "Cheating or banned mods", "רמאות או מודים אסורים")],
        ["grief", w("تخريب أو سرقة", "Griefing or stealing", "הרס או גניבה")],
        ["toxic", w("شتائم أو تحرّش", "Insults or harassment", "קללות או הטרדה")],
        ["other", w("شي تاني", "Something else", "משהו אחר")],
      ],
    },
    contact: {},
    notify: {},
  },
});
