/** Whole sites for game servers (wave G of docs/sites-300-plan.ar.md): a FiveM roleplay city first. */
import { w } from "../words";
import { site } from "./blueprint";

export const FIVEM_RP = site({
  key: "site-fivem-rp",
  version: "1.0.0",
  field: "games",
  archetype: "server",
  fam: "gaming",
  pics: "gaming",
  look: 0,
  name: w("سيرفر رول بلاي FiveM: مدينة الندى", "FiveM roleplay server: Dew City", "שרת רולפליי FiveM: עיר הטל"),
  note: w("موقع سيرفر FiveM كامل: حالة السيرفر الحيّة وعدد اللاعبين، «فوت هلّق»، الديسكورد، التحديثات، الطاقم، أسئلة ورسائل.", "A whole FiveM server site: the server's live status and players, «join now», Discord, updates, staff, questions and messages.", "אתר שרת FiveM שלם: מצב השרת החי והשחקנים, «להתחבר עכשיו», דיסקורד, עדכונים, צוות, שאלות והודעות."),
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
      { q: w("لازم أقدّم قبل ما أفوت؟", "Do I have to apply before joining?", "צריך להגיש בקשה לפני שמתחברים?"), a: w("لأ، السيرفر مفتوح. التقديم بس للوظائف متل الشرطة والإسعاف.", "No, the server is open. Applying is only for jobs like police and paramedics.", "לא, השרת פתוח. הגשה רק לעבודות כמו משטרה ופרמדיקים.") },
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
        { slug: "jobs-open", date: "2026-11-01", title: w("فتحنا التقديم للشرطة", "Police applications are open", "ההגשות למשטרה נפתחו"), text: w("عشر أماكن جديدة.", "Ten new places.", "עשרה מקומות חדשים."), body: w("قدّم من الديسكورد، والمقابلات الأسبوع الجاي.", "Apply on Discord; interviews next week.", "הגישו בדיסקורד; הראיונות בשבוע הבא.") },
      ],
    },
    contact: {},
    notify: {},
  },
});
