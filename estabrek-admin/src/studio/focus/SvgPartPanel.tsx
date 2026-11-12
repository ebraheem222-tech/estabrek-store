/**
 * One shape of a drawing, opened in focus mode: its fill and line (a theme colour, a colour of its own or none),
 * its line width and how see-through it is, or hidden. The values pass the same rules as the whole drawing
 * (svgArt.ts ART_ATTRS; the backend and the shop check them again).
 */
import { useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../../api/pages.api";
import { Range } from "../LookPanels";
import { say } from "../say";
import { ART_ATTRS, ART_TOKENS, type Art } from "../svgArt";
import { artNodeAt, withArtAttrs, type FocusPart } from "./focusKinds";

type Ops = (label: string, ops: PageDraftOp[]) => void;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const six = (v: string) => (v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v);
const TOKEN_WORD: Record<string, string> = {
  text: "لون النص|Text colour|צבע טקסט", muted: "باهت|Muted|מעומעם", accent: "لون المتجر|Store colour|צבע החנות",
  "accent-soft": "لون المتجر الفاتح|Soft store colour|צבע חנות בהיר", "accent-contrast": "عكس لون المتجر|On store colour|ניגוד לצבע החנות",
  bg: "الخلفية|Background|רקע", surface: "السطح|Surface|משטח", border: "الحواف|Borders|גבולות", white: "أبيض|White|לבן", black: "أسود|Black|שחור",
};

/** A fill or a line: none, a theme colour, or one of its own. */
function Paint({ label, value, busy, onPick, testId }: { label: string; value: string | undefined; busy: boolean; onPick: (v: string | null) => void; testId: string }) {
  const own = value && HEX.test(value) ? six(value) : null;
  const [hex, setHex] = useState(own ?? "#c86b98");
  const choice = !value ? "" : own ? "own" : value;
  return (
    <label className="block text-[11px] text-white/55">
      {label}
      <span className="mt-1 flex items-center gap-1">
        <select
          className="min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white"
          disabled={busy}
          value={choice}
          onChange={(e) => onPick(e.target.value === "own" ? hex : e.target.value || null)}
          data-testid={testId}
        >
          <option value="">{say("مثل الرسمة|As the drawing|כמו הציור")}</option>
          <option value="none">{say("بدون|None|ללא")}</option>
          {ART_TOKENS.filter((t) => t !== "transparent").map((t) => <option key={t} value={t}>{say(TOKEN_WORD[t] ?? t)}</option>)}
          <option value="currentColor">{say("لون النص حواليها|The text colour around it|צבע הטקסט סביבו")}</option>
          <option value="own">{say("لون خاص|A colour of its own|צבע משלו")}</option>
        </select>
        <input
          type="color" className="h-7 w-8 shrink-0 cursor-pointer rounded border border-white/[0.1] bg-transparent" disabled={busy}
          aria-label={say("لون خاص|A colour of its own|צבע משלו")} value={hex}
          onChange={(e) => setHex(e.target.value)}
          onBlur={() => { if (!busy && hex !== own) onPick(hex); }}
          data-testid={`${testId}-own`}
        />
      </span>
    </label>
  );
}

export function SvgPartPanel({ node, part, busy, onOps }: { node: PageTreeNode; part: FocusPart; busy: boolean; onOps: Ops }) {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const art = props.art as Art | undefined;
  const shape = art ? artNodeAt(art, part.id) : null;
  if (!art || !shape) return null;
  const a = shape.a;
  const set = (label: string, patch: Record<string, string | null>) => {
    if (busy) return;
    // Only values the drawing's rules take (a bad one would be refused on save).
    for (const [k, v] of Object.entries(patch)) if (v !== null && !ART_ATTRS[k]?.(v)) return;
    onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...props, art: withArtAttrs(art, part.id, patch) } }]);
  };
  const hidden = a.opacity === "0";
  const lines = shape.t === "line" || shape.t === "polyline";
  const opacity = Number(a.opacity ?? 1);
  const width = Number(a["stroke-width"] ?? 0);
  return (
    <div className="space-y-3 rounded-xl border border-accent-400/30 p-3" data-testid="studio-focus-svg-part" data-part={part.id}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 truncate text-xs font-medium text-white/80">{part.label}</div>
        <button
          type="button" disabled={busy}
          className="shrink-0 rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] hover:bg-white/[0.1] disabled:opacity-40"
          onClick={() => set(hidden ? say("إظهار جزء|Show a part|הצגת חלק") : say("إخفاء جزء|Hide a part|הסתרת חלק"), { opacity: hidden ? null : "0" })}
          data-testid="studio-focus-svg-hide"
        >
          {hidden ? say("إظهار|Show|הצגה") : say("إخفاء|Hide|הסתרה")}
        </button>
      </div>
      {!lines ? <Paint label={say("التعبئة|Fill|מילוי")} value={a.fill} busy={busy} onPick={(v) => set(say("تعبئة الجزء|Part fill|מילוי החלק"), { fill: v })} testId="studio-focus-svg-fill" /> : null}
      <Paint label={say("الخط|Line|קו")} value={a.stroke} busy={busy} onPick={(v) => set(say("خط الجزء|Part line|קו החלק"), { stroke: v })} testId="studio-focus-svg-stroke" />
      <Range label={say("سمك الخط|Line width|עובי קו")} min={0} max={30} step={0.5} busy={busy} value={Number.isFinite(width) ? width : 0} onSave={(v) => set(say("سمك خط الجزء|Part line width|עובי קו החלק"), { "stroke-width": v ? String(v) : null })} testId="studio-focus-svg-width" />
      <Range label={say("الوضوح|Opacity|אטימות")} min={0} max={1} step={0.05} busy={busy} value={Number.isFinite(opacity) ? opacity : 1} onSave={(v) => set(say("وضوح الجزء|Part opacity|אטימות החלק"), { opacity: v >= 1 ? null : String(v) })} testId="studio-focus-svg-opacity" />
      <p className="text-[10px] leading-4 text-white/35">{say("المجموعة بتعطي لونها للي جوّاها إذا ما إله لون خاص.|A group gives its colour to what's inside that has none of its own.|קבוצה נותנת את צבעה למה שבתוכה בלי צבע משלו.")}</p>
    </div>
  );
}
