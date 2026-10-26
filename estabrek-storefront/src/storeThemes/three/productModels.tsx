"use client";
/**
 * The models of every kind of store that isn't gaming: phones and computers, beauty and
 * jewellery, fashion and shoes, books, home, food, sport, music, kids and art. Drawn like
 * the gaming ones (models.tsx): in the theme's colours, about a 2.4-unit box, centred,
 * facing the camera, each with its own shape knobs (kinds.ts MODEL_KNOBS).
 */
import { useMemo, type ReactNode } from "react";
import * as THREE from "three";
import type { ModelKind } from "./kinds";
import { Block, seg, shown, type Draw, type Mats } from "./parts";

/* ------------------------------------------------------------- devices */

function Phone({ m, style, k }: Draw) {
  const s = seg(style, 24);
  const h = 2.3 * k.height;
  const lenses = Math.round(k.lenses);
  const spots: Array<[number, number]> = [
    [-0.16, 0.16],
    [-0.16, -0.16],
    [0.16, 0.16],
    [0.16, -0.16],
  ];
  return (
    <group rotation={[0.08, -0.45, 0.04]}>
      <Block style={style} size={[1.15, h, 0.16]} radius={0.16} material={m.body} />
      <Block style={style} size={[1.04, h - 0.12, 0.02]} radius={0.12} position={[0, 0, 0.085]} material={m.screen} />
      {/* The island at the top of the screen and a glow on the wallpaper. */}
      <Block style={style} size={[0.34, 0.08, 0.02]} radius={0.04} position={[0, h / 2 - 0.16, 0.1]} material={m.dark} />
      <mesh position={[0.1, -0.15, 0.097]} material={m.glow}>
        <circleGeometry args={[0.32, s]} />
      </mesh>
      {/* Side buttons. */}
      <Block style={style} size={[0.04, 0.32, 0.06]} radius={0.02} position={[0.59, 0.35, 0]} material={m.accent} />
      <Block style={style} size={[0.04, 0.2, 0.06]} radius={0.02} position={[-0.59, 0.45, 0]} material={m.metal} />
      {/* The camera bump on the back. */}
      <group position={[-0.24, h / 2 - 0.42, -0.1]}>
        <Block style={style} size={[0.58, 0.58, 0.06]} radius={0.14} material={m.trim} />
        {spots.slice(0, lenses).map(([x, y], i) => (
          <group key={i} position={[lenses === 1 ? 0 : x, lenses === 1 ? 0 : y, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh material={m.metal}>
              <cylinderGeometry args={[0.11, 0.11, 0.06, s]} />
            </mesh>
            <mesh position={[0, -0.035, 0]} material={m.dark}>
              <cylinderGeometry args={[0.075, 0.075, 0.02, s]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function Laptop({ m, style, k }: Draw) {
  const w = 2.4 * k.width;
  const angle = (k.open * 105 * Math.PI) / 180;
  return (
    <group rotation={[0.32, -0.5, 0]} position={[0, -0.35, 0]}>
      <Block style={style} size={[w, 0.08, 1.6]} radius={0.04} material={m.body} />
      {/* Keys as rows, then the trackpad. */}
      {[0, 1, 2, 3].map((r) => (
        <mesh key={r} position={[0, 0.045, -0.5 + r * 0.17]} material={m.dark}>
          <boxGeometry args={[w * 0.82, 0.01, 0.12]} />
        </mesh>
      ))}
      <Block style={style} size={[0.7, 0.01, 0.42]} radius={0.03} position={[0, 0.045, 0.45]} material={m.trim} />
      {/* The lid turns on the back edge; its screen is the face that lay on the keys. */}
      <group position={[0, 0.04, -0.8]} rotation={[-angle, 0, 0]}>
        <Block style={style} size={[w, 0.06, 1.55]} radius={0.03} position={[0, 0.03, 0.775]} material={m.body} />
        <mesh position={[0, -0.002, 0.775]} rotation={[Math.PI / 2, 0, 0]} material={m.screen}>
          <planeGeometry args={[w * 0.92, 1.38]} />
        </mesh>
        <mesh position={[0, -0.004, 0.775]} rotation={[Math.PI / 2, 0, 0]} material={m.glow}>
          <ringGeometry args={[0.18, 0.24, seg(style, 32)]} />
        </mesh>
      </group>
    </group>
  );
}

function Tablet({ m, style, k }: Draw) {
  const w = 1.8 * k.width;
  return (
    <group rotation={[-0.15, -0.35, 0.08]}>
      <Block style={style} size={[w, 2.4, 0.1]} radius={0.14} material={m.body} />
      <Block style={style} size={[w - 0.14, 2.26, 0.02]} radius={0.1} position={[0, 0, 0.055]} material={m.screen} />
      {[0, 1, 2].map((i) => (
        <Block key={i} style={style} size={[(w - 0.5) * (1 - i * 0.25), 0.12, 0.01]} radius={0.04} position={[0, 0.6 - i * 0.28, 0.07]} material={i ? m.trim : m.glow} />
      ))}
      {shown(k.pen) ? (
        <group position={[w / 2 + 0.12, 0, 0.02]} scale={[1, k.pen, 1]}>
          <mesh material={m.trim}>
            <capsuleGeometry args={[0.045, 1.6, 4, seg(style, 12)]} />
          </mesh>
          <mesh position={[0, -0.86, 0]} material={m.dark}>
            <coneGeometry args={[0.045, 0.14, seg(style, 12)]} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

function Watch({ m, style, k }: Draw) {
  const s = seg(style, 40);
  const f = k.face;
  const round = k.round >= 0.5;
  return (
    <group rotation={[0.35, -0.4, 0]}>
      {/* Strap, above and below the face. */}
      {[1, -1].map((side) => (
        <group key={side} position={[0, side * 0.9 * f, -0.08]} rotation={[side * 0.25, 0, 0]}>
          <Block style={style} size={[0.72 * f, 1.1, 0.1]} radius={0.05} position={[0, side * 0.45, 0]} material={m.trim} />
        </group>
      ))}
      {round ? (
        <group rotation={[Math.PI / 2, 0, 0]} scale={f}>
          <mesh material={m.metal}>
            <cylinderGeometry args={[0.72, 0.72, 0.28, s]} />
          </mesh>
          <mesh position={[0, 0.145, 0]} material={m.screen}>
            <cylinderGeometry args={[0.6, 0.6, 0.02, s]} />
          </mesh>
          <mesh position={[0, 0.15, 0]} material={m.glow}>
            <torusGeometry args={[0.44, 0.02, 6, s]} />
          </mesh>
        </group>
      ) : (
        <group scale={f}>
          <Block style={style} size={[1.25, 1.45, 0.3]} radius={0.28} material={m.metal} />
          <Block style={style} size={[1.08, 1.28, 0.02]} radius={0.22} position={[0, 0, 0.155]} material={m.screen} />
          <mesh position={[0, 0.1, 0.17]} material={m.glow}>
            <ringGeometry args={[0.24, 0.3, s]} />
          </mesh>
        </group>
      )}
      {/* Hands, and the crown on the side. */}
      <group position={[0, 0, 0.18 * f]}>
        <mesh position={[0, 0.16 * f, 0]} material={m.accent}>
          <boxGeometry args={[0.04, 0.34 * f, 0.02]} />
        </mesh>
        <mesh position={[0.12 * f, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={m.trim}>
          <boxGeometry args={[0.04, 0.26 * f, 0.02]} />
        </mesh>
      </group>
      <mesh position={[(round ? 0.76 : 0.66) * f, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} material={m.accent}>
        <cylinderGeometry args={[0.08, 0.08, 0.14, seg(style, 16)]} />
      </mesh>
    </group>
  );
}

function Camera({ m, style, k }: Draw) {
  const s = seg(style, 36);
  const lens = k.lens;
  return (
    <group rotation={[0.15, -0.55, 0]}>
      <Block style={style} size={[2.0, 1.25, 0.8]} radius={0.12} material={m.body} />
      <Block style={style} size={[2.02, 0.22, 0.82]} radius={0.06} position={[0, 0.52, 0]} material={m.metal} />
      {/* Viewfinder hump, shutter and dial. */}
      <Block style={style} size={[0.7, 0.38, 0.6]} radius={0.08} position={[-0.1, 0.78, -0.02]} material={m.body} />
      <mesh position={[0.65, 0.7, 0.1]} material={m.accent}>
        <cylinderGeometry args={[0.1, 0.1, 0.1, s]} />
      </mesh>
      <mesh position={[0.35, 0.68, 0.1]} material={m.metal}>
        <cylinderGeometry args={[0.16, 0.16, 0.08, s]} />
      </mesh>
      <Block style={style} size={[0.42 * k.grip, 1.15, 0.95]} radius={0.12} position={[0.82, -0.04, 0.08]} material={m.dark} />
      {/* The lens: mount, barrel, glass. */}
      <group position={[-0.15, -0.05, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0.08, 0]} material={m.metal}>
          <cylinderGeometry args={[0.56, 0.56, 0.16, s]} />
        </mesh>
        <mesh position={[0, 0.16 + 0.3 * lens, 0]} material={m.dark}>
          <cylinderGeometry args={[0.48, 0.52, 0.6 * lens, s]} />
        </mesh>
        <mesh position={[0, 0.16 + 0.3 * lens, 0]} material={m.trim}>
          <torusGeometry args={[0.5, 0.03, 6, s]} />
        </mesh>
        <mesh position={[0, 0.17 + 0.6 * lens, 0]} material={m.screen}>
          <cylinderGeometry args={[0.36, 0.36, 0.03, s]} />
        </mesh>
        <mesh position={[0.12, 0.19 + 0.6 * lens, 0.1]} material={m.glow}>
          <cylinderGeometry args={[0.07, 0.07, 0.01, s]} />
        </mesh>
      </group>
    </group>
  );
}

function Speaker({ m, style, k }: Draw) {
  const s = seg(style, 36);
  const h = 2.0 * k.height;
  const n = Math.round(k.drivers);
  const ys = n === 1 ? [0] : n === 2 ? [h * 0.2, -h * 0.2] : [h * 0.28, 0, -h * 0.28];
  return (
    <group rotation={[0.08, -0.4, 0]}>
      <Block style={style} size={[1.25, h, 1.0]} radius={0.14} material={m.body} />
      {ys.map((y, i) => {
        const r = n === 1 ? 0.48 : i === n - 1 ? 0.42 : 0.3;
        return (
          <group key={i} position={[0, y, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh material={m.trim}>
              <cylinderGeometry args={[r + 0.06, r + 0.06, 0.04, s]} />
            </mesh>
            <mesh position={[0, -0.04, 0]} material={m.dark}>
              <coneGeometry args={[r, 0.14, s, 1, true]} />
            </mesh>
            <mesh position={[0, 0.02, 0]} material={m.metal}>
              <sphereGeometry args={[r * 0.28, s, seg(style, 16), 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, -h / 2 + 0.1, 0.505]} material={m.glow}>
        <boxGeometry args={[0.5, 0.04, 0.01]} />
      </mesh>
    </group>
  );
}

/* ---------------------------------------------------------- books & art */

function Book({ m, style, k }: Draw) {
  const n = Math.round(k.stack);
  const covers = [m.body, m.accent, m.trim, m.body];
  return (
    <group rotation={[0.28, -0.5, 0]} position={[0, -0.25, 0]}>
      {Array.from({ length: n }, (_, i) => {
        const w = 1.9 - i * 0.12;
        const d = 1.4 - i * 0.06;
        const y = -0.5 + i * 0.34;
        return (
          <group key={i} position={[(i % 2 ? 0.08 : -0.06), y, 0]} rotation={[0, (i % 2 ? 0.12 : -0.08), 0]}>
            <Block style={style} size={[w, 0.32, d]} radius={0.03} material={covers[i]} />
            {/* The pages show on three sides; the spine carries gold bands. */}
            <mesh position={[0.03, 0, 0.012]} material={m.paper}>
              <boxGeometry args={[w - 0.03, 0.26, d - 0.03]} />
            </mesh>
            {[-0.09, 0.09].map((b) => (
              <mesh key={b} position={[-w / 2 - 0.002, b, 0]} material={m.metal}>
                <boxGeometry args={[0.01, 0.03, d * 0.9]} />
              </mesh>
            ))}
          </group>
        );
      })}
      {shown(k.open) ? (
        <group position={[0, -0.5 + n * 0.34 + 0.02, 0]} scale={k.open}>
          {[-1, 1].map((side) => (
            <group key={side} rotation={[0, 0, side * -0.14]}>
              <mesh position={[side * 0.72, 0.02, 0]} material={m.body}>
                <boxGeometry args={[1.45, 0.04, 1.3]} />
              </mesh>
              <mesh position={[side * 0.7, 0.07, 0]} material={m.paper}>
                <boxGeometry args={[1.38, 0.06, 1.22]} />
              </mesh>
              {[0, 1, 2, 3].map((l) => (
                <mesh key={l} position={[side * 0.7, 0.101, -0.35 + l * 0.2]} material={m.dark}>
                  <boxGeometry args={[1.0, 0.002, 0.03]} />
                </mesh>
              ))}
            </group>
          ))}
          <mesh position={[0, 0.12, 0.3]} rotation={[0, 0, Math.PI / 2]} material={m.accent}>
            <boxGeometry args={[0.02, 0.09, 0.9]} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

function Palette({ m, style, k }: Draw) {
  const shape = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-1.1, 0);
    sh.bezierCurveTo(-1.1, 0.9, 0.2, 1.05, 0.9, 0.7);
    sh.bezierCurveTo(1.35, 0.45, 1.2, -0.1, 0.8, -0.2);
    sh.bezierCurveTo(0.45, -0.28, 0.55, -0.75, 0.15, -0.8);
    sh.bezierCurveTo(-0.6, -0.9, -1.1, -0.6, -1.1, 0);
    const hole = new THREE.Path();
    hole.absarc(0.55, 0.15, 0.17, 0, Math.PI * 2, true);
    sh.holes.push(hole);
    return sh;
  }, []);
  const paints = Math.round(k.paints);
  const colours: Mats[keyof Mats][] = [m.accent, m.glow, m.trim, m.metal, m.screen, m.body, m.dark];
  const spots: Array<[number, number]> = [
    [-0.75, 0.25],
    [-0.45, 0.6],
    [-0.05, 0.72],
    [0.4, 0.62],
    [-0.75, -0.25],
    [-0.4, -0.55],
    [0.05, -0.55],
  ];
  return (
    <group rotation={[0.85, 0, 0.25]}>
      <mesh material={m.body}>
        <extrudeGeometry args={[shape, { depth: 0.08, bevelEnabled: style !== "voxel", bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: seg(style, 24) }]} />
      </mesh>
      {spots.slice(0, paints).map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.13]} scale={[1, 1, 0.45]} material={colours[i % colours.length]}>
          <sphereGeometry args={[0.16, seg(style, 20), seg(style, 12)]} />
        </mesh>
      ))}
      {shown(k.brush) ? (
        <group position={[0.1, 0, 0.32]} rotation={[0, 0, -0.75]} scale={k.brush}>
          <mesh material={m.trim}>
            <cylinderGeometry args={[0.05, 0.035, 1.5, seg(style, 12)]} />
          </mesh>
          <mesh position={[0, 0.85, 0]} material={m.metal}>
            <cylinderGeometry args={[0.055, 0.05, 0.22, seg(style, 12)]} />
          </mesh>
          <mesh position={[0, 1.05, 0]} material={m.accent}>
            <coneGeometry args={[0.06, 0.24, seg(style, 12)]} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

/* ------------------------------------------------------ beauty & jewels */

function Perfume({ m, style, k }: Draw) {
  const s = seg(style, 32);
  const neck = 0.28 * k.neck;
  return (
    <group rotation={[0.1, -0.5, 0]} position={[0, -0.25, 0]}>
      <Block style={style} size={[1.35, 1.5, 0.72]} radius={0.18} material={m.body} />
      {/* The perfume inside, and a label. */}
      <Block style={style} size={[1.12, 0.95, 0.5]} radius={0.12} position={[0, -0.2, 0]} material={m.accent} />
      <Block style={style} size={[0.7, 0.32, 0.02]} radius={0.04} position={[0, 0.2, 0.37]} material={m.metal} />
      <mesh position={[0, 0.75 + neck / 2, 0]} material={m.metal}>
        <cylinderGeometry args={[0.13, 0.15, neck, s]} />
      </mesh>
      <group position={[0, 0.75 + neck + 0.28 * k.cap, 0]} scale={k.cap}>
        <mesh material={m.trim}>
          <cylinderGeometry args={[0.3, 0.3, 0.55, style === "voxel" ? 4 : 8]} />
        </mesh>
        <mesh position={[0, 0.29, 0]} material={m.glow}>
          <cylinderGeometry args={[0.18, 0.3, 0.04, style === "voxel" ? 4 : 8]} />
        </mesh>
      </group>
    </group>
  );
}

function Lipstick({ m, style, k }: Draw) {
  const s = seg(style, 32);
  const b = k.bullet;
  return (
    <group rotation={[0.2, -0.4, 0.12]} position={[shown(k.cap) ? -0.35 : 0, -0.2, 0]}>
      <mesh position={[0, -0.55, 0]} material={m.metal}>
        <cylinderGeometry args={[0.36, 0.36, 0.9, s]} />
      </mesh>
      <mesh position={[0, -0.08, 0]} material={m.trim}>
        <cylinderGeometry args={[0.37, 0.37, 0.08, s]} />
      </mesh>
      <mesh position={[0, 0.12, 0]} material={m.metal}>
        <cylinderGeometry args={[0.3, 0.3, 0.36, s]} />
      </mesh>
      {/* The colour itself, cut at a slant. */}
      <mesh position={[0, 0.3 + 0.3 * b, 0]} material={m.accent}>
        <cylinderGeometry args={[0.24, 0.24, 0.6 * b, s]} />
      </mesh>
      <mesh position={[0.02, 0.6 * b + 0.32, 0]} rotation={[0, 0, 0.55]} material={m.accent}>
        <cylinderGeometry args={[0.02, 0.24, 0.32, s]} />
      </mesh>
      {shown(k.cap) ? (
        <group position={[0.85, -0.6, 0.2]} rotation={[0, 0, Math.PI / 2 - 0.2]} scale={k.cap}>
          <mesh material={m.body}>
            <cylinderGeometry args={[0.39, 0.39, 1.1, s]} />
          </mesh>
          <mesh position={[0, 0.56, 0]} material={m.glow}>
            <cylinderGeometry args={[0.2, 0.2, 0.02, s]} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

function Jar({ m, style, k }: Draw) {
  const s = seg(style, 40);
  const h = 1.0 * k.height;
  const lid = k.lid;
  return (
    <group rotation={[0.35, -0.3, 0]}>
      <mesh position={[0, -h / 2, 0]} material={m.body}>
        <cylinderGeometry args={[0.95, 0.9, h, s]} />
      </mesh>
      <mesh position={[0, -h / 2, 0]} material={m.trim}>
        <cylinderGeometry args={[0.96, 0.96, h * 0.4, s, 1, true]} />
      </mesh>
      {/* The lid sits open beside the cream. */}
      <mesh position={[0, 0.02, 0]} material={m.paper}>
        <cylinderGeometry args={[0.86, 0.86, 0.06, s]} />
      </mesh>
      <mesh position={[0.1, 0.1, 0.05]} scale={[1, 0.35, 1]} material={m.paper}>
        <sphereGeometry args={[0.32, s, seg(style, 16)]} />
      </mesh>
      <group position={[0.9, 0.35, -0.45]} rotation={[0.9, 0.2, -0.3]} scale={lid}>
        <mesh material={m.accent}>
          <cylinderGeometry args={[0.98, 0.98, 0.32, s]} />
        </mesh>
        <mesh position={[0, 0.17, 0]} material={m.metal}>
          <torusGeometry args={[0.6, 0.03, 6, s]} />
        </mesh>
      </group>
    </group>
  );
}

function Ring({ m, style, k }: Draw) {
  const s = seg(style, 48);
  const stone = k.stone;
  return (
    <group rotation={[0.55, -0.3, 0]} position={[0, -0.25, 0]}>
      <mesh material={m.metal} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.8, 0.1 * k.band, seg(style, 16), s]} />
      </mesh>
      {shown(stone) ? (
        <group position={[0, 0.82 + 0.25 * stone, 0]} scale={stone}>
          {/* Four claws hold an eight-sided stone. */}
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI) / 2 + Math.PI / 4) * 0.2, -0.05, Math.sin((i * Math.PI) / 2 + Math.PI / 4) * 0.2]} material={m.metal}>
              <cylinderGeometry args={[0.025, 0.03, 0.34, 8]} />
            </mesh>
          ))}
          <mesh position={[0, 0.12, 0]} material={m.gem}>
            <cylinderGeometry args={[0.16, 0.3, 0.14, 8]} />
          </mesh>
          <mesh position={[0, -0.08, 0]} rotation={[Math.PI, 0, 0]} material={m.gem}>
            <coneGeometry args={[0.3, 0.32, 8]} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

function Gem({ m, k }: Draw) {
  const n = Math.round(k.facets);
  return (
    <group rotation={[0.3, 0.2, 0]} position={[0, 0.1, 0]} scale={1.1}>
      <mesh position={[0, 0.35, 0]} material={m.gem}>
        <cylinderGeometry args={[0.55, 1.0, 0.36, n]} />
      </mesh>
      <mesh position={[0, -0.38 * k.height, 0]} rotation={[Math.PI, 0, 0]} material={m.gem}>
        <coneGeometry args={[1.0, 1.1 * k.height, n]} />
      </mesh>
      <mesh position={[0, 0.535, 0]} material={m.glow}>
        <cylinderGeometry args={[0.55, 0.55, 0.01, n]} />
      </mesh>
    </group>
  );
}

/* --------------------------------------------------- fashion & shoes */

function Sneaker({ m, style, k }: Draw) {
  const s = seg(style, 24);
  const sole = 0.22 * k.sole;
  const collar = k.collar;
  return (
    <group rotation={[0.18, -0.65, 0]} position={[0, -0.25, 0]}>
      {/* Outsole and midsole. */}
      <Block style={style} size={[2.6, sole, 1.0]} radius={Math.min(0.1, sole / 2)} position={[0, -0.4, 0]} material={m.paper} />
      <Block style={style} size={[2.62, 0.06, 1.02]} radius={0.03} position={[0, -0.4 - sole / 2 + 0.03, 0]} material={m.dark} />
      <mesh position={[0, -0.4 + sole / 2 - 0.02, 0.51]} material={m.accent}>
        <boxGeometry args={[2.3, 0.05, 0.01]} />
      </mesh>
      {/* Toe box, body, heel and collar. */}
      <mesh position={[0.82, -0.12, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.85, 1, 1.1]} material={m.accent}>
        <capsuleGeometry args={[0.42, 0.6, 6, s]} />
      </mesh>
      <Block style={style} size={[1.6, 0.8, 0.96]} radius={0.3} position={[-0.25, 0.02, 0]} material={m.body} />
      <Block style={style} size={[0.75, 0.55 * collar, 0.9]} radius={0.2} position={[-0.75, 0.38 + 0.2 * (collar - 1), 0]} material={m.body} />
      <Block style={style} size={[0.5, 0.62, 0.98]} radius={0.16} position={[-0.92, 0.0, 0]} material={m.accent} />
      <mesh position={[-1.18, 0.2, 0]} material={m.glow}>
        <boxGeometry args={[0.06, 0.4, 0.4]} />
      </mesh>
      {/* Tongue and laces. */}
      <Block style={style} size={[0.6, 0.12, 0.5]} radius={0.05} position={[0.05, 0.42, 0]} rotation={[0, 0, 0.35]} material={m.trim} />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0.45 - i * 0.22, 0.24 + i * 0.07, 0]} rotation={[0, 0, 0.3]} material={m.paper}>
          <boxGeometry args={[0.05, 0.03, 0.62]} />
        </mesh>
      ))}
      {/* The side stripe. */}
      <mesh position={[-0.2, 0, 0.49]} rotation={[0, 0, 0.32]} material={m.paper}>
        <boxGeometry args={[1.3, 0.12, 0.02]} />
      </mesh>
      <mesh position={[-0.2, 0, -0.49]} rotation={[0, 0, 0.32]} material={m.paper}>
        <boxGeometry args={[1.3, 0.12, 0.02]} />
      </mesh>
    </group>
  );
}

function Handbag({ m, style, k }: Draw) {
  const s = seg(style, 40);
  const w = 1.9 * k.width;
  return (
    <group rotation={[0.12, -0.45, 0]} position={[0, -0.4, 0]}>
      <Block style={style} size={[w, 1.4, 0.75]} radius={0.2} material={m.body} />
      {/* The flap, its clasp and the stitching. */}
      <Block style={style} size={[w + 0.02, 0.62, 0.08]} radius={0.06} position={[0, 0.4, 0.37]} material={m.trim} />
      <Block style={style} size={[0.3, 0.2, 0.06]} radius={0.04} position={[0, 0.12, 0.43]} material={m.metal} />
      <mesh position={[0, -0.35, 0.381]} material={m.accent}>
        <boxGeometry args={[w * 0.82, 0.02, 0.01]} />
      </mesh>
      {/* The handle, an arch over the top. */}
      <group position={[0, 0.7, 0]} scale={[1, k.handle, 1]}>
        <mesh material={m.trim}>
          <torusGeometry args={[0.55, 0.06, seg(style, 12), s, Math.PI]} />
        </mesh>
        {[-0.55, 0.55].map((x) => (
          <mesh key={x} position={[x, 0, 0]} material={m.metal}>
            <torusGeometry args={[0.08, 0.025, 6, 16]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Hanger({ m, style, k }: Draw) {
  const s = seg(style, 32);
  const len = 1.3 * k.length;
  const flare = 0.9 * k.flare;
  return (
    <group rotation={[0.05, -0.3, 0]} position={[0, 0.15, 0]}>
      {/* Hook and shoulders. */}
      <mesh position={[0, 1.2, 0]} rotation={[0, 0, Math.PI * 0.15]} material={m.metal}>
        <torusGeometry args={[0.12, 0.025, 6, 16, Math.PI * 1.3]} />
      </mesh>
      <mesh position={[0, 1.04, 0]} material={m.metal}>
        <cylinderGeometry args={[0.025, 0.025, 0.12, 8]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.35, 0.86, 0]} rotation={[0, 0, side * -1.13]} material={m.metal}>
          <capsuleGeometry args={[0.03, 0.78, 4, 8]} />
        </mesh>
      ))}
      {/* The dress: bodice, belt and a skirt that flares. */}
      <mesh position={[0, 0.45, 0]} material={m.body}>
        <cylinderGeometry args={[0.5, 0.36, 0.75, s]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.42, 0.72, 0]} rotation={[0, 0, side * -0.5]} material={m.body}>
          <capsuleGeometry args={[0.13, 0.2, 4, s]} />
        </mesh>
      ))}
      <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.accent}>
        <torusGeometry args={[0.37, 0.05, 8, s]} />
      </mesh>
      <mesh position={[0, 0.06 - len / 2, 0]} material={m.body}>
        <cylinderGeometry args={[0.36, flare, len, s, 1, true]} />
      </mesh>
      <mesh position={[0, 0.06 - len + 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.trim}>
        <torusGeometry args={[flare, 0.03, 6, s]} />
      </mesh>
    </group>
  );
}

/* ----------------------------------------------------------- home & food */

function Mug({ m, style, k }: Draw) {
  const s = seg(style, 36);
  const h = 1.25 * k.height;
  const curves = useMemo(
    () =>
      [-0.25, 0.2].map(
        (x, i) =>
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(x, 0, 0),
            new THREE.Vector3(x + 0.18, 0.35, 0),
            new THREE.Vector3(x - 0.12, 0.7, 0.05),
            new THREE.Vector3(x + 0.1, 1.05 - i * 0.15, 0),
          ]),
      ),
    [],
  );
  return (
    <group rotation={[0.28, -0.4, 0]} position={[0, -0.45, 0]}>
      <mesh position={[0, -0.04, 0]} material={m.trim}>
        <cylinderGeometry args={[1.15, 1.05, 0.08, s]} />
      </mesh>
      <mesh position={[0, h / 2, 0]} material={m.body}>
        <cylinderGeometry args={[0.72, 0.62, h, s, 1, true]} />
      </mesh>
      <mesh position={[0, 0.03, 0]} material={m.body}>
        <cylinderGeometry args={[0.62, 0.62, 0.06, s]} />
      </mesh>
      <mesh position={[0, h - 0.1, 0]} material={m.dark}>
        <cylinderGeometry args={[0.69, 0.69, 0.02, s]} />
      </mesh>
      <mesh position={[0, h * 0.6, 0]} material={m.accent}>
        <cylinderGeometry args={[0.705, 0.68, 0.16, s, 1, true]} />
      </mesh>
      <mesh position={[0.78, h * 0.52, 0]} rotation={[0, 0, -Math.PI / 2]} material={m.body}>
        <torusGeometry args={[0.3, 0.08, seg(style, 12), s, Math.PI]} />
      </mesh>
      {shown(k.steam) ? (
        <group position={[0, h + 0.05, 0]} scale={[1, k.steam, 1]}>
          {curves.map((c, i) => (
            <mesh key={i} material={m.steam}>
              <tubeGeometry args={[c, 24, 0.05, 8, false]} />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  );
}

function Plant({ m, style, k }: Draw) {
  const s = seg(style, 32);
  const n = Math.round(k.leaves);
  const pot = k.pot;
  return (
    <group rotation={[0.15, 0, 0]} position={[0, -0.3, 0]}>
      <group scale={pot}>
        <mesh position={[0, -0.6, 0]} material={m.body}>
          <cylinderGeometry args={[0.72, 0.52, 0.9, s]} />
        </mesh>
        <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.trim}>
          <torusGeometry args={[0.72, 0.07, 8, s]} />
        </mesh>
        <mesh position={[0, -0.18, 0]} material={m.dark}>
          <cylinderGeometry args={[0.68, 0.68, 0.04, s]} />
        </mesh>
      </group>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const tall = 0.75 + ((i * 37) % 10) / 25;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[0, 0.02 + tall * 0.45, 0.2]} rotation={[0.45, 0, 0]} scale={[0.32, tall * 0.85, 0.07]} material={i % 2 ? m.leaf : m.leafDark}>
              <sphereGeometry args={[1, seg(style, 16), seg(style, 12)]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Lamp({ m, style, k }: Draw) {
  const s = seg(style, 36);
  const h = 1.6 * k.height;
  const shade = k.shade;
  return (
    <group position={[0, -1.0, 0]} rotation={[0.1, 0, 0]}>
      <mesh position={[0, 0.06, 0]} material={m.metal}>
        <cylinderGeometry args={[0.6, 0.66, 0.12, s]} />
      </mesh>
      <mesh position={[0, 0.12 + h / 2, 0]} material={m.metal}>
        <cylinderGeometry args={[0.05, 0.05, h, seg(style, 12)]} />
      </mesh>
      <mesh position={[0, 0.12 + h - 0.05, 0]} material={m.glow}>
        <sphereGeometry args={[0.22, s, seg(style, 16)]} />
      </mesh>
      <group position={[0, 0.12 + h, 0]} scale={shade}>
        <mesh material={m.body}>
          <cylinderGeometry args={[0.45, 0.85, 0.8, s, 1, true]} />
        </mesh>
        <mesh position={[0, -0.38, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.accent}>
          <torusGeometry args={[0.84, 0.025, 6, s]} />
        </mesh>
      </group>
    </group>
  );
}

function Vase({ m, style, k }: Draw) {
  const points = useMemo(() => {
    const b = k.belly;
    const n = k.neck;
    return [
      [0, -1.1],
      [0.45, -1.1],
      [0.62 * b, -0.8],
      [0.9 * b, -0.25],
      [0.82 * b, 0.25],
      [0.45, 0.65],
      [0.3, 0.65 + 0.45 * n],
      [0.42, 0.75 + 0.5 * n],
      [0.38, 0.78 + 0.5 * n],
    ].map(([x, y]) => new THREE.Vector2(x, y));
  }, [k.belly, k.neck]);
  return (
    <group rotation={[0.12, 0, 0]} position={[0, 0.05, 0]}>
      <mesh material={m.body}>
        <latheGeometry args={[points, seg(style, 48)]} />
      </mesh>
      <mesh position={[0, -0.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.accent}>
        <torusGeometry args={[0.91 * k.belly, 0.035, 6, seg(style, 48)]} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.trim}>
        <torusGeometry args={[0.88 * k.belly, 0.02, 6, seg(style, 48)]} />
      </mesh>
    </group>
  );
}

/* ----------------------------------------------------- sport, play, music */

function Dumbbell({ m, style, k }: Draw) {
  const s = seg(style, 32);
  const bar = 0.75 * k.bar;
  const p = k.plates;
  return (
    <group rotation={[0.45, -0.5, 0.2]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={m.metal}>
        <cylinderGeometry args={[0.07, 0.07, bar * 2 + 0.9, s]} />
      </mesh>
      {/* Knurled grip. */}
      <mesh rotation={[0, 0, Math.PI / 2]} material={m.dark}>
        <cylinderGeometry args={[0.085, 0.085, bar * 1.2, s]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (bar + 0.12), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={m.body}>
            <cylinderGeometry args={[0.62 * p, 0.62 * p, 0.2, s]} />
          </mesh>
          <mesh position={[0, side * -0.2, 0]} material={m.accent}>
            <cylinderGeometry args={[0.5 * p, 0.5 * p, 0.18, s]} />
          </mesh>
          <mesh position={[0, side * 0.16, 0]} material={m.metal}>
            <cylinderGeometry args={[0.13, 0.13, 0.12, s]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Ball({ m, style, k }: Draw) {
  const s = seg(style, 48);
  const type = Math.round(k.panels);
  const r = 1.0 * k.size;
  // A football's black patches sit where an icosahedron has its corners.
  const patches = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 0);
    const pos = g.getAttribute("position");
    const seen: THREE.Vector3[] = [];
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i).normalize();
      if (!seen.some((x) => x.distanceTo(v) < 0.01)) seen.push(v);
    }
    g.dispose();
    return seen.map((v) => ({ v, q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v) }));
  }, []);
  return (
    <group rotation={[0.4, 0.3, 0]}>
      <mesh material={type === 0 ? m.paper : type === 1 ? m.accent : m.glow}>
        <sphereGeometry args={[r, s, seg(style, 32)]} />
      </mesh>
      {type === 0
        ? // Five-sided caps that follow the ball's curve.
          patches.map(({ q }, i) => (
            <mesh key={i} quaternion={q} material={m.dark}>
              <sphereGeometry args={[r * 1.004, 5, 3, 0, Math.PI * 2, 0, 0.36]} />
            </mesh>
          ))
        : // Seams: two great circles, and two smaller ones on the sides (a basketball's, a tennis ball's curve).
          [
            { pos: [0, 0, 0], rot: [0, 0, 0], big: true },
            { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], big: true },
            { pos: [r * 0.694, 0, 0], rot: [0, Math.PI / 2, 0], big: false },
            { pos: [-r * 0.694, 0, 0], rot: [0, Math.PI / 2, 0], big: false },
          ]
            .filter((x) => type === 1 || !x.big)
            .map((x, i) => (
              <mesh key={i} position={x.pos as [number, number, number]} rotation={x.rot as [number, number, number]} material={type === 1 ? m.dark : m.paper}>
                <torusGeometry args={[r * (x.big ? 1.003 : 0.723), r * 0.022, 6, s]} />
              </mesh>
            ))}
    </group>
  );
}

function Blocks({ m, style, k }: Draw) {
  const n = Math.round(k.count);
  const size = 0.8 * k.size;
  const mats = [m.accent, m.body, m.glow, m.trim, m.screen, m.metal];
  const at: Array<[number, number, number, number]> = [
    [-0.45, -0.6, 0, 0.1],
    [0.45, -0.6, 0.05, -0.15],
    [0, 0.2, 0, 0.3],
    [-0.9, -0.6, -0.9, 0.05],
    [0.95, -0.6, -0.7, -0.25],
    [0.05, 1.0, 0.05, -0.2],
  ];
  return (
    <group rotation={[0.3, -0.55, 0]} position={[0, -0.1, 0]}>
      {at.slice(0, n).map(([x, y, z, r], i) => (
        <group key={i} position={[x * k.size, y * k.size, z * k.size]} rotation={[0, r, 0]}>
          <Block style={style} size={[size, size, size]} radius={0.1} material={mats[i % mats.length]} />
          {/* Studs on top, like building bricks. */}
          {[
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ].map(([a, b], j) => (
            <mesh key={j} position={[a * size * 0.22, size / 2 + 0.05, b * size * 0.22]} material={mats[i % mats.length]}>
              <cylinderGeometry args={[size * 0.12, size * 0.12, 0.1, seg(style, 16)]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Guitar({ m, style, k }: Draw) {
  const s = seg(style, 40);
  const neck = 2.0 * k.neck;
  const strings = Math.round(k.strings);
  return (
    <group rotation={[0.1, -0.3, -0.42]} scale={0.72} position={[0, -0.2, 0]}>
      {/* The body: lower and upper bout, sound hole, bridge. */}
      <mesh position={[0, -0.75, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.body}>
        <cylinderGeometry args={[0.85, 0.85, 0.32, s]} />
      </mesh>
      <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.body}>
        <cylinderGeometry args={[0.64, 0.64, 0.32, s]} />
      </mesh>
      <mesh position={[0, -0.15, 0.165]} material={m.dark}>
        <circleGeometry args={[0.26, s]} />
      </mesh>
      <mesh position={[0, -0.15, 0.166]} material={m.accent}>
        <ringGeometry args={[0.28, 0.33, s]} />
      </mesh>
      <Block style={style} size={[0.7, 0.12, 0.06]} radius={0.03} position={[0, -1.05, 0.18]} material={m.dark} />
      {/* Neck, frets, head with its pegs. */}
      <Block style={style} size={[0.24, neck, 0.12]} radius={0.04} position={[0, 0.5 + neck / 2, 0.08]} material={m.trim} />
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[0, 0.75 + (i * neck) / 9, 0.145]} material={m.metal}>
          <boxGeometry args={[0.24, 0.015, 0.01]} />
        </mesh>
      ))}
      <Block style={style} size={[0.34, 0.55, 0.1]} radius={0.06} position={[0, 0.78 + neck, 0.06]} material={m.trim} />
      {[-1, 1].map((side) =>
        [0, 1, 2].map((j) => (
          <mesh key={`${side}${j}`} position={[side * 0.22, 0.62 + neck + j * 0.15, 0.06]} rotation={[0, 0, Math.PI / 2]} material={m.metal}>
            <cylinderGeometry args={[0.03, 0.03, 0.12, 8]} />
          </mesh>
        )),
      )}
      {Array.from({ length: strings }, (_, i) => {
        const x = (i - (strings - 1) / 2) * (0.16 / Math.max(1, strings - 1));
        const len = neck + 1.45;
        return (
          <mesh key={i} position={[x, -1.05 + len / 2, 0.19]} material={m.glow}>
            <boxGeometry args={[0.008, len, 0.008]} />
          </mesh>
        );
      })}
    </group>
  );
}

function Vinyl({ m, style, k }: Draw) {
  const s = seg(style, 64);
  return (
    <group rotation={[0.18, -0.4, 0]}>
      {shown(k.sleeve) ? (
        <group position={[-0.45, 0, -0.06]} scale={[k.sleeve, 1, 1]}>
          <Block style={style} size={[2.3, 2.3, 0.05]} radius={0.02} material={m.body} />
          <mesh position={[0, 0.1, 0.03]} material={m.glow}>
            <circleGeometry args={[0.62, s]} />
          </mesh>
          <mesh position={[0, -0.85, 0.03]} material={m.accent}>
            <planeGeometry args={[1.6, 0.14]} />
          </mesh>
        </group>
      ) : null}
      <group position={[shown(k.sleeve) ? 0.45 : 0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={m.dark}>
          <cylinderGeometry args={[1.12, 1.12, 0.03, s]} />
        </mesh>
        {/* Grooves catch the light in rings. */}
        {[0.55, 0.7, 0.85, 1.0].map((r) => (
          <mesh key={r} position={[0, 0.017, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.trim}>
            <torusGeometry args={[r, 0.004, 4, s]} />
          </mesh>
        ))}
        <mesh position={[0, 0.018, 0]} material={m.accent}>
          <cylinderGeometry args={[0.36 * k.label, 0.36 * k.label, 0.01, s]} />
        </mesh>
        <mesh position={[0, 0.025, 0]} material={m.metal}>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
        </mesh>
      </group>
    </group>
  );
}

export const PRODUCT_MODELS = {
  phone: Phone,
  laptop: Laptop,
  tablet: Tablet,
  watch: Watch,
  camera: Camera,
  speaker: Speaker,
  book: Book,
  perfume: Perfume,
  lipstick: Lipstick,
  jar: Jar,
  sneaker: Sneaker,
  handbag: Handbag,
  hanger: Hanger,
  ring: Ring,
  gem: Gem,
  mug: Mug,
  plant: Plant,
  lamp: Lamp,
  dumbbell: Dumbbell,
  ball: Ball,
  guitar: Guitar,
  vinyl: Vinyl,
  vase: Vase,
  blocks: Blocks,
  palette: Palette,
} satisfies Partial<Record<ModelKind, (p: Draw) => ReactNode>>;
