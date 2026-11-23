/** Whole sites for game servers (wave G of docs/sites-300-plan.ar.md): a FiveM roleplay city, a Minecraft survival valley, a Rust island. */
import { w } from "../words";
import { site } from "./blueprint";
import { RANK_W } from "./siteWords";

export const FIVEM_RP = site({
  key: "site-fivem-rp",
  version: "1.7.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("سيرفر رول بلاي FiveM: مدينة الندى", "FiveM roleplay server: Dew City", "שרת רולפליי FiveM: עיר הטל"),
  note: w("موقع سيرفر FiveM كامل: حالة السيرفر الحيّة وعدد اللاعبين، «فوت هلّق»، الديسكورد، التحديثات، القوانين، التقديم على الوظائف بتصويت الطاقم، الاستئناف والبلاغ، باقات Tebex، الطاقم، أسئلة ورسائل.", "A whole FiveM server site: the server's live status and players, «join now», Discord, updates, the rules, applying for jobs with the staff's votes, appeals and reports, Tebex packages, staff, questions and messages.", "אתר שרת FiveM שלם: מצב השרת החי והשחקנים, «להתחבר עכשיו», דיסקורד, עדכונים, חוקים, הגשה לעבודות בהצבעת הצוות, ערעורים ודיווחים, חבילות Tebex, צוות, שאלות והודעות."),
  biz: { name: w("مدينة الندى", "Dew City", "עיר הטל"), address: w("أونلاين", "Online", "אונליין"), hours: w("السيرفر شغّال 24/7", "The server runs 24/7", "השרת פועל 24/7"), phone: "0", email: "staff@dewcity.example", city: "" },
  pack: {
    label: w("مدينة الندى", "Dew City", "עיר הטל"),
    eyebrow: w("سيرفر رول بلاي بالعربي", "A roleplay server in Arabic", "שרת רולפליי בערבית"),
    title: w("عيش قصتك بمدينة ما بتنام", "Live your story in a city that never sleeps", "תחיו את הסיפור שלכם בעיר שלא ישנה"),
    sub: w("شرطة، إسعاف، ميكانيك، عصابات وتجّار: كل واحد إله دور، والقصة بتكتبها إنت.", "Police, paramedics, mechanics, gangs and traders: everyone has a part, and you write the story.", "משטרה, פרמדיקים, מוסכניקים, כנופיות וסוחרים: לכל אחד תפקיד, ואתם כותבים את הסיפור."),
    cta: w("فوت هلّق", "Join now", "להתחבר עכשיו"),
    product: w("المدينة", "The city", "העיר"),
    story: w("بدأنا المدينة كمجموعة صحاب بدهم رول بلاي جدّي ومحترم بلغتهم.", "We started the city as friends who wanted serious, respectful roleplay in their own language.", "התחלנו את העיר כחברים שרצו רולפליי רציני ומכבד בשפה שלהם."),
    collection: w("آخر التحديثات", "Latest updates", "העדכונים האחרונים"),
    icon: "star",
  },
  home: "/city",
  modules: {
    status: {
      game: "fivem",
      address: "cfx.re/join/abc123",
      discord: "https://discord.gg/dewcity",
      join: w("فوت هلّق", "Join now", "להתחבר עכשיו"),
      steps: [
        [w("نزّل FiveM", "Get FiveM", "להוריד FiveM"), w("لازم تكون عندك GTA V أصلية على الكمبيوتر.", "You need a genuine GTA V on your PC.", "צריך GTA V מקורי במחשב.")],
        [w("اقرأ القوانين", "Read the rules", "לקרוא את החוקים"), w("رول بلاي محترم، بدون ميتا ولا باور جيمنغ.", "Respectful roleplay, no metagaming or powergaming.", "רולפליי מכבד, בלי מטא ובלי פאוורגיימינג.")],
        [w("فوت هلّق", "Join now", "להתחבר עכשיו"), w("كبسة «فوت هلّق» بتفتحلك اللعبة عالسيرفر.", "«Join now» opens the game on the server.", "«להתחבר עכשיו» פותח את המשחק על השרת.")],
      ],
    },
    team: {
      title: w("الطاقم", "The staff", "הצוות"),
      sub: w("ناس من اللاعبين، بيسهروا عالمدينة.", "Players themselves, looking after the city.", "שחקנים בעצמם, ששומרים על העיר."),
      rows: [
        { name: w("أبو فارس", "Abu Fares", "אבו פארס"), role: w("المؤسّس", "Founder", "מייסד"), bio: w("بيلعب رول بلاي من ست سنين، وبيحب القصص الطويلة.", "Six years of roleplay, and a love for long stories.", "שש שנים של רולפליי ואהבה לסיפורים ארוכים.") },
        { name: w("نور", "Nour", "נור"), role: w("مسؤولة الطاقم", "Head of staff", "ראש הצוות"), bio: w("بتردّ عالبلاغات وبتنظّم الفعاليات.", "She answers reports and runs the events.", "עונה לדיווחים ומארגנת את האירועים.") },
        { name: w("زيد", "Zaid", "זייד"), role: w("مطوّر", "Developer", "מפתח"), bio: w("كل سكربت بالمدينة مرّ من تحت إيده.", "Every script in the city went through his hands.", "כל סקריפט בעיר עבר דרכו.") },
      ],
    },
    questions: { rows: [
      { q: w("لازم أقدّم قبل ما أفوت؟", "Do I have to apply before joining?", "צריך להגיש בקשה לפני שמתחברים?"), a: w("لأ، السيرفر مفتوح. التقديم بس للوظائف متل الشرطة والإسعاف، ولطاقم الإدارة، من صفحة التقديم.", "No, the server is open. Applying is only for jobs like police and paramedics, and for the staff, on the apply page.", "לא, השרת פתוח. הגשה רק לעבודות כמו משטרה ופרמדיקים, ולצוות, בעמוד ההגשה.") },
      { q: w("لازم مايك؟", "Do I need a microphone?", "צריך מיקרופון?"), a: w("أيوا، الرول بلاي كله بالصوت.", "Yes, all the roleplay is by voice.", "כן, כל הרולפליי בקול.") },
      { q: w("كم عمري لازم يكون؟", "How old do I have to be?", "בן כמה צריך להיות?"), a: w("16 وفوق.", "16 or older.", "16 ומעלה.") },
      { q: w("انبنّدت، شو بعمل؟", "I was banned, what do I do?", "קיבלתי באן, מה עושים?"), a: w("قدّم استئناف من صفحة «الاستئناف والبلاغ» برقم الباند، ومنرد خلال يومين.", "Appeal it on the appeals and reports page with the ban's number; we reply within two days.", "הגישו ערעור בעמוד הערעורים והדיווחים עם מספר הבאן; נענה תוך יומיים.") },
    ] },
    news: {
      title: w("التحديثات", "Updates", "עדכונים"),
      sub: w("شو انضاف، شو تغيّر، وشو تصلّح.", "What was added, what changed and what was fixed.", "מה נוסף, מה השתנה ומה תוקן."),
      rows: [
        { slug: "update-2-4", date: "2026-11-18", title: w("تحديث 2.4: المستشفى الجديد", "Update 2.4: the new hospital", "עדכון 2.4: בית החולים החדש"), text: w("مستشفى أكبر، ونظام إصابات جديد.", "A bigger hospital and a new injury system.", "בית חולים גדול יותר ומערכת פציעות חדשה."), body: w("انضاف: مستشفى بطابقين، غرفة عمليات، ونظام إصابات. تغيّر: أسعار الإصلاح. تصلّح: السيارات اللي كانت تختفي بالكراج.", "Added: a two-floor hospital, an operating room and injuries. Changed: repair prices. Fixed: cars vanishing in the garage.", "נוסף: בית חולים בשתי קומות, חדר ניתוח ופציעות. שונה: מחירי תיקונים. תוקן: מכוניות שנעלמו במוסך.") },
        { slug: "event-race", date: "2026-11-10", title: w("سباق الجمعة", "Friday's race", "המרוץ של יום שישי"), text: w("سباق بالشوارع، وجوايز للأوائل.", "A street race, with prizes for the top three.", "מרוץ ברחובות, עם פרסים לשלושה הראשונים."), body: w("الجمعة الساعة 9 المسا. التسجيل بالديسكورد، والسيارات من الكراج تبعكم.", "Friday at 9 pm. Sign up on Discord; bring your own car from your garage.", "שישי ב־21:00. הרשמה בדיסקורד, מביאים מכונית מהמוסך שלכם.") },
        { slug: "jobs-open", date: "2026-11-01", title: w("فتحنا التقديم للشرطة", "Police applications are open", "ההגשות למשטרה נפתחו"), text: w("عشر أماكن جديدة.", "Ten new places.", "עשרה מקומות חדשים."), body: w("قدّم من صفحة التقديم، والمقابلات الأسبوع الجاي.", "Apply on the apply page; interviews next week.", "הגישו בעמוד ההגשה; הראיונות בשבוע הבא.") },
      ],
    },
    rules: {
      title: w("القوانين", "The rules", "החוקים"),
      sub: w("رول بلاي محترم بيبلّش من هون. اقراها كلها قبل ما تفوت.", "Respectful roleplay starts here. Read them all before you join.", "רולפליי מכבד מתחיל כאן. קראו את כולם לפני שמתחברים."),
      changed: w("آخر تعديل 20 تشرين التاني: زدنا 3.3 عن الخطف، ووضّحنا 2.2.", "Last changed on 20 November: we added 3.3 on kidnapping and made 2.2 clearer.", "שינוי אחרון ב־20 בנובמבר: הוספנו את 3.3 על חטיפה והבהרנו את 2.2."),
      date: "2026-11-20",
      sections: [
        { key: "general", name: w("عام", "General", "כללי"), rows: [
          { n: "1.1", title: w("احترم الكل", "Respect everyone", "כבוד לכולם"), text: w("ما في شتائم ولا عنصرية ولا تحرّش، لا جوّا اللعبة ولا بالديسكورد.", "No slurs, racism or harassment, in the game or on Discord.", "בלי קללות, גזענות או הטרדה, במשחק ובדיסקורד.") },
          { n: "1.2", title: w("اسمع للطاقم", "Listen to the staff", "להקשיב לצוות"), text: w("قرار الطاقم بيمشي باللعبة، والاعتراض بيصير بعدين، مش بنص المشهد.", "The staff's call stands in the game; objections come after, not in the middle of a scene.", "ההחלטה של הצוות תקפה במשחק; ערעורים אחר כך, לא באמצע סצנה.") },
          { n: "1.3", title: w("حساب واحد", "One account", "חשבון אחד"), text: w("كل لاعب إله حساب واحد. الحسابات التانية بتنبنّد كلها.", "Each player has one account. Every other one gets banned.", "לכל שחקן חשבון אחד. כל חשבון נוסף נחסם.") },
        ] },
        { key: "roleplay", name: w("الرول بلاي", "Roleplay", "רולפליי"), rows: [
          { n: "2.1", title: w("بدون ميتا", "No metagaming", "בלי מטא"), text: w("اللي بتعرفه برّا اللعبة (ستريم، ديسكورد) ما بتستعمله جوّاها.", "What you know from outside the game (a stream, Discord) isn't used inside it.", "מה שיודעים מחוץ למשחק (סטרים, דיסקורד) לא משתמשים בו בפנים.") },
          { n: "2.2", title: w("بدون باور جيمنغ", "No powergaming", "בלי פאוורגיימינג"), text: w("ما بتفرض شي على حدا ما إله فرصة يرد عليه، وما بتعمل شي ما بيقدر يعمله إنسان.", "Don't force anything on someone with no chance to answer, or do what no person could.", "לא כופים על מישהו דבר בלי הזדמנות להגיב, ולא עושים מה שאדם לא יכול.") },
          { n: "2.3", title: w("قيمة الحياة", "Value your life", "ערך החיים"), text: w("خاف على شخصيتك: اللي معه سلاح عراسك، بتسمع كلامه.", "Fear for your character: with a gun to your head, you do as you're told.", "תפחדו לדמות: עם אקדח לראש, עושים מה שאומרים.") },
        ] },
        { key: "crime", name: w("الجريمة", "Crime", "פשיעה"), rows: [
          { n: "3.1", title: w("المناطق الآمنة", "Safe zones", "אזורים בטוחים"), text: w("ولا جريمة بالمستشفى ولا بمركز الشرطة ولا بالكراجات.", "No crime at the hospital, the police station or the garages.", "בלי פשע בבית החולים, בתחנת המשטרה או במוסכים.") },
          { n: "3.2", title: w("السرقات الكبيرة", "Big heists", "שודים גדולים"), text: w("بنك أو مجوهرات: لازم يكون في 4 شرطة أونلاين على الأقل.", "A bank or a jeweller: at least 4 police online.", "בנק או תכשיטים: לפחות 4 שוטרים מחוברים.") },
          { n: "3.3", title: w("الخطف", "Kidnapping", "חטיפה"), text: w("ما بتخطف حدا من الطاقم وهو شغّال، ولا شخصية عمرها أقل من 18.", "Don't kidnap staff on duty, or a character under 18.", "לא חוטפים איש צוות בתפקיד, או דמות מתחת לגיל 18.") },
        ] },
      ],
    },
    apply: {
      title: w("التقديم", "Apply", "הגשה"),
      sub: w("شرطة، إسعاف، ميكانيك، أو طاقم الإدارة: اختار شو بدّك تكون.", "Police, paramedics, mechanics or the staff: pick what you want to be.", "משטרה, פרמדיקים, מוסכניקים או הצוות: בחרו מה אתם רוצים להיות."),
      wait: 7,
      votes: 2,
      kinds: [
        { key: "police", name: w("الشرطة", "Police", "משטרה"), line: w("بتحمي الشوارع وبتحقّق بالقضايا.", "You keep the streets safe and work the cases.", "שומרים על הרחובות וחוקרים תיקים."), needs: w("18 وفوق، مايك واضح، وساعتين باليوم على الأقل.", "18 or older, a clear mic, and two hours a day at least.", "גיל 18 ומעלה, מיקרופון ברור ולפחות שעתיים ביום."), question: w("شفت زميلك عم ياخد رشوة من عصابة. شو بتعمل، وليش؟", "You see a colleague take a bribe from a gang. What do you do, and why?", "ראיתם עמית לוקח שוחד מכנופיה. מה תעשו, ולמה?") },
        { key: "ems", name: w("الإسعاف", "Paramedics", "פרמדיקים"), line: w("بتنقذ الناس وبتشغّل المستشفى.", "You save lives and run the hospital.", "מצילים חיים ומפעילים את בית החולים."), needs: w("16 وفوق، مايك، وصبر عالضغط.", "16 or older, a mic, and patience under pressure.", "גיל 16 ומעלה, מיקרופון וסבלנות תחת לחץ."), question: w("وصلت على حادث فيه 3 مصابين ومعك مسعف واحد بس. كيف بتتصرّف؟", "You reach a crash with 3 hurt and only one other paramedic. What do you do?", "הגעתם לתאונה עם 3 פצועים ורק פרמדיק אחד נוסף. מה תעשו?") },
        { key: "mechanic", name: w("الميكانيك", "Mechanics", "מוסכניקים"), line: w("بتصلّح سيارات المدينة وبتفتح ورشتك.", "You fix the city's cars and run your own garage.", "מתקנים את המכוניות בעיר ומנהלים מוסך."), needs: w("16 وفوق، وبتحب تحكي مع الناس.", "16 or older, and you like talking to people.", "גיל 16 ומעלה, ואוהבים לדבר עם אנשים."), question: w("زبون ما معه مصاري يدفع حق التصليح، وسيارته لازم تطلع. شو بتعمل؟", "A customer can't pay for the repair and needs the car back. What do you do?", "לקוח לא יכול לשלם על התיקון וצריך את הרכב. מה תעשו?") },
        { key: "staff", name: w("طاقم الإدارة", "The staff", "הצוות"), line: w("بتراقب المدينة وبتساعد اللاعبين.", "You look after the city and help the players.", "שומרים על העיר ועוזרים לשחקנים."), needs: w("18 وفوق، 3 شهور باللعب عنّا، وسجل نظيف.", "18 or older, 3 months playing with us, and a clean record.", "גיל 18 ומעלה, 3 חודשים אצלנו ותיק נקי."), question: w("لاعبين اتنين عم يتخانقوا بالـ OOC وكل واحد بيتهم التاني. كيف بتحلّها؟", "Two players argue out of character, each blaming the other. How do you settle it?", "שני שחקנים רבים מחוץ לדמות וכל אחד מאשים את השני. איך תפתרו?") },
      ],
    },
    appeals: {
      title: w("الاستئناف والبلاغ", "Appeals and reports", "ערעורים ודיווחים"),
      sub: w("انبنّدت وشايف إنه غلط، أو شفت حدا عم يكسر القوانين؟ من هون.", "Banned and think it was wrong, or saw someone break the rules? Here.", "קיבלתם באן וחושבים שזו טעות, או ראיתם מישהו שובר את החוקים? כאן."),
      reasons: [
        ["cheating", w("غش أو هاكات", "Cheating or hacks", "רמאות או האקים")],
        ["rdm", w("قتل بلا سبب (RDM/VDM)", "Killing for no reason (RDM/VDM)", "הריגה בלי סיבה (RDM/VDM)")],
        ["meta", w("ميتا أو باور جيمنغ", "Metagaming or powergaming", "מטא או פאוורגיימינג")],
        ["toxic", w("شتائم أو تحرّش", "Insults or harassment", "קללות או הטרדה")],
        ["other", w("شي تاني", "Something else", "משהו אחר")],
      ],
    },
    packages: {
      title: w("الباقات", "Packages", "חבילות"),
      sub: w("VIP، سيارات، ومنازل: ادعم المدينة وخود شي حلو جوّا اللعبة.", "VIP, cars and houses: support the city and get something nice in the game.", "VIP, מכוניות ובתים: תמכו בעיר וקבלו משהו נחמד במשחק."),
    },
    link: {},
    ranking: {
      title: w("الترتيب", "The rankings", "הדירוג"),
      sub: w("مين الأكتر بالمدينة: ساعات اللعب ومصاري كل واحد، اليوم وهالأسبوع ومن الأول.", "Who leads the city: time played and each one's money, today, this week and of all time.", "מי מוביל בעיר: זמן משחק והכסף של כל אחד, היום, השבוע ומאז ומעולם."),
      boards: [
        { key: "playtime", title: RANK_W.playtime, sub: RANK_W.playtimeSub, unit: "minutes", how: "sum", best: "high" },
        { key: "money", title: w("أغنى السكان", "The richest residents", "התושבים העשירים"), sub: w("مصاري الجيبة والبنك، حسب آخر مرّة شافها السيرفر.", "Cash and bank, as the server last saw them.", "מזומן ובנק, כפי שהשרת ראה לאחרונה."), unit: "number", how: "latest", best: "high" },
      ],
    },
    streamers: {
      title: w("ستريمرز المدينة", "The city's streamers", "הסטרימרים של העיר"),
      sub: w("ناس بتبث حياتها بمدينة الندى. اللي لايف هلّق أول.", "People streaming their lives in Dew City. Those live now come first.", "אנשים שמשדרים את החיים שלהם בעיר הטל. מי שבשידור עכשיו ראשון."),
      rows: [
        { slug: "officer-nour", name: w("الضابط نور", "Officer Nour", "השוטרת נור"), twitch: "", about: w("دوريات الليل بشرطة المدينة، كل يوم بعد العشا.", "Night patrols with the city police, every day after dinner.", "סיורי לילה עם משטרת העיר, כל יום אחרי ארוחת הערב.") },
        { slug: "mechanic-sami", name: w("سامي الميكانيكي", "Sami the mechanic", "סמי המכונאי"), twitch: "", about: w("كراج سامي: تصليح، تعديل، وقصص الزباين.", "Sami's garage: repairs, mods, and the customers' stories.", "המוסך של סמי: תיקונים, שיפורים וסיפורי הלקוחות.") },
        { slug: "doctor-lina", name: w("الدكتورة لينا", "Doctor Lina", "ד\"ר לינה"), twitch: "", about: w("مناوبات الإسعاف، والليالي الطويلة بالمستشفى.", "Paramedic shifts, and long nights at the hospital.", "משמרות פרמדיקים ולילות ארוכים בבית החולים.") },
      ],
    },
    contact: {},
    notify: {},
  },
});

/**
 * A Minecraft Java survival server (wave G4): its live status (the address to copy), rules, a store of looks only
 * behind the «gives an advantage?» gate (one ready package that does, to show it held back), news, questions,
 * appeals and reports, messages. Mojang's line on its first page and its store.
 */
export const MC_SURVIVAL = site({
  key: "site-minecraft-survival",
  version: "1.3.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("سيرفر ماينكرافت سرفايفل: وادي السنديان", "Minecraft survival server: Oak Valley", "שרת הישרדות מיינקראפט: עמק האלון"),
  note: w("موقع سيرفر ماينكرافت Java كامل: الحالة الحيّة ونسخ العنوان، القوانين، متجر أشكال بس ببوابة «بتعطي أفضلية؟» حسب قواعد Mojang، الأخبار، الاستئناف والبلاغ، ورسائل.", "A whole Minecraft Java server site: the live status and the address to copy, rules, a looks-only store behind the «gives an advantage?» gate by Mojang's rules, news, appeals and reports, and messages.", "אתר שלם לשרת מיינקראפט Java: המצב החי והעתקת הכתובת, חוקים, חנות מראות בלבד עם שער «נותנת יתרון?» לפי הכללים של Mojang, חדשות, ערעורים ודיווחים והודעות."),
  biz: { name: w("وادي السنديان", "Oak Valley", "עמק האלון"), address: w("أونلاين", "Online", "אונליין"), hours: w("السيرفر شغّال 24/7", "The server runs 24/7", "השרת פועל 24/7"), phone: "0", email: "team@oakvalley.example", city: "" },
  pack: {
    label: w("وادي السنديان", "Oak Valley", "עמק האלון"),
    eyebrow: w("سيرفر سرفايفل لماينكرافت Java", "A survival server for Minecraft Java", "שרת הישרדות למיינקראפט Java"),
    title: w("ابنِ، اكتشف، وعيش مع جيرانك", "Build, explore, and live with your neighbours", "לבנות, לגלות ולחיות עם השכנים"),
    sub: w("سرفايفل نضيف: بدون سرقة ولا تخريب، اقتصاد خفيف، وفعالية كل جمعة.", "Clean survival: no stealing or griefing, a light economy, and an event every Friday.", "הישרדות נקייה: בלי גניבות ובלי הרס, כלכלה קלה ואירוע בכל שישי."),
    cta: w("انسخ العنوان", "Copy the address", "להעתיק את הכתובת"),
    product: w("العالم", "The world", "העולם"),
    story: w("فتحنا الوادي لصحاب بدهم عالم بيضل، وجيرة بتحترم بعض.", "We opened the valley for friends who wanted a world that lasts, and neighbours who respect each other.", "פתחנו את העמק לחברים שרצו עולם שנשאר, ושכנים שמכבדים זה את זה."),
    collection: w("آخر الأخبار", "Latest news", "החדשות האחרונות"),
    icon: "star",
  },
  home: "/valley",
  modules: {
    status: {
      game: "minecraft",
      address: "play.oakvalley.example",
      discord: "https://discord.gg/oakvalley",
      join: w("انسخ العنوان", "Copy the address", "להעתיק את הכתובת"),
      steps: [
        [w("افتح ماينكرافت Java", "Open Minecraft Java", "לפתוח את מיינקראפט Java"), w("نسخة 1.21، وبحساب أصلي.", "Version 1.21, on a genuine account.", "גרסה 1.21, עם חשבון מקורי.")],
        [w("ضيف السيرفر", "Add the server", "להוסיף את השרת"), w("Multiplayer ← Add Server، والصق العنوان.", "Multiplayer → Add Server, and paste the address.", "Multiplayer ← Add Server, ולהדביק את הכתובת.")],
        [w("اقرأ القوانين وفوت", "Read the rules and join", "לקרוא את החוקים ולהיכנס"), w("أول ليلة صعبة: ابنِ بيت قبل ما تغيب الشمس.", "The first night is hard: build a house before sunset.", "הלילה הראשון קשה: בנו בית לפני השקיעה.")],
      ],
    },
    link: {},
    ranking: {
      title: w("الترتيب", "The rankings", "הדירוג"),
      sub: w("مين لعب أكتر، مين أغنى واحد بالوادي، ومين أسرع واحد بالباركور.", "Who played the most, who is the richest in the valley, and who is the fastest on the parkour.", "מי שיחק הכי הרבה, מי העשיר ביותר בעמק ומי המהיר ביותר בפארקור."),
      boards: [
        { key: "playtime", title: RANK_W.playtime, sub: RANK_W.playtimeSub, unit: "minutes", how: "sum", best: "high" },
        { key: "money", title: w("أغنى اللاعبين", "The richest players", "השחקנים העשירים"), sub: w("رصيد كل واحد، حسب آخر مرّة شافه السيرفر.", "Each one's balance, as the server last saw it.", "היתרה של כל אחד, כפי שהשרת ראה לאחרונה."), unit: "number", how: "latest", best: "high" },
        { key: "parkour", title: w("باركور القلعة: أسرع وقت", "The castle parkour: the fastest time", "פארקור הטירה: הזמן המהיר"), sub: w("أحسن وقت لكل لاعب من البداية للعلم.", "Each player's best time from the start to the flag.", "הזמן הטוב של כל שחקן מההתחלה עד הדגל."), unit: "lap", how: "best", best: "low" },
      ],
    },
    rules: {
      title: w("القوانين", "The rules", "החוקים"),
      sub: w("عالم بيضل حلو لأنه الكل بيحترمه. اقراها قبل ما تبني.", "A world stays good because everyone respects it. Read them before you build.", "עולם נשאר טוב כי כולם מכבדים אותו. קראו לפני שבונים."),
      changed: w("آخر تعديل 20 تشرين التاني: زدنا 2.3 عن مزارع اللاغ.", "Last changed on 20 November: we added 2.3 on lag farms.", "שינוי אחרון ב־20 בנובמבר: הוספנו את 2.3 על חוות לאג."),
      date: "2026-11-20",
      sections: [
        { key: "general", name: w("عام", "General", "כללי"), rows: [
          { n: "1.1", title: w("احترم الكل", "Respect everyone", "כבוד לכולם"), text: w("ما في شتائم ولا عنصرية ولا تحرّش، بالشات ولا بالديسكورد.", "No slurs, racism or harassment, in chat or on Discord.", "בלי קללות, גזענות או הטרדה, בצ'אט ובדיסקורד.") },
          { n: "1.2", title: w("بدون غش", "No cheating", "בלי רמאות"), text: w("لا X-ray ولا طيران ولا أي مود بيعطيك أفضلية.", "No X-ray, no flying, no mod that gives you an edge.", "בלי X-ray, בלי תעופה ובלי מוד שנותן יתרון.") },
          { n: "1.3", title: w("حساب واحد", "One account", "חשבון אחד"), text: w("كل لاعب بحساب واحد.", "Each player plays on one account.", "כל שחקן משחק בחשבון אחד.") },
        ] },
        { key: "building", name: w("البناء", "Building", "בנייה"), rows: [
          { n: "2.1", title: w("بدون تخريب", "No griefing", "בלי הרס"), text: w("ما بتلمس بنا ولا صندوق حدا تاني.", "Don't touch anyone else's builds or chests.", "לא נוגעים בבנייה או בתיבות של אחרים.") },
          { n: "2.2", title: w("مسافة عن جيرانك", "Keep a distance", "מרחק מהשכנים"), text: w("ابعد 100 بلوكة عن أقرب بيت إلا إذا اتفقتوا.", "Build 100 blocks from the nearest home unless you agree otherwise.", "לבנות 100 בלוקים מהבית הקרוב אלא אם הסכמתם.") },
          { n: "2.3", title: w("بدون مزارع لاغ", "No lag farms", "בלי חוות לאג"), text: w("المزارع الكبيرة بتنبنى بمكان الطاقم بيحدده.", "Big farms go where the staff says.", "חוות גדולות נבנות במקום שהצוות קובע.") },
        ] },
        { key: "chat", name: w("الشات", "Chat", "צ'אט"), rows: [
          { n: "3.1", title: w("بدون إعلانات", "No advertising", "בלי פרסום"), text: w("ما بتعلن عن سيرفرات تانية.", "Don't advertise other servers.", "לא מפרסמים שרתים אחרים.") },
          { n: "3.2", title: w("بدون سبام", "No spam", "בלי ספאם"), text: w("رسالة وحدة بتكفي.", "One message is enough.", "הודעה אחת מספיקה.") },
        ] },
      ],
    },
    mcstore: {
      title: w("المتجر", "The store", "החנות"),
      sub: w("ألقاب وتأثيرات وأشكال بتدعم السيرفر. ولا شي هون بيخلّيك أقوى من غيرك.", "Titles, effects and looks that support the server. Nothing here makes you stronger than anyone.", "תארים, אפקטים ומראות שתומכים בשרת. שום דבר כאן לא הופך אתכם לחזקים יותר."),
      kinds: [
        ["rank", w("رتبة (شكل)", "Rank (looks)", "דרגה (מראה)")],
        ["cosmetic", w("شكل وتأثيرات", "Looks and effects", "מראה ואפקטים")],
        ["title", w("لقب", "Title", "תואר")],
        ["pet", w("حيوان أليف شكلي", "A pet (looks)", "חיית מחמד (מראה)")],
        ["other", w("غير شي", "Something else", "משהו אחר")],
      ],
      rows: [
        { slug: "star-rank", title: w("رتبة نجمة", "Star rank", "דרגת כוכב"), kind: "rank", price: 20, text: w("اسم ملوّن ولقب «نجمة» بالشات.", "A coloured name and the «Star» title in chat.", "שם צבעוני והתואר «כוכב» בצ'אט."), advantage: false, command: "lp user {player} parent add star" },
        { slug: "particles", title: w("تأثيرات حواليك", "Trail effects", "אפקטים סביבכם"), kind: "cosmetic", price: 15, text: w("نجوم وقلوب وثلج حواليك وإنت ماشي.", "Stars, hearts and snow around you as you walk.", "כוכבים, לבבות ושלג סביבכם כשאתם הולכים."), advantage: false, command: "lp user {player} permission set trails.use" },
        { slug: "builder-title", title: w("لقب البنّاء", "The builder title", "התואר בנאי"), kind: "title", price: 8, text: w("لقب «البنّاء» جنب اسمك.", "The «Builder» title beside your name.", "התואר «בנאי» ליד השם."), advantage: false, command: "lp user {player} permission set tags.builder" },
        { slug: "fox-pet", title: w("ثعلب صغير", "A little fox", "שועל קטן"), kind: "pet", price: 12, text: w("بيمشي معك وبس: ما بيقاتل ولا بيجمع.", "It walks with you, that's all: it neither fights nor gathers.", "הולך איתכם וזהו: לא נלחם ולא אוסף."), advantage: false, command: "lp user {player} permission set pets.fox" },
        // An advantage in the game: never shown or sold (Mojang's rules); the panel lists it held back, to show the gate.
        { slug: "diamond-kit", title: w("عدّة الماس", "Diamond kit", "ערכת יהלומים"), kind: "other", price: 30, text: w("سيف ودرع ماس من أول يوم.", "A diamond sword and armour from day one.", "חרב ושריון יהלום מהיום הראשון."), advantage: true, command: "give {player} diamond_sword" },
      ],
    },
    news: {
      title: w("الأخبار", "News", "חדשות"),
      sub: w("مواسم وفعاليات وتحديثات.", "Seasons, events and updates.", "עונות, אירועים ועדכונים."),
      rows: [
        { slug: "season-3", date: "2026-11-15", title: w("الموسم 3 بلّش", "Season 3 has begun", "עונה 3 התחילה"), text: w("عالم جديد وحدود أوسع.", "A new world and wider borders.", "עולם חדש וגבולות רחבים יותר."), body: w("الموسم 3 فتح بعالم جديد وحدود 10,000 بلوكة. العالم القديم صار للزيارة بس.", "Season 3 opened with a new world and a 10,000-block border. The old world is now for visits only.", "עונה 3 נפתחה בעולם חדש עם גבול של 10,000 בלוקים. העולם הישן לביקור בלבד.") },
        { slug: "friday-build", date: "2026-11-10", title: w("مسابقة بناء الجمعة", "Friday's build contest", "תחרות הבנייה של שישי"), text: w("الموضوع: بيت بالشجر.", "The theme: a treehouse.", "הנושא: בית על העץ."), body: w("الجمعة الساعة 8 المسا. الأحلى بيوصله لقب «المهندس» بلاش.", "Friday at 8 pm. The best one gets the «Architect» title, free.", "שישי ב־20:00. הטוב ביותר מקבל את התואר «אדריכל» בחינם.") },
        { slug: "update-1-21", date: "2026-11-01", title: w("صرنا على 1.21", "We're on 1.21", "עברנו ל־1.21"), text: w("السيرفر انتقل لنسخة 1.21.", "The server moved to version 1.21.", "השרת עבר לגרסה 1.21."), body: w("فوتوا بنسخة 1.21 من ماينكرافت Java.", "Join with Minecraft Java 1.21.", "היכנסו עם מיינקראפט Java 1.21.") },
      ],
    },
    questions: { rows: [
      { q: w("لازم حساب أصلي؟", "Do I need a genuine account?", "צריך חשבון מקורי?"), a: w("أيوا، السيرفر للحسابات الأصلية بس.", "Yes, the server is for genuine accounts only.", "כן, השרת לחשבונות מקוריים בלבד.") },
      { q: w("في Bedrock؟", "Is there Bedrock?", "יש Bedrock?"), a: w("لسّا لأ، Java بس.", "Not yet, Java only.", "עדיין לא, רק Java.") },
      { q: w("شو بيبيع المتجر؟", "What does the store sell?", "מה החנות מוכרת?"), a: w("أشكال وألقاب وتأثيرات بس. ولا شي بيخلّيك أقوى من غيرك.", "Looks, titles and effects only. Nothing makes you stronger than anyone.", "מראות, תארים ואפקטים בלבד. שום דבר לא הופך אתכם לחזקים יותר.") },
      { q: w("انبنّدت، شو بعمل؟", "I was banned, what do I do?", "קיבלתי באן, מה עושים?"), a: w("قدّم استئناف من صفحة «الاستئناف والبلاغ» برقم الباند.", "Appeal it on the appeals and reports page with the ban's number.", "הגישו ערעור בעמוד הערעורים והדיווחים עם מספר הבאן.") },
    ] },
    appeals: {
      title: w("الاستئناف والبلاغ", "Appeals and reports", "ערעורים ודיווחים"),
      sub: w("انبنّدت وشايف إنه غلط، أو شفت حدا عم يخرّب؟ من هون.", "Banned and think it was wrong, or saw someone griefing? Here.", "קיבלתם באן וחושבים שזו טעות, או ראיתם מישהו הורס? כאן."),
      reasons: [
        ["cheating", w("غش (X-ray، طيران…)", "Cheating (X-ray, flying…)", "רמאות (X-ray, תעופה…)")],
        ["grief", w("تخريب أو سرقة", "Griefing or stealing", "הרס או גניבה")],
        ["toxic", w("شتائم أو تحرّش", "Insults or harassment", "קללות או הטרדה")],
        ["other", w("شي تاني", "Something else", "משהו אחר")],
      ],
    },
    contact: {},
    notify: {},
  },
});

/**
 * A Rust server (wave G6b): its live status (Steam's A2S; the console's connect command to copy), its wipes (the first
 * Thursday of each month, Rust's forced wipe, with what each takes), rules, streamers, news, questions, appeals and
 * reports, messages. No store: Rust's own rules on selling aren't in the gate yet (docs/sites-300-plan.ar.md).
 */
export const RUST_WIPE = site({
  key: "site-rust-wipe",
  version: "1.1.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("سيرفر Rust: جزيرة الرماد", "Rust server: Ash Island", "שרת Rust: אי האפר"),
  note: w("موقع سيرفر Rust كامل: الحالة الحيّة وأمر الدخول للنسخ، عدّاد المسح الجاي وشو بينمسح، القوانين، الستريمرز ومين لايف، الأخبار، الاستئناف والبلاغ، ورسائل.", "A whole Rust server site: the live status and the connect command to copy, the next wipe's countdown and what it takes, rules, the streamers and who is live, news, appeals and reports, and messages.", "אתר שלם לשרת Rust: המצב החי ופקודת החיבור להעתקה, ספירה למחיקה הבאה ומה נמחק, חוקים, הסטרימרים ומי בשידור, חדשות, ערעורים ודיווחים והודעות."),
  biz: { name: w("جزيرة الرماد", "Ash Island", "אי האפר"), address: w("أونلاين", "Online", "אונליין"), hours: w("السيرفر شغّال 24/7", "The server runs 24/7", "השרת פועל 24/7"), phone: "0", email: "team@ashisland.example", city: "" },
  pack: {
    label: w("جزيرة الرماد", "Ash Island", "אי האפר"),
    eyebrow: w("سيرفر Rust، فانيلا ×2", "A Rust server, vanilla ×2", "שרת Rust, וניל ×2"),
    title: w("ابنِ، دافع، وابدأ من جديد كل شهر", "Build, defend, and start over every month", "לבנות, להגן ולהתחיל מחדש כל חודש"),
    sub: w("جمع ×2، فرق لحد 4، ومسح كبير أول خميس بالشهر.", "×2 gather, teams of up to 4, and a full wipe on the first Thursday of the month.", "איסוף ×2, קבוצות של עד 4 ומחיקה מלאה ביום חמישי הראשון בחודש."),
    cta: w("انسخ أمر الدخول", "Copy the connect command", "להעתיק את פקודת החיבור"),
    product: w("الجزيرة", "The island", "האי"),
    story: w("عملنا الجزيرة لناس بدها Rust نضيف: إدارة صاحية، بلا غش، وبداية جديدة كل شهر.", "We made the island for people who want clean Rust: awake admins, no cheating, and a fresh start every month.", "יצרנו את האי לאנשים שרוצים Rust נקי: מנהלים ערניים, בלי רמאות והתחלה חדשה כל חודש."),
    collection: w("آخر الأخبار", "Latest news", "החדשות האחרונות"),
    icon: "star",
  },
  home: "/island",
  modules: {
    status: {
      game: "steam",
      address: "play.ashisland.example:28015",
      discord: "https://discord.gg/ashisland",
      join: w("فوت هلّق", "Join now", "להתחבר עכשיו"),
      steps: [
        [w("افتح Rust", "Open Rust", "לפתוח את Rust"), w("من Steam، على نفس نسخة السيرفر.", "From Steam, on the server's version.", "מ-Steam, באותה גרסה כמו השרת.")],
        [w("افتح الكونسول بـ F1", "Open the console with F1", "לפתוח את הקונסול עם F1"), w("والصق: client.connect play.ashisland.example:28015", "And paste: client.connect play.ashisland.example:28015", "ולהדביק: client.connect play.ashisland.example:28015")],
        [w("اقرأ القوانين", "Read the rules", "לקרוא את החוקים"), w("فرق لحد 4، بلا غش ولا شتائم.", "Teams of up to 4, no cheating and no insults.", "קבוצות של עד 4, בלי רמאות ובלי קללות.")],
      ],
    },
    wipe: {
      title: w("مواعيد المسح", "Wipe days", "מועדי המחיקה"),
      sub: w("إمتى الجزيرة بتبلّش من جديد، وشو بيروح معها.", "When the island starts over, and what goes with it.", "מתי האי מתחיל מחדש, ומה הולך איתו."),
      line: w("المسح الكبير أول خميس بكل شهر، مع تحديث Rust الشهري.", "The full wipe is the first Thursday of each month, with Rust's monthly update.", "המחיקה המלאה ביום חמישי הראשון בכל חודש, עם העדכון החודשי של Rust."),
      every: "monthly",
      day: "thu",
      time: "19:00",
      zone: "london",
      note: w("السيرفر بيرجع خلال ربع ساعة من المسح، والخريطة الجديدة بتنزل بالديسكورد قبلها بساعة.", "The server is back within a quarter of an hour of the wipe, and the new map goes up on Discord an hour before.", "השרת חוזר תוך רבע שעה מהמחיקה, והמפה החדשה עולה בדיסקורד שעה לפני."),
      what: [
        [w("الخريطة", "The map", "המפה"), w("جزيرة جديدة كل مسح: كل البيوت والصناديق بتروح.", "A new island each wipe: every base and box goes.", "אי חדש בכל מחיקה: כל הבסיסים והתיבות הולכים.")],
        [w("البلوبرنت", "Blueprints", "שרטוטים"), w("بتنمسح مع المسح الكبير كل شهر.", "They go with the full wipe each month.", "נמחקים עם המחיקה המלאה כל חודש.")],
        [w("اللي بيضل", "What stays", "מה נשאר"), w("حسابك بالموقع ورتبتك بالديسكورد.", "Your account on the site and your Discord role.", "החשבון שלכם באתר והתפקיד בדיסקורד.")],
      ],
    },
    rules: {
      title: w("القوانين", "The rules", "החוקים"),
      sub: w("الجزيرة قاسية، بس اللعب نضيف. اقراها قبل أول ليلة.", "The island is harsh, but the game is clean. Read them before your first night.", "האי קשוח, אבל המשחק נקי. קראו לפני הלילה הראשון."),
      changed: w("آخر تعديل 22 تشرين التاني: صارت الفرق لحد 4.", "Last changed on 22 November: teams are now up to 4.", "שינוי אחרון ב־22 בנובמבר: קבוצות עכשיו עד 4."),
      date: "2026-11-22",
      sections: [
        { key: "general", name: w("عام", "General", "כללי"), rows: [
          { n: "1.1", title: w("بلا غش", "No cheating", "בלי רמאות"), text: w("لا aimbot ولا ESP ولا ماكرو. الباند دائم من أول مرّة.", "No aimbot, no ESP, no macros. The ban is for good, the first time.", "בלי aimbot, בלי ESP, בלי מאקרו. הבאן לתמיד, מהפעם הראשונה.") },
          { n: "1.2", title: w("احترم الكل", "Respect everyone", "כבוד לכולם"), text: w("ما في عنصرية ولا شتائم بالشات أو بالصوت.", "No racism or insults, in chat or on voice.", "בלי גזענות או קללות, בצ'אט או בקול.") },
          { n: "1.3", title: w("حساب واحد", "One account", "חשבון אחד"), text: w("كل لاعب بحساب Steam واحد.", "Each player plays on one Steam account.", "כל שחקן משחק בחשבון Steam אחד.") },
        ] },
        { key: "teams", name: w("الفرق", "Teams", "קבוצות"), rows: [
          { n: "2.1", title: w("لحد 4", "Up to 4", "עד 4"), text: w("الفرقة 4 بالأكتر، وما في تحالفات بين الفرق.", "A team is 4 at most, and no alliances between teams.", "קבוצה של 4 לכל היותר, ובלי בריתות בין קבוצות.") },
          { n: "2.2", title: w("بلا تبديل", "No swapping", "בלי החלפות"), text: w("ما بتبدّل حدا من فرقتك بنص المسح.", "Don't swap anyone in your team in the middle of a wipe.", "לא מחליפים אף אחד בקבוצה באמצע מחיקה.") },
        ] },
        { key: "building", name: w("البناء", "Building", "בנייה"), rows: [
          { n: "3.1", title: w("بلا سدّ المعالم", "Don't block monuments", "לא לחסום אתרים"), text: w("ما بتبني على طريق المعالم ولا بتسكّر مداخلها.", "Don't build in a monument's way or close its doors.", "לא בונים בדרך לאתרים ולא סוגרים את הכניסות.") },
          { n: "3.2", title: w("بلا حيطان بالبحر", "No walls in the sea", "בלי חומות בים"), text: w("الحيطان الطويلة بالمي بتعمل لاغ للكل.", "Long walls in the water lag everyone.", "חומות ארוכות במים יוצרות לאג לכולם.") },
        ] },
      ],
    },
    streamers: {
      title: w("الستريمرز", "Streamers", "סטרימרים"),
      sub: w("مين بيبث الجزيرة. اللي لايف هلّق أول.", "Who streams the island. Those live now come first.", "מי משדר את האי. מי שבשידור עכשיו ראשון."),
      rows: [
        { slug: "abu-sakhr", name: w("أبو صخر", "Abu Sakhr", "אבו סח'ר"), twitch: "", about: w("بيبث أول ليلة بعد كل مسح، من الصفر.", "Streams the first night after every wipe, from nothing.", "משדר את הלילה הראשון אחרי כל מחיקה, מאפס.") },
        { slug: "layla-builds", name: w("ليلى بتبني", "Layla builds", "ליילה בונה"), twitch: "", about: w("بيوت ما بتنكسر، وكيف بتبنيها.", "Bases that don't break, and how to build them.", "בסיסים שלא נשברים, ואיך לבנות אותם.") },
        { slug: "rami-raids", name: w("رامي والغارات", "Rami raids", "ראמי פושט"), twitch: "", about: w("غارات بالليل، بالقوانين.", "Raids at night, by the rules.", "פשיטות בלילה, לפי החוקים.") },
      ],
    },
    news: {
      title: w("الأخبار", "News", "חדשות"),
      sub: w("المسح والتحديثات والفعاليات.", "Wipes, updates and events.", "מחיקות, עדכונים ואירועים."),
      rows: [
        { slug: "december-wipe", date: "2026-11-20", title: w("مسح كانون الأول: خريطة جديدة", "December's wipe: a new map", "המחיקה של דצמבר: מפה חדשה"), text: w("جزيرة أكبر بمعالم أكتر.", "A bigger island with more monuments.", "אי גדול יותר עם יותר אתרים."), body: w("أول خميس بكانون الأول بننزل خريطة أكبر بـ 4,500، مع معلمين جداد عالشط.", "On December's first Thursday we put up a bigger 4,500 map, with two new monuments on the coast.", "ביום חמישי הראשון של דצמבר נעלה מפה גדולה יותר בגודל 4,500, עם שני אתרים חדשים על החוף.") },
        { slug: "teams-of-four", date: "2026-11-22", title: w("الفرق صارت لحد 4", "Teams are now up to 4", "הקבוצות עכשיו עד 4"), text: w("بدل 3، من المسح الجاي.", "Instead of 3, from the next wipe.", "במקום 3, מהמחיקה הבאה."), body: w("سمعناكم: من المسح الجاي الفرقة بتكون لحد 4 لاعبين.", "We heard you: from the next wipe a team can be up to 4 players.", "שמענו אתכם: מהמחיקה הבאה קבוצה יכולה להיות עד 4 שחקנים.") },
        { slug: "airdrop-friday", date: "2026-11-14", title: w("فعالية الطيارة الجمعة", "The airdrop event on Friday", "אירוע ההצנחה ביום שישי"), text: w("3 طيارات بنص الخريطة.", "Three drops in the middle of the map.", "שלוש הצנחות במרכז המפה."), body: w("الجمعة الساعة 9 المسا، 3 طيارات ورا بعض بنص الخريطة. خليكم مستعدّين.", "Friday at 9 pm, three drops one after the other in the middle of the map. Be ready.", "שישי ב־21:00, שלוש הצנחות ברצף במרכז המפה. היו מוכנים.") },
      ],
    },
    questions: { rows: [
      { q: w("إمتى المسح؟", "When is the wipe?", "מתי המחיקה?"), a: w("أول خميس بكل شهر الساعة 7 المسا بتوقيت لندن. العدّاد بالصفحة الأولى.", "The first Thursday of each month at 7 pm London time. The countdown is on the first page.", "ביום חמישי הראשון בכל חודש ב־19:00 לפי שעון לונדון. הספירה בעמוד הראשון.") },
      { q: w("كم واحد بالفرقة؟", "How many in a team?", "כמה בקבוצה?"), a: w("4 بالأكتر.", "4 at most.", "4 לכל היותר.") },
      { q: w("في متجر؟", "Is there a store?", "יש חנות?"), a: w("لسّا لأ. ولما يصير، ولا شي فيه رح يعطي أفضلية باللعب.", "Not yet. And when there is, nothing in it will give an advantage in the game.", "עדיין לא. וכשתהיה, שום דבר בה לא ייתן יתרון במשחק.") },
      { q: w("انبنّدت، شو بعمل؟", "I was banned, what do I do?", "קיבלתי באן, מה עושים?"), a: w("قدّم استئناف من صفحة «الاستئناف والبلاغ» برقم الباند.", "Appeal it on the appeals and reports page with the ban's number.", "הגישו ערעור בעמוד הערעורים והדיווחים עם מספר הבאן.") },
    ] },
    appeals: {
      title: w("الاستئناف والبلاغ", "Appeals and reports", "ערעורים ודיווחים"),
      sub: w("انبنّدت وشايف إنه غلط، أو شفت حدا عم يغش؟ من هون.", "Banned and think it was wrong, or saw someone cheating? Here.", "קיבלתם באן וחושבים שזו טעות, או ראיתם מישהו מרמה? כאן."),
      reasons: [
        ["cheating", w("غش (aimbot، ESP…)", "Cheating (aimbot, ESP…)", "רמאות (aimbot, ESP…)")],
        ["teaming", w("فرقة أكبر من 4", "A team bigger than 4", "קבוצה גדולה מ־4")],
        ["toxic", w("شتائم أو عنصرية", "Insults or racism", "קללות או גזענות")],
        ["other", w("شي تاني", "Something else", "משהו אחר")],
      ],
    },
    contact: {},
    notify: {},
  },
});
