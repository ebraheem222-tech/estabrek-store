"use client";
/**
 * Models drawn in code (three.js through react-three-fiber): no files to download, a few
 * kilobytes each, and coloured by the theme (ModelColours from the theme's palette). The
 * gaming ones are here, every other kind of store's in productModels.tsx. Each sits in
 * about a 2.4-unit box, centred, facing the camera. `style` changes the finish (parts.tsx).
 * `knobs` are the model's own shape knobs (kinds.ts MODEL_KNOBS): longer grips, a bigger
 * screen, how many spokes; each model reads its own, 1 (or the knob's default) as drawn.
 */
import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { knobsOf, type ModelKind } from "./kinds";
import { Block, seg, shown, useMaterials, type Draw, type ModelProps } from "./parts";
import { PRODUCT_MODELS } from "./productModels";

export type { ModelKind };
export type { ModelColours, ModelProps, ModelStyle } from "./parts";

/* --------------------------------------------------------------- the models */

function Controller(p: Draw) {
  const { m, style, k } = p;
  const s = seg(style, 32);
  const grip = k.grips;
  const b = k.buttons;
  return (
    <group rotation={[0.35, 0, 0]}>
      <Block style={style} size={[2.2, 1.0, 0.5]} radius={0.3} material={m.body} />
      {[-1, 1].map((side) => (
        <mesh key={side} material={m.body} position={[side * (0.95 + (grip - 1) * 0.12), -0.45 - (grip - 1) * 0.27, 0]} rotation={[0, 0, side * 0.45]}>
          <capsuleGeometry args={[0.32, 0.55 * grip, 8, s]} />
        </mesh>
      ))}
      {/* D-pad */}
      <group position={[-0.62, 0.08, 0.27]} scale={b}>
        <Block style={style} size={[0.34, 0.11, 0.06]} radius={0.02} material={m.trim} />
        <Block style={style} size={[0.11, 0.34, 0.06]} radius={0.02} material={m.trim} />
      </group>
      {/* Face buttons */}
      {[
        [0, 0.16],
        [0.16, 0],
        [-0.16, 0],
        [0, -0.16],
      ].map(([x, y], i) => (
        <mesh key={i} position={[0.62 + x * b, 0.08 + y * b, 0.27]} rotation={[Math.PI / 2, 0, 0]} material={i === 0 ? m.glow : m.accent}>
          <cylinderGeometry args={[0.07 * b, 0.07 * b, 0.07, s]} />
        </mesh>
      ))}
      {/* Sticks */}
      {[-0.3, 0.3].map((x, i) => (
        <group key={i} position={[x, -0.25, 0.27]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.dark}>
            <cylinderGeometry args={[0.16, 0.16, 0.06, s]} />
          </mesh>
          <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]} material={m.trim}>
            <cylinderGeometry args={[0.12, 0.1, 0.1, s]} />
          </mesh>
        </group>
      ))}
      {/* Light bar */}
      <mesh position={[0, 0.5, 0.12]} material={m.glow}>
        <boxGeometry args={[0.8, 0.04, 0.12]} />
      </mesh>
    </group>
  );
}

function Headset(p: Draw) {
  const { m, style, k } = p;
  const s = seg(style, 40);
  const band = k.band;
  const cup = k.cups;
  return (
    <group rotation={[0, 0.5, 0]}>
      <mesh material={m.body} rotation={[0, 0, 0]} position={[0, 0.25, 0]}>
        <torusGeometry args={[1.0 * band, 0.11, seg(style, 16), s, Math.PI]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.0 * band, -0.2, 0]} rotation={[0, (side * Math.PI) / 2, 0]} scale={cup}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.trim}>
            <cylinderGeometry args={[0.48, 0.48, 0.32, s]} />
          </mesh>
          <mesh position={[0, 0, 0.17]} rotation={[Math.PI / 2, 0, 0]} material={m.glow}>
            <torusGeometry args={[0.38, 0.04, 8, s]} />
          </mesh>
          <mesh position={[0, 0, -0.18]} rotation={[Math.PI / 2, 0, 0]} material={m.dark}>
            <cylinderGeometry args={[0.42, 0.42, 0.08, s]} />
          </mesh>
        </group>
      ))}
      {/* Microphone */}
      <mesh material={m.metal} position={[-0.85 * band, -0.6, 0.4]} rotation={[0.3, 0, 0.9]}>
        <capsuleGeometry args={[0.04, 0.7, 4, 12]} />
      </mesh>
      <mesh material={m.accent} position={[-0.85 * band + 0.3, -0.9, 0.62]}>
        <sphereGeometry args={[0.08, 16, 16]} />
      </mesh>
    </group>
  );
}

function Console(p: Draw) {
  const { m, style, k } = p;
  const h = k.height;
  return (
    <group rotation={[0, -0.5, 0]}>
      <Block style={style} size={[0.55, 2.2 * h, 1.6]} radius={0.12} material={m.body} />
      <Block style={style} size={[0.6, 2.24 * h, 0.12]} radius={0.04} position={[0, 0, 0.82]} material={m.trim} />
      <mesh position={[0.29, 0, 0.3]} material={m.glow}>
        <boxGeometry args={[0.02, 1.9 * h, 0.05]} />
      </mesh>
      {shown(k.stand) ? <Block style={style} size={[0.9 * k.stand, 0.12, 1.2 * k.stand]} radius={0.05} position={[0, -1.05 * h - 0.1, 0]} material={m.dark} /> : null}
      <mesh position={[0.29, 0.85 * h, 0.55]} rotation={[0, 0, Math.PI / 2]} material={m.accent}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
      </mesh>
    </group>
  );
}

function Handheld(p: Draw) {
  const { m, style, k } = p;
  const s = seg(style, 24);
  const sw = k.screen;
  const gs = k.grips;
  return (
    <group rotation={[0.25, 0, 0]}>
      <Block style={style} size={[1.5 * sw, 0.95, 0.14]} radius={0.06} material={m.dark} />
      <mesh position={[0, 0, 0.075]} material={m.screen}>
        <planeGeometry args={[1.32 * sw, 0.8]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (0.76 * sw + 0.24 * gs), 0, 0]} scale={gs}>
          <Block style={style} size={[0.48, 0.95, 0.2]} radius={0.18} material={side < 0 ? m.accent : m.trim} />
          <mesh position={[0, side < 0 ? 0.18 : -0.18, 0.12]} rotation={[Math.PI / 2, 0, 0]} material={m.dark}>
            <cylinderGeometry args={[0.11, 0.11, 0.08, s]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI) / 2) * 0.1, (side < 0 ? -0.2 : 0.2) + Math.sin((i * Math.PI) / 2) * 0.1, 0.11]} rotation={[Math.PI / 2, 0, 0]} material={m.glow}>
              <cylinderGeometry args={[0.035, 0.035, 0.04, 12]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Keyboard(p: Draw) {
  const { m, style, k } = p;
  const cols = k.keys;
  const keys = useMemo(() => {
    const out: Array<[number, number, number]> = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < cols; c++) out.push([(c - (cols - 1) / 2) * 0.2, 0.42 - r * 0.2, (c + r) / (cols + 4)]);
    return out;
  }, [cols]);
  const mesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.16, 0.16, 0.08);
    const inst = new THREE.InstancedMesh(geo, m.trim, keys.length);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    keys.forEach(([x, y, t], i) => {
      o.position.set(x, y, 0.1);
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
      // The RGB sweep across the keys.
      inst.setColorAt(i, col.setHSL((0.55 + t * 0.5) % 1, 0.9, 0.6));
    });
    return inst;
  }, [keys, m.trim]);
  useEffect(() => () => mesh.geometry.dispose(), [mesh]);
  const width = cols * 0.2 + 0.2;
  return (
    <group rotation={[-0.9 * k.tilt, 0, 0]}>
      <Block style={style} size={[width, 1.2, 0.14]} radius={0.06} material={m.body} />
      <primitive object={mesh} />
      <mesh position={[0, -0.6, 0.02]} material={m.glow}>
        <boxGeometry args={[width - 0.1, 0.03, 0.1]} />
      </mesh>
    </group>
  );
}

function Mouse(p: Draw) {
  const { m, style, k } = p;
  const len = k.length;
  const hump = k.hump;
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      pts.push(new THREE.Vector2(Math.sin(t * Math.PI) * 0.55 * (0.8 + 0.2 * t), (t - 0.5) * 1.9 * len));
    }
    const g = new THREE.LatheGeometry(pts, seg(style, 40));
    g.scale(1, 1, 0.55 * hump);
    return g;
  }, [style, len, hump]);
  return (
    <group rotation={[-1.1, 0, 0.3]}>
      <mesh geometry={geo} material={m.body} />
      <mesh position={[0, 0.45 * len, 0.3 * hump]} rotation={[0, 0, Math.PI / 2]} material={m.dark}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
      </mesh>
      <mesh position={[0, -0.55 * len, 0.12 * hump]} rotation={[0.2, 0, 0]} material={m.glow}>
        <torusGeometry args={[0.32, 0.025, 8, 32, Math.PI]} />
      </mesh>
      <mesh position={[0, 0.25 * len, 0.3 * hump]} material={m.trim}>
        <boxGeometry args={[0.02, 0.8 * len, 0.02]} />
      </mesh>
    </group>
  );
}

function Arcade(p: Draw) {
  const { m, style, k } = p;
  const sc = k.screen;
  // A taller cabinet grows from its top; the screen and the marquee go up with it.
  const dy = (k.height - 1) * 1.6;
  const side = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.lineTo(1.0, 0);
    sh.lineTo(1.0, 1.0);
    sh.lineTo(1.25, 1.25);
    sh.lineTo(1.1, 2.4 + dy);
    sh.lineTo(0.15, 2.4 + dy);
    sh.lineTo(0, 2.2 + dy);
    sh.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 1.2, bevelEnabled: style !== "voxel", bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
    g.translate(-0.6, -1.2, -0.6);
    g.rotateY(-Math.PI / 2);
    return g;
  }, [style, dy]);
  return (
    <group rotation={[0, 0.6, 0]} scale={0.9} position={[0, -dy * 0.4, 0]}>
      <mesh geometry={side} material={m.body} />
      <mesh position={[0, 0.55 + dy / 2, 0.42]} rotation={[-0.2, 0, 0]} material={m.screen}>
        <planeGeometry args={[1.0 * sc, 0.75 * sc]} />
      </mesh>
      <mesh position={[0, 1.1 + dy, 0.5]} material={m.glow}>
        <boxGeometry args={[1.1, 0.18, 0.05]} />
      </mesh>
      <Block style={style} size={[1.15, 0.12, 0.5]} radius={0.03} position={[0, 0.02, 0.62]} material={m.trim} />
      <mesh position={[-0.25, 0.17, 0.62]} material={m.metal}>
        <cylinderGeometry args={[0.025, 0.025, 0.22, 8]} />
      </mesh>
      <mesh position={[-0.25, 0.3, 0.62]} material={m.accent}>
        <sphereGeometry args={[0.07, 16, 16]} />
      </mesh>
      {[0.05, 0.22, 0.39].map((x, i) => (
        <mesh key={i} position={[x, 0.1, 0.65]} material={i === 1 ? m.glow : m.accent}>
          <cylinderGeometry args={[0.05, 0.05, 0.05, 16]} />
        </mesh>
      ))}
    </group>
  );
}

function Vr(p: Draw) {
  const { m, style, k } = p;
  const v = k.visor;
  const strap = k.strap;
  const front = 0.4 * v;
  return (
    <group rotation={[0.1, -0.4, 0]}>
      <Block style={style} size={[1.9, 0.95, 0.8 * v]} radius={0.3} material={m.body} />
      {/* A glowing visor with its two lenses showing through. */}
      <Block style={style} size={[1.75, 0.8, 0.06]} radius={0.25} position={[0, 0, front + 0.02]} material={m.screen} />
      {[-0.42, 0.42].map((x) => (
        <mesh key={`lens${x}`} position={[x, 0, front + 0.06]} rotation={[Math.PI / 2, 0, 0]} material={m.dark}>
          <cylinderGeometry args={[0.24, 0.24, 0.02, seg(style, 32)]} />
        </mesh>
      ))}
      <mesh position={[0, -0.36, front + 0.06]} material={m.glow}>
        <boxGeometry args={[1.2, 0.04, 0.02]} />
      </mesh>
      <Block style={style} size={[0.7, 0.14 * strap, 0.7]} radius={0.06} position={[0, 0.45 + 0.07 * strap, -0.1]} material={m.trim} />
      <mesh position={[0, 0, -front - 0.1]} rotation={[Math.PI / 2, 0, 0]} material={m.trim}>
        <torusGeometry args={[0.95, 0.08 * strap, 8, seg(style, 40), Math.PI]} />
      </mesh>
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.2, front + 0.05]} material={m.accent}>
          <sphereGeometry args={[0.06, 12, 12]} />
        </mesh>
      ))}
    </group>
  );
}

function Wheel(p: Draw) {
  const { m, style, k } = p;
  const s = seg(style, 48);
  // Each bar crosses the hub, so n bars spread over half a turn.
  const spokes = Array.from({ length: k.spokes }, (_, i) => (i / k.spokes) * Math.PI);
  return (
    <group rotation={[0.3, 0, 0]}>
      <mesh material={m.body}>
        <torusGeometry args={[1.0, 0.12 * k.rim, 12, s]} />
      </mesh>
      {spokes.map((a) => (
        <mesh key={a} rotation={[0, 0, a]} material={m.trim}>
          <boxGeometry args={[0.12, 1.0, 0.08]} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={m.dark}>
        <cylinderGeometry args={[0.34, 0.34, 0.2, s]} />
      </mesh>
      <mesh position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]} material={m.glow}>
        <torusGeometry args={[0.24, 0.03, 8, s]} />
      </mesh>
      <mesh position={[0, 1.0, 0.05]} material={m.accent}>
        <boxGeometry args={[0.2, 0.12 + 0.1 * (k.rim - 1), 0.26 * Math.max(1, k.rim)]} />
      </mesh>
    </group>
  );
}

function Dice(p: Draw) {
  const { m, k } = p;
  const faces = k.faces;
  const geo = useMemo(() => {
    if (faces === 4) return new THREE.TetrahedronGeometry(1.3, 0);
    if (faces === 6) return new THREE.BoxGeometry(1.45, 1.45, 1.45);
    if (faces === 8) return new THREE.OctahedronGeometry(1.2, 0);
    if (faces === 12) return new THREE.DodecahedronGeometry(1.1, 0);
    return new THREE.IcosahedronGeometry(1.1, 0);
  }, [faces]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  useEffect(
    () => () => {
      geo.dispose();
      edges.dispose();
    },
    [geo, edges],
  );
  return (
    <group rotation={[0.4, 0.6, 0]}>
      <mesh geometry={geo}>
        <meshStandardMaterial color={m.body.color} roughness={0.25} metalness={0.2} flatShading />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={(m.glow as THREE.MeshStandardMaterial).color} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

function Trophy(p: Draw) {
  const { m, style, k } = p;
  const s = seg(style, 40);
  const cw = k.cup;
  // Wider from the stem up; the stem keeps its size.
  const wide = (x: number) => (x <= 0.2 ? x : 0.2 + (x - 0.2) * cw);
  const cup = useMemo(() => {
    const pts = [
      [0.0, 0.0],
      [0.18, 0.0],
      [0.2, 0.3],
      [0.55, 0.65],
      [0.75, 1.3],
      [0.78, 1.45],
      [0.7, 1.45],
    ].map(([x, y]) => new THREE.Vector2(x <= 0.2 ? x : 0.2 + (x - 0.2) * cw, y));
    return new THREE.LatheGeometry(pts, s);
  }, [s, cw]);
  return (
    <group position={[0, -1.0, 0]}>
      <Block style={style} size={[1.1, 0.3, 1.1]} radius={0.05} material={m.dark} />
      <Block style={style} size={[0.7, 0.25, 0.7]} radius={0.04} position={[0, 0.27, 0]} material={m.trim} />
      <mesh geometry={cup} position={[0, 0.4, 0]} material={m.metal} />
      {shown(k.handles)
        ? [-1, 1].map((side) => (
            <mesh key={side} position={[side * wide(0.75), 1.45, 0]} rotation={[0, 0, (side * Math.PI) / 2]} material={m.metal}>
              <torusGeometry args={[0.25 * k.handles, 0.05, 8, 24, Math.PI]} />
            </mesh>
          ))
        : null}
      <mesh position={[0, 1.2, wide(0.62)]} material={m.glow}>
        <octahedronGeometry args={[0.14, 0]} />
      </mesh>
    </group>
  );
}

function Coin(p: Draw) {
  const { m, style, k } = p;
  const s = seg(style, 48);
  const top = 0.08 * k.thick + 0.01;
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh material={m.metal}>
        <cylinderGeometry args={[1.0, 1.0, 0.16 * k.thick, s]} />
      </mesh>
      <mesh position={[0, top, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.glow}>
        <torusGeometry args={[0.78, 0.04, 8, s]} />
      </mesh>
      <mesh position={[0, top, 0]} material={m.accent}>
        <cylinderGeometry args={[0.35, 0.35, 0.04, k.sides]} />
      </mesh>
    </group>
  );
}

function Sword(p: Draw) {
  const { m, style, k } = p;
  const len = k.blade;
  const blade = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-0.12, 0);
    sh.lineTo(0.12, 0);
    sh.lineTo(0.1, 1.7 * len);
    sh.lineTo(0, 2.0 * len);
    sh.lineTo(-0.1, 1.7 * len);
    sh.lineTo(-0.12, 0);
    return new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: style !== "voxel", bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 });
  }, [style, len]);
  return (
    <group rotation={[0, 0, -0.6]} position={[0, -0.6 - (len - 1) * 0.9, 0]}>
      <mesh geometry={blade} position={[0, 0.1, -0.025]} material={m.metal} />
      <mesh position={[0, 0.1 + 0.8 * len, 0.05]} material={m.glow}>
        <boxGeometry args={[0.03, 1.4 * len, 0.02]} />
      </mesh>
      <Block style={style} size={[0.8 * k.guard, 0.12, 0.14]} radius={0.04} position={[0, 0.06, 0]} material={m.accent} />
      <mesh position={[0, -0.25, 0]} material={m.trim}>
        <cylinderGeometry args={[0.06, 0.06, 0.5, 12]} />
      </mesh>
      <mesh position={[0, -0.55, 0]} material={m.glow}>
        <sphereGeometry args={[0.09, 16, 16]} />
      </mesh>
    </group>
  );
}

function Shield(p: Draw) {
  const { m, style, k } = p;
  const wide = k.width;
  const geo = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 1.15);
    sh.bezierCurveTo(0.55, 1.0, 0.85, 1.05, 0.95, 0.95);
    sh.bezierCurveTo(0.95, 0.1, 0.6, -0.7, 0, -1.2);
    sh.bezierCurveTo(-0.6, -0.7, -0.95, 0.1, -0.95, 0.95);
    sh.bezierCurveTo(-0.85, 1.05, -0.55, 1.0, 0, 1.15);
    return new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: style !== "voxel", bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3, curveSegments: seg(style, 24) });
  }, [style]);
  const rim = useMemo(() => new THREE.EdgesGeometry(geo, 30), [geo]);
  return (
    <group rotation={[0.1, -0.35, 0]}>
      <group scale={[wide, 1, 1]}>
        <mesh geometry={geo} position={[0, 0, -0.09]} material={m.body} />
        <lineSegments geometry={rim} position={[0, 0, -0.09]}>
          <lineBasicMaterial color={(m.glow as THREE.MeshStandardMaterial).color} toneMapped={false} />
        </lineSegments>
      </group>
      <mesh position={[0, 0.1, 0.16]} material={m.metal}>
        <boxGeometry args={[0.14, 1.5, 0.05]} />
      </mesh>
      <mesh position={[0, 0.35, 0.16]} material={m.metal}>
        <boxGeometry args={[1.2 * wide, 0.14, 0.05]} />
      </mesh>
      {shown(k.gem) ? (
        <mesh position={[0, 0.35, 0.21]} material={m.glow}>
          <octahedronGeometry args={[0.16 * k.gem, 0]} />
        </mesh>
      ) : null}
    </group>
  );
}

function Potion(p: Draw) {
  const { m, style, k } = p;
  const s = seg(style, 40);
  const neck = 0.45 * k.neck;
  const profile = useMemo(
    () =>
      [
        [0, -0.95],
        [0.55, -0.9],
        [0.75, -0.55],
        [0.78, -0.15],
        [0.55, 0.25],
        [0.22, 0.4],
        [0.2, 0.4 + neck],
        [0.26, 0.45 + neck],
      ] as Array<[number, number]>,
    [neck],
  );
  const flask = useMemo(() => new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), s), [profile, s]);
  // The liquid follows the glass up to its level.
  const level = -0.9 + (k.fill * 7) / 6;
  const liquid = useMemo(() => {
    const at = (y: number) => {
      for (let i = 1; i < profile.length; i++) {
        const [x0, y0] = profile[i - 1];
        const [x1, y1] = profile[i];
        if (y >= y0 && y <= y1) return x0 + ((y - y0) / Math.max(1e-6, y1 - y0)) * (x1 - x0);
      }
      return 0.2;
    };
    const pts = [new THREE.Vector2(0, -0.9)];
    for (let i = 0; i <= 8; i++) {
      const y = -0.9 + ((level + 0.9) * i) / 8;
      pts.push(new THREE.Vector2(Math.max(0.01, at(y) * 0.92 - 0.02), y));
    }
    pts.push(new THREE.Vector2(0, level));
    return new THREE.LatheGeometry(pts, s);
  }, [profile, level, s]);
  return (
    <group rotation={[0.15, 0, -0.12]} position={[0, -(neck - 0.45) * 0.5, 0]}>
      <mesh geometry={liquid} material={m.glow} />
      <mesh geometry={flask}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} metalness={0} transmission={0.92} thickness={0.4} transparent opacity={0.55} flatShading={style === "voxel"} />
      </mesh>
      <mesh position={[0, 0.55 + neck, 0]} material={m.trim}>
        <cylinderGeometry args={[0.17, 0.2, 0.22, s]} />
      </mesh>
      {[0.25, -0.2, 0.05].map((x, i) =>
        -0.45 + i * 0.12 < level ? (
          <mesh key={i} position={[x, -0.45 + i * 0.12, 0.3]} material={m.screen}>
            <sphereGeometry args={[0.05 + i * 0.015, 12, 12]} />
          </mesh>
        ) : null,
      )}
    </group>
  );
}

function Rocket(p: Draw) {
  const { m, style, k } = p;
  const s = seg(style, 40);
  const fin = k.fins;
  const hull = useMemo(() => {
    const pts = [
      [0, -1.0],
      [0.38, -0.95],
      [0.45, -0.4],
      [0.45, 0.3],
      [0.35, 0.8],
      [0.15, 1.15],
      [0, 1.25],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, s);
  }, [s]);
  return (
    <group rotation={[0, 0, -0.5]}>
      <mesh geometry={hull} material={m.body} />
      <mesh position={[0, 0.35, 0.4]} rotation={[Math.PI / 2, 0, 0]} material={m.screen}>
        <cylinderGeometry args={[0.16, 0.16, 0.1, s]} />
      </mesh>
      <mesh position={[0, 0.35, 0.42]} rotation={[Math.PI / 2, 0, 0]} material={m.metal}>
        <torusGeometry args={[0.17, 0.03, 8, s]} />
      </mesh>
      {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => {
        const r = 0.45 + (fin - 1) * 0.12;
        return (
          <mesh key={a} position={[Math.sin(a) * r, -0.75 - (fin - 1) * 0.1, Math.cos(a) * r]} rotation={[0, a, 0]} material={m.accent}>
            <boxGeometry args={[0.06, 0.5 * fin, 0.36 * fin]} />
          </mesh>
        );
      })}
      {shown(k.flame) ? (
        <mesh position={[0, -0.85 - 0.3 * k.flame, 0]} material={m.glow}>
          <coneGeometry args={[0.26, 0.6 * k.flame, s]} />
        </mesh>
      ) : null}
      <mesh position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.trim}>
        <torusGeometry args={[0.455, 0.03, 8, s]} />
      </mesh>
    </group>
  );
}

function Helmet(p: Draw) {
  const { m, style, k } = p;
  const s = seg(style, 40);
  const v = k.visor;
  return (
    <group rotation={[0.05, -0.45, 0]}>
      <mesh material={m.body} scale={[1, 1.05, 1.05]}>
        <sphereGeometry args={[0.95, s, Math.max(8, s / 2), 0, Math.PI * 2, 0, Math.PI * 0.62]} />
      </mesh>
      <mesh position={[0, -0.25, 0]} material={m.trim}>
        <cylinderGeometry args={[0.86, 0.8, 0.5, s]} />
      </mesh>
      {/* The visor. */}
      <mesh position={[0, 0.05, 0.42]} rotation={[0.15, 0, 0]} material={m.screen} scale={[1.2 * v, 0.55 * v, 0.5]}>
        <sphereGeometry args={[0.6, s, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {shown(k.crest) ? (
        <mesh position={[0, 0.83 + 0.15 * k.crest, 0]} material={m.accent}>
          <boxGeometry args={[0.12, 0.3 * k.crest, 0.9]} />
        </mesh>
      ) : null}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.9, -0.15, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={m.metal}>
            <cylinderGeometry args={[0.22, 0.22, 0.14, s]} />
          </mesh>
          <mesh position={[side * 0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m.glow}>
            <torusGeometry args={[0.15, 0.025, 8, s]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Tv(p: Draw) {
  const { m, style, k } = p;
  const s = seg(style, 24);
  const sc = k.screen;
  const ant = 0.8 * k.antennas;
  return (
    <group rotation={[0, -0.4, 0]} position={[0, -0.1, 0]}>
      <Block style={style} size={[2.0, 1.5, 1.2]} radius={0.22} material={m.body} />
      {/* The curved glass, glowing, inside a darker bezel. */}
      <Block style={style} size={[1.5 * sc, 1.1 * sc, 0.08]} radius={0.16} position={[-0.15, 0.05, 0.6]} material={m.dark} />
      <mesh position={[-0.15, 0.05, 0.66]} material={m.screen} scale={[sc, 0.74 * sc, 0.2]}>
        <sphereGeometry args={[0.66, s, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {[0.32, 0.0].map((y) => (
        <mesh key={y} position={[0.78, y, 0.62]} rotation={[Math.PI / 2, 0, 0]} material={m.accent}>
          <cylinderGeometry args={[0.1, 0.1, 0.08, s]} />
        </mesh>
      ))}
      <mesh position={[0.78, -0.38, 0.62]} material={m.glow}>
        <boxGeometry args={[0.24, 0.05, 0.03]} />
      </mesh>
      {/* Antennas from the same two points on the top, as long as the knob says. */}
      {shown(k.antennas)
        ? [-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.44 - Math.sin(side * 0.5) * ant * 0.5, 0.7 + Math.cos(0.5) * ant * 0.5, 0]} rotation={[0, 0, side * 0.5]} material={m.metal}>
              <cylinderGeometry args={[0.02, 0.02, ant, 8]} />
            </mesh>
          ))
        : null}
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, -0.85, 0.3]} material={m.trim}>
          <boxGeometry args={[0.16, 0.2, 0.16]} />
        </mesh>
      ))}
    </group>
  );
}

function Chair(p: Draw) {
  const { m, style, k } = p;
  const s = seg(style, 20);
  const back = k.back;
  return (
    <group rotation={[0, 0.6, 0]} position={[0, 0.1 - (back - 1) * 0.4, 0]} scale={0.85}>
      {/* Back with its two side wings and a glowing stripe. */}
      <Block style={style} size={[1.1, 1.6 * back, 0.25]} radius={0.18} position={[0, 0.05 + 0.8 * back, -0.35]} material={m.body} />
      {shown(k.wings)
        ? [-1, 1].map((side) => (
            <Block key={side} style={style} size={[0.2 * k.wings, 1.35 * back, 0.32]} radius={0.08 * Math.min(1, k.wings)} position={[side * (0.45 + 0.1 * k.wings), 0.125 + 0.675 * back, -0.3]} material={m.accent} />
          ))
        : null}
      <mesh position={[0, 0.2 + 0.65 * back, -0.21]} material={m.glow}>
        <boxGeometry args={[0.1, 1.3 * back, 0.02]} />
      </mesh>
      <Block style={style} size={[0.6, 0.22, 0.18]} radius={0.08} position={[0, 1.6 * back - 0.15, -0.18]} material={m.trim} />
      {/* Seat, arms, the column and the star base on wheels. */}
      <Block style={style} size={[1.1, 0.22, 1.0]} radius={0.1} position={[0, 0, 0.1]} material={m.body} />
      {[-1, 1].map((side) => (
        <Block key={`arm${side}`} style={style} size={[0.14, 0.08, 0.6]} radius={0.03} position={[side * 0.62, 0.35, 0.1]} material={m.dark} />
      ))}
      <mesh position={[0, -0.45, 0.1]} material={m.metal}>
        <cylinderGeometry args={[0.07, 0.07, 0.7, s]} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} position={[0, -0.82, 0.1]} rotation={[0, a, 0]}>
            <mesh position={[0, 0, 0.32]} material={m.dark}>
              <boxGeometry args={[0.08, 0.06, 0.64]} />
            </mesh>
            <mesh position={[0, -0.08, 0.62]} rotation={[0, 0, Math.PI / 2]} material={m.trim}>
              <cylinderGeometry args={[0.07, 0.07, 0.07, 12]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Cartridge(p: Draw) {
  const { m, style, k } = p;
  const l = k.label;
  const ridges = k.ridges;
  const step = ridges > 1 ? Math.min(0.07, 0.36 / (ridges - 1)) : 0;
  return (
    <group rotation={[0.2, -0.35, 0.08]}>
      <Block style={style} size={[1.5, 1.7, 0.32]} radius={0.08} material={m.body} />
      {/* The ridges at the top and the label. */}
      {Array.from({ length: ridges }, (_, i) => (
        <mesh key={i} position={[0, 0.62 - i * step, 0.17]} material={m.dark}>
          <boxGeometry args={[1.2, 0.03, 0.02]} />
        </mesh>
      ))}
      <Block style={style} size={[1.2 * l, 0.85 * l, 0.04]} radius={0.04} position={[0, -0.2, 0.17]} material={m.screen} />
      <mesh position={[0, -0.2, 0.2]} material={m.glow}>
        <boxGeometry args={[0.9 * l, 0.08, 0.01]} />
      </mesh>
      <mesh position={[0, -0.92, 0]} material={m.metal}>
        <boxGeometry args={[1.1, 0.16, 0.2]} />
      </mesh>
      <mesh position={[0.62, 0.78, 0.17]} material={m.accent}>
        <boxGeometry args={[0.16, 0.16, 0.02]} />
      </mesh>
    </group>
  );
}

const MODELS: Record<ModelKind, (p: Draw) => ReactNode> = {
  controller: Controller,
  headset: Headset,
  console: Console,
  handheld: Handheld,
  keyboard: Keyboard,
  mouse: Mouse,
  arcade: Arcade,
  vr: Vr,
  wheel: Wheel,
  dice: Dice,
  trophy: Trophy,
  coin: Coin,
  sword: Sword,
  shield: Shield,
  potion: Potion,
  rocket: Rocket,
  helmet: Helmet,
  tv: Tv,
  chair: Chair,
  cartridge: Cartridge,
  ...PRODUCT_MODELS,
};

/** One model in the theme's colours, with the store's shape knobs if any. */
export function GameModel({ kind, knobs, ...p }: ModelProps & { kind: ModelKind; knobs?: Record<string, number> }) {
  const m = useMaterials(p);
  const known = MODELS[kind] ? kind : "controller";
  const Model = MODELS[known];
  const key = knobs ? JSON.stringify(knobs) : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const k = useMemo(() => knobsOf(known, knobs), [known, key]);
  return <Model {...p} m={m} k={k} />;
}
