"use client";
/**
 * A page tree's 3D model on its own canvas (loaded by Model3dSpot only near the screen):
 * a built-in model (storeThemes/three/models.tsx) or the store's .glb (GlbModel, fitted the
 * same way), posed, moving its way (always, with the mouse over it, or with the scroll),
 * leaning toward the mouse, lit by one of the light setups (light shapes, no downloaded
 * images), on a soft shadow, a grid or a disc, turned by hand when the store lets shoppers.
 */
import { Suspense, useEffect, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Html, Lightformer, OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";
import type * as THREE from "three";
import { dressParts, live3d, viewPlace } from "./model3dLive";
import { GameModel } from "@/storeThemes/three/models";
import { GlbModel } from "@/storeThemes/three/GlbModel";
import type { ModelColours } from "@/storeThemes/three/parts";
import { model3dMoves, type Model3dSpec } from "./model3d";
import { usePageIdle } from "@/lib/pageIdle";
import { ScenePacer } from "@/components/cinematic/ScenePacer";

const FLOOR_Y = -1.45;

function Rig({ spec, colours, still, hovered, progress, inner, onReady, onError }: { spec: Model3dSpec; colours: ModelColours; still: boolean; hovered: MutableRefObject<boolean>; progress: MutableRefObject<number>; inner: MutableRefObject<THREE.Group | null>; onReady?: () => void; onError?: () => void }) {
  const outer = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  // Its parts dressed by their own looks (model3dLive.ts), again once a file has loaded.
  const [loaded, setLoaded] = useState(0);
  useEffect(() => { if (!spec.file) onReady?.(); }, [spec.file, onReady]);
  useEffect(() => {
    dressParts(inner.current, spec.parts);
    invalidate();
  }, [spec.parts, loaded, colours, inner, invalidate]);
  // How far the motion has gone: it runs while it should and settles back otherwise.
  const play = useRef({ t: 0, weight: spec.anim.trigger === "always" ? 1 : 0 });
  useFrame(({ pointer }, dt) => {
    const o = outer.current;
    const g = inner.current;
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

function Floor({ spec, tint }: { spec: Model3dSpec; tint: string }) {
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

export default function Model3dCanvas({ spec, colours, rims, floorTint, active, still, hovered, progress, onReady, onError }: {
  spec: Model3dSpec;
  colours: ModelColours;
  /** The two rim lights' colours (theme colours already read from the page). */
  rims: [string, string];
  floorTint: string;
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
        <Rig spec={spec} colours={colours} still={still} hovered={hovered} progress={progress} inner={inner} onReady={onReady} onError={onError} />
      </Suspense>
      <CameraViews spec={spec} progress={progress} inner={inner} />
      <Floor spec={spec} tint={floorTint} />
      {spec.drag || (spec.auto !== 0 && !still) ? (
        <OrbitControls
          enabled={spec.drag} enablePan={false} enableZoom={spec.drag && spec.zoom} minDistance={2} maxDistance={20}
          autoRotate={spec.auto !== 0 && !still} autoRotateSpeed={spec.auto * 2} target={[0, 0, 0]}
        />
      ) : null}
    </Canvas>
  );
}
