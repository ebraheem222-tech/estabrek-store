/**
 * The store's assistant, as a personality the owner picks (admin → إعداد المتجر, and Settings → the
 * chat): 50 original characters, each with a name, what they do in the shop, a way of talking and a
 * face drawn here as SVG (no picture files). The shop's chat speaks as the one picked; empty is the
 * plain assistant. Razan stays the modest-fashion stores' own companion.
 *
 * Shared with the admin, which imports this file by its path: no "@/" imports and no React here.
 */
export type PersonaLang = "ar" | "en" | "he";
export type W3 = { ar: string; en: string; he: string };
export type PersonaTone = "warm" | "playful" | "calm" | "expert" | "luxury" | "energetic";
export type HairStyle = "short" | "long" | "bun" | "curly" | "hijab" | "cap" | "bald" | "wavy" | "robot" | "cat" | "owl" | "bear";
export type PersonaExtra = "none" | "glasses" | "headphones" | "beard" | "earrings" | "chef" | "flower" | "bow" | "star";
export type PersonaLook = { skin: string; hair: string; style: HairStyle; top: string; bg: [string, string]; extra: PersonaExtra };
export type Persona = { id: string; name: W3; role: W3; tone: PersonaTone; /** The industries it fits first (backend identity INDUSTRIES). */ fits: string[]; look: PersonaLook };

/** What a persona does in the shop, by key (shared by several). */
const ROLE: Record<string, W3> = {
  stylist: { ar: "مستشارة الأناقة", en: "Style adviser", he: "יועצת סטייל" },
  stylistM: { ar: "مستشار الأناقة", en: "Style adviser", he: "יועץ סטייל" },
  shoes: { ar: "خبير المقاسات والأحذية", en: "Shoe and fit expert", he: "מומחה מידות ונעליים" },
  tech: { ar: "خبير الأجهزة", en: "Gadget expert", he: "מומחה גאדג'טים" },
  phones: { ar: "مساعد الموبايلات", en: "Phone helper", he: "עוזר טלפונים" },
  gamer: { ar: "رفيق الألعاب", en: "Gaming buddy", he: "חבר לגיימינג" },
  books: { ar: "أمين المكتبة", en: "The librarian", he: "הספרן" },
  booksF: { ar: "قارئة الرفوف", en: "Shelf reader", he: "קוראת המדפים" },
  beauty: { ar: "خبيرة الجمال والعناية", en: "Beauty and care expert", he: "מומחית יופי וטיפוח" },
  jewelry: { ar: "صائغة القطع", en: "Jewellery guide", he: "מדריכת תכשיטים" },
  home: { ar: "مصممة البيوت", en: "Home designer", he: "מעצבת בית" },
  kids: { ar: "صديق الصغار", en: "The kids' friend", he: "החבר של הקטנים" },
  chef: { ar: "الشيف", en: "The chef", he: "השף" },
  digital: { ar: "مساعد التحميلات", en: "Downloads helper", he: "עוזר ההורדות" },
  market: { ar: "دليل السوق", en: "Market guide", he: "מדריך השוק" },
  host: { ar: "مضيفة المتجر", en: "Shop host", he: "מארחת החנות" },
  hostM: { ar: "مضيف المتجر", en: "Shop host", he: "מארח החנות" },
  computers: { ar: "مهندس الكمبيوترات", en: "Computer engineer", he: "מהנדס מחשבים" },
  coach: { ar: "المدرّب", en: "The coach", he: "המאמן" },
  coachF: { ar: "المدرّبة", en: "The coach", he: "המאמנת" },
  artist: { ar: "الفنانة", en: "The artist", he: "האמנית" },
  pets: { ar: "صديق الحيوانات", en: "Pet pal", he: "חבר של חיות" },
  florist: { ar: "منسّقة الورد", en: "The florist", he: "הפרחונית" },
  music: { ar: "عازف المتجر", en: "The shop's musician", he: "המוזיקאי של החנות" },
  concierge: { ar: "الكونسيرج", en: "The concierge", he: "הקונסיירז'" },
};

/** One persona, written short: id, names (ar|en|he), role, tone, fits, then its look. */
type Row = [id: string, names: string, role: keyof typeof ROLE, tone: PersonaTone, fits: string, skin: string, hair: string, style: HairStyle, top: string, bg1: string, bg2: string, extra: PersonaExtra];
const SKIN = { a: "#F6D7C3", b: "#EAC0A0", c: "#D9A47E", d: "#B97F5A", e: "#8D5A3B", f: "#6B4430", m: "#C9D2DC", fur1: "#F2B36B", fur2: "#9AA3AE", owl: "#B98C5C", bear: "#A47552" } as const;
const ROWS: Row[] = [
  ["layla", "ليلى|Layla|ליילה", "stylist", "warm", "fashion,beauty,general", SKIN.b, "#3B2418", "long", "#C85A7C", "#FCE4EC", "#F8BBD0", "earrings"],
  ["noor", "نور|Noor|נור", "stylist", "calm", "fashion,jewelry", SKIN.a, "#5B3A29", "hijab", "#7E57C2", "#EDE7F6", "#D1C4E9", "none"],
  ["salma", "سلمى|Salma|סלמה", "host", "warm", "general,marketplace,home", SKIN.c, "#2B1B14", "bun", "#2E7D6B", "#E0F2F1", "#B2DFDB", "earrings"],
  ["yara", "يارا|Yara|יארה", "beauty", "playful", "beauty,fashion", SKIN.a, "#8C4A2F", "wavy", "#E57373", "#FFEBEE", "#FFCDD2", "flower"],
  ["hala", "هالة|Hala|הלה", "jewelry", "luxury", "jewelry,fashion", SKIN.b, "#1E1410", "bun", "#1F1F2E", "#F5EEDC", "#E6D3A3", "earrings"],
  ["maya", "مايا|Maya|מאיה", "home", "calm", "home,art,flowers", SKIN.c, "#4A2C1D", "curly", "#8D6E63", "#EFEBE9", "#D7CCC8", "none"],
  ["rana", "رنا|Rana|רנה", "florist", "warm", "flowers,home", SKIN.a, "#6D3B22", "long", "#81C784", "#F1F8E9", "#DCEDC8", "flower"],
  ["dana", "دانا|Dana|דנה", "coachF", "energetic", "sports,general", SKIN.c, "#2B1B14", "bun", "#FF7043", "#FFF3E0", "#FFE0B2", "none"],
  ["sara", "سارة|Sara|שרה", "booksF", "calm", "books,art", SKIN.b, "#3E2723", "short", "#5C6BC0", "#E8EAF6", "#C5CAE9", "glasses"],
  ["lina", "لينا|Lina|לינה", "artist", "playful", "art,music,kids", SKIN.d, "#1B1B1B", "curly", "#F06292", "#FCE4EC", "#F48FB1", "bow"],
  ["huda", "هدى|Huda|הודה", "host", "calm", "general,food,home", SKIN.c, "#3E2723", "hijab", "#26A69A", "#E0F2F1", "#80CBC4", "none"],
  ["joud", "جود|Joud|ג'וד", "beauty", "luxury", "beauty,jewelry", SKIN.d, "#1E1410", "long", "#AD1457", "#FCE4EC", "#F8BBD0", "earrings"],
  ["reem", "ريم|Reem|רים", "stylist", "energetic", "fashion,shoes,sports", SKIN.b, "#4E342E", "wavy", "#FFB300", "#FFF8E1", "#FFE082", "none"],
  ["tala", "تالا|Tala|טאלה", "host", "playful", "kids,general,digital", SKIN.a, "#A1662F", "bun", "#4FC3F7", "#E1F5FE", "#B3E5FC", "bow"],
  ["mira", "ميرا|Mira|מירה", "concierge", "luxury", "jewelry,general,home", SKIN.e, "#1B1B1B", "short", "#37474F", "#ECEFF1", "#CFD8DC", "earrings"],
  ["omar", "عمر|Omar|עומר", "hostM", "warm", "general,marketplace,food", SKIN.c, "#2B1B14", "short", "#1E88E5", "#E3F2FD", "#BBDEFB", "beard"],
  ["yousef", "يوسف|Yousef|יוסף", "tech", "expert", "electronics,computers,phones", SKIN.b, "#3E2723", "short", "#263238", "#ECEFF1", "#B0BEC5", "glasses"],
  ["kareem", "كريم|Kareem|כרים", "stylistM", "luxury", "fashion,shoes,jewelry", SKIN.d, "#1B1B1B", "wavy", "#3E2723", "#EFEBE9", "#BCAAA4", "beard"],
  ["adam", "آدم|Adam|אדם", "coach", "energetic", "sports,shoes", SKIN.c, "#2B1B14", "cap", "#E53935", "#FFEBEE", "#EF9A9A", "none"],
  ["rami", "رامي|Rami|רמי", "gamer", "playful", "gaming,computers,digital", SKIN.b, "#5D4037", "short", "#7C4DFF", "#EDE7F6", "#B39DDB", "headphones"],
  ["zaid", "زيد|Zaid|זייד", "phones", "energetic", "phones,electronics", SKIN.a, "#4E342E", "short", "#00ACC1", "#E0F7FA", "#80DEEA", "none"],
  ["hamza", "حمزة|Hamza|חמזה", "chef", "warm", "food", SKIN.d, "#1B1B1B", "short", "#FFFFFF", "#FFF3E0", "#FFCC80", "chef"],
  ["fares", "فارس|Fares|פארס", "shoes", "expert", "shoes,sports,fashion", SKIN.c, "#3E2723", "short", "#455A64", "#ECEFF1", "#B0BEC5", "beard"],
  ["sami", "سامي|Sami|סמי", "books", "calm", "books,digital", SKIN.e, "#1B1B1B", "bald", "#6D4C41", "#EFEBE9", "#D7CCC8", "glasses"],
  ["tamer", "تامر|Tamer|תאמר", "computers", "expert", "computers,electronics,digital", SKIN.b, "#212121", "short", "#1565C0", "#E3F2FD", "#90CAF9", "glasses"],
  ["nabil", "نبيل|Nabil|נביל", "concierge", "luxury", "general,jewelry,home", SKIN.f, "#121212", "short", "#212121", "#F5F5F5", "#E0E0E0", "beard"],
  ["ziad", "زياد|Ziad|זיאד", "music", "playful", "music,art", SKIN.c, "#2B1B14", "curly", "#FF7043", "#FBE9E7", "#FFAB91", "headphones"],
  ["majd", "مجد|Majd|מג'ד", "market", "energetic", "marketplace,general", SKIN.d, "#3E2723", "cap", "#43A047", "#E8F5E9", "#A5D6A7", "none"],
  ["bashar", "بشار|Bashar|בשאר", "hostM", "calm", "home,general", SKIN.b, "#4E342E", "short", "#8D6E63", "#EFEBE9", "#BCAAA4", "beard"],
  ["khaled", "خالد|Khaled|חאלד", "chef", "expert", "food", SKIN.c, "#2B1B14", "short", "#FFFFFF", "#FBE9E7", "#FFCCBC", "chef"],
  ["ali", "علي|Ali|עלי", "kids", "playful", "kids,gaming", SKIN.a, "#6D4C41", "curly", "#FFCA28", "#FFFDE7", "#FFF59D", "star"],
  ["hadi", "هادي|Hadi|הדי", "digital", "calm", "digital,computers,books", SKIN.e, "#1B1B1B", "short", "#5E35B1", "#EDE7F6", "#B39DDB", "headphones"],
  ["nour-m", "نور الدين|Nour Eddine|נור א-דין", "phones", "warm", "phones,electronics,general", SKIN.d, "#121212", "short", "#00897B", "#E0F2F1", "#80CBC4", "beard"],
  ["jad", "جاد|Jad|ג'אד", "gamer", "energetic", "gaming,computers", SKIN.a, "#3E2723", "cap", "#D81B60", "#FCE4EC", "#F48FB1", "headphones"],
  ["walid", "وليد|Walid|וואליד", "coach", "calm", "sports,general", SKIN.f, "#121212", "bald", "#2E7D32", "#E8F5E9", "#A5D6A7", "beard"],
  ["amal", "أمل|Amal|אמל", "host", "warm", "general,kids,flowers", SKIN.c, "#5B3A29", "hijab", "#EC407A", "#FCE4EC", "#F8BBD0", "none"],
  ["farah", "فرح|Farah|פרח", "kids", "playful", "kids,flowers,art", SKIN.b, "#A1662F", "curly", "#AB47BC", "#F3E5F5", "#CE93D8", "bow"],
  ["sana", "سناء|Sana|סנאא", "chef", "warm", "food,home", SKIN.c, "#3E2723", "hijab", "#FF8A65", "#FBE9E7", "#FFAB91", "none"],
  ["lama", "لمى|Lama|למה", "artist", "calm", "art,books,music", SKIN.a, "#1B1B1B", "short", "#26C6DA", "#E0F7FA", "#80DEEA", "earrings"],
  ["ruba", "ربى|Ruba|רובא", "home", "luxury", "home,jewelry", SKIN.d, "#2B1B14", "wavy", "#6D4C41", "#F5EEDC", "#E6D3A3", "earrings"],
  // Not people: friends of the shop.
  ["bolt", "بولت|Bolt|בולט", "tech", "playful", "electronics,computers,phones,digital", SKIN.m, "#90A4AE", "robot", "#1E88E5", "#E3F2FD", "#90CAF9", "none"],
  ["volta", "فولتا|Volta|וולטה", "gamer", "energetic", "gaming,electronics", SKIN.m, "#B0BEC5", "robot", "#7C4DFF", "#EDE7F6", "#B388FF", "headphones"],
  ["mishmish", "مشمش|Mishmish|מישמיש", "pets", "playful", "pets,kids", SKIN.fur1, "#D9822B", "cat", "#FFB74D", "#FFF3E0", "#FFE0B2", "bow"],
  ["ramadi", "رمادي|Ramadi|רמאדי", "pets", "calm", "pets,home", SKIN.fur2, "#78909C", "cat", "#78909C", "#ECEFF1", "#CFD8DC", "none"],
  ["hakeem", "حكيم|Hakeem|חכים", "books", "expert", "books,digital,art", SKIN.owl, "#8D6E63", "owl", "#6D4C41", "#EFEBE9", "#D7CCC8", "glasses"],
  ["dubdub", "دبدوب|Dubdub|דובדוב", "kids", "warm", "kids,food,general", SKIN.bear, "#8D6E63", "bear", "#EF5350", "#FFEBEE", "#FFCDD2", "bow"],
  ["sukkar", "سكّر|Sukkar|סוכר", "chef", "playful", "food,kids", SKIN.bear, "#A1887F", "bear", "#FFFFFF", "#FFF8E1", "#FFE082", "chef"],
  ["nagham", "نغم|Nagham|נע'ם", "music", "calm", "music,art,books", SKIN.b, "#3E2723", "long", "#5C6BC0", "#E8EAF6", "#9FA8DA", "headphones"],
  ["zahra", "زهرة|Zahra|זהרה", "florist", "luxury", "flowers,jewelry,home", SKIN.c, "#2B1B14", "hijab", "#9CCC65", "#F1F8E9", "#C5E1A5", "flower"],
  ["nojoom", "نجوم|Nojoom|נוג'ום", "market", "playful", "marketplace,digital,general", SKIN.m, "#B0BEC5", "robot", "#FFC107", "#FFFDE7", "#FFF59D", "star"],
];

const w3 = (s: string): W3 => {
  const [ar, en, he] = s.split("|");
  return { ar, en, he };
};
export const PERSONAS: Persona[] = ROWS.map(([id, names, role, tone, fits, skin, hair, style, top, bg1, bg2, extra]) => ({
  id,
  name: w3(names),
  role: ROLE[role],
  tone,
  fits: fits.split(","),
  look: { skin, hair, style, top, bg: [bg1, bg2], extra },
}));
export const PERSONA_IDS = PERSONAS.map((p) => p.id);
export const personaById = (id: unknown): Persona | null => (typeof id === "string" ? (PERSONAS.find((p) => p.id === id) ?? null) : null);
/** Those that fit a store's industry first, then the rest (their order kept). */
export function personasFor(industry: string | null | undefined): Persona[] {
  if (!industry) return PERSONAS;
  return [...PERSONAS.filter((p) => p.fits.includes(industry)), ...PERSONAS.filter((p) => !p.fits.includes(industry))];
}

/** How each tone talks: its hello ({name}, {role}), the line beside the chat button, and the box's hint. */
const TONE_LINES: Record<PersonaTone, { hello: W3; nudge: W3; hint: W3 }> = {
  warm: {
    hello: { ar: "أهلاً وسهلاً! أنا {name}، {role} هون. شو بتدوّر عليه اليوم؟ أنا معك خطوة بخطوة.", en: "Hello and welcome! I'm {name}, {role} here. What are you looking for today? I'm with you every step.", he: "שלום וברוכים הבאים! אני {name}, {role} כאן. מה מחפשים היום? אני איתך בכל צעד." },
    nudge: { ar: "محتار؟ اسألني، أنا هون", en: "Not sure? Ask me, I'm here", he: "מתלבטים? תשאלו אותי, אני כאן" },
    hint: { ar: "اكتبلي سؤالك…", en: "Write me your question…", he: "כתבו לי את השאלה…" },
  },
  playful: {
    hello: { ar: "هاي! أنا {name} ✨ {role} الرسمي هون. قلّي شو بخاطرك ومنلاقيه سوا!", en: "Hey! I'm {name} ✨ the official {role} around here. Tell me what you fancy and we'll find it together!", he: "היי! אני {name} ✨ ה{role} הרשמי כאן. ספרו לי מה בא לכם ונמצא את זה ביחד!" },
    nudge: { ar: "بدك فكرة حلوة؟ 👋", en: "Want a fun idea? 👋", he: "רוצים רעיון שווה? 👋" },
    hint: { ar: "قلّي شو بدك…", en: "Tell me what you want…", he: "ספרו לי מה בא לכם…" },
  },
  calm: {
    hello: { ar: "مرحبا، أنا {name}، {role}. خذ وقتك، وأنا بساعدك تلاقي اللي بيناسبك.", en: "Hi, I'm {name}, {role}. Take your time; I'll help you find what suits you.", he: "שלום, אני {name}, {role}. קחו את הזמן; אעזור לכם למצוא את מה שמתאים לכם." },
    nudge: { ar: "إذا احتجت شي، أنا هون", en: "If you need anything, I'm here", he: "אם צריך משהו, אני כאן" },
    hint: { ar: "اسأل براحتك…", en: "Ask at your own pace…", he: "שאלו בנחת…" },
  },
  expert: {
    hello: { ar: "أهلاً، أنا {name}، {role}. احكيلي شو بدك تعمل فيه، وبرشّحلك الأنسب مع السبب.", en: "Hello, I'm {name}, {role}. Tell me what you'll use it for, and I'll recommend the best fit and why.", he: "שלום, אני {name}, {role}. ספרו לי למה זה נועד, ואמליץ על המתאים ביותר ולמה." },
    nudge: { ar: "بدك رأي خبير؟", en: "Want an expert's view?", he: "רוצים חוות דעת של מומחה?" },
    hint: { ar: "شو استعمالك؟ وميزانيتك؟", en: "What's it for? What's your budget?", he: "למה זה נועד? ומה התקציב?" },
  },
  luxury: {
    hello: { ar: "أهلاً بك، أنا {name}، {role}. يسعدني أرافقك وأختارلك قطعة بتليق فيك.", en: "Welcome, I'm {name}, {role}. It's my pleasure to guide you to a piece worthy of you.", he: "ברוכים הבאים, אני {name}, {role}. בשמחה אלווה אתכם אל פריט שראוי לכם." },
    nudge: { ar: "اختيار خاص إلك؟", en: "A choice made for you?", he: "בחירה מיוחדת בשבילכם?" },
    hint: { ar: "كيف فيني أخدمك؟", en: "How may I help you?", he: "איך אוכל לעזור?" },
  },
  energetic: {
    hello: { ar: "يلا! أنا {name}، {role} 💪 قلّي شو هدفك ومنلاقي الأنسب بسرعة.", en: "Let's go! I'm {name}, {role} 💪 Tell me your goal and we'll find the best fit fast.", he: "יאללה! אני {name}, {role} 💪 ספרו לי מה המטרה ונמצא את המתאים מהר." },
    nudge: { ar: "جاهز؟ يلا نلاقيه!", en: "Ready? Let's find it!", he: "מוכנים? בואו נמצא את זה!" },
    hint: { ar: "شو هدفك؟", en: "What's your goal?", he: "מה המטרה?" },
  },
};
const fill = (s: string, p: Persona, lang: PersonaLang) => s.replace("{name}", p.name[lang]).replace("{role}", p.role[lang]);
/** What a persona says, in a language: its hello, the line beside the button, the box's hint. */
export function personaLines(p: Persona, lang: PersonaLang): { hello: string; nudge: string; hint: string } {
  const t = TONE_LINES[p.tone];
  return { hello: fill(t.hello[lang], p, lang), nudge: t.nudge[lang], hint: t.hint[lang] };
}

/* ---------------- The face, drawn ---------------- */

const esc = (c: string) => (/^#[0-9A-Fa-f]{3,8}$/.test(c) ? c : "#999");
/** A persona's face as SVG markup (a 100×100 square, scaled by `size`): shoulders, head, hair, eyes, a smile and its extra. */
export function personaFace(p: Persona, size = 64): string {
  const { skin, hair, style, top, bg, extra } = p.look;
  const S = esc(skin), H = esc(hair), T = esc(top), B0 = esc(bg[0]), B1 = esc(bg[1]);
  const id = `pf-${p.id}`;
  const parts: string[] = [];
  parts.push(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${B0}"/><stop offset="1" stop-color="${B1}"/></linearGradient><clipPath id="${id}-c"><circle cx="50" cy="50" r="50"/></clipPath></defs>`);
  parts.push(`<circle cx="50" cy="50" r="50" fill="url(#${id})"/>`);
  parts.push(`<g clip-path="url(#${id}-c)">`);
  // Shoulders.
  parts.push(`<path d="M14 104 Q16 76 50 74 Q84 76 86 104 Z" fill="${T}"/>`);
  const animal = style === "cat" || style === "owl" || style === "bear";
  if (style === "robot") {
    parts.push(`<rect x="44" y="64" width="12" height="10" fill="${H}"/>`);
    parts.push(`<line x1="50" y1="22" x2="50" y2="12" stroke="${H}" stroke-width="3"/><circle cx="50" cy="10" r="4" fill="${T}"/>`);
    parts.push(`<rect x="26" y="22" width="48" height="44" rx="14" fill="${S}" stroke="${H}" stroke-width="3"/>`);
    parts.push(`<rect x="33" y="36" width="34" height="14" rx="7" fill="#263238"/><circle cx="42" cy="43" r="3.5" fill="#80DEEA"/><circle cx="58" cy="43" r="3.5" fill="#80DEEA"/>`);
    parts.push(`<path d="M42 57 Q50 61 58 57" stroke="#263238" stroke-width="2.5" fill="none" stroke-linecap="round"/>`);
  } else {
    // Neck, then the head.
    if (!animal) parts.push(`<rect x="44" y="60" width="12" height="14" rx="5" fill="${S}"/>`);
    if (style === "hijab") parts.push(`<path d="M22 66 Q20 22 50 18 Q80 22 78 66 Q66 80 50 80 Q34 80 22 66 Z" fill="${H}"/>`);
    if (style === "long" || style === "wavy") parts.push(`<path d="M26 74 Q20 40 30 26 Q50 12 70 26 Q80 40 74 74 Z" fill="${H}"/>`);
    if (style === "cat") parts.push(`<path d="M28 34 L30 14 L44 26 Z M72 34 L70 14 L56 26 Z" fill="${S}"/><path d="M31 30 L32 19 L40 26 Z M69 30 L68 19 L60 26 Z" fill="#F8BBD0"/>`);
    if (style === "bear") parts.push(`<circle cx="31" cy="27" r="9" fill="${S}"/><circle cx="69" cy="27" r="9" fill="${S}"/><circle cx="31" cy="27" r="4.5" fill="${H}"/><circle cx="69" cy="27" r="4.5" fill="${H}"/>`);
    if (style === "owl") parts.push(`<path d="M28 30 L24 16 L40 26 Z M72 30 L76 16 L60 26 Z" fill="${H}"/>`);
    parts.push(`<ellipse cx="50" cy="44" rx="${animal ? 24 : 21}" ry="${animal ? 23 : 24}" fill="${S}"/>`);
    // Hair on top.
    if (style === "short") parts.push(`<path d="M29 40 Q28 20 50 19 Q72 20 71 40 Q64 28 50 29 Q36 28 29 40 Z" fill="${H}"/>`);
    if (style === "long") parts.push(`<path d="M29 42 Q28 19 50 18 Q72 19 71 42 Q62 27 50 28 Q38 27 29 42 Z" fill="${H}"/>`);
    if (style === "wavy") parts.push(`<path d="M28 44 Q26 18 50 17 Q74 18 72 44 Q68 32 62 34 Q56 26 50 31 Q44 26 38 34 Q32 32 28 44 Z" fill="${H}"/>`);
    if (style === "bun") parts.push(`<circle cx="50" cy="15" r="9" fill="${H}"/><path d="M29 40 Q28 20 50 19 Q72 20 71 40 Q62 26 50 27 Q38 26 29 40 Z" fill="${H}"/>`);
    if (style === "curly") parts.push(`<g fill="${H}"><circle cx="34" cy="28" r="9"/><circle cx="44" cy="21" r="10"/><circle cx="57" cy="21" r="10"/><circle cx="67" cy="29" r="9"/><circle cx="29" cy="38" r="6"/><circle cx="71" cy="38" r="6"/></g>`);
    if (style === "cap") parts.push(`<path d="M28 36 Q28 18 50 17 Q72 18 72 36 Z" fill="${T}"/><path d="M50 34 L84 36 Q80 40 70 39 Z" fill="${T}"/><path d="M29 38 Q31 34 36 34" stroke="${H}" stroke-width="3" fill="none"/>`);
    if (style === "hijab") parts.push(`<path d="M28 42 Q28 21 50 20 Q72 21 72 42 Q64 30 50 30 Q36 30 28 42 Z" fill="${H}"/>`);
    if (style === "owl") parts.push(`<circle cx="40" cy="42" r="9" fill="#FFF8E1"/><circle cx="60" cy="42" r="9" fill="#FFF8E1"/><path d="M47 50 L50 56 L53 50 Z" fill="#FFB300"/>`);
    if (style === "cat") parts.push(`<path d="M47 49 L50 52 L53 49 Z" fill="#F06292"/><path d="M30 50 L40 51 M30 54 L40 53 M70 50 L60 51 M70 54 L60 53" stroke="#5D4037" stroke-width="1.2"/>`);
    if (style === "bear") parts.push(`<ellipse cx="50" cy="53" rx="9" ry="7" fill="#EFD6C0"/><ellipse cx="50" cy="50" rx="3.5" ry="2.5" fill="#3E2723"/>`);
    // Eyes and a smile.
    const eyeY = style === "owl" ? 42 : 44;
    parts.push(`<circle cx="${style === "owl" ? 40 : 42}" cy="${eyeY}" r="2.6" fill="#2B1B14"/><circle cx="${style === "owl" ? 60 : 58}" cy="${eyeY}" r="2.6" fill="#2B1B14"/>`);
    if (!animal || style === "cat") parts.push(`<path d="M43 ${style === "cat" ? 56 : 54} Q50 ${style === "cat" ? 60 : 60} 57 ${style === "cat" ? 56 : 54}" stroke="#8D3B2F" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
    if (!animal) parts.push(`<circle cx="36" cy="51" r="3" fill="#F48FB1" opacity=".45"/><circle cx="64" cy="51" r="3" fill="#F48FB1" opacity=".45"/>`);
  }
  // Its extra.
  if (extra === "glasses") parts.push(`<g fill="none" stroke="#263238" stroke-width="2"><circle cx="42" cy="44" r="6.5"/><circle cx="58" cy="44" r="6.5"/><path d="M48.5 44 L51.5 44"/></g>`);
  if (extra === "headphones") parts.push(`<path d="M24 46 Q24 16 50 16 Q76 16 76 46" stroke="#263238" stroke-width="4" fill="none"/><rect x="19" y="40" width="9" height="15" rx="4" fill="#263238"/><rect x="72" y="40" width="9" height="15" rx="4" fill="#263238"/>`);
  if (extra === "beard") parts.push(`<path d="M31 50 Q33 70 50 72 Q67 70 69 50 Q64 62 50 62 Q36 62 31 50 Z" fill="${H}"/><path d="M44 57 Q50 60 56 57" stroke="#F5F5F5" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  if (extra === "earrings") parts.push(`<circle cx="29" cy="54" r="2.4" fill="#FFD54F"/><circle cx="71" cy="54" r="2.4" fill="#FFD54F"/>`);
  if (extra === "chef") parts.push(`<path d="M32 26 Q26 12 38 12 Q42 4 50 8 Q58 4 62 12 Q74 12 68 26 Z" fill="#FFFFFF" stroke="#E0E0E0"/><rect x="33" y="24" width="34" height="7" rx="2" fill="#FFFFFF" stroke="#E0E0E0"/>`);
  if (extra === "flower") parts.push(`<g transform="translate(68 24)"><circle r="4" cx="0" cy="-4" fill="#F06292"/><circle r="4" cx="4" cy="0" fill="#F06292"/><circle r="4" cx="0" cy="4" fill="#F06292"/><circle r="4" cx="-4" cy="0" fill="#F06292"/><circle r="2.4" fill="#FFEB3B"/></g>`);
  if (extra === "bow") parts.push(`<g transform="translate(66 22)" fill="#E91E63"><path d="M0 0 L-9 -6 L-9 6 Z"/><path d="M0 0 L9 -6 L9 6 Z"/><circle r="2.6"/></g>`);
  if (extra === "star") parts.push(`<path d="M74 14 L76.5 20 L83 20.5 L78 24.5 L79.6 31 L74 27.4 L68.4 31 L70 24.5 L65 20.5 L71.5 20 Z" fill="#FFC107"/>`);
  parts.push(`</g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${p.name.en.replace(/"/g, "")}">${parts.join("")}</svg>`;
}
/** The face as an address an <img> takes (a data: URL), for where markup can't go in. */
export const personaFaceUrl = (p: Persona, size = 64) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(personaFace(p, size))}`;
