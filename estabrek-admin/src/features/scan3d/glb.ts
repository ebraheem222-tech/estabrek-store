/**
 * The scanned model as a binary glTF 2.0 file (.glb): one mesh with its positions,
 * normals and colours (per corner), in metres (y up, standing on y = 0), with a plain
 * matte material that shows the colours. The 3D stage and any glTF viewer read it.
 * glTF keeps vertex colours as linear light: the video's sRGB colours are turned into it
 * (16 bits each, so dark tones keep their steps).
 */
import { MAT_UNIT_MM } from "./mat";
import type { Mesh } from "./model";

const pad4 = (n: number) => (n + 3) & ~3;
/** An sRGB value (0–255) as linear light (0–1). */
const linear = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export function meshToGlb(mesh: Mesh, name = "scan"): ArrayBuffer {
  const metres = MAT_UNIT_MM / 1000;
  const n = mesh.positions.length / 3;
  const pos = new Float32Array(mesh.positions.length);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i++) {
    pos[i] = mesh.positions[i] * metres;
    lo[i % 3] = Math.min(lo[i % 3], pos[i]);
    hi[i % 3] = Math.max(hi[i % 3], pos[i]);
  }
  const colours = new Uint16Array(n * 4);
  for (let i = 0; i < n * 4; i++) colours[i] = i % 4 === 3 ? 65535 : Math.round(linear(mesh.colors[i]) * 65535);
  const big = n > 65535;
  const idx = big ? new Uint32Array(mesh.indices) : new Uint16Array(mesh.indices);
  const parts = [new Uint8Array(pos.buffer), new Uint8Array(mesh.normals.buffer, mesh.normals.byteOffset, mesh.normals.byteLength), new Uint8Array(colours.buffer), new Uint8Array(idx.buffer)];
  const offsets: number[] = [];
  let length = 0;
  for (const p of parts) {
    offsets.push(length);
    length = pad4(length + p.byteLength);
  }
  const bin = new Uint8Array(length);
  parts.forEach((p, i) => bin.set(p, offsets[i]));
  const json = {
    asset: { version: "2.0", generator: "3D scan" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [{ name, primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3, material: 0 }] }],
    materials: [{ name: "scan", pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.85 } }],
    buffers: [{ byteLength: bin.byteLength }],
    bufferViews: [
      { buffer: 0, byteOffset: offsets[0], byteLength: parts[0].byteLength, target: 34962 },
      { buffer: 0, byteOffset: offsets[1], byteLength: parts[1].byteLength, target: 34962 },
      { buffer: 0, byteOffset: offsets[2], byteLength: parts[2].byteLength, target: 34962 },
      { buffer: 0, byteOffset: offsets[3], byteLength: parts[3].byteLength, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: n, type: "VEC3", min: lo, max: hi },
      { bufferView: 1, componentType: 5126, count: n, type: "VEC3" },
      { bufferView: 2, componentType: 5123, normalized: true, count: n, type: "VEC4" },
      { bufferView: 3, componentType: big ? 5125 : 5123, count: idx.length, type: "SCALAR" },
    ],
  };
  let text = new TextEncoder().encode(JSON.stringify(json));
  const jsonLen = pad4(text.byteLength);
  if (jsonLen !== text.byteLength) {
    const padded = new Uint8Array(jsonLen).fill(0x20);
    padded.set(text);
    text = padded;
  }
  const total = 12 + 8 + jsonLen + 8 + bin.byteLength;
  const out = new ArrayBuffer(total);
  const view = new DataView(out);
  const bytes = new Uint8Array(out);
  view.setUint32(0, 0x46546c67, true); // "glTF"
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonLen, true);
  view.setUint32(16, 0x4e4f534a, true); // "JSON"
  bytes.set(text, 20);
  view.setUint32(20 + jsonLen, bin.byteLength, true);
  view.setUint32(24 + jsonLen, 0x004e4942, true); // "BIN"
  bytes.set(bin, 28 + jsonLen);
  return out;
}
