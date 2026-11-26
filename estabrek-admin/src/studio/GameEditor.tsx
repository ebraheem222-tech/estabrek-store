/**
 * The game editor (G0b of docs/game-engine-plan.ar.md), opened from the game stage's panel: the game's world drawn
 * big, its things dragged into place and their corners pulled to size; a thing's settings (its look, body, control,
 * behaviour, speeds, tags); the rules built from menus ("when … → do …"); the world's size, edges and gravity; and
 * «جرّبها» to play it right here (the shop's own engine, drawn on a 2D canvas with the shop's pictures of things).
 * Each change is one change of the page's draft (Undo takes it back); a drag is one change, made when it ends.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { Modal } from "../components/ui/Modal";
import { MediaLibraryModal } from "../components/media/MediaLibraryModal";
import type { Lang } from "../lib/lang";
import { gameOf, type GameLook } from "../../../estabrek-storefront/src/pageTree/gameSpec";
import { NO_INPUT, STEP, newGame, startGame, stepGame, timeLeft, type GameInput, type GameState } from "../../../estabrek-storefront/src/pageTree/gameEngine";
import { lookCanvas } from "../../../estabrek-storefront/src/pageTree/gameDraw";
import type { ThumbColours } from "./templates/colours";
import {
  ACT_NAMES, BEHAVE_NAMES, BODY_NAMES, CONTROL_NAMES, EDGE_NAMES, KEY_NAMES, LOOK_STARTS, SIZES, SOUND_NAMES, SPOT_NAMES, WHEN_NAMES,
  actPossible, newAct, newWhen, ruleText, rulesOf, templatesOf, thingsOf, whoOptions, withNewThing, withoutThing, type Obj,
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

export function GameEditor({ open, onClose, game, lang, colours, busy, onChange }: {
  open: boolean; onClose: () => void; game: Obj; lang: Lang; colours: ThumbColours; busy: boolean;
  onChange: (label: string, next: Obj) => void;
}) {
  const pal = useMemo(() => palette(colours), [colours]);
  const W = num(game.w, 960), H = num(game.h, 540);
  const things = thingsOf(game);
  const rules = rulesOf(game);
  const [sel, setSel] = useState<string | null>(things.find((t) => !t.template)?.id as string ?? null);
  const [rule, setRule] = useState(0);
  const [trying, setTrying] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [picking, setPicking] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const thing = things.find((t) => t.id === sel) ?? null;

  const setThing = (id: string, change: Obj, label = say("تعديل شي|A thing changed|פריט שונה")) =>
    onChange(label, { ...game, things: things.map((t) => (t.id === id ? { ...t, ...change } : t)) });
  const setRules = (next: Obj[], label = say("القواعد|The rules|הכללים")) => onChange(label, { ...game, rules: next });
  const setRuleAt = (i: number, r: Obj) => setRules(rules.map((x, j) => (j === i ? r : x)));

  /* ---- dragging a thing, or its corner, in the world's units */
  const scale = () => { const r = stage.current!.getBoundingClientRect(); return { sx: W / r.width, sy: H / r.height }; };
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
    if (!drag) return;
    const { sx, sy } = scale();
    const dx = (e.clientX - drag.px) * sx, dy = (e.clientY - drag.py) * sy;
    setMoved(drag.mode === "move"
      ? { x: Math.round(Math.min(W, Math.max(0, drag.x + dx))), y: Math.round(Math.min(H, Math.max(0, drag.y + dy))), w: drag.w, h: drag.h }
      : { x: drag.x, y: drag.y, w: Math.round(Math.max(8, drag.w + dx * 2)), h: Math.round(Math.max(8, drag.h + dy * 2)) });
  };
  const endDrag = () => {
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
  const resize = (w: number, h: number) => onChange(say("حجم العالم|The world's size|גודל העולם"), {
    ...game, w, h, things: things.map((t) => ({ ...t, x: Math.round(num(t.x, 0) * (w / W)), y: Math.round(num(t.y, 0) * (h / H)) })),
  });

  const whos = whoOptions(game);
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
          {/* Things: add one, pick one, its settings. */}
          <div className="max-h-[62vh] space-y-2 overflow-y-auto pe-1">
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
            {thing ? <ThingSettings key={String(thing.id)} thing={thing} lang={lang} busy={busy || trying} set={(c, l) => setThing(String(thing.id), c, l)} onRemove={() => removeThing(String(thing.id))} onPicture={() => setPicking(true)} /> : <p className="text-[11px] text-white/40">{say("اختار شي لتعدّله، أو اسحبه بالعالم.|Choose a thing to change it, or drag it in the world.|בחרו פריט כדי לשנות אותו, או גררו אותו בעולם.")}</p>}
          </div>

          {/* The world, or the game played. */}
          <div className="space-y-2">
            {trying ? <GameTry game={game} colours={pal} lang={lang} /> : (
              <>
                <div ref={stage} className="relative w-full touch-none select-none overflow-hidden rounded-xl" style={{ aspectRatio: `${W} / ${H}`, background: pal[String(game.bg ?? "surface")] ?? "#eee" }} onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerDown={() => setSel(null)} data-testid="game-ed-world">
                  {things.filter((t) => !t.template).map((t) => {
                    const id = String(t.id);
                    const m = drag?.id === id && moved ? moved : { x: num(t.x, 0), y: num(t.y, 0), w: num(t.w, 48), h: num(t.h, 48) };
                    return (
                      <div key={id} className={`absolute cursor-move ${id === sel ? "outline outline-2 outline-accent-400" : "hover:outline hover:outline-1 hover:outline-white/50"}`}
                        style={{ left: `${((m.x - m.w / 2) / W) * 100}%`, top: `${((m.y - m.h / 2) / H) * 100}%`, width: `${(m.w / W) * 100}%`, height: `${(m.h / H) * 100}%`, transform: `rotate(0deg)` }}
                        onPointerDown={startDrag(t, "move")} data-testid="game-ed-thing" data-thing={id}>
                        <LookView look={obj(t.look)} colours={pal} lang={lang} />
                        {id === sel ? <span className="absolute -bottom-1.5 -end-1.5 h-3 w-3 cursor-nwse-resize rounded-sm bg-accent-400" onPointerDown={startDrag(t, "size")} data-testid="game-ed-size-handle" /> : null}
                      </div>
                    );
                  })}
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
      <MediaLibraryModal open={picking} onClose={() => setPicking(false)} title={say("صورة الشي|The thing's picture|תמונת הפריט")} onSelect={(u) => { setPicking(false); if (thing) setThing(String(thing.id), { look: { ...obj(thing.look), kind: "image", src: u } }); }} />
    </Modal>
  );
}

/* ---------------------------------------------------------------- a thing's settings */

function ThingSettings({ thing, lang, busy, set, onRemove, onPicture }: { thing: Obj; lang: Lang; busy: boolean; set: (change: Obj, label?: string) => void; onRemove: () => void; onPicture: () => void }) {
  const look = obj(thing.look);
  const setLook = (c: Obj) => set({ look: { ...look, ...c } }, say("شكل الشي|A thing's look|מראה הפריט"));
  const tags = (Array.isArray(thing.tags) ? thing.tags : []).map(String).join(", ");
  const [tagText, setTagText] = useState(tags);
  return (
    <div className="space-y-1.5 rounded-lg bg-white/4 p-2" data-testid="game-ed-thing-settings">
      <div className="flex items-center justify-between text-[11px] text-white/75"><b>{String(thing.id)}</b><button type="button" className="text-red-300 hover:text-red-200" disabled={busy} onClick={onRemove} data-testid="game-ed-remove">{say("امحيه|Remove it|הסירו")}</button></div>
      <Row label={say("بيطلع بالقواعد بس ✦|Made by rules only ✦|נוצר רק בכללים ✦")}><input type="checkbox" checked={thing.template === true} disabled={busy} onChange={(e) => set({ template: e.target.checked || undefined })} data-testid="game-ed-template-box" /></Row>
      <Row label={say("شكله|Its look|המראה")}><Choose label={say("شكله|Its look|המראה")} value={String(look.kind ?? "box")} options={[["emoji", "⭐"], ["box", say("مربّع|Box|ריבוע")], ["circle", say("دائرة|Circle|עיגול")], ["image", say("صورة|Picture|תמונה")], ["text", say("كلام|Words|מילים")]] as const} onPick={(k) => { if (k === "image") onPicture(); else setLook({ kind: k, ...(k === "emoji" && !look.emoji ? { emoji: "⭐" } : {}), ...(k === "text" && !look.text ? { text: { [lang]: say("نص|Text|טקסט") } } : {}) }); }} disabled={busy} testId="game-ed-look" /></Row>
      {look.kind === "emoji" ? <Row label={say("الإيموجي|The emoji|האימוג'י")}><input className={`${ctl} w-20`} defaultValue={String(look.emoji ?? "")} maxLength={8} onBlur={(e) => e.target.value.trim() && setLook({ emoji: e.target.value.trim() })} data-testid="game-ed-emoji" /></Row> : null}
      {look.kind === "text" ? <Row label={say("الكلام|The words|המילים")}><input className={`${ctl} w-28`} defaultValue={String(obj(look.text)[lang] ?? "")} maxLength={40} onBlur={(e) => setLook({ text: { ...obj(look.text), [lang]: e.target.value.trim() } })} data-testid="game-ed-words" /></Row> : null}
      {look.kind !== "image" ? <Row label={say("لونه|Its colour|הצבע")}><Choose label={say("لونه|Its colour|הצבע")} value={String(look.color ?? "accent")} options={COLOUR_TOKENS.map((c) => [c, c] as const)} onPick={(c) => setLook({ color: c })} disabled={busy} testId="game-ed-colour" /></Row> : <button type="button" className={btn} disabled={busy} onClick={onPicture}>{say("بدّل الصورة|Change the picture|החליפו תמונה")}</button>}
      <Row label={say("جسمه|Its body|הגוף")}><Choose label={say("جسمه|Its body|הגוף")} value={String(thing.body ?? "none")} options={named(BODY_NAMES)} onPick={(v) => set({ body: v })} disabled={busy} testId="game-ed-body" /></Row>
      <Row label={say("مين بيحرّكه|Who moves it|מי מזיז")}><Choose label={say("مين بيحرّكه|Who moves it|מי מזיז")} value={String(thing.control ?? "none")} options={named(CONTROL_NAMES)} onPick={(v) => set({ control: v })} disabled={busy} testId="game-ed-control" /></Row>
      <Row label={say("تصرّفه|Its behaviour|ההתנהגות")}><Choose label={say("تصرّفه|Its behaviour|ההתנהגות")} value={String(thing.behave ?? "none")} options={named(BEHAVE_NAMES)} onPick={(v) => set({ behave: v })} disabled={busy} testId="game-ed-behave" /></Row>
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
        {when.on === "hit" ? <div className="flex flex-wrap items-center gap-1 text-[11px] text-white/55">{who(when.a, (v) => setWhen({ a: v }), say("الأول|The first|הראשון"), "game-ed-hit-a")}<span>{say("يلمس|meets|פוגש")}</span>{who(when.b, (v) => setWhen({ b: v }), say("التاني|The second|השני"), "game-ed-hit-b")}</div> : null}
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
  const [hud, setHud] = useState({ phase: "ready", score: 0, lives: 0, time: null as number | null });
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
      if (!c) { c = lookCanvas(look, w, h, colours[look.color] ?? look.color, "sans-serif", lang !== "en", () => {}); looks.set(of, c); }
      return c;
    };
    let frame = 0, last = performance.now(), acc = 0;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (s.phase === "playing") {
        acc += dt;
        let n = 0;
        while (acc >= STEP && n < 5) { stepGame(s, input.current); input.current.pressed = []; input.current.taps = []; acc -= STEP; n++; }
        s.effects.length = 0;
      }
      if (ctx && cv) {
        ctx.fillStyle = colours[spec.bg] ?? spec.bg;
        ctx.fillRect(0, 0, spec.w, spec.h);
        for (const b of s.bodies) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rot);
          ctx.drawImage(lookOf(b.of, b.thing.look, b.thing.w, b.thing.h), -b.w / 2, -b.h / 2, b.w, b.h);
          ctx.restore();
        }
      }
      setHud((h) => (h.phase === s.phase && h.score === s.score && h.lives === s.lives && h.time === timeLeft(s) ? h : { phase: s.phase, score: s.score, lives: s.lives, time: timeLeft(s) }));
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
      if (!e.repeat) input.current.pressed.push(k);
    };
    const up = (e: KeyboardEvent) => {
      const k = name(e);
      if (k === "ArrowLeft") input.current.left = false;
      if (k === "ArrowRight") input.current.right = false;
      if (k === "ArrowUp") input.current.up = false;
      if (k === "ArrowDown") input.current.down = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [spec, colours, lang]);

  if (!spec) return <p className="rounded-xl bg-white/4 p-4 text-xs text-white/60">{say("ما في شي بالعالم ليتلعب. ضيف شي مش ✦.|Nothing is in the world to play. Add a thing that isn't ✦.|אין מה לשחק בעולם. הוסיפו פריט שאינו ✦.")}</p>;
  const toWorld = (e: RPointerEvent) => { const r = canvas.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * spec.w, y: ((e.clientY - r.top) / r.height) * spec.h }; };
  return (
    <div className="space-y-1.5" data-testid="game-ed-trying" data-phase={hud.phase} data-score={hud.score}>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/70">
        <span>{say("النقاط|Score|ניקוד")}: <b>{hud.score}</b></span>
        {spec.lives ? <span>{say("الأرواح|Lives|חיים")}: <b>{hud.lives}</b></span> : null}
        {hud.time !== null ? <span>{say("الوقت|Time|זמן")}: <b>{hud.time}</b></span> : null}
        <span className="flex-1" />
        {hud.phase !== "playing" ? (
          <button type="button" className={main} onClick={() => { if (state.current) { startGame(state.current); setHud({ phase: "playing", score: 0, lives: spec.lives, time: timeLeft(state.current) }); } }} data-testid="game-ed-play">
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
