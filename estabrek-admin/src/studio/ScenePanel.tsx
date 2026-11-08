import { useEffect, useRef, useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { tr } from "../lib/words";
import { drawScene } from "../../../estabrek-storefront/src/pageTree/sceneCanvas";
import { sceneOf } from "../../../estabrek-storefront/src/pageTree/scene";
import { Range } from "./LookPanels";
import { ColourPick } from "./StudioTreePanels";

type Kind = [string, () => string];
/** The 100 drawn backgrounds, in groups (the shop draws them: pageTree/sceneCanvas.ts). All are shown at once. */
const SCENE_GROUPS: Array<{ key: string; title: () => string; kinds: Kind[] }> = [
  { key: "sky", title: () => tr("سماء وفضاء", "Sky and space"), kinds: [
    ["constellation", () => tr("كوكبات", "Constellation")],
    ["starfield", () => tr("حقل نجوم", "Starfield")],
    ["galaxy", () => tr("مجرّة", "Galaxy")],
    ["nebula", () => tr("سديم", "Nebula")],
    ["meteors", () => tr("شهب", "Meteors")],
    ["crescent", () => tr("هلال ونجوم", "Crescent and stars")],
    ["orbits", () => tr("مدارات", "Orbits")],
    ["aurora", () => tr("شفق قطبي", "Aurora")],
    ["clouds", () => tr("غيوم", "Clouds")],
    ["sparkles", () => tr("لمعات", "Sparkles")],
    ["planes", () => tr("طيارات ورق", "Paper planes")],
  ] },
  { key: "nature", title: () => tr("طبيعة ومواسم", "Nature and seasons"), kinds: [
    ["snow", () => tr("ثلج", "Snow")],
    ["rain", () => tr("مطر", "Rain")],
    ["lightning", () => tr("برق وعاصفة", "Storm lightning")],
    ["petals", () => tr("بتلات ورد", "Petals")],
    ["blossom", () => tr("غصن مزهر", "Blossom branch")],
    ["leaves", () => tr("أوراق خريف", "Falling leaves")],
    ["fireflies", () => tr("يراعات", "Fireflies")],
    ["butterflies", () => tr("فراشات", "Butterflies")],
    ["birds", () => tr("أسراب طيور", "Flying birds")],
    ["mountains", () => tr("جبال", "Mountains")],
    ["dunes", () => tr("كثبان رمل", "Sand dunes")],
    ["forest", () => tr("غابة", "Forest")],
    ["grass", () => tr("عشب", "Grass")],
    ["sunrays", () => tr("أشعة من فوق", "Light rays")],
    ["dandelion", () => tr("بذور الهندباء", "Dandelion seeds")],
    ["feathers", () => tr("ريش", "Feathers")],
    ["smoke", () => tr("دخان", "Smoke")],
  ] },
  { key: "water", title: () => tr("بحر وماء", "Sea and water"), kinds: [
    ["waves", () => tr("أمواج", "Waves")],
    ["sea", () => tr("بحر وغروب", "Sea at sunset")],
    ["fish", () => tr("أسماك", "Fish")],
    ["jellyfish", () => tr("قناديل البحر", "Jellyfish")],
    ["seaweed", () => tr("أعشاب بحرية", "Seaweed")],
    ["bubbles", () => tr("فقاعات", "Bubbles")],
    ["droplets", () => tr("قطرات على الزجاج", "Droplets on glass")],
    ["ripples", () => tr("تموّجات ماء", "Ripples")],
  ] },
  { key: "party", title: () => tr("احتفال ومناسبات", "Celebrations"), kinds: [
    ["fireworks", () => tr("ألعاب نارية", "Fireworks")],
    ["confetti", () => tr("قصاصات احتفال", "Confetti")],
    ["hearts", () => tr("قلوب", "Hearts")],
    ["lanterns", () => tr("فوانيس", "Lanterns")],
    ["garland", () => tr("زينة أعلام", "Bunting garland")],
    ["stringlights", () => tr("أضواء معلّقة", "String lights")],
    ["ornaments", () => tr("زينة معلّقة", "Hanging ornaments")],
    ["balloons", () => tr("بالونات", "Balloons")],
    ["beams", () => tr("أضواء مسرح", "Stage beams")],
    ["gems", () => tr("جواهر", "Gems")],
    ["bokeh", () => tr("أضواء ضبابية", "Bokeh lights")],
    ["sunburst", () => tr("أشعة شمس", "Sunburst")],
    ["embers", () => tr("جمر", "Embers")],
  ] },
  { key: "places", title: () => tr("أماكن", "Places"), kinds: [
    ["skyline", () => tr("مدينة بالليل", "City at night")],
    ["mosque", () => tr("قباب ومآذن", "Domes and minarets")],
  ] },
  { key: "shopping", title: () => tr("تسوّق وعروض", "Shopping and offers"), kinds: [
    ["coins", () => tr("عملات", "Coins")],
    ["percent", () => tr("نسب خصم", "Discount signs")],
    ["bags", () => tr("أكياس تسوّق", "Shopping bags")],
    ["beans", () => tr("حبوب قهوة", "Coffee beans")],
  ] },
  { key: "music", title: () => tr("موسيقى وصوت", "Music and sound"), kinds: [
    ["notes", () => tr("نوتات موسيقية", "Music notes")],
    ["vinyl", () => tr("أسطوانة", "Vinyl record")],
    ["oscilloscope", () => tr("موجة صوت", "Sound wave")],
    ["equalizer", () => tr("موجات صوت", "Equalizer")],
    ["heartbeat", () => tr("نبض", "Heartbeat")],
  ] },
  { key: "pattern", title: () => tr("زخارف وأنماط", "Patterns"), kinds: [
    ["arabesque", () => tr("نجوم إسلامية", "Arabesque stars")],
    ["honeycomb", () => tr("خلايا نحل", "Honeycomb")],
    ["dotwave", () => tr("موجة نقاط", "Dot wave")],
    ["halftone", () => tr("نقاط طباعة", "Halftone")],
    ["checker", () => tr("مربعات", "Checkerboard")],
    ["stripes", () => tr("خطوط مائلة", "Diagonal stripes")],
    ["zigzag", () => tr("متعرّج", "Zigzag")],
    ["lowpoly", () => tr("مثلثات فسيفساء", "Low-poly mosaic")],
    ["weave", () => tr("نسيج", "Woven threads")],
    ["memphis", () => tr("نقش ممفيس", "Memphis pattern")],
    ["shapes", () => tr("أشكال طائرة", "Floating shapes")],
    ["topography", () => tr("خطوط كنتور", "Contour lines")],
    ["linewaves", () => tr("خطوط جبلية", "Line ridges")],
    ["moire", () => tr("تداخل دوائر", "Moiré rings")],
    ["mandala", () => tr("ماندالا", "Mandala")],
    ["kaleidoscope", () => tr("مشكال", "Kaleidoscope")],
    ["spiral", () => tr("حلزون", "Spiral")],
  ] },
  { key: "tech", title: () => tr("تقنية ومستقبل", "Tech and future"), kinds: [
    ["matrix", () => tr("مطر الرموز", "Matrix rain")],
    ["circuit", () => tr("دارة إلكترونية", "Circuit board")],
    ["code", () => tr("أسطر كود", "Lines of code")],
    ["globe", () => tr("كرة أرضية", "Globe")],
    ["grid", () => tr("شبكة منظور", "Perspective grid")],
    ["tunnel", () => tr("نفق", "Tunnel")],
    ["synthwave", () => tr("شمس ريترو", "Retro sun")],
    ["radar", () => tr("رادار", "Radar")],
    ["helix", () => tr("حلزون DNA", "DNA helix")],
    ["pixels", () => tr("بكسلات", "Pixels")],
    ["blocks", () => tr("مكعبات متساقطة", "Falling blocks")],
    ["glitch", () => tr("خلل رقمي", "Glitch")],
    ["scanlines", () => tr("شاشة قديمة", "Scanlines")],
    ["grain", () => tr("حبيبات فيلم", "Film grain")],
    ["wavefield", () => tr("سطح موج نقاط", "Dot wave field")],
    ["terrain", () => tr("تضاريس ثلاثية", "3D terrain")],
    ["gears", () => tr("تروس", "Gears")],
  ] },
  { key: "soft", title: () => tr("حركة ناعمة", "Soft motion"), kinds: [
    ["orbs", () => tr("كرات ضوء", "Orbs")],
    ["ribbons", () => tr("شرائط", "Ribbons")],
    ["lava", () => tr("مصباح حمم", "Lava lamp")],
    ["blobs", () => tr("أشكال سائلة", "Liquid blobs")],
    ["silk", () => tr("خيوط حرير", "Silk threads")],
    ["flow", () => tr("تيار انسيابي", "Flow field")],
  ] },
];

const inTests = () => typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);

/** A small picture of a background, drawn once it scrolls into sight; it moves while the pointer rests on it. */
function SceneThumb({ kind, moving }: { kind: string; moving: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || seen || inTests()) return;
    const io = new IntersectionObserver(entries => { if (entries.some(en => en.isIntersecting)) { setSeen(true); io.disconnect(); } });
    io.observe(canvas);
    return () => io.disconnect();
  }, [seen]);
  useEffect(() => {
    const canvas = ref.current, spec = sceneOf({ kind, amount: 40 });
    if (!canvas || !spec || !seen || inTests()) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try { ctx = canvas.getContext("2d"); } catch { ctx = null; }
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = 96, h = 54;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let frame = 0, start = 0;
    const paint = (time: number) => drawScene(ctx!, spec, w, h, time, null, "#c4b5fd", "#7dd3fc");
    paint(2.4);
    if (!moving) return;
    const tick = (now: number) => { if (!start) start = now; paint(2.4 + (now - start) / 1000); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [kind, moving, seen]);
  return <canvas ref={ref} aria-hidden="true" className="block h-[54px] w-full rounded-md bg-[#17141f]" />;
}

type Obj = Record<string, unknown>;
export function ScenePanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: (label: string, ops: PageDraftOp[]) => void }) {
  const raw = node.props?.scene;
  const scene = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Obj : null;
  const save = (next: Obj | null) => onOps(tr("مشهد خلفية القسم", "Section background scene"), [{ op: "setProps", nodeId: node.id, props: { ...node.props, scene: next ?? undefined } }]);
  const [resting, setResting] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const find = q.trim().toLowerCase();
  const current = SCENE_GROUPS.flatMap(g => g.kinds).find(([k]) => k === scene?.kind);
  return (
    <div className="space-y-2.5 rounded-xl border border-white/[0.08] p-3" data-testid="studio-scene">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/70">{tr("مشهد خلفية القسم", "Section background scene")}</div>
        <span className="text-[10px] text-white/40">{tr("100 خلفية متحركة", "100 moving backgrounds")}</span>
      </div>
      {/* The chosen background and its settings come first, so they never sit below a hundred tiles. */}
      {scene ? <div className="space-y-2 rounded-lg bg-white/[0.04] p-2" data-testid="studio-scene-settings">
        <div className="text-[11px] text-white/70">{tr("المختار:", "Chosen:")} <span className="text-white">{current ? current[1]() : String(scene.kind)}</span></div>
        <ColourPick label={tr("لون المشهد", "Scene colour")} value={scene.color ?? "accent"} busy={busy} onPick={(color) => save({ ...scene, color: color ?? undefined })} testId="studio-scene-color" />
        <ColourPick label={tr("اللون الثاني للمشهد", "Scene secondary colour")} value={scene.secondary ?? "text"} busy={busy} onPick={(secondary) => save({ ...scene, secondary: secondary ?? undefined })} testId="studio-scene-secondary" />
        <Range label={tr("كمية عناصر المشهد", "Scene amount")} value={typeof scene.amount === "number" ? scene.amount : 32} min={8} max={100} busy={busy} onSave={(amount) => save({ ...scene, amount })} testId="studio-scene-amount" />
        <Range label={tr("سرعة المشهد", "Scene speed")} value={typeof scene.speed === "number" ? scene.speed : 1} min={0} max={3} step={0.1} busy={busy} onSave={(speed) => save({ ...scene, speed })} testId="studio-scene-speed" />
        <Range label={tr("شدة المشهد", "Scene intensity")} value={typeof scene.intensity === "number" ? scene.intensity : 1} min={0} max={2} step={0.1} busy={busy} onSave={(intensity) => save({ ...scene, intensity })} testId="studio-scene-intensity" />
        <label className="flex items-center justify-between gap-2 text-xs text-white/75"><span>{tr("يتفاعل مع المؤشر", "Respond to pointer")}</span><input type="checkbox" disabled={busy} checked={scene.interactive === true} onChange={(e) => save({ ...scene, interactive: e.target.checked })} data-testid="studio-scene-interactive" /></label>
        <p className="text-[10px] leading-4 text-white/40">{tr("يتوقف خارج الشاشة، ويعرض صورة ثابتة عند تقليل الحركة.", "Pauses out of view; shows a still frame with reduced motion.")}</p>
        <button type="button" disabled={busy} className="rounded-lg bg-white/[0.06] px-2 py-1 text-xs text-red-300 disabled:opacity-40" onClick={() => save(null)}>{tr("إزالة المشهد", "Remove scene")}</button>
      </div> : null}
      <input type="search" value={q} disabled={busy} onChange={(e) => setQ(e.target.value)} placeholder={tr("دوّر على خلفية…", "Find a background…")} aria-label={tr("دوّر على خلفية", "Find a background")} className="w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2.5 py-1.5 text-xs text-white placeholder:text-white/35" data-testid="studio-scene-search" />
      <div role="group" aria-label={tr("نوع المشهد", "Scene kind")} className="space-y-3">
        {SCENE_GROUPS.map(g => {
          const kinds = find ? g.kinds.filter(([k, name]) => name().toLowerCase().includes(find) || k.includes(find) || g.title().toLowerCase().includes(find)) : g.kinds;
          if (!kinds.length) return null;
          return (
            <section key={g.key} data-scene-group={g.key} aria-label={g.title()}>
              <h4 className="mb-1 text-[10px] font-medium text-white/50">{g.title()} <span className="text-white/30">· {kinds.length}</span></h4>
              <div className="grid grid-cols-3 gap-1">
                {kinds.map(([kind, name]) => (
                  <button type="button" key={kind} disabled={busy} aria-pressed={scene?.kind === kind} data-scene-kind={kind} title={name()} onPointerEnter={() => setResting(kind)} onPointerLeave={() => setResting(r => (r === kind ? null : r))} onClick={() => save({ amount: 32, speed: 1, intensity: 1, interactive: false, ...scene, kind })} className={`overflow-hidden rounded-lg p-1 text-center text-[10px] disabled:opacity-40 ${scene?.kind === kind ? "bg-accent-500/30 text-white ring-1 ring-accent-400" : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"}`}>
                    <SceneThumb kind={kind} moving={resting === kind} />
                    <span className="mt-1 block truncate">{name()}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
