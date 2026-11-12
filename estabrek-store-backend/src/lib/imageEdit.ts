/**
 * A picture's edit made for real (the editor's focus mode, A3; shared/imageEdit.ts in the admin and the shop
 * describes the same numbers and previews them with CSS): turned and mirrored, cropped (fractions of the turned
 * picture), its light, contrast, colour and warmth changed, black and white, sharpened; written as WebP. The
 * original stays in the library, so the edit can be changed or undone.
 */
import sharp from "sharp";
import { z } from "zod";

const unit = z.number().finite().min(-1).max(1);
export const Recipe = z.object({
  crop: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().min(0.01).max(1), h: z.number().min(0.01).max(1) })
    .refine((c) => c.x + c.w <= 1.0005 && c.y + c.h <= 1.0005, "The crop goes past the picture")
    .optional(),
  rotate: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).optional(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
  light: unit.optional(),
  contrast: unit.optional(),
  saturate: unit.optional(),
  warmth: unit.optional(),
  sharpen: z.number().finite().min(0).max(1).optional(),
  mono: z.boolean().optional(),
});
export type Recipe = z.infer<typeof Recipe>;

/** The picture with the edit, as WebP (transparency kept), and its size. */
export async function applyRecipe(input: Buffer, r: Recipe): Promise<{ buffer: Buffer; width: number; height: number }> {
  // Turned and mirrored first (after the camera's own turn), so the crop is measured on what's seen.
  let turned = sharp(input, { failOnError: false }).rotate();
  if (r.rotate) turned = turned.rotate(r.rotate);
  if (r.flipY) turned = turned.flip();
  if (r.flipX) turned = turned.flop();
  const { data, info } = await turned.png().toBuffer({ resolveWithObject: true });

  let img = sharp(data, { failOnError: false });
  if (r.crop) {
    const left = Math.min(info.width - 1, Math.max(0, Math.round(r.crop.x * info.width)));
    const top = Math.min(info.height - 1, Math.max(0, Math.round(r.crop.y * info.height)));
    const width = Math.max(1, Math.min(info.width - left, Math.round(r.crop.w * info.width)));
    const height = Math.max(1, Math.min(info.height - top, Math.round(r.crop.h * info.height)));
    img = img.extract({ left, top, width, height });
  }
  if (r.light || (r.saturate && !r.mono)) img = img.modulate({ brightness: 1 + (r.light ?? 0) * 0.6, saturation: r.mono ? 1 : Math.max(0, 1 + (r.saturate ?? 0)) });
  if (r.contrast) {
    const a = 1 + r.contrast * 0.8;
    img = img.linear(a, 128 * (1 - a));
  }
  if (r.warmth && !r.mono) {
    const w = r.warmth;
    img = img.recomb([[1 + 0.12 * w, 0, 0], [0, 1 + 0.03 * w, 0], [0, 0, 1 - 0.15 * w]]);
  }
  if (r.mono) img = img.greyscale();
  if (r.sharpen) img = img.sharpen({ sigma: 0.5 + r.sharpen * 1.5 });
  const out = await img.webp({ quality: 86, alphaQuality: 90 }).toBuffer({ resolveWithObject: true });
  return { buffer: out.data, width: out.info.width, height: out.info.height };
}
