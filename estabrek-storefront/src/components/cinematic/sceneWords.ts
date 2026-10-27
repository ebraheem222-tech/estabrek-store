/**
 * The rose scenes' own words and colours from the admin's editor: the opening's data keeps
 * them under `roseScenes.<scene>` (seasons, stories, instagram), each word in every language
 * of its own (`…title.ar`, `…title.en`), so a word written for one language never shows in
 * another. Anything missing keeps the shop's own words and colours.
 */
import type { Language } from "./Language";

type Tree = Record<string, unknown>;
const HEX = /^#[0-9a-f]{6}$/i;

const at = (v: unknown, path: string[]): unknown => path.reduce<unknown>((o, k) => (o && typeof o === "object" && !Array.isArray(o) ? (o as Tree)[k] : undefined), v);

/** A scene's word in a language: the admin's, else the shop's own. */
export function sceneWord(scene: unknown, path: string[], lang: Language, own: string): string {
  const v = at(scene, [...path, lang]);
  return typeof v === "string" && v.trim() ? v : own;
}

/** The field a scene's word is edited at (for the editor's [data-edit]). */
export const sceneField = (scene: string, path: string[], lang: Language) => ["roseScenes", scene, ...path, lang].join(".");

/** A scene's colour (#rrggbb), else the shop's own. */
export function sceneSeed(scene: unknown, path: string[], own: string): string {
  const v = at(scene, path);
  return typeof v === "string" && HEX.test(v) ? v : own;
}

/** Whether the admin switched a scene off (`…enabled: false`). */
export const sceneOff = (scene: unknown) => at(scene, ["enabled"]) === false;
