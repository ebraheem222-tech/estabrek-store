/**
 * A section's live background from the theme library (the shop's pageTree/shader.ts, shaderGlsl.ts and
 * fxEngines.ts, read by path): 21 WebGL shaders and 10 physics and generative canvases, each with its picture (drawn
 * once here: the shaders in one shared WebGL context, the canvases run a few seconds), and for the chosen one its
 * colours (a background and three, each its own or the theme's), rainbow or the colours for the ones drawn in a
 * rainbow, its speed, following the pointer, film grain and a veil for the words on it.
 */
import { useEffect, useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { SHADERS, SHADER_HEAD } from "../../../estabrek-storefront/src/pageTree/shaderGlsl";
import { SHADER_KIND_LIST, shaderOf, type ShaderKind } from "../../../estabrek-storefront/src/pageTree/shader";
import { FX_ENGINES, FX_WARMUP } from "../../../estabrek-storefront/src/pageTree/fxEngines";
import { Range } from "./LookPanels";
import { ColourPick } from "./StudioTreePanels";
import { say } from "./say";

type Obj = Record<string, unknown>;

/** Each shader's name (say()). */
export const SHADER_NAMES: Record<ShaderKind, string> = {
  aurora: "شفق|Aurora|זוהר",
  plasma: "كرة بلازما|Plasma orb|כדור פלזמה",
  ocean: "غروب على البحر|Ocean sunset|שקיעה בים",
  ink: "حبر بالمي|Ink in water|דיו במים",
  caustic: "انعكاسات المسبح|Pool caustics|השתקפויות בריכה",
  chrome: "كروم سائل|Liquid chrome|כרום נוזלי",
  hole: "ثقب أسود|Black hole|חור שחור",
  portal: "بوابة دوّارة|Portal|שער מסתובב",
  synth: "سينث ويف: شمس وشبكة|Synthwave: sun and grid|סינתוויב: שמש ורשת",
  terrain: "طيران فوق الجبال|Flight over mountains|טיסה מעל הרים",
  rift: "شق مضيء|Glowing rift|סדק זוהר",
  sun: "شمس غروب رترو|Retro sunset|שקיעה רטרו",
  mesh: "تدرّج متحرك|Moving gradient|מעבר צבעים נע",
  dither: "كرة منقّطة|Dithered sphere|כדור מנוקד",
  bubbles: "فقاعات صابون|Soap bubbles|בועות סבון",
  cells: "خلايا حيّة|Living cells|תאים חיים",
  kaleido: "مشكال|Kaleidoscope|קליידוסקופ",
  mandel: "تقريب ماندلبرو|Mandelbrot zoom|זום מנדלברוט",
  oil: "زيت ملوّن|Oil film|שמן צבעוני",
  raymarch: "كرات سائلة 3D|Liquid 3D blobs|כדורים נוזליים בתלת ממד",
  tunnel: "نفق ضوئي|Light tunnel|מנהרת אור",
  gem: "ماسة 3D بتلف وبتكسر الضو|A turning 3D diamond that splits the light|יהלום בתלת ממד שמפצל את האור",
  cloth: "علم من قماش حقيقي|Real cloth flag|דגל מבד אמיתי",
  murmuration: "سرب طيور|Flock of birds|להקת ציפורים",
  sand: "رمل بيتساقط|Falling sand|חול נופל",
  magnetic: "حقل مغناطيسي|Magnetic field|שדה מגנטי",
  newton: "مهد نيوتن|Newton's cradle|עריסת ניוטון",
  flow: "لوحة خطوط منسابة|Flow-field poster|פוסטר זרימה",
  arcs: "شرارات كهربا|Electric arcs|קשתות חשמל",
  constellation: "نجوم وأبراج|Stars and constellations|כוכבים ומזלות",
  galaxy: "مجرّة جزيئات|Particle galaxy|גלקסיית חלקיקים",
  koi: "بركة سمك كوي|Koi pond|בריכת קוי",
  field: "حقل خطوط بيأشّر عالماوس|Lines all pointing to the pointer|קווים שמצביעים על העכבר",
  goo: "كرات سائلة بتلزق ببعض|Gooey blobs that melt together|כדורים נוזליים שנדבקים",
  earth: "كرة أرضية منقّطة وطيارات بين المدن|A dotted world with flights between cities|כדור ארץ מנוקד וטיסות בין ערים",
  solar: "مجموعة شمسية|A solar system|מערכת השמש",
};
/** The kinds in two groups: WebGL shaders, then physics and generative canvases. */
const GROUPS: Array<[string, ShaderKind[]]> = [
  ["شيدر WebGL|WebGL shaders|שיידרים WebGL", SHADER_KIND_LIST.filter((k) => SHADERS[k])],
  ["فيزياء ورسم حيّ (بيتفاعل مع الماوس)|Physics and live drawing (answer the pointer)|פיזיקה וציור חי (מגיבים לעכבר)", SHADER_KIND_LIST.filter((k) => FX_ENGINES[k])],
];
const defOf = (k: ShaderKind) => SHADERS[k] ?? FX_ENGINES[k];

/** A canvas background's picture: a few seconds of it run on a small canvas. */
function fxPicture(kind: ShaderKind): string | null {
  const fx = FX_ENGINES[kind];
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 240;
  let ctx: CanvasRenderingContext2D | null = null;
  try { ctx = canvas.getContext("2d"); } catch { ctx = null; }
  if (!ctx || !fx) return null;
  const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const s: Record<string, unknown> = { resized: true };
  const frames = FX_WARMUP[kind] ?? 150;
  try {
    for (let i = 0; i < frames; i++) {
      fx.draw({ ctx, t: i / 60, w: canvas.width, h: canvas.height, s, bg: rgb(fx.bg), c1: rgb(fx.c1), c2: rgb(fx.c2), c3: rgb(fx.c3), pointer: null, press: null });
      s.resized = false;
    }
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}

/** The pictures, drawn once in one WebGL context (browsers allow only a few), each a still moment of its shader. */
const pictures = new Map<string, string>();
let painter: { gl: WebGLRenderingContext; canvas: HTMLCanvasElement } | null | undefined;
export function shaderPicture(kind: ShaderKind): string | null {
  const done = pictures.get(kind);
  if (done) return done;
  if (FX_ENGINES[kind]) {
    const pic = fxPicture(kind);
    if (pic) pictures.set(kind, pic);
    return pic;
  }
  if (painter === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 120;
    let gl: WebGLRenderingContext | null = null;
    try { gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false }); } catch { gl = null; }
    painter = gl ? { gl, canvas } : null;
  }
  if (!painter) return null;
  const { gl, canvas } = painter;
  const def = SHADERS[kind];
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }"));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, SHADER_HEAD + def.frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const rgb = (h: string) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform1f(gl.getUniformLocation(prog, "u_time"), 6);
  gl.uniform2f(gl.getUniformLocation(prog, "u_res"), canvas.width, canvas.height);
  gl.uniform2f(gl.getUniformLocation(prog, "u_mouse"), 0.5, 0.5);
  gl.uniform3fv(gl.getUniformLocation(prog, "u_bg"), rgb(def.bg));
  gl.uniform3fv(gl.getUniformLocation(prog, "u_c1"), rgb(def.c1));
  gl.uniform3fv(gl.getUniformLocation(prog, "u_c2"), rgb(def.c2));
  gl.uniform3fv(gl.getUniformLocation(prog, "u_c3"), rgb(def.c3));
  gl.uniform1f(gl.getUniformLocation(prog, "u_rainbow"), def.rainbow ? 1 : 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  const url = canvas.toDataURL("image/jpeg", 0.82);
  gl.deleteProgram(prog);
  pictures.set(kind, url);
  return url;
}

function Tile({ kind, on, busy, onPick }: { kind: ShaderKind; on: boolean; busy: boolean; onPick: () => void }) {
  const def = defOf(kind);
  const [pic, setPic] = useState<string | null>(() => pictures.get(kind) ?? null);
  useEffect(() => {
    if (pic) return;
    // One at a time, after the panel shows.
    const id = window.setTimeout(() => setPic(shaderPicture(kind)), 30);
    return () => window.clearTimeout(id);
  }, [kind, pic]);
  return (
    <button type="button" disabled={busy} aria-pressed={on} onClick={onPick} title={say(SHADER_NAMES[kind])} className={`overflow-hidden rounded-lg border text-start ${on ? "border-accent-400 ring-1 ring-accent-400/60" : "border-white/[0.08] hover:border-white/25"} disabled:opacity-40`} data-testid="studio-shader-kind" data-kind={kind}>
      <span className="block aspect-[16/10] w-full" style={pic ? { background: `center/cover url(${pic})` } : { background: `linear-gradient(135deg, ${def.bg}, ${def.c1} 55%, ${def.c2})` }} />
      <span className="block truncate px-1.5 py-1 text-[10px] text-white/75">{say(SHADER_NAMES[kind])}</span>
    </button>
  );
}

export function ShaderPanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: (label: string, ops: PageDraftOp[]) => void }) {
  const raw = node.props?.shader;
  const now = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Obj) : null;
  const spec = shaderOf(now);
  const save = (next: Obj | null) => onOps(say("خلفية القسم الحيّة|The section's live background|הרקע החי של המקטע"), [{ op: "setProps", nodeId: node.id, props: { ...node.props, shader: next ?? undefined } }]);
  const set = (patch: Obj) => {
    const next = { ...(now ?? {}), ...patch };
    for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
    save(next);
  };
  const [open, setOpen] = useState(Boolean(spec));
  const def = spec ? defOf(spec.kind) : null;
  return (
    <div className="space-y-2.5 rounded-xl border border-white/[0.08] p-3" data-testid="studio-shader">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 text-start" aria-expanded={open}>
        <span className="text-xs font-medium text-white/70">{say("خلفيات حيّة من المكتبة (WebGL وفيزياء)|Live backgrounds from the library (WebGL and physics)|רקעים חיים מהספרייה (WebGL ופיזיקה)")}</span>
        <span className="text-[10px] text-white/40">{spec ? say(SHADER_NAMES[spec.kind]) : say(`${SHADER_KIND_LIST.length} خلفية|${SHADER_KIND_LIST.length} backgrounds|${SHADER_KIND_LIST.length} רקעים`)} {open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <>
          {spec && def ? (
            <div className="space-y-2 rounded-lg bg-white/[0.04] p-2" data-testid="studio-shader-settings">
              <ColourPick label={say("الخلفية|Background|רקע")} value={spec.bg ?? def.bg} busy={busy} onPick={(v) => set({ bg: v ?? undefined })} testId="studio-shader-bg" />
              <ColourPick label={say("اللون الأول|First colour|צבע ראשון")} value={spec.c1 ?? def.c1} busy={busy} onPick={(v) => set({ c1: v ?? undefined })} testId="studio-shader-c1" />
              <ColourPick label={say("اللون الثاني|Second colour|צבע שני")} value={spec.c2 ?? def.c2} busy={busy} onPick={(v) => set({ c2: v ?? undefined })} testId="studio-shader-c2" />
              <ColourPick label={say("اللون الثالث|Third colour|צבע שלישי")} value={spec.c3 ?? def.c3} busy={busy} onPick={(v) => set({ c3: v ?? undefined })} testId="studio-shader-c3" />
              {SHADERS[spec.kind]?.rainbow ? (
                <label className="flex items-center justify-between gap-2 text-xs text-white/75">
                  <span>{say("بألوان قوس قزح (شيلها لتاخد ألوانك)|In rainbow colours (off: your colours)|בצבעי הקשת (כבוי: הצבעים שלך)")}</span>
                  <input type="checkbox" disabled={busy} checked={spec.rainbow ?? true} onChange={(e) => set({ rainbow: e.target.checked ? undefined : false })} data-testid="studio-shader-rainbow" />
                </label>
              ) : null}
              <Range label={say("السرعة|Speed|מהירות")} value={spec.speed} min={0} max={3} step={0.1} busy={busy} onSave={(speed) => set({ speed: speed === 1 ? undefined : speed })} testId="studio-shader-speed" />
              <label className="flex items-center justify-between gap-2 text-xs text-white/75">
                <span>{say("بيلحق الماوس|Follows the pointer|עוקב אחרי העכבר")}</span>
                <input type="checkbox" disabled={busy} checked={spec.mouse} onChange={(e) => set({ mouse: e.target.checked ? undefined : false })} data-testid="studio-shader-mouse" />
              </label>
              <Range label={say("حبيبات الفيلم|Film grain|גרעיניות")} value={spec.grain} min={0} max={0.4} step={0.02} busy={busy} onSave={(grain) => set({ grain: grain || undefined })} testId="studio-shader-grain" />
              <Range label={say("تغميق للكلام فوقها|Darken for the words on it|הכהיה למילים מעליו")} value={spec.veil} min={0} max={0.85} step={0.05} busy={busy} onSave={(veil) => set({ veil: veil || undefined })} testId="studio-shader-veil" />
              <p className="text-[10px] leading-4 text-white/40">{say("بتشتغل بس لما القسم قريب من الشاشة، وبتوقف صورة ثابتة لمين طالب حركة أقل.|Runs only while the section is near the screen; a still picture for whoever asked for less motion.|פועל רק כשהמקטע ליד המסך; תמונה קבועה למי שביקש פחות תנועה.")}</p>
              <button type="button" disabled={busy} className="rounded-lg bg-white/[0.06] px-2 py-1 text-xs text-red-300 disabled:opacity-40" onClick={() => save(null)} data-testid="studio-shader-remove">
                {say("شيل الخلفية|Remove the background|הסרת הרקע")}
              </button>
            </div>
          ) : null}
          {GROUPS.map(([title, kinds]) => (
            <div key={title} className="space-y-1.5">
              <div className="text-[10px] text-white/45">{say(title)}</div>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={say(title)}>
                {kinds.map((k) => (
                  <Tile key={k} kind={k} on={spec?.kind === k} busy={busy} onPick={() => (spec?.kind === k ? undefined : save({ kind: k }))} />
                ))}
              </div>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
