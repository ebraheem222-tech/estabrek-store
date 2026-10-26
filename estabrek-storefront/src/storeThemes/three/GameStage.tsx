"use client";
/**
 * A gaming theme's 3D stage: the chosen models (models.tsx) in one canvas, laid out as an
 * orbit, a hero with the rest beside it, a podium or a shelf. Hover lights a model, a click
 * picks it (the page shows its category), dragging turns the picked one, and the scroll
 * moves the camera (progress, 0–1, written by the page). Drawn only while on screen
 * (ScenePacer), after every shader is built (warmScene), at the device's budget (sceneDpr).
 *
 * Each model can carry the store's look (kinds.ts StageLook, from the scene editor): moved,
 * turned and sized from its place in the layout, stretched, its knobs, colours, finish,
 * motion and its way through the scroll (from its look to its path's end), or be the
 * store's own 3D file (GlbModel). The camera, lights and floor follow the store's scene
 * settings. In the editor (`edit`) the model being edited shows handles to move, turn or
 * size it (its start, or its path's end); every move is reported (onTransform) and held
 * here until the admin has it (`ack`).
 */
import { memo, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { ScenePacer } from "@/components/cinematic/ScenePacer";
import { warmScene } from "@/components/cinematic/warmScene";
import { sceneDpr } from "@/lib/motionBudget";
import { GameModel, type ModelColours, type ModelKind, type ModelStyle } from "./models";
import { GlbModel, type GlbInfo } from "./GlbModel";
import { CAMERA_DEFAULT, LIGHTS_DEFAULT, type StageAnim, type StageCamera, type StageEdit, type StageGlb, type StageLights, type StageLook, type StagePath } from "./kinds";

export type StageLayout = "orbit" | "hero" | "podium" | "shelf";
export type StageFloor = "grid" | "stage" | "none";
/** Where a handle left a model: its move from its place, its turn (degrees) and its size. */
export type StageTransform = { pos: [number, number, number]; rot: [number, number, number]; scale: [number, number, number] };

export type GameStageProps = {
  kinds: ModelKind[];
  colours: ModelColours;
  style: ModelStyle;
  layout: StageLayout;
  floor: StageFloor;
  /** Rim lights and halos. */
  lights: [string, string];
  /** The podium's own colour (dark on a dark page, a soft tint on a light one). */
  floorColour: string;
  selected: number;
  onSelect: (i: number) => void;
  onHover: (i: number | null) => void;
  active: boolean;
  compact: boolean;
  still: boolean;
  progress: MutableRefObject<number>;
  onReady?: () => void;
  /** The store's look for each model (same order as `kinds`). */
  looks?: Array<StageLook | undefined>;
  /** The scene editor at work: handles on one model. */
  edit?: StageEdit | null;
  /** A handle moved a model; `final` when it is let go. `seq` numbers the moves. */
  onTransform?: (i: number, t: StageTransform, final: boolean, seq: number) => void;
  /** The last move the admin has taken in. */
  ack?: number;
  /** The store's camera and lights (the stage's own where not set), and whether the floor's rings glow. */
  camera?: StageCamera;
  lightSet?: StageLights;
  floorGlow?: boolean;
  /** Each model's own 3D file, if any (same order as `kinds`), and what each turned out to hold. */
  glbs?: Array<StageGlb | undefined>;
  onGlbInfo?: (i: number, info: GlbInfo) => void;
};

type Spot = { pos: THREE.Vector3; scale: number; rotY: number };
/** What the pieces and the handles share without drawing again. */
type Shared = {
  bases: Array<THREE.Vector3 | undefined>;
  outers: Array<THREE.Group | null>;
  /** The model a handle is holding right now. */
  dragging: number | null;
  /** Moves the admin hasn't sent back yet, drawn meanwhile. */
  pending: Map<number, { t: StageTransform; seq: number }>;
  /** A handle was pressed: the click under it is not a pick. */
  busy: boolean;
};

/** Where each model stands for a layout, with `sel` the picked one. */
function spots(layout: StageLayout, n: number, sel: number, compact: boolean): Spot[] {
  const out: Spot[] = [];
  for (let i = 0; i < n; i++) {
    const rel = (i - sel + n) % n;
    if (layout === "orbit") {
      const a = (rel / n) * Math.PI * 2;
      const r = compact ? 2.1 : 3.0;
      out.push({ pos: new THREE.Vector3(Math.sin(a) * r, rel === 0 ? 0.1 : -0.2, Math.cos(a) * r - r), scale: rel === 0 ? 1.15 : 0.55, rotY: -a });
    } else if (layout === "hero") {
      if (rel === 0) out.push({ pos: new THREE.Vector3(0, 0.15, 0), scale: compact ? 1.05 : 1.3, rotY: 0 });
      else {
        const k = rel - 1;
        const cols = Math.max(1, n - 1);
        const x = compact ? (k - (cols - 1) / 2) * 1.05 : 3.1;
        const y = compact ? -2.05 : 1.6 - k * (3.2 / Math.max(1, cols - 1 || 1));
        out.push({ pos: new THREE.Vector3(x, y, -0.6), scale: compact ? 0.32 : 0.42, rotY: 0.4 });
      }
    } else if (layout === "podium") {
      if (rel === 0) out.push({ pos: new THREE.Vector3(0, 0.55, 0), scale: 1.05, rotY: 0 });
      else {
        const side = rel % 2 ? 1 : -1;
        const step = Math.ceil(rel / 2);
        out.push({ pos: new THREE.Vector3(side * step * (compact ? 1.3 : 1.9), -0.35 - step * 0.15, -step * 0.9), scale: 0.6 - step * 0.06, rotY: -side * 0.5 });
      }
    } else {
      const cols = compact ? 2 : 3;
      const row = Math.floor(i / cols);
      const col = i % cols;
      const rows = Math.ceil(n / cols);
      out.push({ pos: new THREE.Vector3((col - (cols - 1) / 2) * 2.4, ((rows - 1) / 2 - row) * 2.1, rel === 0 ? 0.6 : 0), scale: rel === 0 ? 0.78 : 0.62, rotY: 0 });
    }
  }
  return out;
}

/** A soft round light texture for halos (drawn once). */
let haloTexture: THREE.Texture | null = null;
function halo() {
  if (haloTexture) return haloTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,0.9)");
  r.addColorStop(0.35, "rgba(255,255,255,0.35)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  haloTexture = new THREE.CanvasTexture(c);
  return haloTexture;
}

const rad = THREE.MathUtils.degToRad;
const damp = THREE.MathUtils.damp;
/** Handle moves, numbered for the whole page (the admin starts again when the frame does). */
let moves = 0;

/** How a path is travelled: t (0–1) → how far along. */
function eased(ease: StagePath["ease"], t: number) {
  const x = Math.min(1, Math.max(0, t));
  if (ease === "linear") return x;
  if (ease === "early") return 1 - (1 - x) * (1 - x);
  if (ease === "late") return x * x;
  return x * x * (3 - 2 * x);
}
const ZERO: [number, number, number] = [0, 0, 0];
const ONE: [number, number, number] = [1, 1, 1];
const mix3 = (a: [number, number, number], b: [number, number, number], k: number): [number, number, number] => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** A model's motion at `ph` (radians of its cycle), `amt` how far it goes (1 as designed). */
function moveBy(g: THREE.Group, type: StageAnim["type"], ph: number, amt: number) {
  if (type === "spin") {
    g.rotation.y = ph;
    g.rotation.x = Math.sin(ph * 2) * 0.1 * amt;
  } else if (type === "float") {
    g.position.y = Math.sin(ph * 1.5) * 0.18 * amt;
    g.rotation.z = Math.sin(ph * 0.9) * 0.06 * amt;
  } else if (type === "bounce") {
    const up = Math.abs(Math.sin(ph * 2));
    const low = Math.pow(1 - up, 6) * amt;
    g.position.y = up * 0.5 * amt;
    g.scale.set(1 + low * 0.06, 1 - low * 0.12, 1 + low * 0.06);
  } else if (type === "pulse") {
    g.scale.setScalar(1 + Math.sin(ph * 3) * 0.09 * amt);
  } else if (type === "swing") {
    g.rotation.z = Math.sin(ph * 2) * 0.4 * amt;
  } else if (type === "orbit") {
    g.position.x = Math.sin(ph) * 0.7 * amt;
    g.position.z = Math.cos(ph) * 0.42 * amt;
  }
}

function Piece({ i, kind, spot, picked, hovered, look, p, shared }: { i: number; kind: ModelKind; spot: Spot; picked: boolean; hovered: boolean; look?: StageLook; p: GameStageProps; shared: Shared }) {
  const outer = useRef<THREE.Group>(null);
  const place = useRef<THREE.Group>(null);
  const motion = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Sprite>(null);
  const drag = useRef<{ x: number; y: number; ry: number; rx: number } | null>(null);
  const turn = useRef({ ry: 0, rx: 0 });
  const base = useRef(new THREE.Vector3());
  const phase = useRef(0);
  const wake = useRef(0);
  useEffect(() => {
    shared.bases[i] = base.current;
    shared.outers[i] = outer.current;
    const mine = outer.current;
    return () => {
      if (shared.outers[i] === mine) shared.outers[i] = null;
    };
  }, [i, shared]);

  useFrame(({ clock }, delta) => {
    const o = outer.current;
    const pl = place.current;
    const mo = motion.current;
    if (!o || !pl || !mo) return;
    const d = Math.min(delta, 0.05);
    const b = base.current;
    b.set(damp(b.x, spot.pos.x, 5, d), damp(b.y, spot.pos.y, 5, d), damp(b.z, spot.pos.z, 5, d));
    // The store's move, turn and size, along its path as the page scrolls: the handle's own
    // while it holds the model, and its last move until the admin sends it back.
    if (shared.dragging !== i) {
      let lp = look?.pos ?? ZERO;
      let lr = look?.rot ?? ZERO;
      let ls = look?.scale ?? ONE;
      const path = look?.path;
      if (path) {
        const k = eased(path.ease, p.progress.current);
        lp = mix3(lp, path.pos, k);
        lr = mix3(lr, path.rot, k);
        ls = mix3(ls, path.scale, k);
      }
      const held = shared.pending.get(i)?.t;
      if (held) [lp, lr, ls] = [held.pos, held.rot, held.scale];
      o.position.set(b.x + lp[0], b.y + lp[1], b.z + lp[2]);
      o.rotation.set(rad(lr[0]), rad(lr[1]), rad(lr[2]));
      o.scale.set(ls[0], ls[1], ls[2]);
    }
    pl.scale.setScalar(damp(pl.scale.x, spot.scale * (hovered && !picked ? 1.12 : 1), 6, d));
    pl.rotation.y = damp(pl.rotation.y, spot.rotY, 4, d);

    // Its motion: the store's, else the stage's gentle bob. Paused in the editor when asked.
    const playing = !p.still && (!p.edit || p.edit.play);
    mo.position.set(0, 0, 0);
    mo.rotation.set(0, 0, 0);
    mo.scale.set(1, 1, 1);
    const a = look?.anim;
    if (!a) {
      if (playing) mo.position.y = Math.sin(clock.elapsedTime * 1.2 + i) * 0.06;
    } else if (a.type !== "none" && playing) {
      let amt = a.amount;
      if (a.trigger === "scroll") phase.current = p.progress.current * Math.PI * 2 * a.speed;
      else {
        let k = 1;
        if (a.trigger === "hover") {
          wake.current = damp(wake.current, hovered ? 1 : 0, 4, d);
          k = wake.current;
          amt *= k;
        }
        phase.current += d * a.speed * 1.2 * k;
      }
      moveBy(mo, a.type, phase.current, amt);
    }

    if (spin.current) {
      // The picked one turns by itself unless the store gave it a motion (or it's being edited).
      if (!drag.current && picked && !p.still && !a && !p.edit) turn.current.ry += d * 0.35;
      if (!picked || p.edit) turn.current.ry = damp(turn.current.ry, 0, 2, d);
      if (p.edit) turn.current.rx = 0;
      spin.current.rotation.y = turn.current.ry;
      spin.current.rotation.x = damp(spin.current.rotation.x, turn.current.rx, 6, d);
    }
    if (glow.current) {
      const target = picked ? 1 : hovered ? 0.7 : 0.25;
      const m = glow.current.material as THREE.SpriteMaterial;
      m.opacity = damp(m.opacity, target, 5, d);
    }
  });
  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    drag.current = { x: e.clientX, y: e.clientY, ry: turn.current.ry, rx: turn.current.rx };
    if (!p.edit) (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    const dr = drag.current;
    if (!dr || !picked || p.edit) return;
    turn.current.ry = dr.ry + (e.clientX - dr.x) * 0.01;
    turn.current.rx = THREE.MathUtils.clamp(dr.rx + (e.clientY - dr.y) * 0.006, -0.6, 0.6);
  };
  const up = (e: ThreeEvent<PointerEvent>) => {
    const dr = drag.current;
    drag.current = null;
    if (!dr || Math.hypot(e.clientX - dr.x, e.clientY - dr.y) >= 6) return;
    if (p.edit && shared.busy) return;
    p.onSelect(i);
  };

  const ckey = look?.colours ? JSON.stringify(look.colours) : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colours = useMemo(() => (look?.colours ? { ...p.colours, ...look.colours } : p.colours), [p.colours, ckey]);
  const shape = look?.shape;
  const glb = p.glbs?.[i];
  const code = <GameModel kind={kind} c={colours} style={look?.finish ?? p.style} knobs={look?.knobs} />;
  return (
    <group
      ref={outer}
      onPointerOver={(e) => {
        e.stopPropagation();
        p.onHover(i);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        p.onHover(null);
        document.body.style.cursor = "";
      }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
    >
      <group ref={place}>
        <sprite ref={glow} scale={[3.6, 3.6, 1]} position={[0, 0, -0.8]} visible={p.lightSet?.halos !== false}>
          <spriteMaterial map={halo()} color={i % 2 ? p.lights[1] : p.lights[0]} transparent opacity={0.25} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
        <group ref={motion}>
          <group ref={spin}>
            <group scale={shape ? [shape.w, shape.h, shape.d] : 1}>
              {glb ? <GlbModel url={glb.url} clip={glb.clip} fallback={code} onInfo={(info) => p.onGlbInfo?.(i, info)} /> : code}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/**
 * The editor's handles on one model (move, turn or size), reporting every move. Found here,
 * inside the canvas after the models: the canvas runs its own effects once its models are in.
 */
function Handles({ shared, edit, kindsKey, onTransform }: { shared: Shared; edit: StageEdit; kindsKey: string; onTransform?: GameStageProps["onTransform"] }) {
  const sent = useRef(0);
  const [target, setTarget] = useState<THREE.Group | null>(null);
  useEffect(() => {
    setTarget(shared.outers[edit.index] ?? null);
  }, [edit.index, kindsKey, shared]);
  const read = (i: number): StageTransform => {
    const o = shared.outers[i]!;
    const b = shared.bases[i] ?? new THREE.Vector3();
    const r3 = (v: number) => Math.round(v * 1000) / 1000;
    const deg = (v: number) => Math.round(THREE.MathUtils.radToDeg(v) * 10) / 10;
    return {
      pos: [r3(o.position.x - b.x), r3(o.position.y - b.y), r3(o.position.z - b.z)],
      rot: [deg(o.rotation.x), deg(o.rotation.y), deg(o.rotation.z)],
      scale: [r3(o.scale.x), r3(o.scale.y), r3(o.scale.z)],
    };
  };
  const report = (final: boolean) => {
    const i = edit.index;
    if (!shared.outers[i]) return;
    const t = read(i);
    const n = ++moves;
    shared.pending.set(i, { t, seq: n });
    const now = performance.now();
    // While held, a few times a second is enough for the admin's numbers.
    if (final || now - sent.current > 60) {
      sent.current = now;
      onTransform?.(i, t, final, n);
    }
  };
  if (!target) return null;
  return (
    <TransformControls
      object={target}
      mode={edit.mode}
      size={1.3}
      translationSnap={edit.snap ? 0.1 : null}
      rotationSnap={edit.snap ? Math.PI / 12 : null}
      scaleSnap={edit.snap ? 0.1 : null}
      onMouseDown={() => {
        shared.busy = true;
        shared.dragging = edit.index;
      }}
      onObjectChange={() => report(false)}
      onMouseUp={() => {
        report(true);
        shared.dragging = null;
        window.setTimeout(() => (shared.busy = false), 0);
      }}
    />
  );
}

function Floor({ kind, lights, colour, glow }: { kind: StageFloor; lights: [string, string]; colour: string; glow: boolean }) {
  const grid = useMemo(() => {
    const g = new THREE.GridHelper(14, 28, lights[0], lights[1]);
    const m = g.material as THREE.LineBasicMaterial;
    m.transparent = true;
    m.opacity = 0.3;
    m.toneMapped = false;
    return g;
  }, [lights]);
  if (kind === "none") return null;
  if (kind === "grid") return <primitive object={grid} position={[0, -1.6, -2]} />;
  return (
    <group position={[0, -1.45, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.2, 64]} />
        <meshStandardMaterial color={colour} roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} visible={glow}>
        <ringGeometry args={[3.05, 3.2, 96]} />
        <meshBasicMaterial color={lights[0]} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} visible={glow}>
        <ringGeometry args={[1.9, 1.95, 96]} />
        <meshBasicMaterial color={lights[1]} toneMapped={false} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

/**
 * The camera (the store's, or the stage's own): where it stands, its pointer sway, its
 * move over the scroll and its turn round the stage; and the first warm frame. `hold`
 * keeps the pointer from swaying it (the editor); `moving` = motion allowed.
 */
function Rig({ progress, compact, still, hold, moving, cam, onWarm }: { progress: MutableRefObject<number>; compact: boolean; still: boolean; hold: boolean; moving: boolean; cam: StageCamera; onWarm: () => void }) {
  const { gl, scene, camera } = useThree();
  const done = useRef(false);
  const angle = useRef(0);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void warmScene(gl, scene, camera).then(onWarm, onWarm);
  }, [gl, scene, camera, onWarm]);
  useFrame(({ pointer }, delta) => {
    const t = progress.current;
    const d = Math.min(delta, 0.05);
    const lens = camera as THREE.PerspectiveCamera;
    if (lens.fov !== cam.fov) {
      lens.fov = cam.fov;
      lens.updateProjectionMatrix();
    }
    const sway = still || hold ? 0 : cam.sway;
    if (cam.orbit && moving) angle.current += d * cam.orbit;
    else if (!cam.orbit) angle.current = damp(angle.current, 0, 2, d);
    const dist = cam.distance + (compact ? 1.5 : 0) + t * cam.dolly;
    const side = pointer.x * 0.6 * sway;
    // Round the stage by `angle`, swayed sideways by the pointer.
    const a = angle.current;
    camera.position.x = damp(camera.position.x, Math.sin(a) * dist + Math.cos(a) * side, 3, d);
    camera.position.z = damp(camera.position.z, Math.cos(a) * dist - Math.sin(a) * side, 4, d);
    camera.position.y = damp(camera.position.y, cam.height + pointer.y * 0.3 * sway - t * cam.drop, 3, d);
    camera.lookAt(0, cam.target - t * cam.drop * 0.5, 0);
  });
  return null;
}

function GameStage(p: GameStageProps) {
  const [warm, setWarm] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const shared = useRef<Shared>({ bases: [], outers: [], dragging: null, pending: new Map(), busy: false }).current;
  const places = useMemo(() => spots(p.layout, p.kinds.length, p.selected, p.compact), [p.layout, p.kinds.length, p.selected, p.compact]);
  const onWarm = useMemo(
    () => () => {
      setWarm(true);
      p.onReady?.();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const kindsKey = p.kinds.join(",");
  const editIndex = p.edit ? p.edit.index : null;
  // The admin has taken these moves in: draw its looks again.
  useEffect(() => {
    const ack = p.ack ?? 0;
    for (const [i, v] of shared.pending) if (v.seq <= ack || editIndex === null) shared.pending.delete(i);
  }, [p.ack, p.looks, editIndex, shared]);

  const props = { ...p, onHover: (i: number | null) => { setHovered(i); p.onHover(i); } };
  const cam = p.camera ?? CAMERA_DEFAULT;
  const ls = p.lightSet ?? LIGHTS_DEFAULT;
  // The key light keeps its height and distance; the store turns it round the stage.
  const key: [number, number, number] = [Math.sin(rad(ls.keyAngle)) * 5.83, 5, Math.cos(rad(ls.keyAngle)) * 5.83];
  return (
    <Canvas
      camera={{ position: [0, 0.4, 8], fov: 38 }}
      dpr={sceneDpr()}
      frameloop={warm ? "demand" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      resize={{ scroll: false }}
      onPointerMissed={() => setHovered(null)}
    >
      <ambientLight intensity={ls.ambient} />
      <directionalLight position={key} intensity={ls.key} />
      <pointLight position={[-4, 1, 2]} intensity={ls.rim} color={p.lights[0]} />
      <pointLight position={[4, -1, 2]} intensity={ls.rim} color={p.lights[1]} />
      <Environment resolution={64}>
        <Lightformer form="rect" intensity={2.5 * ls.env} position={[3, 4, 3]} scale={[3, 5, 1]} />
        <Lightformer form="rect" intensity={1.5 * ls.env} color={p.lights[0]} position={[-4, 1, 1]} scale={[2, 4, 1]} />
        <Lightformer form="ring" intensity={1.5 * ls.env} color={p.lights[1]} position={[0, -2, 4]} scale={2.5} />
      </Environment>
      <Floor kind={p.floor} lights={p.lights} colour={p.floorColour} glow={p.floorGlow !== false} />
      {p.kinds.map((kind, i) => (
        <Piece key={`${kind}-${i}`} i={i} kind={kind} spot={places[i]} picked={i === p.selected} hovered={hovered === i} look={p.looks?.[i]} p={props} shared={shared} />
      ))}
      {p.edit ? <Handles shared={shared} edit={p.edit} kindsKey={kindsKey} onTransform={p.onTransform} /> : null}
      <Rig progress={p.progress} compact={p.compact} still={p.still} hold={Boolean(p.edit)} moving={!p.still && (!p.edit || p.edit.play)} cam={cam} onWarm={onWarm} />
      <ScenePacer active={p.active && warm} />
    </Canvas>
  );
}

export default memo(GameStage);
