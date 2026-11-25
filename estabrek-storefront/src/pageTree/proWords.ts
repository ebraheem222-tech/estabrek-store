/**
 * The shop's own words for the table of contents, the share buttons, the reading bar and the flip card, in the
 * page's language (a store's own words, set in the editor, come first). No DOM and no "@/" imports.
 */
import type { TreeLang } from "./tree";
import type { StoryWords } from "./StoryBar";

export type ProWords = {
  toc: string; tocEmpty: string;
  share: string; copied: string;
  networks: Record<"whatsapp" | "facebook" | "x" | "telegram" | "linkedin" | "pinterest" | "email" | "copy" | "native", string>;
  up: string; reading: string; readNote: string;
  flip: string;
  stories: StoryWords;
  /** The shop's games (ShopGames.tsx): a scratch card and a memory game that give a coupon. */
  games: GameWords;
};

export type GameWords = {
  scratch: string; reveal: string; won: string; code: string; copy: string; copied: string; inBag: string;
  memory: string; moves: string; left: string; again: string; lost: string; card: string; matched: string;
};

export const PRO_WORDS: Record<TreeLang, ProWords> = {
  ar: {
    toc: "بهالصفحة", tocEmpty: "لسا ما في عناوين بالصفحة.",
    share: "شارك", copied: "انتسخ الرابط!",
    networks: { whatsapp: "واتساب", facebook: "فيسبوك", x: "X", telegram: "تلغرام", linkedin: "لينكدإن", pinterest: "بينترست", email: "إيميل", copy: "انسخ الرابط", native: "شارك" },
    up: "لفوق", reading: "قديش قريت من الصفحة", readNote: "شريط القراءة (بيطلع على طرف الشاشة)",
    flip: "قلّب البطاقة",
    stories: { label: "قصص", open: "افتحي القصة", close: "سكّري", prev: "اللي قبل", next: "اللي بعد", pause: "وقّفي", play: "كمّلي", sound: "شغّلي الصوت", mute: "سكّتي الصوت", shopThis: "تسوّقي هالقطعة", empty: "لسا ما في قصص. ضيفيها من «القصص» بلوحة التحكم.", seen: "شفتيها" },
    games: { scratch: "اخدشي هون", reveal: "اكشفي الجائزة", won: "ربحتي!", code: "كود الخصم", copy: "انسخي الكود", copied: "انتسخ!", inBag: "حطّيناه بالحقيبة، بينطبق لحاله.", memory: "لاقي الأزواج", moves: "الحركات", left: "باقي", again: "جرّبي كمان مرة", lost: "خلصت الحركات. جرّبي كمان مرة!", card: "بطاقة", matched: "لقيتيها" },
  },
  en: {
    toc: "On this page", tocEmpty: "No headings on this page yet.",
    share: "Share", copied: "Link copied!",
    networks: { whatsapp: "WhatsApp", facebook: "Facebook", x: "X", telegram: "Telegram", linkedin: "LinkedIn", pinterest: "Pinterest", email: "Email", copy: "Copy link", native: "Share" },
    up: "Back to top", reading: "How much of the page you've read", readNote: "Reading bar (shows along the window's edge)",
    flip: "Turn the card",
    stories: { label: "Stories", open: "Open the story", close: "Close", prev: "Previous", next: "Next", pause: "Pause", play: "Play", sound: "Sound on", mute: "Sound off", shopThis: "Shop this piece", empty: "No stories yet. Add them under “Stories” in the admin.", seen: "seen" },
    games: { scratch: "Scratch here", reveal: "Reveal the prize", won: "You won!", code: "Discount code", copy: "Copy the code", copied: "Copied!", inBag: "It’s in your bag and applies by itself.", memory: "Find the pairs", moves: "Moves", left: "left", again: "Try again", lost: "Out of moves. Try again!", card: "Card", matched: "matched" },
  },
  he: {
    toc: "בעמוד הזה", tocEmpty: "עדיין אין כותרות בעמוד.",
    share: "שיתוף", copied: "הקישור הועתק!",
    networks: { whatsapp: "וואטסאפ", facebook: "פייסבוק", x: "X", telegram: "טלגרם", linkedin: "לינקדאין", pinterest: "פינטרסט", email: "אימייל", copy: "העתקת קישור", native: "שיתוף" },
    up: "חזרה למעלה", reading: "כמה מהעמוד קראתם", readNote: "פס קריאה (מופיע בקצה החלון)",
    flip: "הפיכת הכרטיס",
    stories: { label: "סטוריז", open: "פתיחת הסטורי", close: "סגירה", prev: "הקודם", next: "הבא", pause: "השהיה", play: "המשך", sound: "הפעלת קול", mute: "השתקה", shopThis: "לקנות את הפריט", empty: "עדיין אין סטוריז. הוסיפו אותם ב„סטוריז” בניהול.", seen: "נצפה" },
    games: { scratch: "גרדו כאן", reveal: "גילוי הפרס", won: "זכיתם!", code: "קוד הנחה", copy: "העתקת הקוד", copied: "הועתק!", inBag: "הוא בסל ומופעל לבד.", memory: "מצאו את הזוגות", moves: "מהלכים", left: "נותרו", again: "נסו שוב", lost: "נגמרו המהלכים. נסו שוב!", card: "כרטיס", matched: "נמצא" },
  },
};
