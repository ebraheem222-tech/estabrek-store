// src/lib/scanManifest.ts
import { z } from "zod";

/**
 * A 360° scan's manifest (admin → الوسائط → مسح 3D, modules/admin/scans.controller.ts):
 * the sprite sheet's grid, each frame's angle and time in the video, the camera's height
 * and the product's size from the printed mat, the video it came from, and the checks it
 * passed. Checked before it is kept. A view can also come from a plain video (no mat: one
 * turn marked by hand), say which product (and colour) it shows on the shop's product
 * page, and point at the 3D model built from the same turn.
 */
const SAFE_FILE = /^(\/(?!\/)|https:\/\/)[^\s<>"'`\\]+$/;
const ID = /^[\w-]{1,64}$/;
/** Which product (and which of its colours, none = all of them) a view shows. */
export const ScanProduct = z.object({ id: z.string().regex(ID), itemId: z.string().regex(ID).nullable().optional() }).strict();

export const ScanManifest = z
  .object({
    version: z.literal(1),
    cols: z.number().int().min(1).max(40),
    rows: z.number().int().min(1).max(40),
    cellW: z.number().int().min(8).max(2048),
    cellH: z.number().int().min(8).max(2048),
    frames: z.array(z.object({ angle: z.number().min(0).max(360), time: z.number().min(0).max(36_000) }).strict()).min(8).max(360),
    /** The camera above the mat (degrees), from the mat's ellipse; null without the mat. */
    elevation: z.number().min(0).max(90).nullable(),
    /** The product's height (mm), from the mat's size; null without the mat. */
    heightMm: z.number().positive().max(10_000).nullable(),
    video: z.object({ name: z.string().max(200), duration: z.number().min(0).max(36_000), width: z.number().int().min(1).max(10_000), height: z.number().int().min(1).max(10_000) }).strict(),
    checks: z.array(z.object({ id: z.string().max(30), level: z.enum(["ok", "warn", "reject"]), value: z.number().optional() }).strict()).max(30),
    /** Filmed on the printed mat (angles measured) or a plain video (one turn marked by hand). */
    mode: z.enum(["mat", "plain"]).optional(),
    /** The frames' background: cut out (see-through), kept as filmed, or laid on a colour. */
    background: z.union([z.enum(["cut", "kept"]), z.string().regex(/^#[0-9a-f]{6}$/i)]).optional(),
    product: ScanProduct.nullable().optional(),
    /** Its 3D model (a GLB among the 3D files), when one was built from the same turn. */
    model: z.object({ url: z.string().max(1000).regex(SAFE_FILE) }).strict().nullable().optional(),
  })
  .strict()
  .refine((m) => m.frames.length <= m.cols * m.rows, { message: "More frames than the sheet holds" });
export type ScanManifestT = z.infer<typeof ScanManifest>;

/** PATCH /admin/media/scans/:id — which product it shows (null = none), its 3D model, its name. */
export const ScanLink = z
  .object({
    productId: z.string().regex(ID).nullable().optional(),
    itemId: z.string().regex(ID).nullable().optional(),
    modelUrl: z.string().max(1000).regex(SAFE_FILE).nullable().optional(),
    displayName: z.string().trim().min(1).max(200).optional(),
  })
  .strict();
