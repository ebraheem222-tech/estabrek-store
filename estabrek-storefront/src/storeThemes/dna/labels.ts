/** What the designs' sectors, page skeletons and colours are called, in Arabic, English and Hebrew. */
import type { DNA, Sector, Words } from "./axes";

const w = (ar: string, en: string, he: string): Words => ({ ar, en, he });

export const SECTOR_NAMES: Record<Sector, Words> = {
  fashion: w("أزياء وإكسسوارات", "Fashion and accessories", "אופנה ואביזרים"),
  beauty: w("جمال وعناية", "Beauty and care", "יופי וטיפוח"),
  tech: w("إلكترونيات وتقنية", "Electronics and tech", "אלקטרוניקה וטכנולוגיה"),
  home: w("بيت ومعيشة", "Home and living", "בית ומגורים"),
  food: w("أكل وشرب", "Food and drink", "אוכל ושתייה"),
  health: w("صحة", "Health", "בריאות"),
  kids: w("أطفال وعيلة", "Kids and family", "ילדים ומשפחה"),
  culture: w("هوايات وثقافة", "Hobbies and culture", "תחביבים ותרבות"),
  outdoors: w("رياضة وطبيعة", "Sport and outdoors", "ספורט וטבע"),
  auto: w("سيارات", "Cars and bikes", "רכב"),
  pets: w("حيوانات", "Pets", "חיות מחמד"),
  services: w("خدمات ومنتجات رقمية", "Services and digital", "שירותים ודיגיטל"),
  gifts: w("هدايا ومناسبات", "Gifts and occasions", "מתנות ואירועים"),
  general: w("عام وجملة", "General and wholesale", "כללי וסיטונאי"),
};

export const ARCHETYPE_NAMES: Record<DNA["archetype"], Words> = {
  cinema: w("افتتاحية سينمائية", "a cinematic opening", "פתיחה קולנועית"),
  bento: w("شبكة بنتو", "a bento grid", "רשת בנטו"),
  magazine: w("صفحة مجلة", "a magazine page", "עמוד מגזין"),
  catalog: w("كتالوج غني", "a rich catalogue", "קטלוג עשיר"),
  story: w("قصة بالسكرول", "a scrolling story", "סיפור בגלילה"),
  rail: w("شرائط أفقية", "sliding rails", "מסילות אופקיות"),
  spec: w("مواصفات ومقارنة", "specs and comparisons", "מפרטים והשוואות"),
  menu: w("منيو أول الصفحة", "a menu up front", "תפריט בראש הדף"),
  booking: w("حجز أول الصفحة", "booking up front", "הזמנה בראש הדף"),
  lookbook: w("لوك بوك", "a lookbook", "לוקבוק"),
  countdown: w("عدّاد", "a countdown", "ספירה לאחור"),
  collage: w("كولاج", "a collage", "קולאז׳"),
  gallery: w("جدار معرض", "a gallery wall", "קיר גלריה"),
  split: w("صفحة بنصّين", "a split page", "דף מפוצל"),
  map: w("خريطة", "a map", "מפה"),
  showroom: w("صالة عرض ثلاثية", "a 3D showroom", "אולם תצוגה תלת־ממדי"),
  minimal: w("بساطة تامة", "pure minimalism", "מינימליזם טהור"),
  playground: w("ملعب ألوان", "a playground of colour", "מגרש צבעים"),
  market: w("سوق بأقسام", "a market of aisles", "שוק במחלקות"),
  recipe: w("خطوات ووصفات", "steps and recipes", "שלבים ומתכונים"),
};

export const COLOUR_NAMES: Record<DNA["colours"], Words> = {
  mono: w("أبيض وأسود", "black and white", "שחור ולבן"),
  earth: w("ألوان ترابية", "earth tones", "גווני אדמה"),
  pastel: w("باستيل", "pastels", "פסטל"),
  neon: w("نيون", "neon", "ניאון"),
  jewel: w("ألوان جواهر", "jewel tones", "גווני אבני חן"),
  citrus: w("ألوان حمضيات", "citrus colours", "צבעי הדרים"),
  nordic: w("ألوان اسكندنافية", "Nordic tones", "גוונים נורדיים"),
  desert: w("ألوان الصحرا", "desert tones", "גווני מדבר"),
  ocean: w("ألوان البحر", "ocean blues", "כחולי ים"),
  candy: w("ألوان سكاكر", "candy colours", "צבעי ממתקים"),
  blackgold: w("أسود وذهبي", "black and gold", "שחור וזהב"),
  clinic: w("أبيض نظيف", "clean white", "לבן נקי"),
  forest: w("أخضر غابة", "forest greens", "ירוקי יער"),
  sunset: w("ألوان الغروب", "sunset colours", "צבעי שקיעה"),
  steel: w("فولاذي", "steel", "פלדה"),
  royal: w("ألوان ملكية", "royal tones", "גוונים מלכותיים"),
  gold: w("ذهبي عسلي", "honey gold", "זהב דבש"),
};
