"use client";
/**
 * A page tree's 3D model on its own canvas (loaded by Model3dSpot only near the screen):
 * a built-in model (storeThemes/three/models.tsx) or the store's .glb (GlbModel, fitted the
 * same way), posed, moving its way (always, with the mouse over it, or with the scroll),
 * leaning toward the mouse, lit by one of the light setups (light shapes, no downloaded
 * images), on a soft shadow, a grid, a disc, a round stand or a ring of light, turned by hand when the store lets
 * shoppers (it glides to a stop, and can go back to its pose). It can come in the first time it's seen (rising,
 * popping, spinning or dropping in) and carry sparkles floating around it.
 */
import { Suspense, useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Html, Lightformer, OrbitControls, Sparkles } from "@react-three/drei";
import { Box3, Vector3 } from "three";
import type * as THREE from "three";
import { dressParts, live3d, viewPlace } from "./model3dLive";
import { GameModel } from "@/storeThemes/three/models";
import { GlbModel } from "@/storeThemes/three/GlbModel";
import type { ModelColours } from "@/storeThemes/three/parts";
import { model3dMoves, type Model3dSpec } from "./model3d";
import { usePageIdle } from "@/lib/pageIdle";
import { ScenePacer } from "@/components/cinematic/ScenePacer";

const FLOOR_Y = -1.45;
const outCubic = (u: number) => 1 - (1 - u) ** 3;
const outBack = (u: number) => 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2;
function outBounce(u: number) {
  const n = 7.5625, d = 2.75;
  if (u < 1 / d) return n * u * u;
  if (u < 2 / d) return n * (u -= 1.5 / d) * u + 0.75;
  if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + 0.9375;
  return n * (u -= 2.625 / d) * u + 0.984375;
}

function Rig({ spec, colours, still, active, hovered, progress, inner, onReady, onError, onBase }: { spec: Model3dSpec; colours: ModelColours; still: boolean; active: boolean; hovered: MutableRefObject<boolean>; progress: MutableRefObject<number>; inner: MutableRefObject<THREE.Group | null>; onReady?: () => void; onError?: () => void; onBase?: (y: number) => void }) {
  const outer = useRef<THREE.Group>(null);
  // Coming in the first time it's seen (its own group, so its pose and motion stay as they are).
  const stage = useRef<THREE.Group>(null);
  const intro = useRef(spec.intro && !still ? 0 : 1);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { if (active) invalidate(); }, [active, invalidate]);
  // Its parts dressed by their own looks (model3dLive.ts), again once a file has loaded.
  const [loaded, setLoaded] = useState(0);
  useEffect(() => { if (!spec.file) onReady?.(); }, [spec.file, onReady]);
  useEffect(() => {
    dressParts(inner.current, spec.parts);
    invalidate();
  }, [spec.parts, loaded, colours, inner, invalidate]);
  // Where its lowest point rests (as posed, before any motion): a stand or a ring of light sits right under it.
  useEffect(() => {
    const o = outer.current;
    if (!o || !onBase) return;
    o.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(o);
    if (Number.isFinite(box.min.y)) onBase(box.min.y);
  }, [loaded, spec.model, spec.size, spec.lift, spec.turn, spec.knobs, onBase]);
  // How far the motion has gone: it runs while it should and settles back otherwise.
  const play = useRef({ t: 0, weight: spec.anim.trigger === "always" ? 1 : 0 });
  useFrame(({ pointer }, dt) => {
    const o = outer.current;
    const g = inner.current;
    const st = stage.current;
    if (st && spec.intro) {
      if (still) intro.current = 1;
      else if (active && intro.current < 1) intro.current = Math.min(1, intro.current + Math.min(dt, 0.05) / (spec.intro === "drop" ? 1.1 : 0.9));
      const u = intro.current;
      st.position.y = spec.intro === "rise" ? -(1 - outCubic(u)) * 1.4 : spec.intro === "drop" ? (1 - outBounce(u)) * 3.2 : 0;
      st.rotation.y = spec.intro === "spin" ? (1 - outCubic(u)) * Math.PI * 2 : 0;
      st.scale.setScalar(spec.intro === "pop" ? Math.max(0.001, outBack(u)) : spec.intro === "rise" ? 0.6 + 0.4 * outCubic(u) : spec.intro === "spin" ? 0.3 + 0.7 * outCubic(u) : 1);
      if (active && u < 1) invalidate();
    }
    if (!o || !g || still) return;
    const { type, speed, amount, trigger } = spec.anim;
    const on = trigger === "always" || (trigger === "hover" && hovered.current) || trigger === "scroll";
    const p = play.current;
    p.weight += ((on ? 1 : 0) - p.weight) * Math.min(1, dt * 4);
    p.t = trigger === "scroll" ? progress.current * 8 : p.t + dt * speed;
    const w = p.weight * amount;
    const t = p.t;
    g.position.set(0, 0, 0);
    g.rotation.set(0, 0, 0);
    g.scale.setScalar(1);
    if (type === "spin") g.rotation.y = trigger === "always" ? t : t * p.weight;
    if (type === "float") g.position.y = Math.sin(t * 1.6) * 0.18 * w;
    if (type === "bounce") g.position.y = Math.abs(Math.sin(t * 2.4)) * 0.35 * w;
    if (type === "pulse") g.scale.setScalar(1 + Math.sin(t * 3) * 0.06 * w);
    if (type === "swing") g.rotation.z = Math.sin(t * 1.8) * 0.3 * w;
    if (type === "orbit") g.position.set(Math.cos(t) * 0.6 * w, 0, Math.sin(t) * 0.6 * w);
    // Leaning toward the mouse.
    if (spec.tilt) {
      o.rotation.y += (spec.turn[1] + pointer.x * 0.5 - o.rotation.y) * Math.min(1, dt * 5);
      o.rotation.x += (spec.turn[0] - pointer.y * 0.35 - o.rotation.x) * Math.min(1, dt * 5);
    }
  });
  return (
    <group ref={stage}>
    <group ref={outer} position={[0, spec.lift, 0]} rotation={spec.turn} scale={spec.size}>
      <group ref={inner}>
        {spec.file ? (
          <GlbModel url={spec.file.url} clip={still ? undefined : spec.file.clip} fallback={null} onInfo={(info) => { setLoaded((n) => n + 1); if (info.error) onError?.(); else onReady?.(); }} />
        ) : spec.model ? (
          <GameModel kind={spec.model} knobs={spec.knobs} c={colours} style={spec.finish} />
        ) : null}
        {/* Its labelled points: they turn with it. */}
        {spec.spots.map((s) => (
          <Html key={s.id} position={s.at} center zIndexRange={[20, 0]}>
            {s.href ? (
              <a className="pt-3d-spot" href={s.href} data-spot={s.id}><span aria-hidden="true" /><b>{s.text}</b></a>
            ) : (
              <button type="button" className="pt-3d-spot" data-spot={s.id}><span aria-hidden="true" /><b>{s.text}</b></button>
            )}
          </Html>
        ))}
      </group>
    </group>
    </group>
  );
}

/**
 * Turned by hand: it glides to a stop; with "back" it returns to where the design put the camera once let go
 * (not while it turns by itself or has saved views, which move the camera themselves).
 */
function Hands({ spec, still }: { spec: Model3dSpec; still: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useRef<any>(null);
  const { camera, invalidate } = useThree();
  const home = useRef<Vector3 | null>(null);
  const returning = useRef(false);
  const goesBack = spec.back && spec.auto === 0 && spec.views.length === 0;
  useEffect(() => { home.current = camera.position.clone(); }, [camera]);
  useFrame((_, dt) => {
    if (!returning.current || !home.current) return;
    camera.position.lerp(home.current, Math.min(1, Math.min(dt, 0.05) * 3.2));
    camera.lookAt(0, 0, 0);
    controls.current?.update();
    if (camera.position.distanceTo(home.current) < 0.01) returning.current = false;
    else invalidate();
  });
  return (
    <OrbitControls
      ref={controls} enabled={spec.drag} enablePan={false} enableZoom={spec.drag && spec.zoom} minDistance={2} maxDistance={20}
      enableDamping dampingFactor={0.09}
      autoRotate={spec.auto !== 0 && !still} autoRotateSpeed={spec.auto * 2} target={[0, 0, 0]}
      onStart={() => { returning.current = false; }}
      onEnd={() => { if (goesBack) { returning.current = true; invalidate(); } }}
    />
  );
}

/**
 * Its saved views: the camera goes to the next one on a click, by itself every few seconds, or along the page's
 * scroll; the editor's view being chosen (studio) shows first. It also lists the canvas for the editor's live hold.
 */
function CameraViews({ spec, progress, inner }: { spec: Model3dSpec; progress: MutableRefObject<number>; inner: MutableRefObject<THREE.Group | null> }) {
  const { camera, gl, scene, invalidate } = useThree();
  const at = useRef(0);
  const clock = useRef(0);
  const travel = useRef(true);
  const want = useRef(new Vector3());
  useEffect(() => {
    live3d.set(gl.domElement, { scene, camera, root: () => inner.current, invalidate, preview: null });
    return () => { live3d.delete(gl.domElement); };
  }, [gl, scene, camera, inner, invalidate]);
  useEffect(() => {
    if (spec.views.length < 2 || spec.viewOn !== "click") return;
    const next = () => { at.current = (at.current + 1) % spec.views.length; travel.current = true; invalidate(); };
    gl.domElement.addEventListener("click", next);
    return () => gl.domElement.removeEventListener("click", next);
  }, [gl, spec.views, spec.viewOn, invalidate]);
  useFrame((_, dt) => {
    const preview = live3d.get(gl.domElement)?.preview;
    const views = spec.views;
    let place: [number, number, number] | null = null;
    if (preview) {
      place = viewPlace(preview);
      travel.current = true;
    } else if (views.length) {
      if (spec.viewOn === "auto" && views.length > 1 && (clock.current += dt) > 4) {
        clock.current = 0;
        at.current = (at.current + 1) % views.length;
        travel.current = true;
      }
      if (spec.viewOn === "scroll" && views.length > 1) {
        const f = Math.min(0.999, Math.max(0, progress.current)) * (views.length - 1);
        const i = Math.floor(f), k = f - i;
        const a = viewPlace(views[i]), b = viewPlace(views[Math.min(views.length - 1, i + 1)]);
        place = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
        travel.current = true;
      } else place = viewPlace(views[at.current % views.length]);
    }
    if (!place || !travel.current) return;
    want.current.set(place[0], place[1], place[2]);
    camera.position.lerp(want.current, Math.min(1, dt * 4));
    camera.lookAt(0, 0, 0);
    if (camera.position.distanceTo(want.current) < 0.005) travel.current = false;
    else invalidate();
  });
  return null;
}

function Floor({ spec, tint, glow, base }: { spec: Model3dSpec; tint: string; glow: string; base: number }) {
  // A round stand it sits on, with a thin line of light around its top.
  if (spec.floor === "pedestal") {
    return (
      <group position={[0, base, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[1.7, 1.86, 0.4, 72]} />
          <meshStandardMaterial color={tint} roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
          <ringGeometry args={[1.56, 1.64, 96]} />
          <meshBasicMaterial color={glow} toneMapped={false} />
        </mesh>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={3.3} blur={2.2} far={3.2} resolution={256} />
      </group>
    );
  }
  // A ring of light on the floor, with a soft pool of it inside and out.
  if (spec.floor === "halo") {
    return (
      <group position={[0, base, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
          <ringGeometry args={[0.9, 2.4, 96]} />
          <meshBasicMaterial color={glow} transparent opacity={0.1} toneMapped={false} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.56, 1.63, 128]} />
          <meshBasicMaterial color={glow} toneMapped={false} />
        </mesh>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={8} blur={2.6} far={3.2} resolution={256} />
      </group>
    );
  }
  if (spec.floor === "shadow") return <ContactShadows position={[0, FLOOR_Y, 0]} opacity={0.45} scale={8} blur={2.4} far={3.2} resolution={256} />;
  if (spec.floor === "grid") return <gridHelper args={[10, 20, tint, tint]} position={[0, FLOOR_Y, 0]} />;
  if (spec.floor === "disc") {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]}>
        <circleGeometry args={[2.2, 64]} />
        <meshStandardMaterial color={tint} roughness={0.6} metalness={0.2} />
      </mesh>
    );
  }
  return null;
}

export default function Model3dCanvas({ spec, colours, rims, floorTint, sparkle, halo, active, still, hovered, progress, onReady, onError }: {
  spec: Model3dSpec;
  colours: ModelColours;
  /** The two rim lights' colours (theme colours already read from the page). */
  rims: [string, string];
  floorTint: string;
  /** The sparkles' colour (read from the page). */
  sparkle?: string;
  /** The colour of a stand's line of light and of a ring of light (the page's accent). */
  halo?: string;
  active: boolean;
  still: boolean;
  hovered: MutableRefObject<boolean>;
  progress: MutableRefObject<number>;
  onReady?: () => void;
  onError?: () => void;
}) {
  const l = spec.lights;
  const moves = model3dMoves(spec) && !still;
  // While the page rests (lib/pageIdle.ts) the model keeps its last frame instead of being drawn 60 times a second.
  const resting = usePageIdle();
  const inner = useRef<THREE.Group | null>(null);
  // Under the model's lowest point (a little below, never above the usual floor's height by much).
  const [base, setBase] = useState(FLOOR_Y);
  const onBase = useCallback((y: number) => setBase(Math.max(FLOOR_Y, Math.min(0.4, y - 0.02))), []);
  return (
    <Canvas
      dpr={[1, 1.75]}
      // Drawn by ScenePacer: full pace while the page scrolls or the pointer moves, 30 a second for its own slow
      // motion otherwise ("always" drew it at the screen's 120–144 a second).
      frameloop="demand"
      camera={{ position: [0, spec.camera.height, spec.camera.distance], fov: spec.camera.fov }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    >
      <ScenePacer active={active && moves && !resting} maxFps={spec.fps} />
      {spec.bg ? <color attach="background" args={[spec.bg]} /> : null}
      <ambientLight intensity={l.ambient} />
      <directionalLight position={[3, 5, 4]} intensity={l.key} />
      <pointLight position={[-4, 1, 2]} intensity={l.rim} color={rims[0]} />
      <pointLight position={[4, -1, 2]} intensity={l.rim} color={rims[1]} />
      <Environment resolution={64}>
        <Lightformer form="rect" intensity={2.5 * l.env} position={[3, 4, 3]} scale={[3, 5, 1]} />
        <Lightformer form="rect" intensity={1.5 * l.env} color={rims[0]} position={[-4, 1, 1]} scale={[2, 4, 1]} />
        <Lightformer form="ring" intensity={1.5 * l.env} color={rims[1]} position={[0, -2, 4]} scale={2.5} />
      </Environment>
      <Suspense fallback={null}>
        <Rig spec={spec} colours={colours} still={still} active={active} hovered={hovered} progress={progress} inner={inner} onReady={onReady} onError={onError} onBase={onBase} />
      </Suspense>
      <CameraViews spec={spec} progress={progress} inner={inner} />
      <Floor spec={spec} tint={floorTint} glow={halo ?? rims[0]} base={base} />
      {/* Sparkles floating around it (still for "reduce motion"). */}
      {spec.sparkles ? <Sparkles count={spec.sparkles.count} size={spec.sparkles.size} speed={still ? 0 : 0.35} opacity={0.9} color={sparkle ?? "#ffffff"} scale={[4.4, 3.2, 4.4]} noise={1} /> : null}
      {spec.drag || (spec.auto !== 0 && !still) ? <Hands spec={spec} still={still} /> : null}
    </Canvas>
  );
}
