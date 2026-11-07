/** Public data-only contract. Kept in parity with the API validator by contract tests. */
export const INTERACTION_EVENTS = ["colorChange", "cartClick", "cartAdded", "click"] as const;
export type InteractionEvent = typeof INTERACTION_EVENTS[number];
export type InteractionAction =
  | { type: "theme"; color: string }
  | { type: "themeReset" }
  | { type: "visibility"; target: string; value: "show" | "hide" | "toggle" }
  | { type: "scroll"; target: string }
  | { type: "animate"; target: string; preset: "pulse" | "fade" | "shake" };
export type InteractionPolicy = { version: 1; bindings: Partial<Record<InteractionEvent, InteractionAction[]>> };
export type CardDesign = {
  layout?: "vertical" | "horizontal"; background?: string; textColor?: string; borderColor?: string; buttonColor?: string; buttonTextColor?: string;
  radius?: number; padding?: number; gap?: number; imageRatio?: "square" | "portrait" | "landscape"; imageFit?: "cover" | "contain";
  titleSize?: number; priceSize?: number; showCategory?: boolean; showPrice?: boolean; showSwatches?: boolean; showButton?: boolean;
  swatchSize?: number; swatchShape?: "circle" | "rounded" | "square"; swatchGap?: number;
};
export type VisualControls = { version: 1; revision: number; cardDesign?: CardDesign | null; interactions?: InteractionPolicy };
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const hex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
const id = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(v);
export function readPolicy(raw: unknown): InteractionPolicy | undefined {
  if (!object(raw) || raw.version !== 1 || !object(raw.bindings)) return;
  const bindings: InteractionPolicy["bindings"] = {};
  for (const event of INTERACTION_EVENTS) {
    if (!(event in raw.bindings)) continue;
    const list = raw.bindings[event];
    if (!Array.isArray(list) || list.length > 8) continue;
    const actions: InteractionAction[] = [];
    let valid = true;
    for (const a of list) {
      if (!object(a)) { valid = false; break; }
      if (a.type === "theme" && (a.color === "event" || hex(a.color))) actions.push({ type: "theme", color: a.color });
      else if (a.type === "themeReset") actions.push({ type: "themeReset" });
      else if (a.type === "scroll" && id(a.target)) actions.push({ type: "scroll", target: a.target });
      else if (a.type === "visibility" && id(a.target) && ["show", "hide", "toggle"].includes(a.value)) actions.push({ type: "visibility", target: a.target, value: a.value });
      else if (a.type === "animate" && id(a.target) && ["pulse", "fade", "shake"].includes(a.preset)) actions.push({ type: "animate", target: a.target, preset: a.preset });
      else { valid = false; break; }
    }
    if (valid) bindings[event] = actions;
  }
  return { version: 1, bindings };
}
export function readCardDesign(raw: unknown): CardDesign | null | undefined {
  if (raw === null) return null;
  if (!object(raw)) return;
  const out: Record<string, any> = {};
  for (const k of ["background", "textColor", "borderColor", "buttonColor", "buttonTextColor"]) if (hex(raw[k])) out[k] = raw[k];
  for (const [k, min, max] of [["radius", 0, 80], ["padding", 0, 64], ["gap", 0, 48], ["titleSize", 10, 48], ["priceSize", 10, 40], ["swatchSize", 12, 64], ["swatchGap", 0, 24]] as const) if (typeof raw[k] === "number" && Number.isFinite(raw[k]) && raw[k] >= min && raw[k] <= max) out[k] = raw[k];
  for (const [k, allowed] of [["layout", ["vertical", "horizontal"]], ["imageRatio", ["square", "portrait", "landscape"]], ["imageFit", ["cover", "contain"]], ["swatchShape", ["circle", "rounded", "square"]]] as const) if ((allowed as readonly unknown[]).includes(raw[k])) out[k] = raw[k];
  for (const k of ["showCategory", "showPrice", "showSwatches", "showButton"]) if (typeof raw[k] === "boolean") out[k] = raw[k];
  return out;
}
export function readVisualControls(raw: unknown): VisualControls {
  if (!object(raw) || raw.version !== 1 || !Number.isSafeInteger(raw.revision) || raw.revision < 0) return { version: 1, revision: 0 };
  const cardDesign = readCardDesign(raw.cardDesign), interactions = readPolicy(raw.interactions);
  return { version: 1, revision: raw.revision, ...(cardDesign !== undefined ? { cardDesign } : {}), ...(interactions ? { interactions } : {}) };
}
/** Policies ordered from nearest element through page to store. undefined = original behaviour. */
export function resolveActions(event: InteractionEvent, policies: (InteractionPolicy | undefined)[]): InteractionAction[] | undefined {
  for (const policy of policies) if (policy?.bindings[event] !== undefined) return policy.bindings[event];
}
