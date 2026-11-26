/**
 * «ابنِ مشهد WebGL»: the builder of a WebGL scene (the shop's pageTree/glScene.ts, drawn by glEngine.ts), for the
 * element `glScene` and for a section's background (`gl` on both). It starts from a ready design (each drawn here once,
 * as a picture, by the shop's own engine) or a surprise, then everything is the owner's:
 * - the background: a colour, a gradient, a glow, or one of the library's WebGL shaders;
 * - up to four layers of particles, each a form (a sphere, a galaxy, a globe, the owner's words or picture…) it may
 *   morph to others from, or a flow (rain, snow, fireworks, a warp…); how many, their size, sprite, colours, glow,
 *   place, and how they move (wander, waves, twinkle, breathing, turning, lines between them);
 * - the camera (turning by itself or by hand, tilt, zoom, depth), the pointer (push, pull, swirl, swell), a press
 *   (burst, shock wave, the next form), the scroll, the morph's timing, trails, grain, a dark edge and a veil.
 * One change = one step back with undo.
 */
import { useEffect, useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { MediaLibraryModal } from "../components/media/MediaLibraryModal";
import type { Lang } from "../lib/lang";
import {
  GL_BG_SHADERS, GL_CLICK, GL_COLOURING, GL_FLOWS, GL_FONTS, GL_FORMS, GL_LAYER_DEFAULT, GL_MAX_FORMS, GL_MAX_LAYERS, GL_MORPH_BY, GL_PICTURE_MODES, GL_POINTER, GL_SCROLL, GL_SPRITES,
  glSceneOf, isFlow, type GlShape,
} from "../../../estabrek-storefront/src/pageTree/glScene";
import { startGl, type Rgb } from "../../../estabrek-storefront/src/pageTree/glEngine";
import { Range } from "./LookPanels";
import { Field } from "./StudioPanels";
import { Choice, ColourPick } from "./StudioTreePanels";
import { SHADER_NAMES, shaderPicture } from "./ShaderPanel";
import { GL_PRESETS, randomScene, type GlPreset } from "./glPresets";
import { uploadImages } from "../api/uploads.api";
import { DepthError, depthFile, estimateDepth } from "../lib/depth";
import { say } from "./say";

type Obj = Record<string, unknown>;
type Ops = (label: string, ops: PageDraftOp[]) => void;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const box = "space-y-2.5 rounded-xl border border-white/8 p-3";
const sub = "space-y-2 rounded-lg bg-white/4 p-2";
const btn = "rounded-lg bg-white/6 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-40";
const head = "text-[11px] font-medium text-white/60";

export const GL_SHAPE_NAMES: Record<GlShape, string> = {
  sphere: "كرة|Sphere|כדור", ball: "كرة مليانة|Filled ball|כדור מלא", cube: "مكعّب|Cube|קובייה", torus: "حلقة دونات|Ring (torus)|טבעת",
  knot: "عقدة|Knot|קשר", helix: "حمض نووي DNA|DNA helix|סליל DNA", galaxy: "مجرّة|Galaxy|גלקסיה", rings: "كوكب وحلقات|Planet and rings|כוכב וטבעות",
  wave: "بحر بيموج|Waving sea|ים גלי", grid: "شبكة نقاط|Grid of dots|רשת נקודות", cylinder: "أسطوانة|Cylinder|גליל", cone: "إعصار|Tornado|טורנדו",
  heart: "قلب|Heart|לב", star: "نجمة|Star|כוכב", cloud: "غيمة|Cloud|ענן", globe: "الكرة الأرضية|The globe|כדור הארץ", spiral: "دوّار الشمس|Sunflower|חמנייה",
  text: "كلامك|Your words|המילים שלך", image: "صورتك|Your picture|התמונה שלך",
  lissajous: "عقدة ليساجو|Lissajous knot|קשר ליסז'ו", mobius: "شريط موبيوس|Möbius strip|רצועת מביוס", klein: "قنينة كلاين|Klein bottle|בקבוק קליין",
  supershape: "شكل الصيغة الخارقة|Superformula shape|צורת נוסחת־העל", gyroid: "جايرويد|Gyroid|גירואיד", hopf: "ألياف هوبف|Hopf fibration|סיבי הופף",
  sierpinski: "هرم سيربنسكي|Sierpiński pyramid|פירמידת שרפינסקי", fern: "سرخس بارنسلي|Barnsley fern|שרך בארנסלי", rose: "وردة رياضية|Rose curve|עקומת ורד", blob: "كرة توافقية|Harmonic blob|כדור הרמוני",
  rain: "مطر|Rain|גשם", snow: "تلج|Snow|שלג", rise: "فقاعات طالعة|Rising bubbles|בועות עולות", warp: "سرعة الضو|Light speed|מהירות האור",
  fountain: "نافورة|Fountain|מזרקה", fireworks: "ألعاب نارية|Fireworks|זיקוקים", vortex: "دوّامة|Whirlpool|מערבולת", flow: "خطوط منسابة|Flowing lines|קווים זורמים",
  orbit: "مدارات|Orbits|מסלולים", fireflies: "يراعات|Fireflies|גחליליות",
  lorenz: "فراشة لورنز (فوضى)|Lorenz butterfly (chaos)|פרפר לורנץ (כאוס)", aizawa: "جاذب أيزاوا|Aizawa attractor|מושך אייזאווה", thomas: "جاذب توماس|Thomas attractor|מושך תומאס",
  flock: "سرب طيور (بويدز)|A flock (boids)|להקה (בוידס)", gravity: "جاذبية وشموس|Gravity and suns|כבידה ושמשות", pendulum: "بندولات الفوضى|Chaos pendulums|מטוטלות כאוס",
  charge: "خطوط حقل كهربائي|Electric field lines|קווי שדה חשמלי", cloth: "قماش معلّق|Hanging cloth|בד תלוי", pond: "بركة بتموج|Rippling pond|בריכה מגלגלת",
};
/** Where the forms and the flows part into their groups: the maths ones after. */
const FIRST_MATHS_FORM = GL_FORMS.indexOf("lissajous");
const FIRST_PHYSICS_FLOW = GL_FLOWS.indexOf("lorenz");
const SPRITE_NAMES: Record<(typeof GL_SPRITES)[number], string> = {
  soft: "ضو ناعم|Soft glow|זוהר רך", dot: "نقطة|Dot|נקודה", ring: "حلقة|Ring|טבעת", square: "مربّع|Square|ריבוע", star: "نجمة بتلمع|Sparkle|נצנוץ",
  spark: "شرارة|Spark|ניצוץ", plus: "زائد|Plus|פלוס", heart: "قلب|Heart|לב", glyph: "حروف (مطر أكواد)|Letters (code rain)|אותיות (גשם קוד)",
  streak: "خط ورا حركته|A streak behind it|שובל מאחוריו",
};
const COLOURING_NAMES: Record<(typeof GL_COLOURING)[number], string> = {
  one: "لون واحد|One colour|צבע אחד", blend: "لونين متدرّجين|Two blended|שניים במעבר", three: "تلات ألوان|Three colours|שלושה צבעים",
  rainbow: "قوس قزح|Rainbow|קשת", random: "مخلوطين|Mixed|מעורבים", picture: "ألوان الصورة|The picture's own|של התמונה",
};
const POINTER_NAMES: Record<(typeof GL_POINTER)[number], string> = { none: "ولا شي|Nothing|כלום", repel: "بتهرب منه|Flee it|בורחים", attract: "بتنجذب إله|Drawn to it|נמשכים", swirl: "بتلف حوله|Swirl round it|מסתחררים", bulge: "بتنتفخ لقدّام|Swell forward|מתנפחים", gravity: "شمس بتجذبها لمدار|A sun pulling them into orbit|שמש שמושכת למסלול" };
const CLICK_NAMES: Record<(typeof GL_CLICK)[number], string> = { none: "ولا شي|Nothing|כלום", burst: "بتنفجر وبترجع|Burst and come back|מתפוצצים וחוזרים", shock: "موجة صدمة|A shock wave|גל הדף", next: "الشكل اللي بعده|The next form|הצורה הבאה" };
const SCROLL_NAMES: Record<(typeof GL_SCROLL)[number], string> = { none: "ولا شي|Nothing|כלום", spin: "بتلف|Turns|מסתובב", zoom: "بتقرّب|Comes near|מתקרב", scatter: "بتتجمّع بالنص وبتتفرّق|Gathers in the middle, scatters|מתאסף באמצע ומתפזר", rise: "بتطلع لفوق|Rises|עולה" };
const MORPH_NAMES: Record<(typeof GL_MORPH_BY)[number], string> = { auto: "لحالها كل شوي|By itself|לבד", scroll: "مع السكرول|With the scroll|עם הגלילה", click: "بكبسة|On a press|בלחיצה", hover: "لما يمرّ الماوس|Under the pointer|מתחת לעכבר" };
/** How words or a picture become dots (the shop's glPicture.ts). */
const PICTURE_MODE_NAMES: Record<(typeof GL_PICTURE_MODES)[number], string> = {
  pixels: "نقطة عكل بكسل|A dot on every pixel|נקודה על כל פיקסל",
  edges: "خطوط حوافها (رسمة)|Its outlines (a drawing)|קווי המתאר (ציור)",
  stipple: "تنقيط بالحبر|Ink stipple|נקודות דיו",
  blobs: "بقع بأحجامها وألوانها|Blobs, each its size and colour|כתמים, כל אחד בגודלו ובצבעו",
  features: "شرارات على زواياها|Sparks on its corners|ניצוצות על הפינות",
  palette: "بألوانها الأساسية (بوستر)|In its main colours (a poster)|בצבעים העיקריים (פוסטר)",
};
const FONT_NAMES: Record<(typeof GL_FONTS)[number], string> = { page: "خط الصفحة|The page's font|גופן העמוד", sans: "بسيط|Plain|פשוט", serif: "كلاسيكي|Classic|קלאסי", mono: "آلة كاتبة|Typewriter|מכונת כתיבה", display: "عريض|Bold display|עבה" };
const BG_NAMES: Array<[string, string]> = [["none", "شفافة (خلفية القسم)|See-through (the section's)|שקוף (של המקטע)"], ["color", "لون|A colour|צבע"], ["gradient", "تدرّج|A gradient|מעבר צבעים"], ["radial", "ضو بالنص|A glow in the middle|זוהר באמצע"], ["shader", "شيدر حيّ من المكتبة|A live shader from the library|שיידר חי מהספרייה"]];
const DEFAULT_COLOURS = ["#8b5cf6", "#22d3ee", "#f472b6"];

/* ---------------------------------------------------------------- pictures */

const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const asRgb = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? hex(v) : null);
const pictures = new Map<string, string | null>();
const queue: Array<() => void> = [];
let drawing = false;
/** A scene's picture: a few seconds of it, drawn on a small canvas by the shop's engine (one at a time). */
function scenePicture(key: string, gl: Obj, lang: Lang, done: (url: string | null) => void) {
  if (pictures.has(key)) return done(pictures.get(key) ?? null);
  queue.push(() => {
    let url: string | null = null;
    try {
      const spec = glSceneOf(gl, (t) => (t && typeof t === "object" ? String((t as Record<string, string>)[lang] ?? (t as Record<string, string>).en ?? "") : typeof t === "string" ? t : ""));
      if (spec) {
        const canvas = document.createElement("canvas");
        canvas.width = 288;
        canvas.height = 180;
        const colours = { bg: [spec.bg.c1, spec.bg.c2, spec.bg.c3, spec.bg.c4].map(asRgb), layers: spec.layers.map((l) => [l.c1, l.c2, l.c3].map(asRgb)) };
        const run = startGl(canvas, { ...spec, layers: spec.layers.map((l) => ({ ...l, count: Math.min(l.count, 6000) })) }, { colours, family: "system-ui, sans-serif", rtl: lang !== "en", preserve: true, dpr: 1 });
        if (run) {
          // A morphing design is caught on a whole form, not on its way between two.
          run.warm(spec.morph.by === "auto" && spec.layers.some((l) => l.shapes.length > 1) ? Math.min(3, spec.morph.hold + 0.5) : 3);
          url = canvas.toDataURL("image/jpeg", 0.8);
          run.dispose();
        }
      }
    } catch {
      url = null;
    }
    pictures.set(key, url);
    done(url);
  });
  if (!drawing) next();
}
function next() {
  const job = queue.shift();
  drawing = Boolean(job);
  if (job) window.setTimeout(() => { job(); next(); }, 20);
}

function PresetTile({ preset, lang, busy, onPick }: { preset: GlPreset; lang: Lang; busy: boolean; onPick: () => void }) {
  const [pic, setPic] = useState<string | null>(() => pictures.get(`${preset.id}:${lang}`) ?? null);
  useEffect(() => {
    let live = true;
    scenePicture(`${preset.id}:${lang}`, preset.gl, lang, (u) => live && setPic(u));
    return () => { live = false; };
  }, [preset, lang]);
  return (
    <button type="button" disabled={busy} onClick={onPick} title={say(preset.name)} className="overflow-hidden rounded-lg border border-white/8 text-start hover:border-white/25 disabled:opacity-40" data-testid="studio-gl-preset" data-preset={preset.id}>
      <span className="block aspect-16/10 w-full bg-[#07070d]" style={pic ? { background: `center/cover url(${pic})` } : undefined} />
      <span className="block truncate px-1.5 py-1 text-[10px] text-white/75">{say(preset.name)}</span>
    </button>
  );
}

function ShaderTile({ kind, on, busy, onPick }: { kind: string; on: boolean; busy: boolean; onPick: () => void }) {
  const [pic, setPic] = useState<string | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => setPic(shaderPicture(kind as never)), 30);
    return () => window.clearTimeout(id);
  }, [kind]);
  const name = say(SHADER_NAMES[kind as keyof typeof SHADER_NAMES] ?? kind);
  return (
    <button type="button" disabled={busy} aria-pressed={on} onClick={onPick} title={name} className={`overflow-hidden rounded-md border ${on ? "border-accent-400 ring-1 ring-accent-400/60" : "border-white/8 hover:border-white/25"} disabled:opacity-40`} data-testid="studio-gl-shader" data-kind={kind}>
      <span className="block aspect-16/10 w-full bg-white/5" style={pic ? { background: `center/cover url(${pic})` } : undefined} />
      <span className="block truncate px-1 py-0.5 text-[9px] text-white/70">{name}</span>
    </button>
  );
}

/** «عمق حقيقي»: the picture's depth by the model on this device (lib/depth.ts), saved beside it, its dots then lifted by it. */
function RealDepth({ image, has, busy, onDepth }: { image: string; has: boolean; busy: boolean; onDepth: (url: string | undefined) => void }) {
  const [work, setWork] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const make = async () => {
    setError(false);
    setWork(say("عم نجهّز…|Getting ready…|מתכוננים…"));
    try {
      const map = await estimateDepth(image, { onProgress: (p) => setWork(p.phase === "download" ? `${say("عم ننزّل الموديل (مرة وحدة)|Downloading the model (once)|מורידים את המודל (פעם אחת)")} ${p.total ? Math.round(((p.loaded ?? 0) / p.total) * 100) : 0}%` : p.phase === "prepare" ? say("عم نجهّز الموديل…|Preparing the model…|מכינים את המודל…") : say("عم نقدّر العمق…|Working out the depth…|מעריכים את העומק…")) });
      setWork(say("عم نحفظ…|Saving…|שומרים…"));
      const up = await uploadImages([await depthFile(map, "scene")], { keepAsNew: true, tags: ["depth"] });
      if (up.files[0]?.url) onDepth(up.files[0].url);
    } catch (e) {
      setError(!(e instanceof DepthError && e.code === "ABORTED"));
    } finally {
      setWork(null);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/55" data-testid="studio-gl-depth">
      {work ? <span>{work}</span> : (
        <>
          <button type="button" className={btn} disabled={busy} onClick={() => void make()} data-testid="studio-gl-depth-make">🧊 {has ? say("عمق حقيقي من جديد|Real depth again|עומק אמיתי מחדש") : say("عمق حقيقي بالذكاء (على جهازك)|Real depth by AI (on your device)|עומק אמיתי עם AI (במכשיר שלך)")}</button>
          {has ? <button type="button" className={btn} disabled={busy} onClick={() => onDepth(undefined)} data-testid="studio-gl-depth-remove">{say("رجّع العمق من الإضاءة|Back to depth by light|חזרה לעומק לפי האור")}</button> : null}
        </>
      )}
      {error ? <span className="text-red-300">{say("ما زبط، جرّب كمان مرة.|It didn't work; try again.|זה לא הצליח; נסה שוב.")}</span> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- the panel */

export function GlScenePanel({ node, mode, lang, busy, onOps }: { node: PageTreeNode; mode: "element" | "bg"; lang: Lang; busy: boolean; onOps: Ops }) {
  const props = (node.props ?? {}) as Obj;
  const raw = obj(props.gl);
  const has = Object.keys(raw).length > 0;
  const spec = has ? glSceneOf(raw, (t) => (t && typeof t === "object" ? String((t as Record<string, string>)[lang] ?? "") : "")) : null;
  const [open, setOpen] = useState(mode === "element" || has);
  const [at, setAt] = useState(0);
  const [picking, setPicking] = useState(false);
  const save = (label: string, gl: Obj | null, more: Obj = {}) => {
    const nextProps: Obj = { ...props, ...more, gl: gl ?? undefined };
    for (const k of Object.keys(more)) if (nextProps[k] === undefined) delete nextProps[k];
    onOps(label, [{ op: "setProps", nodeId: node.id, props: nextProps }]);
  };
  const clean = (o: Obj) => {
    const out = { ...o };
    for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
    return out;
  };
  const set = (label: string, patch: Obj) => save(label, clean({ ...raw, ...patch }));
  const setIn = (key: "bg" | "camera" | "pointer" | "morph", label: string, patch: Obj) => set(label, { [key]: clean({ ...obj(raw[key]), ...patch }) });
  const layers = (Array.isArray(raw.layers) ? raw.layers : []).map(obj);
  const li = Math.min(at, Math.max(0, layers.length - 1));
  const layer = layers[li];
  const shown = spec?.layers[li];
  const setLayer = (label: string, patch: Obj) => set(label, { layers: layers.map((l, i) => (i === li ? clean({ ...l, ...patch }) : l)) });
  const usePreset = (gl: Obj, name: string) => {
    setAt(0);
    save(say(`تصميم جاهز: ${say(name)}|A ready design: ${say(name)}|עיצוב מוכן: ${say(name)}`), gl, mode === "element" && typeof props.height !== "number" ? { height: 480 } : {});
  };
  const morphs = layers.some((l) => Array.isArray(l.shapes) && l.shapes.length > 1);

  const presets = (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className={head}>{say("ابدأ من تصميم جاهز|Start from a ready design|התחל מעיצוב מוכן")}</span>
        <button type="button" className={btn} disabled={busy} onClick={() => usePreset(randomScene(), "فاجئني|Surprise me|הפתע אותי")} data-testid="studio-gl-random">🎲 {say("فاجئني|Surprise me|הפתע אותי")}</button>
      </div>
      <div className="grid max-h-72 grid-cols-2 gap-1.5 overflow-y-auto pe-1" data-testid="studio-gl-presets">
        {GL_PRESETS.map((p) => <PresetTile key={p.id} preset={p} lang={lang} busy={busy} onPick={() => usePreset(p.gl, p.name)} />)}
      </div>
    </div>
  );

  return (
    <div className={box} data-testid="studio-gl" data-mode={mode}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 text-start" aria-expanded={open} data-testid="studio-gl-open">
        <span className="text-xs font-medium text-white/70">✨ {mode === "bg" ? say("خلفية WebGL تبنيها بإيدك (جزيئات)|A WebGL background you build (particles)|רקע WebGL שבונים לבד (חלקיקים)") : say("ابنِ مشهد WebGL|Build a WebGL scene|בנה סצנת WebGL")}</span>
        <span className="text-[10px] text-white/40">{spec ? say(`${spec.layers.length} طبقة|${spec.layers.length} layers|${spec.layers.length} שכבות`) : ""} {open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <>
          <p className="text-[10px] leading-4 text-white/40">{say("جزيئات بكرت الشاشة: أشكال بتتحوّل لبعض، كلامك وصورتك من نقاط، مطر وألعاب نارية… كلشي بتتحكم فيه، وبيتحرك مع الماوس والسكرول.|Particles drawn by the graphics card: forms that morph into each other, your words and picture in dots, rain and fireworks… all yours to set, moving with the pointer and the scroll.|חלקיקים שכרטיס המסך מצייר: צורות שהופכות זו לזו, המילים והתמונה שלך מנקודות, גשם וזיקוקים… הכל בשליטתך, זז עם העכבר והגלילה.")}</p>
          {presets}
          {spec ? (
            <>
              {/* The background. */}
              <div className={sub} data-testid="studio-gl-bg">
                <div className={head}>{say("الخلفية|The background|הרקע")}</div>
                <Choice label="" value={spec.bg.kind as string} busy={busy} options={BG_NAMES.map(([k, n]) => [k, say(n)])} onPick={(kind) => setIn("bg", say("الخلفية|The background|הרקע"), { kind, ...(kind === "shader" && !obj(raw.bg).shader ? { shader: "aurora" } : {}) })} testId="studio-gl-bg-kind" />
                {spec.bg.kind === "shader" ? (
                  <>
                    <div className="grid max-h-48 grid-cols-3 gap-1 overflow-y-auto pe-1">
                      {GL_BG_SHADERS.map((k) => <ShaderTile key={k} kind={k} on={spec.bg.shader === k} busy={busy} onPick={() => setIn("bg", say("الشيدر|The shader|השיידר"), { shader: k })} />)}
                    </div>
                    <Range label={say("سرعته|Its speed|המהירות שלו")} value={spec.bg.speed} min={0} max={3} step={0.1} busy={busy} onSave={(speed) => setIn("bg", say("سرعة الشيدر|Shader speed|מהירות השיידר"), { speed })} testId="studio-gl-bg-speed" />
                    {(["c1", "c2", "c3", "c4"] as const).map((k, i) => (
                      <ColourPick key={k} label={say(["أرضيته|Its ground|הרקע שלו", "لونه الأول|Its first colour|הצבע הראשון", "لونه التاني|Its second colour|הצבע השני", "لونه التالت|Its third colour|הצבע השלישי"][i])} value={spec.bg[k]} busy={busy} onPick={(v) => setIn("bg", say("ألوان الشيدر|Shader colours|צבעי השיידר"), { [k]: v ?? undefined })} testId={`studio-gl-bg-${k}`} />
                    ))}
                  </>
                ) : spec.bg.kind !== "none" ? (
                  <>
                    <ColourPick label={spec.bg.kind === "color" ? say("اللون|The colour|הצבע") : spec.bg.kind === "radial" ? say("بالنص|In the middle|באמצע") : say("فوق|At the top|למעלה")} value={spec.bg.c1 ?? "#07070d"} busy={busy} onPick={(v) => setIn("bg", say("لون الخلفية|Background colour|צבע הרקע"), { c1: v ?? undefined })} testId="studio-gl-bg-c1" />
                    {spec.bg.kind !== "color" ? <ColourPick label={spec.bg.kind === "radial" ? say("عالأطراف|At the edges|בקצוות") : say("تحت|At the bottom|למטה")} value={spec.bg.c2 ?? "#25124a"} busy={busy} onPick={(v) => setIn("bg", say("لون الخلفية|Background colour|צבע הרקע"), { c2: v ?? undefined })} testId="studio-gl-bg-c2" /> : null}
                  </>
                ) : null}
              </div>

              {/* The layers. */}
              <div className={sub} data-testid="studio-gl-layers">
                <div className="flex flex-wrap items-center gap-1">
                  <span className={`${head} me-1`}>{say("طبقات الجزيئات|Layers of particles|שכבות החלקיקים")}</span>
                  {layers.map((l, i) => (
                    <button key={i} type="button" className={`${btn} ${i === li ? "bg-accent-500/30 text-white" : ""}`} aria-pressed={i === li} onClick={() => setAt(i)} data-testid="studio-gl-layer-tab">
                      {i + 1}. {say(GL_SHAPE_NAMES[(Array.isArray(l.shapes) ? l.shapes[0] : "sphere") as GlShape] ?? "")}
                    </button>
                  ))}
                  {layers.length < GL_MAX_LAYERS ? (
                    <button type="button" className={btn} disabled={busy} onClick={() => { setAt(layers.length); set(say("طبقة جديدة|A new layer|שכבה חדשה"), { layers: [...layers, { shapes: ["fireflies"], count: 200, size: 5, colouring: "blend" }] }); }} data-testid="studio-gl-add-layer">＋ {say("طبقة|Layer|שכבה")}</button>
                  ) : null}
                </div>
                {layer && shown ? (
                  <div className="space-y-2" data-testid="studio-gl-layer">
                    <div className={head}>{say("الشكل اللي بتعمله|The form they make|הצורה שהם יוצרים")}</div>
                    <div className="flex flex-wrap gap-1" data-testid="studio-gl-forms">
                      {GL_FORMS.slice(0, FIRST_MATHS_FORM).map((f) => (
                        <button key={f} type="button" className={`${btn} ${shown.shapes[0] === f ? "bg-accent-500/30 text-white" : ""}`} aria-pressed={shown.shapes[0] === f} disabled={busy} onClick={() => setLayer(say("الشكل|The form|הצורה"), { shapes: isFlow(shown.shapes[0]) ? [f] : [f, ...shown.shapes.slice(1)] })} data-testid="studio-gl-shape" data-shape={f}>{say(GL_SHAPE_NAMES[f])}</button>
                      ))}
                    </div>
                    <div className={head}>{say("أشكال من الرياضيات|Forms from mathematics|צורות מהמתמטיקה")}</div>
                    <div className="flex flex-wrap gap-1" data-testid="studio-gl-maths">
                      {GL_FORMS.slice(FIRST_MATHS_FORM).map((f) => (
                        <button key={f} type="button" className={`${btn} ${shown.shapes[0] === f ? "bg-accent-500/30 text-white" : ""}`} aria-pressed={shown.shapes[0] === f} disabled={busy} onClick={() => setLayer(say("الشكل|The form|הצורה"), { shapes: isFlow(shown.shapes[0]) ? [f] : [f, ...shown.shapes.slice(1)] })} data-testid="studio-gl-shape" data-shape={f}>{say(GL_SHAPE_NAMES[f])}</button>
                      ))}
                    </div>
                    <div className={head}>{say("أو حركة ما بتوقف|Or a motion that never stops|או תנועה שלא נעצרת")}</div>
                    <div className="flex flex-wrap gap-1">
                      {GL_FLOWS.slice(0, FIRST_PHYSICS_FLOW).map((f) => (
                        <button key={f} type="button" className={`${btn} ${shown.shapes[0] === f ? "bg-accent-500/30 text-white" : ""}`} aria-pressed={shown.shapes[0] === f} disabled={busy} onClick={() => setLayer(say("الحركة|The motion|התנועה"), { shapes: [f] })} data-testid="studio-gl-shape" data-shape={f}>{say(GL_SHAPE_NAMES[f])}</button>
                      ))}
                    </div>
                    <div className={head}>{say("فيزياء ورياضيات حقيقية (فوضى، جاذبية، موج…)|Real physics and maths (chaos, gravity, waves…)|פיזיקה ומתמטיקה אמיתיות (כאוס, כבידה, גלים…)")}</div>
                    <div className="flex flex-wrap gap-1" data-testid="studio-gl-physics">
                      {GL_FLOWS.slice(FIRST_PHYSICS_FLOW).map((f) => (
                        <button key={f} type="button" className={`${btn} ${shown.shapes[0] === f ? "bg-accent-500/30 text-white" : ""}`} aria-pressed={shown.shapes[0] === f} disabled={busy} onClick={() => setLayer(say("الحركة|The motion|התנועה"), { shapes: [f] })} data-testid="studio-gl-shape" data-shape={f}>{say(GL_SHAPE_NAMES[f])}</button>
                      ))}
                    </div>
                    {shown.shapes[0] === "pendulum" ? <p className="text-[10px] leading-4 text-white/40">{say("كل البندولات بتبلّش فرق شعرة عن بعض، وبعد ثواني كل واحد بروح بطريق: هاي الفوضى. كبسة بتعيدهم من الأول.|Every pendulum starts a hair apart from the next, and within seconds each goes its own way: that is chaos. A press starts them again.|כל מטוטלת מתחילה במרחק שערה מהבאה, ותוך שניות כל אחת הולכת לדרכה: זה כאוס. לחיצה מתחילה מחדש.")}</p> : null}
                    {!isFlow(shown.shapes[0]) ? (
                      <div className="space-y-1" data-testid="studio-gl-morph">
                        <div className={head}>{say("وبتتحوّل بعدها لـ|And then morphs into|ואז הופכת ל")}</div>
                        <div className="flex flex-wrap items-center gap-1">
                          {shown.shapes.slice(1).map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-white/8 px-2 py-0.5 text-xs">
                              {say(GL_SHAPE_NAMES[f])}
                              <button type="button" className="text-red-300" disabled={busy} aria-label={say("شيل|Remove|הסר")} onClick={() => setLayer(say("التحوّل|The morph|ההתמרה"), { shapes: shown.shapes.filter((_, j) => j !== i + 1) })}>✕</button>
                            </span>
                          ))}
                          {shown.shapes.length < GL_MAX_FORMS ? (
                            <select className="rounded-lg bg-white/6 px-1.5 py-1 text-xs" value="" disabled={busy} onChange={(e) => e.target.value && setLayer(say("التحوّل|The morph|ההתמרה"), { shapes: [...shown.shapes, e.target.value] })} data-testid="studio-gl-morph-add">
                              <option value="">＋ {say("شكل|A form|צורה")}</option>
                              {GL_FORMS.map((f) => <option key={f} value={f}>{say(GL_SHAPE_NAMES[f])}</option>)}
                            </select>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {shown.shapes.includes("text") ? (
                      <>
                        <Field label={say("الكلام اللي بيترسم من نقاط|The words drawn in dots|המילים שמצוירות מנקודות")} value={typeof obj(layer.text)[lang] === "string" ? String(obj(layer.text)[lang]) : ""} maxLength={40} onSave={(v) => setLayer(say("الكلام|The words|המילים"), { text: clean({ ...obj(layer.text), [lang]: v.trim() || undefined }) })} testId="studio-gl-text" />
                        <Choice label={say("الخط|The font|הגופן")} value={shown.font as string} busy={busy} options={GL_FONTS.map((f) => [f, say(FONT_NAMES[f])])} onPick={(font) => setLayer(say("الخط|The font|הגופן"), { font })} testId="studio-gl-font" />
                      </>
                    ) : null}
                    {shown.shapes.includes("image") ? (
                      <div className="flex items-center gap-2 text-[11px] text-white/55">
                        {shown.image ? <img src={shown.image} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-md bg-white/[0.06]">—</span>}
                        <span className="min-w-0 flex-1">{say("الصورة (لوغو بخلفية شفافة أو بيضا بيطلع أحلى)|The picture (a logo on a clear or white ground looks best)|התמונה (לוגו על רקע שקוף או לבן נראה הכי טוב)")}</span>
                        <button type="button" className={btn} disabled={busy} onClick={() => setPicking(true)} data-testid="studio-gl-image">{say("اختار|Choose|בחר")}</button>
                        <MediaLibraryModal open={picking} onClose={() => setPicking(false)} title={say("الصورة|The picture|התמונה")} onSelect={(u) => { setPicking(false); setLayer(say("الصورة|The picture|התמונה"), { image: u, colouring: "picture" }); }} />
                      </div>
                    ) : null}
                    {shown.shapes.filter((f) => f === "text" || f === "image").map((f, k, all) => (
                      <Choice
                        key={`mode-${k}`}
                        label={`${say("كيف بتصير نقاط|How it becomes dots|איך זה הופך לנקודות")}: ${say(GL_SHAPE_NAMES[f])}${all.length > 1 ? ` (${k + 1})` : ""}`}
                        value={(shown.pictureModes[k] ?? "pixels") as string}
                        busy={busy}
                        options={GL_PICTURE_MODES.map((m) => [m, say(PICTURE_MODE_NAMES[m])])}
                        onPick={(m) => {
                          const modes = all.map((_, j) => (j === k ? m : shown.pictureModes[j] ?? "pixels"));
                          while (modes.length && modes[modes.length - 1] === "pixels") modes.pop();
                          setLayer(say("طريقة النقاط|The way of the dots|דרך הנקודות"), { pictureModes: modes.length ? modes : undefined });
                        }}
                        testId="studio-gl-picture-mode"
                      />
                    ))}
                    {shown.shapes.includes("text") || shown.shapes.includes("image") ? (
                      <>
                        <Range label={say("النقاط بتتحرك على خطوطها (ضربات فرشاة)|The dots move along its lines (brush strokes)|הנקודות זזות לאורך הקווים (משיכות מכחול)")} value={shown.strokes} min={0} max={1} step={0.05} busy={busy} onSave={(strokes) => setLayer(say("ضربات الفرشاة|Brush strokes|משיכות מכחול"), { strokes: strokes || undefined })} testId="studio-gl-strokes" />
                        <Range label={shown.depthMap ? say("قديش عميقة (بعمقها الحقيقي)|How deep (by its real depth)|כמה עמוקה (לפי העומק האמיתי)") : say("بارزة (الفاتح لقدّام)|In relief (light comes forward)|בתבליט (הבהיר קדימה)")} value={shown.relief} min={0} max={1} step={0.05} busy={busy} onSave={(relief) => setLayer(say("البروز|Relief|תבליט"), { relief: relief || undefined })} testId="studio-gl-relief" />
                        {shown.image && shown.shapes.includes("image") ? <RealDepth image={shown.image} has={Boolean(shown.depthMap)} busy={busy} onDepth={(url) => setLayer(say("العمق الحقيقي|Real depth|עומק אמיתי"), { depthMap: url, ...(url && !shown.relief ? { relief: 0.6 } : {}) })} /> : null}
                      </>
                    ) : null}
                    <Range label={say("كم جزيء|How many particles|כמה חלקיקים")} value={shown.count} min={50} max={30000} step={50} busy={busy} onSave={(count) => setLayer(say("العدد|How many|כמה"), { count })} testId="studio-gl-count" />
                    <Range label={say("حجم الجزيء|Particle size|גודל החלקיק")} value={shown.size} min={0.5} max={24} step={0.1} unit="px" busy={busy} onSave={(size) => setLayer(say("الحجم|Size|גודל"), { size })} testId="studio-gl-size" />
                    <Range label={say("قديش بتختلف أحجامها|How much their sizes differ|כמה הגדלים שונים")} value={shown.vary} min={0} max={1} step={0.05} busy={busy} onSave={(vary) => setLayer(say("اختلاف الأحجام|Sizes differ|גדלים שונים"), { vary })} testId="studio-gl-vary" />
                    <Choice label={say("شكل الجزيء|Each particle looks like|כל חלקיק נראה כמו")} value={shown.sprite as string} busy={busy} options={GL_SPRITES.map((s) => [s, say(SPRITE_NAMES[s])])} onPick={(sprite) => setLayer(say("شكل الجزيء|Particle look|מראה החלקיק"), { sprite })} testId="studio-gl-sprite" />
                    {shown.sprite === "glyph" ? <Field label={say("الحروف اللي بتطلع|The letters it shows|האותיות שמופיעות")} value={shown.glyphs} maxLength={64} onSave={(glyphs) => setLayer(say("الحروف|The letters|האותיות"), { glyphs: glyphs.replace(/\s/g, "") || undefined })} testId="studio-gl-glyphs" /> : null}
                    <Choice label={say("الألوان|Colours|צבעים")} value={shown.colouring as string} busy={busy} options={GL_COLOURING.filter((c) => c !== "picture" || shown.shapes.includes("image") || shown.shapes.includes("text")).map((c) => [c, say(COLOURING_NAMES[c])])} onPick={(colouring) => setLayer(say("الألوان|Colours|צבעים"), { colouring })} testId="studio-gl-colouring" />
                    {shown.colouring !== "rainbow" && shown.colouring !== "picture" ? (
                      (["c1", "c2", "c3"] as const).slice(0, shown.colouring === "one" ? 1 : shown.colouring === "blend" ? 2 : 3).map((k, i) => (
                        <ColourPick key={k} label={say(["اللون الأول|First colour|צבע ראשון", "اللون التاني|Second colour|צבע שני", "اللون التالت|Third colour|צבע שלישי"][i])} value={shown[k] ?? DEFAULT_COLOURS[i]} busy={busy} onPick={(v) => setLayer(say("لون الجزيئات|Particle colour|צבע החלקיקים"), { [k]: v ?? undefined })} testId={`studio-gl-${k}`} />
                      ))
                    ) : null}
                    <Range label={say("الوضوح|Opacity|אטימות")} value={shown.opacity} min={0.05} max={1} step={0.05} busy={busy} onSave={(opacity) => setLayer(say("الوضوح|Opacity|אטימות"), { opacity })} testId="studio-gl-opacity" />
                    <label className="flex items-center justify-between gap-2 text-xs text-white/75">
                      <span>{say("بتضوي فوق بعض (أحلى عخلفية غامقة)|Light adds up (best on a dark ground)|האור מצטבר (הכי יפה על רקע כהה)")}</span>
                      <input type="checkbox" disabled={busy} checked={shown.glow} onChange={(e) => setLayer(say("الضو|Glow|זוהר"), { glow: e.target.checked ? undefined : false })} data-testid="studio-gl-glow" />
                    </label>
                    <div className={head}>{say("مكانها|Its place|המיקום")}</div>
                    <Range label={say("الحجم بالمربّع|Its size in the box|הגודל בתיבה")} value={shown.scale} min={0.1} max={3} step={0.05} busy={busy} onSave={(scale) => setLayer(say("الحجم|Size|גודל"), { scale })} testId="studio-gl-scale" />
                    <Range label={say("يمين ويسار|Left and right|ימין ושמאל")} value={shown.x} min={-1} max={1} step={0.05} busy={busy} onSave={(x) => setLayer(say("المكان|Place|מיקום"), { x })} testId="studio-gl-x" />
                    <Range label={say("فوق وتحت|Up and down|למעלה ולמטה")} value={shown.y} min={-1} max={1} step={0.05} busy={busy} onSave={(y) => setLayer(say("المكان|Place|מיקום"), { y })} testId="studio-gl-y" />
                    <Range label={say("العمق|Depth|עומק")} value={shown.depth} min={0} max={2} step={0.05} busy={busy} onSave={(depth) => setLayer(say("العمق|Depth|עומק"), { depth })} testId="studio-gl-depth" />
                    <div className={head}>{say("حركتها|How they move|איך הם זזים")}</div>
                    <Range label={say("السرعة|Speed|מהירות")} value={shown.speed} min={0} max={4} step={0.1} busy={busy} onSave={(speed) => setLayer(say("السرعة|Speed|מהירות"), { speed })} testId="studio-gl-speed" />
                    {!isFlow(shown.shapes[0]) ? (
                      <>
                        <Range label={say("كل جزيء بيتمايل بمكانه|Each wanders about its place|כל אחד מתנדנד במקומו")} value={shown.wander} min={0} max={1} step={0.05} busy={busy} onSave={(wander) => setLayer(say("التمايل|Wander|נדנוד"), { wander })} testId="studio-gl-wander" />
                        <Range label={say("موج|Waves|גלים")} value={shown.wave} min={0} max={1} step={0.05} busy={busy} onSave={(wave) => setLayer(say("الموج|Waves|גלים"), { wave })} testId="studio-gl-wave" />
                        <Range label={say("بيتنفّس (بيكبر وبيصغر)|Breathes (grows and shrinks)|נושם (גדל וקטן)")} value={shown.pulse} min={0} max={1} step={0.05} busy={busy} onSave={(pulse) => setLayer(say("التنفّس|Breathing|נשימה"), { pulse })} testId="studio-gl-pulse" />
                      </>
                    ) : null}
                    <Range label={say("بيلف حول حاله|Turns round itself|מסתובב סביב עצמו")} value={shown.spin} min={-2} max={2} step={0.05} busy={busy} onSave={(spin) => setLayer(say("اللف|Turning|סיבוב"), { spin })} testId="studio-gl-spin" />
                    <Range label={say("بيلمع|Twinkles|מנצנץ")} value={shown.twinkle} min={0} max={1} step={0.05} busy={busy} onSave={(twinkle) => setLayer(say("اللمعان|Twinkle|נצנוץ"), { twinkle })} testId="studio-gl-twinkle" />
                    <Range label={say("خطوط بين القريبين (لأول 500)|Lines between near ones (the first 500)|קווים בין הקרובים (500 הראשונים)")} value={shown.links} min={0} max={1} step={0.05} busy={busy} onSave={(links) => setLayer(say("الخطوط|Lines|קווים"), { links })} testId="studio-gl-links" />
                    {layers.length > 1 ? <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => { setAt(Math.max(0, li - 1)); set(say("شيل الطبقة|Remove the layer|הסר את השכבה"), { layers: layers.filter((_, i) => i !== li) }); }} data-testid="studio-gl-remove-layer">{say("شيل هالطبقة|Remove this layer|הסר את השכבה")}</button> : null}
                  </div>
                ) : (
                  <button type="button" className={btn} disabled={busy} onClick={() => set(say("طبقة جديدة|A new layer|שכבה חדשה"), { layers: [{ ...GL_LAYER_DEFAULT, text: undefined, glyphs: undefined }] })} data-testid="studio-gl-add-layer">＋ {say("طبقة جزيئات|A layer of particles|שכבת חלקיקים")}</button>
                )}
              </div>

              {/* The camera, the pointer, a press, the scroll, the morph. */}
              <div className={sub} data-testid="studio-gl-camera">
                <div className={head}>{say("الكاميرا|The camera|המצלמה")}</div>
                <Range label={say("بتلف لحالها|Turns by itself|מסתובבת לבד")} value={spec.camera.spin} min={-2} max={2} step={0.05} busy={busy} onSave={(spin) => setIn("camera", say("الكاميرا|The camera|המצלמה"), { spin })} testId="studio-gl-cam-spin" />
                <Range label={say("الميلان|Tilt|הטיה")} value={spec.camera.tilt} min={-80} max={80} step={1} unit="°" busy={busy} onSave={(tilt) => setIn("camera", say("الكاميرا|The camera|המצלמה"), { tilt })} testId="studio-gl-cam-tilt" />
                <Range label={say("القرب|Zoom|זום")} value={spec.camera.zoom} min={0.3} max={3} step={0.05} busy={busy} onSave={(zoom) => setIn("camera", say("الكاميرا|The camera|המצלמה"), { zoom })} testId="studio-gl-cam-zoom" />
                <Range label={say("عمق المنظر|Depth of the view|עומק המבט")} value={spec.camera.depth} min={0} max={1} step={0.05} busy={busy} onSave={(depth) => setIn("camera", say("الكاميرا|The camera|המצלמה"), { depth })} testId="studio-gl-cam-depth" />
                <Range label={say("ضبابية العدسة (البعيد والقريب مغبّشين)|Lens blur (near and far are soft)|טשטוש עדשה (הקרוב והרחוק רכים)")} value={spec.camera.blur} min={0} max={1} step={0.05} busy={busy} onSave={(blur) => setIn("camera", say("ضبابية العدسة|Lens blur|טשטוש עדשה"), { blur: blur || undefined })} testId="studio-gl-cam-blur" />
                {spec.camera.blur > 0 ? <Range label={say("وين الوضوح (لورا … لقدّام)|Where it's sharp (back … front)|איפה זה חד (אחורה … קדימה)")} value={spec.camera.focus} min={-1} max={1} step={0.05} busy={busy} onSave={(focus) => setIn("camera", say("الوضوح|Focus|מיקוד"), { focus: focus || undefined })} testId="studio-gl-cam-focus" /> : null}
                {mode === "element" ? (
                  <label className="flex items-center justify-between gap-2 text-xs text-white/75">
                    <span>{say("الزبون بيلفّها بإيده (سحب)|The shopper turns it by hand (drag)|הקונה מסובב ביד (גרירה)")}</span>
                    <input type="checkbox" disabled={busy} checked={spec.camera.drag} onChange={(e) => setIn("camera", say("اللف باليد|Turning by hand|סיבוב ביד"), { drag: e.target.checked || undefined })} data-testid="studio-gl-cam-drag" />
                  </label>
                ) : null}
              </div>
              <div className={sub} data-testid="studio-gl-hands">
                <Choice label={say("لما يمرّ الماوس أو الإصبع|Under the pointer or a finger|מתחת לעכבר או לאצבע")} value={spec.pointer.mode as string} busy={busy} options={GL_POINTER.map((m) => [m, say(POINTER_NAMES[m])])} onPick={(m) => setIn("pointer", say("الماوس|The pointer|העכבר"), { mode: m })} testId="studio-gl-pointer" />
                {spec.pointer.mode !== "none" ? (
                  <>
                    <Range label={say("قديش بيوصل|How far it reaches|כמה רחוק זה מגיע")} value={spec.pointer.radius} min={0.05} max={0.8} step={0.01} busy={busy} onSave={(radius) => setIn("pointer", say("الماوس|The pointer|העכבר"), { radius })} testId="studio-gl-pointer-radius" />
                    <Range label={say("قوته|Its strength|העוצמה")} value={spec.pointer.strength} min={0} max={3} step={0.1} busy={busy} onSave={(strength) => setIn("pointer", say("الماوس|The pointer|העכבר"), { strength })} testId="studio-gl-pointer-strength" />
                  </>
                ) : null}
                <Choice label={say("لما يكبس|On a press|בלחיצה")} value={spec.click as string} busy={busy} options={GL_CLICK.map((c) => [c, say(CLICK_NAMES[c])])} onPick={(click) => set(say("الكبسة|The press|הלחיצה"), { click })} testId="studio-gl-click" />
                <Choice label={say("مع السكرول|With the scroll|עם הגלילה")} value={spec.scroll as string} busy={busy} options={GL_SCROLL.map((s) => [s, say(SCROLL_NAMES[s])])} onPick={(scroll) => set(say("السكرول|The scroll|הגלילה"), { scroll })} testId="studio-gl-scroll" />
                {morphs ? (
                  <>
                    <Choice label={say("بتتحوّل من شكل لشكل|Morphs from form to form|עוברת מצורה לצורה")} value={spec.morph.by as string} busy={busy} options={GL_MORPH_BY.map((m) => [m, say(MORPH_NAMES[m])])} onPick={(by) => setIn("morph", say("التحوّل|The morph|ההתמרה"), { by })} testId="studio-gl-morph-by" />
                    {spec.morph.by === "auto" ? <Range label={say("بتضل على كل شكل|Stays on each form|נשארת על כל צורה")} value={spec.morph.hold} min={0.3} max={15} step={0.1} unit="s" busy={busy} onSave={(hold) => setIn("morph", say("التحوّل|The morph|ההתמרה"), { hold })} testId="studio-gl-morph-hold" /> : null}
                    <Range label={say("التحوّل بياخد|The morph takes|ההתמרה לוקחת")} value={spec.morph.time} min={0.2} max={6} step={0.1} unit="s" busy={busy} onSave={(time) => setIn("morph", say("التحوّل|The morph|ההתמרה"), { time })} testId="studio-gl-morph-time" />
                  </>
                ) : null}
              </div>
              <div className={sub} data-testid="studio-gl-finish">
                <div className={head}>{say("اللمسة الأخيرة|The finish|הגימור")}</div>
                <Range label={say("أثر ورا الجزيئات|A trail behind them|שובל מאחוריהם")} value={spec.trails} min={0} max={0.95} step={0.05} busy={busy} onSave={(trails) => set(say("الأثر|Trails|שובל"), { trails: trails || undefined })} testId="studio-gl-trails" />
                <Range label={say("توهّج حوالين الضو (بلوم)|A glow round the light (bloom)|זוהר סביב האור (בלום)")} value={spec.bloom} min={0} max={1} step={0.05} busy={busy} onSave={(bloom) => set(say("التوهّج|Bloom|בלום"), { bloom: bloom || undefined })} testId="studio-gl-bloom" />
                <Range label={say("ألوان بتنفصل عالأطراف (عدسة)|Colours parting at the edges (lens)|צבעים שנפרדים בקצוות (עדשה)")} value={spec.chroma} min={0} max={1} step={0.05} busy={busy} onSave={(chroma) => set(say("انفصال الألوان|Colour fringes|פיצול צבעים"), { chroma: chroma || undefined })} testId="studio-gl-chroma" />
                <Range label={say("حبيبات الفيلم|Film grain|גרעיניות")} value={spec.grain} min={0} max={0.4} step={0.02} busy={busy} onSave={(grain) => set(say("الحبيبات|Grain|גרעיניות"), { grain: grain || undefined })} testId="studio-gl-grain" />
                <Range label={say("تغميق الأطراف|Darker edges|קצוות כהים")} value={spec.vignette} min={0} max={1} step={0.05} busy={busy} onSave={(vignette) => set(say("الأطراف|Edges|קצוות"), { vignette: vignette || undefined })} testId="studio-gl-vignette" />
                {mode === "bg" ? <Range label={say("تغميق للكلام فوقها|Darken for the words on it|הכהיה למילים מעליו")} value={spec.veil} min={0} max={0.85} step={0.05} busy={busy} onSave={(veil) => set(say("التغميق|Veil|הכהיה"), { veil: veil || undefined })} testId="studio-gl-veil" /> : null}
              </div>
              {mode === "element" ? (
                <div className={sub}>
                  <Range label={say("الطول|Height|גובה")} value={typeof props.height === "number" ? props.height : 480} min={160} max={1400} step={10} unit="px" busy={busy} onSave={(height) => save(say("الطول|Height|גובה"), raw, { height })} testId="studio-gl-height" />
                  <Field label={say("وصفه لقارئ الشاشة (اختياري)|Its description for screen readers (optional)|התיאור לקורא מסך (רשות)")} value={typeof obj(props.label)[lang] === "string" ? String(obj(props.label)[lang]) : ""} maxLength={120} onSave={(v) => save(say("الوصف|Description|תיאור"), raw, { label: clean({ ...obj(props.label), [lang]: v.trim() || undefined }) })} testId="studio-gl-label" />
                </div>
              ) : (
                <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => save(say("شيل خلفية WebGL|Remove the WebGL background|הסר את רקע ה-WebGL"), null)} data-testid="studio-gl-remove">{say("شيل هالخلفية|Remove this background|הסר את הרקע")}</button>
              )}
              <p className="text-[10px] leading-4 text-white/40">{say("بيشتغل بس لما يكون قريب من الشاشة، نص الجزيئات عالموبايل، وصورة ثابتة لمين طالب حركة أقل.|It runs only near the screen, with half the particles on a phone, and a still picture for whoever asked for less motion.|פועל רק ליד המסך, חצי מהחלקיקים בטלפון, ותמונה קבועה למי שביקש פחות תנועה.")}</p>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
