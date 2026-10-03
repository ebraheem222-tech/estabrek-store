import * as THREE from "three";

type Point = [number, number, number];
type Surface = (u: number, v: number) => Point;
const tau = Math.PI * 2;

function surface(point: Surface, columns = 72, rows = 48) {
  const geometry = new THREE.PlaneGeometry(1, 1, columns, rows);
  const positions = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < positions.count; i++) {
    positions.setXYZ(i, ...point(uv.getX(i), 1 - uv.getY(i)));
  }
  geometry.computeVertexNormals();
  // Average the shared normals at closed UV seams and the back of the hood.
  // The UVs stay separate for the textile map, while the lighting stays smooth.
  const normals = geometry.getAttribute("normal");
  const shared = new Map<string, { sum: THREE.Vector3; indices: number[] }>();
  for (let i = 0; i < positions.count; i++) {
    const key = [positions.getX(i), positions.getY(i), positions.getZ(i)]
      .map((n) => Math.round(n * 10000))
      .join(",");
    const entry = shared.get(key) || { sum: new THREE.Vector3(), indices: [] };
    entry.sum.add(
      new THREE.Vector3(normals.getX(i), normals.getY(i), normals.getZ(i)),
    );
    entry.indices.push(i);
    shared.set(key, entry);
  }
  for (const entry of shared.values()) {
    if (entry.indices.length < 2) continue;
    entry.sum.normalize();
    entry.indices.forEach((i) =>
      normals.setXYZ(i, entry.sum.x, entry.sum.y, entry.sum.z),
    );
  }
  return geometry;
}

function hem(point: Surface, boundary: "opening" | "bottom" | "perimeter") {
  const points: THREE.Vector3[] = [];
  const add = (u: number, v: number) => {
    const p = point(u, v);
    points.push(new THREE.Vector3(p[0], p[1], p[2] + 0.003));
  };
  if (boundary === "perimeter") {
    for (let i = 0; i < 40; i++) add(i / 40, 0);
    for (let i = 0; i < 60; i++) add(1, i / 60);
    for (let i = 0; i < 40; i++) add(1 - i / 40, 1);
    for (let i = 0; i < 60; i++) add(0, 1 - i / 60);
  } else {
    for (let i = 0; i < 96; i++) add(i / 96, boundary === "opening" ? 0 : 1);
  }
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points, true),
    points.length * 2,
    boundary === "opening" ? 0.008 : 0.0035,
    5,
    true,
  );
}

/** Surfaces describe a sewn garment resting on a display bust, in metres. */
export function createHijabGeometry() {
  const hood: Surface = (u, v) => {
    const angle = u * tau;
    const front = Math.min(1, v / 0.38);
    const back = Math.max(0, (v - 0.38) / 0.62);
    const radius = Math.cos((back * Math.PI) / 2);
    const rx = THREE.MathUtils.lerp(0.43, 0.65, front) * radius;
    const ry = THREE.MathUtils.lerp(0.62, 0.8, front) * radius;
    const fold =
      Math.sin(angle * 10 + v * 3) *
      0.014 *
      (0.2 + 0.4 * (1 - Math.cos(angle))) *
      Math.sin((front * Math.PI) / 2) *
      (1 - back) ** 2 *
      radius;
    return [
      Math.sin(angle) * (rx + fold),
      0.87 + 0.04 * front + Math.cos(angle) * (ry + fold),
      0.43 -
        0.4 * Math.sin((front * Math.PI) / 2) -
        0.64 * Math.sin((back * Math.PI) / 2) +
        fold,
    ];
  };
  const cape: Surface = (u, v) => {
    const a = u * tau;
    const spread = Math.pow(Math.sin((v * Math.PI) / 2), 0.72);
    const fold =
      (Math.sin(a * 11 + v * 1.6) + Math.sin(a * 19 - v * 2) * 0.25) *
      (0.015 + v * 0.057);
    return [
      Math.sin(a) * (0.38 + 0.86 * spread - v * 0.06 + fold),
      0.28 +
        (1 - Math.cos(a)) * 0.1 * (1 - v) -
        v * 1.82 +
        Math.sin(a * 3) * 0.035 * v,
      Math.cos(a) * (0.32 + 0.27 * spread + fold),
    ];
  };
  const front: Surface = (u, v) => {
    const fold = Math.sin(u * Math.PI * 7 - v * 0.9) * (0.012 + v * 0.055);
    return [
      -0.54 - v * 0.38 + u * (1.25 + v * 0.52),
      0.22 -
        u * 0.3 +
        Math.sin(u * Math.PI) * 0.16 -
        v * (1.75 - u * 0.24) +
        0.025 * Math.sin(u * Math.PI * 2) * v,
      0.46 + Math.sin(u * Math.PI) * 0.12 + v * 0.25 + fold,
    ];
  };
  const fall = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.48, 1.13, 0.03),
    new THREE.Vector3(0.64, 0.33, 0.42),
    new THREE.Vector3(1.01, -0.39, 0.36),
    new THREE.Vector3(0.77, -1.67, 0.7),
  ]);
  const tail: Surface = (u, v) => {
    const p = fall.getPoint(v);
    const w = 0.25 + Math.sin(v * Math.PI) * 0.25 + v * 0.07;
    return [
      p.x + (u - 0.5) * w,
      p.y + (u - 0.5) * 0.09 * v,
      p.z + Math.sin(u * Math.PI * 3.5 + v) * (0.014 + v * 0.028),
    ];
  };
  return {
    hood: surface(hood),
    cape: surface(cape, 96, 60),
    front: surface(front, 56, 64),
    tail: surface(tail, 24, 64),
    openingHem: hem(hood, "opening"),
    capeHem: hem(cape, "bottom"),
    frontHem: hem(front, "perimeter"),
    tailHem: hem(tail, "perimeter"),
  };
}

export function createDisplayHead() {
  const geometry = new THREE.SphereGeometry(1, 48, 48);
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const sy = positions.getY(i);
    const sz = positions.getZ(i);
    const x = positions.getX(i) * 0.445 * (1 - Math.max(0, -sy) * 0.13);
    const y = sy * 0.655;
    const nose =
      Math.exp((-x * x) / 0.018 - (y - 0.015) ** 2 / 0.014) *
      Math.max(0, sz) ** 6 *
      0.02;
    positions.setXYZ(i, x, y, sz * 0.43 + nose);
  }
  geometry.computeVertexNormals();
  return geometry;
}
