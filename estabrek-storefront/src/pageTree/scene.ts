/** Safe, bounded data for a section's original procedural Canvas2D decoration. */
export const SCENE_KINDS = ["constellation", "orbs", "waves", "grid", "starfield", "ribbons", "snow", "fireworks"] as const;
export type SceneKind = typeof SCENE_KINDS[number];
export type SceneSpec = { kind: SceneKind; color?: string; secondary?: string; amount: number; speed: number; intensity: number; interactive: boolean };
const TOKENS = ["text", "muted", "accent", "accent-soft", "accent-contrast", "bg", "surface", "border", "white", "black", "transparent"];
const safeColor = (raw: unknown) => typeof raw === "string" && (TOKENS.includes(raw.trim()) || /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(raw.trim())) ? raw.trim() : undefined;
const bounded = (raw: unknown, min: number, max: number, fallback: number, integer = false) => typeof raw === "number" && Number.isFinite(raw) && raw >= min && raw <= max && (!integer || Number.isInteger(raw)) ? raw : fallback;

export function sceneOf(raw: unknown): SceneSpec | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!(SCENE_KINDS as readonly unknown[]).includes(r.kind)) return null;
  const color = safeColor(r.color), secondary = safeColor(r.secondary);
  return { kind: r.kind as SceneKind, ...(color ? { color } : {}), ...(secondary ? { secondary } : {}), amount: bounded(r.amount, 8, 100, 32, true), speed: bounded(r.speed, 0, 3, 1), intensity: bounded(r.intensity, 0, 2, 1), interactive: r.interactive === true };
}
