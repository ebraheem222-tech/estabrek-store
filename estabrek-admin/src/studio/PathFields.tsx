/**
 * A path for an element's keyframes (keys.path): the shape it travels over the animation's time, its size, how
 * many times it goes round or up and down, where its own place is on it, and whether it turns to face the way it
 * goes. The little drawing is the same curve the shop plays (pageTree/motionPath.ts), with a dot at its place.
 */
import { CLOSED_PATHS, PATH_KINDS, PATH_TURNS, pathD, pathTrack, type PathKind, type PathSpec } from "../../../estabrek-storefront/src/pageTree/motionPath";
import { adminLang } from "../lib/lang";
import { Range } from "./LookPanels";
import { say } from "./say";

const sel = "mt-1 w-full rounded-lg border border-white/10 bg-surface-925 px-2 py-1 text-xs text-white";
export const PATH_NAME: Record<PathKind, () => string> = {
  arc: () => say("قوس|An arc|קשת"),
  wave: () => say("موجة|A wave|גל"),
  s: () => say("حرف S|An S curve|עקומת S"),
  zigzag: () => say("زكزاك|A zigzag|זיגזג"),
  loop: () => say("حلقة|A loop|לולאה"),
  eight: () => say("ثمانية|A figure of eight|שמונה"),
  spiral: () => say("لولب|A spiral|ספירלה"),
};
/** Shapes that go round or up and down a number of times. */
const TURNING: ReadonlySet<PathKind> = new Set(["wave", "zigzag", "loop", "eight", "spiral"]);
/** The path a fresh pick starts from. */
export const starterPath = (kind: PathKind): PathSpec => ({ kind, w: kind === "loop" || kind === "eight" || kind === "spiral" ? 120 : 200, h: kind === "loop" || kind === "spiral" ? 120 : 60 });

/** The curve drawn small: fitted to its box, a dot where the element's own place is. */
function PathDrawing({ path }: { path: PathSpec }) {
  const rtl = adminLang() !== "en";
  const track = pathTrack({ ...path, turn: false }, rtl);
  const pts = Array.from({ length: 65 }, (_, i) => track(i / 64));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const pad = 12;
  const [x0, x1, y0, y1] = [Math.min(...xs, 0) - pad, Math.max(...xs, 0) + pad, Math.min(...ys, 0) - pad, Math.max(...ys, 0) + pad];
  const first = pts[0];
  return (
    <svg viewBox={`${x0} ${y0} ${Math.max(1, x1 - x0)} ${Math.max(1, y1 - y0)}`} className="h-24 w-full rounded-lg bg-white/4" preserveAspectRatio="xMidYMid meet" role="img" aria-label={say("رسمة المسار|The path drawn|ציור המסלול")} data-testid="keys-path-drawing">
      <path d={pathD(path, rtl)} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" className="text-accent-300" />
      {/* Where it begins (a ring), and its own place (a dot). */}
      <circle cx={first.x} cy={first.y} r={4} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="text-white/60" />
      <circle cx={0} cy={0} r={4} className="fill-white" />
    </svg>
  );
}

export function PathFields({ path, busy, onSave }: { path: PathSpec | undefined; busy: boolean; onSave: (path: PathSpec | undefined) => void }) {
  const set = (patch: Partial<PathSpec>) => path && onSave({ ...path, ...patch });
  return (
    <div className="space-y-2 rounded-lg border border-white/8 p-2" data-testid="keys-path">
      <label className="block text-[11px] text-white/55">
        {say("بيمشي على مسار|It travels a path|נע לאורך מסלול")}
        <select className={sel} disabled={busy} value={path?.kind ?? ""} onChange={(e) => onSave(e.target.value ? { ...(path ?? {}), ...starterPath(e.target.value as PathKind), ...(path ? { w: path.w, h: path.h } : {}) } : undefined)} data-testid="keys-path-kind">
          <option value="">{say("بدون مسار|No path|בלי מסלול")}</option>
          {PATH_KINDS.map((k) => <option key={k} value={k}>{PATH_NAME[k]()}</option>)}
        </select>
      </label>
      {path ? (
        <>
          <PathDrawing path={path} />
          <div className="grid grid-cols-2 gap-x-2">
            <Range label={say("العرض|Width|רוחב")} min={0} max={800} step={10} unit="px" busy={busy} value={path.w} onSave={(w) => set({ w })} testId="keys-path-w" />
            <Range label={say("الارتفاع (سالب = لتحت)|Height (minus = downward)|גובה (מינוס = למטה)")} min={-400} max={400} step={10} unit="px" busy={busy} value={path.h} onSave={(h) => set({ h })} testId="keys-path-h" />
            {TURNING.has(path.kind) ? <Range label={say("كم لفّة أو موجة|How many turns or waves|כמה סיבובים או גלים")} min={0.5} max={8} step={0.5} busy={busy} value={path.turns ?? PATH_TURNS[path.kind]} onSave={(turns) => set({ turns })} testId="keys-path-turns" /> : null}
          </div>
          {!CLOSED_PATHS.has(path.kind) ? (
            <label className="block text-[11px] text-white/55">
              {say("مكانه الأصلي|Its own place|המקום שלו")}
              <select className={sel} disabled={busy} value={path.rest ?? "end"} onChange={(e) => set({ rest: e.target.value === "start" ? "start" : undefined })} data-testid="keys-path-rest">
                <option value="end">{say("آخر المسار (بيوصل لمكانه)|The path's end (it arrives)|סוף המסלול (הוא מגיע)")}</option>
                <option value="start">{say("أول المسار (بيطلع من مكانه)|The path's start (it leaves)|תחילת המסלול (הוא יוצא)")}</option>
              </select>
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-[11px] text-white/70">
            <input type="checkbox" checked={path.turn === true} disabled={busy} onChange={(e) => set({ turn: e.target.checked || undefined })} data-testid="keys-path-turn" />
            {say("بيلف مع اتجاه المسار|It turns to face the way it goes|מסתובב לכיוון התנועה")}
          </label>
          <p className="text-[10px] leading-4 text-white/40">{say("المسار هو اللي بيحدد مكانه طول الحركة؛ اللحظات بتغيّر الباقي (الشفافية، الحجم، اللون…).|The path sets where it stands all through; the moments change the rest (opacity, size, colour…).|המסלול קובע את מקומו לאורך כל התנועה; הרגעים משנים את השאר (שקיפות, גודל, צבע…).")}</p>
        </>
      ) : null}
    </div>
  );
}
