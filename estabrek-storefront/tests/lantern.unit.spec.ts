import { expect, test } from "@playwright/test";
import * as THREE from "three";
import { model3dOf } from "../src/pageTree/model3d";
import { FINISHES, MODEL_INFO, MODEL_KNOBS, knobsOf, type ModelKind } from "../src/storeThemes/three/kinds";
import * as products from "../src/storeThemes/three/productModels";

const kind = "lantern" as ModelKind;
const materials = {
  body: new THREE.MeshStandardMaterial({ color: "#482e25" }),
  trim: new THREE.MeshStandardMaterial({ color: "#8c593d" }),
  accent: new THREE.MeshStandardMaterial({ color: "#c28f5a" }),
  glow: new THREE.MeshStandardMaterial({ color: "#ffbc64" }),
  screen: new THREE.MeshStandardMaterial({ color: "#ffe6ac" }),
  metal: new THREE.MeshStandardMaterial({ color: "#b3935e" }),
};
type Builder = (materials: typeof materials, knobs: Record<string, number>, segments?: number) => THREE.Group;
const build = (knobs?: Record<string, number>, segments?: number) => {
  const builder = (products as typeof products & { buildLantern: Builder }).buildLantern;
  expect(builder, "the built-in model must draw original lantern geometry").toBeInstanceOf(Function);
  return builder(materials, knobsOf(kind, knobs), segments);
};
const bounds = (group: THREE.Group) => new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
const meshes = (group: THREE.Group) => {
  const list: THREE.Mesh[] = [];
  group.traverse((object) => { if (object instanceof THREE.Mesh) list.push(object); });
  return list;
};
const dispose = (...groups: THREE.Group[]) => groups.forEach(group => meshes(group).forEach(mesh => mesh.geometry.dispose()));

test("a lantern uses the existing finishes, colours, light, camera and motion contract", () => {
  for (const finish of FINISHES) {
    const spec = model3dOf({ model: "lantern", finish, knobs: { width: 1.2, height: 1.1, ribs: 12, handle: 0 }, colours: { body: "#482e25", trim: "#8c593d", accent: "accent", glow: "#ffbc64", screen: "#ffe6ac", metal: "#b3935e" }, lights: { preset: "warm" }, anim: { type: "swing", speed: 0.6, amount: 0.4, trigger: "hover" }, camera: { fov: 30 }, floor: "disc", drag: true });
    expect(spec).not.toBeNull();
    expect(spec).toMatchObject({ model: "lantern", finish, knobs: { width: 1.2, height: 1.1, ribs: 12, handle: 0 }, colours: { screen: "#ffe6ac", glow: "#ffbc64" }, lights: { preset: "warm" }, anim: { type: "swing", trigger: "hover" }, camera: { fov: 30 }, floor: "disc", drag: true });
  }
  expect(Object.values(MODEL_INFO[kind].label).every(Boolean)).toBe(true);
  expect(MODEL_KNOBS[kind].map(knob => knob.id)).toEqual(["width", "height", "ribs", "handle"]);
  expect(knobsOf(kind, { width: Infinity, height: -20, ribs: 100, handle: 0, unknown: 1 })).toEqual({ width: 1, height: 0.65, ribs: 16, handle: 0 });
});

test("lantern geometry gives every editable colour a visible part and stays compact without lights or assets", () => {
  const group = build();
  const parts = meshes(group);
  expect(parts.length).toBeGreaterThan(12);
  for (const material of Object.values(materials)) expect(parts.some(part => part.material === material)).toBe(true);
  const size = bounds(group);
  expect(size.x).toBeGreaterThan(1);
  expect(size.x).toBeLessThan(2);
  expect(size.y).toBeGreaterThan(2);
  expect(size.y).toBeLessThan(2.7);
  expect(size.z).toBeCloseTo(size.x, 1);
  group.traverse(object => {
    expect(object).not.toBeInstanceOf(THREE.Light);
    if (object instanceof THREE.Mesh) {
      const position = object.geometry.getAttribute("position");
      expect(Array.from(position.array).every(Number.isFinite)).toBe(true);
      expect((object.material as THREE.MeshStandardMaterial).map).toBeNull();
    }
  });
  dispose(group);
});

test("lantern shape controls resize the body independently, change ribs and remove the handle", () => {
  const base = build();
  const wide = build({ width: 1.4 });
  const tall = build({ height: 1.4 });
  const minimal = build({ ribs: 6, handle: 0 }, 8);
  expect(bounds(wide).x).toBeGreaterThan(bounds(base).x * 1.3);
  expect(bounds(wide).y).toBeCloseTo(bounds(base).y, 3);
  expect(bounds(tall).y).toBeGreaterThan(bounds(base).y + 0.5);
  expect(bounds(tall).x).toBeCloseTo(bounds(base).x, 3);
  expect(meshes(base).filter(mesh => mesh.name.startsWith("rib-"))).toHaveLength(10);
  expect(meshes(minimal).filter(mesh => mesh.name.startsWith("rib-"))).toHaveLength(6);
  expect(base.getObjectByName("handle")).toBeDefined();
  expect(minimal.getObjectByName("handle")).toBeUndefined();
  expect(bounds(minimal).y).toBeLessThan(bounds(base).y - 0.2);
  dispose(base, wide, tall, minimal);
});
