/**
 * GET /api/store-themes: the store themes for the admin's gallery (storeThemes/registry.ts),
 * so the admin never keeps a copy. Public data (names and colours), readable from the
 * admin's address (ADMIN_ORIGIN, lib/studioOrigins.ts).
 */
import { NextRequest, NextResponse } from "next/server";
import { studioOrigins } from "@/lib/studioOrigins";
import { DEFAULT_THEME, STORE_THEMES, themePalette } from "@/storeThemes";
import { CAMERA_DEFAULT, CAMERA_RANGE, LIGHTS_DEFAULT, LIGHTS_RANGE, MODEL_INFO, MODEL_KINDS, MODEL_KNOBS } from "@/storeThemes/three/kinds";

export const dynamic = "force-dynamic";

const list = STORE_THEMES.map((t) => {
  const { palette } = themePalette(t);
  return {
    id: t.id,
    name: t.name,
    family: t.family,
    blurb: t.blurb,
    mode: t.mode,
    modes: (["light", "dark"] as const).filter((m) => t.palettes[m]),
    swatch: [palette.bg, palette.surface, palette.accent, palette.strong, palette.ink],
    // Every colour of each mode, for the admin's customizer (storeThemes/custom.ts).
    palettes: t.palettes,
    round: t.round,
    shadow: t.shadow,
    hero: t.hero,
    motion: t.motion,
    // Gaming themes: the 3D stage the admin can fill with its own models and games.
    stage: t.stage ? { layout: t.stage.layout, floor: t.stage.floor, finish: t.stage.finish, models: t.stage.models, games: t.stage.games.map((g) => ({ name: g.name, color: g.color, model: g.model })) } : null,
  };
});
// Each model with its own shape knobs (the scene editor's sliders).
const models = MODEL_KINDS.map((kind) => ({ kind, label: MODEL_INFO[kind].label, knobs: MODEL_KNOBS[kind] }));
// The stage's camera and lights as drawn before the editor, and their ranges (the editor's sliders).
const stageDefaults = { camera: CAMERA_DEFAULT, lights: LIGHTS_DEFAULT, cameraRange: CAMERA_RANGE, lightsRange: LIGHTS_RANGE };

const cors = (req: NextRequest): Record<string, string> => {
  const origin = req.headers.get("origin") ?? "";
  return studioOrigins().includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : { Vary: "Origin" };
};

export function GET(req: NextRequest) {
  // defaults: each kind of store's theme when none is chosen (the admin shows it as the current one).
  return NextResponse.json({ themes: list, models, stageDefaults, defaults: DEFAULT_THEME }, { headers: { ...cors(req), "Cache-Control": "public, max-age=300" } });
}
