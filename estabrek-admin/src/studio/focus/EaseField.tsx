/**
 * A motion's curve (docs/cms-big-engine-plan.ar.md H): a named one, a cubic-bezier with its two handles dragged on
 * the drawing, or a spring (mass, stiffness, damping). The drawing shows the curve over time; a dot runs it.
 * Writes the text shared/ease.ts reads (the backend checks it, the shop plays it).
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { EASE_FAMILIES, EASE_WAYS, SPRING_LIMITS, easeFn, readEase, writeEase, type Ease } from "../../../../shared/ease";
import { Range } from "../LookPanels";
import { say } from "../say";

const FAMILY_WORD: Record<string, string> = {
  power1: "ناعم|Gentle|עדין", power2: "عادي|Even|רגיל", power3: "قوي|Strong|חזק", power4: "أقوى|Stronger|חזק יותר",
  sine: "موجي|Sine|סינוס", expo: "أُسّي|Expo|מעריכי", circ: "دائري|Circle|מעגלי", back: "يرجع شوي|Back|חוזר מעט",
  elastic: "مطّاطي|Elastic|גמיש", bounce: "نطّاط|Bounce|קופץ",
};
const WAY_WORD: Record<string, string> = { in: "بداية|in|בהתחלה", out: "نهاية|out|בסוף", inOut: "الطرفين|in-out|בשני הקצוות" };
const W = 160, H = 120, PAD = 22;

/** The curve drawn over time (x) with its value (y); a spring may go past the top line. */
function curvePath(fn: (t: number) => number) {
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    pts.push(`${i ? "L" : "M"}${(PAD + t * (W - 2 * PAD)).toFixed(1)} ${(H - PAD - fn(t) * (H - 2 * PAD)).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function EaseField({ label, value, busy, onSave, testId = "studio-ease" }: { label: string; value: string | undefined; busy: boolean; onSave: (text: string) => void; testId?: string }) {
  const read = readEase(value) ?? { kind: "named", name: "power2.inOut" } as Ease;
  const [ease, setEase] = useState<Ease>(read);
  const [was, setWas] = useState(value);
  if (was !== value) {
    setWas(value);
    setEase(read);
  }
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<0 | 1 | null>(null);
  const [run, setRun] = useState(0);
  // A dot runs along the curve once when it changes.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 900);
      setRun(t);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [writeEase(ease)]);
  const fn = easeFn(ease);
  const save = (e: Ease) => {
    setEase(e);
    if (!busy) onSave(writeEase(e));
  };
  const kind = ease.kind;
  const toSvg = (x: number, y: number) => ({ x: PAD + x * (W - 2 * PAD), y: H - PAD - y * (H - 2 * PAD) });
  const fromPointer = (e: ReactPointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W, sy = ((e.clientY - r.top) / r.height) * H;
    return { x: Math.min(1, Math.max(0, (sx - PAD) / (W - 2 * PAD))), y: Math.min(3, Math.max(-2, (H - PAD - sy) / (H - 2 * PAD))) };
  };
  const bez = ease.kind === "bezier" ? ease.p : null;
  return (
    <div className="space-y-2" data-testid={testId} data-ease={writeEase(ease)}>
      <div className="text-[11px] text-white/55">{label}</div>
      <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label={label}>
        {(["named", "bezier", "spring"] as const).map((k) => (
          <button
            key={k} type="button" role="radio" aria-checked={kind === k} disabled={busy}
            className={`rounded-lg px-1.5 py-1 text-[11px] ${kind === k ? "bg-accent-500/30 text-white" : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1]"}`}
            onClick={() => save(k === "named" ? { kind: "named", name: "power2.inOut" } : k === "bezier" ? { kind: "bezier", p: [0.25, 0.1, 0.25, 1] } : { kind: "spring", mass: 1, stiffness: 170, damping: 14 })}
            data-testid={`${testId}-${k}`}
          >
            {k === "named" ? say("جاهز|Ready|מוכן") : k === "bezier" ? say("منحنى خاص|Own curve|עקומה משלך") : say("نابض|Spring|קפיץ")}
          </button>
        ))}
      </div>
      <svg
        ref={svg} viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none rounded-lg bg-white/[0.04]" role="img" aria-label={say("المنحنى|The curve|העקומה")}
        onPointerMove={(e) => {
          if (drag.current === null || !bez) return;
          const p = fromPointer(e);
          const next: [number, number, number, number] = [...bez];
          next[drag.current * 2] = Math.round(p.x * 100) / 100;
          next[drag.current * 2 + 1] = Math.round(p.y * 100) / 100;
          setEase({ kind: "bezier", p: next });
        }}
        onPointerUp={() => {
          if (drag.current === null) return;
          drag.current = null;
          save(ease);
        }}
        data-testid={`${testId}-curve`}
      >
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(255,255,255,0.15)" />
        <line x1={PAD} y1={PAD} x2={W - PAD} y2={PAD} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
        <path d={curvePath(fn)} fill="none" stroke="rgb(168,140,255)" strokeWidth={2} />
        {bez ? (
          <>
            {[0, 1].map((i) => {
              const h = toSvg(bez[i * 2], bez[i * 2 + 1]), end = i ? toSvg(1, 1) : toSvg(0, 0);
              return (
                <g key={i}>
                  <line x1={end.x} y1={end.y} x2={h.x} y2={h.y} stroke="rgba(255,255,255,0.4)" />
                  <circle
                    cx={h.x} cy={h.y} r={6} fill="white" stroke="rgb(168,140,255)" strokeWidth={2} className="cursor-grab"
                    onPointerDown={(e) => {
                      if (busy) return;
                      e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
                      drag.current = i as 0 | 1;
                    }}
                    data-testid={`${testId}-handle`}
                  />
                </g>
              );
            })}
          </>
        ) : null}
        <circle cx={toSvg(run, 0).x} cy={toSvg(0, fn(run)).y} r={3.5} fill="rgb(255,140,190)" />
      </svg>
      {ease.kind === "named" ? (
        <div className="grid grid-cols-2 gap-1">
          <select className="rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white" disabled={busy} value={ease.name === "none" ? "none" : ease.name.split(".")[0]} onChange={(e) => save({ kind: "named", name: e.target.value === "none" ? "none" : `${e.target.value}.${ease.name.includes(".") ? ease.name.split(".")[1] : "inOut"}` })} data-testid={`${testId}-family`}>
            <option value="none">{say("ثابت السرعة|Steady|קבוע")}</option>
            {EASE_FAMILIES.map((f) => <option key={f} value={f}>{say(FAMILY_WORD[f])}</option>)}
          </select>
          <select className="rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white disabled:opacity-40" disabled={busy || ease.name === "none"} value={ease.name.split(".")[1] ?? "inOut"} onChange={(e) => save({ kind: "named", name: `${ease.name.split(".")[0]}.${e.target.value}` })} data-testid={`${testId}-way`}>
            {EASE_WAYS.map((w) => <option key={w} value={w}>{say(WAY_WORD[w])}</option>)}
          </select>
        </div>
      ) : null}
      {ease.kind === "bezier" ? <p className="font-mono text-[10px] text-white/40" dir="ltr">{writeEase(ease)}</p> : null}
      {ease.kind === "spring" ? (
        <div className="space-y-1">
          <Range label={say("الكتلة|Mass|מסה")} min={SPRING_LIMITS.mass[0]} max={SPRING_LIMITS.mass[1]} step={0.1} busy={busy} value={ease.mass} onSave={(v) => save({ ...ease, mass: v })} testId={`${testId}-mass`} />
          <Range label={say("الصلابة|Stiffness|קשיחות")} min={SPRING_LIMITS.stiffness[0]} max={SPRING_LIMITS.stiffness[1]} step={1} busy={busy} value={ease.stiffness} onSave={(v) => save({ ...ease, stiffness: v })} testId={`${testId}-stiffness`} />
          <Range label={say("الاحتكاك|Damping|ריסון")} min={SPRING_LIMITS.damping[0]} max={SPRING_LIMITS.damping[1]} step={0.5} busy={busy} value={ease.damping} onSave={(v) => save({ ...ease, damping: v })} testId={`${testId}-damping`} />
        </div>
      ) : null}
    </div>
  );
}
