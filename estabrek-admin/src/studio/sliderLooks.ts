/**
 * A slider's shapes, arrows and dots as the editor names them (the shop draws them:
 * estabrek-storefront/src/pageTree/sliderLookCss.ts; the API keeps the same lists).
 */
export const SLIDER_LOOK_NAMES: [key: string, name: string, mark: string][] = [
  ["plain", "عادي|Plain|רגיל", "▭"],
  ["rounded", "زوايا مدوّرة|Rounded|מעוגל", "▢"],
  ["card", "بطاقة|Card|כרטיס", "🂠"],
  ["frame", "إطار لوحة|Gallery frame|מסגרת", "🖼"],
  ["polaroid", "بولارويد|Polaroid|פולרויד", "📷"],
  ["arch", "قوس|Arch|קשת", "⌓"],
  ["circle", "دائرة|Circle|עיגול", "◯"],
  ["blob", "شكل حي|Living blob|צורה חיה", "⬮"],
  ["ticket", "تذكرة|Ticket|כרטיס כניסה", "🎫"],
  ["film", "شريط فيلم|Film strip|סרט צילום", "🎞"],
  ["phone", "جوّا موبايل|In a phone|בתוך טלפון", "📱"],
  ["browser", "جوّا متصفح|In a browser|בתוך דפדפן", "🗔"],
  ["tilt", "مايل ثلاثي الأبعاد|3D tilt|הטיה תלת-ממדית", "◩"],
  ["stack", "أوراق فوق بعض|Stacked|ערימה", "❐"],
  ["peek", "الجاية بتبيّن|Next one peeks|הבאה מציצה", "▯▯"],
  ["trio", "تلاتة مع بعض|Three at once|שלוש יחד", "▯▯▯"],
];
export const SLIDER_ARROW_LOOK_NAMES: [string, string][] = [
  ["round", "دوائر|Round|עגולים"],
  ["square", "مربعات|Square|מרובעים"],
  ["bare", "أسهم بس|Arrows only|חצים בלבד"],
  ["glass", "زجاج|Glass|זכוכית"],
  ["outline", "إطار|Outline|קו מתאר"],
  ["corner", "مع بعض بالزاوية|Together in the corner|יחד בפינה"],
];
export const SLIDER_DOT_LOOK_NAMES: [string, string][] = [
  ["dots", "نقاط|Dots|נקודות"],
  ["lines", "خطوط|Lines|קווים"],
  ["bars", "أشرطة|Bars|פסים"],
  ["numbers", "أرقام|Numbers|מספרים"],
];
