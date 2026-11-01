/**
 * The editor's icon library: Lucide, Tabler and Phosphor (public/icon-sets, made by
 * scripts/gen-icon-sets.mjs), each set fetched the first time it's opened. An icon picked
 * goes into the page as a drawing (its own `art`, the same checked data as any drawing),
 * so the shop never needs the library. Search takes Arabic and Hebrew words too.
 */
import { tr } from "../lib/words";
import type { Art, ArtNode } from "./svgArt";

export type IconFamily = "basic" | "lucide" | "tabler" | "phosphor";
export const PH_WEIGHTS = ["regular", "thin", "light", "bold", "fill", "duotone"] as const;
export type IconSetKey = "lucide" | "tabler" | "tabler-filled" | `ph-${(typeof PH_WEIGHTS)[number]}`;

/** The sets, in the picker's order: `line` ones draw with a line whose width can change. */
export const ICON_SETS: Array<{ key: IconSetKey; family: IconFamily; name: () => string; line: boolean }> = [
  { key: "lucide", family: "lucide", name: () => "Lucide", line: true },
  { key: "tabler", family: "tabler", name: () => "Tabler", line: true },
  { key: "tabler-filled", family: "tabler", name: () => tr("Tabler معبّأة", "Tabler filled"), line: false },
  ...PH_WEIGHTS.map((w) => ({ key: `ph-${w}` as IconSetKey, family: "phosphor" as const, name: () => "Phosphor", line: false })),
];
export const PH_WEIGHT_NAME: Record<(typeof PH_WEIGHTS)[number], () => string> = {
  regular: () => tr("عادي", "Regular"),
  thin: () => tr("رفيع جداً", "Thin"),
  light: () => tr("رفيع", "Light"),
  bold: () => tr("عريض", "Bold"),
  fill: () => tr("معبّأ", "Fill"),
  duotone: () => tr("لونين", "Duotone"),
};

type Shape = [string, Record<string, string>, Shape[]?];
export type IconEntry = { name: string; words: string; group: string; shapes: Shape[] };
export type IconSet = { key: IconSetKey; viewBox: string; base: Record<string, string>; icons: IconEntry[]; groups: string[] };

/** A set's file as it comes (checked loosely: what doesn't look right is left out). */
export function readIconSet(key: IconSetKey, raw: unknown): IconSet {
  const r = (raw && typeof raw === "object" ? raw : {}) as { viewBox?: unknown; base?: unknown; icons?: unknown };
  const icons: IconEntry[] = [];
  for (const i of Array.isArray(r.icons) ? r.icons : []) {
    if (Array.isArray(i) && typeof i[0] === "string" && Array.isArray(i[3])) icons.push({ name: i[0], words: String(i[1] ?? ""), group: String(i[2] ?? ""), shapes: i[3] as Shape[] });
  }
  const groups = [...new Set(icons.map((i) => i.group).filter(Boolean))].sort();
  return { key, viewBox: typeof r.viewBox === "string" ? r.viewBox : "0 0 24 24", base: (r.base && typeof r.base === "object" ? r.base : {}) as Record<string, string>, icons, groups };
}

const loading = new Map<IconSetKey, Promise<IconSet>>();
/** A set, fetched once per visit. */
export function loadIconSet(key: IconSetKey): Promise<IconSet> {
  let p = loading.get(key);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}icon-sets/${key}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`icon set ${key}: ${r.status}`);
        return r.json();
      })
      .then((raw) => readIconSet(key, raw));
    p.catch(() => loading.delete(key));
    loading.set(key, p);
  }
  return p;
}

/** An icon as the page keeps it: its set's look on a group, its shapes inside. */
export function iconArt(set: Pick<IconSet, "viewBox" | "base">, icon: Pick<IconEntry, "shapes">, line?: number): Art {
  const node = ([t, a, c]: Shape): ArtNode => (c?.length ? { t, a: { ...a }, c: c.map(node) } : { t, a: { ...a } });
  const base = { ...set.base };
  if (line !== undefined && base.stroke === "currentColor") base["stroke-width"] = String(line);
  return { viewBox: set.viewBox, nodes: [{ t: "g", a: base, c: icon.shapes.map(node) }] };
}
export const iconRef = (set: IconSetKey, name: string) => `${set}:${name}`;
export const setOfRef = (ref: unknown): IconSetKey | undefined => {
  const key = typeof ref === "string" ? ref.split(":")[0] : "";
  return ICON_SETS.some((s) => s.key === key) ? (key as IconSetKey) : undefined;
};

/** A line icon's line width (on its outer group), or undefined for a filled one. */
export function iconLineOf(art: unknown): number | undefined {
  const g = (art as Art | undefined)?.nodes?.[0];
  if (!g || g.t !== "g" || g.a.stroke !== "currentColor") return undefined;
  const w = Number(g.a["stroke-width"] ?? 2);
  return Number.isFinite(w) ? w : 2;
}
export function withIconLine(art: Art, width: number): Art {
  const [g, ...rest] = art.nodes;
  return { ...art, nodes: [{ ...g, a: { ...g.a, "stroke-width": String(width) } }, ...rest] };
}

/** An icon as a drawing of its own (theme colour instead of the words' colour, so its colours can change). */
export function iconAsDrawing(art: Art): Art {
  const paint = (n: ArtNode): ArtNode => {
    const a = { ...n.a };
    for (const k of ["fill", "stroke"]) if (a[k] === "currentColor") a[k] = "accent";
    return n.c ? { ...n, a, c: n.c.map(paint) } : { ...n, a };
  };
  return { ...art, nodes: art.nodes.map(paint) };
}

// Words people look for in Arabic or Hebrew, and what the icons are called. Arabic is
// matched without its vowel marks and with its letter variants made one (أ إ آ → ا, ة → ه, ى → ي).
const LOCAL: Array<[string, string]> = [
  ["قلب حب مفضل לב אהבה מועדף", "heart love favorite"],
  ["نجمه نجوم تقييم כוכב דירוג", "star rating"],
  ["سله عربه تسوق متجر עגלה קניות חנות", "cart shopping basket store"],
  ["شنطه حقيبه كيس תיק שקית", "bag shopping-bag handbag"],
  ["توصيل شحن شاحنه משלוח משאית", "truck delivery shipping"],
  ["طرد صندوق بوكس חבילה קופסה", "package box parcel"],
  ["هديه هدايا מתנה", "gift present"],
  ["حمايه امان ضمان מגן הגנה אחריות", "shield security protection"],
  ["قفل سري מנעול", "lock secure"],
  ["هاتف تلفون اتصال جوال موبايل טלפון נייד", "phone call mobile smartphone"],
  ["بريد ايميل رساله דואר מייל", "mail email envelope"],
  ["رسائل دردشه محادثه צ'אט הודעה", "message chat"],
  ["واتساب وتساب וואטסאפ", "whatsapp brand-whatsapp"],
  ["انستغرام انستا אינסטגרם", "instagram brand-instagram"],
  ["فيسبوك פייסבוק", "facebook brand-facebook"],
  ["تيك توك טיקטוק", "tiktok brand-tiktok"],
  ["يوتيوب יוטיוב", "youtube brand-youtube"],
  ["صح تم موافق نعم וי אישור", "check tick done"],
  ["خطا اغلاق الغاء لا סגור ביטול", "x close cancel"],
  ["اضافه زائد פלוס הוספה", "plus add"],
  ["ناقص طرح מינוס", "minus"],
  ["بحث تفتيش חיפוש", "search magnifying"],
  ["مستخدم شخص حساب משתמש אדם חשבון", "user person account"],
  ["ناس فريق عملاء אנשים צוות לקוחות", "users people team"],
  ["بيت رئيسيه منزل בית", "home house"],
  ["اعدادات ترس הגדרות", "settings gear"],
  ["قائمه منيو תפריט", "menu list"],
  ["سهم يمين חץ ימין", "arrow right chevron-right"],
  ["سهم يسار חץ שמאל", "arrow left chevron-left"],
  ["سهم فوق اعلى חץ למעלה", "arrow up chevron-up"],
  ["سهم تحت اسفل חץ למטה", "arrow down chevron-down"],
  ["ارجاع استرجاع تبديل החזרה החלפה", "return undo refresh exchange"],
  ["لمعه بريق سحر ניצוץ קסם", "sparkle sparkles magic"],
  ["نار ساخن عرض אש חם מבצע", "fire flame hot"],
  ["خصم تخفيض عرض نسبه הנחה מבצע", "discount percent sale tag"],
  ["سعر تاج ملصق מחיר תג", "tag price label"],
  ["مال فلوس نقود כסף מזומן", "money cash currency coins"],
  ["بطاقه دفع فيزا כרטיס תשלום אשראי", "credit-card payment card wallet"],
  ["محفظه ארנק", "wallet"],
  ["وقت ساعه زمن שעון זמן", "clock time watch"],
  ["تقويم تاريخ موعد לוח שנה תאריך", "calendar date"],
  ["موقع خريطه عنوان מיקום מפה כתובת", "map-pin location map"],
  ["صوره صور תמונה", "image photo picture"],
  ["كاميرا مصوره מצלמה", "camera"],
  ["فيديو مقطع וידאו סרטון", "video film play"],
  ["موسيقى صوت מוזיקה צליל", "music sound volume"],
  ["تشغيل ابدا נגן הפעלה", "play"],
  ["ملابس قميص بلوزه בגדים חולצה", "shirt t-shirt clothes"],
  ["فستان שמלה", "dress"],
  ["حذاء احذيه נעל נעליים", "shoe sneaker boot"],
  ["نظارات משקפיים", "glasses sunglasses"],
  ["خاتم مجوهرات ذهب טבעת תכשיט", "diamond ring jewelry gem"],
  ["عطر بخور בושם", "perfume spray bottle"],
  ["مكياج تجميل جمال איפור יופי", "lipstick makeup beauty brush"],
  ["ورد زهره زهور פרח פרחים", "flower rose plant"],
  ["ورقه شجر طبيعه עלה עץ טבע", "leaf tree plant nature"],
  ["شمس صيف שמש קיץ", "sun summer"],
  ["قمر ليل ירח לילה", "moon night"],
  ["مطر غيم سحاب גשם ענן", "cloud rain weather"],
  ["ثلج شتاء שלג חורף", "snowflake snow winter"],
  ["قهوه كوب קפה כוס", "coffee cup mug"],
  ["طعام اكل مطعم אוכל מסעדה", "food restaurant utensils chef"],
  ["كيك حلويات عيد ميلاد עוגה יום הולדת", "cake birthday cookie"],
  ["طفل اطفال ولد ילד תינוק", "baby child kid"],
  ["رياضه كره ספורט כדור", "ball sport football basketball"],
  ["كتاب قراءه ספר", "book reading"],
  ["قلم كتابه تعديل עט עריכה", "pencil pen edit"],
  ["ملف وثيقه מסמך קובץ", "file document"],
  ["تحميل تنزيل הורדה", "download"],
  ["رفع העלאה", "upload"],
  ["مشاركه שיתוף", "share"],
  ["رابط קישור", "link"],
  ["عين مشاهده رؤيه עין צפייה", "eye view"],
  ["جرس تنبيه اشعار פעמון התראה", "bell notification"],
  ["معلومات مساعده سؤال מידע עזרה שאלה", "info help question"],
  ["تحذير خطر אזהרה", "alert warning triangle"],
  ["كهرباء طاقه سريع ברק מהיר", "bolt zap lightning flash"],
  ["تاج ملك مميز כתר", "crown premium"],
  ["جائزه كاس فوز פרס גביע", "award trophy medal"],
  ["علم دوله דגל", "flag"],
  ["عالم ارض لغه עולם שפה", "globe world language"],
  ["سياره سيارات רכב", "car"],
  ["طائره سفر מטוס טיסה", "plane flight travel"],
  ["محل دكان متجر חנות", "store shop building-store"],
  ["مصنع شركه מפעל חברה", "building factory"],
  ["سماعه دعم خدمه תמיכה שירות", "headset support headphones"],
  ["ابتسامه سعيد وجه חיוך שמח", "smile happy face mood"],
  ["اعجاب لايك לייק", "thumbs-up like"],
  ["تعليق كلام תגובה", "comment message-circle"],
  ["قطه قطط חתול", "cat"],
  ["كلب كلاب כלב", "dog"],
  ["عصفور طير ציפור", "bird"],
  ["ساعه يد", "watch"],
  ["عسل نحل דבש", "honey bee"],
  ["حجاب عبايه חיג'אב", "hijab scarf"],
  ["قماش نسيج خياطه בד תפירה", "needle thread scissors fabric"],
  ["مقص מספריים", "scissors"],
  ["مفتاح מפתח", "key"],
  ["شاشه كمبيوتر حاسوب מחשב מסך", "monitor computer laptop"],
  ["سماعات اذن אוזניות", "headphones earbuds"],
  ["شحن بطاريه סוללה", "battery charging"],
  ["واي فاي انترنت ויי פיי אינטרנט", "wifi internet"],
  ["نسخ העתק", "copy"],
  ["حذف مهملات زباله מחק פח", "trash delete"],
  ["حفظ שמור", "save device-floppy floppy-disk"],
  ["طباعه הדפסה", "printer print"],
  ["فلتر تصفيه סינון", "filter"],
  ["ترتيب מיון", "sort arrows-sort"],
  ["شبكه مربعات רשת", "grid layout"],
  ["رسم بياني احصائيات גרף סטטיסטיקה", "chart graph analytics"],
  ["رقم ترتيب מספר", "hash number"],
  ["مسجد هلال מסגד", "mosque moon-stars crescent"],
  ["فانوس رمضان פנס", "lamp lantern"],
  ["بالون احتفال בלון חגיגה", "balloon confetti party"],
];
const AR_MARKS = /[ً-ٰٟـ]/g;
export const normalWord = (w: string) =>
  w.toLowerCase().replace(AR_MARKS, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/^(ال)(?=..)/, "").trim();
const LOCAL_WORDS: Array<[string[], string[]]> = LOCAL.map(([local, en]) => [local.split(/\s+/).map(normalWord), en.split(/\s+/)]);

/** The English words a typed word stands for: itself, plus any Arabic or Hebrew meaning. */
function meanings(word: string): string[] {
  const w = normalWord(word);
  if (!w) return [];
  if (/^[a-z0-9-]+$/.test(w)) return [w];
  const out = new Set<string>();
  for (const [locals, en] of LOCAL_WORDS) if (locals.some((l) => l === w || (w.length >= 3 && l.startsWith(w)))) en.forEach((e) => out.add(e));
  return [...out];
}

/** The icons that match what's typed (every word, in any language listed) in a group, best first. */
export function searchIcons(set: IconSet, query: string, group = ""): IconEntry[] {
  const list = group ? set.icons.filter((i) => i.group === group) : set.icons;
  const words = query.split(/\s+/).filter(Boolean);
  if (!words.length) return list;
  const wanted = words.map(meanings);
  if (wanted.some((m) => !m.length)) return [];
  const scored: Array<[number, IconEntry]> = [];
  for (const icon of list) {
    let score = 0;
    let all = true;
    for (const m of wanted) {
      let best = 0;
      for (const w of m) {
        if (icon.name === w) best = Math.max(best, 4);
        else if (icon.name.startsWith(w)) best = Math.max(best, 3);
        else if (icon.name.includes(w)) best = Math.max(best, 2);
        else if (` ${icon.words}`.includes(` ${w}`)) best = Math.max(best, 1);
      }
      if (!best) {
        all = false;
        break;
      }
      score += best;
    }
    if (all) scored.push([score, icon]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].name.length - b[1].name.length).map(([, i]) => i);
}

// The groups' names (the sets name theirs in English).
const GROUPS: Record<string, () => string> = {
  arrows: () => tr("أسهم", "Arrows"),
  brand: () => tr("علامات تجارية", "Brands"),
  brands: () => tr("علامات تجارية", "Brands"),
  "e-commerce": () => tr("تجارة وتسوّق", "Shopping"),
  commerce: () => tr("تجارة وتسوّق", "Shopping"),
  communication: () => tr("تواصل", "Communication"),
  communications: () => tr("تواصل", "Communication"),
  media: () => tr("وسائط", "Media"),
  health: () => tr("صحة", "Health"),
  "health & wellness": () => tr("صحة وعافية", "Health"),
  food: () => tr("أكل", "Food"),
  map: () => tr("خرائط", "Maps"),
  "maps & travel": () => tr("خرائط وسفر", "Maps & travel"),
  weather: () => tr("طقس", "Weather"),
  nature: () => tr("طبيعة", "Nature"),
  people: () => tr("ناس", "People"),
  finances: () => tr("مال", "Money"),
  currencies: () => tr("عملات", "Currencies"),
  shapes: () => tr("أشكال", "Shapes"),
  devices: () => tr("أجهزة", "Devices"),
  design: () => tr("تصميم", "Design"),
  system: () => tr("النظام", "System"),
  text: () => tr("نص", "Text"),
  editor: () => tr("تحرير", "Editing"),
  document: () => tr("ملفات", "Documents"),
  office: () => tr("مكتب", "Office"),
  sport: () => tr("رياضة", "Sport"),
  games: () => tr("ألعاب", "Games"),
  vehicles: () => tr("مركبات", "Vehicles"),
  buildings: () => tr("مباني", "Buildings"),
  animals: () => tr("حيوانات", "Animals"),
  mood: () => tr("مزاج", "Mood"),
  gestures: () => tr("إشارات", "Gestures"),
  badges: () => tr("شارات", "Badges"),
  charts: () => tr("رسوم بيانية", "Charts"),
  math: () => tr("رياضيات", "Maths"),
  numbers: () => tr("أرقام", "Numbers"),
  letters: () => tr("حروف", "Letters"),
  objects: () => tr("أغراض", "Objects"),
  "technology & development": () => tr("تقنية", "Technology"),
  photography: () => tr("تصوير", "Photography"),
  laundry: () => tr("غسيل", "Laundry"),
  symbols: () => tr("رموز", "Symbols"),
  zodiac: () => tr("أبراج", "Zodiac"),
};
export const groupName = (g: string) => GROUPS[g]?.() ?? g;

/** The shop's built-in icons (pageTree/icons.tsx), kept by name. */
export const BASIC_ICONS: Array<[string, () => string, string]> = [
  ["heart", () => tr("قلب", "Heart"), "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"],
  ["star", () => tr("نجمة", "Star"), "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"],
  ["truck", () => tr("توصيل", "Delivery"), "M3 6h11v9H3zM14 9h4l3 3v3h-7M7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"],
  ["shield", () => tr("حماية", "Protection"), "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4"],
  ["gift", () => tr("هدية", "Gift"), "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7s-1.5-4-4-4a2 2 0 0 0 0 4M12 7s1.5-4 4-4a2 2 0 0 1 0 4"],
  ["phone", () => tr("هاتف", "Phone"), "M6.6 3h3l1.5 4-2 1.3a11 11 0 0 0 6.6 6.6l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.2 2 2 0 0 1 6.6 3z"],
  ["whatsapp", () => tr("واتساب", "WhatsApp"), "M4 20l1.3-4A8 8 0 1 1 8 18.7zM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8a4.5 4.5 0 0 1-2.3-2.3l.8-1-1-2z"],
  ["mail", () => tr("بريد", "Mail"), "M3.5 6h17v12h-17zM4 7l8 6 8-6"],
  ["check", () => tr("صح", "Tick"), "M5 12.5l4.5 4.5L19 7.5"],
  ["sparkle", () => tr("لمعة", "Sparkle"), "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"],
  ["bag", () => tr("شنطة", "Bag"), "M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"],
  ["return", () => tr("إرجاع", "Return"), "M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2"],
];
/** A built-in icon's look in the editor (the shop draws it the same way). */
export const basicArt = (d: string): Art => ({ viewBox: "0 0 24 24", nodes: [{ t: "g", a: { fill: "none", stroke: "currentColor", "stroke-width": "1.6", "stroke-linecap": "round", "stroke-linejoin": "round" }, c: [{ t: "path", a: { d } }] }] });

/** The icon an icon element shows: its own drawing, else a built-in one by name. */
export function iconShown(props: Record<string, unknown>): Art | null {
  const art = props.art as Art | undefined;
  if (art?.nodes?.length) return art;
  const basic = BASIC_ICONS.find(([k]) => k === props.name);
  return basic ? basicArt(basic[2]) : null;
}
