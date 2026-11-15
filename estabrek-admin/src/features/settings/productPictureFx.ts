/**
 * Settings → the product page: what the big picture does while the pointer is on it. The zoom, as it always was,
 * or one of the live effects the graphics card draws in its place (shared/pictureFx.ts). The shop reads the same
 * names (its lib/storefrontSettings.ts), so the list here is made from the shared one.
 */
import { PICTURE_FX_POINTER, pointerFxOf, type PointerFxKind } from "../../../../shared/pictureFx";

export type ProductPictureFx = "none" | PointerFxKind;

/** The setting as saved, or the zoom for anything else. */
export const readProductPictureFx = (raw: unknown): ProductPictureFx => pointerFxOf(raw) ?? "none";

const NAMES: Record<PointerFxKind, string> = {
  ripple: "تموّج مي (بيرسمه كرت الشاشة)",
  liquid: "سائل (بيرسمه كرت الشاشة)",
  shift: "انفصال ألوان (بيرسمه كرت الشاشة)",
};

export const PRODUCT_PICTURE_FX_OPTIONS: Array<{ value: ProductPictureFx; label: string }> = [
  { value: "none", label: "تقريب (متل ما هي هلأ)" },
  ...PICTURE_FX_POINTER.map((kind) => ({ value: kind, label: NAMES[kind] })),
];
