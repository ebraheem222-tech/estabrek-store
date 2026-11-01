import { describe, expect, it } from "vitest";
import { LOOK_KEYS, MODEL3D_LOOKS, lookOf3d, withLook } from "./model3dLooks";

describe("ready looks for a 3D model", () => {
  it("set light, floor, background, motion and what shoppers do; never the model, its file, finish, colours or shape", () => {
    const props = { model: "watch", file: { url: "/m/a.glb" }, finish: "glass", colours: { body: "accent" }, knobs: { strap: 1.2 }, size: 1.3, turn: { x: 0, y: 30, z: 0 }, lights: { preset: "night", key: 4 }, bg: "#000000", tilt: true, label: { ar: "ساعة" } };
    const neon = MODEL3D_LOOKS.find((l) => l.key === "neon")!;
    const out = withLook(props, neon);
    expect(out).toMatchObject({ model: "watch", file: { url: "/m/a.glb" }, finish: "glass", colours: { body: "accent" }, knobs: { strap: 1.2 }, size: 1.3, turn: { x: 0, y: 30, z: 0 }, label: { ar: "ساعة" } });
    expect(out.lights).toEqual({ preset: "neon" });
    expect(out.tilt).toBeUndefined();
    expect(lookOf3d(out)).toBe("neon");
    expect(lookOf3d(props)).toBeUndefined();
    for (const l of MODEL3D_LOOKS) for (const k of Object.keys(l.set)) expect(LOOK_KEYS as readonly string[], `${l.key}: ${k}`).toContain(k);
    expect(new Set(MODEL3D_LOOKS.map((l) => l.key)).size).toBe(MODEL3D_LOOKS.length);
  });
});
