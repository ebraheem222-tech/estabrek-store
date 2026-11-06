/** Low-level helpers only. Every reference module authors its own complete composition. */
import type { Words } from "../../types";
import { STYLES, type Style } from "../styles";
import { H, T, BTN, type TK } from "../lib";
import { el, row, stack, grid, sec, t, type Node, type Style as Css } from "../tree";
import type { Template } from "./types";
import { REFERENCE_ASSETS } from "./referenceAssets";

const META: Record<number, [string, string]> = {
  576: ["snapx-photography", "SnapX Photography"], 577: ["liberty-market", "Liberty Market"],
  578: ["first-portfolio", "First Portfolio"], 579: ["cyborg-gaming", "Cyborg Gaming"],
  582: ["tale-seo-agency", "Tale SEO Agency"], 583: ["festava-live", "Festava Live"],
  584: ["pod-talk", "Pod Talk"], 586: ["scholar", "Scholar"], 587: ["tiya-golf-club", "Tiya Golf Club"],
  588: ["ebook-landing", "Ebook Landing"], 589: ["lugx-gaming", "Lugx Gaming"],
  590: ["topic-listing", "Topic Listing"], 591: ["villa-agency", "Villa Agency"],
  592: ["glossy-touch", "Glossy Touch"], 594: ["nexus-flow", "Nexus Flow"],
  597: ["neural-glass", "Neural Glass"], 598: ["sleeky-pro", "Sleeky Pro"], 599: ["noir-fashion", "Noir Fashion"],
  601: ["chain-summit", "Chain Summit"], 602: ["graph-page", "Graph Page"], 604: ["christmas-piano", "Christmas Piano"],
  605: ["xmas-countdown", "Xmas Countdown"], 606: ["string-master", "String Master"], 614: ["quantix-saas", "Quantix SaaS"],
  615: ["amber-folio", "Amber Folio"], 616: ["split-index", "Split Index"], 617: ["pixel-forge", "Pixel Forge"],
  618: ["the-catalyst", "The Catalyst"], 619: ["axis-industrial", "Axis Industrial"], 621: ["luminary", "Luminary"],
  622: ["clearwave", "Clearwave"], 623: ["novapay", "NovaPay"], 625: ["folio-slideshow", "Folio Slideshow"], 633: ["celadon", "Celadon"],
};
export function defineReference(number: number, definition: Omit<Template, "source" | "preview"> & Required<Pick<Template, "regions">>): Template {
  const [slug, title] = META[number];
  return { ...definition, regions: { ...definition.regions, footer: (k, brand) => {
    const footer = definition.regions.footer(k, brand);
    footer.children = [...footer.children ?? [], el(k, "button", { label: t("التصميم المرجعي: TemplateMo|Reference design: TemplateMo|עיצוב מקור: TemplateMo"), href: `https://templatemo.com/tm-${number}-${slug}`, variant: "link" }, { style: { size: 11, opacity: .65, self: "center", pad: [12, 0, 0, 0] } })];
    return footer;
  } }, source: { number, title, folder: `templatemo_${number}_${slug.replaceAll("-", "_")}` }, preview: `/templates/references/previews/${number}.png` };
}

/** Asset lookup never falls back to another template's pictures. */
export function sourceAsset(number: number, file: string): string {
  const files = REFERENCE_ASSETS[number] ?? {};
  if (files[file]) return files[file];
  const matches = Object.entries(files).filter(([name]) => name.split("/").at(-1) === file);
  if (matches.length !== 1) throw new Error(`Missing or ambiguous source picture: ${number}/${file}`);
  return matches[0][1];
}
export const sourceFiles = (number: number) => Object.keys(REFERENCE_ASSETS[number] ?? {});
export function sourcePicture(k: TK, number: number, file: string, alt: Words, style: Css = {}, motion?: Record<string, unknown>): Node {
  return el(k, "image", { src: sourceAsset(number, file), alt }, { style: { width: "100%", fit: "cover", ...style }, ...(motion ? { motion } : {}) });
}

export function referenceStyle(number: number, base: string, options: {
  bg: string; ink: string; accent: string; mode?: "light" | "dark"; pop?: string; radius?: number;
  display?: [string, string, string]; text?: [string, string, string]; weight?: number; caps?: boolean;
}): Style {
  const style = STYLES[base] ?? STYLES.quiet;
  return {
    ...style, id: `reference-${number}`, name: t(`${META[number][1]}|${META[number][1]}|${META[number][1]}`),
    seed: { mode: options.mode ?? "light", bg: options.bg, ink: options.ink, accent: options.accent, strong: options.accent },
    pop: options.pop ?? options.accent, popInk: options.bg,
    fonts: { display: options.display ?? style.fonts.display, text: options.text ?? style.fonts.text },
    head: { ...style.head, ...(options.weight ? { weight: options.weight } : {}), ...(options.caps !== undefined ? { caps: options.caps } : {}) },
    img: { ...style.img, ...(options.radius !== undefined ? { radius: options.radius } : {}) },
    theme: { ...style.theme, ...(options.radius !== undefined ? { round: Math.min(2, options.radius / 16) } : {}) },
  };
}

export type RefLink = { label: Words; href: string };
export function sourceHeader(k: TK, brand: Words, links: RefLink[], options: {
  center?: boolean; compact?: boolean; upper?: boolean; cta?: Words; line?: Words; bg?: string; color?: string;
} = {}): Node {
  const mark = el(k, "button", { label: brand, href: "/", variant: "link" }, { style: { size: options.compact ? 19 : 25, weight: 700, decoration: { line: "none" }, pad: [0, 0, 0, 0], ...(options.upper ? { caps: "upper", letterSpacing: 2 } : {}) } });
  const navigation = el(k, "menu", { items: links, layout: "row", look: "plain", phone: "fold" }, { style: { size: 13, weight: 500 } });
  const content = options.center ? stack(k, [mark, navigation], { style: { align: "center", gap: 14 } }) : row(k, [mark, navigation, ...(options.cta ? [BTN(k, options.cta, "/contact")] : [])], { style: { justify: "between", gap: 24 } });
  return sec(k, t("هيدر|Header|כותרת"), [...(options.line ? [T(k, options.line, { size: 11, style: { textAlign: "center", margin: [0, 0, 14, 0] }, motion: false })] : []), content], { full: false, tag: "header", style: { pad: [24, 28, 24, 28], ...(options.bg ? { bg: options.bg } : {}), ...(options.color ? { color: options.color } : {}) }, phone: { pad: [18, 18, 18, 18] } });
}

export function sourceFooter(k: TK, brand: Words, links: RefLink[], options: { large?: boolean; columns?: boolean; line?: Words; bg?: string; color?: string } = {}): Node {
  const content = [
    H(k, brand, 2, { size: options.large ? 120 : 30, style: { lineHeight: 1.05, ...(options.large ? { margin: [0, 0, 36, 0] } : {}) }, motion: false }),
    ...(options.line ? [T(k, options.line, { size: 14, motion: false })] : []),
    el(k, "menu", { items: links, layout: options.columns ? "column" : "row", look: "plain" }, { style: { size: 13 } }),
  ];
  return sec(k, t("فوتر|Footer|תחתית"), [options.columns ? grid(k, 2, [stack(k, content.slice(0, 2)), stack(k, content.slice(2))], { style: { gap: 48 } }) : stack(k, content, { style: { gap: 18 } })], { tag: "footer", style: { pad: [56, 28, 40, 28], ...(options.bg ? { bg: options.bg } : {}), ...(options.color ? { color: options.color } : {}) }, phone: { pad: [36, 18, 28, 18] } });
}

/** Sample claims stay in previews only; merchant pages get this authored neutral replacement. */
export const merchantWords = (k: TK, preview: Words, live: Words) => k.demo ? preview : live;
