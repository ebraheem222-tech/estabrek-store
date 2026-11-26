/**
 * The game editor (G0b of docs/game-engine-plan.ar.md), opened from the game stage's panel: the game's world drawn
 * big, its things dragged into place and their corners pulled to size; a thing's settings (its look, body, control,
 * behaviour, speeds, tags); the rules built from menus ("when … → do …"); the world's size, edges and gravity; and
 * «جرّبها» to play it right here (the shop's own engine, drawn on a 2D canvas with the shop's pictures of things).
 * G1: the tile map (its size, its kinds of tile, a brush to paint them and a rubber), a world wider than the view
 * (scrolled across), the camera and the layers behind, and a thing drawn from a sprite sheet with its states' frames.
 * G1b: levels (one map each, picked to paint, added as a copy, removed), a maze made by itself (its walls shown as
 * they'll be played), the cover between levels, a thing's sight and its path (points put and dragged in the world),
 * the new brains and rules (sees, a level begins, next level, this level again); trying it shows the level and cover.
 * Each change is one change of the page's draft (Undo takes it back); a drag is one change, made when it ends.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { Modal } from "../components/ui/Modal";
import { MediaLibraryModal } from "../components/media/MediaLibraryModal";
import type { Lang } from "../lib/lang";
import { gameOf, type GameLook } from "../../../estabrek-storefront/src/pageTree/gameSpec";
import { NO_INPUT, STEP, coverOf, levelCount, levelMap, newGame, startGame, stepGame, timeLeft, type GameInput, type GameState } from "../../../estabrek-storefront/src/pageTree/gameEngine";
import { drawCover, lookCanvas, sheetFrame } from "../../../estabrek-storefront/src/pageTree/gameDraw";
import type { ThumbColours } from "./templates/colours";
import {
  ACT_NAMES, BEHAVE_NAMES, BODY_NAMES, CONTROL_NAMES, EDGE_NAMES, KEY_NAMES, LOOK_STARTS, SIZES, SOUND_NAMES, SPOT_NAMES, WHEN_NAMES,
  actPossible, newAct, newWhen, ruleText, rulesOf, templatesOf, thingsOf, whoOptions, withNewThing, withoutThing, type Obj,
  nextTileChar, paintCells, withTiles, withoutTileKind, worldSize,
  TRANSITION_NAMES, levelMaps, pathPoints, resizedLevels, withLevelMap, withNewLevel, withPathPoint, withoutLevel,
} from "./gameEdit";
import { say } from "./say";

const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const ctl = "rounded-md border border-white/10 bg-surface-925 px-1.5 py-1 text-[11px] text-white";
const btn = "rounded-lg bg-white/6 px-2 py-1 text-[11px] text-white/80 hover:bg-white/10 disabled:opacity-40";
const main = "rounded-lg bg-accent-500 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-accent-400 disabled:opacity-40";
const COLOUR_TOKENS = ["accent", "accent-soft", "text", "muted", "bg", "surface", "border", "deep", "white", "black"] as const;
const TAG = /^[a-z][a-z0-9-]{0,15}$/;

/** The theme's colours, and the few names the thumbnails' palette doesn't carry. */
function palette(c: ThumbColours): Record<string, string> {
  return { ...c, deep: c.text, "on-deep": c.bg, "deep-pop": c.accent, white: "#ffffff", black: "#000000", transparent: "transparent" };
}

/** A select whose options are [value, words] pairs. */
function Choose<T extends string>({ value, options, onPick, label, testId, disabled }: { value: string; options: ReadonlyArray<readonly [T, string]>; onPick: (v: T) => void; label: string; testId?: string; disabled?: boolean }) {
  return (
    <select className={ctl} value={value} aria-label={label} disabled={disabled} onChange={(e) => onPick(e.target.value as T)} data-testid={testId}>
      {options.map(([v, w]) => <option key={v} value={v}>{w}</option>)}
    </select>
  );
}
const named = <K extends string>(names: Record<K, string>) => (Object.keys(names) as K[]).map((k) => [k, say(names[k])] as const);
/** A number box, kept on leaving it or on Enter. */
function Num({ value, onSave, label, min, max, step = 1, testId }: { value: number; onSave: (v: number) => void; label: string; min: number; max: number; step?: number; testId?: string }) {
  const [v, setV] = useState(String(value));
  const [was, setWas] = useState(value);
  if (was !== value) { setWas(value); setV(String(value)); }
  const save = () => { const n = Number(v); if (Number.isFinite(n)) onSave(Math.min(max, Math.max(min, n))); else setV(String(value)); };
  return (
    <label className="flex items-center justify-between gap-2 text-[11px] text-white/60">
      <span>{label}</span>
      <input type="number" className={`${ctl} w-20`} value={v} min={min} max={max} step={step} onChange={(e) => setV(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && save()} data-testid={testId} />
    </label>
  );
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex items-center justify-between gap-2 text-[11px] text-white/60"><span>{label}</span>{children}</label>;
}

/** A thing as the editor shows it: its emoji or words on an SVG that fits its box, its shape, or its picture. */
function LookView({ look, colours, lang }: { look: Obj; colours: Record<string, string>; lang: Lang }) {
  const fill = colours[String(look.color ?? "accent")] ?? String(look.color ?? "#888");
  if (look.kind === "image" && typeof look.src === "string") return <img src={look.src} alt="" draggable={false} className="h-full w-full object-cover" />;
  if (look.kind === "emoji" || look.kind === "text") {
    const words = look.kind === "emoji" ? String(look.emoji ?? "⭐") : String(obj(look.text)[lang] ?? obj(look.text).ar ?? obj(look.text).en ?? "");
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <text x="50" y="54" textAnchor="middle" dominantBaseline="middle" fontSize={look.kind === "emoji" ? 84 : 46} fontWeight={700} fill={fill}>{words}</text>
      </svg>
    );
  }
  return <div className="h-full w-full" style={{ background: fill, borderRadius: look.kind === "circle" ? "50%" : 2 }} />;
}

type Drag = { id: string; mode: "move" | "size"; px: number; py: number; x: number; y: number; w: number; h: number };
type PointDrag = { i: number; px: number; py: number; x: number; y: number };

export function GameEditor({ open, onClose, game, lang, colours, busy, onChange }: {
  open: boolean; onClose: () => void; game: Obj; lang: Lang; colours: ThumbColours; busy: boolean;
  onChange: (label: string, next: Obj) => void;
}) {
  const pal = useMemo(() => palette(colours), [colours]);
  const W = num(game.w, 960), H = num(game.h, 540);
  const [WW, WH] = worldSize(game);
  const tiles = obj(game.tiles);
  const hasTiles = Object.keys(tiles).length > 0;
  const things = thingsOf(game);
  const [tab, setTab] = useState<"things" | "tiles" | "camera">("things");
  const [brush, setBrush] = useState("#");
  const [stroke, setStroke] = useState<string[] | null>(null);
  const rules = rulesOf(game);
  const [sel, setSel] = useState<string | null>(things.find((t) => !t.template)?.id as string ?? null);
  const [rule, setRule] = useState(0);
  const [trying, setTrying] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [picking, setPicking] = useState<null | "image" | "sprite">(null);
  const stage = useRef<HTMLDivElement>(null);
  const thing = things.find((t) => t.id === sel) ?? null;
  // G1b: the level painted and shown; a thing's path being drawn.
  const [level, setLevel] = useState(0);
  const maps = levelMaps(game);
  const lv = Math.min(level, Math.max(0, maps.length - 1));
  const drawn = maps[lv] ?? [];
  // Putting points on the path of the thing picked (another thing picked: no longer).
  const [pathFor, setPathFor] = useState<string | null>(null);
  const pathAdd = pathFor !== null && pathFor === sel;
  const setPathAdd = (on: boolean) => setPathFor(on ? sel : null);
  const [pointDrag, setPointDrag] = useState<PointDrag | null>(null);
  const [pointAt, setPointAt] = useState<[number, number] | null>(null);
  // A maze's walls as they'll be played, the marks where they're drawn.
  const solidCh = (ch: string) => obj(obj(tiles.kinds)[ch]).solid === true;
  const walls = useMemo(() => {
    if (obj(game.tiles).gen !== "maze") return null;
    const read = gameOf(game);
    return read ? levelMap(read, lv) : null;
  }, [game, lv]);
  const shown = (m: string[]) => (walls ? walls.map((row, r) => [...row].map((ch, c) => { const d = m[r]?.[c] ?? "."; return d !== "." && !solidCh(d) ? d : solidCh(ch) ? ch : "."; }).join("")) : m);

  const setThing = (id: string, change: Obj, label = say("تعديل شي|A thing changed|פריט שונה")) =>
    onChange(label, { ...game, things: things.map((t) => (t.id === id ? { ...t, ...change } : t)) });
  const setRules = (next: Obj[], label = say("القواعد|The rules|הכללים")) => onChange(label, { ...game, rules: next });
  const setRuleAt = (i: number, r: Obj) => setRules(rules.map((x, j) => (j === i ? r : x)));

  /* ---- dragging a thing, or its corner, in the world's units */
  const scale = () => { const r = stage.current!.getBoundingClientRect(); return { sx: WW / r.width, sy: WH / r.height }; };
  const startDrag = (t: Obj, mode: Drag["mode"]) => (e: RPointerEvent) => {
    if (busy || trying) return;
    e.stopPropagation();
    e.preventDefault();
    setSel(String(t.id));
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag({ id: String(t.id), mode, px: e.clientX, py: e.clientY, x: num(t.x, 0), y: num(t.y, 0), w: num(t.w, 48), h: num(t.h, 48) });
  };
  const [moved, setMoved] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const onMove = (e: RPointerEvent) => {
    if (pointDrag) { const { sx, sy } = scale(); setPointAt([Math.round(pointDrag.x + (e.clientX - pointDrag.px) * sx), Math.round(pointDrag.y + (e.clientY - pointDrag.py) * sy)]); return; }
    if (!drag) return;
    const { sx, sy } = scale();
    const dx = (e.clientX - drag.px) * sx, dy = (e.clientY - drag.py) * sy;
    setMoved(drag.mode === "move"
      ? { x: Math.round(Math.min(WW, Math.max(0, drag.x + dx))), y: Math.round(Math.min(WH, Math.max(0, drag.y + dy))), w: drag.w, h: drag.h }
      : { x: drag.x, y: drag.y, w: Math.round(Math.max(8, drag.w + dx * 2)), h: Math.round(Math.max(8, drag.h + dy * 2)) });
  };
  /* ---- painting tiles: a stroke is one change, made when it ends */
  const painting = tab === "tiles" && hasTiles && !trying;
  const cellAt = (e: RPointerEvent): [number, number] | null => {
    const r = stage.current!.getBoundingClientRect();
    const z = num(tiles.size, 48);
    const c = Math.floor((((e.clientX - r.left) / r.width) * WW) / z), row = Math.floor((((e.clientY - r.top) / r.height) * WH) / z);
    return c >= 0 && row >= 0 && c < num(tiles.cols, 0) && row < num(tiles.rows, 0) ? [c, row] : null;
  };
  const paintAt = (e: RPointerEvent, from: string[]) => { const cell = cellAt(e); setStroke(cell ? paintCells(from, [cell], brush) : from); };
  const startPaint = (e: RPointerEvent) => {
    if (!painting || busy) return false;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    paintAt(e, drawn);
    return true;
  };
  /* ---- a path's points: one put where the world is clicked, one dragged */
  const startPoint = (i: number) => (e: RPointerEvent) => {
    if (busy || trying || !thing) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = pathPoints(thing)[i];
    setPointDrag({ i, px: e.clientX, py: e.clientY, x: num(thing.x, 0) + p[0], y: num(thing.y, 0) + p[1] });
  };
  const addPoint = (e: RPointerEvent) => {
    if (!pathAdd || !thing || thing.behave !== "path" || busy) return false;
    const r = stage.current!.getBoundingClientRect();
    setThing(String(thing.id), { path: withPathPoint(thing, ((e.clientX - r.left) / r.width) * WW, ((e.clientY - r.top) / r.height) * WH) }, say("نقطة جديدة بالمسار|A new path point|נקודת מסלול חדשה"));
    return true;
  };
  const endDrag = () => {
    if (pointDrag) {
      if (pointAt && thing) setThing(String(thing.id), { path: withPathPoint(thing, pointAt[0], pointAt[1], pointDrag.i) }, say("نقلت نقطة بالمسار|A path point moved|נקודת מסלול הוזזה"));
      setPointDrag(null);
      setPointAt(null);
      return;
    }
    if (stroke) { onChange(brush === "." ? say("محيت بلاط|Tiles rubbed out|אריחים נמחקו") : say("رسمت بلاط|Tiles painted|אריחים צוירו"), withLevelMap(game, lv, stroke)); setStroke(null); return; }
    if (drag && moved) setThing(drag.id, moved, drag.mode === "move" ? say("نقلت شي|A thing moved|פריט הוזז") : say("كبّرت شي|A thing resized|פריט שונה בגודל"));
    setDrag(null);
    setMoved(null);
  };

  const addThing = (look: Obj, base: string) => {
    const made = withNewThing(game, look, base);
    if (!made) return;
    onChange(say("شي جديد|A new thing|פריט חדש"), made.game);
    setSel(made.id);
  };
  const removeThing = (id: string) => {
    onChange(say("محيت شي|A thing removed|פריט הוסר"), withoutThing(game, id));
    setSel(null);
  };
  // The view's size; on a tile map the world keeps its own (the camera shows a part of it).
  const resize = (w: number, h: number) => onChange(say("حجم العالم|The world's size|גודל העולם"), hasTiles ? { ...game, w, h } : {
    ...game, w, h, things: things.map((t) => ({ ...t, x: Math.round(num(t.x, 0) * (w / W)), y: Math.round(num(t.y, 0) * (h / H)) })),
  });

  const whos = whoOptions(game);
  // The picked thing's path, from where it is: [its place, each point].
  const selPath: Array<[number, number]> | null = thing && thing.behave === "path" ? (() => {
    const at = drag?.id === thing.id && moved ? moved : { x: num(thing.x, 0), y: num(thing.y, 0) };
    return [[at.x, at.y] as [number, number], ...pathPoints(thing).map((p, j): [number, number] => (pointDrag?.i === j && pointAt ? pointAt : [at.x + p[0], at.y + p[1]]))];
  })() : null;
  const tplOptions = templatesOf(game).map((t) => [String(t.id), String(t.id)] as const);
  const r = rules[Math.min(rule, Math.max(0, rules.length - 1))];

  return (
    <Modal open={open} onClose={onClose} title={say("🎮 محرّر اللعبة|🎮 The game editor|🎮 עורך המשחק")} widthClassName="max-w-7xl">
      <div className="space-y-2" data-testid="game-editor">
        {/* The world: its size, edges, gravity, ground; and trying it. */}
        <div className="flex flex-wrap items-center gap-2">
          <Choose label={say("حجم العالم|The world's size|גודל העולם")} value={`${W}x${H}`} options={[...SIZES.map(([w, h, l]) => [`${w}x${h}`, say(l)] as const), ...(SIZES.some(([w, h]) => w === W && h === H) ? [] : [[`${W}x${H}`, `${W}×${H}`] as const])]} onPick={(v) => { const [w, h] = v.split("x").map(Number); if (w && h) resize(w, h); }} testId="game-ed-size" disabled={busy || trying} />
          <Choose label={say("حدود العالم|The world's edges|גבולות העולם")} value={String(game.edges ?? "walls")} options={named(EDGE_NAMES)} onPick={(v) => onChange(say("الحدود|The edges|הגבולות"), { ...game, edges: v })} testId="game-ed-edges" disabled={busy || trying} />
          <Num label={say("الجاذبية|Gravity|כוח משיכה")} value={num(game.gravity, 0)} min={0} max={4000} step={100} onSave={(v) => onChange(say("الجاذبية|Gravity|כוח משיכה"), { ...game, gravity: v })} testId="game-ed-gravity" />
          <Choose label={say("الأرضية|The ground|הרקע")} value={String(game.bg ?? "surface")} options={COLOUR_TOKENS.map((c) => [c, c] as const)} onPick={(v) => onChange(say("الأرضية|The ground|הרקע"), { ...game, bg: v })} testId="game-ed-bg" disabled={busy || trying} />
          <span className="flex-1" />
          <button type="button" className={trying ? btn : main} onClick={() => setTrying((x) => !x)} data-testid="game-ed-try">{trying ? say("■ ارجع للتعديل|■ Back to editing|■ חזרה לעריכה") : say("▶ جرّبها|▶ Try it|▶ נסו")}</button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
          {/* Things: add one, pick one, its settings. The tile map. The camera and the layers behind. */}
          <div className="max-h-[62vh] space-y-2 overflow-y-auto pe-1">
            <div className="flex gap-1 rounded-lg bg-white/4 p-0.5" role="tablist">
              {([["things", say("الأشياء|Things|פריטים")], ["tiles", say("البلاط|Tiles|אריחים")], ["camera", say("الكاميرا والخلفية|Camera and back|מצלמה ורקע")]] as const).map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 rounded-md px-1.5 py-1 text-[11px] ${tab === k ? "bg-accent-500/30 text-white" : "text-white/60"}`} data-testid="game-ed-tab" data-tab={k}>{l}</button>
              ))}
            </div>
            {tab === "tiles" ? <TilesPanel game={game} brush={brush} setBrush={setBrush} level={lv} setLevel={setLevel} busy={busy || trying} colours={pal} lang={lang} onChange={onChange} /> : null}
            {tab === "camera" ? <CameraPanel game={game} busy={busy || trying} whos={whos} onChange={onChange} /> : null}
            {tab === "things" ? <>
            <div className="text-[11px] font-medium text-white/60">{say("ضيف شي|Add a thing|הוסיפו פריט")}</div>
            <div className="flex flex-wrap gap-1">
              {LOOK_STARTS.map(([key, label, look]) => <button key={key} type="button" className={btn} disabled={busy || trying} onClick={() => addThing(look, key === "emoji" ? "star" : key)} data-testid="game-ed-add" data-look={key}>+ {say(label)}</button>)}
            </div>
            <div className="flex flex-wrap gap-1" role="listbox" aria-label={say("الأشياء|The things|הפריטים")}>
              {things.map((t) => (
                <button key={String(t.id)} type="button" role="option" aria-selected={t.id === sel} onClick={() => setSel(String(t.id))} className={`rounded-full border px-2 py-0.5 text-[11px] ${t.id === sel ? "border-accent-400 bg-accent-500/20 text-white" : "border-white/12 text-white/65"}`} data-testid="game-ed-pick" data-thing={String(t.id)}>
                  {obj(t.look).kind === "emoji" ? `${String(obj(t.look).emoji ?? "")} ` : ""}{String(t.id)}{t.template ? " ✦" : ""}
                </button>
              ))}
            </div>
            {thing ? <ThingSettings key={String(thing.id)} thing={thing} lang={lang} busy={busy || trying} set={(c, l) => setThing(String(thing.id), c, l)} onRemove={() => removeThing(String(thing.id))} onPicture={(kind) => setPicking(kind)} pathAdd={pathAdd} setPathAdd={setPathAdd} /> : <p className="text-[11px] text-white/40">{say("اختار شي لتعدّله، أو اسحبه بالعالم.|Choose a thing to change it, or drag it in the world.|בחרו פריט כדי לשנות אותו, או גררו אותו בעולם.")}</p>}
            </> : null}
          </div>

          {/* The world, or the game played. */}
          <div className="space-y-2">
            {trying ? <GameTry game={game} colours={pal} lang={lang} /> : (
              <>
                <div className="w-full overflow-x-auto rounded-xl" data-testid="game-ed-scroll">
                <div ref={stage} className={`relative touch-none select-none overflow-hidden ${painting ? "cursor-crosshair" : ""}`} style={{ width: `${(WW / W) * 100}%`, aspectRatio: `${WW} / ${WH}`, background: pal[String(game.bg ?? "surface")] ?? "#eee" }}
                  onPointerMove={(e) => { if (stroke) paintAt(e, stroke); else onMove(e); }} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerDown={(e) => { if (addPoint(e)) return; if (!startPaint(e)) setSel(null); }} data-testid="game-ed-world">
                  {hasTiles ? <TilesCanvas tiles={tiles} map={shown(stroke ?? drawn)} ww={WW} wh={WH} colours={pal} lang={lang} /> : null}
                  {things.filter((t) => !t.template).map((t) => {
                    const id = String(t.id);
                    const m = drag?.id === id && moved ? moved : { x: num(t.x, 0), y: num(t.y, 0), w: num(t.w, 48), h: num(t.h, 48) };
                    return (
                      <div key={id} className={`absolute cursor-move ${painting ? "pointer-events-none opacity-70" : ""} ${id === sel ? "outline outline-2 outline-accent-400" : "hover:outline hover:outline-1 hover:outline-white/50"}`}
                        style={{ left: `${((m.x - m.w / 2) / WW) * 100}%`, top: `${((m.y - m.h / 2) / WH) * 100}%`, width: `${(m.w / WW) * 100}%`, height: `${(m.h / WH) * 100}%` }}
                        onPointerDown={startDrag(t, "move")} data-testid="game-ed-thing" data-thing={id}>
                        <LookView look={obj(t.look)} colours={pal} lang={lang} />
                        {id === sel ? <span className="absolute -bottom-1.5 -end-1.5 h-3 w-3 cursor-nwse-resize rounded-sm bg-accent-400" onPointerDown={startDrag(t, "size")} data-testid="game-ed-size-handle" /> : null}
                      </div>
                    );
                  })}
                  {selPath ? (
                    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${WW} ${WH}`} preserveAspectRatio="none" data-testid="game-ed-path-line">
                      <polyline points={(obj(thing?.path).loop ? [...selPath, selPath[0]] : selPath).map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="#a78bfa" strokeWidth={3} strokeDasharray="8 6" vectorEffect="non-scaling-stroke" />
                    </svg>
                  ) : null}
                  {selPath ? selPath.slice(1).map(([x, y], i) => (
                    <span key={i} className="absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full border-2 border-white bg-violet-400" style={{ left: `${(x / WW) * 100}%`, top: `${(y / WH) * 100}%` }} onPointerDown={startPoint(i)} data-testid="game-ed-path-point" />
                  )) : null}
                </div>
                </div>
                {templatesOf(game).length ? (
                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-white/50">
                    <span>{say("✦ بيطلعوا بالقواعد:|✦ Made by the rules:|✦ נוצרים בכללים:")}</span>
                    {templatesOf(game).map((t) => <button key={String(t.id)} type="button" onClick={() => setSel(String(t.id))} className="h-9 w-9 overflow-hidden rounded-md bg-white/6 p-1" title={String(t.id)} data-testid="game-ed-template"><LookView look={obj(t.look)} colours={pal} lang={lang} /></button>)}
                  </div>
                ) : null}
              </>
            )}
          </div>

          {/* The rules: one picked to build, the rest as sentences. */}
          <div className="max-h-[62vh] space-y-2 overflow-y-auto pe-1" data-testid="game-ed-rules">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-white/60">{say("القواعد|The rules|הכללים")}</span>
              <button type="button" className={btn} disabled={busy || trying || rules.length >= 40} onClick={() => { setRules([...rules, { when: { on: "start" }, do: [{ act: "score", add: 1 }] }], say("قاعدة جديدة|A new rule|כלל חדש")); setRule(rules.length); }} data-testid="game-ed-rule-add">+ {say("قاعدة|Rule|כלל")}</button>
            </div>
            <ul className="space-y-1">
              {rules.map((x, i) => (
                <li key={i}>
                  <button type="button" onClick={() => setRule(i)} className={`w-full rounded-lg border px-2 py-1 text-start text-[11px] leading-4 ${i === rule ? "border-accent-400/60 bg-accent-500/10 text-white" : "border-white/8 text-white/65"}`} data-testid="game-ed-rule" data-rule={i}>{ruleText(x)}</button>
                </li>
              ))}
            </ul>
            {r ? <RuleBuilder key={rule} rule={r} game={game} whos={whos} templates={tplOptions} busy={busy || trying} set={(next) => setRuleAt(rule, next)} onRemove={() => { setRules(rules.filter((_, j) => j !== rule), say("محيت قاعدة|A rule removed|כלל הוסר")); setRule(Math.max(0, rule - 1)); }} /> : null}
          </div>
        </div>
      </div>
      <MediaLibraryModal open={picking !== null} onClose={() => setPicking(null)} title={picking === "sprite" ? say("صورة الحركات|The sprite sheet|גיליון הספרייטים") : say("صورة الشي|The thing's picture|תמונת הפריט")} onSelect={(u) => {
        const kind = picking;
        setPicking(null);
        if (!thing) return;
        const look = obj(thing.look);
        setThing(String(thing.id), { look: kind === "sprite" ? { ...look, kind: "sprite", src: u, sheet: obj(look.sheet).cols ? look.sheet : { cols: 4, rows: 1, fps: 10, anims: { idle: [0, 1], run: [0, 4] } } } : { ...look, kind: "image", src: u } });
      }} />
    </Modal>
  );
}

/* ---------------------------------------------------------------- a thing's settings */

function ThingSettings({ thing, lang, busy, set, onRemove, onPicture, pathAdd, setPathAdd }: { thing: Obj; lang: Lang; busy: boolean; set: (change: Obj, label?: string) => void; onRemove: () => void; onPicture: (kind: "image" | "sprite") => void; pathAdd: boolean; setPathAdd: (on: boolean) => void }) {
  const look = obj(thing.look);
  const setLook = (c: Obj) => set({ look: { ...look, ...c } }, say("شكل الشي|A thing's look|מראה הפריט"));
  const tags = (Array.isArray(thing.tags) ? thing.tags : []).map(String).join(", ");
  const [tagText, setTagText] = useState(tags);
  return (
    <div className="space-y-1.5 rounded-lg bg-white/4 p-2" data-testid="game-ed-thing-settings">
      <div className="flex items-center justify-between text-[11px] text-white/75"><b>{String(thing.id)}</b><button type="button" className="text-red-300 hover:text-red-200" disabled={busy} onClick={onRemove} data-testid="game-ed-remove">{say("امحيه|Remove it|הסירו")}</button></div>
      <Row label={say("بيطلع بالقواعد بس ✦|Made by rules only ✦|נוצר רק בכללים ✦")}><input type="checkbox" checked={thing.template === true} disabled={busy} onChange={(e) => set({ template: e.target.checked || undefined })} data-testid="game-ed-template-box" /></Row>
      <Row label={say("شكله|Its look|המראה")}><Choose label={say("شكله|Its look|המראה")} value={String(look.kind ?? "box")} options={[["emoji", "⭐"], ["box", say("مربّع|Box|ריבוע")], ["circle", say("دائرة|Circle|עיגול")], ["image", say("صورة|Picture|תמונה")], ["sprite", say("صورة حركات|Sprite sheet|גיליון ספרייטים")], ["text", say("كلام|Words|מילים")]] as const} onPick={(k) => { if (k === "image" || k === "sprite") onPicture(k); else setLook({ kind: k, ...(k === "emoji" && !look.emoji ? { emoji: "⭐" } : {}), ...(k === "text" && !look.text ? { text: { [lang]: say("نص|Text|טקסט") } } : {}) }); }} disabled={busy} testId="game-ed-look" /></Row>
      {look.kind === "emoji" ? <Row label={say("الإيموجي|The emoji|האימוג'י")}><input className={`${ctl} w-20`} defaultValue={String(look.emoji ?? "")} maxLength={8} onBlur={(e) => e.target.value.trim() && setLook({ emoji: e.target.value.trim() })} data-testid="game-ed-emoji" /></Row> : null}
      {look.kind === "text" ? <Row label={say("الكلام|The words|המילים")}><input className={`${ctl} w-28`} defaultValue={String(obj(look.text)[lang] ?? "")} maxLength={40} onBlur={(e) => setLook({ text: { ...obj(look.text), [lang]: e.target.value.trim() } })} data-testid="game-ed-words" /></Row> : null}
      {look.kind === "sprite" ? <SheetSettings look={look} busy={busy} set={setLook} onPicture={() => onPicture("sprite")} /> : null}
      {look.kind !== "image" && look.kind !== "sprite" ? <Row label={say("لونه|Its colour|הצבע")}><Choose label={say("لونه|Its colour|הצבע")} value={String(look.color ?? "accent")} options={COLOUR_TOKENS.map((c) => [c, c] as const)} onPick={(c) => setLook({ color: c })} disabled={busy} testId="game-ed-colour" /></Row> : look.kind === "image" ? <button type="button" className={btn} disabled={busy} onClick={() => onPicture("image")}>{say("بدّل الصورة|Change the picture|החליפו תמונה")}</button> : null}
      <Row label={say("جسمه|Its body|הגוף")}><Choose label={say("جسمه|Its body|הגוף")} value={String(thing.body ?? "none")} options={named(BODY_NAMES)} onPick={(v) => set({ body: v })} disabled={busy} testId="game-ed-body" /></Row>
      <Row label={say("مين بيحرّكه|Who moves it|מי מזיז")}><Choose label={say("مين بيحرّكه|Who moves it|מי מזיז")} value={String(thing.control ?? "none")} options={named(CONTROL_NAMES)} onPick={(v) => set({ control: v })} disabled={busy} testId="game-ed-control" /></Row>
      <Row label={say("تصرّفه|Its behaviour|ההתנהגות")}><Choose label={say("تصرّفه|Its behaviour|ההתנהגות")} value={String(thing.behave ?? "none")} options={named(BEHAVE_NAMES)} onPick={(v) => set({ behave: v, ...(v === "path" && !pathPoints(thing).length ? { path: { points: [[200, 0]] } } : {}) })} disabled={busy} testId="game-ed-behave" /></Row>
      {thing.behave === "guard" || thing.behave === "flee" ? <Num label={say("قدّيش بيشوف|How far it sees|כמה רחוק הוא רואה")} value={num(thing.sight, 320)} min={0} max={3000} step={10} onSave={(v) => set({ sight: v })} testId="game-ed-sight" /> : null}
      {thing.behave === "path" ? <PathSettings thing={thing} busy={busy} set={set} pathAdd={pathAdd} setPathAdd={setPathAdd} /> : null}
      <Num label={say("سرعته|Its speed|המהירות")} value={num(thing.speed, 360)} min={0} max={2000} step={10} onSave={(v) => set({ speed: v })} testId="game-ed-speed" />
      {thing.control === "platform" ? <Num label={say("قوّة النط|Jump strength|כוח קפיצה")} value={num(thing.jump, 720)} min={0} max={3000} step={10} onSave={(v) => set({ jump: v })} /> : null}
      <Num label={say("سرعة البداية ↔|Starting speed ↔|מהירות התחלה ↔")} value={num(thing.vx, 0)} min={-3000} max={3000} step={10} onSave={(v) => set({ vx: v })} testId="game-ed-vx" />
      <Num label={say("سرعة البداية ↕|Starting speed ↕|מהירות התחלה ↕")} value={num(thing.vy, 0)} min={-3000} max={3000} step={10} onSave={(v) => set({ vy: v })} testId="game-ed-vy" />
      {thing.body === "dynamic" ? <Num label={say("الجاذبية عليه (×)|Gravity on it (×)|כוח משיכה עליו (×)")} value={num(thing.gravity, 1)} min={0} max={3} step={0.1} onSave={(v) => set({ gravity: v })} /> : null}
      <Num label={say("الارتداد (0–1)|Bounce (0–1)|קפיציות (0–1)")} value={num(thing.bounce, 0)} min={0} max={1} step={0.1} onSave={(v) => set({ bounce: v })} />
      <Num label={say("عمره بالثواني (0 = دايم)|Life in seconds (0 = for ever)|אורך חיים בשניות (0 = לתמיד)")} value={num(thing.life, 0)} min={0} max={120} step={0.1} onSave={(v) => set({ life: v || undefined })} />
      <Row label={say("صلب (بيوقّف الغير)|Solid (stops others)|מוצק (עוצר אחרים)")}><input type="checkbox" checked={thing.solid === true} disabled={busy} onChange={(e) => set({ solid: e.target.checked || undefined })} data-testid="game-ed-solid" /></Row>
      <Row label={say("بيضل جوّا العالم|Kept inside the world|נשאר בתוך העולם")}><input type="checkbox" checked={thing.keepIn === true} disabled={busy} onChange={(e) => set({ keepIn: e.target.checked || undefined })} /></Row>
      <Row label={say("علامات (بفاصلة)|Tags (comma)|תגיות (פסיק)")}>
        <input className={`${ctl} w-28`} value={tagText} onChange={(e) => setTagText(e.target.value)} onBlur={() => { const next = tagText.split(/[,،\s]+/).map((x) => x.trim().toLowerCase()).filter((x) => TAG.test(x)).slice(0, 4); setTagText(next.join(", ")); set({ tags: next.length ? next : undefined }); }} data-testid="game-ed-tags" />
      </Row>
    </div>
  );
}

/** A thing's path: points put in the world (and dragged there), the last taken off, a loop or there and back, smooth. */
function PathSettings({ thing, busy, set, pathAdd, setPathAdd }: { thing: Obj; busy: boolean; set: (change: Obj, label?: string) => void; pathAdd: boolean; setPathAdd: (on: boolean) => void }) {
  const path = obj(thing.path), pts = pathPoints(thing), n = pts.length;
  const label = say("مسار الشي|A thing's path|מסלול הפריט");
  return (
    <div className="space-y-1 rounded-md border border-white/8 p-1.5" data-testid="game-ed-path" data-points={n}>
      <div className="text-[11px] text-white/55">{say(`مساره: ${n} نقاط بعد مكانه، اسحبيها بالعالم|Its path: ${n} points after where it is, dragged in the world|המסלול: ${n} נקודות אחרי מקומו, גררו אותן בעולם`)}</div>
      <div className="flex flex-wrap gap-1">
        <button type="button" className={pathAdd ? main : btn} disabled={busy || n >= 12} onClick={() => setPathAdd(!pathAdd)} aria-pressed={pathAdd} data-testid="game-ed-path-add">{pathAdd ? say("✓ خلصت|✓ Done|✓ סיום") : say("+ نقطة بالعالم|+ A point in the world|+ נקודה בעולם")}</button>
        <button type="button" className={btn} disabled={busy || !n} onClick={() => set({ path: n > 1 ? { ...path, points: pts.slice(0, -1) } : undefined }, label)} data-testid="game-ed-path-pop">{say("شيل آخر نقطة|Take the last point off|הסירו את הנקודה האחרונה")}</button>
      </div>
      <Row label={say("بيلفّ ويرجع لأوله|Goes round to its start|חוזר להתחלה בלולאה")}><input type="checkbox" checked={path.loop === true} disabled={busy || !n} onChange={(e) => set({ path: { ...path, loop: e.target.checked || undefined } }, label)} data-testid="game-ed-path-loop" /></Row>
      <Row label={say("ناعم|Smooth|חלק")}><input type="checkbox" checked={path.smooth === true} disabled={busy || n < 2} onChange={(e) => set({ path: { ...path, smooth: e.target.checked || undefined } }, label)} data-testid="game-ed-path-smooth" /></Row>
    </div>
  );
}

/* ---------------------------------------------------------------- a rule */

function RuleBuilder({ rule, game, whos, templates, busy, set, onRemove }: {
  rule: Obj; game: Obj; whos: Array<[string, string]>; templates: ReadonlyArray<readonly [string, string]>; busy: boolean;
  set: (r: Obj) => void; onRemove: () => void;
}) {
  const when = obj(rule.when);
  const acts = (Array.isArray(rule.do) ? rule.do : []) as Obj[];
  const setWhen = (c: Obj) => set({ ...rule, when: { ...when, ...c } });
  const setAct = (i: number, c: Obj) => set({ ...rule, do: acts.map((a, j) => (j === i ? { ...a, ...c } : a)) });
  const who = (value: unknown, onPick: (v: string) => void, label: string, testId?: string) => <Choose label={label} value={String(value ?? "")} options={whos} onPick={onPick} disabled={busy} testId={testId} />;
  const actOptions = named(ACT_NAMES).filter(([k]) => actPossible(k, game));
  return (
    <div className="space-y-2 rounded-lg bg-white/4 p-2" data-testid="game-ed-rule-builder">
      <div className="space-y-1">
        <Choose label={say("لما|When|כאשר")} value={String(when.on ?? "start")} options={named(WHEN_NAMES)} onPick={(v) => set({ ...rule, when: newWhen(v, game) })} disabled={busy} testId="game-ed-when" />
        {when.on === "every" ? <Num label={say("كل (ثانية)|Every (seconds)|כל (שניות)")} value={num(when.seconds, 1)} min={0.2} max={60} step={0.1} onSave={(v) => setWhen({ seconds: v })} testId="game-ed-every" /> : null}
        {when.on === "hit" || when.on === "see" ? <div className="flex flex-wrap items-center gap-1 text-[11px] text-white/55">{who(when.a, (v) => setWhen({ a: v }), say("الأول|The first|הראשון"), "game-ed-hit-a")}<span>{when.on === "see" ? say("يشوف|sees|רואה") : say("يلمس|meets|פוגש")}</span>{who(when.b, (v) => setWhen({ b: v }), say("التاني|The second|השני"), "game-ed-hit-b")}</div> : null}
        {when.on === "level" ? <Num label={say("المرحلة (0 = كل وحدة)|The level (0 = each)|השלב (0 = כל אחד)")} value={num(when.at, 0)} min={0} max={8} onSave={(v) => setWhen({ at: Math.round(v) })} testId="game-ed-level-at" /> : null}
        {when.on === "out" || when.on === "tap" ? who(when.who, (v) => setWhen({ who: v }), say("مين|Which|מי"), "game-ed-who") : null}
        {when.on === "key" ? <Choose label={say("الزر|The key|המקש")} value={String(when.key ?? "Space")} options={named(KEY_NAMES)} onPick={(v) => setWhen({ key: v })} disabled={busy} /> : null}
        {when.on === "score" || when.on === "time" ? <Num label={when.on === "score" ? say("النقاط|The score|הניקוד") : say("الثانية|The second|השנייה")} value={num(when.at, 10)} min={when.on === "score" ? -9999 : 0} max={when.on === "score" ? 99999 : 600} onSave={(v) => setWhen({ at: v })} testId="game-ed-at" /> : null}
      </div>
      <div className="space-y-1">
        <div className="text-[11px] text-white/55">{say("اعمل:|Do:|עשו:")}</div>
        {acts.map((a, i) => (
          <div key={i} className="space-y-1 rounded-md border border-white/8 p-1.5" data-testid="game-ed-act">
            <div className="flex items-center gap-1">
              <Choose label={say("شو بيصير|What happens|מה קורה")} value={String(a.act)} options={actOptions} onPick={(v) => set({ ...rule, do: acts.map((x, j) => (j === i ? newAct(v, game) : x)) })} disabled={busy} testId="game-ed-act-kind" />
              <span className="flex-1" />
              <button type="button" className="text-[11px] text-white/40 hover:text-red-300" disabled={busy || acts.length <= 1} onClick={() => set({ ...rule, do: acts.filter((_, j) => j !== i) })} aria-label={say("امحي|Remove|הסירו")}>✕</button>
            </div>
            {a.act === "spawn" ? <div className="flex flex-wrap gap-1"><Choose label={say("من|Of|של")} value={String(a.what ?? "")} options={templates} onPick={(v) => setAct(i, { what: v })} disabled={busy} /><Choose label={say("وين|Where|איפה")} value={String(a.at ?? "top")} options={named(SPOT_NAMES)} onPick={(v) => setAct(i, { at: v })} disabled={busy} /></div> : null}
            {a.act === "destroy" ? <Choose label={say("مين|Which|מי")} value={String(a.who ?? "self")} options={[["self", say("الأول|The first|הראשון")], ["other", say("التاني|The second|השני")], ["both", say("التنين|Both|שניהם")]] as const} onPick={(v) => setAct(i, { who: v })} disabled={busy} /> : null}
            {a.act === "score" || a.act === "lives" ? <Num label={say("كم|How many|כמה")} value={num(a.add, 1)} min={a.act === "score" ? -999 : -9} max={a.act === "score" ? 999 : 9} onSave={(v) => setAct(i, { add: Math.round(v) })} testId="game-ed-add" /> : null}
            {a.act === "speed" ? <><Choose label={say("مين|Which|מי")} value={String(a.who ?? "self")} options={[["self", say("الأول|The first|הראשון")], ["other", say("التاني|The second|השני")]] as const} onPick={(v) => setAct(i, { who: v })} disabled={busy} /><Num label="↔" value={num(a.vx, 0)} min={-3000} max={3000} step={10} onSave={(v) => setAct(i, { vx: v })} /><Num label="↕" value={num(a.vy, 0)} min={-3000} max={3000} step={10} onSave={(v) => setAct(i, { vy: v })} /></> : null}
            {a.act === "faster" ? <Num label="×" value={num(a.by, 1.2)} min={0.5} max={2} step={0.05} onSave={(v) => setAct(i, { by: v })} /> : null}
            {a.act === "sound" ? <Choose label={say("الصوت|The sound|הצליל")} value={String(a.kind ?? "pop")} options={named(SOUND_NAMES)} onPick={(v) => setAct(i, { kind: v })} disabled={busy} /> : null}
            {a.act === "burst" ? <Choose label={say("وين|Where|איפה")} value={String(a.who ?? "self")} options={[["self", say("عند الأول|At the first|אצל הראשון")], ["other", say("عند التاني|At the second|אצל השני")]] as const} onPick={(v) => setAct(i, { who: v })} disabled={busy} /> : null}
          </div>
        ))}
        <div className="flex items-center gap-1">
          <Choose label={say("ضيف شو بيصير|Add what happens|הוסיפו מה קורה")} value="" options={[["", say("+ ضيف شو بيصير…|+ Add what happens…|+ הוסיפו מה קורה…")] as const, ...actOptions]} onPick={(v) => { if (v && acts.length < 8) set({ ...rule, do: [...acts, newAct(v as keyof typeof ACT_NAMES, game)] }); }} disabled={busy || acts.length >= 8} testId="game-ed-act-add" />
          <span className="flex-1" />
          <button type="button" className="text-[11px] text-red-300 hover:text-red-200" disabled={busy} onClick={onRemove} data-testid="game-ed-rule-remove">{say("امحي القاعدة|Remove the rule|הסירו את הכלל")}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- trying it */

/** The game played here: the shop's engine, drawn on a 2D canvas with the shop's pictures of things. */
function GameTry({ game, colours, lang }: { game: Obj; colours: Record<string, string>; lang: Lang }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef<GameState | null>(null);
  const input = useRef<GameInput>({ ...NO_INPUT, pressed: [], taps: [] });
  const [hud, setHud] = useState({ phase: "ready", score: 0, lives: 0, time: null as number | null, cam: 0, level: 1 });
  const spec = useMemo(() => gameOf(game, (t) => (t && typeof t === "object" ? String(obj(t)[lang] ?? obj(t).ar ?? obj(t).en ?? "") : "")), [game, lang]);

  useEffect(() => {
    if (!spec) return;
    const s = newGame(spec);
    state.current = s;
    const cv = canvas.current;
    const ctx = cv?.getContext?.("2d") ?? null;
    if (cv) { cv.width = spec.w; cv.height = spec.h; }
    const looks = new Map<string, HTMLCanvasElement>();
    const lookOf = (of: string, look: GameLook, w: number, h: number) => {
      let c = looks.get(of);
      if (!c) { c = lookCanvas(look, w, h, colours[look.color] ?? look.color, "sans-serif", lang !== "en", () => { tilesV = -1; }); looks.set(of, c); }
      return c;
    };
    // Pictures (sprite sheets, layers) loaded once.
    const pictures = new Map<string, HTMLImageElement>();
    const pictureOf = (src: string) => {
      let img = pictures.get(src);
      if (!img) { img = new Image(); img.crossOrigin = "anonymous"; img.src = src; pictures.set(src, img); }
      return img;
    };
    // The tile map drawn once on its own canvas (again when a rule takes a tile away).
    let tilesV = -1;
    const tileCanvas = spec.tiles ? document.createElement("canvas") : null;
    const drawTiles = () => {
      const t = spec.tiles, x = tileCanvas?.getContext?.("2d");
      if (!t || !tileCanvas || !x || !s.tiles) return;
      tileCanvas.width = spec.ww; tileCanvas.height = spec.wh;
      x.clearRect(0, 0, spec.ww, spec.wh);
      s.tiles.forEach((row, r) => row.forEach((ch, c) => { const k = t.kinds[ch]; if (k && !k.thing) x.drawImage(lookOf(`tile:${ch}`, k.look, t.size, t.size), c * t.size, r * t.size, t.size, t.size); }));
    };
    let frame = 0, last = performance.now(), acc = 0;
    const alerts: Array<{ x: number; y: number; t: number }> = [];
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (s.phase === "playing") {
        acc += dt;
        let n = 0;
        while (acc >= STEP && n < 5) {
          stepGame(s, input.current); input.current.pressed = []; input.current.taps = []; acc -= STEP; n++;
          for (const e of s.effects) if (e.kind === "alert") alerts.push({ x: e.x, y: e.y, t: s.t });
          s.effects.length = 0;
        }
      }
      if (ctx && cv) {
        ctx.fillStyle = colours[spec.bg] ?? spec.bg;
        ctx.fillRect(0, 0, spec.w, spec.h);
        // The layers behind: a colour, a gradient, or a picture repeated across at its share of the camera's speed.
        for (const l of spec.layers) {
          const y = spec.h * l.y, h = spec.h * l.h;
          if (l.kind === "image" && l.src) {
            const img = pictureOf(l.src);
            if (img.complete && img.naturalWidth) {
              const iw = img.naturalWidth * (h / img.naturalHeight);
              for (let x = -((s.cx * l.factor) % iw); x < spec.w; x += iw) ctx.drawImage(img, x, y, iw, h);
            }
            continue;
          }
          if (l.kind === "gradient") { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, colours[l.color] ?? l.color); g.addColorStop(1, colours[l.color2] ?? l.color2); ctx.fillStyle = g; } else ctx.fillStyle = colours[l.color] ?? l.color;
          ctx.fillRect(0, y, spec.w, h);
        }
        ctx.save();
        ctx.translate(-s.cx, -s.cy);
        if (tileCanvas) { if (tilesV !== s.tilesV) { tilesV = s.tilesV; drawTiles(); } ctx.drawImage(tileCanvas, 0, 0); }
        for (const b of s.bodies) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rot);
          const look = b.thing.look;
          if (look.kind === "sprite" && look.src) {
            // The frame of its state, turned the way it faces.
            const img = pictureOf(look.src);
            if (img.complete && img.naturalWidth) {
              const f = sheetFrame(look, b.anim, s.t), fw = img.naturalWidth / f.cols, fh = img.naturalHeight / f.rows;
              ctx.scale(b.face, 1);
              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(img, f.col * fw, f.row * fh, fw, fh, -b.w / 2, -b.h / 2, b.w, b.h);
            }
          } else {
            if (b.thing.control === "platform") ctx.scale(b.face, 1);
            ctx.drawImage(lookOf(b.of, look, b.thing.w, b.thing.h), -b.w / 2, -b.h / 2, b.w, b.h);
          }
          ctx.restore();
        }
        // A guard that has seen the player: a ❗ rising over it.
        for (let i = alerts.length - 1; i >= 0; i--) {
          const age = s.t - alerts[i].t;
          if (age > 0.9 || age < 0) { alerts.splice(i, 1); continue; }
          ctx.globalAlpha = 1 - age / 0.9;
          ctx.font = "22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("❗", alerts[i].x, alerts[i].y - age * 30);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        const c = coverOf(s);
        drawCover(ctx, spec.transition, c.k, c.closing, spec.w, spec.h, colours.text ?? "#111111");
      }
      const cam = Math.round(s.cx), lvl = s.level + 1;
      setHud((h) => (h.phase === s.phase && h.score === s.score && h.lives === s.lives && h.time === timeLeft(s) && h.cam === cam && h.level === lvl ? h : { phase: s.phase, score: s.score, lives: s.lives, time: timeLeft(s), cam, level: lvl }));
    };
    frame = requestAnimationFrame(loop);
    const keys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter"]);
    const name = (e: KeyboardEvent) => (e.code === "Space" || e.key === " " ? "Space" : e.key);
    const down = (e: KeyboardEvent) => {
      const k = name(e);
      if (!keys.has(k) || s.phase !== "playing") return;
      e.preventDefault();
      if (k === "ArrowLeft") input.current.left = true;
      if (k === "ArrowRight") input.current.right = true;
      if (k === "ArrowUp") input.current.up = true;
      if (k === "ArrowDown") input.current.down = true;
      if (k === "Space" || k === "ArrowUp") input.current.jumpHeld = true;
      if (!e.repeat) input.current.pressed.push(k);
    };
    const up = (e: KeyboardEvent) => {
      const k = name(e);
      if (k === "ArrowLeft") input.current.left = false;
      if (k === "ArrowRight") input.current.right = false;
      if (k === "ArrowUp") input.current.up = false;
      if (k === "ArrowDown") input.current.down = false;
      if (k === "Space" || k === "ArrowUp") input.current.jumpHeld = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [spec, colours, lang]);

  if (!spec) return <p className="rounded-xl bg-white/4 p-4 text-xs text-white/60">{say("ما في شي بالعالم ليتلعب. ضيف شي مش ✦.|Nothing is in the world to play. Add a thing that isn't ✦.|אין מה לשחק בעולם. הוסיפו פריט שאינו ✦.")}</p>;
  const toWorld = (e: RPointerEvent) => { const r = canvas.current!.getBoundingClientRect(), st = state.current; return { x: (st?.cx ?? 0) + ((e.clientX - r.left) / r.width) * spec.w, y: (st?.cy ?? 0) + ((e.clientY - r.top) / r.height) * spec.h }; };
  return (
    <div className="space-y-1.5" data-testid="game-ed-trying" data-phase={hud.phase} data-score={hud.score} data-cam={hud.cam} data-level={hud.level}>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/70">
        <span>{say("النقاط|Score|ניקוד")}: <b>{hud.score}</b></span>
        {spec.lives ? <span>{say("الأرواح|Lives|חיים")}: <b>{hud.lives}</b></span> : null}
        {hud.time !== null ? <span>{say("الوقت|Time|זמן")}: <b>{hud.time}</b></span> : null}
        {levelCount(spec) > 1 ? <span>{say("المرحلة|Level|שלב")}: <b>{hud.level}</b>/{levelCount(spec)}</span> : null}
        <span className="flex-1" />
        {hud.phase !== "playing" ? (
          <button type="button" className={main} onClick={() => { if (state.current) { startGame(state.current); setHud({ phase: "playing", score: 0, lives: spec.lives, time: timeLeft(state.current), cam: Math.round(state.current.cx), level: state.current.level + 1 }); } }} data-testid="game-ed-play">
            {hud.phase === "ready" ? say("▶ ابدأ|▶ Start|▶ התחלה") : hud.phase === "won" ? say("ربحت! العب كمان|Won! Play again|ניצחת! שוב") : say("خسرت، العب كمان|Lost, play again|הפסדת, שוב")}
          </button>
        ) : <span className="text-white/45">{say("الأسهم والمسافة والماوس|Arrows, Space and the mouse|חצים, רווח והעכבר")}</span>}
      </div>
      <canvas ref={canvas} className="w-full touch-none rounded-xl" style={{ aspectRatio: `${spec.w} / ${spec.h}` }}
        onPointerDown={(e) => { const p = toWorld(e); input.current.pointer = p; input.current.pointerDown = true; input.current.taps.push(p); }}
        onPointerMove={(e) => { input.current.pointer = toWorld(e); }}
        onPointerUp={() => { input.current.pointerDown = false; }} />
    </div>
  );
}

/* ---------------------------------------------------------------- G1: a sprite sheet, the tile map, the camera */

/** A raw look (the page's) as the shop's GameLook, its words in the language being edited. */
function lookOf(raw: unknown, lang: Lang): GameLook {
  const x = obj(raw);
  return { kind: (String(x.kind ?? "box") as GameLook["kind"]), color: String(x.color ?? "text"), ...(typeof x.src === "string" ? { src: x.src } : {}), ...(typeof x.emoji === "string" ? { emoji: x.emoji } : {}), text: String(obj(x.text)[lang] ?? obj(x.text).ar ?? obj(x.text).en ?? ""), ...(x.sheet ? { sheet: obj(x.sheet) as GameLook["sheet"] } : {}) };
}

/** A sprite sheet's cells and each state's run of frames. */
function SheetSettings({ look, busy, set, onPicture }: { look: Obj; busy: boolean; set: (c: Obj) => void; onPicture: () => void }) {
  const sheet = obj(look.sheet);
  const anims = obj(sheet.anims);
  const cells = num(sheet.cols, 1) * num(sheet.rows, 1);
  const setSheet = (c: Obj) => set({ sheet: { ...sheet, ...c } });
  const names: Record<string, string> = { idle: "واقف|Standing|עומד", run: "بيركض|Running|רץ", jump: "طالع|Jumping|קופץ", fall: "نازل|Falling|נופל" };
  return (
    <div className="space-y-1 rounded-md border border-white/8 p-1.5" data-testid="game-ed-sheet">
      <div className="flex items-center gap-2">
        {typeof look.src === "string" ? <img src={look.src} alt="" className="h-8 max-w-[120px] rounded object-contain" style={{ imageRendering: "pixelated" }} /> : null}
        <button type="button" className={btn} disabled={busy} onClick={onPicture}>{say("بدّل الصورة|Change the picture|החליפו תמונה")}</button>
      </div>
      <Num label={say("أعمدة|Columns|עמודות")} value={num(sheet.cols, 1)} min={1} max={16} onSave={(v) => setSheet({ cols: Math.round(v) })} testId="game-ed-sheet-cols" />
      <Num label={say("صفوف|Rows|שורות")} value={num(sheet.rows, 1)} min={1} max={16} onSave={(v) => setSheet({ rows: Math.round(v) })} />
      <Num label={say("إطارات بالثانية|Frames a second|פריימים לשנייה")} value={num(sheet.fps, 10)} min={1} max={30} onSave={(v) => setSheet({ fps: Math.round(v) })} />
      {["idle", "run", "jump", "fall"].map((a) => {
        const [from, count] = Array.isArray(anims[a]) ? (anims[a] as number[]) : [0, 0];
        return (
          <div key={a} className="flex items-center justify-between gap-1 text-[11px] text-white/60">
            <span>{say(names[a])}</span>
            <span className="flex items-center gap-1">
              <input type="number" className={`${ctl} w-12`} min={0} max={cells - 1} defaultValue={from} aria-label={say("من إطار|From frame|מפריים")} onBlur={(e) => setSheet({ anims: { ...anims, [a]: [Math.max(0, Math.min(cells - 1, Number(e.target.value) || 0)), Math.max(1, count || 1)] } })} data-testid={`game-ed-anim-${a}-from`} />
              <input type="number" className={`${ctl} w-12`} min={0} max={cells} defaultValue={count} aria-label={say("كم إطار|How many frames|כמה פריימים")} onBlur={(e) => { const n = Number(e.target.value) || 0; const next = { ...anims }; if (n > 0) next[a] = [from, Math.min(n, cells - from)]; else delete next[a]; setSheet({ anims: next }); }} data-testid={`game-ed-anim-${a}-count`} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** The tile map drawn in the editor's world: each cell's look, a faint grid, a ✦ on the cells that put a thing. */
function TilesCanvas({ tiles, map, ww, wh, colours, lang }: { tiles: Obj; map: string[]; ww: number; wh: number; colours: Record<string, string>; lang: Lang }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(0);
  const kinds = obj(tiles.kinds), z = num(tiles.size, 48);
  const looks = useMemo(() => new Map<string, HTMLCanvasElement>(), [kinds, colours, lang]);
  useEffect(() => {
    const cv = ref.current, ctx = cv?.getContext?.("2d") ?? null;
    if (!cv || !ctx) return;
    const k = Math.min(1, 2400 / ww);
    cv.width = Math.round(ww * k);
    cv.height = Math.round(wh * k);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, ww, wh);
    ctx.strokeStyle = "rgba(127,127,127,0.18)";
    ctx.lineWidth = 1 / k;
    for (let c = 0; c <= num(tiles.cols, 0); c++) { ctx.beginPath(); ctx.moveTo(c * z, 0); ctx.lineTo(c * z, num(tiles.rows, 0) * z); ctx.stroke(); }
    for (let r = 0; r <= num(tiles.rows, 0); r++) { ctx.beginPath(); ctx.moveTo(0, r * z); ctx.lineTo(num(tiles.cols, 0) * z, r * z); ctx.stroke(); }
    map.forEach((row, r) => [...row].forEach((ch, c) => {
      const kind = obj(kinds[ch]);
      if (ch === "." || !Object.keys(kind).length) return;
      let pic = looks.get(ch);
      if (!pic) {
        const look = lookOf(kind.look, lang);
        pic = lookCanvas(look, z, z, colours[look.color] ?? look.color, "sans-serif", lang !== "en", () => setLoaded((n) => n + 1));
        looks.set(ch, pic);
      }
      ctx.drawImage(pic, c * z, r * z, z, z);
      if (kind.thing) { ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = `${Math.round(z * 0.3)}px sans-serif`; ctx.fillText("✦", c * z + 2, r * z + z * 0.3); }
    }));
  }, [map, ww, wh, kinds, z, colours, lang, looks, loaded, tiles.cols, tiles.rows]);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" data-testid="game-ed-tiles" />;
}

/** The tile map's settings: its size, its kinds (a brush each), a rubber, and the picked kind's look and ways. */
function TilesPanel({ game, brush, setBrush, level, setLevel, busy, colours, lang, onChange }: { game: Obj; brush: string; setBrush: (c: string) => void; level: number; setLevel: (i: number) => void; busy: boolean; colours: Record<string, string>; lang: Lang; onChange: (label: string, next: Obj) => void }) {
  const tiles = obj(game.tiles);
  const [picking, setPicking] = useState(false);
  if (!Object.keys(tiles).length) {
    return (
      <div className="space-y-2 rounded-lg bg-white/4 p-2 text-[11px] text-white/60">
        <p>{say("خريطة بلاط: أرض وحيطان ومنصّات بترسميها بالفرشاة، والعالم بيصير أعرض من الشاشة والكاميرا بتلحق اللاعب.|A tile map: ground, walls and platforms painted with a brush; the world grows wider than the screen and the camera follows the player.|מפת אריחים: קרקע, קירות ופלטפורמות בצביעה במברשת; העולם רחב מהמסך והמצלמה עוקבת אחרי השחקן.")}</p>
        <button type="button" className={main} disabled={busy} onClick={() => onChange(say("خريطة بلاط|A tile map|מפת אריחים"), withTiles(game))} data-testid="game-ed-tiles-on">+ {say("خريطة بلاط|A tile map|מפת אריחים")}</button>
      </div>
    );
  }
  const kinds = obj(tiles.kinds);
  const maps = levelMaps(game);
  const sizeLabel = say("حجم الخريطة|The map's size|גודל המפה");
  const setTiles = (c: Obj, label = say("البلاط|The tiles|האריחים")) => onChange(label, { ...game, tiles: { ...tiles, ...c } });
  const kind = obj(kinds[brush]);
  const setKind = (c: Obj) => setTiles({ kinds: { ...kinds, [brush]: { ...kind, ...c } } }, say("نوع بلاط|A kind of tile|סוג אריח"));
  const look = obj(kind.look);
  // A kind puts a template's copy in each cell (✦), or is where a thing in the world starts.
  const putThings = thingsOf(game).map((t) => [String(t.id), `${String(t.id)} ${t.template ? "✦" : say("(بيبلّش هون)|(starts here)|(מתחיל כאן)")}`] as const);
  const tagText = (Array.isArray(kind.tags) ? kind.tags : []).map(String).join(", ");
  return (
    <div className="space-y-2" data-testid="game-ed-tiles-panel">
      <div className="space-y-1 rounded-lg bg-white/4 p-2">
        <Num label={say("حجم البلاطة|A tile's size|גודל אריח")} value={num(tiles.size, 48)} min={16} max={128} onSave={(v) => setTiles({ size: Math.round(v) })} testId="game-ed-tile-size" />
        <Num label={say("عرض الخريطة (بلاطات)|The map's width (tiles)|רוחב המפה (אריחים)")} value={num(tiles.cols, 20)} min={1} max={200} onSave={(v) => onChange(sizeLabel, resizedLevels(game, Math.round(v), num(tiles.rows, 12)))} testId="game-ed-tile-cols" />
        <Num label={say("طولها (بلاطات)|Its height (tiles)|גובה (אריחים)")} value={num(tiles.rows, 12)} min={1} max={60} onSave={(v) => onChange(sizeLabel, resizedLevels(game, num(tiles.cols, 20), Math.round(v)))} testId="game-ed-tile-rows" />
      </div>
      {/* The levels: one map each (the one painted is picked), a new one a copy of the picked one. */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-white/4 p-2" data-testid="game-ed-levels">
        <span className="text-[11px] text-white/55">{say("المرحلة:|Level:|שלב:")}</span>
        {maps.map((_, i) => <button key={i} type="button" onClick={() => setLevel(i)} aria-pressed={i === level} className={`h-6 min-w-6 rounded-md px-1.5 text-[11px] ${i === level ? "bg-accent-500/40 text-white" : "bg-white/6 text-white/65"}`} data-testid="game-ed-level" data-level={i}>{i + 1}</button>)}
        <button type="button" className={btn} disabled={busy || maps.length >= 8} onClick={() => { const next = withNewLevel(game, level); if (next) { onChange(say("مرحلة جديدة|A new level|שלב חדש"), next); setLevel(maps.length); } }} data-testid="game-ed-level-add">+ {say("مرحلة|Level|שלב")}</button>
        {level > 0 ? <button type="button" className="text-[11px] text-white/45 hover:text-red-300" disabled={busy} onClick={() => { onChange(say("محيت مرحلة|A level removed|שלב הוסר"), withoutLevel(game, level)); setLevel(level - 1); }} data-testid="game-ed-level-remove">{say("امحيها|Remove it|הסירו")}</button> : null}
      </div>
      <div className="space-y-1 rounded-lg bg-white/4 p-2">
        <Row label={say("متاهة بتنعمل لحالها|A maze made by itself|מבוך שנוצר מעצמו")}><input type="checkbox" checked={tiles.gen === "maze"} disabled={busy || !Object.values(kinds).some((k) => obj(k).solid === true)} onChange={(e) => setTiles({ gen: e.target.checked ? "maze" : undefined }, say("متاهة|A maze|מבוך"))} data-testid="game-ed-maze" /></Row>
        {tiles.gen === "maze" ? <>
          <p className="text-[11px] leading-4 text-white/45">{say("الحيطان بتنعمل من رقم اللعبة، وكل مرحلة متاهة غير. ارسمي العلامات (وين بيبلّش، الأشياء، الأعداء) وبتروح لأقرب ممرّ.|The walls are made from the game's number, a different maze on each level. Paint the marks (where it starts, the things, the enemies) and they go to the nearest corridor.|הקירות נוצרים ממספר המשחק, מבוך אחר בכל שלב. ציירו את הסימנים (איפה מתחילים, פריטים, אויבים) והם עוברים למעבר הקרוב.")}</p>
          <button type="button" className={btn} disabled={busy} onClick={() => onChange(say("متاهة تانية|Another maze|מבוך אחר"), { ...game, seed: (num(game.seed, 7) % 2147483646) + 1 })} data-testid="game-ed-maze-again">🎲 {say("متاهة تانية|Another maze|מבוך אחר")}</button>
        </> : null}
      </div>
      <div className="text-[11px] text-white/55">{say("الفرشاة (ارسمي بالعالم):|The brush (paint in the world):|המברשת (ציירו בעולם):")}</div>
      <div className="flex flex-wrap gap-1">
        {Object.entries(kinds).map(([ch, k]) => (
          <button key={ch} type="button" onClick={() => setBrush(ch)} aria-pressed={brush === ch} className={`h-9 w-9 overflow-hidden rounded-md border p-0.5 ${brush === ch ? "border-accent-400 bg-accent-500/20" : "border-white/12"}`} title={ch} data-testid="game-ed-brush" data-char={ch}>
            <LookView look={obj(obj(k).look)} colours={colours} lang={lang} />
          </button>
        ))}
        <button type="button" onClick={() => setBrush(".")} aria-pressed={brush === "."} className={`h-9 rounded-md border px-2 text-[11px] ${brush === "." ? "border-accent-400 bg-accent-500/20 text-white" : "border-white/12 text-white/65"}`} data-testid="game-ed-brush" data-char=".">{say("ممحاة|Rubber|מחק")}</button>
        <button type="button" className={btn} disabled={busy || !nextTileChar(game)} onClick={() => { const ch = nextTileChar(game); if (!ch) return; setTiles({ kinds: { ...kinds, [ch]: { look: { kind: "box", color: "accent" }, solid: true } } }, say("نوع بلاط جديد|A new kind of tile|סוג אריח חדש")); setBrush(ch); }} data-testid="game-ed-kind-add">+ {say("نوع|Kind|סוג")}</button>
      </div>
      {brush !== "." && Object.keys(kind).length ? (
        <div className="space-y-1.5 rounded-lg bg-white/4 p-2" data-testid="game-ed-kind">
          <Row label={say("شكله|Its look|המראה")}><Choose label={say("شكله|Its look|המראה")} value={String(look.kind ?? "box")} options={[["box", say("مربّع|Box|ריבוע")], ["emoji", "⭐"], ["image", say("صورة|Picture|תמונה")]] as const} onPick={(k) => { if (k === "image") setPicking(true); else setKind({ look: { ...look, kind: k, ...(k === "emoji" && !look.emoji ? { emoji: "🧱" } : {}) } }); }} disabled={busy} /></Row>
          {look.kind === "emoji" ? <Row label={say("الإيموجي|The emoji|האימוג'י")}><input className={`${ctl} w-20`} defaultValue={String(look.emoji ?? "")} key={`${brush}:${String(look.emoji)}`} maxLength={8} onBlur={(e) => e.target.value.trim() && setKind({ look: { ...look, emoji: e.target.value.trim() } })} /></Row> : null}
          {look.kind !== "image" ? <Row label={say("لونه|Its colour|הצבע")}><Choose label={say("لونه|Its colour|הצבע")} value={String(look.color ?? "text")} options={COLOUR_TOKENS.map((c) => [c, c] as const)} onPick={(c) => setKind({ look: { ...look, color: c } })} disabled={busy} /></Row> : null}
          <Row label={say("بيحط شي مكانه (✦)|Puts a thing in its place (✦)|שם פריט במקומו (✦)")}><Choose label={say("بيحط شي|Puts a thing|שם פריט")} value={String(kind.thing ?? "")} options={[["", say("لأ|No|לא")] as const, ...putThings]} onPick={(v) => setKind({ thing: v || undefined, ...(v ? { solid: undefined, oneWay: undefined } : {}) })} disabled={busy} testId="game-ed-kind-thing" /></Row>
          {!kind.thing ? <>
            <Row label={say("صلب|Solid|מוצק")}><input type="checkbox" checked={kind.solid === true} disabled={busy} onChange={(e) => setKind({ solid: e.target.checked || undefined, ...(e.target.checked ? { oneWay: undefined } : {}) })} data-testid="game-ed-kind-solid" /></Row>
            <Row label={say("منصّة من فوق بس|A platform from above only|פלטפורמה מלמעלה בלבד")}><input type="checkbox" checked={kind.oneWay === true} disabled={busy} onChange={(e) => setKind({ oneWay: e.target.checked || undefined, ...(e.target.checked ? { solid: undefined } : {}) })} data-testid="game-ed-kind-oneway" /></Row>
            <Row label={say("علامات (بفاصلة)|Tags (comma)|תגיות (פסיק)")}><input className={`${ctl} w-28`} defaultValue={tagText} key={`${brush}:${tagText}`} onBlur={(e) => { const next = e.target.value.split(/[,،\s]+/).map((x) => x.trim().toLowerCase()).filter((x) => /^[a-z][a-z0-9-]{0,15}$/.test(x)).slice(0, 4); setKind({ tags: next.length ? next : undefined }); }} data-testid="game-ed-kind-tags" /></Row>
          </> : null}
          <button type="button" className="text-[11px] text-red-300 hover:text-red-200" disabled={busy} onClick={() => { onChange(say("محيت نوع بلاط|A kind of tile removed|סוג אריח הוסר"), withoutTileKind(game, brush)); setBrush("."); }} data-testid="game-ed-kind-remove">{say("امحي هالنوع|Remove this kind|הסירו את הסוג")}</button>
        </div>
      ) : null}
      <button type="button" className="text-[11px] text-white/45 hover:text-red-300" disabled={busy} onClick={() => { const next = { ...game }; delete next.tiles; onChange(say("شلت الخريطة|The map taken away|המפה הוסרה"), next); }} data-testid="game-ed-tiles-off">{say("شيل الخريطة كلها|Take the whole map away|הסירו את כל המפה")}</button>
      <MediaLibraryModal open={picking} onClose={() => setPicking(false)} title={say("صورة البلاطة|The tile's picture|תמונת האריח")} onSelect={(u) => { setPicking(false); setKind({ look: { ...look, kind: "image", src: u } }); }} />
    </div>
  );
}

/** The camera (what it follows, how softly), a world wider than the view, and the layers behind. */
function CameraPanel({ game, busy, whos, onChange }: { game: Obj; busy: boolean; whos: Array<[string, string]>; onChange: (label: string, next: Obj) => void }) {
  const cam = obj(game.camera);
  const layers = (Array.isArray(game.layers) ? game.layers : []) as Obj[];
  const [picking, setPicking] = useState<number | null>(null);
  const w = num(game.w, 960);
  const hasTiles = Object.keys(obj(game.tiles)).length > 0;
  const setLayers = (next: Obj[]) => onChange(say("الطبقات|The layers|השכבות"), { ...game, layers: next });
  const setLayer = (i: number, c: Obj) => setLayers(layers.map((l, j) => (j === i ? { ...l, ...c } : l)));
  return (
    <div className="space-y-2" data-testid="game-ed-camera">
      <div className="space-y-1 rounded-lg bg-white/4 p-2">
        <Row label={say("الكاميرا بتلحق|The camera follows|המצלמה עוקבת אחרי")}><Choose label={say("الكاميرا|The camera|המצלמה")} value={String(cam.follow ?? "")} options={[["", say("اللاعب لحاله|The player, by itself|השחקן, לבד")] as const, ...whos]} onPick={(v) => onChange(say("الكاميرا|The camera|המצלמה"), { ...game, camera: { ...cam, follow: v } })} disabled={busy} testId="game-ed-follow" /></Row>
        <Num label={say("نعومتها (0.02–1)|Its softness (0.02–1)|רכות (0.02–1)")} value={num(cam.lerp, 0.14)} min={0.02} max={1} step={0.02} onSave={(v) => onChange(say("الكاميرا|The camera|המצלמה"), { ...game, camera: { ...cam, lerp: v } })} />
        <Row label={say("بين المراحل|Between levels|בין שלבים")}><Choose label={say("بين المراحل|Between levels|בין שלבים")} value={String(game.transition ?? "circle")} options={named(TRANSITION_NAMES)} onPick={(v) => onChange(say("الانتقال|The transition|המעבר"), { ...game, transition: v })} disabled={busy} testId="game-ed-transition" /></Row>
        {!hasTiles ? <Row label={say("عرض العالم|The world's width|רוחב העולם")}><Choose label={say("عرض العالم|The world's width|רוחב העולם")} value={String(Math.round(num(game.ww, w) / w))} options={[["1", "×1"], ["2", "×2"], ["3", "×3"], ["4", "×4"]] as const} onPick={(v) => onChange(say("عرض العالم|The world's width|רוחב העולם"), { ...game, ww: w * Number(v) })} disabled={busy} testId="game-ed-world-wide" /></Row> : null}
      </div>
      <div className="flex items-center justify-between text-[11px] text-white/55">
        <span>{say("طبقات ورا اللعبة|Layers behind the game|שכבות מאחורי המשחק")}</span>
        <button type="button" className={btn} disabled={busy || layers.length >= 4} onClick={() => setLayers([...layers, { kind: "gradient", color: "accent-soft", color2: "surface", factor: 0.3, y: layers.length ? 0.55 : 0, h: layers.length ? 0.45 : 1 }])} data-testid="game-ed-layer-add">+ {say("طبقة|Layer|שכבה")}</button>
      </div>
      {layers.map((l, i) => (
        <div key={i} className="space-y-1 rounded-lg bg-white/4 p-2" data-testid="game-ed-layer">
          <div className="flex items-center gap-1">
            <Choose label={say("نوعها|Its kind|הסוג")} value={String(l.kind ?? "color")} options={[["color", say("لون|Colour|צבע")], ["gradient", say("تدرّج|Gradient|מעבר צבע")], ["image", say("صورة|Picture|תמונה")]] as const} onPick={(v) => { if (v === "image") setPicking(i); else setLayer(i, { kind: v }); }} disabled={busy} />
            <span className="flex-1" />
            <button type="button" className="text-[11px] text-white/40 hover:text-red-300" disabled={busy} onClick={() => setLayers(layers.filter((_, j) => j !== i))} aria-label={say("امحي|Remove|הסירו")}>✕</button>
          </div>
          {l.kind !== "image" ? <div className="flex flex-wrap gap-1"><Choose label={say("لونها|Its colour|צבע")} value={String(l.color ?? "accent-soft")} options={COLOUR_TOKENS.map((c) => [c, c] as const)} onPick={(v) => setLayer(i, { color: v })} disabled={busy} />{l.kind === "gradient" ? <Choose label={say("للون|To|אל")} value={String(l.color2 ?? "surface")} options={COLOUR_TOKENS.map((c) => [c, c] as const)} onPick={(v) => setLayer(i, { color2: v })} disabled={busy} /> : null}</div> : null}
          <Num label={say("سرعتها مع الكاميرا (0–1)|Its speed with the camera (0–1)|מהירות עם המצלמה (0–1)")} value={num(l.factor, 0.3)} min={0} max={1} step={0.05} onSave={(v) => setLayer(i, { factor: v })} />
          <Num label={say("من وين بتبلّش (0–1)|Where it starts (0–1)|איפה מתחילה (0–1)")} value={num(l.y, 0)} min={0} max={1} step={0.05} onSave={(v) => setLayer(i, { y: v })} />
          <Num label={say("طولها (0–1)|Its height (0–1)|גובה (0–1)")} value={num(l.h, 1)} min={0.05} max={1} step={0.05} onSave={(v) => setLayer(i, { h: v })} />
        </div>
      ))}
      <MediaLibraryModal open={picking !== null} onClose={() => setPicking(null)} title={say("صورة الطبقة|The layer's picture|תמונת השכבה")} onSelect={(u) => { const i = picking!; setPicking(null); setLayer(i, { kind: "image", src: u }); }} />
    </div>
  );
}
