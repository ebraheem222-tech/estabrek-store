import { useEffect, useRef, useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { tr } from "../lib/words";
import { drawScene } from "../../../estabrek-storefront/src/pageTree/sceneCanvas";
import { sceneOf } from "../../../estabrek-storefront/src/pageTree/scene";
import { Range } from "./LookPanels";
import { ColourPick } from "./StudioTreePanels";

type Kind = [string, () => string];
/** The 49 drawn backgrounds, in groups (the shop draws them: pageTree/sceneCanvas.ts). */
const SCENE_GROUPS: Array<{ key: string; title: () => string; kinds: Kind[] }> = [
  { key: "sky", title: () => tr("سماء وفضاء", "Sky and space"), kinds: [
    ["constellation", () => tr("كوكبات", "Constellation")],
    ["starfield", () => tr("حقل نجوم", "Starfield")],
    ["galaxy", () => tr("مجرّة", "Galaxy")],
    ["crescent", () => tr("هلال ونجوم", "Crescent and stars")],
    ["orbits", () => tr("مدارات", "Orbits")],
    ["aurora", () => tr("شفق قطبي", "Aurora")],
    ["clouds", () => tr("غيوم", "Clouds")],
    ["sparkles", () => tr("لمعات", "Sparkles")],
  ] },
  { key: "nature", title: () => tr("طبيعة ومواسم", "Nature and seasons"), kinds: [
    ["snow", () => tr("ثلج", "Snow")],
    ["rain", () => tr("مطر", "Rain")],
    ["petals", () => tr("بتلات ورد", "Petals")],
    ["leaves", () => tr("أوراق خريف", "Falling leaves")],
    ["fireflies", () => tr("يراعات", "Fireflies")],
    ["bubbles", () => tr("فقاعات", "Bubbles")],
    ["waves", () => tr("أمواج", "Waves")],
    ["mountains", () => tr("جبال", "Mountains")],
    ["dunes", () => tr("كثبان رمل", "Sand dunes")],
    ["smoke", () => tr("دخان", "Smoke")],
  ] },
  { key: "party", title: () => tr("احتفال ومناسبات", "Celebrations"), kinds: [
    ["fireworks", () => tr("ألعاب نارية", "Fireworks")],
    ["confetti", () => tr("قصاصات احتفال", "Confetti")],
    ["hearts", () => tr("قلوب", "Hearts")],
    ["lanterns", () => tr("فوانيس", "Lanterns")],
    ["beams", () => tr("أضواء مسرح", "Stage beams")],
    ["gems", () => tr("جواهر", "Gems")],
    ["bokeh", () => tr("أضواء ضبابية", "Bokeh lights")],
    ["sunburst", () => tr("أشعة شمس", "Sunburst")],
  ] },
  { key: "pattern", title: () => tr("زخارف وأنماط", "Patterns"), kinds: [
    ["arabesque", () => tr("نجوم إسلامية", "Arabesque stars")],
    ["honeycomb", () => tr("خلايا نحل", "Honeycomb")],
    ["dotwave", () => tr("موجة نقاط", "Dot wave")],
    ["lowpoly", () => tr("مثلثات فسيفساء", "Low-poly mosaic")],
    ["weave", () => tr("نسيج", "Woven threads")],
    ["memphis", () => tr("نقش ممفيس", "Memphis pattern")],
    ["shapes", () => tr("أشكال طائرة", "Floating shapes")],
    ["topography", () => tr("خطوط كنتور", "Contour lines")],
  ] },
  { key: "tech", title: () => tr("تقنية ومستقبل", "Tech and future"), kinds: [
    ["matrix", () => tr("مطر الرموز", "Matrix rain")],
    ["circuit", () => tr("دارة إلكترونية", "Circuit board")],
    ["grid", () => tr("شبكة منظور", "Perspective grid")],
    ["tunnel", () => tr("نفق", "Tunnel")],
    ["synthwave", () => tr("شمس ريترو", "Retro sun")],
    ["radar", () => tr("رادار", "Radar")],
    ["helix", () => tr("حلزون DNA", "DNA helix")],
    ["equalizer", () => tr("موجات صوت", "Equalizer")],
    ["heartbeat", () => tr("نبض", "Heartbeat")],
  ] },
  { key: "soft", title: () => tr("حركة ناعمة", "Soft motion"), kinds: [
    ["orbs", () => tr("كرات ضوء", "Orbs")],
    ["ribbons", () => tr("شرائط", "Ribbons")],
    ["lava", () => tr("مصباح حمم", "Lava lamp")],
    ["silk", () => tr("خيوط حرير", "Silk threads")],
    ["flow", () => tr("تيار انسيابي", "Flow field")],
    ["ripples", () => tr("تموّجات ماء", "Ripples")],
  ] },
];

const inTests = () => typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);

/** A small picture of a background; it moves while the pointer rests on it. */
function SceneThumb({ kind, moving }: { kind: string; moving: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, spec = sceneOf({ kind, amount: 40 });
    if (!canvas || !spec || inTests()) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try { ctx = canvas.getContext("2d"); } catch { ctx = null; }
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = 104, h = 60;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let frame = 0, start = 0;
    const paint = (time: number) => drawScene(ctx!, spec, w, h, time, null, "#c4b5fd", "#7dd3fc");
    paint(2.4);
    if (!moving) return;
    const tick = (now: number) => { if (!start) start = now; paint(2.4 + (now - start) / 1000); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [kind, moving]);
  return <canvas ref={ref} aria-hidden="true" className="block h-[60px] w-full rounded-md bg-[#17141f]" />;
}

type Obj = Record<string, unknown>;
export function ScenePanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: (label: string, ops: PageDraftOp[]) => void }) {
  const raw = node.props?.scene;
  const scene = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Obj : null;
  const save = (next: Obj | null) => onOps(tr("مشهد خلفية القسم", "Section background scene"), [{ op: "setProps", nodeId: node.id, props: { ...node.props, scene: next ?? undefined } }]);
  const startGroup = SCENE_GROUPS.find(g => g.kinds.some(([k]) => k === scene?.kind))?.key ?? "sky";
  const [group, setGroup] = useState(startGroup);
  const [resting, setResting] = useState<string | null>(null);
  const shown = SCENE_GROUPS.find(g => g.key === group) ?? SCENE_GROUPS[0];
  return (
    <div className="space-y-2.5 rounded-xl border border-white/[0.08] p-3" data-testid="studio-scene">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/70">{tr("مشهد خلفية القسم", "Section background scene")}</div>
        <span className="text-[10px] text-white/40">{tr("49 خلفية متحركة", "49 moving backgrounds")}</span>
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label={tr("مجموعات الخلفيات", "Background groups")}>
        {SCENE_GROUPS.map(g => <button type="button" key={g.key} disabled={busy} aria-pressed={g.key === shown.key} data-scene-group={g.key} onClick={() => setGroup(g.key)} className={`rounded-full px-2 py-0.5 text-[10px] disabled:opacity-40 ${g.key === shown.key ? "bg-accent-500/30 text-white" : "bg-white/[0.05] text-white/60 hover:bg-white/[0.1]"}`}>{g.title()}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={tr("نوع المشهد", "Scene kind")}>
        {SCENE_GROUPS.flatMap(g => g.kinds.map(([kind, name]) => {
          // Every kind stays in the page (its group only shows or hides it), so a picked kind is always reachable.
          const visible = g.key === shown.key;
          return (
            <button type="button" key={kind} disabled={busy} hidden={!visible} aria-pressed={scene?.kind === kind} data-scene-kind={kind} onPointerEnter={() => setResting(kind)} onPointerLeave={() => setResting(r => (r === kind ? null : r))} onClick={() => save({ amount: 32, speed: 1, intensity: 1, interactive: false, ...scene, kind })} className={`overflow-hidden rounded-lg p-1 text-center text-[10px] disabled:opacity-40 ${scene?.kind === kind ? "bg-accent-500/30 text-white ring-1 ring-accent-400" : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"}`}>
              {visible ? <SceneThumb kind={kind} moving={resting === kind} /> : null}
              <span className="mt-1 block truncate">{name()}</span>
            </button>
          );
        }))}
      </div>
      {scene ? <div className="space-y-2">
        <ColourPick label={tr("لون المشهد", "Scene colour")} value={scene.color ?? "accent"} busy={busy} onPick={(color) => save({ ...scene, color: color ?? undefined })} testId="studio-scene-color" />
        <ColourPick label={tr("اللون الثاني للمشهد", "Scene secondary colour")} value={scene.secondary ?? "text"} busy={busy} onPick={(secondary) => save({ ...scene, secondary: secondary ?? undefined })} testId="studio-scene-secondary" />
        <Range label={tr("كمية عناصر المشهد", "Scene amount")} value={typeof scene.amount === "number" ? scene.amount : 32} min={8} max={100} busy={busy} onSave={(amount) => save({ ...scene, amount })} testId="studio-scene-amount" />
        <Range label={tr("سرعة المشهد", "Scene speed")} value={typeof scene.speed === "number" ? scene.speed : 1} min={0} max={3} step={0.1} busy={busy} onSave={(speed) => save({ ...scene, speed })} testId="studio-scene-speed" />
        <Range label={tr("شدة المشهد", "Scene intensity")} value={typeof scene.intensity === "number" ? scene.intensity : 1} min={0} max={2} step={0.1} busy={busy} onSave={(intensity) => save({ ...scene, intensity })} testId="studio-scene-intensity" />
        <label className="flex items-center justify-between gap-2 text-xs text-white/75"><span>{tr("يتفاعل مع المؤشر", "Respond to pointer")}</span><input type="checkbox" disabled={busy} checked={scene.interactive === true} onChange={(e) => save({ ...scene, interactive: e.target.checked })} data-testid="studio-scene-interactive" /></label>
        <p className="text-[10px] leading-4 text-white/40">{tr("يتوقف خارج الشاشة، ويعرض صورة ثابتة عند تقليل الحركة.", "Pauses out of view; shows a still frame with reduced motion.")}</p>
        <button type="button" disabled={busy} className="rounded-lg bg-white/[0.06] px-2 py-1 text-xs text-red-300 disabled:opacity-40" onClick={() => save(null)}>{tr("إزالة المشهد", "Remove scene")}</button>
      </div> : null}
    </div>
  );
}
