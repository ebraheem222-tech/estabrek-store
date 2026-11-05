/**
 * GET /api/store-themes: the store themes for the admin's gallery (storeThemes/registry.ts),
 * so the admin never keeps a copy. Public data (names and colours), readable from the
 * admin's address (ADMIN_ORIGIN, lib/studioOrigins.ts).
 */
import { NextRequest, NextResponse } from "next/server";
import { studioOrigins } from "@/lib/studioOrigins";
import { DEFAULT_THEME, STORE_THEMES, themePalette, themeById } from "@/storeThemes";
import { KIT_OPTIONS, PLAIN_KIT, themeKit } from "@/storeThemes/packs";
import { CAMERA_DEFAULT, CAMERA_RANGE, LIGHTS_DEFAULT, LIGHTS_RANGE, MODEL_INFO, MODEL_KINDS, MODEL_KNOBS } from "@/storeThemes/three/kinds";
import { editorFonts } from "@/pageTree/fonts";
import { SECTOR_NAMES } from "@/storeThemes/dna/labels";
import { TEMPLATE_THEMES } from "@/storeThemes/kits/themes";
import { copyTheme } from "@/storeThemes/snapshot";

export const dynamic = "force-dynamic";

const list = [...STORE_THEMES, ...TEMPLATE_THEMES].map((t) => {
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
    pill: t.pill,
    shadow: t.shadow,
    hero: t.hero,
    motion: t.motion,
    // Its pack beyond colours and fonts (storeThemes/packs.ts): the admin applies and mixes them.
    kit: themeKit(t),
    fonts: { display: t.fonts.display[0], text: t.fonts.text[0] },
    // A design's theme: its kind, sector, variant and signature section (dna/); a classic one is listed apart.
    ...(t.design ? { design: { ...t.design, sectorName: SECTOR_NAMES[t.design.sector] } } : {}),
    ...(t.classic ? { classic: true } : {}),
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
  const id = req.nextUrl.searchParams.get("theme");
  if (id) {
    const theme = themeById(id);
    return NextResponse.json(theme ? { theme: copyTheme(theme) } : { error: "Unknown theme" }, { status: theme ? 200 : 404, headers: cors(req) });
  }
  // defaults: each kind of store's theme when none is chosen (the admin shows it as the current one); fonts: the page editor's families.
  return NextResponse.json({ themes: list, models, stageDefaults, defaults: DEFAULT_THEME, fonts: editorFonts(), kitOptions: KIT_OPTIONS, plainKit: PLAIN_KIT }, { headers: { ...cors(req), "Cache-Control": "public, max-age=300" } });
}
