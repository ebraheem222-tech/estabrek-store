/**
 * The new editor's panels for an element's look beyond its box (per screen: turns,
 * moves, size, see-through, a colour layer, its own shadow and glow, a free place over
 * its container) and for how it moves (ready-made motions, then each part: coming in,
 * scroll, loop, pointer, animated layer, phones). Sliders show their value in the frame
 * while they move and save when let go, so undo has one step per change.
 */
import { useState } from "react";
import type { PageDraftOp, PageTreeNode, TreeScreen } from "../api/pages.api";
import { tr } from "../lib/words";
import { styleOp } from "./columns";
import {
  ANCHOR_AT, EASE_LABEL, ENTER_LABEL, FX_LABEL, HOLDS, HOVER_LABEL, LOOP_LABEL, WORDY,
  drawingHasLines, drawingMorphs, hasPreset, lookOf, motionOp, placedOn, presetsFor, previewOf, shownLook, withPreset,
  type Motion, type MotionKeys,
} from "./look";
import { Choice, ColourPick, NumberField, SCREEN_LABEL } from "./StudioTreePanels";

type Ops = (label: string, ops: PageDraftOp[]) => void;
type Preview = (vars: Record<string, string | number>) => void;
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
const control = "mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 10 ? 2 : 1));

/** A slider that shows its value, previews while it moves, and saves when it's let go. */
export function Range({ label, value, min, max, step = 1, unit = "", busy, onLive, onSave, testId }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; busy: boolean;
  onLive?: (v: number) => void; onSave: (v: number) => void; testId?: string;
}) {
  const [v, setV] = useState(value);
  const [was, setWas] = useState(value);
  if (was !== value) {
    setWas(value);
    setV(value);
  }
  const commit = () => v !== value && onSave(v);
  return (
    <label className="block text-[11px] text-white/55">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span dir="ltr" className="tabular-nums text-white/75">{fmt(v)}{unit}</span>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={v} disabled={busy}
        onChange={(e) => {
          const n = Number(e.target.value);
          setV(n);
          onLive?.(n);
        }}
        onPointerUp={commit} onKeyUp={commit} onBlur={commit}
        className="mt-1 w-full accent-[#c86b98]"
        data-testid={testId}
      />
    </label>
  );
}

function Pick({ label, value, options, busy, onPick, testId }: { label: string; value: string; options: Array<[string, string]>; busy: boolean; onPick: (v: string) => void; testId?: string }) {
  return (
    <label className="block text-[11px] text-white/55">
      {label}
      <select className={control} disabled={busy} value={value} onChange={(e) => onPick(e.target.value)} data-testid={testId}>
        {options.map(([k, name]) => <option key={k} value={k}>{name}</option>)}
      </select>
    </label>
  );
}

function Part({ title, open, children, testId }: { title: string; open?: boolean; children: React.ReactNode; testId?: string }) {
  return (
    <details className="group rounded-lg border border-white/[0.06] px-2 py-1.5" open={open} data-testid={testId}>
      <summary className="cursor-pointer select-none text-[11px] font-medium text-white/70">{title}</summary>
      <div className="mt-2 space-y-2.5">{children}</div>
    </details>
  );
}

const toggleRow = (label: string, on: boolean, busy: boolean, flip: (on: boolean) => void, testId?: string) => (
  <label className="flex items-center justify-between gap-2 text-xs">
    <span className="text-white/75">{label}</span>
    <input type="checkbox" disabled={busy} checked={on} onChange={(e) => flip(e.target.checked)} data-testid={testId} />
  </label>
);

/* -------------------------------------------------------------------- look */

export function LookPanel({ node, screen, busy, onOps, onPreview }: { node: PageTreeNode; screen: TreeScreen; busy: boolean; onOps: Ops; onPreview: Preview }) {
  const n = (k: string, def: number) => (typeof shownLook(node, screen, k) === "number" ? (shownLook(node, screen, k) as number) : def);
  const obj = <T,>(k: string) => (shownLook(node, screen, k) && typeof shownLook(node, screen, k) === "object" ? (shownLook(node, screen, k) as T) : null);
  const save = (label: string, patch: Record<string, unknown>) => onOps(label, [styleOp(node, screen, patch)]);
  const turn = (key: string, label: string, min: number, max: number, def: number, opts: { step?: number; unit?: string; scale?: number } = {}) => {
    const k = opts.scale ?? 1;
    return (
      <Range
        label={label} min={min} max={max} step={opts.step} unit={opts.unit} busy={busy} value={Math.round(n(key, def) * k * 100) / 100}
        onLive={(v) => onPreview(previewOf(key, v / k))}
        onSave={(v) => save(tr("الشكل", "Look"), { [key]: v / k === def ? null : v / k })}
        testId={`studio-look-${key}`}
      />
    );
  };
  const overlay = obj<{ color: string; to?: string; angle?: number; opacity: number; blend?: string }>("overlay");
  const shade = obj<{ x: number; y: number; blur: number; color: string; follow?: boolean }>("shade");
  const glow = obj<{ color: string; size: number }>("glow");
  const place = placedOn(node, screen);
  const own = lookOf(node, screen);
  const turned = ["rotateX", "rotateY", "rotateZ", "perspective", "scale", "moveX", "moveY", "origin", "opacity"].some((k) => own[k] !== undefined);
  return (
    <div className="space-y-2 rounded-xl border border-white/[0.08] p-3" data-testid="studio-look">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/70">{tr("الشكل والمكان", "Look and place")}</div>
        <span className="text-[10px] text-white/40">{SCREEN_LABEL[screen]()}</span>
      </div>
      <Part title={tr("الدوران والحجم والشفافية", "Turn, size and see-through")} open>
        {turn("rotateX", tr("دوران X (لقدّام ولورا)", "Turn X (tip forward and back)"), -180, 180, 0, { unit: "°" })}
        {turn("rotateY", tr("دوران Y (يمين وشمال)", "Turn Y (left and right)"), -180, 180, 0, { unit: "°" })}
        {turn("rotateZ", tr("دوران Z (مكانه)", "Turn Z (in place)"), -180, 180, 0, { unit: "°" })}
        {turn("perspective", tr("عمق المنظور (أصغر = أقوى)", "Perspective (smaller = stronger)"), 200, 4000, 1200, { step: 50, unit: "px" })}
        {turn("scale", tr("الحجم", "Size"), 10, 300, 1, { scale: 100, step: 1, unit: "%" })}
        {turn("moveX", tr("تحريك يمين وشمال", "Move sideways"), -400, 400, 0, { unit: "px" })}
        {turn("moveY", tr("تحريك فوق وتحت", "Move up and down"), -400, 400, 0, { unit: "px" })}
        {turn("opacity", tr("الشفافية (100 = واضح كله)", "See-through (100 = fully seen)"), 0, 100, 1, { scale: 100, unit: "%" })}
        <Choice
          label={tr("بيدور حوالين", "Turns around")} value={String(shownLook(node, screen, "origin") ?? "center")} busy={busy}
          options={[["center", tr("النص", "Its middle")], ["top", tr("فوق", "Its top")], ["bottom", tr("تحت", "Its bottom")]]}
          onPick={(v) => save(tr("الشكل", "Look"), { origin: v === "center" ? null : v })}
        />
        {turned ? (
          <button type="button" className={btn} disabled={busy} onClick={() => save(tr("الشكل", "Look"), { rotateX: null, rotateY: null, rotateZ: null, perspective: null, scale: null, moveX: null, moveY: null, origin: null, opacity: null })} data-testid="studio-look-reset">
            {tr("رجوع لشكله العادي", "Back to its plain look")}
          </button>
        ) : null}
      </Part>

      <Part title={tr("طبقة لون فوقه", "A colour layer over it")} open={Boolean(overlay)} testId="studio-look-overlay">
        {toggleRow(tr("طبقة لون", "Colour layer"), Boolean(overlay), busy, (on) => save(tr("طبقة لون", "Colour layer"), { overlay: on ? { color: "#000000", opacity: 0.35 } : null }), "studio-overlay-on")}
        {overlay ? (
          <>
            <ColourPick label={tr("اللون", "Colour")} value={overlay.color} busy={busy} onPick={(c) => save(tr("طبقة لون", "Colour layer"), { overlay: c ? { ...overlay, color: c } : null })} />
            <ColourPick label={tr("لون تاني (تدرّج)، أو بلا", "A second colour (gradient), or none")} value={overlay.to ?? ""} busy={busy} onPick={(c) => save(tr("طبقة لون", "Colour layer"), { overlay: { ...overlay, to: c ?? undefined } })} />
            {overlay.to ? <Range label={tr("اتجاه التدرّج", "Gradient direction")} min={0} max={360} step={5} unit="°" busy={busy} value={overlay.angle ?? 180} onSave={(v) => save(tr("طبقة لون", "Colour layer"), { overlay: { ...overlay, angle: v } })} /> : null}
            <Range label={tr("قوّتها", "Its strength")} min={0} max={100} unit="%" busy={busy} value={Math.round(overlay.opacity * 100)} onLive={(v) => onPreview(previewOf("overlayOpacity", v / 100))} onSave={(v) => save(tr("طبقة لون", "Colour layer"), { overlay: { ...overlay, opacity: v / 100 } })} testId="studio-overlay-opacity" />
            <Pick
              label={tr("طريقة الدمج", "How it mixes")} value={overlay.blend ?? "normal"} busy={busy}
              options={[["normal", tr("عادي", "Normal")], ["multiply", tr("بيغمّق", "Darkens (multiply)")], ["screen", tr("بيفتّح", "Lightens (screen)")], ["overlay", tr("تباين", "Contrast (overlay)")], ["soft-light", tr("ضوء ناعم", "Soft light")], ["color", tr("بيلوّن", "Colours (color)")], ["luminosity", tr("أبيض وأسود", "Black and white")]]}
              onPick={(v) => save(tr("طبقة لون", "Colour layer"), { overlay: { ...overlay, blend: v === "normal" ? undefined : v } })}
            />
          </>
        ) : null}
      </Part>

      <Part title={tr("الظل والتوهج", "Shadow and glow")} open={Boolean(shade || glow)}>
        {toggleRow(tr("ظل خاص", "Its own shadow"), Boolean(shade), busy, (on) => save(tr("الظل", "Shadow"), { shade: on ? { x: 0, y: 16, blur: 40, color: "#0000004d" } : null }), "studio-shade-on")}
        {shade ? (
          <>
            <Range label={tr("لليمين والشمال", "Sideways")} min={-100} max={100} unit="px" busy={busy} value={shade.x} onSave={(v) => save(tr("الظل", "Shadow"), { shade: { ...shade, x: v } })} />
            <Range label={tr("لتحت", "Down")} min={-100} max={100} unit="px" busy={busy} value={shade.y} onSave={(v) => save(tr("الظل", "Shadow"), { shade: { ...shade, y: v } })} />
            <Range label={tr("النعومة", "Softness")} min={0} max={200} unit="px" busy={busy} value={shade.blur} onSave={(v) => save(tr("الظل", "Shadow"), { shade: { ...shade, blur: v } })} />
            <ColourPick label={tr("لون الظل", "Shadow colour")} value={shade.color} busy={busy} onPick={(c) => c && save(tr("الظل", "Shadow"), { shade: { ...shade, color: c } })} />
            {toggleRow(tr("حوالين الشكل نفسه (صورة مقصوصة أو كلام)", "Around the shape itself (a cut-out picture, words)"), shade.follow === true, busy, (on) => save(tr("الظل", "Shadow"), { shade: { ...shade, follow: on || undefined } }))}
          </>
        ) : null}
        {toggleRow(tr("توهّج", "Glow"), Boolean(glow), busy, (on) => save(tr("التوهج", "Glow"), { glow: on ? { color: "accent", size: 24 } : null }), "studio-glow-on")}
        {glow ? (
          <>
            <ColourPick label={tr("لون التوهج", "Glow colour")} value={glow.color} busy={busy} onPick={(c) => c && save(tr("التوهج", "Glow"), { glow: { ...glow, color: c } })} />
            <Range label={tr("حجمه", "Its size")} min={0} max={120} unit="px" busy={busy} value={glow.size} onSave={(v) => save(tr("التوهج", "Glow"), { glow: { ...glow, size: v } })} />
          </>
        ) : null}
      </Part>

      <Part title={tr("مكان حر فوق الحاوية", "A free place over its container")} open={Boolean(place)} testId="studio-look-place">
        <p className="text-[11px] leading-5 text-white/40">{tr("متل نص وزر فوق فيديو. بتقدر تسحبه بالصفحة كمان.", "Like words and a button over a clip. It can also be dragged on the page.")}</p>
        {toggleRow(tr("فوق اللي جنبه، بمكان حر", "Over what's beside it, placed freely"), Boolean(place), busy, (on) => save(tr("المكان", "Place"), { layer: on ? { x: 50, y: 50, anchor: "center" } : screen === "base" ? null : false }), "studio-place-on")}
        {place ? (
          <>
            <Range label={tr("من أول السطر", "From the line start")} min={0} max={100} unit="%" busy={busy} value={place.x} onSave={(v) => save(tr("المكان", "Place"), { layer: { ...place, x: v } })} testId="studio-place-x" />
            <Range label={tr("من فوق", "From the top")} min={0} max={100} unit="%" busy={busy} value={place.y} onSave={(v) => save(tr("المكان", "Place"), { layer: { ...place, y: v } })} testId="studio-place-y" />
            <div className="text-[11px] text-white/55">
              {tr("أي نقطة منه بتقعد هناك", "Which point of it sits there")}
              <div className="mt-1 grid w-24 grid-cols-3 gap-1" role="group" aria-label={tr("أي نقطة منه بتقعد هناك", "Which point of it sits there")}>
                {Object.keys(ANCHOR_AT).map((a) => (
                  <button key={a} type="button" disabled={busy} aria-pressed={(place.anchor ?? "center") === a} aria-label={a} onClick={() => save(tr("المكان", "Place"), { layer: { ...place, anchor: a } })} className={`h-6 rounded ${(place.anchor ?? "center") === a ? "bg-accent-500/60" : "bg-white/[0.08] hover:bg-white/[0.14]"}`} data-anchor={a} />
                ))}
              </div>
            </div>
            <NumberField label={tr("مين فوق مين (أكبر = فوق)", "Which goes on top (bigger = on top)")} value={typeof shownLook(node, screen, "z") === "number" ? (shownLook(node, screen, "z") as number) : undefined} min={-10} max={50} onSave={(v) => save(tr("المكان", "Place"), { z: v })} />
          </>
        ) : null}
      </Part>
      <p className="text-[10px] leading-4 text-white/35">{tr("بينحفظ للشاشة المعروضة:", "Kept for the screen shown:")} {SCREEN_LABEL[screen]()}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ motion */

const KEY_FIELDS: Array<[keyof MotionKeys, () => string, number, number, number]> = [
  ["rx", () => tr("دوران X", "Turn X"), -180, 180, 1],
  ["ry", () => tr("دوران Y", "Turn Y"), -180, 180, 1],
  ["rz", () => tr("دوران Z", "Turn Z"), -360, 360, 1],
  ["y", () => tr("فوق وتحت", "Up and down"), -1000, 1000, 1],
  ["x", () => tr("يمين وشمال", "Sideways"), -1000, 1000, 1],
  ["scale", () => tr("الحجم %", "Size %"), 10, 400, 100],
  ["opacity", () => tr("الشفافية %", "See-through %"), 0, 100, 100],
];

/** One moment of a scroll animation: each value is added to the element's own look. */
function KeysFields({ title, keys, busy, onSave }: { title: string; keys: MotionKeys | undefined; busy: boolean; onSave: (k: MotionKeys) => void }) {
  return (
    <div>
      <div className="text-[11px] text-white/55">{title}</div>
      <div className="mt-1 grid grid-cols-3 gap-1">
        {KEY_FIELDS.map(([k, label, min, max, mul]) => (
          <NumberField key={k} label={label()} min={min} max={max} value={keys?.[k] === undefined ? undefined : Math.round((keys[k] as number) * mul)} onSave={(v) => onSave({ ...(keys ?? {}), [k]: v === null ? undefined : v / mul })} />
        ))}
      </div>
    </div>
  );
}

export function MotionPanel({ node, busy, onOps, onPlay }: { node: PageTreeNode; busy: boolean; onOps: Ops; onPlay: () => void }) {
  const m = (node.motion ?? {}) as Motion;
  const set = (label: string, next: Motion | null) => onOps(label, [motionOp(node, next)]);
  const part = <K extends keyof Motion>(k: K, v: Motion[K] | undefined) => set(tr("الحركة", "Motion"), { ...m, [k]: v });
  const none: [string, string] = ["", tr("بلا", "None")];
  const enter = m.enter;
  const scroll = m.scroll;
  const loop = m.loop;
  const hover = m.hover;
  const fx = m.fx;
  const holds = HOLDS.has(node.type);
  // Kinds that suit the element, and whatever it already has (so the list always shows it).
  const enterKinds = Object.keys(ENTER_LABEL).filter((k) => k === m.enter?.kind || ((k !== "words" || WORDY.has(node.type)) && (k !== "draw" || drawingHasLines(node))));
  const loopKinds = Object.keys(LOOP_LABEL).filter((k) => k === m.loop?.kind || ((k !== "morph" || drawingMorphs(node)) && (k !== "dash" || drawingHasLines(node))));
  const moves = Object.keys(m).some((k) => k !== "phone");
  return (
    <div className="space-y-2 rounded-xl border border-white/[0.08] p-3" data-testid="studio-motion">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/70">{tr("الحركة", "Motion")}</div>
        <button type="button" className={btn} disabled={busy || !moves} onClick={onPlay} data-testid="studio-motion-play">▶ {tr("جرّب بالصفحة", "Try it on the page")}</button>
      </div>
      <div className="grid grid-cols-2 gap-1" role="group" aria-label={tr("حركات جاهزة", "Ready motions")} data-testid="studio-motion-presets">
        {presetsFor(node.type, node).map((p) => {
          const on = hasPreset(m, p);
          return (
            <button key={p.key} type="button" disabled={busy} aria-pressed={on} onClick={() => set(p.label(), withPreset(m, p))} className={`truncate rounded-lg border px-1.5 py-1.5 text-start text-[11px] ${on ? "border-accent-400/70 bg-accent-500/15 text-white" : "border-white/[0.08] text-white/75 hover:bg-white/[0.05]"} disabled:opacity-40`} data-preset={p.key} title={p.label()}>
              {p.label()}
            </button>
          );
        })}
      </div>

      <Part title={tr("كيف بيدخل", "How it comes in")} open={Boolean(enter)}>
        <Pick label={tr("الدخول", "Coming in")} value={enter?.kind ?? ""} busy={busy} options={[none, ...enterKinds.map((k): [string, string] => [k, ENTER_LABEL[k]()])]} onPick={(v) => part("enter", v ? { ...(enter ?? {}), kind: v } : undefined)} testId="studio-enter-kind" />
        {enter ? (
          <>
            <Range label={tr("المدة", "Duration")} min={0.2} max={3} step={0.1} unit="s" busy={busy} value={enter.duration ?? 0.8} onSave={(v) => part("enter", { ...enter, duration: v })} />
            <Range label={tr("بيستنى قبل", "Waits first")} min={0} max={3} step={0.1} unit="s" busy={busy} value={enter.delay ?? 0} onSave={(v) => part("enter", { ...enter, delay: v || undefined })} />
            {["up", "down", "start", "end"].includes(enter.kind) ? <Range label={tr("المسافة", "Distance")} min={0} max={200} unit="px" busy={busy} value={enter.distance ?? 40} onSave={(v) => part("enter", { ...enter, distance: v })} /> : null}
            {holds || enter.kind === "words" ? <Range label={tr("واحد ورا التاني كل", "One after another every")} min={0} max={0.5} step={0.02} unit="s" busy={busy} value={enter.stagger ?? 0} onSave={(v) => part("enter", { ...enter, stagger: v || undefined })} /> : null}
            <Pick label={tr("نوع الحركة", "Kind of motion")} value={enter.ease ?? "smooth"} busy={busy} options={Object.keys(EASE_LABEL).map((k): [string, string] => [k, EASE_LABEL[k]()])} onPick={(v) => part("enter", { ...enter, ease: v })} />
          </>
        ) : null}
      </Part>

      <Part title={tr("مع السكرول", "With the scroll")} open={Boolean(scroll)}>
        <Choice
          label={tr("السكرول", "Scroll")} value={scroll?.kind ?? ""} busy={busy} testId="studio-scroll-kind"
          options={[["", tr("بلا", "None")], ["parallax", tr("أبطأ أو أسرع منه", "Slower or faster than it")], ["keys", tr("من شكل لشكل", "From one look to another")]]}
          onPick={(v) => part("scroll", v === "parallax" ? { kind: "parallax", speed: 0.4 } : v === "keys" ? { kind: "keys", from: { rx: 28, scale: 0.88, y: 60 }, to: { rx: 0, scale: 1, y: 0 }, start: 100, end: 35 } : undefined)}
        />
        {scroll?.kind === "parallax" ? <Range label={tr("السرعة (سالب = بعكس السكرول)", "Speed (minus = against the scroll)")} min={-1} max={1} step={0.1} busy={busy} value={scroll.speed ?? 0.4} onSave={(v) => part("scroll", { ...scroll, speed: v })} /> : null}
        {scroll?.kind === "keys" ? (
          <>
            <KeysFields title={tr("لما يطلع من تحت الشاشة", "As it comes up the screen")} keys={scroll.from} busy={busy} onSave={(k) => part("scroll", { ...scroll, from: k })} />
            <KeysFields title={tr("لما يوصل مكانه", "When it reaches its place")} keys={scroll.to} busy={busy} onSave={(k) => part("scroll", { ...scroll, to: k })} />
            <Range label={tr("بيبلّش لما يكون أعلاه على", "Starts when its top is at")} min={0} max={100} unit="%" busy={busy} value={scroll.start ?? 90} onSave={(v) => part("scroll", { ...scroll, start: v })} />
            <Range label={tr("بيخلص لما يكون أعلاه على", "Ends when its top is at")} min={0} max={100} unit="%" busy={busy} value={scroll.end ?? 30} onSave={(v) => part("scroll", { ...scroll, end: v })} />
            <p className="text-[10px] leading-4 text-white/35">{tr("النسبة من فوق الشاشة. القيم بتنزاد على شكله العادي.", "Measured from the top of the screen. The values add to its own look.")}</p>
          </>
        ) : null}
      </Part>

      <Part title={tr("حركة مستمرة", "A loop")} open={Boolean(loop)}>
        <Pick label={tr("الحركة", "Motion")} value={loop?.kind ?? ""} busy={busy} options={[none, ...loopKinds.map((k): [string, string] => [k, LOOP_LABEL[k]()])]} onPick={(v) => part("loop", v ? { ...(loop ?? {}), kind: v } : undefined)} testId="studio-loop-kind" />
        {loop ? (
          <>
            <Range label={tr("مدة اللفة", "One round takes")} min={0.5} max={12} step={0.5} unit="s" busy={busy} value={loop.duration ?? 3} onSave={(v) => part("loop", { ...loop, duration: v })} />
            <Range label={tr("قوّتها", "Its strength")} min={0.2} max={3} step={0.1} busy={busy} value={loop.amount ?? 1} onSave={(v) => part("loop", { ...loop, amount: v })} />
          </>
        ) : null}
      </Part>

      <Part title={tr("مع الماوس", "With the mouse")} open={Boolean(hover)}>
        <Pick label={tr("لما الماوس فوقه", "With the mouse over it")} value={hover?.kind ?? ""} busy={busy} options={[none, ...Object.keys(HOVER_LABEL).filter((k) => k !== "zoom" || node.type === "image" || node.type === "video").map((k): [string, string] => [k, HOVER_LABEL[k]()])]} onPick={(v) => part("hover", v ? { ...(hover ?? {}), kind: v } : undefined)} testId="studio-hover-kind" />
        {hover && ["lift", "grow", "tilt", "magnetic"].includes(hover.kind) ? <Range label={tr("قوّتها", "Its strength")} min={0.2} max={3} step={0.1} busy={busy} value={hover.amount ?? 1} onSave={(v) => part("hover", { ...hover, amount: v })} /> : null}
      </Part>

      <Part title={tr("طبقة متحركة", "An animated layer")} open={Boolean(fx)}>
        <Pick label={tr("الطبقة", "Layer")} value={fx?.kind ?? ""} busy={busy} options={[none, ...Object.keys(FX_LABEL).map((k): [string, string] => [k, FX_LABEL[k]()])]} onPick={(v) => part("fx", v ? { ...(fx ?? {}), kind: v } : undefined)} testId="studio-fx-kind" />
        {fx ? (
          <>
            <Range label={tr("السرعة", "Speed")} min={0.2} max={5} step={0.1} busy={busy} value={fx.speed ?? 1} onSave={(v) => part("fx", { ...fx, speed: v })} />
            {fx.kind !== "grain" ? <ColourPick label={tr("اللون", "Colour")} value={fx.color ?? ""} busy={busy} onPick={(c) => part("fx", { ...fx, color: c ?? undefined })} /> : null}
            {fx.kind === "gradient" ? <ColourPick label={tr("اللون التاني", "The second colour")} value={fx.to ?? ""} busy={busy} onPick={(c) => part("fx", { ...fx, to: c ?? undefined })} /> : null}
          </>
        ) : null}
      </Part>

      <Choice
        label={tr("على الموبايل", "On a phone")} value={m.phone ?? "same"} busy={busy}
        options={[["same", tr("متل الكمبيوتر", "As on a computer")], ["lite", tr("الدخول بس", "Coming in only")], ["off", tr("بلا حركة", "No motion")]]}
        onPick={(v) => part("phone", v === "same" ? undefined : (v as Motion["phone"]))}
      />
      {moves ? <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => set(tr("شيل الحركة", "Remove the motion"), null)} data-testid="studio-motion-clear">{tr("شيل كل الحركة", "Remove all motion")}</button> : null}
      <p className="text-[10px] leading-4 text-white/35">{tr("اللي عنده «قلّل الحركة» بجهازه بيشوف كل إشي ثابت.", "Whoever has “reduce motion” on their device sees everything still.")}</p>
    </div>
  );
}
