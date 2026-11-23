/** Whole sites for game servers (wave G of docs/sites-300-plan.ar.md): a FiveM roleplay city first. */
import { w } from "../words";
import { site } from "./blueprint";

export const FIVEM_RP = site({
  key: "site-fivem-rp",
  version: "1.1.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("سيرفر رول بلاي FiveM: مدينة الندى", "FiveM roleplay server: Dew City", "שרת רולפליי FiveM: עיר הטל"),
  note: w("موقع سيرفر FiveM كامل: حالة السيرفر الحيّة وعدد اللاعبين، «فوت هلّق»، الديسكورد، التحديثات، القوانين، التقديم على الوظائف بتصويت الطاقم، الطاقم، أسئلة ورسائل.", "A whole FiveM server site: the server's live status and players, «join now», Discord, updates, the rules, applying for jobs with the staff's votes, staff, questions and messages.", "אתר שרת FiveM שלם: מצב השרת החי והשחקנים, «להתחבר עכשיו», דיסקורד, עדכונים, חוקים, הגשה לעבודות בהצבעת הצוות, צוות, שאלות והודעות."),
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
      { q: w("انبنّدت، شو بعمل؟", "I was banned, what do I do?", "קיבלתי באן, מה עושים?"), a: w("ابعتلنا رسالة من صفحة التواصل مع اسمك باللعبة، ومنرد خلال يومين.", "Send us a message from the contact page with your in-game name; we reply within two days.", "שלחו לנו הודעה מעמוד יצירת הקשר עם השם שלכם במשחק; נענה תוך יומיים.") },
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
    contact: {},
    notify: {},
  },
});
