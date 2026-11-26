"use client";
/**
 * The games stage on a page (G0 of docs/game-engine-plan.ar.md): gameEngine.ts run 60 times a second and drawn by
 * three.js on a canvas (an orthographic camera over the game's world, its y downwards), loaded only on a page with a
 * game (lazyParts.tsx).
 *  - Each thing is a flat square with its look drawn once on a little canvas: a shape in its colour, an emoji, its
 *    words (joined and right to left as the page's own letters are), or a picture (a box in its colour until it loads
 *    or if it can't be read). Bursts are little squares that fly and fade; a shake moves the camera.
 *  - Played with the keyboard (arrows, Space, Enter), the pointer (follow it, drag, taps) and, on a touch screen,
 *    buttons for the arrows and the jump. The page doesn't scroll from those keys or a finger on the stage while it
 *    plays.
 *  - Over it: the score, lives and time; a start screen (its title, how to play, Start); an end screen (won or over,
 *    play again) and, won, the prize and its coupon for the bag (ShopGames.tsx's Prize, lib/wonCoupon.ts).
 *  - It rests off screen and in a hidden tab; in the editor it shows its first frame and waits.
 *  - G1: the camera over a bigger world; the tile map, one instanced mesh for each kind of tile (made again only when
 *    a rule takes a tile away); the layers behind, each moving at its own share of the camera's speed; a sprite's
 *    frame for its state, turned the way it faces; an emoji that runs and jumps squashes and stretches a little.
 *  - G1b: the level in the bar; the cover between levels (a fade, a wipe or a circle in the theme's ink, over the
 *    canvas, its style set each frame without React); a ❗ that rises over a guard as it sees the player.
 *  - G2: a game with rigid things loads Rapier (its 2D deterministic build, only then) and is made again with it;
 *    Start waits for it. A sling's shot is shown as dots along its way while it's pulled back.
 *  - G2b: ropes, springs and sliders drawn as lines between their two ends; a motor's key gets its touch button.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import type * as T from "three";
import { saveWonCoupon } from "../lib/wonCoupon";
import { NO_INPUT, STEP, coverOf, endGame, levelCount, newGame, startGame, stepGame, timeLeft, type Body, type GameInput, type GameState, type Phase } from "./gameEngine";
import { needsPhysics, physJoints, type Rapier } from "./gamePhysics";
import type { GameSpec } from "./gameSpec";
import { coverCss, cssColour, lookCanvas, sheetFrame } from "./gameDraw";
import type { GameWords as PrizeWords } from "./proWords";
import { Prize } from "./ShopGames";

export type StageWords = { start: string; again: string; win: string; lose: string; score: string; lives: string; time: string; sound: string; left: string; right: string; up: string; down: string; jump: string; paused: string; level: string };

const inEditor = () => typeof window !== "undefined" && window.parent !== window && /\/studio-frame/.test(window.location.pathname);
const lessMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
const keyOf = (id: string) => `estabrek_game_stage_${id}`;
const wonBefore = (id: string) => { try { return window.localStorage.getItem(keyOf(id)) === "won"; } catch { return false; } };
const markWon = (id: string) => { try { window.localStorage.setItem(keyOf(id), "won"); } catch { /* the prize still shows */ } };
const KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter"]);

/** Rapier, loaded once for every game on the page that needs it. */
let rapierLoad: Promise<Rapier | null> | null = null;
const loadRapier = () => (rapierLoad ??= import("@dimforge/rapier2d-deterministic-compat")
  .then(async (m) => {
    const R = (m.default ?? m) as unknown as Rapier & { init(): Promise<void> };
    await R.init();
    return R as Rapier;
  })
  // Not loaded (offline): the game plays with the arcade's bodies.
  .catch(() => null));

/* ---------------------------------------------------------------- sounds */

let audio: AudioContext | null = null;
function beep(kind: string) {
  try {
    audio ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const a = audio, now = a.currentTime, o = a.createOscillator(), g = a.createGain();
    const tone: Record<string, [OscillatorType, number, number, number]> = {
      click: ["square", 520, 520, 0.05], pop: ["sine", 660, 990, 0.09], chime: ["triangle", 880, 1320, 0.25],
      whoosh: ["sawtooth", 300, 120, 0.12], success: ["triangle", 523, 1046, 0.45], hit: ["square", 180, 70, 0.18],
    };
    const [type, from, to, len] = tone[kind] ?? tone.pop;
    o.type = type;
    o.frequency.setValueAtTime(from, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, to), now + len);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + len);
    o.connect(g).connect(a.destination);
    o.start(now);
    o.stop(now + len + 0.02);
  } catch { /* no sound here */ }
}

/* ---------------------------------------------------------------- the view */

export type GameViewProps = {
  id: string;
  spec: GameSpec;
  /** Each colour the game names (its ground's, its things'), as CSS. */
  colours: Record<string, string>;
  words: StageWords;
  prizeWords: PrizeWords;
  rtl: boolean;
};

type Hud = { phase: Phase; score: number; lives: number; time: number | null; level: number };

export function GameView({ id, spec, colours, words, prizeWords, rtl }: GameViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameState | null>(null);
  const input = useRef<GameInput>({ ...NO_INPUT, pressed: [], taps: [] });
  const [hud, setHud] = useState<Hud>({ phase: "ready", score: 0, lives: spec.lives, time: spec.time || null, level: 1 });
  const cover = useRef<HTMLDivElement>(null);
  const levels = levelCount(spec);
  const physics = needsPhysics(spec);
  const [physReady, setPhysReady] = useState(!physics);
  const [sound, setSound] = useState(true);
  const [touch, setTouch] = useState(false);
  const [editor, setEditor] = useState(false);
  const [saved, setSaved] = useState(false);
  const [paused, setPaused] = useState(false);
  const soundRef = useRef(true);
  soundRef.current = sound;

  if (!game.current) game.current = newGame(spec);

  // What a touch screen needs: the controls the game's things use.
  const controls = new Set(spec.things.map((t) => t.control));
  // A joint's motor on a key (a flipper) needs that key's button too.
  const motorKeys = new Set(spec.joints.flatMap((j) => (j.motor?.key ? [j.motor.key] : [])));
  const needsArrows = controls.has("leftRight") || controls.has("platform") || controls.has("fourWay") || motorKeys.has("ArrowLeft") || motorKeys.has("ArrowRight");
  const needsUpDown = controls.has("fourWay") || motorKeys.has("ArrowUp") || motorKeys.has("ArrowDown");
  const needsJump = controls.has("platform") || motorKeys.has("Space");

  useEffect(() => {
    setTouch(window.matchMedia?.("(pointer: coarse)").matches === true);
    setEditor(inEditor());
    // Won before on this device, once per shopper: it stays won (the prize shows, no new game).
    if (spec.coupon && spec.once && wonBefore(id) && game.current) { game.current.phase = "won"; setHud((h) => ({ ...h, phase: "won" })); }
  }, [id, spec.coupon, spec.once]);

  /* ---- three.js: drawn from the game's state each frame */
  useEffect(() => {
    const el = host.current, cv = canvas.current;
    if (!el || !cv) return;
    let stop = false, frame = 0, visible = true, hidden = document.hidden;
    let cleanup = () => {};
    void Promise.all([import("three"), physics ? loadRapier() : Promise.resolve(null)]).then(([THREE, R]) => {
      if (stop) return;
      // Its rigid things are Rapier's now: the game made again with it (still waiting to start).
      if (physics) {
        if (R) {
          endGame(game.current!);
          game.current = newGame(spec, R);
          if (spec.coupon && spec.once && wonBefore(id)) game.current.phase = "won";
        }
        setPhysReady(true);
      }
      const probe = document.createElement("span");
      probe.style.display = "none";
      el.appendChild(probe);
      const font = getComputedStyle(el).fontFamily || "sans-serif";
      const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, preserveDrawingBuffer: false });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setClearColor(new THREE.Color(cssColour(probe, colours[spec.bg] ?? spec.bg)));
      const scene = new THREE.Scene();
      // y downwards: the world's top-left is the screen's.
      const camera = new THREE.OrthographicCamera(0, spec.w, 0, spec.h, -10, 10);
      const square = new THREE.PlaneGeometry(1, 1);
      const textures = new Map<string, T.CanvasTexture>();
      const textureOf = (b: Body) => {
        let tx = textures.get(b.of);
        if (!tx) {
          const look = b.thing.look;
          const fill = cssColour(probe, colours[look.color] ?? look.color);
          const c = lookCanvas(look, b.thing.w, b.thing.h, fill, font, rtl, () => { const t = textures.get(b.of); if (t) t.needsUpdate = true; });
          tx = new THREE.CanvasTexture(c);
          tx.flipY = false;
          tx.colorSpace = THREE.SRGBColorSpace;
          textures.set(b.of, tx);
        }
        return tx;
      };
      const meshes = new Map<number, T.Mesh>();
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");
      const sheets = new Map<string, T.Texture>();
      const sheetOf = (src: string) => {
        let t = sheets.get(src);
        if (!t) { t = loader.load(src); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.flipY = false; sheets.set(src, t); }
        return t;
      };

      /* ---- the layers behind the world */
      const layers = spec.layers.map((l, i) => {
        let tx: T.Texture;
        if (l.kind === "image" && l.src) { tx = loader.load(l.src); tx.colorSpace = THREE.SRGBColorSpace; }
        else {
          const c = document.createElement("canvas");
          c.width = 4; c.height = 256;
          const x = c.getContext("2d")!;
          const a = cssColour(probe, colours[l.color] ?? l.color), b = cssColour(probe, colours[l.color2] ?? l.color2);
          if (l.kind === "gradient") { const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; } else x.fillStyle = a;
          x.fillRect(0, 0, 4, 256);
          tx = new THREE.CanvasTexture(c);
          tx.colorSpace = THREE.SRGBColorSpace;
        }
        tx.wrapS = THREE.RepeatWrapping;
        tx.flipY = false;
        const m = new THREE.Mesh(square, new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide, transparent: true, depthWrite: false }));
        m.renderOrder = -10 + i;
        scene.add(m);
        return { l, m, tx };
      });
      const placeLayers = (cx: number, cy: number) => {
        for (const { l, m, tx } of layers) {
          const h = spec.h * l.h;
          m.position.set(cx + spec.w / 2, cy + spec.h * l.y + h / 2, -5);
          m.scale.set(spec.w, h, 1);
          // A picture repeats across, at its own share of the camera's way.
          if (l.kind === "image") { tx.repeat.set(1, 1); tx.offset.x = (cx * l.factor) / spec.w; }
        }
      };

      /* ---- the tile map: an instanced mesh for each kind */
      let tilesV = -1;
      const tileMeshes: T.InstancedMesh[] = [];
      const tileTextures: T.Texture[] = [];
      const buildTiles = (st: GameState) => {
        for (const m of tileMeshes) { scene.remove(m); (m.material as T.Material).dispose(); m.dispose(); }
        tileMeshes.length = 0;
        const t = spec.tiles;
        if (!t || !st.tiles) return;
        for (const [ch, kind] of Object.entries(t.kinds)) {
          if (kind.thing) continue;
          const cells: Array<[number, number]> = [];
          st.tiles.forEach((row, r) => row.forEach((x, c) => { if (x === ch) cells.push([c, r]); }));
          if (!cells.length) continue;
          let tx = tileTextures[ch.charCodeAt(0)];
          if (!tx) {
            const fill = cssColour(probe, colours[kind.look.color] ?? kind.look.color);
            const c = lookCanvas(kind.look, t.size, t.size, fill, font, rtl, () => { tx.needsUpdate = true; });
            tx = new THREE.CanvasTexture(c);
            tx.flipY = false;
            tx.colorSpace = THREE.SRGBColorSpace;
            tileTextures[ch.charCodeAt(0)] = tx;
          }
          const im = new THREE.InstancedMesh(square, new THREE.MeshBasicMaterial({ map: tx, transparent: true, side: THREE.DoubleSide }), cells.length);
          const at = new THREE.Matrix4();
          cells.forEach(([c, r], i) => { at.makeScale(t.size, t.size, 1); at.setPosition(c * t.size + t.size / 2, r * t.size + t.size / 2, -1); im.setMatrixAt(i, at); });
          im.instanceMatrix.needsUpdate = true;
          scene.add(im);
          tileMeshes.push(im);
        }
      };
      type Spark = { m: T.Mesh; vx: number; vy: number; life: number };
      const sparks: Spark[] = [];
      let alertTx: T.CanvasTexture | null = null;
      // The sling's way: dots, hidden but while it's pulled back.
      const dotTx = new THREE.CanvasTexture(lookCanvas({ kind: "circle", color: "text" }, 16, 16, cssColour(probe, colours.text ?? "#111"), font, rtl, () => {}));
      dotTx.colorSpace = THREE.SRGBColorSpace;
      // Ropes, springs and sliders: lines between their ends.
      const strings = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: new THREE.Color(cssColour(probe, colours.text ?? "#111")) }));
      strings.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(40 * 6), 3));
      strings.renderOrder = 15;
      strings.frustumCulled = false;
      scene.add(strings);
      const dots = Array.from({ length: 22 }, (_, i) => {
        const m = new THREE.Mesh(square, new THREE.MeshBasicMaterial({ map: dotTx, transparent: true, opacity: 0.85 - i * 0.03, depthTest: false }));
        m.visible = false;
        m.renderOrder = 20;
        m.scale.set(9 - i * 0.2, 9 - i * 0.2, 1);
        scene.add(m);
        return m;
      });
      const resize = () => {
        const r = el.getBoundingClientRect();
        renderer.setSize(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.width * (spec.h / spec.w))), false);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
      io.observe(el);
      const onVis = () => { hidden = document.hidden; };
      document.addEventListener("visibilitychange", onVis);

      const draw = (s: GameState) => {
        const alive = new Set<number>();
        s.bodies.forEach((b, i) => {
          alive.add(b.n);
          let m = meshes.get(b.n);
          const look = b.thing.look;
          if (!m) {
            // A sprite shares its sheet; its own square's corners pick its frame.
            const sprite = look.kind === "sprite" && look.src;
            m = new THREE.Mesh(sprite ? new THREE.PlaneGeometry(1, 1) : square, new THREE.MeshBasicMaterial({ map: sprite ? sheetOf(look.src!) : textureOf(b), transparent: true, side: THREE.DoubleSide }));
            scene.add(m);
            meshes.set(b.n, m);
          }
          let sx = b.w, sy = b.h, y = b.y;
          if (look.kind === "sprite") {
            const f = sheetFrame(look, b.anim, s.t);
            const u0 = f.col / f.cols, u1 = (f.col + 1) / f.cols, top = f.row / f.rows, bottom = (f.row + 1) / f.rows;
            const uv = m.geometry.getAttribute("uv") as T.BufferAttribute;
            // The square's lower corners (its +y, the screen's lower side here) take the frame's bottom.
            if (uv.getX(0) !== u0 || uv.getY(2) !== top) { uv.setXY(0, u0, bottom); uv.setXY(1, u1, bottom); uv.setXY(2, u0, top); uv.setXY(3, u1, top); uv.needsUpdate = true; }
            sx *= b.face;
          } else if (b.thing.control === "platform" && !lessMotion()) {
            // An emoji that runs bobs, one that jumps stretches, one that falls squashes.
            const k = b.anim === "jump" ? 1.1 : b.anim === "fall" ? 0.93 : b.anim === "run" ? 1 + Math.sin(s.t * 18) * 0.05 : 1;
            sy *= k; sx /= Math.sqrt(k); y += (b.h - sy) / 2;
            sx *= b.face;
          }
          m.position.set(b.x, y, i * 0.001);
          m.scale.set(sx, sy, 1);
          m.rotation.z = b.rot;
        });
        for (const [n, m] of meshes) if (!alive.has(n)) { scene.remove(m); (m.material as T.Material).dispose(); if (m.geometry !== square) m.geometry.dispose(); meshes.delete(n); }
        for (const e of s.effects.splice(0)) {
          if (e.kind === "sound") { if (soundRef.current) beep(e.sound); }
          else if (e.kind === "burst") {
            const colour = new THREE.Color(cssColour(probe, colours[e.color] ?? e.color));
            for (let k = 0; k < (lessMotion() ? 5 : 14); k++) {
              const a = (k / 14) * Math.PI * 2 + Math.random() * 0.4, v = 160 + Math.random() * 260;
              const m = new THREE.Mesh(square, new THREE.MeshBasicMaterial({ color: colour, transparent: true }));
              m.position.set(e.x, e.y, 0.5);
              m.scale.set(8, 8, 1);
              scene.add(m);
              sparks.push({ m, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 });
            }
          } else if (e.kind === "alert") {
            // A guard has seen the player: a ❗ that rises over it and fades.
            if (!alertTx) {
              alertTx = new THREE.CanvasTexture(lookCanvas({ kind: "emoji", emoji: "❗", color: "accent" }, 32, 32, "#e11d48", font, rtl, () => { if (alertTx) alertTx.needsUpdate = true; }));
              alertTx.flipY = false;
              alertTx.colorSpace = THREE.SRGBColorSpace;
            }
            const m = new THREE.Mesh(square, new THREE.MeshBasicMaterial({ map: alertTx, transparent: true, side: THREE.DoubleSide }));
            m.position.set(e.x, e.y, 0.6);
            m.scale.set(26, 26, 1);
            scene.add(m);
            sparks.push({ m, vx: 0, vy: -30, life: 0.9 });
          }
        }
        const shake = s.shake > 0 && !lessMotion() ? 8 * (s.shake / 0.3) : 0;
        // The camera over its part of the world (and shaken a little).
        const ox = (Math.random() - 0.5) * shake, oy = (Math.random() - 0.5) * shake;
        camera.left = s.cx + ox; camera.right = s.cx + spec.w + ox; camera.top = s.cy + oy; camera.bottom = s.cy + spec.h + oy;
        camera.updateProjectionMatrix();
        camera.position.set(0, 0, 5);
        if (s.tilesV !== tilesV) { tilesV = s.tilesV; buildTiles(s); }
        dots.forEach((m, i) => { const p = s.aim?.pts[i]; m.visible = Boolean(p); if (p) m.position.set(p[0], p[1], 0.8); });
        if (s.phys?.joints.length) {
          const pos = strings.geometry.getAttribute("position") as T.BufferAttribute;
          const lines = physJoints(s.phys, s).filter((j) => j.kind === "rope" || j.kind === "spring" || j.kind === "slider").slice(0, 40);
          lines.forEach((l, i) => { pos.setXYZ(i * 2, l.from.x, l.from.y, 0.4); pos.setXYZ(i * 2 + 1, l.to.x, l.to.y, 0.4); });
          strings.geometry.setDrawRange(0, lines.length * 2);
          pos.needsUpdate = true;
        }
        placeLayers(s.cx, s.cy);
        renderer.render(scene, camera);
      };

      let last = performance.now(), acc = 0, shown = "", wasResting = false, covered = "";
      const ink = colours.text ?? "#111";
      // Less motion asked for: the cover only fades.
      const coverKind = lessMotion() && spec.transition !== "none" ? "fade" : spec.transition;
      const loop = (now: number) => {
        frame = requestAnimationFrame(loop);
        const s = game.current!;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        const running = s.phase === "playing" && visible && !hidden;
        const resting = s.phase === "playing" && (!visible || hidden);
        if (resting !== wasResting) { wasResting = resting; setPaused(resting); }
        if (running) {
          acc += dt;
          let n = 0;
          while (acc >= STEP && n < 5) {
            stepGame(s, input.current);
            input.current.pressed = [];
            input.current.taps = [];
            acc -= STEP;
            n++;
          }
          if (n === 5) acc = 0;
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const p = sparks[i];
          p.life -= dt;
          p.m.position.x += p.vx * dt;
          p.m.position.y += p.vy * dt;
          (p.m.material as T.MeshBasicMaterial).opacity = Math.max(0, p.life / 0.6);
          if (p.life <= 0) { scene.remove(p.m); (p.m.material as T.Material).dispose(); sparks.splice(i, 1); }
        }
        if (running || sparks.length || shown !== s.phase) draw(s);
        // The cover between levels, set straight on its element (each frame, no React).
        const c = coverOf(s), css = coverCss(coverKind, c.k, c.closing, ink);
        if (css !== covered && cover.current) { covered = css; cover.current.style.cssText = css; }
        const next: Hud = { phase: s.phase, score: s.score, lives: s.lives, time: timeLeft(s), level: s.level + 1 };
        const key = JSON.stringify(next);
        if (key !== shown) { shown = key; setHud(next); }
      };
      draw(game.current!);
      frame = requestAnimationFrame(loop);
      cleanup = () => {
        cancelAnimationFrame(frame);
        ro.disconnect();
        io.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        for (const m of meshes.values()) (m.material as T.Material).dispose();
        for (const t of textures.values()) t.dispose();
        for (const t of sheets.values()) t.dispose();
        for (const t of tileTextures) t?.dispose();
        alertTx?.dispose();
        dotTx.dispose();
        strings.geometry.dispose();
        (strings.material as T.Material).dispose();
        for (const m of dots) (m.material as T.Material).dispose();
        endGame(game.current!);
        for (const m of tileMeshes) m.dispose();
        for (const { tx, m } of layers) { tx.dispose(); (m.material as T.Material).dispose(); }
        square.dispose();
        renderer.dispose();
        probe.remove();
      };
    });
    return () => { stop = true; cleanup(); };
  }, [spec, colours, rtl, physics, id]);

  /* ---- the keyboard, while it plays */
  useEffect(() => {
    if (hud.phase !== "playing") return;
    const name = (e: KeyboardEvent) => (e.code === "Space" || e.key === " " ? "Space" : e.key);
    const down = (e: KeyboardEvent) => {
      const k = name(e);
      if (!KEYS.has(k)) return;
      e.preventDefault();
      const i = input.current;
      if (k === "ArrowLeft") i.left = true;
      if (k === "ArrowRight") i.right = true;
      if (k === "ArrowUp") i.up = true;
      if (k === "Space" || k === "ArrowUp") i.jumpHeld = true;
      if (k === "ArrowDown") i.down = true;
      if (!e.repeat) i.pressed.push(k);
    };
    const up = (e: KeyboardEvent) => {
      const k = name(e), i = input.current;
      if (k === "ArrowLeft") i.left = false;
      if (k === "ArrowRight") i.right = false;
      if (k === "ArrowUp") i.up = false;
      if (k === "Space" || k === "ArrowUp") i.jumpHeld = false;
      if (k === "ArrowDown") i.down = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); Object.assign(input.current, { left: false, right: false, up: false, down: false }); };
  }, [hud.phase]);

  /* ---- the pointer on the stage, in the world's units */
  const toWorld = (e: RPointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    const s = game.current!;
    return { x: s.cx + ((e.clientX - r.left) / r.width) * spec.w, y: s.cy + ((e.clientY - r.top) / r.height) * spec.h };
  };
  const onDown = (e: RPointerEvent) => {
    if (hud.phase !== "playing") return;
    const p = toWorld(e);
    input.current.pointer = p;
    input.current.pointerDown = true;
    input.current.taps.push(p);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: RPointerEvent) => { if (hud.phase === "playing") input.current.pointer = toWorld(e); };
  const onUp = () => { input.current.pointerDown = false; };

  const play = useCallback(() => {
    if (!physReady) return;
    const s = game.current!;
    startGame(s);
    setSaved(false);
    setHud({ phase: s.phase, score: s.score, lives: s.lives, time: timeLeft(s), level: s.level + 1 });
    if (soundRef.current) beep("click");
    host.current?.focus({ preventScroll: true });
  }, [physReady]);

  // Won: the prize, and its code for the bag.
  useEffect(() => {
    if (hud.phase !== "won" || !spec.coupon) return;
    saveWonCoupon(spec.coupon);
    setSaved(true);
    if (spec.once) markWon(id);
  }, [hud.phase, spec.coupon, spec.once, id]);

  const hold = (k: "left" | "right" | "up" | "down" | "jump", on: boolean) => (e: RPointerEvent) => {
    e.preventDefault();
    const i = input.current;
    if (k === "jump") { if (on) i.pressed.push("Space"); i.jumpHeld = on; return; }
    i[k] = on;
  };
  const playing = hud.phase === "playing";
  const style = { aspectRatio: `${spec.w} / ${spec.h}` } as CSSProperties;
  return (
    <div className="pt-gs-box">
    <div
      ref={host}
      className="pt-gs"
      style={style}
      tabIndex={-1}
      data-pt-game-phase={hud.phase}
      data-pt-game-score={hud.score}
      data-pt-game-lives={hud.lives}
      {...(hud.time !== null ? { "data-pt-game-time": hud.time } : {})}
      {...(levels > 1 ? { "data-pt-game-level": hud.level } : {})}
    >
      <canvas
        ref={canvas}
        className="pt-gs-canvas"
        style={{ touchAction: playing ? "none" : "auto" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-label={spec.words.title || words.start}
        role="img"
      />
      <div ref={cover} style={{ display: "none" }} aria-hidden="true" data-pt-game-cover="" />
      {playing || hud.phase !== "ready" ? (
        <div className="pt-gs-hud" aria-live="polite">
          <span data-pt-game-hud="score">{words.score}: <b>{hud.score}</b></span>
          {spec.lives ? <span data-pt-game-hud="lives" aria-label={`${words.lives}: ${hud.lives}`}>{"❤".repeat(Math.max(0, hud.lives)) || "—"}</span> : null}
          {hud.time !== null ? <span data-pt-game-hud="time">{words.time}: <b>{hud.time}</b></span> : null}
          {levels > 1 ? <span data-pt-game-hud="level">{words.level} <b>{hud.level}</b>/{levels}</span> : null}
          <button type="button" className="pt-gs-sound" onClick={() => setSound((x) => !x)} aria-pressed={sound} aria-label={words.sound}>{sound ? "🔊" : "🔇"}</button>
        </div>
      ) : null}
      {paused ? <div className="pt-gs-paused">{words.paused}</div> : null}
      {hud.phase === "ready" ? (
        <div className="pt-gs-screen">
          {spec.words.title ? <div className="pt-gs-title" data-pt-field="title">{spec.words.title}</div> : null}
          {spec.words.help ? <p className="pt-gs-help" data-pt-field="help">{spec.words.help}</p> : null}
          <button type="button" className="pt-gs-go" onClick={play} disabled={editor || !physReady} aria-busy={!physReady} data-pt-game-start="">{spec.words.start || words.start}</button>
        </div>
      ) : null}
      {hud.phase === "won" || hud.phase === "lost" ? (
        <div className="pt-gs-screen" data-pt-game-end={hud.phase}>
          <div className="pt-gs-title">{hud.phase === "won" ? spec.words.win || words.win : spec.words.lose || words.lose}</div>
          <p className="pt-gs-help">{words.score}: <b>{hud.score}</b></p>
          {hud.phase === "won" && (spec.coupon || spec.words.prize) ? <Prize prize={spec.words.prize} code={spec.coupon} saved={saved && Boolean(spec.coupon)} words={prizeWords} /> : null}
          {hud.phase === "lost" || !(spec.once && spec.coupon) ? <button type="button" className="pt-gs-go" onClick={play} data-pt-game-again="">{spec.words.again || words.again}</button> : null}
        </div>
      ) : null}
    </div>
      {/* A touch screen's buttons, under the stage (over it they hid the play on a phone). */}
      {playing && touch && needsArrows ? (
        <div className="pt-gs-pad" dir="ltr">
          <button type="button" aria-label={words.left} onPointerDown={hold("left", true)} onPointerUp={hold("left", false)} onPointerLeave={hold("left", false)}>◀</button>
          {needsUpDown ? <button type="button" aria-label={words.up} onPointerDown={hold("up", true)} onPointerUp={hold("up", false)} onPointerLeave={hold("up", false)}>▲</button> : null}
          {needsUpDown ? <button type="button" aria-label={words.down} onPointerDown={hold("down", true)} onPointerUp={hold("down", false)} onPointerLeave={hold("down", false)}>▼</button> : null}
          <button type="button" aria-label={words.right} onPointerDown={hold("right", true)} onPointerUp={hold("right", false)} onPointerLeave={hold("right", false)}>▶</button>
          {needsJump ? <button type="button" className="pt-gs-jump" aria-label={words.jump} onPointerDown={hold("jump", true)} onPointerUp={hold("jump", false)} onPointerLeave={hold("jump", false)}>⤒</button> : null}
        </div>
      ) : null}
    </div>
  );
}
