/**
 * Ready looks for a 3D model (model3d): light, floor, background, motion and what shoppers may
 * do, set together in one click. They never touch which model it is (or its file), its finish, colours
 * or its shape, so any model takes any look.
 */
import { tr } from "../lib/words";

type Obj = Record<string, unknown>;
export type Model3dLook = { key: string; name: () => string; set: Obj };
/** What a look sets (the rest of the model's settings stay). */
export const LOOK_KEYS = ["lights", "floor", "bg", "anim", "auto", "tilt", "drag", "zoom", "camera"] as const;

export const MODEL3D_LOOKS: Model3dLook[] = [
  { key: "showcase", name: () => tr("عرض منتج", "Product showcase"), set: { lights: { preset: "studio" }, floor: "shadow", auto: 0.5, drag: true } },
  { key: "neon", name: () => tr("صالة نيون", "Neon showroom"), set: { lights: { preset: "neon" }, floor: "grid", bg: "#0b0b12", auto: 0.8 } },
  { key: "floating", name: () => tr("طافي بالهوا", "Floating"), set: { lights: { preset: "soft" }, floor: "none", anim: { type: "float", speed: 1, amount: 1.2, trigger: "always" }, tilt: true } },
  { key: "hero", name: () => tr("بطل الصفحة", "Page hero"), set: { lights: { preset: "sunset" }, floor: "disc", anim: { type: "swing", speed: 0.8, amount: 0.6, trigger: "always" }, camera: { fov: 30 } } },
  { key: "night", name: () => tr("ليل متوهّج", "Night glow"), set: { lights: { preset: "night" }, floor: "shadow", bg: "#05060a", auto: 0.4 } },
  { key: "warm", name: () => tr("دافي وقريب", "Warm and close"), set: { lights: { preset: "warm" }, floor: "shadow", tilt: true, drag: true, camera: { fov: 28 } } },
  { key: "scroll-spin", name: () => tr("بيلف مع السكرول", "Spins with the scroll"), set: { lights: { preset: "studio" }, floor: "shadow", anim: { type: "spin", speed: 1, amount: 1, trigger: "scroll" } } },
  { key: "hover-pop", name: () => tr("بينط مع الماوس", "Bounces with the mouse"), set: { lights: { preset: "soft" }, floor: "shadow", anim: { type: "bounce", speed: 1.5, amount: 1, trigger: "hover" } } },
];

/** The model's settings with a look: everything a look sets is replaced (unset = back to default), the rest kept. */
export function withLook(props: Obj, look: Model3dLook): Obj {
  const out: Obj = { ...props };
  for (const k of LOOK_KEYS) delete out[k];
  return { ...out, ...look.set };
}
/** The look the model has now, if its settings are exactly one. */
export function lookOf3d(props: Obj): string | undefined {
  const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  return MODEL3D_LOOKS.find((l) => LOOK_KEYS.every((k) => same(props[k], l.set[k])))?.key;
}
