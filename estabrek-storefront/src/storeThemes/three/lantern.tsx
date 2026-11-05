"use client";
/** An original ribbed paper lantern: local geometry, the stage's shared materials, no lights or assets. */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { seg, shown, type Draw, type Knobs, type Mats, type ModelColours } from "./parts";

type LanternMaterials = Pick<Mats, keyof ModelColours>;

/** Kept separate from React so shape changes can be measured without creating a WebGL context. */
export function buildLantern(m: LanternMaterials, k: Knobs, segments = 32): THREE.Group {
  const lantern = new THREE.Group();
  lantern.name = "lantern";
  const half = 0.75 * k.height;
  const radius = 0.7 * k.width;
  const centre = -0.15;
  const detail = Math.max(6, Math.round(segments));
  const add = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, y = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.y = y;
    lantern.add(mesh);
    return mesh;
  };
  const profile = Array.from({ length: 17 }, (_, i) => {
    const t = i / 16;
    return new THREE.Vector2(radius * (0.72 + 0.28 * Math.sin(t * Math.PI)), (2 * t - 1) * half);
  });
  // Screen is the luminous paper; body is its solid end caps. The finish comes from the shared stage materials.
  add("paper", new THREE.LatheGeometry(profile, detail), m.screen, centre);
  for (let i = 0; i < k.ribs; i++) {
    const a = (i / k.ribs) * Math.PI * 2;
    const points = profile.map(p => new THREE.Vector3(Math.cos(a) * (p.x + 0.022), centre + p.y, Math.sin(a) * (p.x + 0.022)));
    add(`rib-${i}`, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, 0.018, Math.max(4, Math.round(detail / 4)), false), m.trim);
  }
  for (const side of [-1, 1]) {
    const end = centre + side * half;
    add(side < 0 ? "base" : "cap", new THREE.CylinderGeometry(0.55 * k.width, 0.58 * k.width, 0.12, detail), m.body, end);
    const ring = add(`rim-${side}`, new THREE.TorusGeometry(0.55 * k.width, 0.035, 6, detail), m.trim, end + side * 0.045);
    ring.rotation.x = Math.PI / 2;
  }
  add("foot", new THREE.CylinderGeometry(0.49 * k.width, 0.59 * k.width, 0.1, detail), m.accent, centre - half - 0.12);
  add("roof", new THREE.CylinderGeometry(0.12 * k.width, 0.69 * k.width, 0.21, detail), m.accent, centre + half + 0.15);
  const band = add("light-band", new THREE.TorusGeometry(radius + 0.012, 0.018, 6, detail), m.glow, centre);
  band.rotation.x = Math.PI / 2;
  const top = centre + half + 0.3;
  add("finial", new THREE.SphereGeometry(0.065, Math.max(6, Math.round(detail / 2)), 8), m.metal, top);
  if (shown(k.handle)) {
    const handle = add("handle", new THREE.TorusGeometry(0.25 * k.handle, 0.03, 6, detail), m.metal, top + 0.25 * k.handle);
    // A fixed small turn catches light from either side without adding motion of its own.
    handle.rotation.y = -0.25;
  }
  return lantern;
}

export function Lantern({ m, k, style }: Draw) {
  const detail = seg(style, 32);
  const object = useMemo(() => buildLantern(m, k, detail), [m, k, detail]);
  useEffect(() => () => {
    // Primitive objects own their geometries; materials remain shared with the stage's warm-up renderer.
    object.traverse(part => { if (part instanceof THREE.Mesh) part.geometry.dispose(); });
  }, [object]);
  return <primitive object={object} />;
}
