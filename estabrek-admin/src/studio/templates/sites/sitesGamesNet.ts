/**
 * Game server sites with several servers on one site (wave G7b of docs/sites-300-plan.ar.md): a Minecraft minigames
 * network (its games behind one proxy, each known by the server's link and each with its own rankings), and a CS2
 * community (its servers each at its own address, and a public ban list tied to its appeals). CS2 has no link yet (no
 * piece for its servers), so it has no rankings; and no store, as its game's rules on selling aren't in the gate.
 */
import { w } from "../words";
import { site } from "./blueprint";
import { RANK_W } from "./siteWords";

const BANNED = { q: w("انبنّدت، شو بعمل؟", "I was banned, what do I do?", "קיבלתי באן, מה עושים?"), a: w("قدّم استئناف من صفحة «الاستئناف والبلاغ» برقم الباند.", "Appeal it on the appeals and reports page with the ban's number.", "הגישו ערעור בעמוד הערעורים והדיווחים עם מספר הבאן.") };
const RESPECT = { n: "1.1", title: w("احترم الكل", "Respect everyone", "כבוד לכולם"), text: w("ما في شتائم ولا عنصرية ولا تحرّش، باللعبة ولا بالديسكورد.", "No slurs, racism or harassment, in the game or on Discord.", "בלי קללות, גזענות או הטרדה, במשחק ובדיסקורד.") };

/** 306: a Minecraft minigames network: each game's status behind the one address, rankings for each game, a looks-only store. */
export const MC_NETWORK = site({
  key: "site-minecraft-network",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("شبكة ميني جيمز لماينكرافت: الساحات", "Minecraft minigames network: The Arenas", "רשת מיני־גיימס למיינקראפט: הזירות"),
  note: w("موقع شبكة ميني جيمز لماينكرافت Java: عنوان واحد لكل الشبكة، حالة كل لعبة وكم واحد عليها (من لينك السيرفر)، ترتيب لكل لعبة، متجر أشكال بس، القوانين، التقديم للطاقم، الاستئناف والبلاغ، وأخبار.", "A Minecraft Java minigames network: one address for the whole network, each game's status and how many are on it (from the server's link), rankings for each game, a looks-only store, rules, applying to the staff, appeals and reports, and news.", "אתר לרשת מיני־גיימס במיינקראפט Java: כתובת אחת לכל הרשת, המצב של כל משחק וכמה שחקנים בו (מהקישור לשרת), דירוג לכל משחק, חנות מראות בלבד, חוקים, הגשה לצוות, ערעורים ודיווחים, וחדשות."),
  biz: { name: w("الساحات", "The Arenas", "הזירות"), address: w("أونلاين", "Online", "אונליין"), hours: w("الشبكة شغّالة 24/7", "The network runs 24/7", "הרשת פועלת 24/7"), phone: "0", email: "team@arenas.example", city: "" },
  pack: {
    label: w("الساحات", "The Arenas", "הזירות"),
    eyebrow: w("ميني جيمز لماينكرافت Java", "Minigames for Minecraft Java", "מיני־גיימס למיינקראפט Java"),
    title: w("عنوان واحد، وخمس ساحات بتستنّاك", "One address, and five arenas waiting for you", "כתובת אחת, וחמש זירות שמחכות לכם"),
    sub: w("احمِ سريرك، اربح الجزر، بارز صاحبك، أو اكسر رقم الباركور. كل لعبة إلها ترتيبها.", "Guard your bed, win the islands, duel a friend, or break the parkour record. Each game has its rankings.", "שמרו על המיטה, נצחו באיים, התמודדו עם חבר, או שברו את שיא הפארקור. לכל משחק הדירוג שלו."),
    cta: w("انسخ العنوان", "Copy the address", "להעתיק את הכתובת"),
    product: w("الألعاب", "The games", "המשחקים"),
    story: w("بنينا الساحات لناس بدها لعبة سريعة بعد الشغل أو المدرسة: عشر دقايق، ولعبة نضيفة.", "We built the Arenas for people who want a quick game after work or school: ten minutes, and a fair game.", "בנינו את הזירות לאנשים שרוצים משחק קצר אחרי העבודה או בית הספר: עשר דקות, ומשחק הוגן."),
    collection: w("آخر الأخبار", "Latest news", "החדשות האחרונות"),
    icon: "star",
  },
  home: "/lobby",
  modules: {
    status: {
      game: "minecraft",
      address: "play.arenas.example",
      discord: "https://discord.gg/arenas",
      join: w("انسخ العنوان", "Copy the address", "להעתיק את הכתובת"),
      steps: [
        [w("افتح ماينكرافت Java", "Open Minecraft Java", "לפתוח את מיינקראפט Java"), w("من 1.20 لـ 1.21، بحساب أصلي.", "From 1.20 to 1.21, on a genuine account.", "מ־1.20 עד 1.21, עם חשבון מקורי.")],
        [w("ضيف الشبكة", "Add the network", "להוסיף את הרשת"), w("Multiplayer ← Add Server، والصق العنوان.", "Multiplayer → Add Server, and paste the address.", "Multiplayer ← Add Server, ולהדביק את הכתובת.")],
        [w("اختار لعبتك", "Pick your game", "לבחור משחק"), w("من البوصلة بالساحة الرئيسية، أو اكتب /server واسم اللعبة.", "From the compass in the main square, or type /server and the game's name.", "מהמצפן בכיכר הראשית, או להקליד /server ואת שם המשחק.")],
      ],
    },
    servers: {
      title: w("الساحات", "The arenas", "הזירות"),
      sub: w("كل لعبة هلّق: شغّالة ولا لأ، وكم واحد عليها. كلهم من نفس العنوان.", "Each game now: up or not, and how many are on it. All through the same address.", "כל משחק עכשיו: פועל או לא, וכמה שחקנים בו. כולם דרך אותה כתובת."),
      list: [
        { key: "lobby", title: w("الساحة الرئيسية", "The main square", "הכיכר הראשית"), line: w("منها بتروح لكل لعبة، وفيها باركور صغير تتمرّن عليه.", "From here you go to every game, with a little parkour to warm up on.", "מכאן הולכים לכל משחק, ויש פארקור קטן לחימום."), address: "", hint: w("/server lobby", "/server lobby", "/server lobby") },
        { key: "bedwars", title: w("احمِ السرير", "Bed Wars", "מלחמת המיטות"), line: w("فرق من أربعة: احمِ سريرك واكسر أسرّة الباقي. بلا سرير، ما في رجعة.", "Teams of four: guard your bed and break the others'. Without a bed, there's no coming back.", "קבוצות של ארבעה: שמרו על המיטה ושברו את של האחרים. בלי מיטה אין חזרה."), address: "", hint: w("/server bedwars", "/server bedwars", "/server bedwars") },
        { key: "skywars", title: w("حرب الجزر", "Sky Wars", "מלחמת האיים"), line: w("كل واحد على جزيرة بالسما، واللي بيضل واقف آخر واحد بيربح.", "Everyone on an island in the sky, and the last one standing wins.", "כל אחד על אי בשמיים, והאחרון שנשאר עומד מנצח."), address: "", hint: w("/server skywars", "/server skywars", "/server skywars") },
        { key: "duels", title: w("المبارزات", "Duels", "דו־קרבות"), line: w("واحد ضد واحد، بأطقم مختلفة: سيف، قوس، أو بلا درع.", "One against one, with different kits: sword, bow, or no armour.", "אחד על אחד, עם ערכות שונות: חרב, קשת, או בלי שריון."), address: "", hint: w("/server duels", "/server duels", "/server duels") },
        { key: "parkour", title: w("الباركور", "Parkour", "פארקור"), line: w("مسارات بوقت، وأسرع واحد بكل مسار بيطلع بالترتيب.", "Timed courses, and the fastest on each course makes the rankings.", "מסלולים על זמן, והמהיר בכל מסלול עולה לדירוג."), address: "", hint: w("/server parkour", "/server parkour", "/server parkour") },
      ],
    },
    link: {},
    ranking: {
      title: w("الترتيب", "Rankings", "דירוג"),
      sub: w("لكل لعبة ترتيبها: مين ربح أكتر، وأسرع واحد بالباركور.", "Each game has its rankings: who won the most, and the fastest at parkour.", "לכל משחק הדירוג שלו: מי ניצח הכי הרבה, והמהיר ביותר בפארקור."),
      boards: [
        { key: "bedwars-wins", title: w("احمِ السرير: الربحات", "Bed Wars: wins", "מלחמת המיטות: ניצחונות"), sub: w("كل لعبة ربحها الفريق بتنحسب لكل واحد فيه.", "Each game a team wins counts for everyone on it.", "כל משחק שהקבוצה ניצחה נספר לכל אחד בה."), unit: "number", how: "sum", best: "high" },
        { key: "skywars-wins", title: w("حرب الجزر: الربحات", "Sky Wars: wins", "מלחמת האיים: ניצחונות"), unit: "number", how: "sum", best: "high" },
        { key: "duels-wins", title: w("المبارزات: الربحات", "Duels: wins", "דו־קרבות: ניצחונות"), unit: "number", how: "sum", best: "high" },
        { key: "parkour-best", title: w("الباركور: أسرع وقت", "Parkour: the fastest time", "פארקור: הזמן המהיר"), sub: w("أسرع وقت لكل واحد على المسار الكبير.", "Each one's fastest time on the big course.", "הזמן המהיר של כל אחד במסלול הגדול."), unit: "lap", how: "best", best: "low" },
        { key: "playtime", title: RANK_W.playtime, sub: RANK_W.playtimeSub, unit: "minutes", how: "sum", best: "high" },
      ],
    },
    mcstore: {
      title: w("المتجر", "The store", "החנות"),
      sub: w("أشكال وألقاب وتأثيرات بتدعم الشبكة. ولا شي هون بيخلّيك تربح أسهل.", "Looks, titles and effects that support the network. Nothing here makes winning easier.", "מראות, תארים ואפקטים שתומכים ברשת. שום דבר כאן לא מקל לנצח."),
      kinds: [
        ["rank", w("رتبة (شكل)", "Rank (looks)", "דרגה (מראה)")],
        ["cosmetic", w("تأثيرات", "Effects", "אפקטים")],
        ["title", w("لقب", "Title", "תואר")],
        ["other", w("غير شي", "Something else", "משהו אחר")],
      ],
      rows: [
        { slug: "arena-rank", title: w("رتبة الساحة", "Arena rank", "דרגת הזירה"), kind: "rank", price: 20, text: w("اسم ذهبي ولقب «بطل الساحة» بالشات.", "A golden name and the «Arena hero» title in chat.", "שם זהוב והתואר «גיבור הזירה» בצ'אט."), advantage: false, command: "lp user {player} parent add arena" },
        { slug: "win-fireworks", title: w("ألعاب نارية للربحة", "Win fireworks", "זיקוקי ניצחון"), kind: "cosmetic", price: 8, text: w("ألعاب نارية بلونك لما تربح.", "Fireworks in your colour when you win.", "זיקוקים בצבע שלכם כשאתם מנצחים."), advantage: false, command: "lp user {player} permission set effects.fireworks" },
        { slug: "champion-title", title: w("لقب البطل", "The champion title", "תואר האלוף"), kind: "title", price: 5, text: w("لقب «البطل» جنب اسمك بكل لعبة.", "The «Champion» title beside your name in every game.", "התואר «אלוף» ליד השם בכל משחק."), advantage: false, command: "lp user {player} permission set tags.champion" },
        // An advantage in the game: never shown or sold (Mojang's rules); the panel lists it held back.
        { slug: "extra-hearts", title: w("قلوب زيادة بالمبارزات", "Extra hearts in duels", "לבבות נוספים בדו־קרב"), kind: "other", price: 15, text: w("قلبين زيادة بكل مبارزة.", "Two more hearts in every duel.", "שני לבבות נוספים בכל דו־קרב."), advantage: true, command: "lp user {player} permission set duels.hearts.2" },
      ],
    },
    rules: {
      title: w("القوانين", "The rules", "החוקים"),
      sub: w("نفس القوانين بكل الساحات، وكم قانون لكل لعبة.", "The same rules in every arena, and a few for each game.", "אותם חוקים בכל הזירות, ועוד כמה לכל משחק."),
      changed: w("آخر تعديل 20 تشرين التاني: زدنا 2.2 عن الفرق بالألعاب الفردية.", "Last changed on 20 November: we added 2.2 on teaming in solo games.", "שינוי אחרון ב־20 בנובמבר: הוספנו את 2.2 על שיתוף פעולה במשחקי יחידים."),
      date: "2026-11-20",
      sections: [
        { key: "general", name: w("عام", "General", "כללי"), rows: [
          RESPECT,
          { n: "1.2", title: w("بدون غش", "No cheating", "בלי רמאות"), text: w("لا هاكات ولا ماكرو ولا مودات بتعطي أفضلية. باند من أول مرّة.", "No hacks, macros or mods that give an edge. A ban the first time.", "בלי האקים, מאקרו או מודים שנותנים יתרון. באן מהפעם הראשונה.") },
          { n: "1.3", title: w("بلا إعلانات", "No advertising", "בלי פרסום"), text: w("ما بتحط عناوين سيرفرات تانية بالشات.", "Don't post other servers' addresses in chat.", "לא מפרסמים כתובות של שרתים אחרים בצ'אט.") },
        ] },
        { key: "games", name: w("بالألعاب", "In the games", "במשחקים"), rows: [
          { n: "2.1", title: w("بلا ترك بالنص", "No leaving midway", "בלי לעזוב באמצע"), text: w("اللي بيطلع من لعبة فرق بالنص كذا مرّة بيستنّى قبل اللعبة الجاية.", "Leaving team games midway again and again means a wait before the next one.", "מי שעוזב משחקי קבוצות באמצע שוב ושוב יחכה לפני המשחק הבא.") },
          { n: "2.2", title: w("لعبة فردية يعني فردية", "Solo means solo", "יחידים זה יחידים"), text: w("ما في تعاون بالألعاب الفردية.", "No teaming up in solo games.", "בלי שיתוף פעולה במשחקי יחידים.") },
        ] },
      ],
    },
    apply: {
      title: w("انضمّ للطاقم", "Join the staff", "הצטרפו לצוות"),
      sub: w("بتحب تساعد اللاعبين أو تبني ساحات؟ قدّم من هون.", "Love helping players or building arenas? Apply here.", "אוהבים לעזור לשחקנים או לבנות זירות? הגישו כאן."),
      kinds: [
        { key: "helper", name: w("مساعد", "Helper", "עוזר"), line: w("بتجاوب اللاعبين بالشات والديسكورد.", "You answer players in chat and on Discord.", "עונים לשחקנים בצ'אט ובדיסקורד."), needs: w("عمرك 15 وفوق، وساعتين بالأسبوع.", "Aged 15 or more, and two hours a week.", "בני 15 ומעלה, ושעתיים בשבוע."), question: w("كيف بتتصرّف مع لاعب عم يشتم بالشات؟", "How would you deal with a player insulting others in chat?", "איך תתמודדו עם שחקן שמקלל בצ'אט?") },
        { key: "builder", name: w("بنّاء", "Builder", "בנאי"), line: w("بتبني ساحات وخرايط جديدة.", "You build new arenas and maps.", "בונים זירות ומפות חדשות."), needs: w("صور من شغل بنيته.", "Pictures of something you built.", "תמונות של משהו שבניתם."), question: w("احكيلنا عن أحسن شي بنيته، وحط رابط لصوره.", "Tell us about the best thing you built, with a link to its pictures.", "ספרו לנו על הדבר הכי טוב שבניתם, עם קישור לתמונות.") },
      ],
      wait: 14,
      votes: 2,
    },
    news: {
      title: w("الأخبار", "News", "חדשות"),
      sub: w("ساحات جديدة، فعاليات، وتحديثات.", "New arenas, events and updates.", "זירות חדשות, אירועים ועדכונים."),
      rows: [
        { slug: "parkour-course", date: "2026-11-19", title: w("مسار باركور جديد", "A new parkour course", "מסלול פארקור חדש"), text: w("المسار الكبير صار أطول بعشر قفزات.", "The big course is ten jumps longer.", "המסלול הגדול התארך בעשר קפיצות."), body: w("الترتيب على المسار الكبير بلّش من جديد. مين أول واحد بينزل تحت الدقيقتين؟", "The big course's rankings started over. Who will be first under two minutes?", "הדירוג במסלול הגדול התחיל מחדש. מי יהיה הראשון מתחת לשתי דקות?") },
        { slug: "duels-kits", date: "2026-11-12", title: w("أطقم جديدة بالمبارزات", "New duel kits", "ערכות חדשות לדו־קרב"), text: w("طقم القوس وطقم بلا درع.", "A bow kit and a no-armour kit.", "ערכת קשת וערכה בלי שריון."), body: w("اختار طقمك قبل كل مبارزة من القائمة.", "Pick your kit from the menu before each duel.", "בחרו ערכה מהתפריט לפני כל דו־קרב.") },
      ],
    },
    team: {
      title: w("الطاقم", "The staff", "הצוות"),
      sub: w("اللي بيشغّلوا الساحات.", "Those who run the arenas.", "מי שמפעילים את הזירות."),
      rows: [
        { name: w("قصي", "Qusai", "קוסאי"), role: w("صاحب الشبكة", "Network owner", "בעל הרשת"), bio: w("بيبني الساحات من 2019.", "Building arenas since 2019.", "בונה זירות מאז 2019.") },
        { name: w("ليان", "Layan", "ליאן"), role: w("رئيسة الطاقم", "Head of staff", "ראש הצוות"), bio: w("بتجاوب على كل استئناف بنفسها.", "Answers every appeal herself.", "עונה בעצמה על כל ערעור.") },
      ],
    },
    questions: { rows: [
      { q: w("كيف بروح على لعبة معيّنة؟", "How do I go to a certain game?", "איך מגיעים למשחק מסוים?"), a: w("من البوصلة بالساحة الرئيسية، أو اكتب /server واسمها.", "From the compass in the main square, or type /server and its name.", "מהמצפן בכיכר הראשית, או להקליד /server ואת שמו.") },
      { q: w("الترتيب بيتصفّر؟", "Do the rankings reset?", "הדירוג מתאפס?"), a: w("بتشوف الأوائل اليوم وهالأسبوع وهالشهر ومن الأول.", "You see the best today, this week, this month and of all time.", "רואים את הטובים היום, השבוע, החודש ומאז ומעולם.") },
      { q: w("المتجر بيعطي أفضلية؟", "Does the store give an advantage?", "החנות נותנת יתרון?"), a: w("لأ، أشكال وألقاب وتأثيرات بس.", "No, only looks, titles and effects.", "לא, רק מראות, תארים ואפקטים.") },
      BANNED,
    ] },
    appeals: {
      title: w("الاستئناف والبلاغ", "Appeals and reports", "ערעורים ודיווחים"),
      sub: w("انبنّدت وشايف إنه غلط، أو شفت حدا عم يغش؟ من هون.", "Banned and think it was wrong, or saw someone cheating? Here.", "קיבלתם באן וחושבים שזו טעות, או ראיתם מישהו מרמה? כאן."),
      reasons: [
        ["cheating", w("غش أو هاك", "Cheating or hacks", "רמאות או האקים")],
        ["teaming", w("تعاون بلعبة فردية", "Teaming in a solo game", "שיתוף פעולה במשחק יחידים")],
        ["toxic", w("شتائم أو تحرّش", "Insults or harassment", "קללות או הטרדה")],
        ["other", w("شي تاني", "Something else", "משהו אחר")],
      ],
    },
    contact: {},
    notify: {},
  },
});

/** 311: a CS2 community: its servers each at its own address (retake, surf, deathmatch, AWP), and a public ban list tied to its appeals. */
export const CS2_COMMUNITY = site({
  key: "site-cs2-community",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("مجتمع سيرفرات CS2: النيشان", "CS2 servers community: Crosshair", "קהילת שרתי CS2: הכוונת"),
  note: w("موقع مجتمع سيرفرات CS2: كذا سيرفر (ريتيك، سيرف، ديث ماتش، AWP) كل واحد بحالته وكبسة «فوت هلّق»، لائحة الباند العامة مربوطة بالاستئناف، القوانين، التقديم للأدمن، وأخبار.", "A CS2 servers community: several servers (retake, surf, deathmatch, AWP), each with its status and «join now», the public ban list tied to appeals, rules, applying to be an admin, and news.", "אתר לקהילת שרתי CS2: כמה שרתים (ריטייק, סרף, דת'מאץ', AWP), לכל אחד המצב שלו ו«להתחבר עכשיו», רשימת הבאנים הציבורית שמחוברת לערעורים, חוקים, הגשה לאדמין, וחדשות."),
  biz: { name: w("النيشان", "Crosshair", "הכוונת"), address: w("أونلاين", "Online", "אונליין"), hours: w("السيرفرات شغّالة 24/7", "The servers run 24/7", "השרתים פועלים 24/7"), phone: "0", email: "admins@crosshair.example", city: "" },
  pack: {
    label: w("النيشان", "Crosshair", "הכוונת"),
    eyebrow: w("مجتمع سيرفرات CS2", "A CS2 servers community", "קהילת שרתי CS2"),
    title: w("نيشانك بيتحسّن هون", "Your aim gets better here", "הכוונת שלכם משתפרת כאן"),
    sub: w("أربع سيرفرات، أدمن صاحيين، ولائحة باند مفتوحة للكل. فوت على اللي بدّك ياه.", "Four servers, admins who are awake, and a ban list open to all. Join the one you want.", "ארבעה שרתים, אדמינים ערניים ורשימת באנים פתוחה לכולם. התחברו לזה שאתם רוצים."),
    cta: w("فوت هلّق", "Join now", "להתחבר עכשיו"),
    product: w("السيرفرات", "The servers", "השרתים"),
    story: w("بلّشنا بسيرفر ريتيك واحد لأصحابنا، وهلّق صرنا مجتمع بيلعب كل ليلة.", "We started with one retake server for our friends; now we're a community that plays every night.", "התחלנו בשרת ריטייק אחד לחברים; היום אנחנו קהילה שמשחקת כל לילה."),
    collection: w("آخر الأخبار", "Latest news", "החדשות האחרונות"),
    icon: "star",
  },
  home: "/hub",
  modules: {
    status: {
      game: "steam",
      address: "cs.crosshair.example:27015",
      discord: "https://discord.gg/crosshair",
      join: w("فوت هلّق", "Join now", "להתחבר עכשיו"),
      steps: [
        [w("افتح CS2", "Open CS2", "לפתוח את CS2"), w("من Steam، ومعك اللعبة.", "From Steam, with the game.", "מ־Steam, עם המשחק.")],
        [w("اختار سيرفر", "Pick a server", "לבחור שרת"), w("تحت: كل سيرفر بحالته وكم واحد عليه.", "Below: each server with its status and how many are on it.", "למטה: כל שרת עם המצב שלו וכמה שחקנים עליו.")],
        [w("كبسة «فوت عليه»", "Press «join it»", "ללחוץ «להתחבר אליו»"), w("أو بالكونسول: connect والعنوان.", "Or in the console: connect and the address.", "או בקונסול: connect והכתובת.")],
      ],
    },
    servers: {
      title: w("سيرفراتنا", "Our servers", "השרתים שלנו"),
      sub: w("كل سيرفر هلّق، وكبسة بتفوّتك عليه مباشرة.", "Each server now, with a button that takes you straight in.", "כל שרת עכשיו, עם כפתור שמכניס אתכם ישר."),
      list: [
        { key: "retake", title: w("ريتيك", "Retake", "ריטייק"), line: w("خمسة ضد أربعة: القنبلة مزروعة، ورجّعوا الموقع قبل ما تنفجر.", "Five against four: the bomb is planted, take the site back before it blows.", "חמישה נגד ארבעה: הפצצה הוטמנה, החזירו את האתר לפני שהיא מתפוצצת."), address: "cs.crosshair.example:27015" },
        { key: "surf", title: w("سيرف", "Surf", "סרף"), line: w("تزحلق على المنحدرات، ومسارات بوقت لكل خريطة.", "Slide along the ramps, with timed runs on every map.", "גלישה על הרמפות, עם ריצות על זמן בכל מפה."), address: "cs.crosshair.example:27016" },
        { key: "deathmatch", title: w("ديث ماتش", "Deathmatch", "דת'מאץ'"), line: w("كل واحد لحاله، بترجع على طول: تمرين نيشان.", "Everyone for themselves, back in at once: aim practice.", "כל אחד לעצמו, חוזרים מיד: אימון כוונה."), address: "cs.crosshair.example:27017" },
        { key: "awp", title: w("AWP بس", "AWP only", "רק AWP"), line: w("خرايط صغيرة، والقنّاصة بس.", "Small maps, and only the sniper rifle.", "מפות קטנות, ורק רובה הצלפים."), address: "cs.crosshair.example:27018" },
      ],
    },
    bans: {
      title: w("لائحة الباند", "Ban list", "רשימת הבאנים"),
      sub: w("كل باند ساري: رقمه، اللاعب، السبب ولإيمتى. مفتوحة للكل.", "Every ban in force: its number, the player, the reason and how long. Open to all.", "כל באן בתוקף: המספר, השחקן, הסיבה והמשך. פתוחה לכולם."),
      reasons: [
        ["cheating", w("غش (أيم بوت، وول هاك)", "Cheating (aimbot, wallhack)", "רמאות (aimbot, wallhack)")],
        ["toxic", w("شتائم أو تحرّش", "Insults or harassment", "קללות או הטרדה")],
        ["griefing", w("أذية الفريق", "Hurting the team", "פגיעה בקבוצה")],
        ["exploit", w("استغلال غلط بالخريطة", "Using a map bug", "ניצול באג במפה")],
        ["other", w("شي تاني", "Something else", "משהו אחר")],
      ],
      rows: [
        { number: "B-1042", player: "flick_master", playerId: "76561190000001042", reason: "cheating", length: "forever", date: "2026-11-21", server: "Retake", note: w("أيم بوت، بكليب من تلات لاعبين.", "An aimbot, on a clip from three players.", "Aimbot, בקליפ משלושה שחקנים.") },
        { number: "B-1041", player: "nightowl", playerId: "76561190000001041", reason: "toxic", length: "week", date: "2026-11-20", server: "Deathmatch", note: w("شتائم بالمايك بعد تحذيرين.", "Insults on the mic after two warnings.", "קללות במיקרופון אחרי שתי אזהרות.") },
        { number: "B-1040", player: "rampkid", playerId: "76561190000001040", reason: "exploit", length: "days3", date: "2026-11-18", server: "Surf", note: w("استغلّ غلط بالخريطة ليكسر رقم المسار.", "Used a map bug to break the run's record.", "ניצל באג במפה כדי לשבור את שיא הריצה.") },
      ],
    },
    rules: {
      title: w("القوانين", "The rules", "החוקים"),
      sub: w("نفس القوانين على كل السيرفرات. الأدمن بيطبّقوها، ولائحة الباند مفتوحة للكل.", "The same rules on every server. The admins keep them, and the ban list is open to all.", "אותם חוקים בכל השרתים. האדמינים אוכפים, ורשימת הבאנים פתוחה לכולם."),
      changed: w("آخر تعديل 19 تشرين التاني: زدنا 2.3 عن المايك.", "Last changed on 19 November: we added 2.3 on the mic.", "שינוי אחרון ב־19 בנובמבר: הוספנו את 2.3 על המיקרופון."),
      date: "2026-11-19",
      sections: [
        { key: "general", name: w("عام", "General", "כללי"), rows: [
          RESPECT,
          { n: "1.2", title: w("بدون غش", "No cheating", "בלי רמאות"), text: w("أي برنامج بيساعدك تنيشن أو تشوف ورا الحيطان: باند دايم.", "Any program that aims for you or shows you through walls: a ban for good.", "כל תוכנה שמכוונת בשבילכם או מראה מבעד לקירות: באן לתמיד.") },
          { n: "1.3", title: w("حساب واحد", "One account", "חשבון אחד"), text: w("الحساب التاني لتهرب من باند بيمدّ الباند للتنين.", "A second account to dodge a ban extends the ban to both.", "חשבון שני כדי לעקוף באן מאריך את הבאן לשניהם.") },
        ] },
        { key: "play", name: w("باللعب", "In play", "במשחק"), rows: [
          { n: "2.1", title: w("ما تأذي فريقك", "Don't hurt your team", "לא פוגעים בקבוצה"), text: w("القتل أو السد على فريقك عن قصد: باند.", "Killing or blocking your team on purpose: a ban.", "להרוג או לחסום את הקבוצה בכוונה: באן.") },
          { n: "2.2", title: w("بلا أغلاط الخريطة", "No map bugs", "בלי באגים במפה"), text: w("لقيت غلط؟ بلّغ عنه، ما تستعمله.", "Found a bug? Report it, don't use it.", "מצאתם באג? דווחו, אל תשתמשו בו.") },
          { n: "2.3", title: w("المايك للعب", "The mic is for the game", "המיקרופון למשחק"), text: w("بلا موسيقى ولا صريخ بالمايك.", "No music or shouting on the mic.", "בלי מוזיקה או צעקות במיקרופון.") },
        ] },
      ],
    },
    apply: {
      title: w("صير أدمن", "Become an admin", "להיות אדמין"),
      sub: w("بتلعب كل ليلة وبتحب اللعبة النضيفة؟ قدّم من هون.", "Play every night and love a clean game? Apply here.", "משחקים כל לילה ואוהבים משחק נקי? הגישו כאן."),
      kinds: [
        { key: "admin", name: w("أدمن", "Admin", "אדמין"), line: w("بتطبّق القوانين على السيرفرات، وبتحط الباندات باللائحة.", "You keep the rules on the servers, and put bans on the list.", "אוכפים את החוקים בשרתים ומוסיפים באנים לרשימה."), needs: w("عمرك 17 وفوق، ومية ساعة عالسيرفرات.", "Aged 17 or more, with a hundred hours on the servers.", "בני 17 ומעלה, עם מאה שעות בשרתים."), question: w("لاعب بيلعب كتير منيح لدرجة بتشك فيه. شو بتعمل؟", "A player plays so well you suspect them. What do you do?", "שחקן משחק כל כך טוב שאתם חושדים בו. מה תעשו?") },
      ],
      wait: 30,
      votes: 2,
    },
    news: {
      title: w("الأخبار", "News", "חדשות"),
      sub: w("سيرفرات جديدة، خرايط، وبطولات.", "New servers, maps and tournaments.", "שרתים חדשים, מפות וטורנירים."),
      rows: [
        { slug: "awp-server", date: "2026-11-17", title: w("سيرفر AWP بس", "An AWP-only server", "שרת רק AWP"), text: w("السيرفر الرابع فتح.", "The fourth server is open.", "השרת הרביעי נפתח."), body: w("خرايط صغيرة وسريعة، والقنّاصة بس. منستنّاكم.", "Small, quick maps, and only the sniper rifle. See you there.", "מפות קטנות ומהירות, ורק רובה הצלפים. מחכים לכם.") },
        { slug: "retake-cup", date: "2026-11-10", title: w("بطولة ريتيك", "A retake cup", "גביע ריטייק"), text: w("فرق من خمسة، آخر الشهر.", "Teams of five, at the end of the month.", "קבוצות של חמישה, בסוף החודש."), body: w("التسجيل بالديسكورد. الجايزة لقب الفريق على السيرفر لشهر.", "Sign up on Discord. The prize: the team's tag on the server for a month.", "ההרשמה בדיסקורד. הפרס: תג הקבוצה בשרת לחודש.") },
      ],
    },
    team: {
      title: w("الأدمن", "The admins", "האדמינים"),
      sub: w("اللي بيحافظوا عاللعبة نضيفة.", "Those who keep the game clean.", "מי ששומרים על משחק נקי."),
      rows: [
        { name: w("سامر", "Samer", "סאמר"), role: w("صاحب المجتمع", "Community owner", "בעל הקהילה"), bio: w("بيلعب ريتيك من أيام CS القديمة.", "Playing retake since the old CS days.", "משחק ריטייק מימי CS הישנים.") },
        { name: w("رنا", "Rana", "ראנה"), role: w("رئيسة الأدمن", "Head admin", "ראש האדמינים"), bio: w("بتراجع كل استئناف خلال يومين.", "Reviews every appeal within two days.", "בודקת כל ערעור תוך יומיים.") },
      ],
    },
    questions: { rows: [
      { q: w("كيف بفوت على سيرفر معيّن؟", "How do I join a certain server?", "איך מתחברים לשרת מסוים?"), a: w("كبسة «فوت عليه» جنب السيرفر، أو بالكونسول: connect والعنوان.", "The «join it» button beside the server, or in the console: connect and the address.", "הכפתור «להתחבר אליו» ליד השרת, או בקונסול: connect והכתובת.") },
      { q: w("ليش لائحة الباند مفتوحة؟", "Why is the ban list open?", "למה רשימת הבאנים פתוחה?"), a: w("عشان الكل يشوف إنه القوانين بتنطبّق على الكل.", "So everyone sees the rules apply to everyone.", "כדי שכולם יראו שהחוקים חלים על כולם.") },
      { q: w("في متجر؟", "Is there a store?", "יש חנות?"), a: w("لأ. السيرفرات ببلاش، وبتدعمنا بالديسكورد إذا بدّك.", "No. The servers are free, and you can support us on Discord if you like.", "לא. השרתים בחינם, ואפשר לתמוך בנו בדיסקורד אם רוצים.") },
      BANNED,
    ] },
    appeals: {
      title: w("الاستئناف والبلاغ", "Appeals and reports", "ערעורים ודיווחים"),
      sub: w("انبنّدت وشايف إنه غلط؟ استأنف برقم الباند من اللائحة. شفت حدا عم يغش؟ بلّغ بكليب.", "Banned and think it was wrong? Appeal with the ban's number from the list. Saw someone cheating? Report them with a clip.", "קיבלתם באן וחושבים שזו טעות? ערערו עם מספר הבאן מהרשימה. ראיתם מישהו מרמה? דווחו עם קליפ."),
      reasons: [
        ["cheating", w("غش", "Cheating", "רמאות")],
        ["toxic", w("شتائم أو تحرّش", "Insults or harassment", "קללות או הטרדה")],
        ["griefing", w("أذية الفريق", "Hurting the team", "פגיעה בקבוצה")],
        ["other", w("شي تاني", "Something else", "משהו אחר")],
      ],
    },
    contact: {},
    notify: {},
  },
});
