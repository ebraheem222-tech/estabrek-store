/**
 * A template's own header and footer, as the gallery shows them (phase 11.3): the brand,
 * the menu, the cart, and the links at the bottom, in the template's style. A store that
 * uses the template keeps its own header and footer (they take the template's theme).
 */
import type { Words } from "../types";
import { H, T, part, type TK, type Tone } from "./lib";
import { el, grid, row, stack, t, type Node } from "./tree";

export type HeaderKind = "bar" | "centered" | "ticker" | "minimal";
export type FooterKind = "columns" | "giant" | "line";

const MENU = [t("جديد|New|חדש"), t("رجالي|Men|גברים"), t("نسائي|Women|נשים"), t("أطفال|Kids|ילדים"), t("عروض|Sale|מבצעים")];
const menu = (k: TK, look: "plain" | "underline" | "pills", center = false): Node =>
  el(k, "menu", { items: MENU.map((label) => ({ label, href: "/shop" })), layout: "row", look, phone: "fold" }, { style: { ...(center ? { self: "center" } : {}), size: 15, weight: 600 } });
const icons = (k: TK): Node => row(k, ["heart", "bag"].map((name) => ({ id: k.ids("ic"), type: "icon", props: { name }, style: { base: { iconSize: 22 } } }) as Node), { style: { gap: 16, wrap: false } });
const logo = (k: TK, brand: Words, size = 26): Node => H(k, brand, 3, { size, style: { weight: 800, lineHeight: 1, caps: k.s.head.caps ? "upper" : "none" }, motion: false });

export function header(k: TK, kind: HeaderKind, brand: Words, tone: Tone = "bg"): Node {
  const pad: [number, number, number, number] = [18, 24, 18, 24];
  if (kind === "centered")
    return part(k, t("الهيدر|Header|כותרת"), [stack(k, [logo(k, brand, 34), menu(k, "underline", true)], { style: { align: "center", gap: 14 } })], { tone, pad: [24, 24, 16, 24], phonePad: [16, 16, 12, 16] });
  if (kind === "minimal")
    return part(k, t("الهيدر|Header|כותרת"), [row(k, [logo(k, brand, 22), row(k, [T(k, t("القائمة|Menu|תפריט"), { size: 14, style: { weight: 700, caps: "upper" }, motion: false }), icons(k)], { style: { gap: 24, wrap: false } })], { style: { justify: "between", wrap: false } })], { tone, pad, phonePad: [14, 16, 14, 16] });
  const bar = row(k, [logo(k, brand), menu(k, "plain"), icons(k)], { style: { justify: "between", wrap: false, gap: 24 } });
  if (kind === "ticker")
    return part(k, t("الهيدر|Header|כותרת"), [
      el(k, "marquee", { items: [t("توصيل مجاني فوق 300|Free delivery over 300|משלוח חינם מעל 300"), t("تبديل مقاس ببلاش|Free size swaps|החלפת מידה חינם"), t("إصدار جديد كل جمعة|A new drop every Friday|השקה חדשה בכל שישי")], speed: 30, separator: "✦" }, { style: { size: 13, weight: 700, bg: "text", color: "bg", pad: [8, 0, 8, 0] } }),
      stack(k, [bar], { style: { pad: [16, 24, 16, 24] }, phone: { pad: [12, 16, 12, 16] } }),
    ], { tone, full: true, pad: [0, 0, 0, 0], phonePad: [0, 0, 0, 0] });
  return part(k, t("الهيدر|Header|כותרת"), [bar], { tone, pad, phonePad: [14, 16, 14, 16] });
}

const LINKS: Array<[Words, Words[]]> = [
  [t("تسوّق|Shop|קנייה"), [t("جديد|New in|חדש"), t("الأكثر مبيعاً|Best sellers|רבי מכר"), t("عروض|Sale|מבצעים")]],
  [t("مساعدة|Help|עזרה"), [t("المقاسات|Sizing|מידות"), t("التوصيل|Delivery|משלוח"), t("الإرجاع|Returns|החזרות")]],
  [t("عنّا|About|עלינו"), [t("حكايتنا|Our story|הסיפור שלנו"), t("المحلات|Stores|חנויות"), t("تواصل|Contact|צור קשר")]],
];
const linkCol = (k: TK, [title, items]: [Words, Words[]], tone: Tone): Node =>
  stack(k, [T(k, title, { size: 13, style: { weight: 700, caps: "upper" }, motion: false }), ...items.map((label) => ({ id: k.ids("b"), type: "button", props: { label, href: "/shop", variant: "link" }, style: { base: { size: 15, weight: 400, ...(tone === "ink" ? { color: "bg" } : { color: "muted" }), decoration: { line: "none" } } } }) as Node)], { style: { gap: 10 } });

export function footer(k: TK, kind: FooterKind, brand: Words, line: Words, tone: Tone = "surface"): Node {
  const copy = T(k, t("© 2026 كل الحقوق محفوظة|© 2026 All rights reserved|© 2026 כל הזכויות שמורות"), { size: 13, style: { opacity: 0.7 }, motion: false });
  if (kind === "line")
    return part(k, t("الفوتر|Footer|כותרת תחתונה"), [row(k, [logo(k, brand, 20), row(k, LINKS.flatMap(([, items]) => items.slice(0, 1)).map((label) => T(k, label, { size: 14, style: { color: "muted" }, motion: false })), { style: { gap: 24 } }), copy], { style: { justify: "between", gap: 16 } })], { tone, pad: [36, 24, 36, 24], phonePad: [28, 16, 28, 16] });
  const cols = grid(k, 4, [stack(k, [logo(k, brand), T(k, line, { size: 14, style: { opacity: 0.75 }, motion: false })], { style: { gap: 12 } }), ...LINKS.map((c) => linkCol(k, c, tone))], { phoneColumns: 2, style: { gap: 32 }, motion: false });
  if (kind === "giant")
    return part(k, t("الفوتر|Footer|כותרת תחתונה"), [cols, H(k, brand, 1, { size: 200, style: { sizeMin: 72, lineHeight: 0.9, margin: [64, 0, 24, 0], textAlign: "center", opacity: 0.95 }, motion: false }), copy], { tone, pad: [72, 24, 32, 24] });
  return part(k, t("الفوتر|Footer|כותרת תחתונה"), [cols, { id: k.ids("dv"), type: "divider", props: {}, style: { base: { margin: [40, 0, 20, 0] } } }, copy], { tone, pad: [72, 24, 32, 24] });
}

