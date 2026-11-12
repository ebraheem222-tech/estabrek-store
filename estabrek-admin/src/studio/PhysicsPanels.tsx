/**
 * Physics in the editor (docs/cms-big-engine-plan.ar.md I2, I4; an element's own physics is in the motion panel,
 * LookPanels.tsx):
 *  - WorldPanel, on what holds others (a section, grid, stack, columns, a cell, a popup): what it holds become
 *    bodies of a physics engine in the shop (pageTree/physicsWorld.ts). When and how it starts, gravity (a
 *    direction and how strong; the phone's tilt), its walls, bounce, friction, air, dragging and throwing, the
 *    pointer pushing or pulling, a wind, what a click does, starting again. Tried in the page; or baked: run once in
 *    the page, each body's run written as its own keyframes, so the shop plays keyframes and runs no physics.
 *  - BodyPanel, on an element inside a world: round or a box, fixed in place, bouncier, heavier, hung from a rope
 *    or a spring, or left out of the world.
 */
import { useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { say } from "./say";
import { Range } from "./LookPanels";

type Ops = (label: string, ops: PageDraftOp[]) => void;
export type World = {
  on?: "view" | "load" | "click" | "hover"; start?: "place" | "drop" | "burst"; gx?: number; gy?: number; tilt?: boolean;
  walls?: "box" | "open" | "floor" | "none"; bounce?: number; friction?: number; air?: number; drag?: boolean;
  pointer?: "none" | "push" | "pull"; wind?: number; click?: "none" | "burst" | "flip"; again?: number; baked?: boolean;
};
export type Body = { shape?: "auto" | "box" | "circle"; fixed?: boolean; bounce?: number; mass?: number; hang?: "none" | "rope" | "spring"; out?: boolean };
export type BakedKeys = Record<string, Array<Record<string, unknown>>>;
/** The kinds that can hold a world (the shop's WORLD_HOSTS). */
export const WORLD_HOSTS = new Set(["section", "grid", "stack", "columns", "cell", "popup"]);
export const worldOfNode = (n: PageTreeNode | null | undefined): World | null => {
  const w = (n?.props as Record<string, unknown> | undefined)?.world;
  return n && WORLD_HOSTS.has(n.type) && w && typeof w === "object" ? (w as World) : null;
};

const box = "space-y-2 rounded-xl border border-white/[0.08] p-3";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] hover:bg-white/[0.1] disabled:opacity-40";
const sel = "mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white";
const chip = (on: boolean) => `rounded-lg px-2 py-1 text-[11px] ${on ? "bg-accent-500/30 text-white" : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1]"}`;

function Select<T extends string>({ label, value, options, busy, onPick, testId }: { label: string; value: T; options: Array<[T, string]>; busy: boolean; onPick: (v: T) => void; testId?: string }) {
  return (
    <label className="block text-[11px] text-white/55">{label}
      <select className={sel} value={value} disabled={busy} onChange={(e) => onPick(e.target.value as T)} data-testid={testId}>
        {options.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
      </select>
    </label>
  );
}
function Check({ label, on, busy, onSet, testId }: { label: string; on: boolean; busy: boolean; onSet: (v: boolean) => void; testId?: string }) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-white/65">
      <input type="checkbox" checked={on} disabled={busy} onChange={(e) => onSet(e.target.checked)} data-testid={testId} />
      {label}
    </label>
  );
}

/** Gravity's way: down, up, sideways or none at all (floating in space). */
const WAYS: Array<[string, string, number, number]> = [
  ["down", "↓", 0, 1], ["up", "↑", 0, -1], ["start", "←", -1, 0], ["end", "→", 1, 0], ["none", "○", 0, 0],
];
const wayOf = (gx: number, gy: number) => (Math.abs(gx) < 0.01 && Math.abs(gy) < 0.01 ? "none" : Math.abs(gy) >= Math.abs(gx) ? (gy > 0 ? "down" : "up") : gx > 0 ? "end" : "start");

/** The ops a bake writes: each body that moved gets its run as its own keyframes, and the world is marked baked. */
export function bakeOps(host: PageTreeNode, world: World, keys: BakedKeys, seconds: number): PageDraftOp[] {
  const ops: PageDraftOp[] = [];
  for (const child of host.children ?? []) {
    const frames = keys[child.id];
    if (!frames || frames.length < 2) continue;
    const motion = { ...((child.motion as Record<string, unknown> | undefined) ?? {}) };
    motion.keys = { on: world.on === "load" ? "load" : "view", duration: Math.round(seconds * 100) / 100, ease: "linear", ...(world.again ? { repeat: -1 } : {}), parts: { self: frames } };
    ops.push({ op: "setMotion", nodeId: child.id, motion });
  }
  ops.push({ op: "setProps", nodeId: host.id, props: { ...(host.props ?? {}), world: { ...world, baked: true } } });
  return ops;
}
/** Back to a live world: the baked keyframes taken off its bodies. */
export function unbakeOps(host: PageTreeNode, world: World): PageDraftOp[] {
  const ops: PageDraftOp[] = [];
  for (const child of host.children ?? []) {
    const motion = child.motion as Record<string, unknown> | undefined;
    if (!motion?.keys) continue;
    const { keys: _, ...rest } = motion;
    ops.push({ op: "setMotion", nodeId: child.id, motion: Object.keys(rest).length ? rest : null });
  }
  const { baked: __, ...live } = world;
  ops.push({ op: "setProps", nodeId: host.id, props: { ...(host.props ?? {}), world: live } });
  return ops;
}

export function WorldPanel({ node, busy, onOps, onPlay, onStop, onBake }: {
  node: PageTreeNode; busy: boolean; onOps: Ops; onPlay: () => void; onStop: () => void;
  onBake: (seconds: number) => Promise<BakedKeys | null>;
}) {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const world = worldOfNode(node);
  const [seconds, setSeconds] = useState(4);
  const [baking, setBaking] = useState<"" | "busy" | "none">("");
  const label = say("عالم فيزيائي|Physics world|עולם פיזיקלי");
  const save = (next: World | null) => onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...props, world: next ?? undefined } }]);
  const set = (patch: Partial<World>) => world && save({ ...world, ...patch });
  const kids = (node.children ?? []).filter((c) => !((c.props as Record<string, unknown> | undefined)?.body as Body | undefined)?.out).length;
  if (!world) {
    return (
      <div className={box} data-testid="studio-world">
        <Check label={say("خلّي اللي جوّاه أجسام فيزيائية (جاذبية، تصادم، رمي…)|Make what it holds physical bodies (gravity, collisions, throwing…)|הפוך את מה שבתוכו לגופים פיזיקליים")} on={false} busy={busy} onSet={() => save({ start: "drop", walls: "open", bounce: 0.4, drag: true })} testId="studio-world-on" />
      </div>
    );
  }
  const gx = world.gx ?? 0, gy = world.gy ?? 1;
  const strength = Math.round(Math.hypot(gx, gy) * 10) / 10;
  const way = wayOf(gx, gy);
  const bake = async () => {
    setBaking("busy");
    const keys = await onBake(seconds);
    if (!keys || !Object.keys(keys).length) { setBaking("none"); return; }
    setBaking("");
    onOps(say("ثبّت الفيزياء كحركة|Bake the physics into keyframes|אפה את הפיזיקה לקיפריימים"), bakeOps(node, world, keys, seconds));
  };
  return (
    <div className={box} data-testid="studio-world" data-baked={world.baked ? "" : undefined}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/70">{label}</div>
        <span className="text-[10px] text-white/40">{say(`${kids} جسم|${kids} bodies|${kids} גופים`)}</span>
      </div>
      {world.baked ? (
        <div className="space-y-2">
          <p className="text-[11px] leading-4 text-emerald-200/80">{say("مثبّتة كحركة بالمفاتيح: الصفحة ما بتشغّل فيزياء، بس بتلعب الحركة.|Baked into keyframes: the page runs no physics, it only plays the motion.|אפוי לקיפריימים: הדף לא מריץ פיזיקה.")}</p>
          <button type="button" className={btn} disabled={busy} onClick={() => onOps(label, unbakeOps(node, world))} data-testid="studio-world-unbake">{say("رجّعها فيزياء حيّة|Make it live physics again|החזר לפיזיקה חיה")}</button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            <button type="button" className={btn} disabled={busy} onClick={onPlay} data-testid="studio-world-play">▶ {say("جرّب بالصفحة|Try it on the page|נסה בדף")}</button>
            <button type="button" className={btn} disabled={busy} onClick={onStop} data-testid="studio-world-stop">■ {say("رجّعهم لمكانهم|Put them back|החזר למקום")}</button>
          </div>
          <Select label={say("بتبلّش|It starts|מתחיל")} value={world.on ?? "view"} busy={busy} onPick={(on) => set({ on })} testId="studio-world-when" options={[
            ["view", say("لما يبيّن عالشاشة|Once it's seen|כשרואים אותו")], ["load", say("أول ما تفتح الصفحة|As the page opens|עם פתיחת הדף")],
            ["click", say("بكبسة عليه|On a click in it|בלחיצה")], ["hover", say("لما يجي الماوس فوقه|With the pointer over it|כשהעכבר מעליו")],
          ]} />
          <Select label={say("كيف بيبلّش|How it starts|איך מתחיל")} value={world.start ?? "drop"} busy={busy} onPick={(start) => set({ start })} testId="studio-world-start" options={[
            ["drop", say("بيوقعوا من فوق|They drop in from above|נופלים מלמעלה")], ["place", say("من مكانهم|From where they are|ממקומם")], ["burst", say("بيتفرقعوا من النص|They burst apart from the middle|מתפזרים מהמרכז")],
          ]} />
          <div className="text-[11px] text-white/55">{say("الجاذبية|Gravity|כבידה")}
            <div className="mt-1 flex gap-1" role="radiogroup">
              {WAYS.map(([k, icon, x, y]) => (
                <button key={k} type="button" role="radio" aria-checked={way === k} className={chip(way === k)} disabled={busy} onClick={() => set({ gx: x * (strength || 1), gy: y * (strength || 1) })} data-testid="studio-world-gravity" data-way={k}>{icon}</button>
              ))}
            </div>
          </div>
          {way !== "none" ? <Range label={say("قوّة الجاذبية|Gravity's strength|עוצמת הכבידה")} min={0.1} max={2} step={0.1} busy={busy} value={strength} onSave={(v) => { const n = Math.hypot(gx, gy) || 1; set({ gx: Math.round((gx / n) * v * 100) / 100, gy: Math.round((gy / n) * v * 100) / 100 }); }} testId="studio-world-strength" /> : null}
          <Check label={say("ميلان الموبايل بيحرّك الجاذبية|The phone's tilt moves gravity|הטיית הטלפון מזיזה את הכבידה")} on={world.tilt === true} busy={busy} onSet={(v) => set({ tilt: v || undefined })} testId="studio-world-tilt" />
          <Select label={say("الحيطان|Walls|קירות")} value={world.walls ?? "open"} busy={busy} onPick={(walls) => set({ walls })} testId="studio-world-walls" options={[
            ["open", say("أرض وجوانب (مفتوح من فوق)|Floor and sides (open at the top)|רצפה וצדדים")], ["box", say("صندوق مسكّر|A closed box|קופסה סגורה")],
            ["floor", say("أرض بس|A floor only|רצפה בלבד")], ["none", say("بلا (بيطلعوا برّا)|None (they fall out)|בלי")],
          ]} />
          <Range label={say("النطّ|Bounce|קפיציות")} min={0} max={0.95} step={0.05} busy={busy} value={world.bounce ?? 0.4} onSave={(v) => set({ bounce: v })} testId="studio-world-bounce" />
          <Range label={say("الاحتكاك|Friction|חיכוך")} min={0} max={1} step={0.05} busy={busy} value={world.friction ?? 0.1} onSave={(v) => set({ friction: v })} testId="studio-world-friction" />
          <Range label={say("مقاومة الهوا|Air|התנגדות אוויר")} min={0} max={0.2} step={0.005} busy={busy} value={world.air ?? 0.01} onSave={(v) => set({ air: v })} testId="studio-world-air" />
          <Range label={say("الهوا (شمال ↔ يمين)|Wind (← →)|רוח")} min={-1} max={1} step={0.05} busy={busy} value={world.wind ?? 0} onSave={(v) => set({ wind: v || undefined })} testId="studio-world-wind" />
          <Check label={say("الزبون بيقدر يمسكهم ويرميهم|Shoppers can grab and throw them|הקונה יכול לתפוס ולזרוק")} on={world.drag !== false} busy={busy} onSet={(v) => set({ drag: v })} testId="studio-world-drag" />
          <Select label={say("الماوس|The pointer|העכבר")} value={world.pointer ?? "none"} busy={busy} onPick={(pointer) => set({ pointer: pointer === "none" ? undefined : pointer })} testId="studio-world-pointer" options={[
            ["none", say("ما بيأثر|Does nothing|לא משפיע")], ["push", say("بيدفشهم|Pushes them away|דוחף")], ["pull", say("بيشدّهم|Pulls them in|מושך")],
          ]} />
          <Select label={say("كبسة جوّا|A click in it|לחיצה בתוכו")} value={world.click ?? "none"} busy={busy} onPick={(click) => set({ click: click === "none" ? undefined : click })} testId="studio-world-click" options={[
            ["none", say("ولا إشي|Nothing|כלום")], ["burst", say("بتفرقعهم من مكانها|Bursts them from there|מפזרת אותם")], ["flip", say("بتقلب الجاذبية|Turns gravity over|הופכת את הכבידה")],
          ]} />
          <Range label={say("بيرجع يبلّش كل (0 = لا)|Starts again every (0 = never)|מתחיל שוב כל")} min={0} max={30} step={1} unit="s" busy={busy} value={world.again ?? 0} onSave={(v) => set({ again: v || undefined })} testId="studio-world-again" />
          <div className="space-y-1 rounded-lg bg-white/[0.03] p-2">
            <div className="text-[11px] text-white/60">{say("ثبّتها كحركة بالمفاتيح (أخف: بلا فيزياء بالصفحة)|Bake into keyframes (lighter: no physics on the page)|אפה לקיפריימים")}</div>
            <Range label={say("المدة|Length|משך")} min={1} max={12} step={0.5} unit="s" busy={busy || baking === "busy"} value={seconds} onSave={setSeconds} testId="studio-world-bake-seconds" />
            <button type="button" className={btn} disabled={busy || baking === "busy" || !kids} onClick={() => void bake()} data-testid="studio-world-bake">{baking === "busy" ? say("عم تتثبّت…|Baking…|אופה…") : say("ثبّت|Bake|אפה")}</button>
            {baking === "none" ? <p className="text-[10px] text-amber-200/80">{say("ما تحرّك إشي، أو الصفحة ما ردّت.|Nothing moved, or the page didn't answer.|שום דבר לא זז.")}</p> : null}
          </div>
          <p className="text-[10px] leading-4 text-white/35">{say("كل عنصر جوّاه جسم: اختاره لتعدّل شكله ووزنه أو تعلّقه بحبل. ما بيتحرك للي طالب حركة أقل بجهازه.|Each element inside is a body: pick it to set its shape, weight or hang it from a rope. Still for whoever asked for less motion.|כל אלמנט בפנים הוא גוף.")}</p>
        </>
      )}
      <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => save(null)} data-testid="studio-world-off">{say("شيل العالم الفيزيائي|Remove the physics world|הסר את העולם הפיזיקלי")}</button>
    </div>
  );
}

export function BodyPanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: Ops }) {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const body = ((props.body as Body | undefined) ?? {}) as Body;
  const save = (patch: Partial<Body>) => {
    const next: Record<string, unknown> = { ...body, ...patch };
    for (const [k, v] of Object.entries(next)) if (v === undefined || v === false || (k === "shape" && v === "auto") || (k === "hang" && v === "none")) delete next[k];
    onOps(say("الجسم|The body|הגוף"), [{ op: "setProps", nodeId: node.id, props: { ...props, body: Object.keys(next).length ? next : undefined } }]);
  };
  return (
    <div className={box} data-testid="studio-body">
      <div className="text-xs font-medium text-white/70">{say("جسم بالعالم الفيزيائي|A body in the physics world|גוף בעולם הפיזיקלי")}</div>
      <Check label={say("برّا العالم (ما بيتحرك)|Left out of the world (stays still)|מחוץ לעולם")} on={body.out === true} busy={busy} onSet={(v) => save({ out: v || undefined })} testId="studio-body-out" />
      {body.out ? null : (
        <>
          <Select label={say("شكله|Its shape|צורתו")} value={body.shape ?? "auto"} busy={busy} onPick={(shape) => save({ shape })} testId="studio-body-shape" options={[
            ["auto", say("حسب شكله|As it looks|לפי המראה")], ["box", say("مربع|A box|קופסה")], ["circle", say("دائرة (بتتدحرج)|A circle (it rolls)|עיגול")],
          ]} />
          <Check label={say("ثابت بمكانه (الباقي بيصطدم فيه)|Fixed in place (the rest hit it)|קבוע במקום")} on={body.fixed === true} busy={busy} onSet={(v) => save({ fixed: v || undefined })} testId="studio-body-fixed" />
          {body.fixed ? null : (
            <>
              <Range label={say("وزنه|Its weight|משקלו")} min={0.2} max={5} step={0.1} busy={busy} value={body.mass ?? 1} onSave={(v) => save({ mass: v === 1 ? undefined : v })} testId="studio-body-mass" />
              <Range label={say("نطّه (فوق إعداد العالم)|Its bounce (over the world's)|הקפיציות שלו")} min={0} max={0.95} step={0.05} busy={busy} value={body.bounce ?? 0.4} onSave={(v) => save({ bounce: v })} testId="studio-body-bounce" />
              <Select label={say("معلّق|Hangs|תלוי")} value={body.hang ?? "none"} busy={busy} onPick={(hang) => save({ hang })} testId="studio-body-hang" options={[
                ["none", say("لا|No|לא")], ["rope", say("بحبل من فوق|From a rope above|על חבל")], ["spring", say("بزنبرك من فوق|From a spring above|על קפיץ")],
              ]} />
            </>
          )}
        </>
      )}
    </div>
  );
}
