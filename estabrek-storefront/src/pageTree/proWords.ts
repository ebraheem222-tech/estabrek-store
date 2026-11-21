/**
 * The shop's own words for the table of contents, the share buttons, the reading bar and the flip card, in the
 * page's language (a store's own words, set in the editor, come first). No DOM and no "@/" imports.
 */
import type { TreeLang } from "./tree";

export type ProWords = {
  toc: string; tocEmpty: string;
  share: string; copied: string;
  networks: Record<"whatsapp" | "facebook" | "x" | "telegram" | "linkedin" | "pinterest" | "email" | "copy" | "native", string>;
  up: string; reading: string; readNote: string;
  flip: string;
};

export const PRO_WORDS: Record<TreeLang, ProWords> = {
  ar: {
    toc: "بهالصفحة", tocEmpty: "لسا ما في عناوين بالصفحة.",
    share: "شارك", copied: "انتسخ الرابط!",
    networks: { whatsapp: "واتساب", facebook: "فيسبوك", x: "X", telegram: "تلغرام", linkedin: "لينكدإن", pinterest: "بينترست", email: "إيميل", copy: "انسخ الرابط", native: "شارك" },
    up: "لفوق", reading: "قديش قريت من الصفحة", readNote: "شريط القراءة (بيطلع على طرف الشاشة)",
    flip: "قلّب البطاقة",
  },
  en: {
    toc: "On this page", tocEmpty: "No headings on this page yet.",
    share: "Share", copied: "Link copied!",
    networks: { whatsapp: "WhatsApp", facebook: "Facebook", x: "X", telegram: "Telegram", linkedin: "LinkedIn", pinterest: "Pinterest", email: "Email", copy: "Copy link", native: "Share" },
    up: "Back to top", reading: "How much of the page you've read", readNote: "Reading bar (shows along the window's edge)",
    flip: "Turn the card",
  },
  he: {
    toc: "בעמוד הזה", tocEmpty: "עדיין אין כותרות בעמוד.",
    share: "שיתוף", copied: "הקישור הועתק!",
    networks: { whatsapp: "וואטסאפ", facebook: "פייסבוק", x: "X", telegram: "טלגרם", linkedin: "לינקדאין", pinterest: "פינטרסט", email: "אימייל", copy: "העתקת קישור", native: "שיתוף" },
    up: "חזרה למעלה", reading: "כמה מהעמוד קראתם", readNote: "פס קריאה (מופיע בקצה החלון)",
    flip: "הפיכת הכרטיס",
  },
};
