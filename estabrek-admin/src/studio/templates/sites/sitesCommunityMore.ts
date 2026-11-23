/**
 * More gamers' community sites (wave G7c2 of docs/sites-300-plan.ar.md): a looking-for-a-group board (posts by game,
 * rank and time that show at once and close by themselves, with its Discord as its pulse) and a gaming streamer (live
 * now from their Twitch channel, the week's streams, clips, sponsors with their codes, and their followers' server).
 */
import { w } from "../words";
import { site } from "./blueprint";
import { LFG_REGIONS } from "./modules/lfg";

const RESPECT = { n: "1.1", title: w("احترم الكل", "Respect everyone", "כבוד לכולם"), text: w("ما في شتائم ولا عنصرية ولا تحرّش، باللعب ولا بالديسكورد.", "No slurs, racism or harassment, in games or on Discord.", "בלי קללות, גזענות או הטרדה, במשחקים ובדיסקורד.") };

/** 317: a looking-for-a-group board: posts by game, rank and time that close by themselves, and its Discord. */
export const LFG_BOARD = site({
  key: "site-lfg-board",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("«دوّر على فريق»: لاقي فريقك", "Looking for a group: Find Your Squad", "מחפשים קבוצה: מצאו את החוליה"),
  note: w("لوحة «دوّر على فريق»: اللاعب بيحط طلب (اللعبة، النمط، رتبته، جهازه، منطقته، إمتى، والمايك) وبيطلع على طول، مقسوم حسب اللعبة وبيتحدّث لحاله، وبيسكّر لحاله بعد وقته. ومعها الديسكورد بأونلاينه، القوانين، وأسئلة.", "A looking-for-a-group board: a player puts up a post (the game, the mode, their rank, platform, region, when, and the mic) that shows at once, by game, updating by itself, and closes by itself after its time. With the Discord and who is on, the rules, and questions.", "לוח «מחפשים קבוצה»: שחקן מעלה פוסט (המשחק, המצב, הדרגה, הפלטפורמה, האזור, מתי והמיקרופון) שמופיע מיד, לפי משחק, מתעדכן לבד ונסגר לבד אחרי הזמן שלו. עם הדיסקורד ומי מחובר, החוקים ושאלות."),
  biz: { name: w("لاقي فريقك", "Find Your Squad", "מצאו את החוליה"), address: w("أونلاين", "Online", "אונליין"), hours: w("اللوحة مفتوحة 24/7", "The board is open 24/7", "הלוח פתוח 24/7"), phone: "0", email: "mods@findsquad.example", city: "" },
  pack: {
    label: w("لاقي فريقك", "Find Your Squad", "מצאו את החוליה"),
    eyebrow: w("لوحة «دوّر على فريق»", "A looking-for-a-group board", "לוח מחפשים קבוצה"),
    title: w("ما تلعب لحالك الليلة", "Don't play alone tonight", "אל תשחקו לבד הלילה"),
    sub: w("حط طلب بثواني: شو بتلعب، رتبتك، وإمتى. واللي بدّه يلعب معك بيبعتلك عالديسكورد.", "Post in seconds: what you play, your rank, and when. Whoever wants to play with you messages you on Discord.", "פרסמו בשניות: במה אתם משחקים, הדרגה ומתי. מי שרוצה לשחק איתכם ישלח הודעה בדיסקורד."),
    cta: w("حط طلبك", "Put up your post", "העלו פוסט"),
    product: w("الطلبات", "The posts", "הפוסטים"),
    story: w("تعبنا نلعب مع ناس عشوائيين بيطلعوا من نص المباراة، فعملنا لوحة لناس بدها تلعب بجد.", "We got tired of random players leaving mid-match, so we made a board for people who want to play for real.", "נמאס לנו משחקנים אקראיים שעוזבים באמצע, אז בנינו לוח לאנשים שרוצים לשחק ברצינות."),
    collection: w("آخر الطلبات", "Latest posts", "הפוסטים האחרונים"),
    icon: "star",
  },
  home: "/find",
  modules: {
    status: {
      game: "discord",
      address: "https://discord.gg/findsquad",
      // The board's Discord is its status: no second button for it.
      discord: "",
      join: w("فوت عالديسكورد", "Join the Discord", "להצטרף לדיסקורד"),
      steps: [
        [w("فوت بحسابك", "Sign in", "להתחבר"), w("بحساب Discord أو Google.", "With Discord or Google.", "עם Discord או Google.")],
        [w("حط طلبك", "Put up your post", "להעלות פוסט"), w("اللعبة، رتبتك، وإمتى بدّك تلعب.", "The game, your rank, and when you want to play.", "המשחק, הדרגה ומתי רוצים לשחק.")],
        [w("استنّى رسالة", "Wait for a message", "לחכות להודעה"), w("أو ابعت إنت لحدا من اللوحة: انسخ اسمه وراسله.", "Or message someone on the board yourself: copy their name and write to them.", "או שלחו בעצמכם למישהו מהלוח: העתיקו את השם וכתבו לו.")],
      ],
    },
    lfg: {
      title: w("مين بدّه يلعب؟", "Who wants to play?", "מי רוצה לשחק?"),
      sub: w("الطلبات المفتوحة حسب اللعبة، الأحدث أول. بتسكّر لحالها بعد وقتها.", "The open posts by game, newest first. They close by themselves after their time.", "הפוסטים הפתוחים לפי משחק, החדשים קודם. הם נסגרים לבד אחרי הזמן שלהם."),
      games: [
        ["valorant", w("Valorant", "Valorant", "Valorant")],
        ["fortnite", w("Fortnite", "Fortnite", "Fortnite")],
        ["rocketleague", w("Rocket League", "Rocket League", "Rocket League")],
        ["minecraft", w("ماينكرافت", "Minecraft", "מיינקראפט")],
      ],
      regions: LFG_REGIONS,
      rows: [
        { game: "valorant", mode: w("رانكد 5 ضد 5", "Ranked 5v5", "דירוג 5 נגד 5"), rank: w("بلاتين 2", "Platinum 2", "פלטינה 2"), region: "eu", platform: "pc", when: "tonight", mic: true, discordName: "sahm_aim", note: w("بدّي اتنين يلعبوا سنتينل ودويليست.", "Looking for two: a sentinel and a duelist.", "מחפש שניים: סנטינל ודואליסט.") },
        { game: "rocketleague", mode: w("2 ضد 2", "2v2", "2 נגד 2"), rank: w("دايموند", "Diamond", "יהלום"), region: "me", platform: "playstation", when: "now", mic: true, discordName: "layla_rl", note: w("بدّي شريك ثابت للأسبوع.", "Looking for a steady partner this week.", "מחפשת שותף קבוע לשבוע.") },
        { game: "minecraft", mode: w("سرفايفل سوا", "Survival together", "הישרדות ביחד"), rank: w("مبتدئ", "Beginner", "מתחיל"), region: "me", platform: "pc", when: "weekend", mic: false, discordName: "omar_builds", note: w("بدّي ناس تبني معي قرية من الصفر.", "Looking for people to build a village from scratch with me.", "מחפש אנשים לבנות איתי כפר מאפס.") },
      ],
    },
    rules: {
      title: w("قوانين اللوحة", "The board's rules", "חוקי הלוח"),
      sub: w("عشان كل طلب يلاقي ناس منيحة.", "So every post finds good people.", "כדי שכל פוסט ימצא אנשים טובים."),
      changed: w("آخر تعديل 20 تشرين التاني: زدنا 2.3 عن البيع.", "Last changed on 20 November: we added 2.3 on selling.", "שינוי אחרון ב־20 בנובמבר: הוספנו את 2.3 על מכירות."),
      date: "2026-11-20",
      sections: [
        { key: "general", name: w("عام", "General", "כללי"), rows: [
          RESPECT,
          { n: "1.2", title: w("عمرك 13 وفوق", "Aged 13 or more", "בני 13 ומעלה"), text: w("متل قوانين ديسكورد نفسه.", "As Discord's own rules say.", "כמו החוקים של דיסקורד עצמו.") },
        ] },
        { key: "posts", name: w("بالطلبات", "In posts", "בפוסטים"), rows: [
          { n: "2.1", title: w("طلب واحد", "One post", "פוסט אחד"), text: w("طلب مفتوح واحد لكل لاعب، وبيسكّر لحاله بعد وقته.", "One open post per player; it closes by itself after its time.", "פוסט פתוח אחד לכל שחקן; הוא נסגר לבד אחרי הזמן שלו.") },
          { n: "2.2", title: w("رتبتك الحقيقية", "Your real rank", "הדרגה האמיתית"), text: w("ما تكذب برتبتك: اللي بيلعب معك رح يعرف.", "Don't lie about your rank: whoever plays with you will know.", "אל תשקרו לגבי הדרגה: מי שישחק איתכם יידע.") },
          { n: "2.3", title: w("بلا بيع", "No selling", "בלי מכירות"), text: w("ممنوع بيع حسابات أو «بوستينغ» أو أي شي بمصاري.", "No selling accounts, boosting, or anything for money.", "אסור למכור חשבונות, בוסטינג או כל דבר בכסף.") },
        ] },
      ],
    },
    questions: { rows: [
      { q: w("كيف بلاقي حدا يلعب معي؟", "How do I find someone to play with?", "איך מוצאים עם מי לשחק?"), a: w("حط طلبك، أو انسخ اسم حدا من اللوحة وابعتله عالديسكورد.", "Put up a post, or copy someone's name from the board and message them on Discord.", "העלו פוסט, או העתיקו שם של מישהו מהלוח ושלחו לו הודעה בדיסקורד.") },
      { q: w("ليش طلبي اختفى؟", "Why did my post disappear?", "למה הפוסט שלי נעלם?"), a: w("كل طلب بيسكّر لحاله بعد وقته: 3 ساعات لـ «هلّق»، 8 لـ «الليلة»، و3 أيام لـ «الويكند». حط واحد جديد.", "Every post closes by itself after its time: 3 hours for «now», 8 for «tonight», and 3 days for «the weekend». Put up a new one.", "כל פוסט נסגר לבד אחרי הזמן שלו: 3 שעות ל«עכשיו», 8 ל«הלילה» ו־3 ימים ל«סוף השבוע». העלו פוסט חדש.") },
      { q: w("شفت حدا بيبيع حسابات", "I saw someone selling accounts", "ראיתי מישהו מוכר חשבונות"), a: w("احكيلنا من «تواصل معنا» أو عالديسكورد، والمشرفين بيسكّروا طلبه.", "Tell us through «contact us» or on the Discord, and the moderators close their post.", "ספרו לנו דרך «צור קשר» או בדיסקורד, והמנהלים יסגרו את הפוסט.") },
    ] },
    contact: {},
    notify: {},
  },
});

/** 318: a gaming streamer: live now from Twitch, the week's streams, clips, sponsors and their own server. */
export const GAMING_STREAMER = site({
  key: "site-gaming-streamer",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("ستريمر ألعاب: ليث يلعب", "Gaming streamer: Laith Plays", "סטרימר גיימינג: לית' משחק"),
  note: w("موقع ستريمر ألعاب: لايف هلّق ولا لأ وكم واحد عم يتفرّج (من Twitch بمفاتيحه)، جدول البث بالأسبوع، الكليبات، الرعاة بأكوادهم، سيرفر المتابعين بحالته، الديسكورد، وأسئلة وفورم للتعاون.", "A gaming streamer's site: live now or not and how many watch (from Twitch, with their keys), the week's streams, the clips, the sponsors with their codes, the followers' server with its status, the Discord, and questions and a form for collaborations.", "אתר לסטרימר גיימינג: בשידור עכשיו או לא וכמה צופים (מ־Twitch, עם המפתחות שלו), לוח השידורים בשבוע, הקליפים, נותני החסות עם הקודים, שרת העוקבים עם המצב שלו, הדיסקורד, ושאלות וטופס לשיתופי פעולה."),
  biz: { name: w("ليث يلعب", "Laith Plays", "לית' משחק"), address: w("على Twitch", "On Twitch", "ב־Twitch"), hours: w("بث 4 مرّات بالأسبوع", "Streams 4 times a week", "משדר 4 פעמים בשבוע"), phone: "0", email: "business@laithplays.example", city: "" },
  pack: {
    label: w("ليث يلعب", "Laith Plays", "לית' משחק"),
    eyebrow: w("ستريمر ألعاب على Twitch", "A gaming streamer on Twitch", "סטרימר גיימינג ב־Twitch"),
    title: w("تعال اتفرّج، وخلّيك تلعب معنا", "Come and watch, and stay to play with us", "בואו לצפות, ותישארו לשחק איתנו"),
    sub: w("بث أربع مرّات بالأسبوع: بناء، تحدّيات، وألعاب رعب. وسيرفر للمتابعين مفتوح كل يوم.", "Streams four times a week: building, challenges and horror games. And a server for followers, open every day.", "שידורים ארבע פעמים בשבוע: בנייה, אתגרים ומשחקי אימה. ושרת לעוקבים שפתוח כל יום."),
    cta: w("شوف البث", "Watch the stream", "לצפות בשידור"),
    product: w("الكليبات", "The clips", "הקליפים"),
    story: w("بلّشت أبث من غرفتي بكمبيوتر قديم، واليوم في مجتمع كامل بيلعب معي كل أسبوع.", "I started streaming from my room on an old computer; today a whole community plays with me every week.", "התחלתי לשדר מהחדר שלי על מחשב ישן; היום קהילה שלמה משחקת איתי כל שבוע."),
    collection: w("آخر الكليبات", "Latest clips", "הקליפים האחרונים"),
    icon: "star",
  },
  home: "/live",
  modules: {
    status: {
      game: "twitch",
      address: "https://www.twitch.tv/laithplays",
      discord: "https://discord.gg/laithplays",
      join: w("شوف البث", "Watch the stream", "לצפות בשידור"),
      steps: [
        [w("تابع على Twitch", "Follow on Twitch", "לעקוב ב־Twitch"), w("وشغّل الإشعارات لتعرف لما أبلّش.", "And turn on alerts to know when I go live.", "והפעילו התראות כדי לדעת מתי אני עולה לשידור.")],
        [w("فوت عالديسكورد", "Join the Discord", "להצטרף לדיסקורד"), w("هناك منرتّب الفعاليات ومنحكي بين البثوث.", "That's where we plan events and talk between streams.", "שם מתכננים אירועים ומדברים בין השידורים.")],
        [w("العب على سيرفري", "Play on my server", "לשחק בשרת שלי"), w("سيرفر ماينكرافت للمتابعين، عنوانه تحت.", "A Minecraft server for followers; its address is below.", "שרת מיינקראפט לעוקבים; הכתובת למטה.")],
      ],
    },
    servers: {
      title: w("سيرفر المتابعين", "The followers' server", "שרת העוקבים"),
      sub: w("سيرفر ماينكرافت سرفايفل للمتابعين، شغّال كل يوم.", "A Minecraft survival server for followers, running every day.", "שרת הישרדות במיינקראפט לעוקבים, פועל כל יום."),
      list: [
        { key: "smp", title: w("سيرفر المتابعين", "The followers' server", "שרת העוקבים"), line: w("سرفايفل سوا، ومنبني القلعة بالبث كل سبت.", "Survival together; we build the castle on stream every Saturday.", "הישרדות ביחד; בונים את הטירה בשידור כל שבת."), game: "minecraft", address: "play.laithplays.example" },
      ],
    },
    schedule: {
      title: w("جدول البث", "Stream schedule", "לוח השידורים"),
      sub: w("أربع بثوث كل أسبوع، بتوقيت القدس.", "Four streams every week, Jerusalem time.", "ארבעה שידורים בכל שבוע, לפי שעון ירושלים."),
      rows: [
        { day: "sat", time: "20:00", game: w("ماينكرافت", "Minecraft", "מיינקראפט"), title: w("منبني القلعة مع المتابعين", "Building the castle with followers", "בונים את הטירה עם העוקבים") },
        { day: "mon", time: "21:00", game: w("Valorant", "Valorant", "Valorant"), title: w("رانكد لحد ما نطلع رتبة", "Ranked until we rank up", "דירוג עד שעולים דרגה") },
        { day: "wed", time: "21:00", game: w("ألعاب رعب", "Horror games", "משחקי אימה"), title: w("ليلة الرعب: لعبة جديدة كل أسبوع", "Horror night: a new game every week", "ערב אימה: משחק חדש כל שבוע") },
        { day: "fri", time: "22:00", game: w("بتختاروها إنتو", "You pick it", "אתם בוחרים"), title: w("تحدّيات المتابعين", "Followers' challenges", "אתגרי העוקבים") },
      ],
    },
    clips: {
      title: w("الكليبات", "Clips", "קליפים"),
      sub: w("أحلى اللحظات من البث، الأحدث أول.", "The best moments from the stream, newest first.", "הרגעים הכי טובים מהשידור, החדשים קודם."),
      rows: [
        { slug: "castle-falls", title: w("القلعة وقعت بثانية", "The castle fell in a second", "הטירה נפלה בשנייה"), link: "https://www.twitch.tv/laithplays/clip/castle-falls", game: w("ماينكرافت", "Minecraft", "מיינקראפט"), date: "2026-11-21" },
        { slug: "ace-round", title: w("خمسة بجولة وحدة", "Five in one round", "חמישה בסיבוב אחד"), link: "https://www.twitch.tv/laithplays/clip/ace-round", game: w("Valorant", "Valorant", "Valorant"), date: "2026-11-17" },
        { slug: "jump-scare", title: w("أكبر صرخة بالتاريخ", "The loudest scream ever", "הצעקה הכי חזקה אי פעם"), link: "https://www.twitch.tv/laithplays/clip/jump-scare", game: w("ألعاب رعب", "Horror games", "משחקי אימה"), date: "2026-11-19" },
      ],
    },
    sponsors: {
      title: w("الرعاة", "Sponsors", "נותני חסות"),
      sub: w("بفضلهم البث مستمر.", "Thanks to them the stream goes on.", "בזכותם השידור ממשיך."),
      rows: [
        { name: "Hero Seat", link: "https://heroseat.example", code: "LAITH10", line: w("كراسي ألعاب مريحة لساعات البث الطويلة. 10% خصم بالكود.", "Comfortable gaming chairs for long streams. 10% off with the code.", "כיסאות גיימינג נוחים לשידורים ארוכים. 10% הנחה עם הקוד.") },
        { name: "FastLine", link: "https://fastline.example", code: "LAITHNET", line: w("إنترنت سريع بلا تقطيع. شهر ببلاش بالكود.", "Fast internet with no lag. A free month with the code.", "אינטרנט מהיר בלי לאגים. חודש חינם עם הקוד.") },
      ],
    },
    questions: { rows: [
      { q: w("إمتى بتبث؟", "When do you stream?", "מתי אתה משדר?"), a: w("أربع مرّات بالأسبوع، بالجدول فوق. والإشعارات على Twitch بتخبّرك.", "Four times a week, on the schedule above. Twitch alerts tell you.", "ארבע פעמים בשבוע, לפי הלוח למעלה. ההתראות ב־Twitch יודיעו לכם.") },
      { q: w("كيف بفوت على سيرفرك؟", "How do I join your server?", "איך מצטרפים לשרת שלך?"), a: w("ماينكرافت Java، والعنوان بقسم «سيرفر المتابعين». القوانين عالديسكورد.", "Minecraft Java; the address is in «the followers' server». The rules are on the Discord.", "מיינקראפט Java; הכתובת ב«שרת העוקבים». החוקים בדיסקורד.") },
      { q: w("بدّي نتعاون", "I'd like to work together", "רוצה לשתף פעולה"), a: w("ابعتلي من «تواصل معنا» مع فكرتك، ورح أرد خلال أسبوع.", "Write to me through «contact us» with your idea, and I'll answer within a week.", "כתבו לי דרך «צור קשר» עם הרעיון, ואענה תוך שבוע.") },
    ] },
    contact: {},
    notify: {},
  },
});
