// The background jobs' names in plain Arabic (المهام بالخلفية). No imports, so the
// settings history (cacheText.describeField) can name them too.

export const JOB_TEXT: Record<string, { label: string; what: string; link?: { to: string; label: string } }> = {
  outbox: {
    label: "إرسال الرسايل",
    what: "بيبعت الرسايل اللي بالدور (إيميل، واتساب، SMS).",
    link: { to: "/admin/outbox", label: "الرسايل" },
  },
  stockAlerts: {
    label: "إيميلات «رجع للمخزون»",
    what: "بيفحص مين طالب تنبيه لمنتج رجع للمخزون وبيبعتله إيميل. بيشتغل كمان بعد ما تعدّل المخزون بثواني.",
  },
  backup: {
    label: "النسخة الاحتياطية اليومية",
    what: "بيفحص إذا صار وقت النسخة اليومية وبيعملها. «شغّل هلّق» بيفحص بس: لنسخة فورية روح على «النسخ الاحتياطي».",
    link: { to: "/admin/system/backups", label: "النسخ الاحتياطي" },
  },
  requestPhotos: {
    label: "حذف صور الطلبات الخاصة القديمة",
    what: "الصور اللي بعتوها الزباين مع «اطلب منتج» بتنحذف بعد المدة اللي بالإعدادات.",
  },
  popularitySave: {
    label: "حفظ شعبية المنتجات",
    what: "اللي عملوه الزباين (مشاهدة، مفضلة، سلة) بيتجمّع بالذاكرة وبينحفظ بقاعدة البيانات.",
    link: { to: "/admin/system/cache#popular", label: "الشعبية" },
  },
  popularityHot: {
    label: "ترتيب الأكثر طلباً",
    what: "بيرتّب المنتجات الشعبية اللي بتضل بالكاش أطول.",
  },
  popularityLoad: {
    label: "مزامنة الشعبية",
    what: "بيقرا الأرقام من قاعدة البيانات (مهم إذا في أكثر من سيرفر).",
  },
  cacheWarm: {
    label: "تجهيز الصفحات الشعبية",
    what: "بعد أي تعديل بالمنتجات أو مسح الكاش، صفحات المنتجات الشعبية بتنبنى مسبقاً لحتى أول زبون ما يستنى.",
  },
  cacheSweep: {
    label: "تنظيف الكاش",
    what: "بيشيل الأجوبة المنتهية من ذاكرة السيرفر.",
    link: { to: "/admin/system/cache", label: "الكاش" },
  },
  rumSave: {
    label: "حفظ سرعة الزباين",
    what: "تقارير سرعة الصفحات من أجهزة الزباين بتنحفظ كل شوي.",
    link: { to: "/admin/system/speed#shoppers", label: "تجربة الزباين" },
  },
  abSave: {
    label: "حفظ أرقام تجارب A/B",
    what: "الزيارات والإضافات للسلة والطلبات بكل جهة بتنحفظ كل شوي.",
    link: { to: "/admin/discounts/ab", label: "تجارب A/B" },
  },
  campaigns: {
    label: "المواسم",
    what: "بيبلّش المواسم على وقتها (الثيم والأسعار) وبيرجّع كل شي بنهايتها.",
    link: { to: "/admin/discounts/smart#seasons", label: "المواسم" },
  },
  scheduled: {
    label: "التغييرات المجدولة",
    what: "بينفّذ تغييرات الجدول الزمني على وقتها (وبيرجّعها لما يخلص وقتها).",
    link: { to: "/admin/system/schedule", label: "الجدول الزمني" },
  },
  automations: {
    label: "التلقائيات",
    what: "بيفحص المخزون القليل، المنتجات اللي عم تنتشر، التثبيت اللي خلص وقته، والفيديوهات اللي عم تتحوّل. الطلبات والمهام الفاشلة بتوصل لحالها.",
    link: { to: "/admin/system/automations", label: "التلقائيات" },
  },
  videoConvert: {
    label: "تحويل الفيديوهات",
    what: "تحويل فيديو لجودات البث أو أخذ صورة منه على السيرفر، واحد ورا التاني (بيستعمل كل المعالج).",
    link: { to: "/admin/media/videos", label: "الفيديوهات" },
  },
};

export const jobLabel = (name: string) => JOB_TEXT[name]?.label ?? name;

/** "jobs.backup.paused" → "النسخة الاحتياطية اليومية: موقّفة". */
export function describeJobField(path: string): string | null {
  const [root, name, field] = path.split(".");
  if (root !== "jobs" || !name) return null;
  const what = field === "paused" ? "إيقاف" : field === "everyMs" ? "الوقت بين كل مرة" : field;
  return field ? `${jobLabel(name)}: ${what}` : jobLabel(name);
}
