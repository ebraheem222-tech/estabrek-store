/**
 * What an element costs the shopper's device (the editor's speed per element, docs/cms-big-engine-plan.ar.md J2):
 * read from its own settings, the costly things counted (a canvas drawn every frame, a clip playing by itself, motion
 * without end, frosted glass, blur, big or shape-following shadows, glows, blended overlays…), each with why and the
 * speed setting that makes it lighter. Its own speed settings (props.perf) bring the count down. The page's budget
 * adds them up, with the things a page shouldn't have too many of. Pure (tested); the shop's numbers, not measured.
 */
import type { PageTreeNode } from "../../api/pages.api";
import { say } from "../say";

export type Perf = { tier?: "full" | "balanced" | "light"; fps?: 24 | 30 | 60; offscreen?: "pause" | "keep"; rest?: "pause" | "keep"; phone?: "same" | "light"; strong?: boolean };
export type CostReason = { key: string; points: number; text: string; fix?: Perf };
export type Level = "low" | "mid" | "high";
export type Cost = { points: number; level: Level; reasons: CostReason[]; canvas: boolean; endless: boolean; autoplay: boolean };

const levelOf = (p: number): Level => (p < 12 ? "low" : p < 30 ? "mid" : "high");
const obj = (v: unknown): Record<string, any> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {});

/** Every look of it: each screen's, and its states'. */
function looksOf(node: PageTreeNode): Array<Record<string, any>> {
  const out: Array<Record<string, any>> = [];
  const style = obj(node.style);
  for (const v of Object.values(style)) {
    const s = obj(v);
    out.push(s);
    for (const st of Object.values(obj(s.states))) out.push(obj(st));
  }
  return out;
}

export function costOf(node: PageTreeNode): Cost {
  const p = obj(node.props), m = obj(node.motion);
  const reasons: CostReason[] = [];
  const add = (key: string, points: number, text: string, fix?: Perf) => { if (!reasons.some((r) => r.key === key)) reasons.push({ key, points, text, fix }); };
  let canvas = false, endless = false, autoplay = false;

  for (const s of looksOf(node)) {
    if (Number(obj(s.backdrop).blur) > 0) add("glass", 12 + Number(obj(s.backdrop).blur) / 4, say("زجاج مغبّش: الجهاز بيعيد رسم اللي وراه كل ما تتحرك الصفحة.|Frosted glass: the device redraws what's behind it whenever the page moves.|זכוכית מעומעמת: המכשיר מצייר מחדש את מה שמאחוריה."), { tier: "balanced" });
    if (Number(obj(s.filters).blur) > 0) add("blur", 8, say("تغبيش (فلتر).|Blur (a filter).|טשטוש (מסנן)."), { phone: "light" });
    if (s.shade) add("shade", obj(s.shade).follow ? 10 : 4 + (Number(obj(s.shade).blur) > 40 ? 4 : 0), say("ظل حوالين شكله.|A shadow around its shape.|צל סביב הצורה."), { phone: "light" });
    if (Number(obj(s.glow).size) > 0) add("glow", 6, say("توهّج.|A glow.|זוהר."), { phone: "light" });
    if (Array.isArray(s.shadows) && s.shadows.length) add("words-shadow", 2 + s.shadows.length * 2, say("ظلال على الكلام.|Shadows on the words.|צללים על המילים."));
    if (s.shadow === "lg") add("shadow", 3, say("ظل كبير.|A big shadow.|צל גדול."));
    if (obj(s.overlay).blend && obj(s.overlay).blend !== "normal") add("blend", 6, say("طبقة لون بخلط (blend).|A blended colour layer.|שכבת צבע ממוזגת."), { phone: "light" });
    if (s.pattern) add("pattern", 2, say("نقشة فوق الخلفية.|A pattern over the background.|דוגמה מעל הרקע."));
  }

  if (m.loop) { endless = true; add("loop", 10, say("حركة ما بتخلص (لفّة).|Motion that never ends (a loop).|תנועה שלא נגמרת."), { tier: "balanced" }); }
  if (m.fx) { endless = true; add("fx", 12, say("تأثير متحرك دايم.|An effect always moving.|אפקט שזז תמיד."), { phone: "light" }); }
  if (m.scroll) add("scroll", 6, say("حركة مع السكرول.|Motion with the scroll.|תנועה עם הגלילה."));
  if (m.keys) add("keys", 5, say("حركة بخطوات (keyframes).|Keyframed motion.|תנועה בפריימים."));
  if (m.physics) {
    const kind = obj(m.physics).kind;
    if (kind === "float") endless = true;
    add("physics", kind === "float" ? 8 : kind === "drop" ? 3 : 4, say("فيزياء خاصة فيه (زنبركات وجاذبية).|Its own physics (springs and gravity).|פיזיקה משלו."));
  }
  // A world: a physics engine runs while its bodies move (none when baked into keyframes).
  if (["section", "grid", "stack", "columns", "cell", "popup"].includes(node.type) && p.world && !obj(p.world).baked) {
    const w = obj(p.world);
    if (Number(w.wind) || Number(w.again)) endless = true;
    add("world", 14 + Math.round((node.children ?? []).length * 0.6), say("عالم فيزيائي: محرّك بيحسب كل جسم كل لحظة وهو عم يتحرك. «ثبّت» بيخليه حركة عادية أخف.|A physics world: an engine works out each body every moment while they move. «Bake» makes it plain, lighter motion.|עולם פיזיקלי: מנוע מחשב כל גוף בכל רגע."));
  }

  switch (node.type) {
    case "model3d": {
      canvas = true;
      const moving = obj(p.anim).type && obj(p.anim).type !== "none" || Number(p.auto) || p.tilt || (Array.isArray(p.views) && p.views.length > 1);
      add("3d", moving ? 50 : 40, say("مجسّم 3D: كرت الشاشة برسمه.|A 3D model: the graphics card draws it.|מודל תלת־ממדי."), { fps: 30 });
      add("3d-weak", 0, say("على الأجهزة الضعيفة: بيترسم مرة وحدة.|On weak devices: drawn once.|במכשירים חלשים: מצויר פעם אחת."), { strong: true });
      break;
    }
    case "video":
      if (p.autoplay === true) { autoplay = true; endless = true; add("autoplay", 25, say("فيديو بيشتغل لحاله.|A clip that plays by itself.|סרטון שמתנגן לבד."), { phone: "light" }); }
      else add("video", 6, say("فيديو.|A clip.|סרטון."));
      break;
    case "scrollScene": canvas = true; add("scroll-scene", 35, say("مشهد مع السكرول (فيديو بيتبع الصفحة).|A scroll scene (a clip following the page).|סצנת גלילה."), { phone: "light" }); break;
    case "lottie": case "rive": canvas = true; endless = true; add("animation", 18, say("رسم متحرك (Lottie/Rive).|An animation (Lottie/Rive).|אנימציה."), { tier: "balanced" }); break;
    case "product360": canvas = true; add("360", 15, say("عرض 360°.|A 360° view.|תצוגת 360°.")); break;
    case "section":
      if (p.particles) { canvas = true; endless = true; add("particles", 30, say("جزيئات متحركة بالقسم.|Moving particles in the section.|חלקיקים נעים."), { strong: true }); }
      if (p.scene) { canvas = true; endless = true; add("scene", 28 + (obj(p.scene).interactive ? 5 : 0), say("خلفية حيّة مرسومة.|A live drawn background.|רקע חי מצויר."), { fps: 24 }); }
      break;
    case "image":
      if (Array.isArray(obj(p.sparkle).points)) {
        const n = obj(p.sparkle).points.length;
        if (obj(p.sparkle).when !== "hover" && obj(p.sparkle).when !== "few") endless = true;
        add("sparkle", 3 + Math.round(n / 4), say("نجوم براقة.|Sparkling stars.|כוכבים נוצצים."), { phone: "light" });
      }
      break;
    case "svg":
      if (obj(p.morph).on === "loop") { endless = true; add("morph", 10, say("تحوّل شكل بلفّة.|A looping morph.|התמרה בלולאה."), { tier: "balanced" }); }
      else if (p.morph) add("morph", 3, say("تحوّل شكل.|A morph.|התמרה."));
      break;
    case "slider":
      if (p.autoplay || obj(p.settings).autoplay) add("slider", 6, say("سلايدر بيلف لحاله.|A slider turning by itself.|סליידר שמתחלף לבד."));
      break;
  }

  // A big part of the page inside it.
  let inside = 0;
  const walk = (n: PageTreeNode) => { for (const c of n.children ?? []) { inside++; walk(c); } };
  walk(node);
  if (inside > 60) add("big", 8, say("فيه عناصر كتير جوّاه.|Many elements inside it.|הרבה רכיבים בתוכו."));

  // Its own speed settings.
  const perf = obj(p.perf) as Perf;
  let points = reasons.reduce((s, r) => s + r.points, 0);
  if (perf.offscreen === "keep" && endless) { points += 5; reasons.push({ key: "keep-offscreen", points: 5, text: say("بيضل يتحرك برّا الشاشة.|It keeps moving off screen.|ממשיך לזוז מחוץ למסך."), fix: { offscreen: "pause" } }); }
  if (perf.rest === "keep" && endless) { points += 5; reasons.push({ key: "keep-rest", points: 5, text: say("بيضل يتحرك وقت سكون الصفحة.|It keeps moving while the page rests.|ממשיך לזוז במנוחה."), fix: { rest: "pause" } }); }
  if (perf.tier === "light") points *= 0.25;
  else if (perf.tier === "balanced") points *= 0.7;
  if (perf.fps && canvas) points *= perf.fps <= 30 ? 0.75 : 1;
  points = Math.round(points);
  return { points, level: levelOf(points), reasons: reasons.filter((r) => r.points > 0 || r.fix), canvas, endless, autoplay };
}

export type Budget = { points: number; level: Level; canvases: number; endless: number; autoplay: number; glass: number; heavy: Array<{ id: string; name: string; points: number }>; warnings: string[] };

/** The page's budget: what all its elements cost, and what it has too many of. */
export function pageBudget(root: PageTreeNode): Budget {
  const b: Budget = { points: 0, level: "low", canvases: 0, endless: 0, autoplay: 0, glass: 0, heavy: [], warnings: [] };
  const walk = (n: PageTreeNode) => {
    if (n.type !== "page") {
      const c = costOf({ ...n, children: [] });
      b.points += c.points;
      if (c.canvas) b.canvases++;
      if (c.endless) b.endless++;
      if (c.autoplay) b.autoplay++;
      if (c.reasons.some((r) => r.key === "glass")) b.glass++;
      if (c.level === "high") b.heavy.push({ id: n.id, name: n.name || n.type, points: c.points });
    }
    for (const ch of n.children ?? []) walk(ch);
  };
  walk(root);
  b.heavy.sort((x, y) => y.points - x.points);
  b.level = b.points < 80 ? "low" : b.points < 180 ? "mid" : "high";
  if (b.canvases > 3) b.warnings.push(say(`${b.canvases} أشياء بترسم كل لحظة (3D، جزيئات، خلفيات حيّة): خليها 3 أو أقل، أو خفّفها عالتلفون.|${b.canvases} things drawn every moment (3D, particles, live backgrounds): keep it to 3 or fewer, or lighter on phones.|${b.canvases} דברים שמצוירים כל רגע.`));
  if (b.autoplay > 2) b.warnings.push(say(`${b.autoplay} فيديوهات بتشتغل لحالها.|${b.autoplay} clips play by themselves.|${b.autoplay} סרטונים מתנגנים לבד.`));
  if (b.endless > 12) b.warnings.push(say(`${b.endless} حركات ما بتخلص.|${b.endless} motions never end.|${b.endless} תנועות שלא נגמרות.`));
  if (b.glass > 4) b.warnings.push(say(`${b.glass} عناصر زجاج مغبّش.|${b.glass} frosted glass elements.|${b.glass} רכיבי זכוכית.`));
  return b;
}
