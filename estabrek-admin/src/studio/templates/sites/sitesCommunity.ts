/**
 * Gamers' community sites (wave G7c of docs/sites-300-plan.ar.md), each opening with its community's own live pulse
 * instead of a game server's: a Roblox game's community (everyone playing it now, its codes, its updates; nothing of the
 * game sold here, as buying happens inside Roblox), a Discord community (who is on now, its events, its members'
 * directory) and a clan (its Discord, its roster, its matches with their results, and applying to join).
 */
import { w } from "../words";
import { site } from "./blueprint";
import { CLAN_ROLES } from "./modules/roster";

const RESPECT = { n: "1.1", title: w("احترم الكل", "Respect everyone", "כבוד לכולם"), text: w("ما في شتائم ولا عنصرية ولا تحرّش، باللعب ولا بالديسكورد.", "No slurs, racism or harassment, in games or on Discord.", "בלי קללות, גזענות או הטרדה, במשחקים ובדיסקורד.") };

/** 314: a Roblox game's community: how many play it now, its codes, its updates and its group; no store (buying is inside Roblox). */
export const ROBLOX_COMMUNITY = site({
  key: "site-roblox-community",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("مجتمع لعبة Roblox: برج الغيم", "Roblox game community: Cloud Tower", "קהילת משחק Roblox: מגדל העננים"),
  note: w("موقع مجتمع للعبة على Roblox: كم واحد عم يلعب هلّق، كبسة «العب هلّق»، الأكواد بمكافآتها (بتنتسخ بكبسة وبتخلص لحالها)، التحديثات، صنّاع اللعبة، المجموعة والديسكورد، وأسئلة. بلا متجر: الشراء جوّا Roblox بس.", "A community site for a Roblox game: how many play it now, «play now», the codes with their rewards (copied in a press, expiring by themselves), the updates, the game's makers, the group and the Discord, and questions. No store: buying happens inside Roblox only.", "אתר קהילה למשחק ב־Roblox: כמה משחקים בו עכשיו, «לשחק עכשיו», הקודים עם הפרסים (מועתקים בלחיצה ופגים לבד), העדכונים, יוצרי המשחק, הקבוצה והדיסקורד, ושאלות. בלי חנות: קונים רק בתוך Roblox."),
  biz: { name: w("برج الغيم", "Cloud Tower", "מגדל העננים"), address: w("على Roblox", "On Roblox", "ב־Roblox"), hours: w("اللعبة مفتوحة 24/7", "The game is open 24/7", "המשחק פתוח 24/7"), phone: "0", email: "team@cloudtower.example", city: "" },
  pack: {
    label: w("برج الغيم", "Cloud Tower", "מגדל העננים"),
    eyebrow: w("أوبي على Roblox", "An obby on Roblox", "אובי ב־Roblox"),
    title: w("مية طابق فوق الغيم. لوين بتوصل؟", "A hundred floors above the clouds. How high will you get?", "מאה קומות מעל העננים. לאן תגיעו?"),
    sub: w("نطّ، تزحلق وطير لفوق. كل أسبوع طوابق جديدة، والأكواد بتعطيك غيمات وأجنحة.", "Jump, slide and fly your way up. New floors every week, and codes that give you clouds and wings.", "קפצו, החליקו ועופו למעלה. קומות חדשות כל שבוע, וקודים שנותנים עננים וכנפיים."),
    cta: w("العب هلّق", "Play now", "לשחק עכשיו"),
    product: w("الطوابق", "The floors", "הקומות"),
    story: w("بلّشنا اللعبة بالصيف كتحدّي بين أصحاب، وهلّق في ناس بتلعبها من كل العالم.", "We started the game one summer as a dare between friends; now people play it from all over the world.", "התחלנו את המשחק בקיץ אחד כאתגר בין חברים; היום משחקים בו אנשים מכל העולם."),
    collection: w("آخر التحديثات", "Latest updates", "העדכונים האחרונים"),
    icon: "star",
  },
  home: "/play",
  modules: {
    status: {
      game: "roblox",
      address: "https://www.roblox.com/games/1234567890/Cloud-Tower",
      discord: "https://discord.gg/cloudtower",
      group: "https://www.roblox.com/communities/12345678/Cloud-Tower",
      join: w("العب هلّق", "Play now", "לשחק עכשיו"),
      steps: [
        [w("اكبس «العب هلّق»", "Press «play now»", "ללחוץ «לשחק עכשיו»"), w("بتفتح صفحة اللعبة على Roblox.", "It opens the game's page on Roblox.", "נפתח עמוד המשחק ב־Roblox.")],
        [w("اكبس Play", "Press Play", "ללחוץ Play"), w("من الكمبيوتر أو التلفون أو الإكس بوكس.", "From a computer, a phone or an Xbox.", "ממחשב, מטלפון או מ־Xbox.")],
        [w("حط كود", "Put in a code", "להכניס קוד"), w("انسخ واحد من الأكواد تحت وخود غيماتك.", "Copy one of the codes below and take your clouds.", "העתיקו אחד מהקודים למטה וקבלו את העננים.")],
      ],
    },
    codes: {
      title: w("الأكواد", "Codes", "קודים"),
      sub: w("كل كود بيعطيك شي باللعبة، لحد آخر يوم إله. انسخه والصقه.", "Each code gives you something in the game, until its last day. Copy it and paste it.", "כל קוד נותן משהו במשחק, עד היום האחרון שלו. העתיקו והדביקו."),
      how: w("افتح اللعبة، اكبس كبسة «الأكواد» اللي عالجنب، الصق الكود، واكبس «استلم». كل كود بيشتغل مرّة وحدة لكل لاعب.", "Open the game, press the «Codes» button on the side, paste the code and press «Claim». Each code works once for each player.", "פתחו את המשחק, לחצו על כפתור «קודים» בצד, הדביקו את הקוד ולחצו «לקבל». כל קוד עובד פעם אחת לכל שחקן."),
      rows: [
        { code: "FLOOR100", reward: w("1000 غيمة لما وصلنا الطابق 100", "1,000 clouds for reaching floor 100", "1,000 עננים לרגל הקומה ה־100"), until: "2026-12-31" },
        { code: "GOLDWINGS", reward: w("أجنحة دهبية بتلمع وراك", "Golden wings that shine behind you", "כנפי זהב שזוהרות מאחוריכם"), until: "" },
        { code: "WINTER26", reward: w("وشاح التلج وقفزة مزدوجة لساعة", "The snow scarf and a double jump for an hour", "צעיף השלג וקפיצה כפולה לשעה"), until: "2027-01-15" },
        { code: "SUMMER26", reward: w("500 غيمة", "500 clouds", "500 עננים"), until: "2026-09-01", expired: true },
      ],
    },
    news: {
      title: w("التحديثات", "Updates", "עדכונים"),
      sub: w("طوابق جديدة، أغلاط تصلّحت، وأكواد كل تحديث.", "New floors, fixed bugs, and a code with every update.", "קומות חדשות, באגים שתוקנו, וקוד בכל עדכון."),
      rows: [
        { slug: "update-2-4", date: "2026-11-20", title: w("تحديث 2.4: الطابق 100", "Update 2.4: floor 100", "עדכון 2.4: הקומה ה־100"), text: w("وصلنا المية! وكود جديد إلكم.", "We reached a hundred! And a new code for you.", "הגענו למאה! וקוד חדש בשבילכם."), body: w("عشر طوابق جديدة فيها غيم بيختفي ورياح بتدفشك. والكود FLOOR100 بيعطيك ألف غيمة لآخر السنة.", "Ten new floors with vanishing clouds and winds that push you. The code FLOOR100 gives you a thousand clouds until the end of the year.", "עשר קומות חדשות עם עננים שנעלמים ורוחות שדוחפות. הקוד FLOOR100 נותן אלף עננים עד סוף השנה.") },
        { slug: "update-2-3", date: "2026-11-06", title: w("تحديث 2.3: أجنحة وتصليحات", "Update 2.3: wings and fixes", "עדכון 2.3: כנפיים ותיקונים"), text: w("الأجنحة الدهبية وصلت، والقفزة بالطابق 61 تصلّحت.", "The golden wings are here, and the jump on floor 61 is fixed.", "כנפי הזהב הגיעו, והקפיצה בקומה 61 תוקנה."), body: w("لقينا غلط بالطابق 61 كان يوقّع اللاعبين، وصلّحناه. وشكراً للي بلّغونا عالديسكورد.", "We found a bug on floor 61 that made players fall, and fixed it. Thanks to everyone who told us on the Discord.", "מצאנו באג בקומה 61 שהפיל שחקנים, ותיקנו אותו. תודה לכל מי שדיווח לנו בדיסקורד.") },
      ],
    },
    team: {
      title: w("صنّاع اللعبة", "The game's makers", "יוצרי המשחק"),
      sub: w("فريق صغير بيبني كل طابق بإيده.", "A small team that builds every floor by hand.", "צוות קטן שבונה כל קומה בעצמו."),
      rows: [
        { name: w("ليان", "Layan", "ליאן"), role: w("تصميم الطوابق", "Floor design", "עיצוב קומות"), bio: w("بترسم كل طابق عالورق قبل ما تبنيه.", "Draws every floor on paper before building it.", "משרטטת כל קומה על נייר לפני שהיא בונה אותה.") },
        { name: w("يزن", "Yazan", "יזן"), role: w("البرمجة", "Scripting", "תכנות"), bio: w("هو اللي بيخلّي الغيم يختفي بالوقت الغلط.", "The one who makes clouds vanish at the wrong moment.", "זה שגורם לעננים להיעלם ברגע הלא נכון.") },
      ],
    },
    questions: { rows: [
      { q: w("اللعبة ببلاش؟", "Is the game free?", "המשחק בחינם?"), a: w("أيوا، ببلاش. كل اللي بينباع بينباع جوّا Roblox بس، ونحنا ما منبيع شي هون.", "Yes, it's free. Anything sold is sold inside Roblox only; we sell nothing here.", "כן, בחינם. כל מה שנמכר נמכר רק בתוך Roblox; אנחנו לא מוכרים כאן כלום.") },
      { q: w("الكود ما اشتغل، ليش؟", "The code didn't work, why?", "הקוד לא עבד, למה?"), a: w("يمكن خلص يومه، أو استعملته قبل. الأكواد الشغّالة بس فوق بصفحة الأكواد.", "It may be past its day, or you used it before. Only the working codes are at the top of the codes page.", "אולי עבר התוקף שלו, או שכבר השתמשתם בו. רק הקודים הפעילים נמצאים למעלה בעמוד הקודים.") },
      { q: w("لقيت غلط باللعبة", "I found a bug in the game", "מצאתי באג במשחק"), a: w("احكيلنا عنه عالديسكورد أو من «تواصل معنا»، ومع صورة إذا فيك.", "Tell us on the Discord or through «contact us», with a picture if you can.", "ספרו לנו בדיסקורד או דרך «צור קשר», עם תמונה אם אפשר.") },
      { q: w("كيف بفوت عالمجموعة؟", "How do I join the group?", "איך מצטרפים לקבוצה?"), a: w("كبسة «مجموعة Roblox» فوق، واكبس Join. أعضاء المجموعة بياخدوا كود زيادة كل تحديث.", "The «Roblox group» button above, then press Join. Group members get an extra code with every update.", "הכפתור «הקבוצה ב־Roblox» למעלה, ואז Join. חברי הקבוצה מקבלים קוד נוסף בכל עדכון.") },
    ] },
    contact: {},
    notify: {},
  },
});

/** 315: a Discord community: who is on now, its events, its members' directory, its rules and its moderators. */
export const DISCORD_COMMUNITY = site({
  key: "site-discord-community",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("مجتمع ديسكورد للاعبين: ديوان اللاعبين", "Gamers' Discord community: The Gamers' Diwan", "קהילת דיסקורד לגיימרים: הדיוואן"),
  note: w("موقع مجتمع ديسكورد للاعبين: كم واحد أونلاين هلّق وكم عضو، كبسة «فوت عالديسكورد»، الفعاليات الجاية بترتيب أيامها، دليل الأعضاء (كل عضو بيحط بطاقته وبتطلع بموافقة الطاقم)، القوانين، المشرفين، وأسئلة.", "A gamers' Discord community: how many are on now and how many members, «join the Discord», the coming events in the order of their days, a members' directory (each member puts up a card, shown once the staff say yes), the rules, the moderators, and questions.", "אתר לקהילת דיסקורד של גיימרים: כמה מחוברים עכשיו וכמה חברים, «להצטרף לדיסקורד», האירועים הקרובים לפי סדר הימים, מדריך חברים (כל חבר מעלה כרטיס שמופיע אחרי אישור הצוות), החוקים, המנהלים, ושאלות."),
  biz: { name: w("ديوان اللاعبين", "The Gamers' Diwan", "הדיוואן"), address: w("على ديسكورد", "On Discord", "בדיסקורד"), hours: w("الديوان مفتوح 24/7", "The diwan is open 24/7", "הדיוואן פתוח 24/7"), phone: "0", email: "mods@gamersdiwan.example", city: "" },
  pack: {
    label: w("ديوان اللاعبين", "The Gamers' Diwan", "הדיוואן"),
    eyebrow: w("مجتمع ديسكورد للاعبين", "A Discord community for gamers", "קהילת דיסקורד לגיימרים"),
    title: w("لاقي ناس تلعب معهم كل ليلة", "Find people to play with every night", "מצאו עם מי לשחק כל לילה"),
    sub: w("سهرات لعب، بطولات صغيرة، وقعدات حكي. فوت، عرّف عن حالك، وحط بطاقتك بالدليل.", "Game nights, small tournaments and chats. Come in, say who you are, and put your card in the directory.", "ערבי משחק, טורנירים קטנים ושיחות. היכנסו, הציגו את עצמכם והעלו כרטיס למדריך."),
    cta: w("فوت عالديسكورد", "Join the Discord", "להצטרף לדיסקורד"),
    product: w("الفعاليات", "The events", "האירועים"),
    story: w("بلّش الديوان كقناة لعشر أصحاب، وصار بيت لكل واحد بيدوّر على حدا يلعب معه.", "The diwan began as a channel for ten friends, and became a home for anyone looking for someone to play with.", "הדיוואן התחיל כערוץ לעשרה חברים, והפך לבית לכל מי שמחפש עם מי לשחק."),
    collection: w("الفعاليات الجاية", "Coming events", "אירועים קרובים"),
    icon: "star",
  },
  home: "/lounge",
  modules: {
    status: {
      game: "discord",
      address: "https://discord.gg/gamersdiwan",
      // The status is the Discord itself: no second button for it.
      discord: "",
      join: w("فوت عالديسكورد", "Join the Discord", "להצטרף לדיסקורד"),
      steps: [
        [w("اكبس «فوت عالديسكورد»", "Press «join the Discord»", "ללחוץ «להצטרף לדיסקורד»"), w("بيفتح الدعوة بالتطبيق أو بالمتصفّح.", "It opens the invite in the app or the browser.", "ההזמנה נפתחת באפליקציה או בדפדפן.")],
        [w("اقرأ القوانين", "Read the rules", "לקרוא את החוקים"), w("بقناة #القوانين، واكبس ✅ لتفتح باقي القنوات.", "In the #rules channel, and press ✅ to open the other channels.", "בערוץ #חוקים, ולחצו ✅ כדי לפתוח את שאר הערוצים.")],
        [w("عرّف عن حالك", "Say who you are", "להציג את עצמכם"), w("بقناة #مين-أنا، وحط بطاقتك بدليل الأعضاء هون.", "In the #who-am-i channel, and put your card in the members' directory here.", "בערוץ #מי-אני, והעלו כרטיס למדריך החברים כאן.")],
      ],
    },
    events: {
      title: w("الفعاليات", "Events", "אירועים"),
      sub: w("كل أسبوع سهرات لعب وبطولات صغيرة. كلها عالديسكورد، والكل معزوم.", "Game nights and small tournaments every week. All on the Discord, and everyone is invited.", "ערבי משחק וטורנירים קטנים כל שבוע. הכול בדיסקורד, וכולם מוזמנים."),
      kinds: [
        ["gamenight", w("سهرة لعب", "Game night", "ערב משחקים")],
        ["tournament", w("بطولة", "Tournament", "טורניר")],
        ["watch", w("سهرة فرجة", "Watch party", "ערב צפייה")],
        ["talk", w("قعدة حكي", "Chat night", "ערב שיחה")],
      ],
      rows: [
        { slug: "party-night", title: w("سهرة ألعاب الحفلات", "Party games night", "ערב משחקי מסיבה"), kind: "gamenight", date: "2026-11-27", time: "21:00", where: w("قناة الصوت «الصالة»", "The «Lounge» voice channel", "ערוץ הקול «הסלון»"), text: w("ألعاب قصيرة ومضحكة، ما بدها خبرة. تعال ومعك مايك.", "Short, funny games that need no experience. Come with a mic.", "משחקים קצרים ומצחיקים שלא צריכים ניסיון. בואו עם מיקרופון.") },
        { slug: "duo-cup", title: w("كاس التنين ضد التنين", "The two-against-two cup", "גביע שניים נגד שניים"), kind: "tournament", date: "2026-12-05", time: "19:00", where: w("قناة «البطولات»", "The «Tournaments» channel", "ערוץ «טורנירים»"), text: w("سجّل مع صاحبك بقناة البطولات قبل الخميس. الجايزة رتبة «بطل الديوان» لشهر.", "Sign up with a friend in the tournaments channel before Thursday. The prize: the «Diwan champion» role for a month.", "הירשמו עם חבר בערוץ הטורנירים לפני יום חמישי. הפרס: התפקיד «אלוף הדיוואן» לחודש.") },
        { slug: "finals-watch", title: w("فرجة على النهائي", "Watching the final", "צפייה בגמר"), kind: "watch", date: "2026-12-13", time: "20:00", where: w("قناة «المسرح»", "The «Stage» channel", "ערוץ «הבמה»"), text: w("منحضر نهائي البطولة الكبيرة سوا ومنحكي عليه.", "We watch the big tournament's final together and talk about it.", "צופים יחד בגמר של הטורניר הגדול ומדברים עליו.") },
        { slug: "new-members", title: w("قعدة الأعضاء الجداد", "New members' chat", "שיחת חברים חדשים"), kind: "talk", date: "2026-11-15", time: "20:00", where: w("قناة الصوت «الصالة»", "The «Lounge» voice channel", "ערוץ הקול «הסלון»"), text: w("تعرّفنا على عشرين عضو جديد.", "We met twenty new members.", "הכרנו עשרים חברים חדשים."), done: true },
      ],
    },
    members: {
      title: w("دليل الأعضاء", "Members' directory", "מדריך החברים"),
      sub: w("مين بيلعب شو ووين، عشان تلاقي حدا يلعب معك. حط بطاقتك.", "Who plays what and where, so you find someone to play with. Put up your card.", "מי משחק במה ואיפה, כדי שתמצאו עם מי לשחק. העלו כרטיס."),
      rows: [
        { tag: "NightOwl_Sam", games: w("ألعاب تصويب، وسباقات", "Shooters, and racing", "משחקי ירי, ומרוצים"), platform: "pc", discordName: "nightowl_sam", about: w("بلعب كل ليلة بعد العشرة. بدوّر على فريق للبطولات.", "I play every night after ten. Looking for a team for tournaments.", "משחק כל לילה אחרי עשר. מחפש קבוצה לטורנירים.") },
        { tag: "MayaPlays", games: w("ألعاب بناء وألغاز", "Building and puzzle games", "משחקי בנייה וחידות"), platform: "switch", discordName: "mayaplays", about: w("بحب الألعاب الهادية والتعاونية.", "I love calm, co-op games.", "אוהבת משחקים רגועים ושיתופיים.") },
        { tag: "Karim_GK", games: w("كرة قدم وألعاب رياضة", "Football and sports games", "כדורגל ומשחקי ספורט"), platform: "playstation", discordName: "karim_gk", about: w("حارس مرمى بالحقيقة وباللعبة.", "A goalkeeper in real life and in the game.", "שוער במציאות ובמשחק.") },
      ],
    },
    rules: {
      title: w("القوانين", "The rules", "החוקים"),
      sub: w("قوانين قليلة عشان الديوان يضل مكان حلو للكل.", "A few rules so the diwan stays a good place for everyone.", "כמה חוקים כדי שהדיוואן יישאר מקום טוב לכולם."),
      changed: w("آخر تعديل 18 تشرين التاني: زدنا 2.3 عن الإعلانات.", "Last changed on 18 November: we added 2.3 on adverts.", "שינוי אחרון ב־18 בנובמבר: הוספנו את 2.3 על פרסומות."),
      date: "2026-11-18",
      sections: [
        { key: "general", name: w("عام", "General", "כללי"), rows: [
          RESPECT,
          { n: "1.2", title: w("عمرك 13 وفوق", "Aged 13 or more", "בני 13 ומעלה"), text: w("متل قوانين ديسكورد نفسه.", "As Discord's own rules say.", "כמו החוקים של דיסקורד עצמו.") },
          { n: "1.3", title: w("ما تشارك معلوماتك", "Don't share your details", "לא משתפים פרטים"), text: w("لا عنوان ولا رقم تلفون ولا كلمة سر، ولا معلومات حدا تاني.", "No address, phone number or password, nor anyone else's details.", "לא כתובת, לא מספר טלפון ולא סיסמה, וגם לא פרטים של אחרים.") },
        ] },
        { key: "channels", name: w("بالقنوات", "In the channels", "בערוצים"), rows: [
          { n: "2.1", title: w("كل شي بقناته", "Everything in its channel", "כל דבר בערוץ שלו"), text: w("الألعاب بقنواتها، والصور بقناة الصور.", "Games in their channels, pictures in the pictures channel.", "משחקים בערוצים שלהם, תמונות בערוץ התמונות.") },
          { n: "2.2", title: w("بلا سبام", "No spam", "בלי ספאם"), text: w("ما تكرّر نفس الرسالة، وما تعمل منشن للكل.", "Don't repeat the same message, and don't mention everyone.", "לא חוזרים על אותה הודעה ולא מתייגים את כולם.") },
          { n: "2.3", title: w("بلا إعلانات", "No adverts", "בלי פרסומות"), text: w("ما تنشر سيرفرات تانية أو بيع، إلا بإذن المشرفين.", "Don't post other servers or sales, unless the moderators say yes.", "לא מפרסמים שרתים אחרים או מכירות, אלא באישור המנהלים.") },
        ] },
      ],
    },
    team: {
      title: w("المشرفين", "The moderators", "המנהלים"),
      sub: w("اللي بيحافظوا عالديوان نضيف ومرتّب.", "Those who keep the diwan clean and tidy.", "מי ששומרים על הדיוואן נקי ומסודר."),
      rows: [
        { name: w("أبو سامي", "Abu Sami", "אבו סאמי"), role: w("صاحب الديوان", "The diwan's owner", "בעל הדיוואן"), bio: w("فتح الديوان من خمس سنين، وبيرتّب السهرات.", "Opened the diwan five years ago, and runs the game nights.", "פתח את הדיוואן לפני חמש שנים, ומארגן את ערבי המשחקים.") },
        { name: w("نور", "Nour", "נור"), role: w("مشرفة الفعاليات", "Events moderator", "מנהלת אירועים"), bio: w("هي اللي بتعمل البطولات وبتعدّ النقاط.", "She runs the tournaments and counts the points.", "היא מארגנת את הטורנירים וסופרת את הנקודות.") },
      ],
    },
    questions: { rows: [
      { q: w("الديوان ببلاش؟", "Is the diwan free?", "הדיוואן בחינם?"), a: w("أيوا، ببلاش وللكل.", "Yes, free and for everyone.", "כן, בחינם ולכולם.") },
      { q: w("كيف بحط بطاقتي بالدليل؟", "How do I put my card in the directory?", "איך מעלים כרטיס למדריך?"), a: w("فوت بحسابك (فيك بحساب Discord)، واملا الفورم بصفحة دليل الأعضاء. بتطلع لما يوافق عليها مشرف.", "Sign in (Discord works), and fill the form on the members' directory page. It shows once a moderator says yes.", "התחברו (אפשר עם Discord), ומלאו את הטופס בעמוד מדריך החברים. הוא יופיע אחרי שמנהל יאשר.") },
      { q: w("بقدر أعمل فعالية؟", "Can I run an event?", "אפשר לארגן אירוע?"), a: w("أكيد. احكي مع نور بقناة الفعاليات وبتنحط هون.", "Sure. Talk to Nour in the events channel and it goes up here.", "בטח. דברו עם נור בערוץ האירועים והוא יעלה לכאן.") },
    ] },
    contact: {},
    notify: {},
  },
});

/** 316: a clan: its Discord, its roster by part, its matches with their results, and applying to join. */
export const GAMING_CLAN = site({
  key: "site-gaming-clan",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("كلان ألعاب: نسور الليل", "Gaming clan: Night Eagles", "קלאן גיימינג: נשרי הלילה"),
  note: w("موقع كلان أو غيلد: الديسكورد بكم واحد أونلاين، التشكيلة حسب الدور، المباريات الجاية بترتيب أيامها والنتايج بالسكور، التقديم للانضمام بتصويت الطاقم، القوانين، أخبار، وأسئلة.", "A clan's or a guild's site: the Discord with how many are on, the roster by part, the coming matches in the order of their days and the results with the score, applying to join with the staff's votes, the rules, news, and questions.", "אתר לקלאן או לגילדה: הדיסקורד עם כמה מחוברים, הסגל לפי תפקיד, המשחקים הקרובים לפי סדר הימים והתוצאות עם הניקוד, הגשה להצטרפות בהצבעת הצוות, החוקים, חדשות ושאלות."),
  biz: { name: w("نسور الليل", "Night Eagles", "נשרי הלילה"), address: w("أونلاين", "Online", "אונליין"), hours: w("تمرين كل يوم أحد وأربعا", "Training every Sunday and Wednesday", "אימון כל ראשון ורביעי"), phone: "0", email: "captain@nighteagles.example", city: "" },
  pack: {
    label: w("نسور الليل", "Night Eagles", "נשרי הלילה"),
    eyebrow: w("كلان ألعاب تنافسية", "A competitive gaming clan", "קלאן גיימינג תחרותי"),
    title: w("منلعب سوا، ومنربح سوا", "We play together, and we win together", "משחקים ביחד, ומנצחים ביחד"),
    sub: w("تشكيلة من تمن لاعبين، تمرين مرتين بالأسبوع، ومباريات كل شهر. بدّك تنضم؟ قدّم.", "A roster of eight, training twice a week, and matches every month. Want to join? Apply.", "סגל של שמונה, אימון פעמיים בשבוע ומשחקים כל חודש. רוצים להצטרף? הגישו."),
    cta: w("قدّم للانضمام", "Apply to join", "להגיש בקשה להצטרף"),
    product: w("التشكيلة", "The roster", "הסגל"),
    story: w("تجمّعنا من سيرفرات مختلفة لأنه كنا نحب نلعب بالليل، وصرنا فريق بيدخل بطولات.", "We came together from different servers because we liked playing at night, and became a team that enters tournaments.", "התאספנו משרתים שונים כי אהבנו לשחק בלילה, והפכנו לקבוצה שמשתתפת בטורנירים."),
    collection: w("آخر الأخبار", "Latest news", "החדשות האחרונות"),
    icon: "star",
  },
  home: "/clan",
  modules: {
    status: {
      game: "discord",
      address: "https://discord.gg/nighteagles",
      // The clan's Discord is its status: no second button for it.
      discord: "",
      join: w("فوت عالديسكورد", "Join the Discord", "להצטרף לדיסקורד"),
      steps: [
        [w("فوت عالديسكورد", "Join the Discord", "להצטרף לדיסקורד"), w("تابع المباريات واحكي مع اللاعبين.", "Follow the matches and talk to the players.", "עקבו אחרי המשחקים ודברו עם השחקנים.")],
        [w("اقرأ القوانين", "Read the rules", "לקרוא את החוקים"), w("التزام بالتمرين، واحترام بالفوز والخسارة.", "Showing up to training, and respect in winning and losing.", "מגיעים לאימונים, ומכבדים בניצחון ובהפסד.")],
        [w("قدّم", "Apply", "להגיש"), w("املا طلب الانضمام، والطاقم بيصوّت عليه.", "Fill in the application to join, and the staff vote on it.", "מלאו את הבקשה להצטרף, והצוות מצביע עליה.")],
      ],
    },
    roster: {
      title: w("التشكيلة", "The roster", "הסגל"),
      sub: w("اللي بيلعبوا باسم النسور، كل واحد بدوره.", "Those who play in the Eagles' name, each in their part.", "מי שמשחקים בשם הנשרים, כל אחד בתפקידו."),
      roles: CLAN_ROLES,
      rows: [
        { name: "Falcon", role: "captain", game: w("تصويب تكتيكي", "Tactical shooter", "יריות טקטי"), rank: w("الرتبة الأعلى", "Top rank", "הדרגה העליונה"), about: w("بيقرا اللعبة قبل ما تصير، وبينادي الخطط.", "Reads the game before it happens, and calls the plays.", "קורא את המשחק לפני שהוא קורה, וקורא את המהלכים."), link: "https://www.twitch.tv/falcon_example" },
        { name: "Sahm", role: "main", game: w("تصويب تكتيكي", "Tactical shooter", "יריות טקטי"), rank: w("الماس", "Diamond", "יהלום"), about: w("أسرع إيد بالفريق.", "The quickest hand on the team.", "היד המהירה בקבוצה.") },
        { name: "Laila", role: "main", game: w("تصويب تكتيكي", "Tactical shooter", "יריות טקטי"), rank: w("الماس", "Diamond", "יהלום"), about: w("بتحمي ضهر الفريق دايماً.", "Always guards the team's back.", "תמיד שומרת על הגב של הקבוצה.") },
        { name: "Tariq", role: "main", game: w("تصويب تكتيكي", "Tactical shooter", "יריות טקטי"), rank: w("بلاتين", "Platinum", "פלטינה"), about: w("بيدخل أول، وبيفتح الطريق.", "Goes in first and opens the way.", "נכנס ראשון ופותח את הדרך.") },
        { name: "Rami", role: "main", game: w("تصويب تكتيكي", "Tactical shooter", "יריות טקטי"), rank: w("بلاتين", "Platinum", "פלטינה"), about: w("قنّاص الفريق.", "The team's sniper.", "הצלף של הקבוצה.") },
        { name: "Dana", role: "sub", game: w("تصويب تكتيكي", "Tactical shooter", "יריות טקטי"), rank: w("دهب", "Gold", "זהב"), about: w("بتتعلّم بسرعة، وجاهزة كل مباراة.", "Learns fast, and ready for every match.", "לומדת מהר, ומוכנה לכל משחק.") },
        { name: "Omar", role: "sub", game: w("تصويب تكتيكي", "Tactical shooter", "יריות טקטי"), rank: w("دهب", "Gold", "זהב"), about: w("بيلعب أي دور بدّنا ياه.", "Plays whatever part we need.", "משחק כל תפקיד שצריך.") },
        { name: "Coach Hadi", role: "coach", game: w("تصويب تكتيكي", "Tactical shooter", "יריות טקטי"), rank: w("مدرّب", "Coach", "מאמן"), about: w("بيحضر كل مباراة مسجّلة وبيكتب شو نصلّح.", "Watches every recorded match and writes what to fix.", "צופה בכל משחק מוקלט וכותב מה לתקן.") },
      ],
    },
    events: {
      title: w("المباريات", "Matches", "משחקים"),
      sub: w("المباريات الجاية بترتيب أيامها، والنتايج تحت.", "The coming matches in the order of their days, and the results below.", "המשחקים הקרובים לפי סדר הימים, והתוצאות למטה."),
      matches: true,
      kinds: [
        ["match", w("مباراة رسمية", "Official match", "משחק רשמי")],
        ["scrim", w("سكريم (تمرين ضد فريق)", "Scrim (practice against a team)", "סקרים (אימון מול קבוצה)")],
        ["tournament", w("بطولة", "Tournament", "טורניר")],
        ["training", w("تمرين", "Training", "אימון")],
      ],
      rows: [
        { slug: "red-foxes", title: w("دوري الشتا: الجولة 3", "Winter league: round 3", "ליגת החורף: סיבוב 3"), kind: "match", date: "2026-11-29", time: "20:00", where: w("بث على قناة القائد", "Streamed on the captain's channel", "שידור בערוץ של הקפטן"), text: w("أفضل من تلاتة.", "Best of three.", "הטוב מבין שלושה."), opponent: "Red Foxes" },
        { slug: "scrim-iron", title: w("سكريم قبل البطولة", "A scrim before the tournament", "סקרים לפני הטורניר"), kind: "scrim", date: "2026-12-02", time: "21:30", where: w("قناة الفريق عالديسكورد", "The team's Discord channel", "ערוץ הקבוצה בדיסקורד"), text: w("خرايط البطولة بس.", "The tournament's maps only.", "רק המפות של הטורניר."), opponent: "Iron Wolves" },
        { slug: "storm", title: w("دوري الشتا: الجولة 2", "Winter league: round 2", "ליגת החורף: סיבוב 2"), kind: "match", date: "2026-11-15", time: "20:00", where: w("بث على قناة القائد", "Streamed on the captain's channel", "שידור בערוץ של הקפטן"), text: w("أفضل من تلاتة.", "Best of three.", "הטוב מבין שלושה."), opponent: "Storm Riders", result: "win", score: "2 - 1", done: true },
        { slug: "blue-owls", title: w("دوري الشتا: الجولة 1", "Winter league: round 1", "ליגת החורף: סיבוב 1"), kind: "match", date: "2026-11-08", time: "20:00", where: w("بث على قناة القائد", "Streamed on the captain's channel", "שידור בערוץ של הקפטן"), text: w("أفضل من تلاتة.", "Best of three.", "הטוב מבין שלושה."), opponent: "Blue Owls", result: "loss", score: "1 - 2", done: true },
        { slug: "autumn-cup", title: w("كاس الخريف: النهائي", "Autumn cup: the final", "גביע הסתיו: הגמר"), kind: "tournament", date: "2026-10-25", time: "19:00", where: w("بطولة أونلاين", "An online tournament", "טורניר אונליין"), text: w("ربحنا الكاس!", "We won the cup!", "זכינו בגביע!"), opponent: "Sand Vipers", result: "win", score: "3 - 0", done: true },
      ],
    },
    apply: {
      title: w("انضم للنسور", "Join the Eagles", "להצטרף לנשרים"),
      sub: w("بتلعب منيح وبتلتزم؟ قدّم، والطاقم بيصوّت.", "Play well and show up? Apply, and the staff vote.", "משחקים טוב ומגיעים? הגישו, והצוות מצביע."),
      player: true,
      kinds: [
        { key: "player", name: w("لاعب", "Player", "שחקן"), line: w("بتتمرّن معنا مرتين بالأسبوع، وبتلعب لما يجي دورك.", "You train with us twice a week, and play when your turn comes.", "מתאמנים איתנו פעמיים בשבוע, ומשחקים כשמגיע התור."), needs: w("عمرك 15 وفوق، رتبة بلاتين وفوق، ومايك.", "Aged 15 or more, Platinum rank or above, and a mic.", "בני 15 ומעלה, דרגת פלטינה ומעלה, ומיקרופון."), question: w("خسرنا جولة بسبب غلطة منك. شو بتعمل بالجولة اللي بعدها؟", "We lost a round because of your mistake. What do you do in the next one?", "הפסדנו סיבוב בגלל טעות שלכם. מה תעשו בסיבוב הבא?") },
        { key: "creator", name: w("صانع محتوى", "Content creator", "יוצר תוכן"), line: w("بتعمل كليبات وبتبث مبارياتنا.", "You make clips and stream our matches.", "יוצרים קליפים ומשדרים את המשחקים שלנו."), needs: w("قناة فيها بثوث أو كليبات بانتظام.", "A channel with streams or clips on a regular basis.", "ערוץ עם שידורים או קליפים באופן קבוע."), question: w("شو أول كليب بتعمله عن النسور؟", "What's the first clip you'd make about the Eagles?", "מה הקליפ הראשון שהייתם עושים על הנשרים?") },
      ],
      wait: 30,
      votes: 2,
    },
    rules: {
      title: w("قوانين الكلان", "The clan's rules", "חוקי הקלאן"),
      sub: w("اللي بنطلبه من كل واحد بالنسور.", "What we ask of everyone in the Eagles.", "מה שאנחנו מבקשים מכל אחד בנשרים."),
      changed: w("آخر تعديل 10 تشرين التاني: زدنا 2.2 عن المباريات.", "Last changed on 10 November: we added 2.2 on matches.", "שינוי אחרון ב־10 בנובמבר: הוספנו את 2.2 על משחקים."),
      date: "2026-11-10",
      sections: [
        { key: "general", name: w("عام", "General", "כללי"), rows: [
          RESPECT,
          { n: "1.2", title: w("بدون غش", "No cheating", "בלי רמאות"), text: w("أي غش بأي لعبة: برّا الكلان.", "Any cheating in any game: out of the clan.", "כל רמאות בכל משחק: מחוץ לקלאן.") },
        ] },
        { key: "team", name: w("بالفريق", "In the team", "בקבוצה"), rows: [
          { n: "2.1", title: w("التمرين", "Training", "אימונים"), text: w("إذا ما بتقدر تيجي، احكي قبل بيوم.", "If you can't come, say so a day before.", "אם אי אפשר להגיע, מודיעים יום לפני.") },
          { n: "2.2", title: w("المباريات", "Matches", "משחקים"), text: w("بنربح سوا وبنخسر سوا: ما حدا بيلوم حدا قدّام الكل.", "We win together and lose together: nobody blames anyone in front of everyone.", "מנצחים ביחד ומפסידים ביחד: אף אחד לא מאשים אף אחד מול כולם.") },
        ] },
      ],
    },
    news: {
      title: w("الأخبار", "News", "חדשות"),
      sub: w("مباريات، لاعبين جداد، وبطولات.", "Matches, new players and tournaments.", "משחקים, שחקנים חדשים וטורנירים."),
      rows: [
        { slug: "autumn-cup-won", date: "2026-10-26", title: w("ربحنا كاس الخريف", "We won the autumn cup", "זכינו בגביע הסתיו"), text: w("تلاتة لصفر بالنهائي.", "Three to nothing in the final.", "שלוש לאפס בגמר."), body: w("شكراً لكل اللي حضروا البث وشجّعونا. الكاس صار عالديسكورد.", "Thanks to everyone who watched the stream and cheered us on. The cup is on the Discord now.", "תודה לכל מי שצפה בשידור ועודד אותנו. הגביע כבר בדיסקורד.") },
        { slug: "new-sub", date: "2026-11-12", title: w("دانا معنا", "Dana is with us", "דנה איתנו"), text: w("لاعبة احتياط جديدة.", "A new sub.", "מחליפה חדשה."), body: w("دانا قدّمت عالموقع، والطاقم صوّت بالإجماع. أهلاً فيكي.", "Dana applied on the site, and the staff voted yes as one. Welcome.", "דנה הגישה באתר, והצוות הצביע פה אחד. ברוכה הבאה.") },
      ],
    },
    questions: { rows: [
      { q: w("كم عمري لازم يكون؟", "How old must I be?", "בן כמה צריך להיות?"), a: w("15 وفوق للاعبين.", "15 or more for players.", "15 ומעלה לשחקנים.") },
      { q: w("قدّمت، إمتى بيجيني الرد؟", "I applied, when do I hear back?", "הגשתי, מתי תגיע תשובה?"), a: w("خلال أسبوع، عالإيميل. وفيك تشوف حالة طلبك بصفحة التقديم.", "Within a week, by email. You can see where your application stands on the apply page.", "תוך שבוע, במייל. אפשר לראות איפה הבקשה עומדת בעמוד ההגשה.") },
      { q: w("بقدر أتفرّج عالمباريات؟", "Can I watch the matches?", "אפשר לצפות במשחקים?"), a: w("أكيد: كل مباراة رسمية بتنبث على قناة القائد.", "Sure: every official match is streamed on the captain's channel.", "בטח: כל משחק רשמי משודר בערוץ של הקפטן.") },
    ] },
    contact: {},
    notify: {},
  },
});
