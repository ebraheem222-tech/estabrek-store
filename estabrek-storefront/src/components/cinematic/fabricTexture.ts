import * as THREE from "three";

/**
 * A woven-cloth surface for the 3D hijabs: a plain weave (threads going over and
 * under each other) with uneven threads and soft patches, tileable. Used as the
 * bump map (the light catches the threads) and as the roughness map (some threads
 * shine a little more than others). A perfectly smooth or perfectly regular
 * surface read as plastic; this reads as fabric.
 *
 * `rib` adds a knit-like chevron on top (the winter wool look).
 * Returns { bump, rough }: rough sits around 0.8 so the material's own roughness
 * stays close to what it was, with thread-by-thread variation.
 */
export function createFabricTexture({ size = 256, threads = 32, rib = 0 }: { size?: number; threads?: number; rib?: number } = {}) {
  // Tileable value noise: hashed lattice wrapped at `period`.
  const hash = (x: number, y: number, seed: number) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const noise = (x: number, y: number, period: number, seed: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const w = (t: number) => t * t * (3 - 2 * t);
    const at = (a: number, b: number) => hash(((a % period) + period) % period, ((b % period) + period) % period, seed);
    const top = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * w(xf);
    const bottom = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * w(xf);
    return top + (bottom - top) * w(yf);
  };

  const cell = size / threads;
  const data = new Uint8Array(size * size * 4);
  const roughData = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / cell, v = y / cell;
      const cx = Math.floor(u), cy = Math.floor(v);
      const fx = u - cx, fy = v - cy;
      // Over/under: on alternate cells the warp (vertical) or the weft (horizontal) thread is on top.
      const warpOnTop = (cx + cy) % 2 === 0;
      const warp = Math.sin(Math.PI * fx); // rounded thread profile across its width
      const weft = Math.sin(Math.PI * fy);
      const along = warpOnTop ? Math.sin(Math.PI * fy) : Math.sin(Math.PI * fx); // it dips where it goes under
      let h = warpOnTop ? 0.55 * warp + 0.25 * along : 0.55 * weft + 0.25 * along;
      // Uneven threads: each thread a little thicker or thinner along its length (slub).
      h += (noise(warpOnTop ? cx * 3.1 : x / 9, warpOnTop ? y / 9 : cy * 3.1, threads * 2, 1) - 0.5) * 0.35;
      // Soft patches across the cloth (no two threads alike).
      h += (noise(x / 32, y / 32, size / 32, 2) - 0.5) * 0.25;
      if (rib) h += Math.sin((x / cell + Math.abs((y % (cell * 4)) / cell - 2)) * 2.4) * 0.3 * rib;
      const value = Math.max(0, Math.min(255, Math.round(128 + (h - 0.4) * 150)));
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
      // Raised threads catch a little more light (slightly smoother) than the gaps between them.
      const rough = Math.max(0, Math.min(255, Math.round(205 - (h - 0.4) * 70)));
      roughData[i] = roughData[i + 1] = roughData[i + 2] = rough;
      roughData[i + 3] = 255;
    }
  }
  const make = (pixels: Uint8Array) => {
    const texture = new THREE.DataTexture(pixels, size, size);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  };
  const bump = make(data), rough = make(roughData);
  return {
    bump,
    rough,
    repeat(x: number, y: number) { bump.repeat.set(x, y); rough.repeat.set(x, y); },
    dispose() { bump.dispose(); rough.dispose(); },
  };
}
