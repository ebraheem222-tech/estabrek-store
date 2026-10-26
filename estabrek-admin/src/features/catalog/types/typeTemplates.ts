// Ready-made kinds of products (like a big marketplace's categories), each with
// its own fields and buying choices. Picking one opens the type editor filled in;
// nothing is saved until the owner presses حفظ. Pure data (tested).
import type { TypeField } from "../../../api/productTypes.api";

export type TemplateGroup = "fashion" | "electronics" | "beauty" | "home" | "kids" | "hobbies" | "digital" | "booking";

export const TEMPLATE_GROUPS: Array<{ id: TemplateGroup; label: string }> = [
  { id: "fashion", label: "أزياء" },
  { id: "electronics", label: "إلكترونيات" },
  { id: "beauty", label: "جمال وعناية" },
  { id: "home", label: "بيت ومطبخ" },
  { id: "kids", label: "أطفال" },
  { id: "hobbies", label: "هوايات وغيرها" },
  { id: "digital", label: "رقمي وأكواد" },
  { id: "booking", label: "حجوزات" },
];

export type TypeTemplate = {
  id: string;
  group: TemplateGroup;
  icon: string;
  name: string;
  hint: string;
  /** Shown on the quick row at the top of the page. */
  quick?: boolean;
  type: {
    name: string;
    description?: string;
    colorLabel: string;
    sizeLabel: string;
    showColor: boolean;
    showSize: boolean;
    fulfillment: "SHIPPING" | "DIGITAL" | "BOOKING";
    fields: TypeField[];
  };
};

const sel = (key: string, label: string, options: string[], extra: Partial<TypeField> = {}): TypeField => ({ key, label, kind: "select", options, showOnPage: true, filterable: true, ...extra });
const multi = (key: string, label: string, options: string[], extra: Partial<TypeField> = {}): TypeField => ({ key, label, kind: "multiselect", options, showOnPage: true, filterable: true, ...extra });
const text = (key: string, label: string, extra: Partial<TypeField> = {}): TypeField => ({ key, label, kind: "text", showOnPage: true, ...extra });
const long = (key: string, label: string, extra: Partial<TypeField> = {}): TypeField => ({ key, label, kind: "longtext", showOnPage: true, ...extra });
const num = (key: string, label: string, unit?: string, extra: Partial<TypeField> = {}): TypeField => ({ key, label, kind: "number", showOnPage: true, ...(unit ? { unit } : {}), ...extra });
const yes = (key: string, label: string, extra: Partial<TypeField> = {}): TypeField => ({ key, label, kind: "boolean", showOnPage: true, filterable: true, ...extra });
const link = (key: string, label: string, extra: Partial<TypeField> = {}): TypeField => ({ key, label, kind: "url", showOnPage: false, ...extra });
const date = (key: string, label: string, extra: Partial<TypeField> = {}): TypeField => ({ key, label, kind: "date", showOnPage: true, ...extra });

const shipped = { colorLabel: "اللون", sizeLabel: "المقاس", showColor: true, showSize: true, fulfillment: "SHIPPING" as const };
const WARRANTY = ["بدون", "3 شهور", "6 شهور", "سنة", "سنتين"];

export const TYPE_TEMPLATES: TypeTemplate[] = [
  /* ---------------- Fashion ---------------- */
  {
    id: "clothes",
    group: "fashion",
    icon: "👗",
    name: "ملابس",
    hint: "القماش، القصّة، الغسيل",
    type: {
      ...shipped,
      name: "ملابس",
      fields: [
        sel("fabric", "القماش", ["قطن", "كريب", "شيفون", "حرير", "جينز", "صوف", "لينن", "بوليستر"]),
        sel("fit", "القصّة", ["ضيّق", "عادي", "واسع"]),
        multi("occasion", "المناسبة", ["يومي", "شغل", "سهرة", "أعراس", "رياضة"]),
        num("length_cm", "الطول", "سم", { filterable: false }),
        long("care", "طريقة الغسيل", { help: "مثلاً: غسيل يدوي بمي باردة" }),
      ],
    },
  },
  {
    id: "shoes",
    group: "fashion",
    icon: "👟",
    name: "أحذية",
    hint: "النمرة، الخامة، الكعب",
    type: {
      ...shipped,
      name: "أحذية",
      sizeLabel: "النمرة",
      fields: [
        sel("material", "الخامة", ["جلد طبيعي", "جلد صناعي", "قماش", "شمواه", "مطاط"]),
        sel("heel", "الكعب", ["فلات", "واطي", "متوسط", "عالي"]),
        sel("fits", "المقاس", ["مزبوط", "صغير شوي — خدي نمرة أكبر", "كبير شوي — خدي نمرة أصغر"], { filterable: false }),
        multi("use", "للاستعمال", ["يومي", "رياضة", "سهرة", "شغل"]),
      ],
    },
  },
  {
    id: "bags",
    group: "fashion",
    icon: "👜",
    name: "شنط وإكسسوارات",
    hint: "الخامة، الأبعاد، السكّر",
    type: {
      ...shipped,
      name: "شنط وإكسسوارات",
      showSize: false,
      fields: [
        sel("material", "الخامة", ["جلد طبيعي", "جلد صناعي", "قماش", "قش", "مخمل"]),
        text("dimensions", "الأبعاد", { help: "مثلاً: 30 × 20 × 10 سم" }),
        sel("closure", "السكّر", ["سحّاب", "مغناطيس", "كبسة", "مفتوحة"], { filterable: false }),
        yes("strap", "فيها حزام كتف"),
      ],
    },
  },
  {
    id: "jewellery",
    group: "fashion",
    icon: "💍",
    name: "مجوهرات وساعات",
    hint: "المعدن، العيار، الحجر",
    type: {
      ...shipped,
      name: "مجوهرات وساعات",
      colorLabel: "اللون",
      sizeLabel: "المقاس",
      fields: [
        sel("metal", "المعدن", ["ذهب", "فضة", "ستانلس ستيل", "مطلي ذهب", "نحاس"]),
        sel("karat", "العيار", ["9", "14", "18", "21", "24", "925"], { filterable: false }),
        text("stone", "الحجر", { help: "مثلاً: زركون، لؤلؤ" }),
        num("weight_g", "الوزن", "غرام", { filterable: false }),
        yes("hypoallergenic", "ما بتعمل حساسية"),
      ],
    },
  },

  /* ---------------- Electronics ---------------- */
  {
    id: "phones",
    group: "electronics",
    icon: "📱",
    name: "موبايلات",
    hint: "الماركة، السعة، الضمان",
    quick: true,
    type: {
      ...shipped,
      name: "موبايلات",
      sizeLabel: "السعة",
      fields: [
        sel("brand", "الماركة", ["Apple", "Samsung", "Xiaomi", "Huawei", "Oppo", "Realme", "Google", "Nokia"]),
        sel("ram", "الرام", ["4GB", "6GB", "8GB", "12GB", "16GB"]),
        num("screen_in", "الشاشة", "إنش", { filterable: false }),
        num("battery_mah", "البطارية", "mAh", { filterable: false }),
        sel("sim", "الشريحة", ["شريحة وحدة", "شريحتين", "eSIM"]),
        sel("condition", "الحالة", ["جديد", "مستعمل كالجديد", "مستعمل", "مجدّد"]),
        sel("warranty", "الضمان", WARRANTY, { filterable: false }),
      ],
    },
  },
  {
    id: "laptops",
    group: "electronics",
    icon: "💻",
    name: "لابتوبات وكمبيوترات",
    hint: "المعالج، الرام، التخزين",
    type: {
      ...shipped,
      name: "لابتوبات",
      sizeLabel: "المواصفات",
      fields: [
        sel("brand", "الماركة", ["Apple", "Lenovo", "HP", "Dell", "Asus", "Acer", "MSI", "Microsoft"]),
        text("cpu", "المعالج", { help: "مثلاً: Intel i7-13700H" }),
        sel("ram", "الرام", ["8GB", "16GB", "32GB", "64GB"]),
        sel("storage", "التخزين", ["256GB SSD", "512GB SSD", "1TB SSD", "2TB SSD"]),
        text("gpu", "كرت الشاشة", { required: false }),
        num("screen_in", "الشاشة", "إنش", { filterable: false }),
        sel("os", "نظام التشغيل", ["Windows", "macOS", "Linux", "بدون"]),
        sel("warranty", "الضمان", WARRANTY, { filterable: false }),
      ],
    },
  },
  {
    id: "audio",
    group: "electronics",
    icon: "🎧",
    name: "سماعات وصوتيات",
    hint: "لاسلكي، عزل الصوت، البطارية",
    type: {
      ...shipped,
      name: "سماعات",
      showSize: false,
      fields: [
        sel("brand", "الماركة", ["Apple", "Samsung", "Sony", "JBL", "Anker", "Bose", "Xiaomi"]),
        sel("style", "الشكل", ["داخل الأذن", "فوق الأذن", "سبيكر"]),
        yes("wireless", "لاسلكية"),
        yes("anc", "عزل ضجيج"),
        num("battery_h", "البطارية", "ساعة", { filterable: false }),
      ],
    },
  },
  {
    id: "wearables",
    group: "electronics",
    icon: "⌚",
    name: "ساعات ذكية",
    hint: "التوافق، المقاس، مقاومة المي",
    type: {
      ...shipped,
      name: "ساعات ذكية",
      sizeLabel: "حجم الشاشة",
      fields: [
        sel("brand", "الماركة", ["Apple", "Samsung", "Huawei", "Xiaomi", "Garmin", "Amazfit"]),
        multi("works_with", "بتشتغل مع", ["iPhone", "Android"]),
        yes("water", "مقاومة للمي"),
        yes("sim", "فيها شريحة"),
        num("battery_days", "البطارية", "يوم", { filterable: false }),
      ],
    },
  },
  {
    id: "accessories",
    group: "electronics",
    icon: "🔌",
    name: "إكسسوارات إلكترونية",
    hint: "كفرات، شواحن، كوابل",
    type: {
      ...shipped,
      name: "إكسسوارات إلكترونية",
      sizeLabel: "الموديل",
      fields: [
        sel("kind", "النوع", ["كفر", "حماية شاشة", "شاحن", "كابل", "باور بانك", "حامل"]),
        text("compatible", "متوافق مع", { help: "مثلاً: iPhone 15 Pro" }),
        num("watts", "القوة", "واط", { filterable: false }),
      ],
    },
  },

  /* ---------------- Beauty ---------------- */
  {
    id: "perfume",
    group: "beauty",
    icon: "🌸",
    name: "عطور",
    hint: "الحجم، التركيز، الروائح",
    quick: true,
    type: {
      ...shipped,
      name: "عطور",
      showColor: false,
      sizeLabel: "الحجم",
      fields: [
        sel("for", "لمين", ["نسائي", "رجالي", "للجنسين"]),
        sel("concentration", "التركيز", ["Parfum", "Eau de Parfum", "Eau de Toilette", "Eau de Cologne", "زيت عطري"]),
        multi("family", "عائلة الرائحة", ["زهري", "فواكه", "خشبي", "شرقي/عود", "منعش", "فانيلا/حلو"]),
        long("notes", "النوتات", { help: "مثلاً: البداية برغموت، القلب ياسمين، القاعدة مسك" }),
        sel("authentic", "الأصل", ["أصلي", "تستر أصلي", "مستوحى"], { filterable: false }),
      ],
    },
  },
  {
    id: "cosmetics",
    group: "beauty",
    icon: "💄",
    name: "مكياج وعناية",
    hint: "نوع البشرة، الحجم، المكونات",
    type: {
      ...shipped,
      name: "مكياج وعناية",
      colorLabel: "اللون/الدرجة",
      sizeLabel: "الحجم",
      fields: [
        multi("skin", "نوع البشرة", ["دهنية", "جافة", "مختلطة", "حساسة", "كل الأنواع"]),
        sel("finish", "اللمسة", ["مط", "لامع", "طبيعي", "ساتان"]),
        long("ingredients", "المكونات", { showOnPage: true }),
        long("how_to_use", "طريقة الاستعمال"),
        date("expiry", "تاريخ الانتهاء", { showOnPage: false }),
        yes("cruelty_free", "مش مجرّب على حيوانات"),
      ],
    },
  },

  /* ---------------- Home ---------------- */
  {
    id: "furniture",
    group: "home",
    icon: "🛋️",
    name: "أثاث",
    hint: "الأبعاد، الخامة، التركيب",
    type: {
      ...shipped,
      name: "أثاث",
      colorLabel: "اللون/الخامة",
      fields: [
        text("dimensions", "الأبعاد", { help: "العرض × العمق × الارتفاع (سم)", required: true }),
        sel("material", "الخامة", ["خشب طبيعي", "MDF", "معدن", "قماش", "جلد", "رخام"]),
        sel("room", "للغرفة", ["صالون", "نوم", "سفرة", "مطبخ", "مكتب", "أطفال", "حديقة"]),
        yes("assembly", "بدها تركيب"),
        num("weight_kg", "الوزن", "كغ", { filterable: false }),
      ],
    },
  },
  {
    id: "kitchen",
    group: "home",
    icon: "🍳",
    name: "مطبخ وأدوات بيت",
    hint: "الخامة، السعة، الأجهزة",
    type: {
      ...shipped,
      name: "مطبخ وأدوات",
      sizeLabel: "الحجم",
      fields: [
        sel("material", "الخامة", ["ستانلس ستيل", "سيراميك", "زجاج", "جرانيت", "بلاستيك", "خشب"]),
        num("capacity_l", "السعة", "لتر", { filterable: false }),
        num("watts", "القوة", "واط", { filterable: false }),
        yes("dishwasher", "بينحط بجلاية"),
        sel("warranty", "الضمان", WARRANTY, { filterable: false }),
      ],
    },
  },
  {
    id: "decor",
    group: "home",
    icon: "🖼️",
    name: "ديكور",
    hint: "الأبعاد، الستايل",
    type: {
      ...shipped,
      name: "ديكور",
      fields: [
        text("dimensions", "الأبعاد"),
        multi("style", "الستايل", ["مودرن", "كلاسيك", "بوهو", "ريفي", "مينيمال"]),
        sel("room", "للغرفة", ["صالون", "نوم", "مطبخ", "حمّام", "مدخل"]),
      ],
    },
  },

  /* ---------------- Kids ---------------- */
  {
    id: "toys",
    group: "kids",
    icon: "🧸",
    name: "ألعاب أطفال",
    hint: "العمر، البطاريات، الأمان",
    type: {
      ...shipped,
      name: "ألعاب أطفال",
      showSize: false,
      fields: [
        sel("age", "العمر", ["0–12 شهر", "1–3 سنين", "3–6 سنين", "6–9 سنين", "9–12 سنة", "+12"]),
        sel("kind", "النوع", ["تعليمية", "تركيب", "دمى", "سيارات", "ألغاز", "خارجية"]),
        yes("batteries", "بدها بطاريات"),
        text("safety", "تحذير", { help: "مثلاً: قطع صغيرة — مش لأقل من 3 سنين" }),
      ],
    },
  },
  {
    id: "baby",
    group: "kids",
    icon: "🍼",
    name: "مستلزمات بيبي",
    hint: "العمر، الخامة",
    type: {
      ...shipped,
      name: "مستلزمات بيبي",
      sizeLabel: "العمر/المقاس",
      fields: [
        sel("material", "الخامة", ["قطن عضوي", "قطن", "سيليكون", "بلاستيك BPA-free"]),
        yes("washable", "بينغسل بالغسالة"),
        long("care", "ملاحظات"),
      ],
    },
  },

  /* ---------------- Hobbies & more ---------------- */
  {
    id: "books",
    group: "hobbies",
    icon: "📚",
    name: "كتب",
    hint: "المؤلف، اللغة، الصفحات",
    type: {
      ...shipped,
      name: "كتب",
      showColor: false,
      sizeLabel: "الغلاف",
      fields: [
        text("author", "المؤلف", { required: true }),
        sel("language", "اللغة", ["عربي", "عبري", "إنجليزي", "فرنسي"]),
        sel("genre", "التصنيف", ["رواية", "أطفال", "تطوير ذات", "دين", "تاريخ", "علوم", "طبخ"]),
        num("pages", "عدد الصفحات", undefined, { filterable: false }),
        text("publisher", "دار النشر"),
        text("isbn", "ISBN", { showOnPage: false }),
      ],
    },
  },
  {
    id: "sports",
    group: "hobbies",
    icon: "🏋️",
    name: "رياضة ولياقة",
    hint: "الرياضة، المستوى، الوزن",
    type: {
      ...shipped,
      name: "رياضة",
      fields: [
        sel("sport", "الرياضة", ["جيم", "ركض", "يوغا", "كرة قدم", "سباحة", "دراجات", "تخييم"]),
        sel("level", "المستوى", ["مبتدئ", "متوسط", "محترف"]),
        num("weight_kg", "الوزن", "كغ", { filterable: false }),
        text("material", "الخامة"),
      ],
    },
  },
  {
    id: "auto",
    group: "hobbies",
    icon: "🚗",
    name: "قطع وإكسسوارات سيارات",
    hint: "الماركة، الموديل، السنة",
    type: {
      ...shipped,
      name: "قطع سيارات",
      showColor: false,
      sizeLabel: "الموديل",
      fields: [
        sel("make", "ماركة السيارة", ["تويوتا", "هيونداي", "كيا", "مازدا", "سكودا", "فولكسفاجن", "مرسيدس", "BMW", "كل السيارات"]),
        text("models", "بتركب على", { help: "مثلاً: كورولا 2018–2023" }),
        text("part_no", "رقم القطعة", { showOnPage: true }),
        sel("condition", "الحالة", ["جديد أصلي", "جديد تجاري", "مستعمل"]),
      ],
    },
  },
  {
    id: "pets",
    group: "hobbies",
    icon: "🐾",
    name: "حيوانات أليفة",
    hint: "الحيوان، العمر، الوزن",
    type: {
      ...shipped,
      name: "مستلزمات حيوانات",
      showColor: false,
      sizeLabel: "الحجم/الوزن",
      fields: [
        sel("animal", "للحيوان", ["قطط", "كلاب", "عصافير", "سمك", "أرانب"]),
        sel("age", "العمر", ["صغير", "بالغ", "كبير بالعمر", "كل الأعمار"]),
        long("ingredients", "المكونات"),
      ],
    },
  },
  {
    id: "food",
    group: "hobbies",
    icon: "🍯",
    name: "أكل وبقالة",
    hint: "الوزن، الصلاحية، المكونات",
    type: {
      ...shipped,
      name: "أكل وبقالة",
      showColor: false,
      sizeLabel: "الوزن/الحجم",
      fields: [
        long("ingredients", "المكونات"),
        multi("diet", "مناسب لـ", ["نباتي", "بدون غلوتين", "بدون سكر", "حلال", "كوشير"]),
        text("origin", "بلد المنشأ"),
        text("shelf_life", "الصلاحية", { help: "مثلاً: 6 شهور من الإنتاج" }),
        text("storage", "التخزين", { help: "مثلاً: بمكان بارد وناشف" }),
      ],
    },
  },
  {
    id: "video_games",
    group: "hobbies",
    icon: "🎮",
    name: "ألعاب فيديو (أقراص وأجهزة)",
    hint: "المنصة، العمر، اللغة",
    type: {
      ...shipped,
      name: "ألعاب فيديو",
      colorLabel: "المنصة",
      sizeLabel: "النسخة",
      fields: [
        multi("genre", "النوع", ["أكشن", "مغامرات", "رياضة", "سباق", "ألغاز", "رعب", "عائلية"]),
        sel("pegi", "العمر (PEGI)", ["3+", "7+", "12+", "16+", "18+"]),
        multi("language", "اللغة", ["عربي", "إنجليزي", "عبري"]),
        yes("online", "فيها لعب أونلاين"),
        sel("condition", "الحالة", ["جديد", "مستعمل"]),
      ],
    },
  },

  /* ---------------- Digital & codes ---------------- */
  {
    id: "game_keys",
    group: "digital",
    icon: "🔑",
    name: "أكواد ألعاب وبطاقات هدايا",
    hint: "Steam، PlayStation، iTunes… كود لكل قطعة",
    quick: true,
    type: {
      name: "أكواد وبطاقات هدايا",
      description: "كل قطعة بتاخد كود من القائمة اللي بترفعيها.",
      colorLabel: "البطاقة",
      sizeLabel: "القيمة",
      showColor: true,
      showSize: true,
      fulfillment: "DIGITAL",
      fields: [
        sel("platform", "المنصة", ["Steam", "PlayStation", "Xbox", "Nintendo", "Apple / iTunes", "Google Play", "Netflix", "Spotify", "Roblox", "PUBG UC", "Free Fire"]),
        sel("region", "المنطقة", ["عالمي", "أمريكا", "أوروبا", "الخليج", "تركيا", "إسرائيل"], { help: "الكود بيشتغل بس على حساب من هالمنطقة" }),
        text("currency", "العملة", { help: "مثلاً: USD" }),
        text("expiry_note", "الصلاحية", { help: "مثلاً: بدون انتهاء / لازم تفعّله خلال سنة" }),
      ],
    },
  },
  {
    id: "software",
    group: "digital",
    icon: "🪪",
    name: "تراخيص برامج",
    hint: "Windows، Office، أنتي فايروس… مفتاح لكل قطعة",
    type: {
      name: "تراخيص برامج",
      colorLabel: "البرنامج",
      sizeLabel: "المدة/الأجهزة",
      showColor: false,
      showSize: true,
      fulfillment: "DIGITAL",
      fields: [
        sel("os", "نظام التشغيل", ["Windows", "macOS", "Android", "iOS", "كل الأنظمة"]),
        sel("licence", "نوع الترخيص", ["مدى الحياة", "اشتراك سنة", "اشتراك شهر"]),
        num("devices", "عدد الأجهزة", undefined, { filterable: false }),
        link("download_link", "رابط تنزيل البرنامج"),
      ],
    },
  },
  {
    id: "digital_files",
    group: "digital",
    icon: "⬇️",
    name: "ملفات رقمية",
    hint: "PDF، قوالب، صور، فيديو",
    quick: true,
    type: {
      name: "منتج رقمي",
      colorLabel: "اللون",
      sizeLabel: "النسخة",
      showColor: false,
      showSize: false,
      fulfillment: "DIGITAL",
      fields: [
        sel("file_type", "نوع الملف", ["PDF", "صورة", "فيديو", "قالب Canva", "ملف Excel", "صوت"]),
        num("pages", "عدد الصفحات", undefined, { filterable: false }),
        sel("language", "اللغة", ["عربي", "إنجليزي", "عبري"]),
        text("licence", "الاستعمال", { help: "مثلاً: شخصي بس / تجاري مسموح" }),
      ],
    },
  },

  /* ---------------- Bookings ---------------- */
  {
    id: "course",
    group: "booking",
    icon: "🎓",
    name: "كورس / ورشة",
    hint: "المدة، المستوى، الرابط",
    quick: true,
    type: {
      name: "كورس",
      colorLabel: "اللون",
      sizeLabel: "المقاس",
      showColor: false,
      showSize: false,
      fulfillment: "BOOKING",
      fields: [
        num("hours", "المدة", "ساعة"),
        sel("level", "المستوى", ["مبتدئ", "متوسط", "متقدم"]),
        sel("mode", "الطريقة", ["حضوري", "أونلاين (Zoom)", "مسجّل"]),
        link("course_link", "رابط الكورس"),
      ],
    },
  },
  {
    id: "ticket",
    group: "booking",
    icon: "🎟️",
    name: "تذكرة / حجز",
    hint: "موعد، مقاعد، كود دخول",
    quick: true,
    type: {
      name: "تذكرة",
      colorLabel: "اللون",
      sizeLabel: "الدرجة",
      showColor: false,
      showSize: true,
      fulfillment: "BOOKING",
      fields: [text("from_city", "من"), text("to_city", "إلى"), text("organizer", "المنظّم")],
    },
  },
];

/** The templates matching a search (name, hint, field names) and a group. */
export function findTemplates(q: string, group: TemplateGroup | null = null, list = TYPE_TEMPLATES) {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter((t) => {
    if (group && t.group !== group) return false;
    if (!words.length) return true;
    const hay = [t.name, t.hint, t.type.name, ...t.type.fields.map((f) => f.label), ...t.type.fields.flatMap((f) => f.options ?? [])].join(" ").toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
