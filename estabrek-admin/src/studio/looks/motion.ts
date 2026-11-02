/**
 * Ready hovers and ways of coming in (phase 10): the hover looks the state panel has, the
 * shop's mouse effects in two strengths, colour fills, frames and lifts in every palette;
 * every way of coming in with four feels (calm, quick, bouncy, springy), word-by-word ones
 * for words, and one-after-another ones for what holds several things.
 */
import { tr } from "../../lib/words";
import { ENTER_LABEL, HOVER_COLOUR, HOVER_LABEL, HOVER_STRENGTH, WORDS_ONLY } from "../look";
import { HOVER_PRESETS, PRESET_GROUPS } from "../states";
import { EASE, PALETTES, both, type Ready } from "./core";

const H: Record<string, () => string> = {
  ...Object.fromEntries(PRESET_GROUPS),
  effect: () => tr("تأثيرات حركة", "Motion effects"),
  fill: () => tr("بيتلوّن", "Fills with colour"),
};
export const HOVER_GROUPS = Object.keys(H).map((k) => [k, H[k]] as const);
const hovers: Ready[] = [];
const PICTURES = ["image", "video"] as const;

for (const p of HOVER_PRESETS) hovers.push({ id: `hover-${p.key}`, kind: "hover", group: p.group ?? "move", name: p.label, style: { hover: p.look, transition: EASE }, ...(p.for ? { for: p.for } : {}) });
for (const kind of Object.keys(HOVER_LABEL)) {
  const forThis = kind === "zoom" ? { for: PICTURES } : {};
  if (!HOVER_STRENGTH.has(kind)) {
    hovers.push({ id: `hover-fx-${kind}`, kind: "hover", group: "effect", name: HOVER_LABEL[kind], motion: { hover: { kind, ...(HOVER_COLOUR.has(kind) ? { color: "accent" } : {}) } }, ...forThis });
    continue;
  }
  hovers.push({ id: `hover-fx-${kind}-soft`, kind: "hover", group: "effect", name: both(HOVER_LABEL[kind], () => tr("خفيف", "Gentle")), motion: { hover: { kind, amount: 0.6 } }, ...forThis });
  hovers.push({ id: `hover-fx-${kind}-strong`, kind: "hover", group: "effect", name: both(HOVER_LABEL[kind], () => tr("قوي", "Strong")), motion: { hover: { kind, amount: 1.6, ...(HOVER_COLOUR.has(kind) ? { color: "accent" } : {}) } }, ...forThis });
}
for (const p of PALETTES) {
  hovers.push({ id: `hover-fill-${p.id}`, kind: "hover", group: "fill", name: both(H.fill, p.name), style: { hover: { bg: p.from, color: p.from.startsWith("#") ? "#ffffff" : p.ink }, transition: EASE } });
  if (p.id !== "store" && PALETTES.indexOf(p) < 12)
    hovers.push({ id: `hover-ring-${p.id}`, kind: "hover", group: "frame", name: both(() => tr("إطار", "Frame"), p.name), style: { hover: { border: { width: 2, color: p.from } }, transition: EASE } });
  if (PALETTES.indexOf(p) < 8)
    hovers.push({ id: `hover-lift-glow-${p.id}`, kind: "hover", group: "glow", name: both(() => tr("بيرتفع وبيتوهّج", "Lifts and glows"), p.name), style: { hover: { moveY: -6, glow: { color: p.to, size: 26 } }, transition: { duration: 0.35, ease: "back" } } });
}
for (const [id, name, look] of [
  ["deck", () => tr("بطاقة بتنقلب شوي", "A card turning a little"), { rotateY: 18, scale: 1.02 }],
  ["deck-end", () => tr("بطاقة بتنقلب للجهة التانية", "A card turning the other way"), { rotateY: -18, scale: 1.02 }],
  ["table", () => tr("على الطاولة", "On the table"), { rotateX: 24, moveY: -6 }],
  ["peek", () => tr("بيطل", "Peeks out"), { rotateX: -12, moveY: -8, shadow: "lg" }],
  ["corner", () => tr("زاوية لفوق", "A corner up"), { rotateX: 10, rotateY: 10, rotateZ: -2 }],
  ["press", () => tr("بينضغط لجوّا", "Presses in"), { rotateX: 6, scale: 0.98, shadow: "sm" }],
] as const)
  hovers.push({ id: `hover-3d-${id}`, kind: "hover", group: "3d", name, style: { hover: look, transition: { duration: 0.4, ease: "smooth" } } });

/** Every ready hover. */
export const HOVERS: Ready[] = hovers;

/* ------------------------------------------------------------ coming in */

const FEELS: Array<[string, () => string, { duration: number; ease: string; distance?: number }]> = [
  ["calm", () => tr("هادي", "Calm"), { duration: 1.2, ease: "smooth", distance: 40 }],
  ["quick", () => tr("سريع", "Quick"), { duration: 0.5, ease: "strong", distance: 24 }],
  ["bouncy", () => tr("بنطّة", "Bouncy"), { duration: 0.9, ease: "back", distance: 60 }],
  ["spring", () => tr("زنبرك", "Springy"), { duration: 1.4, ease: "elastic", distance: 80 }],
];
const E: Record<string, () => string> = {
  move: () => tr("بيتحرك لمكانه", "Moves into place"),
  show: () => tr("بيبيّن", "Shows"),
  wipe: () => tr("مسح", "Wipes"),
  words: () => tr("كلمات وحروف", "Words and letters"),
  group: () => tr("واحد ورا التاني", "One after another"),
};
export const ENTRANCE_GROUPS = Object.keys(E).map((k) => [k, E[k]] as const);
const groupOf = (kind: string) => (WORDS_ONLY.has(kind) ? "words" : kind.startsWith("wipe") || kind === "circle" ? "wipe" : ["fade", "blur", "draw", "zoom-in", "zoom-out"].includes(kind) ? "show" : "move");
const enters: Ready[] = [];
const WORD_TYPES = ["heading", "text", "button"] as const;
for (const kind of Object.keys(ENTER_LABEL)) {
  const words = WORDS_ONLY.has(kind);
  const feels = words ? FEELS.slice(0, 3) : FEELS;
  for (const [fk, fn, feel] of feels) {
    const distance = ["up", "down", "start", "end"].includes(kind) ? { distance: feel.distance } : {};
    enters.push({
      id: `enter-${kind}-${fk}`, kind: "entrance", group: groupOf(kind), name: both(ENTER_LABEL[kind], fn),
      motion: { enter: { kind, duration: feel.duration, ease: feel.ease, ...distance } },
      ...(words ? { for: kind === "count" ? ["heading", "text"] : WORD_TYPES } : kind === "draw" ? { for: ["svg", "icon"] } : {}),
    });
  }
}
const HOLDERS = ["stack", "grid", "cell", "columns", "section", "popup"] as const;
for (const kind of ["up", "fade", "zoom-in", "start", "flip-x", "blur"] as const)
  for (const [sk, stagger, sn] of [["close", 0.08, () => tr("ورا بعض بسرعة", "Close behind")], ["slow", 0.18, () => tr("ورا بعض بهدوء", "Slowly behind")]] as const)
    enters.push({ id: `enter-group-${kind}-${sk}`, kind: "entrance", group: "group", name: both(ENTER_LABEL[kind], sn), motion: { enter: { kind, duration: 0.8, ease: "smooth", stagger } }, for: HOLDERS });

/** Every ready way of coming in. */
export const ENTRANCES: Ready[] = enters;
