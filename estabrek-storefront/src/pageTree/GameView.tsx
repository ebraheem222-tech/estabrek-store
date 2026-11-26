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
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import type * as T from "three";
import { saveWonCoupon } from "../lib/wonCoupon";
import { NO_INPUT, STEP, newGame, startGame, stepGame, timeLeft, type Body, type GameInput, type GameState, type Phase } from "./gameEngine";
import type { GameLook, GameSpec } from "./gameSpec";
import type { GameWords as PrizeWords } from "./proWords";
import { Prize } from "./ShopGames";

export type StageWords = { start: string; again: string; win: string; lose: string; score: string; lives: string; time: string; sound: string; left: string; right: string; up: string; down: string; jump: string; paused: string };

const inEditor = () => typeof window !== "undefined" && window.parent !== window && /\/studio-frame/.test(window.location.pathname);
const lessMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
const keyOf = (id: string) => `estabrek_game_stage_${id}`;
const wonBefore = (id: string) => { try { return window.localStorage.getItem(keyOf(id)) === "won"; } catch { return false; } };
const markWon = (id: string) => { try { window.localStorage.setItem(keyOf(id), "won"); } catch { /* the prize still shows */ } };
const KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter"]);
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

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

/* ---------------------------------------------------------------- looks */

/** A CSS colour (a theme's variable or a hex) as the browser reads it here. */
function cssColour(probe: HTMLElement, value: string): string {
  probe.style.color = "";
  probe.style.color = value;
  return getComputedStyle(probe).color || "#888";
}
function lookCanvas(look: GameLook, w: number, h: number, fill: string, font: string, rtl: boolean, onPicture: (c: HTMLCanvasElement) => void): HTMLCanvasElement {
  const scale = Math.min(4, Math.max(1, 256 / Math.max(w, h)));
  const c = document.createElement("canvas");
  c.width = Math.max(4, Math.round(w * scale));
  c.height = Math.max(4, Math.round(h * scale));
  const x = c.getContext("2d")!;
  const box = () => { x.fillStyle = fill; x.fillRect(0, 0, c.width, c.height); };
  if (look.kind === "circle") { x.fillStyle = fill; x.beginPath(); x.ellipse(c.width / 2, c.height / 2, c.width / 2, c.height / 2, 0, 0, Math.PI * 2); x.fill(); }
  else if (look.kind === "emoji" || look.kind === "text") {
    const text = look.kind === "emoji" ? look.emoji ?? "⭐" : look.text ?? "";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.direction = rtl ? "rtl" : "ltr";
    x.fillStyle = fill;
    let size = Math.min(c.width, c.height) * (look.kind === "emoji" ? 0.86 : 0.7);
    x.font = `${look.kind === "emoji" ? 400 : 700} ${size}px ${look.kind === "emoji" ? EMOJI_FONT : font}`;
    // Long words shrink to the thing's width.
    const fit = x.measureText(text).width;
    if (fit > c.width * 0.96) { size *= (c.width * 0.96) / fit; x.font = `${look.kind === "emoji" ? 400 : 700} ${size}px ${look.kind === "emoji" ? EMOJI_FONT : font}`; }
    x.fillText(text, c.width / 2, c.height / 2 + size * 0.04);
  } else if (look.kind === "image" && look.src) {
    box();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Covering its box, as a picture on the page does.
      const r = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
      const iw = img.naturalWidth * r, ih = img.naturalHeight * r;
      x.clearRect(0, 0, c.width, c.height);
      try { x.drawImage(img, (c.width - iw) / 2, (c.height - ih) / 2, iw, ih); onPicture(c); } catch { box(); }
    };
    img.src = look.src;
  } else box();
  return c;
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

type Hud = { phase: Phase; score: number; lives: number; time: number | null };

export function GameView({ id, spec, colours, words, prizeWords, rtl }: GameViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameState | null>(null);
  const input = useRef<GameInput>({ ...NO_INPUT, pressed: [], taps: [] });
  const [hud, setHud] = useState<Hud>({ phase: "ready", score: 0, lives: spec.lives, time: spec.time || null });
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
  const needsArrows = controls.has("leftRight") || controls.has("platform") || controls.has("fourWay");
  const needsUpDown = controls.has("fourWay");
  const needsJump = controls.has("platform");

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
    void import("three").then((THREE) => {
      if (stop) return;
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
      type Spark = { m: T.Mesh; vx: number; vy: number; life: number };
      const sparks: Spark[] = [];
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
          if (!m) {
            m = new THREE.Mesh(square, new THREE.MeshBasicMaterial({ map: textureOf(b), transparent: true, side: THREE.DoubleSide }));
            scene.add(m);
            meshes.set(b.n, m);
          }
          m.position.set(b.x, b.y, i * 0.001);
          m.scale.set(b.w, b.h, 1);
          m.rotation.z = b.rot;
        });
        for (const [n, m] of meshes) if (!alive.has(n)) { scene.remove(m); (m.material as T.Material).dispose(); meshes.delete(n); }
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
          }
        }
        const shake = s.shake > 0 && !lessMotion() ? 8 * (s.shake / 0.3) : 0;
        camera.position.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 5);
        renderer.render(scene, camera);
      };

      let last = performance.now(), acc = 0, shown = "", wasResting = false;
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
        const next: Hud = { phase: s.phase, score: s.score, lives: s.lives, time: timeLeft(s) };
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
        square.dispose();
        renderer.dispose();
        probe.remove();
      };
    });
    return () => { stop = true; cleanup(); };
  }, [spec, colours, rtl]);

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
      if (k === "ArrowDown") i.down = true;
      if (!e.repeat) i.pressed.push(k);
    };
    const up = (e: KeyboardEvent) => {
      const k = name(e), i = input.current;
      if (k === "ArrowLeft") i.left = false;
      if (k === "ArrowRight") i.right = false;
      if (k === "ArrowUp") i.up = false;
      if (k === "ArrowDown") i.down = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); Object.assign(input.current, { left: false, right: false, up: false, down: false }); };
  }, [hud.phase]);

  /* ---- the pointer on the stage, in the world's units */
  const toWorld = (e: RPointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * spec.w, y: ((e.clientY - r.top) / r.height) * spec.h };
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
    const s = game.current!;
    startGame(s);
    setSaved(false);
    setHud({ phase: s.phase, score: s.score, lives: s.lives, time: timeLeft(s) });
    if (soundRef.current) beep("click");
    host.current?.focus({ preventScroll: true });
  }, []);

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
    if (k === "jump") { if (on) i.pressed.push("Space"); return; }
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
      {playing || hud.phase !== "ready" ? (
        <div className="pt-gs-hud" aria-live="polite">
          <span data-pt-game-hud="score">{words.score}: <b>{hud.score}</b></span>
          {spec.lives ? <span data-pt-game-hud="lives" aria-label={`${words.lives}: ${hud.lives}`}>{"❤".repeat(Math.max(0, hud.lives)) || "—"}</span> : null}
          {hud.time !== null ? <span data-pt-game-hud="time">{words.time}: <b>{hud.time}</b></span> : null}
          <button type="button" className="pt-gs-sound" onClick={() => setSound((x) => !x)} aria-pressed={sound} aria-label={words.sound}>{sound ? "🔊" : "🔇"}</button>
        </div>
      ) : null}
      {paused ? <div className="pt-gs-paused">{words.paused}</div> : null}
      {hud.phase === "ready" ? (
        <div className="pt-gs-screen">
          {spec.words.title ? <div className="pt-gs-title" data-pt-field="title">{spec.words.title}</div> : null}
          {spec.words.help ? <p className="pt-gs-help" data-pt-field="help">{spec.words.help}</p> : null}
          <button type="button" className="pt-gs-go" onClick={play} disabled={editor} data-pt-game-start="">{spec.words.start || words.start}</button>
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
          {needsJump ? <button type="button" className="pt-gs-jump" aria-label={words.jump} onPointerDown={hold("jump", true)}>⤒</button> : null}
        </div>
      ) : null}
    </div>
  );
}
