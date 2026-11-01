/**
 * The shapes that cut an element (ScreenStyle.shape) as the editor shows them, each outline
 * on a 100×100 square (the shop's pageTree/css.ts cuts with the same outlines), and the
 * patterns a background can carry, drawn here the way the shop draws them.
 */
import { tr } from "../lib/words";

export const CUT_SHAPES: Array<[string, () => string, string]> = [
  ["rect", () => tr("مربع", "Square"), "M0 0H100V100H0Z"],
  ["rounded", () => tr("زوايا ناعمة", "Soft corners"), "M24 0H76A24 24 0 0 1 100 24V76A24 24 0 0 1 76 100H24A24 24 0 0 1 0 76V24A24 24 0 0 1 24 0Z"],
  ["pill", () => tr("كبسولة", "Pill"), "M30 10H70A40 40 0 0 1 70 90H30A40 40 0 0 1 30 10Z"],
  ["arch", () => tr("قوس", "Arch"), "M0 50A50 50 0 0 1 100 50V100H0Z"],
  ["circle", () => tr("دائرة", "Circle"), "M50 0A50 50 0 1 1 50 100A50 50 0 1 1 50 0Z"],
  ["squircle", () => tr("مربع ناعم", "Squircle"), "M50 0C90 0 100 10 100 50C100 90 90 100 50 100C10 100 0 90 0 50C0 10 10 0 50 0Z"],
  ["hexagon", () => tr("سداسي", "Hexagon"), "M25 3L75 3L100 50L75 97L25 97L0 50Z"],
  ["octagon", () => tr("ثماني", "Octagon"), "M30 0H70L100 30V70L70 100H30L0 70V30Z"],
  ["pentagon", () => tr("خماسي", "Pentagon"), "M50 0L100 38L81 100H19L0 38Z"],
  ["diamond", () => tr("معيّن", "Diamond"), "M50 0L100 50L50 100L0 50Z"],
  ["triangle", () => tr("مثلث", "Triangle"), "M50 0L100 100H0Z"],
  ["star", () => tr("نجمة", "Star"), "M50 0L61.8 35.4H98.1L68.7 57.3L79.9 92.7L50 70.8L20.1 92.7L31.3 57.3L1.9 35.4H38.2Z"],
  ["heart", () => tr("قلب", "Heart"), "M50 92C20 70 0 52 0 30C0 13 13 2 27 2C38 2 46 8 50 17C54 8 62 2 73 2C87 2 100 13 100 30C100 52 80 70 50 92Z"],
  ["flower", () => tr("وردة", "Flower"), "M50 0C55.1 0 59.4 10.6 65.3 13C71.2 15.5 81.7 11 85.4 14.6C89 18.3 84.5 28.8 87 34.7C89.4 40.6 100 44.9 100 50C100 55.1 89.4 59.4 87 65.3C84.5 71.2 89 81.7 85.4 85.4C81.7 89 71.2 84.5 65.3 87C59.4 89.4 55.1 100 50 100C44.9 100 40.6 89.4 34.7 87C28.8 84.5 18.3 89 14.6 85.4C11 81.7 15.5 71.2 13 65.3C10.6 59.4 0 55.1 0 50C0 44.9 10.6 40.6 13 34.7C15.5 28.8 11 18.3 14.6 14.6C18.3 11 28.8 15.5 34.7 13C40.6 10.6 44.9 0 50 0Z"],
  ["blob", () => tr("فقاعة", "Blob"), "M50 4C62.4 3.5 82.3 9.6 89.1 18.8C95.9 28 94 46.9 90.9 59.3C87.9 71.8 81 88.6 71 93.7C61 98.7 42.5 95.1 30.9 89.6C19.3 84.2 3.9 72.4 1.3 61.1C-1.4 49.8 6.7 31.5 14.8 21.9C22.9 12.4 37.6 4.5 50 4Z"],
  ["blob2", () => tr("فقاعة تانية", "Another blob"), "M50 0C61.4 -0.1 77.8 17.7 84.6 30C91.5 42.3 96.9 63.3 91.1 73.8C85.4 84.3 64.1 92.8 50 93C35.9 93.2 12.3 85.4 6.7 75C1.1 64.6 9 43 16.2 30.5C23.4 18 38.6 0.1 50 0Z"],
  ["leaf", () => tr("ورقة", "Leaf"), "M0 100C0 40 40 0 100 0C100 60 60 100 0 100Z"],
  ["drop", () => tr("نقطة", "Drop"), "M50 0C70 30 95 48 95 66A45 34 0 0 1 5 66C5 48 30 30 50 0Z"],
  ["shield", () => tr("درع", "Shield"), "M50 0L95 14V50C95 75 75 92 50 100C25 92 5 75 5 50V14Z"],
  ["ticket", () => tr("تذكرة", "Ticket"), "M0 0H100V40A10 10 0 0 0 100 60V100H0V60A10 10 0 0 0 0 40Z"],
  ["bubble", () => tr("فقاعة كلام", "Speech bubble"), "M10 0H90A10 10 0 0 1 100 10V70A10 10 0 0 1 90 80H35L15 100V80H10A10 10 0 0 1 0 70V10A10 10 0 0 1 10 0Z"],
  ["plus", () => tr("زائد", "Plus"), "M35 0H65V35H100V65H65V100H35V65H0V35H35Z"],
  ["slant", () => tr("مائل", "Slanted"), "M20 0H100L80 100H0Z"],
  ["wave", () => tr("أسفل متموّج", "Wavy bottom"), "M0 0H100V86C83 100 67 72 50 86C33 100 17 72 0 86Z"],
  ["tilt", () => tr("أسفل مائل", "Tilted bottom"), "M0 0H100V84L0 100Z"],
];

export const PATTERN_KINDS: Array<[string, () => string]> = [
  ["dots", () => tr("نقاط", "Dots")],
  ["polka", () => tr("نقاط متبادلة", "Polka")],
  ["grid", () => tr("شبكة", "Grid")],
  ["lines", () => tr("خطوط", "Lines")],
  ["columns", () => tr("أعمدة", "Columns")],
  ["diagonal", () => tr("خطوط مائلة", "Diagonal")],
  ["stripes", () => tr("أشرطة", "Stripes")],
  ["checks", () => tr("مربعات", "Checks")],
  ["hatch", () => tr("شبك مائل", "Cross-hatch")],
  ["zigzag", () => tr("متعرّج", "Zigzag")],
  ["rings", () => tr("حلقات", "Rings")],
  ["triangles", () => tr("مثلثات", "Triangles")],
];

/** A pattern's layers, sizes and places (the same as the shop's pageTree/css.ts patternOf), for previews. */
export function patternCss(kind: string, c: string, s: number): { backgroundImage: string; backgroundSize: string; backgroundPosition: string } {
  const t = "transparent";
  const r = +(s * 0.12).toFixed(1);
  const w = Math.max(1, +(s * 0.06).toFixed(1));
  const at = (x: string, n: number) => Array(n).fill(x).join(",");
  const out = (backgroundImage: string, backgroundSize: string, backgroundPosition: string) => ({ backgroundImage, backgroundSize, backgroundPosition });
  switch (kind) {
    case "polka":
      return out(at(`radial-gradient(${c} ${r}px,${t} ${r + 0.6}px)`, 2), at(`${s}px ${s}px`, 2), `0 0,${s / 2}px ${s / 2}px`);
    case "grid":
      return out(`linear-gradient(${c} ${w}px,${t} ${w}px),linear-gradient(90deg,${c} ${w}px,${t} ${w}px)`, at(`${s}px ${s}px`, 2), "0 0,0 0");
    case "lines":
      return out(`linear-gradient(${c} ${w}px,${t} ${w}px)`, `100% ${s}px`, "0 0");
    case "columns":
      return out(`linear-gradient(90deg,${c} ${w}px,${t} ${w}px)`, `${s}px 100%`, "0 0");
    case "diagonal":
      return out(`repeating-linear-gradient(45deg,${c} 0 ${w}px,${t} ${w}px ${s}px)`, "auto", "0 0");
    case "stripes":
      return out(`repeating-linear-gradient(-45deg,${c} 0 ${s / 2}px,${t} ${s / 2}px ${s}px)`, "auto", "0 0");
    case "checks":
      return out(`conic-gradient(${c} 25%,${t} 0 50%,${c} 0 75%,${t} 0)`, `${s}px ${s}px`, "0 0");
    case "hatch":
      return out(`repeating-linear-gradient(45deg,${c} 0 ${w}px,${t} ${w}px ${s}px),repeating-linear-gradient(-45deg,${c} 0 ${w}px,${t} ${w}px ${s}px)`, "auto,auto", "0 0,0 0");
    case "zigzag":
      return out(`linear-gradient(135deg,${c} 25%,${t} 25%),linear-gradient(225deg,${c} 25%,${t} 25%),linear-gradient(315deg,${c} 25%,${t} 25%),linear-gradient(45deg,${c} 25%,${t} 25%)`, at(`${s}px ${s}px`, 4), `${-s / 2}px 0,${-s / 2}px 0,0 0,0 0`);
    case "rings":
      return out(`radial-gradient(${t} ${(s * 0.28).toFixed(1)}px,${c} ${(s * 0.28).toFixed(1)}px ${(s * 0.28 + w).toFixed(1)}px,${t} ${(s * 0.28 + w + 0.6).toFixed(1)}px)`, `${s}px ${s}px`, "0 0");
    case "triangles":
      return out(`linear-gradient(45deg,${c} 50%,${t} 50%)`, `${s}px ${s}px`, "0 0");
    default:
      return out(`radial-gradient(${c} ${r}px,${t} ${r + 0.6}px)`, `${s}px ${s}px`, "0 0");
  }
}
