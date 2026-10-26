// The shop's languages (header.languages): which ones it offers and its main one.
import type { Lang } from "./storeIdentity";

export const ALL_LANGS: Lang[] = ["ar", "en", "he"];
export type Languages = { enabled: Lang[]; default: Lang };
/** What a store offered before it could choose. */
export const LANG_DEFAULTS: Languages = { enabled: ["ar", "en"], default: "ar" };

export function languagesOf(header: unknown): Languages {
  const h = header && typeof header === "object" ? (header as Record<string, unknown>) : {};
  const raw = (h.languages && typeof h.languages === "object" ? h.languages : {}) as Record<string, unknown>;
  const enabled = Array.isArray(raw.enabled) ? ALL_LANGS.filter((l) => (raw.enabled as unknown[]).includes(l)) : [...LANG_DEFAULTS.enabled];
  const def = ALL_LANGS.includes(raw.default as Lang) ? (raw.default as Lang) : LANG_DEFAULTS.default;
  const list = enabled.length ? enabled : [def];
  return { enabled: list.includes(def) ? list : [def, ...list], default: def };
}
