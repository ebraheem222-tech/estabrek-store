/**
 * Shapes by equations and an element's own CSS in the editor (docs/cms-big-engine-plan.ar.md G, C):
 *  - FormPanel (per screen, like the rest of its look): a live drawing of the outline; a corner or an edge picked on
 *    it (or "the whole shape"), then its kind and numbers: a corner's size, a squircle's squareness, a Bézier's two
 *    handles; an edge's depth (in or out), its count, phase and flow, or y = f(x) typed (checked as it's typed);
 *    a whole superellipse, polygon or star, blob (a new one with the dice; it can breathe), or polar r(a). Ready
 *    shapes to start from, "the same on all corners / edges", and taking it off. The shop draws it
 *    (shared/shapeForm.ts).
 *  - CodePanel: Tailwind classes and CSS written for the element (`&:hover {…}`, `@media … {…}` inside), built here
 *    (codeCss.ts), checked, and saved with it (props.code); errors say which class or what is wrong.
 */
import { useMemo, useState } from "react";
import type { PageDraftOp, PageTreeNode, TreeScreen } from "../api/pages.api";
import { say } from "./say";
import { Range } from "./LookPanels";
import { styleOp } from "./columns";
import { buildCode } from "./codeCss";
import {
  CORNERS, CORNER_KINDS, EDGES, EDGE_KINDS, WHOLE_KINDS, formPath, parseFn, safeForm,
  type Corner, type CornerName, type Edge, type EdgeName, type Form, type Whole,
} from "../../../shared/shapeForm";

type Ops = (label: string, ops: PageDraftOp[]) => void;
const box = "space-y-2 rounded-xl border border-white/[0.08] p-3";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] hover:bg-white/[0.1] disabled:opacity-40";
const chip = (on: boolean) => `rounded-lg px-2 py-1 text-[11px] ${on ? "bg-accent-500/30 text-white" : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1]"}`;
const field = "mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 font-mono text-xs text-white";

const CORNER_WORD: Record<string, string> = {
  square: "حادّة|Square|חדה", round: "مدوّرة|Round|מעוגלת", squircle: "سكويركل|Squircle|סקווירקל", bevel: "مقصوصة|Bevel|משופעת",
  notch: "محفورة مربع|Notch|חריץ", scoop: "محفورة دائرة|Scoop|קעורה", bezier: "منحنى حر|Bézier|בזייה",
};
const EDGE_WORD: Record<string, string> = {
  straight: "مستقيمة|Straight|ישרה", curve: "منحنى|Curve|קשת", arc: "قوس|Arc|חצי עיגול", wave: "موجة|Wave|גל", zigzag: "زكزاك|Zigzag|זיגזג",
  scallop: "صدف|Scallops|צדפות", notch: "حفرة بالنص|Notch|חריץ", fn: "معادلة y=f(x)|Equation y=f(x)|משוואה",
};
const WHOLE_WORD: Record<string, string> = { superellipse: "سوبر إهليلج|Superellipse|סופר־אליפסה", polygon: "مضلّع / نجمة|Polygon / star|מצולע / כוכב", blob: "بقعة|Blob|כתם", polar: "معادلة قطبية r(a)|Polar r(a)|קוטבית" };
const SPOT: Record<CornerName | EdgeName, [number, number]> = { tl: [0, 0], tr: [1, 0], br: [1, 1], bl: [0, 1], top: [0.5, 0], right: [1, 0.5], bottom: [0.5, 1], left: [0, 0.5] };

/** Ready shapes to start from. */
const PRESETS: Array<{ key: string; word: string; form: Form }> = [
  { key: "squircle", word: "سكويركل|Squircle|סקווירקל", form: { corners: Object.fromEntries(CORNERS.map((c) => [c, { kind: "squircle", size: 48, k: 5 }])) } },
  { key: "ticket", word: "تذكرة|Ticket|כרטיס", form: { corners: Object.fromEntries(CORNERS.map((c) => [c, { kind: "round", size: 12 }])), edges: { left: { kind: "notch", depth: 14 }, right: { kind: "notch", depth: 14 } } } },
  { key: "stamp", word: "طابع|Stamp|בול", form: { edges: Object.fromEntries(EDGES.map((e) => [e, { kind: "scallop", depth: 6, count: 14 }])) } },
  { key: "wave", word: "موجة تحت|Wave below|גל למטה", form: { edges: { bottom: { kind: "wave", depth: 18, count: 4 } } } },
  { key: "flow", word: "موجة ماشية|Flowing wave|גל זורם", form: { edges: { bottom: { kind: "wave", depth: 16, count: 3, flow: 6 } } } },
  { key: "leaf", word: "ورقة|Leaf|עלה", form: { corners: { tl: { kind: "round", size: 64 }, br: { kind: "round", size: 64 } } } },
  { key: "tag", word: "تاغ|Tag|תג", form: { corners: { tl: { kind: "bevel", size: 22 }, bl: { kind: "bevel", size: 22 } } } },
  { key: "dome", word: "قبّة|Dome|כיפה", form: { edges: { top: { kind: "curve", depth: -48 } } } },
  { key: "star", word: "نجمة|Star|כוכב", form: { whole: { kind: "polygon", n: 5, inner: 0.48 } } },
  { key: "hexagon", word: "مسدّس|Hexagon|משושה", form: { whole: { kind: "polygon", n: 6 } } },
  { key: "blob", word: "بقعة بتتنفّس|Breathing blob|כתם נושם", form: { whole: { kind: "blob", seed: 7, amount: 0.3, flow: 8 } } },
  { key: "flower", word: "وردة|Flower|פרח", form: { whole: { kind: "polar", fn: "1 + 0.18*cos(6*a)" } } },
];

export function FormPanel({ node, screen, busy, onOps }: { node: PageTreeNode; screen: TreeScreen; busy: boolean; onOps: Ops }) {
  const look = ((node.style ?? {}) as Record<string, Record<string, unknown> | undefined>)[screen] ?? {};
  const form = (look.form as Form | undefined) ?? null;
  const [target, setTarget] = useState<CornerName | EdgeName | "whole">(form?.whole ? "whole" : "tl");
  const [fnDraft, setFnDraft] = useState<string | null>(null);
  const label = say("الشكل بالمعادلات|Shape by equations|צורה במשוואות");
  const save = (next: Form | null) => {
    const clean = next ? safeForm(next) : null;
    onOps(label, [styleOp(node, screen, { form: clean ?? undefined })]);
  };
  const path = useMemo(() => (form && safeForm(form) ? formPath(safeForm(form)!, 220, 140) : "M0 0H220V140H0Z"), [form]);
  const isCorner = (CORNERS as readonly string[]).includes(target);
  const corner = isCorner ? form?.corners?.[target as CornerName] : undefined;
  const edge = !isCorner && target !== "whole" ? form?.edges?.[target as EdgeName] : undefined;
  const whole = form?.whole;
  const setCorner = (c: Partial<Corner> | null, all = false) => {
    const base: Form = { corners: { ...(form?.corners ?? {}) }, edges: { ...(form?.edges ?? {}) } };
    const names = all ? CORNERS : [target as CornerName];
    for (const n of names) {
      if (!c) delete base.corners![n];
      else base.corners![n] = { ...(all ? corner : base.corners![n]) ?? { kind: "round", size: 24 }, ...c } as Corner;
    }
    save(base);
  };
  const setEdge = (e: Partial<Edge> | null, all = false) => {
    const base: Form = { corners: { ...(form?.corners ?? {}) }, edges: { ...(form?.edges ?? {}) } };
    const names = all ? EDGES : [target as EdgeName];
    for (const n of names) {
      if (!e) delete base.edges![n];
      else base.edges![n] = { ...(all ? edge : base.edges![n]) ?? { kind: "curve", depth: 16 }, ...e } as Edge;
    }
    save(base);
  };
  const setWhole = (w: Partial<Whole> | null) => save(w ? { whole: { ...(whole ?? { kind: "superellipse", n: 4 }), ...w } as Whole } : { corners: form?.corners, edges: form?.edges });
  const fnOk = (src: string, names: string[]) => Boolean(parseFn(src, names));

  return (
    <div className={box} data-testid="studio-form">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/70">{label}</div>
        {form ? <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => save(null)} data-testid="studio-form-clear">{say("شيله|Remove|הסר")}</button> : null}
      </div>
      <svg viewBox="-12 -12 244 164" className="w-full rounded-lg bg-white/[0.03]" data-testid="studio-form-preview" role="group" aria-label={label}>
        <path d={path} fill="rgb(236 72 153 / .35)" stroke="rgb(244 114 182)" strokeWidth="1.5" data-testid="studio-form-path" />
        {!whole ? [...CORNERS, ...EDGES].map((k) => (
          <circle key={k} cx={SPOT[k][0] * 220} cy={SPOT[k][1] * 140} r={target === k ? 8 : 6} className="cursor-pointer" fill={target === k ? "rgb(244 114 182)" : "rgb(255 255 255 / .25)"} stroke="white" strokeWidth="1" onClick={() => setTarget(k)} data-testid="studio-form-target" data-target={k}>
            <title>{k}</title>
          </circle>
        )) : null}
      </svg>
      <div className="flex flex-wrap gap-1">
        <button type="button" className={chip(target !== "whole")} disabled={busy} onClick={() => { setTarget("tl"); if (whole) setWhole(null); }} data-testid="studio-form-mode" data-mode="parts">{say("زوايا وحواف|Corners and edges|פינות וקצוות")}</button>
        <button type="button" className={chip(target === "whole")} disabled={busy} onClick={() => setTarget("whole")} data-testid="studio-form-mode" data-mode="whole">{say("شكل كامل|A whole shape|צורה שלמה")}</button>
      </div>

      {target === "whole" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {WHOLE_KINDS.map((k) => <button key={k} type="button" className={chip(whole?.kind === k)} disabled={busy} onClick={() => setWhole({ kind: k, ...(k === "polar" ? { fn: whole?.fn ?? "1 + 0.2*cos(5*a)" } : {}) })} data-testid="studio-form-whole-kind" data-kind={k}>{say(WHOLE_WORD[k])}</button>)}
          </div>
          {whole?.kind === "superellipse" ? <Range label={say("قديش مربّع|How square|כמה מרובע")} min={2} max={12} step={0.5} busy={busy} value={whole.n ?? 4} onSave={(n) => setWhole({ n })} testId="studio-form-whole-n" /> : null}
          {whole?.kind === "polygon" ? (
            <>
              <Range label={say("عدد الرؤوس|Points|קודקודים")} min={3} max={16} step={1} busy={busy} value={whole.n ?? 6} onSave={(n) => setWhole({ n })} testId="studio-form-whole-n" />
              <Range label={say("الداخل (1 = مضلّع، أقل = نجمة)|Inner (1 = polygon, less = a star)|פנימי")} min={0.2} max={1} step={0.02} busy={busy} value={whole.inner ?? 1} onSave={(inner) => setWhole({ inner })} testId="studio-form-whole-inner" />
            </>
          ) : null}
          {whole?.kind === "blob" ? (
            <>
              <Range label={say("قديش متعرّج|How lumpy|כמה גבשושי")} min={0} max={0.6} step={0.02} busy={busy} value={whole.amount ?? 0.25} onSave={(amount) => setWhole({ amount })} testId="studio-form-whole-amount" />
              <button type="button" className={btn} disabled={busy} onClick={() => setWhole({ seed: Math.floor(Math.random() * 9999) })} data-testid="studio-form-whole-seed">🎲 {say("وحدة تانية|Another one|אחר")}</button>
            </>
          ) : null}
          {whole?.kind === "polar" ? (
            <label className="block text-[11px] text-white/55">r(a) = <span className="text-white/35">(a = {say("الزاوية|the angle|הזווית")}, t = {say("الوقت|time|זמן")})</span>
              <input className={field} dir="ltr" defaultValue={whole.fn ?? ""} disabled={busy} onChange={(e) => setFnDraft(e.target.value)} onBlur={(e) => { if (fnOk(e.target.value, ["a", "t"])) setWhole({ fn: e.target.value }); }} data-testid="studio-form-whole-fn" />
              {fnDraft !== null && !fnOk(fnDraft, ["a", "t"]) ? <span className="text-[10px] text-amber-200" data-testid="studio-form-fn-bad">{say("المعادلة مش مفهومة|Not an equation we can read|משוואה לא תקינה")}</span> : null}
            </label>
          ) : null}
          {whole && (whole.kind === "blob" || whole.kind === "polar") ? <Range label={say("بيتحرّك كل (0 = ثابت)|Moves every (0 = still)|זז כל")} min={0} max={20} step={0.5} unit="s" busy={busy} value={whole.flow ?? 0} onSave={(flow) => setWhole({ flow: flow >= 0.5 ? flow : undefined })} testId="studio-form-whole-flow" /> : null}
        </div>
      ) : isCorner ? (
        <div className="space-y-2">
          <div className="text-[11px] text-white/45">{say("الزاوية|Corner|פינה")}: {target}</div>
          <div className="flex flex-wrap gap-1">
            {CORNER_KINDS.map((k) => <button key={k} type="button" className={chip((corner?.kind ?? "square") === k)} disabled={busy} onClick={() => setCorner(k === "square" ? null : { kind: k })} data-testid="studio-form-corner-kind" data-kind={k}>{say(CORNER_WORD[k])}</button>)}
          </div>
          {corner ? (
            <>
              <Range label={say("حجمها|Its size|גודל")} min={0} max={200} step={1} unit="px" busy={busy} value={corner.size ?? 24} onSave={(size) => setCorner({ size })} testId="studio-form-corner-size" />
              {corner.kind === "squircle" ? <Range label={say("قديش مربّعة|How square|כמה מרובעת")} min={2} max={12} step={0.5} busy={busy} value={corner.k ?? 4.5} onSave={(k) => setCorner({ k })} testId="studio-form-corner-k" /> : null}
              {corner.kind === "bezier" ? (["c1x", "c1y", "c2x", "c2y"] as const).map((name, i) => (
                <Range key={name} label={`${say("مقبض|Handle|ידית")} ${name}`} min={0} max={1} step={0.05} busy={busy} value={(corner.c ?? [0, 0.45, 0.45, 0])[i]} onSave={(v) => { const c = [...(corner.c ?? [0, 0.45, 0.45, 0])] as Corner["c"] & number[]; c[i] = v; setCorner({ c }); }} testId={`studio-form-corner-${name}`} />
              )) : null}
              <button type="button" className={btn} disabled={busy} onClick={() => setCorner(corner, true)} data-testid="studio-form-corner-all">{say("نفسها على كل الزوايا|The same on every corner|זהה בכל הפינות")}</button>
            </>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-[11px] text-white/45">{say("الحافة|Edge|קצה")}: {target}</div>
          <div className="flex flex-wrap gap-1">
            {EDGE_KINDS.map((k) => <button key={k} type="button" className={chip((edge?.kind ?? "straight") === k)} disabled={busy} onClick={() => setEdge(k === "straight" ? null : { kind: k, ...(k === "fn" ? { fn: edge?.fn ?? "0.5 + 0.5*sin(x*PI*4)" } : {}) })} data-testid="studio-form-edge-kind" data-kind={k}>{say(EDGE_WORD[k])}</button>)}
          </div>
          {edge ? (
            <>
              <Range label={say("عمقها (سالب = لبرّا)|Its depth (minus = bulging out)|עומק")} min={-120} max={120} step={1} unit="px" busy={busy} value={edge.depth ?? 16} onSave={(depth) => setEdge({ depth })} testId="studio-form-edge-depth" />
              {["wave", "zigzag", "scallop"].includes(edge.kind) ? (
                <>
                  <Range label={say("كم وحدة|How many|כמה")} min={1} max={40} step={1} busy={busy} value={edge.count ?? (edge.kind === "scallop" ? 8 : 4)} onSave={(count) => setEdge({ count })} testId="studio-form-edge-count" />
                  <Range label={say("بدايتها|Its start (phase)|פאזה")} min={0} max={1} step={0.05} busy={busy} value={edge.phase ?? 0} onSave={(phase) => setEdge({ phase: phase || undefined })} testId="studio-form-edge-phase" />
                  <Range label={say("بتمشي كل (0 = ثابتة)|Flows every (0 = still)|זורם כל")} min={0} max={20} step={0.5} unit="s" busy={busy} value={edge.flow ?? 0} onSave={(flow) => setEdge({ flow: flow >= 0.5 ? flow : undefined })} testId="studio-form-edge-flow" />
                </>
              ) : null}
              {edge.kind === "fn" ? (
                <label className="block text-[11px] text-white/55">y = f(x) <span className="text-white/35">(x {say("من 0 لـ 1، والنتيجة من 0 لـ 1|from 0 to 1, the result from 0 to 1|מ־0 עד 1")})</span>
                  <input className={field} dir="ltr" defaultValue={edge.fn ?? ""} disabled={busy} onChange={(e) => setFnDraft(e.target.value)} onBlur={(e) => { if (fnOk(e.target.value, ["x"])) setEdge({ fn: e.target.value }); }} data-testid="studio-form-edge-fn" />
                  {fnDraft !== null && !fnOk(fnDraft, ["x"]) ? <span className="text-[10px] text-amber-200" data-testid="studio-form-fn-bad">{say("المعادلة مش مفهومة|Not an equation we can read|משוואה לא תקינה")}</span> : null}
                </label>
              ) : null}
              <button type="button" className={btn} disabled={busy} onClick={() => setEdge(edge, true)} data-testid="studio-form-edge-all">{say("نفسها على كل الحواف|The same on every edge|זהה בכל הקצוות")}</button>
            </>
          ) : null}
        </div>
      )}

      <details className="rounded-lg bg-white/[0.03] p-2">
        <summary className="cursor-pointer text-[11px] text-white/60">{say("أشكال جاهزة|Ready shapes|צורות מוכנות")}</summary>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {PRESETS.map((p) => (
            <button key={p.key} type="button" className={`${btn} flex flex-col items-center gap-1`} disabled={busy} onClick={() => { setTarget(p.form.whole ? "whole" : "tl"); save(p.form); }} data-testid="studio-form-preset" data-key={p.key}>
              <svg viewBox="-4 -4 68 48" className="h-8 w-full"><path d={formPath(p.form, 60, 40)} fill="rgb(244 114 182 / .5)" /></svg>
              <span className="truncate">{say(p.word)}</span>
            </button>
          ))}
        </div>
      </details>
      <p className="text-[10px] leading-4 text-white/35">{say("الزوايا بتضل بنفس حجمها بالبكسل مهما كبر العنصر. الظل والإطار ما بيلحقوا الشكل: استعمل «ظل حوالين شكله».|Corners keep their px however big it gets. Shadows and borders don't follow the shape: use «a shadow around its shape».|הפינות שומרות על גודלן בפיקסלים.")}</p>
    </div>
  );
}

const CODE_ERRORS: Record<string, string> = {
  bad: "فيه كلمة مش صف Tailwind|A word that isn't a Tailwind class|מילה שאינה מחלקת Tailwind",
  long: "طويل كتير|Too long|ארוך מדי",
  "css:url": "الروابط بس لملفات المتجر (/…) أو صور data:|Links only to the shop's own files (/…) or data: pictures|קישורים רק לקבצי החנות",
  "css:not allowed": "فيه إشي ممنوع (@import، </style>…)|Something not allowed (@import, </style>…)|משהו אסור",
  "css:unbalanced": "الأقواس { } مش متوازنة|The { } braces don't balance|הסוגריים לא מאוזנים",
  "css:outside the element": "قاعدة بتطلع برّا العنصر|A rule that reaches outside the element|כלל שחורג מהרכיב",
  "css:unclosed": "تعليق أو نص مش مسكّر|An unclosed comment or string|הערה או מחרוזת לא סגורה",
};
const errorWords = (e: string) => (e.startsWith("unknown:") ? say(`صف مش معروف: ${e.slice(8)}|Unknown class: ${e.slice(8)}|מחלקה לא מוכרת: ${e.slice(8)}`) : say(CODE_ERRORS[e] ?? (e.startsWith("css:@") ? `ممنوع ${e.slice(4)}|${e.slice(4)} is not allowed|${e.slice(4)} אסור` : "ما زبط|It didn't work|לא הצליח")));

export function CodePanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: Ops }) {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const code = (props.code as { tw?: string; css?: string; out?: string } | undefined) ?? {};
  const [tw, setTw] = useState(code.tw ?? "");
  const [css, setCss] = useState(code.css ?? "");
  const [state, setState] = useState<{ error?: string; working?: boolean }>({});
  const label = say("CSS خاص فيه|Its own CSS|CSS משלו");
  const apply = async () => {
    setState({ working: true });
    const r = await buildCode({ tw, css }, node.id);
    if (r.error !== undefined) { setState({ error: r.error }); return; }
    setState({});
    const next = { ...(tw.trim() ? { tw: tw.trim() } : {}), ...(css.trim() ? { css: css.trim() } : {}), ...(r.out ? { out: r.out } : {}) };
    onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...props, code: Object.keys(next).length ? next : undefined } }]);
  };
  return (
    <details className="rounded-xl border border-white/[0.08] p-3" data-testid="studio-code" open={Boolean(code.out) || undefined}>
      <summary className="cursor-pointer select-none text-xs text-white/70">{label} <span className="text-white/35">· Tailwind / CSS</span></summary>
      <div className="mt-2 space-y-2">
        <label className="block text-[11px] text-white/55">Tailwind
          <input className={field} dir="ltr" value={tw} disabled={busy} placeholder="rounded-2xl bg-rose-500 hover:scale-105 md:px-8" onChange={(e) => setTw(e.target.value)} data-testid="studio-code-tw" />
        </label>
        <label className="block text-[11px] text-white/55">CSS <span className="text-white/35">({say("& = العنصر نفسه|& = the element itself|& = הרכיב עצמו")})</span>
          <textarea className={`${field} h-24`} dir="ltr" value={css} disabled={busy} placeholder={"color: #8b1538;\n&:hover { letter-spacing: .05em; }\n@media (max-width: 640px) { padding: 8px; }"} onChange={(e) => setCss(e.target.value)} data-testid="studio-code-css" />
        </label>
        <div className="flex flex-wrap gap-1">
          <button type="button" className={btn} disabled={busy || state.working} onClick={() => void apply()} data-testid="studio-code-apply">{state.working ? say("عم يتجهّز…|Building…|בונה…") : say("طبّق|Apply|החל")}</button>
          {code.out || code.tw || code.css ? <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => { setTw(""); setCss(""); onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...props, code: undefined } }]); }} data-testid="studio-code-clear">{say("شيله|Remove|הסר")}</button> : null}
        </div>
        {state.error ? <p className="text-[11px] text-amber-200" data-testid="studio-code-error">{errorWords(state.error)}</p> : null}
        {code.out ? (
          <details className="text-[10px] text-white/40">
            <summary className="cursor-pointer">{say("اللي انبنى|What was built|מה שנבנה")}</summary>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono" dir="ltr" data-testid="studio-code-out">{code.out}</pre>
          </details>
        ) : null}
        <p className="text-[10px] leading-4 text-white/35">{say("بيطبّق على هالعنصر بس، وبيغلب شكله العادي. hover: و md: و dark: بيشتغلوا.|Applies to this element only and wins over its look. hover:, md: and dark: work.|חל רק על הרכיב הזה.")}</p>
      </div>
    </details>
  );
}
