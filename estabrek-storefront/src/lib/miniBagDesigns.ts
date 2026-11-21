/**
 * The small bag's designs (admin → الإعدادات → السلة والدفع → تصميم السلة المصغّرة): what opens at the side of
 * the page when a piece is added (components/cinematic/RoseMiniBag.tsx). "" is the bag as it always was (the
 * rose store's frosted card); each of the 100 here is its own design, put together from a few choices the
 * stylesheet knows (app/minibag-designs.css): where it opens, how its pieces are listed, the shape of their
 * photos, its head and its foot, its colours, how it arrives, its letters and its corners, plus a few extras.
 * Colours come from the store's own theme (or the rose colours), so one design dresses every store its way.
 *
 * Shared with the admin, which imports this file by its path: no "@/" imports and no React here.
 */
export type MiniBagLang = "ar" | "en" | "he";
export type W3 = { ar: string; en: string; he: string };

/** Where it opens (on a phone most become a sheet from the bottom; drawers, the window, the band and the full screen keep their way). */
export const MINI_BAG_PLACES = ["float", "side", "start", "wide", "peek", "dock", "sheet", "center", "top", "full"] as const;
/** How its pieces are listed. */
export const MINI_BAG_LINES = ["rows", "cards", "tight", "tiles", "strip", "receipt", "hero"] as const;
/** The shape of each piece's photo. */
export const MINI_BAG_PHOTOS = ["arch", "soft", "square", "circle", "pill", "blob"] as const;
/** Its head: a tick that draws itself, a big title, a band of colour, a quiet label, the count in a circle, the piece's photo. */
export const MINI_BAG_HEADS = ["tick", "title", "band", "quiet", "count", "photo"] as const;
/** Its foot: total over one button, two buttons, one bar, a big total, a button as wide as the bag. */
export const MINI_BAG_FOOTS = ["stack", "pair", "bar", "big", "slab"] as const;
/** Its colours. "theme" and most others follow the store's theme; night, noir, mono and neon are their own. */
export const MINI_BAG_TONES = ["theme", "glass", "night", "ink", "paper", "mono", "soft", "mesh", "outline", "noir", "candy", "neon"] as const;
/** How it arrives. */
export const MINI_BAG_MOTIONS = ["slide", "rise", "drop", "zoom", "fade", "swing", "spring", "unfold", "blur"] as const;
/** Its letters: the theme's, the theme's display face for titles and sums, figures in mono, titles in spaced capitals. */
export const MINI_BAG_FONTS = ["theme", "display", "mono", "caps"] as const;
export const MINI_BAG_ROUNDS = [0, 6, 14, 22, 32] as const;
/** free: how much more for free delivery; colours: the pieces' colours as dots; secure: a safe-payment line; stagger: pieces come in one by one; remove: a button to take a piece out. */
export const MINI_BAG_EXTRAS = ["free", "colours", "secure", "stagger", "remove"] as const;
export const MINI_BAG_MOODS = ["calm", "bold", "luxe", "playful", "tech", "classic"] as const;
export const MINI_BAG_FAMILIES = ["drawer", "card", "sheet", "window", "band", "full"] as const;

export type MiniBagPlace = (typeof MINI_BAG_PLACES)[number];
export type MiniBagLines = (typeof MINI_BAG_LINES)[number];
export type MiniBagPhoto = (typeof MINI_BAG_PHOTOS)[number];
export type MiniBagHead = (typeof MINI_BAG_HEADS)[number];
export type MiniBagFoot = (typeof MINI_BAG_FOOTS)[number];
export type MiniBagTone = (typeof MINI_BAG_TONES)[number];
export type MiniBagMotion = (typeof MINI_BAG_MOTIONS)[number];
export type MiniBagFont = (typeof MINI_BAG_FONTS)[number];
export type MiniBagRound = (typeof MINI_BAG_ROUNDS)[number];
export type MiniBagExtra = (typeof MINI_BAG_EXTRAS)[number];
export type MiniBagMood = (typeof MINI_BAG_MOODS)[number];
export type MiniBagFamily = (typeof MINI_BAG_FAMILIES)[number];

export type MiniBagDesign = {
  id: string;
  name: W3;
  family: MiniBagFamily;
  mood: MiniBagMood;
  place: MiniBagPlace;
  lines: MiniBagLines;
  photo: MiniBagPhoto;
  head: MiniBagHead;
  foot: MiniBagFoot;
  tone: MiniBagTone;
  motion: MiniBagMotion;
  font: MiniBagFont;
  round: MiniBagRound;
  extras: MiniBagExtra[];
  /** The kinds of store it suits first (the store identity's industries). */
  fits: string[];
};

export const familyOf = (place: MiniBagPlace): MiniBagFamily =>
  place === "side" || place === "start" || place === "wide" ? "drawer"
  : place === "float" || place === "peek" || place === "dock" ? "card"
  : place === "sheet" ? "sheet" : place === "center" ? "window" : place === "top" ? "band" : "full";

export const MINI_BAG_FAMILY_NAMES: Record<MiniBagFamily, W3> = {
  drawer: { ar: "درج على الجنب", en: "Side drawers", he: "מגירות צד" },
  card: { ar: "بطاقة عائمة", en: "Floating cards", he: "כרטיסים צפים" },
  sheet: { ar: "من تحت", en: "From below", he: "מלמטה" },
  window: { ar: "شباك بالنص", en: "Centre windows", he: "חלון במרכז" },
  band: { ar: "شريط من فوق", en: "Top bands", he: "פס עליון" },
  full: { ar: "الشاشة كلها", en: "Full screen", he: "מסך מלא" },
};

export const MINI_BAG_MOOD_NAMES: Record<MiniBagMood, W3> = {
  calm: { ar: "هادي", en: "Calm", he: "רגוע" },
  bold: { ar: "جريء", en: "Bold", he: "נועז" },
  luxe: { ar: "فخم", en: "Luxurious", he: "יוקרתי" },
  playful: { ar: "مرح", en: "Playful", he: "שובב" },
  tech: { ar: "تقني", en: "Tech", he: "טכנולוגי" },
  classic: { ar: "كلاسيكي", en: "Classic", he: "קלאסי" },
};

export const MINI_BAG_TONE_NAMES: Record<MiniBagTone, W3> = {
  theme: { ar: "ألوان المتجر", en: "Store colours", he: "צבעי החנות" },
  glass: { ar: "زجاج", en: "Glass", he: "זכוכית" },
  night: { ar: "ليلي", en: "Night", he: "לילה" },
  ink: { ar: "لون المتجر كامل", en: "Solid colour", he: "צבע מלא" },
  paper: { ar: "ورق", en: "Paper", he: "נייר" },
  mono: { ar: "أبيض وأسود", en: "Black and white", he: "שחור ולבן" },
  soft: { ar: "ناعم", en: "Soft", he: "רך" },
  mesh: { ar: "تدرّج", en: "Gradient", he: "מעבר צבע" },
  outline: { ar: "خطوط عريضة", en: "Bold outlines", he: "קווי מתאר" },
  noir: { ar: "أسود وذهبي", en: "Black and gold", he: "שחור וזהב" },
  candy: { ar: "حلوى", en: "Candy", he: "ממתק" },
  neon: { ar: "نيون", en: "Neon", he: "ניאון" },
};

export const MINI_BAG_PLACE_NAMES: Record<MiniBagPlace, W3> = {
  float: { ar: "بطاقة فوق على الجنب", en: "Card at the top", he: "כרטיס למעלה" },
  side: { ar: "درج كامل الطول", en: "Full-height drawer", he: "מגירה לכל הגובה" },
  start: { ar: "درج من الجهة الثانية", en: "Drawer from the other side", he: "מגירה מהצד השני" },
  wide: { ar: "درج عريض بعمودين", en: "Wide two-column drawer", he: "מגירה רחבה בשני טורים" },
  peek: { ar: "نافذة صغيرة تحت أيقونة السلة", en: "Small pop-up under the bag icon", he: "חלונית קטנה מתחת לסמל הסל" },
  dock: { ar: "بطاقة بالزاوية تحت", en: "Card in the bottom corner", he: "כרטיס בפינה התחתונה" },
  sheet: { ar: "لوح من تحت", en: "Sheet from below", he: "גיליון מלמטה" },
  center: { ar: "شباك بالنص", en: "Window in the middle", he: "חלון באמצע" },
  top: { ar: "شريط من فوق", en: "Band from the top", he: "פס מלמעלה" },
  full: { ar: "الشاشة كلها", en: "The whole screen", he: "כל המסך" },
};

export const MINI_BAG_LINES_NAMES: Record<MiniBagLines, W3> = {
  rows: { ar: "صفوف", en: "Rows", he: "שורות" },
  cards: { ar: "بطاقات", en: "Cards", he: "כרטיסים" },
  tight: { ar: "قائمة مرتبة", en: "Tidy list", he: "רשימה מסודרת" },
  tiles: { ar: "مربعات صور", en: "Photo tiles", he: "אריחי תמונות" },
  strip: { ar: "شريط صور يتمرّر", en: "Scrolling photo strip", he: "רצועת תמונות נגללת" },
  receipt: { ar: "فاتورة", en: "Receipt", he: "קבלה" },
  hero: { ar: "القطعة الجديدة كبيرة", en: "The new piece large", he: "הפריט החדש בגדול" },
};

const W = (ar: string, en: string, he: string): W3 => ({ ar, en, he });

/** One design: its name, its mood, then "place lines photo head foot tone motion font round", its extras and the stores it suits. */
function d(id: string, name: W3, mood: MiniBagMood, look: string, extras: string, fits: string): MiniBagDesign {
  const [place, lines, photo, head, foot, tone, motion, font, round] = look.split(" ");
  return {
    id,
    name,
    family: familyOf(place as MiniBagPlace),
    mood,
    place: place as MiniBagPlace,
    lines: lines as MiniBagLines,
    photo: photo as MiniBagPhoto,
    head: head as MiniBagHead,
    foot: foot as MiniBagFoot,
    tone: tone as MiniBagTone,
    motion: motion as MiniBagMotion,
    font: font as MiniBagFont,
    round: Number(round) as MiniBagRound,
    extras: extras ? (extras.split(" ") as MiniBagExtra[]) : [],
    fits: fits ? fits.split(" ") : [],
  };
}

export const MINI_BAG_DESIGNS: MiniBagDesign[] = [
  // ——— Side drawers
  d("silk", W("حرير", "Silk", "משי"), "calm", "side rows arch tick stack glass slide display 22", "free colours", "fashion beauty jewelry"),
  d("linen", W("كتّان", "Linen", "פשתן"), "classic", "side cards soft title pair paper slide display 14", "free", "fashion home"),
  d("midnight", W("نص الليل", "Midnight", "חצות"), "tech", "side rows soft title bar night slide theme 14", "free secure", "electronics phones computers"),
  d("ledger", W("دفتر الحساب", "Ledger", "פנקס"), "classic", "side receipt square quiet stack mono slide mono 0", "free remove", "books digital general"),
  d("orchard", W("بستان", "Orchard", "פרדס"), "playful", "side tiles soft count pair soft spring theme 22", "free", "food flowers kids"),
  d("atelier", W("المشغل", "Atelier", "סדנה"), "luxe", "start rows arch title stack paper slide display 6", "colours", "fashion art jewelry"),
  d("harbour", W("المينا", "Harbour", "נמל"), "calm", "start cards soft band bar theme slide theme 14", "free secure", "marketplace general home"),
  d("gallery", W("المعرض", "Gallery", "גלריה"), "classic", "wide hero square quiet big mono slide caps 0", "free", "art music books"),
  d("bazaar", W("البازار", "Bazaar", "בזאר"), "playful", "wide tiles soft band pair candy spring theme 22", "free stagger", "kids food marketplace"),
  d("obsidian", W("حجر السبج", "Obsidian", "אובסידיאן"), "luxe", "side rows square quiet slab noir swing caps 0", "secure", "jewelry electronics"),
  d("circuit", W("دارة", "Circuit", "מעגל"), "tech", "side tight square count bar neon slide mono 6", "free stagger", "gaming electronics computers"),
  d("meadow", W("مرج أخضر", "Meadow", "אחו"), "playful", "side cards blob tick stack soft rise theme 32", "free colours", "flowers pets kids"),
  d("ink", W("حبر", "Ink", "דיו"), "bold", "side rows circle band stack ink slide display 14", "free", "general fashion"),
  d("study", W("غرفة القراءة", "Study", "חדר עיון"), "classic", "start receipt square title stack paper slide display 6", "", "books art"),
  d("glacier", W("جليد", "Glacier", "קרחון"), "calm", "side rows soft title pair glass swing theme 22", "free stagger", "beauty electronics"),
  d("ember", W("جمر", "Ember", "גחלת"), "bold", "side hero soft photo bar night slide display 14", "free", "food sports music"),
  d("pebble", W("حصوة", "Pebble", "חלוק נחל"), "calm", "side tight circle quiet bar soft slide theme 32", "remove", "home general pets"),
  d("runway", W("منصة العرض", "Runway", "מסלול"), "bold", "wide hero pill title slab mono slide caps 0", "colours", "fashion shoes sports"),
  d("workshop", W("الورشة", "Workshop", "בית מלאכה"), "tech", "side cards square count pair outline slide mono 0", "remove", "computers home digital"),
  d("velvet", W("مخمل", "Velvet", "קטיפה"), "luxe", "side rows arch photo stack noir slide display 22", "free colours", "jewelry beauty fashion"),

  // ——— Floating cards
  d("pearl", W("لولو", "Pearl", "פנינה"), "luxe", "float rows arch tick stack glass spring display 32", "colours", "beauty jewelry fashion"),
  d("note", W("ملاحظة", "Note", "פתק"), "calm", "peek tight soft tick bar theme drop theme 14", "", "general marketplace"),
  d("bubble", W("فقاعة", "Bubble", "בועה"), "playful", "peek strip circle count bar candy zoom theme 32", "", "kids food pets"),
  d("compass", W("بوصلة", "Compass", "מצפן"), "classic", "float cards soft title pair theme fade theme 14", "free secure", "general home sports"),
  d("ticket", W("تذكرة", "Ticket", "כרטיס"), "classic", "dock receipt square quiet slab paper rise mono 6", "free", "music books digital"),
  d("polaroid", W("صورة فورية", "Polaroid", "פולארויד"), "playful", "float hero square photo stack paper swing display 6", "colours", "art fashion"),
  d("pixel", W("بكسل", "Pixel", "פיקסל"), "tech", "dock tight square count bar neon zoom mono 0", "stagger", "gaming"),
  d("honey", W("عسل", "Honey", "דבש"), "playful", "float rows blob tick pair soft spring theme 32", "free", "food flowers"),
  d("graphite", W("غرافيت", "Graphite", "גרפיט"), "tech", "peek tight square quiet bar mono drop caps 0", "", "electronics computers phones"),
  d("lantern", W("فانوس", "Lantern", "פנס"), "calm", "float rows arch photo stack night zoom display 22", "free", "home food music"),
  d("confetti", W("قصاصات ملوّنة", "Confetti", "קונפטי"), "playful", "dock tiles circle count pair candy spring theme 32", "stagger", "kids"),
  d("stamp", W("طابع بريد", "Stamp", "בול"), "bold", "float receipt square band stack outline swing mono 0", "remove", "books art digital"),
  d("dew", W("ندى", "Dew", "טל"), "calm", "peek rows circle tick stack glass blur theme 22", "colours", "beauty flowers"),
  d("carbon", W("كربون", "Carbon", "קרבון"), "tech", "float rows square count slab night fade caps 6", "secure", "phones electronics sports"),
  d("gold-leaf", W("ورق ذهب", "Gold leaf", "עלה זהב"), "luxe", "float rows arch quiet slab noir unfold display 0", "colours", "jewelry"),
  d("postcard", W("بطاقة بريد", "Postcard", "גלויה"), "classic", "dock cards soft title pair paper rise display 14", "", "flowers home art"),
  d("arcade", W("صالة ألعاب", "Arcade", "ארקייד"), "tech", "float strip square band bar neon spring mono 6", "stagger", "gaming music"),
  d("cloud", W("غيمة", "Cloud", "ענן"), "playful", "dock rows blob tick stack soft fade theme 32", "free", "kids pets beauty"),
  d("mint", W("نعنع", "Mint", "נענע"), "calm", "peek tight soft count bar theme spring theme 14", "free", "food general"),
  d("quartz", W("كوارتز", "Quartz", "קוורץ"), "luxe", "float rows pill title stack glass swing display 22", "free colours", "beauty jewelry"),
  d("index", W("فهرس", "Index", "מפתח"), "classic", "peek receipt square quiet bar mono fade mono 0", "", "books digital computers"),
  d("sunset", W("غروب", "Sunset", "שקיעה"), "bold", "float hero soft photo bar mesh zoom display 22", "colours", "fashion beauty sports"),
  d("pocket", W("جيبة", "Pocket", "כיס"), "bold", "dock tight circle count bar ink rise theme 22", "remove", "phones general marketplace"),
  d("sticker", W("ستيكر", "Sticker", "מדבקה"), "playful", "float cards blob band pair outline spring theme 14", "stagger", "kids pets food"),
  d("aura", W("هالة", "Aura", "הילה"), "calm", "float rows circle tick stack mesh blur theme 32", "colours free", "beauty fashion music"),

  // ——— From below
  d("shelf", W("رف", "Shelf", "מדף"), "classic", "sheet strip soft title bar theme rise theme 22", "free", "general books home"),
  d("tray", W("صينية", "Tray", "מגש"), "calm", "sheet tiles soft count pair paper rise theme 14", "free", "food home"),
  d("showcase", W("فترينة", "Showcase", "חלון ראווה"), "luxe", "sheet strip arch photo bar glass rise display 32", "colours", "fashion jewelry beauty"),
  d("dashboard", W("لوحة القيادة", "Dashboard", "לוח מחוונים"), "tech", "sheet tight square count bar neon rise mono 6", "stagger free", "gaming electronics computers"),
  d("picnic", W("سيران", "Picnic", "פיקניק"), "playful", "sheet tiles blob band pair candy spring theme 32", "stagger", "kids food pets"),
  d("ivory", W("عاج", "Ivory", "שנהב"), "luxe", "sheet rows arch tick stack paper rise display 22", "free", "fashion jewelry"),
  d("console", W("كونسول", "Console", "קונסולה"), "tech", "sheet strip square quiet slab night rise caps 0", "", "gaming music electronics"),
  d("basket", W("سلة قش", "Basket", "סל נצרים"), "calm", "sheet cards soft title pair soft spring theme 22", "free", "food flowers home"),
  d("tide", W("موج", "Tide", "גאות"), "bold", "sheet rows circle band bar ink rise theme 32", "free", "sports general"),
  d("canvas", W("قماش الرسم", "Canvas", "קנבס"), "classic", "sheet hero square quiet big paper unfold display 0", "", "art books"),
  d("market", W("سوق الخضرة", "Market", "שוק"), "playful", "sheet tiles soft count bar theme spring theme 14", "free remove", "food marketplace"),
  d("stage", W("خشبة المسرح", "Stage", "במה"), "bold", "sheet strip pill photo slab noir rise caps 6", "", "music fashion"),
  d("lagoon", W("بحيرة", "Lagoon", "לגונה"), "calm", "sheet rows soft tick pair glass blur theme 32", "free colours", "beauty pets"),
  d("blueprint", W("مخطط", "Blueprint", "שרטוט"), "tech", "sheet tight square quiet bar outline rise mono 0", "remove", "computers home digital"),
  d("bloom", W("تفتّح", "Bloom", "פריחה"), "playful", "sheet cards blob photo stack mesh spring display 32", "colours", "flowers beauty"),

  // ——— Centre windows
  d("moment", W("لحظة", "Moment", "רגע"), "luxe", "center hero arch tick pair glass zoom display 32", "colours", "fashion beauty"),
  d("receipt", W("إيصال", "Receipt", "קבלה"), "classic", "center receipt square quiet big paper drop mono 0", "free", "general food books"),
  d("spotlight", W("بقعة ضو", "Spotlight", "זרקור"), "bold", "center hero soft photo slab night zoom display 14", "", "jewelry electronics music"),
  d("gift", W("هدية", "Gift", "מתנה"), "playful", "center cards blob band pair candy spring theme 32", "stagger", "kids flowers"),
  d("frame", W("برواز", "Frame", "מסגרת"), "classic", "center hero square quiet stack outline swing caps 0", "", "art books"),
  d("halo", W("هالة ضو", "Halo", "הילת אור"), "calm", "center rows circle count bar mesh blur theme 32", "colours free", "beauty music"),
  d("vault", W("خزنة", "Vault", "כספת"), "luxe", "center rows square quiet slab noir unfold caps 0", "secure", "jewelry digital"),
  d("level-up", W("مرحلة جديدة", "Level up", "עולים שלב"), "tech", "center hero square count bar neon spring mono 6", "stagger", "gaming"),
  d("porcelain", W("بورسلان", "Porcelain", "פורצלן"), "luxe", "center rows arch title stack paper fade display 22", "free", "home jewelry"),
  d("checklist", W("قائمة مشتريات", "Checklist", "רשימת קניות"), "calm", "center tight soft tick bar theme fade theme 14", "free remove", "general marketplace digital"),
  d("trophy", W("كاس", "Trophy", "גביע"), "bold", "center hero pill band pair ink zoom caps 14", "", "sports gaming"),
  d("petal", W("ورقة ورد", "Petal", "עלה כותרת"), "playful", "center cards blob tick stack soft swing display 32", "colours", "flowers beauty kids"),
  d("studio", W("الاستوديو", "Studio", "סטודיו"), "classic", "center tiles square quiet pair mono fade caps 0", "", "art music phones"),
  d("signal", W("إشارة", "Signal", "אות"), "tech", "center tight circle count slab night drop mono 6", "secure", "phones electronics computers"),
  d("hearth", W("موقدة", "Hearth", "אח"), "calm", "center hero soft photo pair paper zoom display 14", "free", "food home pets"),

  // ——— Top bands
  d("ribbon", W("شريطة", "Ribbon", "סרט"), "calm", "top strip soft tick bar theme drop theme 14", "free", "general fashion"),
  d("marquee", W("يافطة مضوية", "Marquee", "שלט מואר"), "tech", "top strip square band bar neon drop mono 0", "stagger", "gaming music"),
  d("horizon", W("أفق", "Horizon", "אופק"), "luxe", "top strip arch photo bar glass drop display 22", "colours", "fashion beauty jewelry"),
  d("headline", W("مانشيت", "Headline", "כותרת ראשית"), "classic", "top tight square quiet bar mono drop caps 0", "", "books digital electronics"),
  d("awning", W("مظلة الدكان", "Awning", "סוכך"), "playful", "top strip soft band pair candy spring theme 22", "stagger", "food kids"),
  d("skyline", W("خط السما", "Skyline", "קו רקיע"), "tech", "top strip square count bar night drop caps 6", "free", "electronics computers phones sports"),
  d("garland", W("إكليل", "Garland", "זר"), "playful", "top strip blob tick pair soft spring theme 32", "colours", "flowers kids"),
  d("telegram", W("برقية", "Telegram", "מברק"), "classic", "top receipt square quiet bar paper unfold mono 0", "free", "books art"),
  d("crown", W("تاج", "Crown", "כתר"), "luxe", "top strip arch quiet slab noir drop display 0", "colours", "jewelry fashion"),
  d("ticker", W("شريط الأخبار", "Ticker", "טיקר"), "bold", "top tight square count bar ink drop mono 0", "free", "marketplace general sports"),
  d("breeze", W("نسمة", "Breeze", "משב רוח"), "calm", "top strip circle tick bar glass blur theme 32", "free", "beauty pets home"),
  d("banner", W("راية", "Banner", "דגל"), "bold", "top strip soft band bar outline drop caps 0", "remove", "sports general"),
  d("aurora", W("شفق", "Aurora", "זוהר"), "playful", "top strip pill photo bar mesh drop display 32", "colours", "music beauty"),

  // ——— Full screen
  d("boutique", W("بوتيك", "Boutique", "בוטיק"), "luxe", "full hero arch photo big paper fade display 22", "free colours", "fashion jewelry beauty"),
  d("warehouse", W("مستودع", "Warehouse", "מחסן"), "classic", "full tiles square count bar mono fade caps 0", "remove free", "marketplace general home"),
  d("cinema", W("سينما", "Cinema", "קולנוע"), "bold", "full hero soft photo big night zoom display 14", "", "music electronics gaming"),
  d("playroom", W("غرفة اللعب", "Playroom", "חדר משחקים"), "playful", "full tiles blob band pair candy spring theme 32", "stagger free", "kids pets"),
  d("library", W("مكتبة", "Library", "ספרייה"), "classic", "full receipt square title big paper fade display 6", "free", "books art digital"),
  d("arena", W("ساحة", "Arena", "זירה"), "tech", "full tiles square count slab neon zoom mono 6", "stagger", "gaming sports"),
  d("greenhouse", W("بيت زجاج", "Greenhouse", "חממה"), "calm", "full tiles soft tick pair glass blur theme 22", "free colours", "flowers home food"),
  d("monogram", W("مونوغرام", "Monogram", "מונוגרמה"), "luxe", "full hero square quiet slab noir unfold caps 0", "secure", "jewelry fashion"),
  d("kitchen", W("مطبخ", "Kitchen", "מטבח"), "calm", "full cards soft title bar soft rise theme 22", "free remove", "food home"),
  d("lab", W("مختبر", "Lab", "מעבדה"), "tech", "full tight square count bar outline fade mono 0", "free", "computers electronics digital phones"),
  d("festival", W("مهرجان", "Festival", "פסטיבל"), "playful", "full strip pill band pair mesh spring display 32", "colours stagger", "music kids fashion"),
  d("zen", W("سكينة", "Zen", "זן"), "calm", "full rows circle quiet stack soft fade display 32", "", "home beauty books"),
];

const BY_ID = new Map(MINI_BAG_DESIGNS.map((x) => [x.id, x]));
export const MINI_BAG_IDS = MINI_BAG_DESIGNS.map((x) => x.id);

/** The design by its id; "" or anything unknown is none (the bag as it always was). */
export function miniBagById(id: unknown): MiniBagDesign | null {
  return typeof id === "string" ? BY_ID.get(id) ?? null : null;
}

/** Those that suit a store's industry first, then the rest (their order kept). */
export function miniBagsFor(industry: string | null | undefined): MiniBagDesign[] {
  if (!industry) return MINI_BAG_DESIGNS;
  return [...MINI_BAG_DESIGNS.filter((x) => x.fits.includes(industry)), ...MINI_BAG_DESIGNS.filter((x) => !x.fits.includes(industry))];
}

/** What the stylesheet reads, on the bag's outer element (the shop's bag and the admin's pictures of it). */
export function miniBagAttrs(x: MiniBagDesign): Record<string, string> {
  return {
    "data-mb": x.id,
    "data-mb-place": x.place,
    "data-mb-lines": x.lines,
    "data-mb-photo": x.photo,
    "data-mb-head": x.head,
    "data-mb-foot": x.foot,
    "data-mb-tone": x.tone,
    "data-mb-motion": x.motion,
    "data-mb-font": x.font,
    "data-mb-round": String(x.round),
    "data-mb-extras": x.extras.join(" "),
  };
}

export const miniBagHas = (x: MiniBagDesign, extra: MiniBagExtra) => x.extras.includes(extra);
