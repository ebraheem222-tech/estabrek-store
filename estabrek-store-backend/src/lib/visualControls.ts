import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const target = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/);
export const InteractionAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("theme"), color: z.union([hex, z.literal("event")]) }).strict(),
  z.object({ type: z.literal("themeReset") }).strict(),
  z.object({ type: z.literal("visibility"), target, value: z.enum(["show", "hide", "toggle"]) }).strict(),
  z.object({ type: z.literal("scroll"), target }).strict(),
  z.object({ type: z.literal("animate"), target, preset: z.enum(["pulse", "fade", "shake"]) }).strict(),
]);
export const InteractionPolicy = z.object({ version: z.literal(1), bindings: z.object({
  colorChange: z.array(InteractionAction).max(8).optional(),
  cartClick: z.array(InteractionAction).max(8).optional(),
  cartAdded: z.array(InteractionAction).max(8).optional(),
  click: z.array(InteractionAction).max(8).optional(),
}).strict() }).strict();
export const CardDesign = z.object({
  layout: z.enum(["vertical", "horizontal"]).optional(),
  background: hex.optional(), textColor: hex.optional(), borderColor: hex.optional(),
  buttonColor: hex.optional(), buttonTextColor: hex.optional(),
  radius: z.number().min(0).max(80).optional(), padding: z.number().min(0).max(64).optional(), gap: z.number().min(0).max(48).optional(),
  imageRatio: z.enum(["square", "portrait", "landscape"]).optional(), imageFit: z.enum(["cover", "contain"]).optional(),
  titleSize: z.number().min(10).max(48).optional(), priceSize: z.number().min(10).max(40).optional(),
  showCategory: z.boolean().optional(), showPrice: z.boolean().optional(), showSwatches: z.boolean().optional(), showButton: z.boolean().optional(),
  swatchSize: z.number().min(12).max(64).optional(), swatchShape: z.enum(["circle", "rounded", "square"]).optional(), swatchGap: z.number().min(0).max(24).optional(),
}).strict();
export const VisualControls = z.object({ version: z.literal(1), revision: z.number().int().nonnegative(), cardDesign: CardDesign.nullable().optional(), interactions: InteractionPolicy.optional() }).strict();
export function publicVisualControls(raw: unknown) {
  const parsed = VisualControls.safeParse(raw);
  return parsed.success ? parsed.data : { version: 1 as const, revision: 0 };
}
