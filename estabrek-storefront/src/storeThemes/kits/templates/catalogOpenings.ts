import { BTN, EB, H, PIC, T, part, type TK } from "../lib";
import { cols, grid, row, stack, t, type Node } from "../tree";
import type { Industry } from "./industries";

/** Editable opening compositions. All artwork and captions belong to the category profile. */
export function expandedOpening(k: TK, d: Industry, id: string): Node | null {
  const shop = t("اكتشف المجموعة|Explore the collection|גלו את הקולקציה");
  const image = (key = "hero", aspect = "4 / 5") => PIC(k, key, key === "hero" ? d.title : d.products[Number(key.split("-")[1]) - 1] ?? d.label, { aspect });
  const head = () => H(k, d.title, 1);
  const intro = () => [EB(k, d.label), head(), T(k, d.intro), BTN(k, shop, "/shop")];
  const text = () => stack(k, intro(), { style: { gap: 22, justify: "center" } });
  const detail = (i: number) => stack(k, [EB(k, t(`0${i + 1}`)), H(k, d.details[i % d.details.length], 3), T(k, d.guide, { size: 14 })], { style: { gap: 12 } });
  const caption = (i: number, aspect = "1 / 1") => stack(k, [image(`product-${i + 1}`, aspect), T(k, d.products[i], { size: 14, motion: false })], { style: { gap: 12 } });
  const columns = (widths: number[], cells: Node[][]) => cols(k, widths, cells, { style: { gap: 32, align: "center" }, cellStyle: { gap: 20 } });
  const panel = (children: Node[], tone: "bg" | "surface" | "soft" = "bg") => part(k, d.label, children, { tone });
  switch (id) {
    case "spotlight": return panel([columns([5, 7], [intro(), [image("hero", "4 / 3"), row(k, [caption(0), caption(1)], { style: { gap: 16, wrap: false } })]])]);
    case "horizon": return panel([row(k, [EB(k, d.label), T(k, d.details[0])], { style: { justify: "between" } }), image("hero", "21 / 9"), columns([7, 5], [[head()], [T(k, d.intro), BTN(k, shop, "/shop")]])]);
    case "mosaic": return panel([grid(k, 3, [text(), image("hero", "1 / 1"), caption(0), caption(1), stack(k, [H(k, d.details[0], 3), T(k, d.guide)], { style: { pad: [24, 24, 24, 24], bg: "accent-soft" } }), caption(2)], { phoneColumns: 1, style: { gap: 18 } })]);
    case "boutique": return panel([stack(k, [EB(k, d.label), head()], { style: { align: "center", textAlign: "center", gap: 18 } }), columns([3, 6, 3], [[T(k, d.intro), BTN(k, shop, "/shop")], [image("hero", "4 / 5")], [detail(0), detail(1)]])]);
    case "archive": return panel([row(k, [head(), EB(k, d.label)], { style: { justify: "between", align: "end" } }), columns([2, 7, 3], [[...d.collections.map((label) => BTN(k, label, "/shop", "alt"))], [image("hero", "4 / 3")], [T(k, d.story), BTN(k, shop, "/shop")]])]);
    case "capsule": return panel([stack(k, intro(), { style: { align: "center", textAlign: "center", gap: 18, maxWidth: "780px", self: "center" } }), grid(k, 3, [caption(0, "3 / 4"), image("hero", "3 / 4"), caption(1, "3 / 4")], { phoneColumns: 1, style: { gap: 22, margin: [32, 0, 0, 0] } })]);
    case "duet": return panel([columns([6, 6], [intro(), [image("hero", "4 / 5")]]), grid(k, 2, [caption(0, "16 / 9"), caption(1, "16 / 9")], { phoneColumns: 2, style: { gap: 20, margin: [24, 0, 0, 0] } })]);
    case "canvas": return panel([columns([7, 5], [[head(), image("hero", "5 / 4")], [EB(k, d.label), T(k, d.intro), grid(k, 2, [caption(0), caption(1)], { phoneColumns: 2 }), BTN(k, shop, "/shop")]])]);
    case "journal": return panel([EB(k, d.label), head(), columns([2, 6, 4], [[detail(0)], [image("hero", "4 / 5")], [T(k, d.story), caption(0), BTN(k, shop, "/shop")]])], "surface");
    case "portrait": return panel([columns([4, 5, 3], [intro(), [image("hero", "3 / 4")], [caption(0, "3 / 4")]]), row(k, d.details.map((label) => T(k, label, { size: 14 })), { style: { justify: "between", margin: [24, 0, 0, 0] } })]);
    case "terrace": return panel([columns([8, 4], [[head(), T(k, d.intro)], [BTN(k, shop, "/shop")]]), grid(k, 3, [image("hero", "4 / 5"), caption(0, "4 / 5"), caption(1, "4 / 5")], { phoneColumns: 1, style: { gap: 24 } }), grid(k, 3, [detail(0), detail(1), detail(2)], { phoneColumns: 1 })]);
    case "loft": return panel([grid(k, 3, [text(), stack(k, [image("hero", "3 / 4"), T(k, d.details[0])], { style: { gap: 12 } }), stack(k, [caption(0), caption(1)], { style: { gap: 24 } })], { phoneColumns: 1, style: { gap: 28 } })]);
    case "prism": return panel([columns([5, 7], [intro(), [grid(k, 2, [image("hero", "4 / 3"), caption(0), caption(1), caption(2)], { phoneColumns: 2, style: { gap: 12 } })]]), row(k, [T(k, d.guide, { size: 14 }), BTN(k, d.details[0], "/shop", "alt")], { style: { justify: "between", margin: [32, 0, 0, 0] } })], "surface");
    case "atlas": return panel([columns([8, 4], [[EB(k, d.label), head()], [T(k, d.intro)]]), grid(k, 3, [detail(0), detail(1), detail(2)], { phoneColumns: 1 }), image("hero", "21 / 9"), BTN(k, shop, "/shop")]);
    case "bloom": return panel([columns([4, 4, 4], [[EB(k, d.label), head(), BTN(k, shop, "/shop")], [PIC(k, "hero", d.title, { aspect: "1 / 1", radius: 999 })], [T(k, d.intro), caption(0)]]), T(k, d.story, { size: 18 })], "soft");
    case "orbit": return panel([stack(k, [EB(k, d.label), head(), T(k, d.intro)], { style: { gap: 18, align: "center", textAlign: "center" } }), columns([3, 6, 3], [[caption(0), detail(0)], [image("hero", "1 / 1"), BTN(k, shop, "/shop")], [detail(1), caption(1)]])]);
    case "avenue": return panel([columns([4, 4, 4], [[image("hero", "3 / 4")], intro(), [caption(0, "3 / 4"), T(k, d.details[0])]])]);
    case "mono": return panel([row(k, [EB(k, d.label), BTN(k, shop, "/shop", "alt")], { style: { justify: "between" } }), head(), image("hero", "16 / 9"), columns([4, 4, 4], [[T(k, d.intro)], [T(k, d.story)], [T(k, d.guide)]])]);
    case "craft": return panel([columns([7, 5], [[image("hero", "4 / 5")], intro()]), columns([5, 7], [[caption(0, "16 / 9")], [grid(k, 2, [detail(0), detail(1)], { phoneColumns: 1 })]])], "surface");
    case "lounge": return panel([columns([7, 5], [[image("hero", "5 / 4")], [EB(k, d.label), head(), T(k, d.intro)]]), columns([4, 5, 3], [[BTN(k, shop, "/shop")], [T(k, d.story)], [caption(0)]])]);
    case "pulse": return panel([EB(k, d.label), columns([9, 3], [[head()], [BTN(k, shop, "/shop")]]), image("hero", "16 / 9"), columns([6, 6], [[T(k, d.intro)], [row(k, [detail(0), detail(1)], { style: { align: "start", gap: 24 } })]])]);
    case "vista": return panel([columns([4, 8], [[EB(k, d.label), BTN(k, shop, "/shop")], [head(), T(k, d.intro)]]), grid(k, 5, [image("hero", "3 / 4"), caption(0, "3 / 4"), caption(1, "3 / 4"), caption(2, "3 / 4"), caption(3, "3 / 4")], { phoneColumns: 2, style: { gap: 14 } })]);
    case "balance": return panel([stack(k, [EB(k, d.label), head()], { style: { gap: 18, align: "center", textAlign: "center" } }), columns([6, 6], [[image("hero", "4 / 5"), T(k, d.intro)], [image("product-1", "4 / 5"), BTN(k, shop, "/shop")]])]);
    case "summit": return panel([columns([7, 5], [[image("hero", "3 / 4")], [...intro(), grid(k, 3, d.details.map((label, i) => stack(k, [EB(k, t(`0${i + 1}`)), T(k, label, { size: 14 })], { style: { gap: 8 } })), { phoneColumns: 1 })]])]);
    case "ripple": return panel([columns([5, 7], [intro(), [image("hero", "16 / 9"), columns([4, 8], [[caption(0)], [image("product-2", "16 / 9"), T(k, d.details[0])]])]])], "soft");
    case "meadow": return panel([columns([8, 4], [[head(), image("hero", "4 / 3")], [EB(k, d.label), caption(0, "4 / 5"), T(k, d.intro), BTN(k, shop, "/shop")]]), T(k, d.story, { size: 20 })]);
    case "gridline": return panel([grid(k, 2, [text(), image("hero", "4 / 3"), caption(0, "4 / 3"), stack(k, [H(k, d.details[0], 2), T(k, d.guide), BTN(k, shop, "/shop", "alt")], { style: { gap: 20, justify: "center", pad: [28, 28, 28, 28], bg: "surface" } })], { phoneColumns: 1, style: { gap: 1 } })]);
    case "narrative": return panel([EB(k, d.label), head(), columns([3, 5, 4], [[T(k, d.intro), BTN(k, shop, "/shop")], [image("hero", "3 / 4")], [T(k, d.story), grid(k, 2, [caption(0), caption(1)], { phoneColumns: 2 })]])]);
    case "form": return panel([columns([3, 6, 3], [[caption(0)], [stack(k, intro(), { style: { align: "center", textAlign: "center", gap: 18 } }), image("hero", "4 / 5")], [caption(1), caption(2)]])]);
    case "pavilion": return panel([image("hero", "21 / 9"), row(k, [EB(k, d.label), ...d.details.map((label) => T(k, label, { size: 13 }))], { style: { justify: "between" } }), columns([6, 6], [[head(), BTN(k, shop, "/shop")], [T(k, d.intro), T(k, d.story)]])]);
    case "nook": return panel([columns([6, 6], [[image("hero", "4 / 3"), grid(k, 2, [caption(0), caption(1)], { phoneColumns: 2 })], [...intro(), detail(0)]])], "soft");
    case "stage": return panel([stack(k, [EB(k, d.label), head(), BTN(k, shop, "/shop")], { style: { gap: 24, textAlign: "center", align: "center" } }), image("hero", "21 / 9"), columns([3, 6, 3], [[EB(k, d.details[0])], [T(k, d.intro)], [T(k, d.details[1])]])]);
    case "coast": return panel([columns([4, 5, 3], [[caption(0, "4 / 5"), T(k, d.details[0])], [EB(k, d.label), head(), image("hero", "4 / 3")], [T(k, d.intro), BTN(k, shop, "/shop"), caption(1)]])]);
    case "rhythm": return panel([grid(k, 3, [text(), image("hero", "4 / 5"), detail(0), caption(0, "4 / 3"), detail(1), caption(1, "4 / 3")], { phoneColumns: 1, style: { gap: 20, align: "center" } })]);
    case "aura": return panel([stack(k, [EB(k, d.label), head(), T(k, d.intro)], { style: { gap: 16, align: "center", textAlign: "center", maxWidth: "900px", self: "center" } }), image("hero", "16 / 9"), columns([4, 8], [[BTN(k, shop, "/shop")], [row(k, [T(k, d.story), caption(0)], { style: { gap: 28, align: "start", wrap: false } })]])], "surface");
    default: return null;
  }
}
