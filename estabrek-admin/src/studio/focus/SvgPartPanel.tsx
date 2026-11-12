/**
 * One shape of a drawing, opened in focus mode (A2):
 *  - its fill and line (a theme colour, a colour of its own or none), line width, see-through, hidden;
 *  - turned into a path (its points can then be moved on the canvas, it can morph);
 *  - moved, turned and sized on its own (around its own middle);
 *  - turning into another shape: a ready drawing, another of its shapes, or a pasted one, fitted where it is,
 *    with the drawing's morph settings (when, how long, which curve: MorphSettings).
 * The values pass the same rules as the whole drawing (svgArt.ts ART_ATTRS; the backend and the shop check again).
 */
import { useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../../api/pages.api";
import { Range } from "../LookPanels";
import { say } from "../say";
import { ART_ATTRS, ART_TOKENS, importSvg, type Art, type ArtNode } from "../svgArt";
import { SHAPES, defaultsOf } from "../svgShapes";
import { EaseField } from "./EaseField";
import { artNodeAt, artParts, asPathNode, withArtAttrs, withArtNode, type FocusPart } from "./focusKinds";
import { fitPath, parsePath, pathBox, shapePath } from "./pathData";

type Ops = (label: string, ops: PageDraftOp[]) => void;
export type Morph = { on: "hover" | "click" | "loop" | "scroll" | "view"; duration?: number; ease?: string; stagger?: number; pairs: Array<{ part: string; to: string }> };
/** What the frame measured of a shape: its box in its own numbers (for turning around its middle). */
export type PartInfo = { box: { x: number; y: number; w: number; h: number } };

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const six = (v: string) => (v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v);
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] hover:bg-white/[0.1] disabled:opacity-40";
const control = "min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white";
const TOKEN_WORD: Record<string, string> = {
  text: "لون النص|Text colour|צבע טקסט", muted: "باهت|Muted|מעומעם", accent: "لون المتجر|Store colour|צבע החנות",
  "accent-soft": "لون المتجر الفاتح|Soft store colour|צבע חנות בהיר", "accent-contrast": "عكس لون المتجر|On store colour|ניגוד לצבע החנות",
  bg: "الخلفية|Background|רקע", surface: "السطح|Surface|משטח", border: "الحواف|Borders|גבולות", white: "أبيض|White|לבן", black: "أسود|Black|שחור",
};
const ON_WORD: Record<Morph["on"], string> = {
  hover: "لما الماوس فوقها|While the pointer is on it|כשהעכבר עליו",
  click: "بالكبسة، رايح جاي|On a click, there and back|בלחיצה, הלוך וחזור",
  loop: "دايماً، رايح جاي|Always, there and back|תמיד, הלוך וחזור",
  scroll: "مع السكرول|With the scroll|עם הגלילה",
  view: "مرة لما تبين|Once, when it shows|פעם אחת כשמופיע",
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
        <select className={control} disabled={busy} value={choice} onChange={(e) => onPick(e.target.value === "own" ? hex : e.target.value || null)} data-testid={testId}>
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

/* ------------------------------------------------------------------ a shape's own move, turn and size */

const N = "(-?\\d+(?:\\.\\d+)?)";
const OWN = new RegExp(`^translate\\(${N} ${N}\\) rotate\\(${N} ${N} ${N}\\) translate\\(${N} ${N}\\) scale\\(${N}\\) translate\\(${N} ${N}\\)$`);
type Turn = { x: number; y: number; deg: number; size: number };
const r2 = (v: number) => String(Math.round(v * 100) / 100);
/** The move, turn and size this editor wrote on a shape (null when it has a transform of its own from its file). */
export function readTurn(transform: string | undefined): Turn | null {
  if (!transform) return { x: 0, y: 0, deg: 0, size: 1 };
  const m = OWN.exec(transform);
  return m ? { x: Number(m[1]), y: Number(m[2]), deg: Number(m[3]), size: Number(m[8]) } : null;
}
/** The transform for a move, turn and size around the shape's middle (null when it leaves the shape as it is). */
export function writeTurn(t: Turn, mid: { x: number; y: number }): string | null {
  if (!t.x && !t.y && !t.deg && t.size === 1) return null;
  const cx = r2(mid.x), cy = r2(mid.y);
  return `translate(${r2(t.x)} ${r2(t.y)}) rotate(${r2(t.deg)} ${cx} ${cy}) translate(${cx} ${cy}) scale(${r2(t.size)}) translate(${r2(-mid.x)} ${r2(-mid.y)})`;
}

/* ------------------------------------------------------------------ the drawing's morph settings */

export function MorphSettings({ morph, busy, onSave, onTry }: { morph: Morph; busy: boolean; onSave: (m: Morph | null) => void; onTry?: () => void }) {
  return (
    <div className="space-y-2 rounded-lg border border-white/[0.08] p-2" data-testid="studio-morph-settings">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-white/70">{say("التحوّل|The morph|ההתמרה")} · {morph.pairs.length}</span>
        <span className="flex gap-1">
          {onTry ? <button type="button" className={btn} disabled={busy} onClick={onTry} data-testid="studio-morph-try">▶ {say("جرّبه|Try it|נסה")}</button> : null}
          <button type="button" className={btn} disabled={busy} onClick={() => onSave(null)} data-testid="studio-morph-remove">{say("شيل التحوّل|Remove the morph|הסר התמרה")}</button>
        </span>
      </div>
      <label className="block text-[11px] text-white/55">
        {say("إمتى|When|מתי")}
        <select className={`${control} mt-1 w-full`} disabled={busy} value={morph.on} onChange={(e) => onSave({ ...morph, on: e.target.value as Morph["on"] })} data-testid="studio-morph-on">
          {(Object.keys(ON_WORD) as Morph["on"][]).map((k) => <option key={k} value={k}>{say(ON_WORD[k])}</option>)}
        </select>
      </label>
      <Range label={say("المدة|Duration|משך")} unit="s" min={0.1} max={4} step={0.05} busy={busy} value={morph.duration ?? 0.6} onSave={(v) => onSave({ ...morph, duration: v })} testId="studio-morph-duration" />
      {morph.pairs.length > 1 ? <Range label={say("الفرق بين الأشكال|Gap between shapes|רווח בין הצורות")} unit="s" min={0} max={1} step={0.02} busy={busy} value={morph.stagger ?? 0} onSave={(v) => onSave({ ...morph, stagger: v || undefined })} testId="studio-morph-stagger" /> : null}
      <EaseField label={say("منحنى الحركة|Motion curve|עקומת תנועה")} value={morph.ease} busy={busy} onSave={(ease) => onSave({ ...morph, ease })} testId="studio-morph-ease" />
    </div>
  );
}

/* ------------------------------------------------------------------ the panel */

export function SvgPartPanel({ node, part, info, busy, onOps, onTry }: { node: PageTreeNode; part: FocusPart; info?: PartInfo; busy: boolean; onOps: Ops; onTry?: () => void }) {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const art = props.art as Art | undefined;
  const shape = art ? artNodeAt(art, part.id) : null;
  const [paste, setPaste] = useState("");
  const [note, setNote] = useState<string | null>(null);
  if (!art || !shape) return null;
  const a = shape.a;
  const morph = (props.morph as Morph | undefined) ?? null;
  const pair = morph?.pairs.find((p) => p.part === part.id) ?? null;
  const save = (label: string, patch: Record<string, unknown>) => {
    if (!busy) onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...props, ...patch } }]);
  };
  const set = (label: string, attrs: Record<string, string | null>) => {
    // Only values the drawing's rules take (a bad one would be refused on save).
    for (const [k, v] of Object.entries(attrs)) if (v !== null && !ART_ATTRS[k]?.(v)) return;
    save(label, { art: withArtAttrs(art, part.id, attrs) });
  };
  const hidden = a.opacity === "0";
  const lines = shape.t === "line" || shape.t === "polyline";
  const opacity = Number(a.opacity ?? 1);
  const width = Number(a["stroke-width"] ?? 0);
  const ownPath = shape.t === "g" ? null : shapePath(shape);
  const turn = shape.t === "g" ? null : readTurn(a.transform);
  const mid = info?.box ? { x: info.box.x + info.box.w / 2, y: info.box.y + info.box.h / 2 } : (() => {
    const b = ownPath ? pathBox(parsePath(ownPath)) : null;
    return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : { x: 0, y: 0 };
  })();
  const setTurn = (t: Turn) => set(say("تحريك الجزء|Move the part|הזזת החלק"), { transform: writeTurn(t, mid) });

  /** Morph this shape into `to` (a path in this drawing's numbers): a shape that isn't a path becomes one first. */
  const morphInto = (to: string, label: string) => {
    if (!ownPath) return;
    const nextArt = shape.t === "path" ? art : withArtNode(art, part.id, (n) => asPathNode(n, ownPath));
    const pairs = [...(morph?.pairs ?? []).filter((p) => p.part !== part.id), { part: part.id, to }].slice(0, 20);
    save(label, { art: nextArt, morph: { on: "hover", duration: 0.6, ease: "power2.inOut", ...(morph ?? {}), pairs } });
  };
  /** A path from elsewhere fitted onto this shape's box (so the morph stays where the shape is). */
  const fitted = (d: string | null) => {
    const box = ownPath ? pathBox(parsePath(ownPath)) : null;
    return d && box ? fitPath(d, box) : null;
  };
  const others = artParts(art).filter((p) => p.id !== part.id && p.kind !== "g");
  const pick = (value: string) => {
    setNote(null);
    if (value.startsWith("shape:")) {
      const def = SHAPES.find((s) => s.key === value.slice(6));
      const made = def?.make(defaultsOf(def));
      const first = made?.nodes.find((n) => shapePath(n));
      const d = fitted(first ? shapePath(first) : null);
      if (d) morphInto(d, def!.label());
    } else if (value.startsWith("part:")) {
      const other = artNodeAt(art, value.slice(5));
      const d = other ? shapePath(other) : null;
      if (d) morphInto(d, say("تحوّل لجزء تاني|Morph into another part|התמרה לחלק אחר"));
    }
  };
  const takePaste = () => {
    const text = paste.trim();
    let d: string | null = null;
    if (/^<svg/i.test(text)) {
      const r = importSvg(text);
      const walk = (list: ArtNode[]): string | null => {
        for (const n of list) {
          const p = n.t === "g" ? walk(n.c ?? []) : shapePath(n);
          if (p) return p;
        }
        return null;
      };
      d = r.art ? walk(r.art.nodes) : null;
    } else if (ART_ATTRS.d(text) && /^[Mm]/.test(text)) d = text;
    const to = fitted(d);
    if (!to) return setNote(say("ما لقينا شكل بالكود. الصق SVG أو مسار (d).|No shape found in it. Paste an SVG or a path (d).|לא נמצאה צורה. הדבק SVG או נתיב (d)."));
    setPaste("");
    morphInto(to, say("تحوّل لشكل ملصوق|Morph into a pasted shape|התמרה לצורה מודבקת"));
  };

  return (
    <div className="space-y-3 rounded-xl border border-accent-400/30 p-3" data-testid="studio-focus-svg-part" data-part={part.id}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 truncate text-xs font-medium text-white/80">{part.label}</div>
        <button type="button" disabled={busy} className={btn} onClick={() => set(hidden ? say("إظهار جزء|Show a part|הצגת חלק") : say("إخفاء جزء|Hide a part|הסתרת חלק"), { opacity: hidden ? null : "0" })} data-testid="studio-focus-svg-hide">
          {hidden ? say("إظهار|Show|הצגה") : say("إخفاء|Hide|הסתרה")}
        </button>
      </div>
      {!lines ? <Paint label={say("التعبئة|Fill|מילוי")} value={a.fill} busy={busy} onPick={(v) => set(say("تعبئة الجزء|Part fill|מילוי החלק"), { fill: v })} testId="studio-focus-svg-fill" /> : null}
      <Paint label={say("الخط|Line|קו")} value={a.stroke} busy={busy} onPick={(v) => set(say("خط الجزء|Part line|קו החלק"), { stroke: v })} testId="studio-focus-svg-stroke" />
      <Range label={say("سمك الخط|Line width|עובי קו")} min={0} max={30} step={0.5} busy={busy} value={Number.isFinite(width) ? width : 0} onSave={(v) => set(say("سمك خط الجزء|Part line width|עובי קו החלק"), { "stroke-width": v ? String(v) : null })} testId="studio-focus-svg-width" />
      <Range label={say("الوضوح|Opacity|אטימות")} min={0} max={1} step={0.05} busy={busy} value={Number.isFinite(opacity) ? opacity : 1} onSave={(v) => set(say("وضوح الجزء|Part opacity|אטימות החלק"), { opacity: v >= 1 ? null : String(v) })} testId="studio-focus-svg-opacity" />

      {shape.t === "path" ? (
        <p className="text-[10px] leading-4 text-white/40">{say("نقاطها على الصفحة: اسحب النقطة أو مقبض المنحنى.|Its points are on the page: drag a point or a curve handle.|הנקודות שלו בעמוד: גרור נקודה או ידית עקומה.")}</p>
      ) : ownPath ? (
        <button type="button" className={`${btn} w-full`} disabled={busy} onClick={() => save(say("تحويل لمسار|Turn into a path|הפיכה לנתיב"), { art: withArtNode(art, part.id, (n) => asPathNode(n, ownPath)) })} data-testid="studio-focus-svg-topath">
          {say("حوّلها لمسار (لتحريك نقاطها)|Turn it into a path (to move its points)|הפוך לנתיב (להזזת נקודות)")}
        </button>
      ) : null}

      {turn ? (
        <div className="space-y-1" data-testid="studio-focus-svg-turn">
          <div className="text-[11px] text-white/55">{say("مكانها ودورانها وحجمها|Its place, turn and size|מיקום, סיבוב וגודל")}</div>
          <Range label="X" min={-500} max={500} step={1} busy={busy} value={turn.x} onSave={(v) => setTurn({ ...turn, x: v })} testId="studio-focus-svg-x" />
          <Range label="Y" min={-500} max={500} step={1} busy={busy} value={turn.y} onSave={(v) => setTurn({ ...turn, y: v })} testId="studio-focus-svg-y" />
          <Range label={say("دوران|Turn|סיבוב")} unit="°" min={-180} max={180} step={1} busy={busy} value={turn.deg} onSave={(v) => setTurn({ ...turn, deg: v })} testId="studio-focus-svg-deg" />
          <Range label={say("حجم|Size|גודל")} min={0.1} max={4} step={0.05} busy={busy} value={turn.size} onSave={(v) => setTurn({ ...turn, size: v })} testId="studio-focus-svg-size" />
        </div>
      ) : shape.t !== "g" ? (
        <p className="text-[10px] leading-4 text-white/35">{say("إلها تحويل خاص من ملفها؛ تحريكها من هون بيمسحه.|It has a transform of its own from its file; moving it here replaces it.|יש לו טרנספורמציה משלו מהקובץ.")}</p>
      ) : null}

      {ownPath ? (
        <div className="space-y-2" data-testid="studio-focus-svg-morph">
          <label className="block text-[11px] text-white/55">
            {pair ? say("بتتحوّل لشكل تاني. غيّره:|It turns into another shape. Change it:|הופך לצורה אחרת. שנה:") : say("بتتحوّل إلى…|It turns into…|הופך ל…")}
            <select className={`${control} mt-1 w-full`} disabled={busy} value="" onChange={(e) => pick(e.target.value)} data-testid="studio-focus-svg-morph-to">
              <option value="">{say("اختار شكل|Choose a shape|בחר צורה")}</option>
              <optgroup label={say("رسمات جاهزة|Ready drawings|ציורים מוכנים")}>
                {SHAPES.map((s) => <option key={s.key} value={`shape:${s.key}`}>{s.label()}</option>)}
              </optgroup>
              {others.length ? (
                <optgroup label={say("جزء تاني من الرسمة|Another part of the drawing|חלק אחר בציור")}>
                  {others.map((o) => <option key={o.id} value={`part:${o.id}`}>{o.label}</option>)}
                </optgroup>
              ) : null}
            </select>
          </label>
          <details className="rounded-lg border border-white/[0.06] px-2 py-1">
            <summary className="cursor-pointer select-none text-[11px] text-white/60">{say("أو الصق شكل (SVG أو مسار)|Or paste a shape (SVG or a path)|או הדבק צורה (SVG או נתיב)")}</summary>
            <textarea dir="ltr" className="mt-1 min-h-[56px] w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 font-mono text-[11px] text-white" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="M10 10 L90 10 … / <svg …>" data-testid="studio-focus-svg-morph-paste" />
            <button type="button" className={btn} disabled={busy || !paste.trim()} onClick={takePaste} data-testid="studio-focus-svg-morph-take">{say("استعمل|Use it|השתמש")}</button>
          </details>
          {note ? <p className="text-[11px] text-amber-200/80">{note}</p> : null}
          {pair ? (
            <button type="button" className={btn} disabled={busy} onClick={() => {
              const pairs = (morph?.pairs ?? []).filter((p) => p.part !== part.id);
              save(say("بدون تحوّل|No morph|ללא התמרה"), { morph: pairs.length ? { ...morph, pairs } : undefined });
            }} data-testid="studio-focus-svg-morph-clear">{say("هالجزء ما يتحوّل|This part doesn't morph|החלק הזה לא מתמיר")}</button>
          ) : null}
          {morph ? <MorphSettings morph={morph} busy={busy} onTry={onTry} onSave={(m) => save(say("التحوّل|The morph|ההתמרה"), { morph: m ?? undefined })} /> : null}
        </div>
      ) : null}
    </div>
  );
}
