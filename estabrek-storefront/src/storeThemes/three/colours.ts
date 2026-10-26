/**
 * A model's colours from the theme's palette: a dark body with the brand's trims in most
 * finishes, the brand colours themselves on toy and voxel models; `tint` (a picked game or
 * collection) recolours the bright parts. Shared by the home's stage (StageHero) and the
 * models on the inner pages (ModelSpot).
 */
import { hexToLab, mix, type Palette } from "../colour";
import type { ModelColours, ModelStyle } from "./parts";

export function modelColours(palette: Palette, finish: ModelStyle, tint: string | null = null): ModelColours {
  const dark = hexToLab(palette.bg)[0] < 0.5;
  const bright = finish === "toy" || finish === "voxel";
  return {
    body: bright ? palette.accent : dark ? mix(palette.surface, "#000000", 0.2) : mix(palette.ink, palette.surface, 0.12),
    trim: bright ? palette.strong : dark ? palette.line : palette.soft,
    accent: tint ?? palette.accent,
    glow: tint ?? palette.strong,
    metal: mix(palette.strong, "#ffffff", 0.35),
    screen: tint ?? palette.glow,
  };
}
