/**
 * A motion's curve chosen in a panel: one of the editor's own names (smooth, strong, bouncy…), or "a free curve
 * or a spring", which opens the curve field (focus/EaseField.tsx: two handles dragged on a drawing, a spring's
 * mass, stiffness and damping, or one of GSAP's named curves). An entrance and keyframes take either
 * (the backend's MotionEase checks the text, the shop's pageTree/motionCurve.ts plays it).
 */
import { readEase } from "../../../shared/ease";
import { EaseField } from "./focus/EaseField";
import { say } from "./say";

/** The free curve a fresh pick starts from: quick at first, settling gently (it is then drawn and changed). */
export const FREE_CURVE = "cubic-bezier(0.2,0.8,0.2,1)";
const FREE = "__free";
const control = "mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";

/** Is this ease a free curve (not one of the panel's own names)? */
export const isFreeCurve = (value: string | undefined, names: Array<[string, string]>) => Boolean(value) && !names.some(([k]) => k === value) && Boolean(readEase(value));

export function EaseChoice({ label, value, names, none, busy, onPick, testId = "studio-ease-choice" }: {
  label: string;
  /** The ease as saved: an own name, a free curve's text, or nothing. */
  value: string | undefined;
  /** The panel's own names and their words. */
  names: Array<[string, string]>;
  /** The words of "no curve of its own" (it then follows something else), when the panel has that choice. */
  none?: string;
  busy: boolean;
  onPick: (ease: string | undefined) => void;
  testId?: string;
}) {
  const free = isFreeCurve(value, names);
  return (
    // In a two-column row the drawing takes the whole row.
    <div className={`space-y-2 ${free ? "col-span-2" : ""}`}>
      <label className="block text-[11px] text-white/55">
        {label}
        <select className={control} disabled={busy} value={free ? FREE : value ?? ""} onChange={(e) => onPick(e.target.value === FREE ? FREE_CURVE : e.target.value || undefined)} data-testid={testId}>
          {none !== undefined ? <option value="">{none}</option> : null}
          {names.map(([k, name]) => <option key={k} value={k}>{name}</option>)}
          <option value={FREE}>{say("منحنى حر أو نابض…|A free curve or a spring…|עקומה חופשית או קפיץ…")}</option>
        </select>
      </label>
      {free ? <EaseField label={say("المنحنى|The curve|העקומה")} value={value} busy={busy} onSave={(text) => onPick(text)} testId={`${testId}-field`} /> : null}
    </div>
  );
}

/** Which of the things that come in one after another goes first (the backend's STAGGER_ORDERS). */
export const STAGGER_ORDERS = ["first", "last", "center", "edges", "random"] as const;
export const staggerOrderNames = Object.assign((): Array<[string, string]> => [
  ["first", say("من الأول للآخر|From the first to the last|מהראשון לאחרון")],
  ["last", say("من الآخر للأول|From the last to the first|מהאחרון לראשון")],
  ["center", say("من النص للأطراف|From the middle outward|מהאמצע החוצה")],
  ["edges", say("من الأطراف للنص|From the ends inward|מהקצוות פנימה")],
  ["random", say("ترتيب مخلوط|In a mixed order|בסדר מעורב")],
], { label: () => say("مين بيبلّش|Which goes first|מי מתחיל") });
