import { STYLES, type Style } from "../styles";
import type { HeaderKind, FooterKind } from "../chrome";
import { t } from "../tree";
import { CATALOG_EDITIONS } from "./catalogEditions";

export type Composition = { id: string; name: ReturnType<typeof t>; tags: string[]; header: HeaderKind; footer: FooterKind; style: Style };

/** The ten established design voices retain their IDs, typography and opening premise. */
const NEW_STYLES: Record<string, Style> = {
  gallery: { ...STYLES.atelier, id: "gallery", head: { scale: 1.1, weight: 500, caps: false, line: 1.1 }, img: { radius: 0, frame: "none" }, density: "airy", rules: false, fonts: { display: ["playfair-display", "amiri", "frank-ruhl-libre"], text: ["jost", "readex-pro", "assistant"] } },
  market: { ...STYLES.runner, id: "market", head: { scale: 1.05, weight: 700, caps: false, line: 1.1 }, img: { radius: 12, frame: "none" }, density: "dense", motion: "calm", fonts: { display: ["dm-sans", "cairo", "heebo"], text: ["inter", "cairo", "heebo"] } },
  folio: { ...STYLES.edit, id: "folio", head: { scale: 1.35, weight: 500, caps: false, line: 0.98 }, density: "airy", fonts: { display: ["cormorant-garamond", "el-messiri", "frank-ruhl-libre"], text: ["work-sans", "noto-naskh-arabic", "assistant"] } },
  panorama: { ...STYLES.trail, id: "panorama", head: { scale: 1.15, weight: 600, caps: false, line: 1.08 }, img: { radius: 0, frame: "none" }, density: "normal", motion: "cinematic", fonts: { display: ["space-grotesk", "changa", "rubik"], text: ["karla", "cairo", "heebo"] } },
  workshop: { ...STYLES.lab, id: "workshop", head: { scale: 1.05, weight: 500, caps: false, line: 1.12 }, img: { radius: 0, frame: "line" }, button: { radius: 0, variant: "outline", caps: false }, density: "normal", motion: "calm", fonts: { display: ["space-grotesk", "ibm-plex-sans-arabic", "ibm-plex-sans-hebrew"], text: ["work-sans", "ibm-plex-sans-arabic", "ibm-plex-sans-hebrew"] } },
};

export const CATALOG_COMPOSITIONS: Composition[] = [
  { id: "street", name: t("جريء|Bold|נועז"), tags: ["bold", "bento"], header: "bar", footer: "giant", style: STYLES.street },
  { id: "runner", name: t("حيوي|Active|אנרגטי"), tags: ["modern", "sport"], header: "ticker", footer: "columns", style: STYLES.runner },
  { id: "atelier", name: t("أتيليه|Atelier|אטלייה"), tags: ["luxury", "cinematic"], header: "centered", footer: "columns", style: STYLES.atelier },
  { id: "playground", name: t("مرح|Playful|שובב"), tags: ["playful", "colourful"], header: "bar", footer: "giant", style: STYLES.playground },
  { id: "quiet", name: t("هادئ|Quiet|שקט"), tags: ["minimal", "calm"], header: "minimal", footer: "line", style: STYLES.quiet },
  { id: "retro", name: t("ريترو|Retro|רטרו"), tags: ["retro", "poster"], header: "ticker", footer: "giant", style: STYLES.retro },
  { id: "night", name: t("بعد الغروب|After dark|אחרי השקיעה"), tags: ["dark", "bold"], header: "minimal", footer: "columns", style: STYLES.night },
  { id: "edit", name: t("مجلة|Editorial|מגזין"), tags: ["editorial", "serif"], header: "centered", footer: "line", style: STYLES.edit },
  { id: "trail", name: t("طبيعي|Natural|טבעי"), tags: ["natural", "outdoor"], header: "bar", footer: "columns", style: STYLES.trail },
  { id: "lab", name: t("استوديو|Studio|סטודיו"), tags: ["tech", "details"], header: "minimal", footer: "line", style: STYLES.lab },
  { id: "gallery", name: t("معرض|Gallery|גלריה"), tags: ["gallery", "minimal"], header: "minimal", footer: "line", style: NEW_STYLES.gallery },
  { id: "market", name: t("سوق|Market|שוק"), tags: ["catalog", "dense"], header: "bar", footer: "columns", style: NEW_STYLES.market },
  { id: "folio", name: t("دفتر|Folio|תיק עבודות"), tags: ["editorial", "art"], header: "centered", footer: "giant", style: NEW_STYLES.folio },
  { id: "panorama", name: t("أفق|Panorama|פנורמה"), tags: ["landscape", "cinematic"], header: "ticker", footer: "columns", style: NEW_STYLES.panorama },
  { id: "workshop", name: t("ورشة|Workshop|סדנה"), tags: ["guide", "details"], header: "minimal", footer: "line", style: NEW_STYLES.workshop },
  ...CATALOG_EDITIONS,
];
