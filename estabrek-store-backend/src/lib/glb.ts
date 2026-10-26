// src/lib/glb.ts
/**
 * Binary glTF files (.glb): the store's own 3D models for a gaming theme's stage
 * (admin → ثيمات المتجر → محرّر المشهد). A file is kept only if it starts the way
 * glTF 2.0 says: the bytes "glTF", version 2, then the file's whole length.
 */

/** The biggest model a store may upload (the shop loads it on its home page). */
export const GLB_MAX_MB = 25;
export const GLB_MAX_BYTES = GLB_MAX_MB * 1024 * 1024;
/** What the first 12 bytes must say. */
const MAGIC = 0x46546c67; // "glTF", little-endian

export type GlbCheck = { ok: true; length: number } | { ok: false; reason: "TOO_SHORT" | "NOT_GLB" | "NOT_GLTF2" | "WRONG_LENGTH" };

/** Reads a .glb file's header; `size`, when known, must match the length it states. */
export function glbHeader(head: Uint8Array, size?: number): GlbCheck {
  if (head.byteLength < 12) return { ok: false, reason: "TOO_SHORT" };
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
  if (view.getUint32(0, true) !== MAGIC) return { ok: false, reason: "NOT_GLB" };
  if (view.getUint32(4, true) !== 2) return { ok: false, reason: "NOT_GLTF2" };
  const length = view.getUint32(8, true);
  if (size !== undefined && length !== size) return { ok: false, reason: "WRONG_LENGTH" };
  return { ok: true, length };
}
