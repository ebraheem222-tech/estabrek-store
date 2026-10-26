/**
 * The 3D scene editor (Admin → ثيمات المتجر → محرّر المشهد): one model of the stage at a
 * time, drawn in the shop's own frame beside it. Its handles there move, turn and size the
 * model (or type the numbers here); here it also gets its motion (what, how fast, how far,
 * and when: always, on hover or with the scroll), its shape (stretch and the model's own
 * knobs), a colour for each part and its finish, its way through the scroll (the handles
 * move its start or its end; the frame can show any point of the scroll) and its own 3D
 * file in place of the built-in model. It changes the stage's draft (stageDraft.ts), so
 * every step can be undone and nothing reaches the store until saved.
 */
import type { ReactNode } from "react";
import { adminLang } from "../../lib/lang";
import { tr } from "../../lib/words";
import {
  STAGE_ANIMS,
  STAGE_EASES,
  STAGE_FINISHES,
  STAGE_PARTS,
  STAGE_TRIGGERS,
  type KnobSpec,
  type StageAnim,
  type StageGlb,
  type StageLook,
  type StageModelInfo,
  type StagePath,
  type StoreThemeInfo,
  type V3,
} from "../../studio/storeThemes";
import { ModelFile, type GlbInfo } from "./ModelFile";
import { withLook, type StageDraftApi } from "./stageDraft";

/** The editor's tools: the handle, snapping, motion on or paused, sizing together, and which end of the path the handles move. */
export type SceneTool = { mode: "translate" | "rotate" | "scale"; play: boolean; snap: boolean; lockScale: boolean; key: "start" | "end" };

const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-30";
const on = "bg-accent-500/25 text-white";
const field = "w-full rounded-md border border-white/[0.1] bg-surface-925 px-1.5 py-1 text-xs text-white";

const MODE_LABEL = { translate: () => tr("تحريك", "Move"), rotate: () => tr("تدوير", "Turn"), scale: () => tr("تكبير", "Size") };
const ANIM_LABEL: Record<StageAnim["type"], () => string> = {
  none: () => tr("بدون حركة", "No motion"),
  spin: () => tr("لف", "Spin"),
  float: () => tr("طفو", "Float"),
  bounce: () => tr("نط", "Bounce"),
  pulse: () => tr("نبض", "Pulse"),
  swing: () => tr("تأرجح", "Swing"),
  orbit: () => tr("دوران حول مكانه", "Orbit"),
};
const TRIGGER_LABEL: Record<StageAnim["trigger"], () => string> = {
  always: () => tr("دايماً", "Always"),
  hover: () => tr("لما يمرّ الماوس", "On hover"),
  scroll: () => tr("مع السكرول", "With the scroll"),
};
const PART_LABEL: Record<(typeof STAGE_PARTS)[number], () => string> = {
  body: () => tr("الجسم", "Body"),
  trim: () => tr("الأطراف", "Trim"),
  accent: () => tr("اللمسات", "Accents"),
  glow: () => tr("الإضاءة", "Glow"),
  screen: () => tr("الشاشة", "Screen"),
  metal: () => tr("المعدن", "Metal parts"),
};
const EASE_LABEL: Record<StagePath["ease"], () => string> = {
  smooth: () => tr("ناعم", "Smooth"),
  linear: () => tr("بسرعة ثابتة", "Steady"),
  early: () => tr("سريع بالأول", "Fast at first"),
  late: () => tr("سريع بالآخر", "Fast at the end"),
};
const FINISH_LABEL: Record<(typeof STAGE_FINISHES)[number], () => string> = {
  neon: () => tr("نيون", "Neon"),
  metal: () => tr("معدني لامع", "Polished metal"),
  toy: () => tr("بلاستيك ناعم", "Soft plastic"),
  voxel: () => tr("مكعّبات (فوكسل)", "Voxel blocks"),
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number, step: number) => {
  const digits = step >= 1 ? 0 : String(step).split(".")[1]?.length ?? 2;
  return Number(v.toFixed(digits));
};

function Group({ title, children, onReset, testId }: { title: string; children: ReactNode; onReset?: () => void; testId?: string }) {
  return (
    <div className="space-y-2 rounded-xl bg-white/[0.03] p-2" data-testid={testId}>
      <div className="flex items-center gap-2">
        <h4 className="me-auto text-xs font-medium text-white/75">{title}</h4>
        {onReset ? (
          <button type="button" className="text-[11px] text-white/45 hover:text-white" onClick={onReset}>
            {tr("رجوع", "Reset")}
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Num({ label, value, step, min, max, onChange, testId }: { label: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void; testId?: string }) {
  return (
    <label className="grid gap-0.5 text-[10px] text-white/45">
      {label}
      <input
        type="number"
        dir="ltr"
        className={field}
        value={Number(value.toFixed(step >= 1 ? 1 : 3))}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(v)) onChange(clamp(v, min, max));
        }}
        data-testid={testId}
      />
    </label>
  );
}

function Slider({ label, value, min, max, step, onChange, testId, values }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; testId?: string; values?: number[] }) {
  return (
    <label className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 text-[11px] text-white/60">
      <span className="truncate">{label}</span>
      <span dir="ltr" className="text-[10px] tabular-nums text-white/40">
        {round(value, step)}
      </span>
      {values ? (
        <select className={`${field} col-span-2`} value={value} onChange={(e) => onChange(Number(e.target.value))} data-testid={testId}>
          {values.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      ) : (
        <input type="range" className="col-span-2 accent-[var(--color-accent-500,#a43b64)]" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} data-testid={testId} />
      )}
    </label>
  );
}

export function SceneEditor({
  theme,
  models,
  api,
  index,
  setIndex,
  tool,
  setTool,
  live,
  onShowHome,
  preview,
  setPreview,
  glbInfo,
}: {
  theme: StoreThemeInfo;
  models: StageModelInfo[];
  api: StageDraftApi;
  index: number;
  setIndex: (i: number) => void;
  tool: SceneTool;
  setTool: (t: SceneTool) => void;
  live: boolean;
  onShowHome: () => void;
  /** The scroll the frame shows (0–1), or null for the page's own. */
  preview: number | null;
  setPreview: (v: number | null) => void;
  /** What the frame said about each model's own file. */
  glbInfo: Record<number, GlbInfo>;
}) {
  const lang = adminLang();
  const { draft, change } = api;
  const model = draft.models[index];
  const info = models.find((m) => m.kind === model?.kind);
  const look: StageLook = model?.look ?? {};
  const set = (fn: (l: StageLook) => StageLook, key = "") => change((d) => withLook(d, index, fn), key ? `${key}:${index}` : "");
  const without = (...keys: Array<keyof StageLook>) => set((l) => Object.fromEntries(Object.entries(l).filter(([k]) => !keys.includes(k as keyof StageLook))) as StageLook);

  // The numbers (and the handles) are the path's end while it is the end being edited.
  const path = look.path;
  const atEnd = tool.key === "end" && Boolean(path);
  const pos: V3 = (atEnd ? path!.pos : look.pos) ?? [0, 0, 0];
  const rot: V3 = (atEnd ? path!.rot : look.rot) ?? [0, 0, 0];
  const scale: V3 = (atEnd ? path!.scale : look.scale) ?? [1, 1, 1];
  const setVec = (key: "pos" | "rot" | "scale", axis: number, v: number) =>
    set((l) => {
      const start: V3 = key === "scale" ? [1, 1, 1] : [0, 0, 0];
      const end = tool.key === "end" && l.path;
      const next = [...((end ? l.path![key] : l[key]) ?? start)] as V3;
      if (key === "scale" && tool.lockScale) {
        // Sized together: the other two keep their proportion to this one.
        const k = next[axis] ? v / next[axis] : 1;
        for (let j = 0; j < 3; j++) next[j] = j === axis ? v : clamp(round(next[j] * k, 0.01), 0.1, 4);
      } else next[axis] = v;
      return end ? { ...l, path: { ...l.path!, [key]: next } } : { ...l, [key]: next };
    }, `${tool.key}-${key}${axis}`);
  const startPath = () => {
    set((l) => ({ ...l, path: { pos: l.pos ?? [0, 0, 0], rot: l.rot ?? [0, 0, 0], scale: l.scale ?? [1, 1, 1], ease: "smooth" } }));
    setTool({ ...tool, key: "end" });
    setPreview(1);
  };
  const pickKey = (key: SceneTool["key"]) => {
    setTool({ ...tool, key });
    setPreview(key === "end" ? 1 : 0);
  };
  const glb = model?.glb;
  const setGlb = (next: StageGlb | undefined) => change((d) => ({ ...d, models: d.models.map((m, j) => (j === index ? { ...m, glb: next } : m)) }));
  const anim = look.anim;
  const setAnim = (patch: Partial<StageAnim>, key = "") => set((l) => ({ ...l, anim: { type: "spin", speed: 1, amount: 1, trigger: "always", ...l.anim, ...patch } }), key);
  const shape = look.shape ?? { w: 1, h: 1, d: 1 };
  const knobValue = (k: KnobSpec) => look.knobs?.[k.id] ?? k.def;
  const axes = ["X", "Y", "Z"];

  if (!model) return null;
  return (
    <div className="space-y-3" data-testid="scene-editor">
      {!live ? (
        <p className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-2 text-[11px] leading-5 text-amber-200">
          {tr("المحرّر بيشتغل على معاينة الصفحة الرئيسية.", "The editor works on the home page preview.")}{" "}
          <button type="button" className="underline" onClick={onShowHome}>
            {tr("افتح الرئيسية", "Open the home page")}
          </button>
        </p>
      ) : (
        <p className="text-[11px] leading-5 text-white/45">
          {tr("اختار موديل، واسحب المقابض عليه بالمعاينة أو اكتب الأرقام هون.", "Pick a model, then drag its handles in the preview or type the numbers here.")}
        </p>
      )}

      <div className="flex flex-wrap gap-1" role="group" aria-label={tr("الموديل", "Model")}>
        {draft.models.map((m, i) => (
          <button key={i} type="button" className={`${btn} ${i === index ? on : ""}`} aria-pressed={i === index} onClick={() => setIndex(i)} data-testid="scene-model">
            {m.label.trim() || models.find((x) => x.kind === m.kind)?.label[lang] || m.kind}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <div className="flex gap-1" role="group" aria-label={tr("المقابض", "Handles")}>
          {(["translate", "rotate", "scale"] as const).map((mode) => (
            <button key={mode} type="button" className={`${btn} ${tool.mode === mode ? on : ""}`} aria-pressed={tool.mode === mode} onClick={() => setTool({ ...tool, mode })} data-testid={`scene-mode-${mode}`}>
              {MODE_LABEL[mode]()}
            </button>
          ))}
        </div>
        <button type="button" className={`${btn} ${tool.snap ? on : ""}`} aria-pressed={tool.snap} onClick={() => setTool({ ...tool, snap: !tool.snap })} title={tr("خطوات ثابتة: 0.1 للتحريك والتكبير و15° للتدوير", "Fixed steps: 0.1 to move and size, 15° to turn")}>
          {tr("خطوات", "Snap")}
        </button>
        <button type="button" className={`${btn} ${tool.play ? "" : on}`} aria-pressed={!tool.play} onClick={() => setTool({ ...tool, play: !tool.play })} data-testid="scene-play">
          {tool.play ? tr("⏸ وقّف الحركة", "⏸ Pause motion") : tr("▶ شغّل الحركة", "▶ Play motion")}
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5 text-[11px] text-white/60">
        <span className="shrink-0">{tr("معاينة السكرول", "Scroll preview")}</span>
        <input
          type="range"
          className="min-w-0 flex-1 accent-[var(--color-accent-500,#a43b64)]"
          min={0}
          max={1}
          step={0.01}
          value={preview ?? 0}
          onChange={(e) => setPreview(Number(e.target.value))}
          aria-label={tr("معاينة السكرول", "Scroll preview")}
          data-testid="scene-preview"
        />
        <span dir="ltr" className="w-9 shrink-0 text-end tabular-nums text-white/40">
          {preview === null ? "—" : `${Math.round(preview * 100)}%`}
        </span>
        <button type="button" className={`${btn} ${preview === null ? on : ""}`} aria-pressed={preview === null} onClick={() => setPreview(null)} data-testid="scene-preview-page">
          {tr("سكرول الصفحة", "The page's scroll")}
        </button>
      </div>

      <Group title={tr("مسار السكرول", "Scroll path")} onReset={path ? () => { without("path"); pickKey("start"); } : undefined} testId="scene-path">
        {path ? (
          <>
            <div className="flex flex-wrap gap-1" role="group" aria-label={tr("المقابض بتحرّك", "The handles move")}>
              {(["start", "end"] as const).map((k) => (
                <button key={k} type="button" className={`${btn} ${tool.key === k ? on : ""}`} aria-pressed={tool.key === k} onClick={() => pickKey(k)} data-testid={`scene-key-${k}`}>
                  {k === "start" ? tr("البداية", "Start") : tr("النهاية", "End")}
                </button>
              ))}
              <button
                type="button"
                className={btn}
                onClick={() => set((l) => ({ ...l, path: { ...l.path!, pos: l.pos ?? [0, 0, 0], rot: l.rot ?? [0, 0, 0], scale: l.scale ?? [1, 1, 1] } }))}
              >
                {tr("النهاية متل البداية", "End like the start")}
              </button>
            </div>
            <select className={field} value={path.ease} onChange={(e) => set((l) => ({ ...l, path: { ...l.path!, ease: e.target.value as StagePath["ease"] } }))} aria-label={tr("طريقة المشي", "How it travels")} data-testid="scene-path-ease">
              {STAGE_EASES.map((e) => (
                <option key={e} value={e}>
                  {EASE_LABEL[e]()}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <p className="text-[11px] leading-5 text-white/45">
              {tr("الموديل بيمشي من مكانه لمكان تاني لما الزبون ينزل بالصفحة.", "The model travels to another place as the shopper scrolls down.")}
            </p>
            <button type="button" className={btn} onClick={startPath} data-testid="scene-path-add">
              {tr("أضف مسار", "Add a path")}
            </button>
          </>
        )}
      </Group>

      <Group title={atEnd ? tr("المكان بنهاية السكرول", "Place at the end of the scroll") : tr("المكان", "Place")} onReset={atEnd ? undefined : () => without("pos", "rot", "scale")} testId="scene-place">
        <div className="grid grid-cols-3 gap-1">
          {axes.map((a, j) => (
            <Num key={a} label={`${tr("تحريك", "Move")} ${a}`} value={pos[j]} step={0.1} min={-6} max={6} onChange={(v) => setVec("pos", j, v)} testId={`scene-pos-${j}`} />
          ))}
          {axes.map((a, j) => (
            <Num key={a} label={`${tr("تدوير", "Turn")} ${a}°`} value={rot[j]} step={5} min={-360} max={360} onChange={(v) => setVec("rot", j, v)} testId={`scene-rot-${j}`} />
          ))}
          {axes.map((a, j) => (
            <Num key={a} label={`${tr("حجم", "Size")} ${a}`} value={scale[j]} step={0.05} min={0.1} max={4} onChange={(v) => setVec("scale", j, v)} testId={`scene-scale-${j}`} />
          ))}
        </div>
        <label className="flex items-center gap-2 text-[11px] text-white/55">
          <input type="checkbox" checked={tool.lockScale} onChange={(e) => setTool({ ...tool, lockScale: e.target.checked })} />
          {tr("الحجم بنفس النسبة", "Keep the proportions")}
        </label>
      </Group>

      <Group title={tr("الحركة", "Motion")} onReset={anim ? () => without("anim") : undefined} testId="scene-motion">
        <select
          className={field}
          value={anim?.type ?? ""}
          onChange={(e) => (e.target.value ? setAnim({ type: e.target.value as StageAnim["type"] }) : without("anim"))}
          aria-label={tr("نوع الحركة", "Kind of motion")}
          data-testid="scene-anim"
        >
          <option value="">{tr("هزّة خفيفة (الأصل)", "Gentle bob (the stage's own)")}</option>
          {STAGE_ANIMS.map((a) => (
            <option key={a} value={a}>
              {ANIM_LABEL[a]()}
            </option>
          ))}
        </select>
        {anim && anim.type !== "none" ? (
          <>
            <Slider label={tr("السرعة", "Speed")} value={anim.speed} min={0} max={5} step={0.1} onChange={(v) => setAnim({ speed: v }, "speed")} testId="scene-anim-speed" />
            <Slider label={tr("المقدار", "Amount")} value={anim.amount} min={0} max={2} step={0.05} onChange={(v) => setAnim({ amount: v }, "amount")} testId="scene-anim-amount" />
            <div className="flex flex-wrap gap-1" role="group" aria-label={tr("إيمتى تشتغل", "When it plays")}>
              {STAGE_TRIGGERS.map((t) => (
                <button key={t} type="button" className={`${btn} ${anim.trigger === t ? on : ""}`} aria-pressed={anim.trigger === t} onClick={() => setAnim({ trigger: t })} data-testid={`scene-trigger-${t}`}>
                  {TRIGGER_LABEL[t]()}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </Group>

      <Group title={tr("ملف 3D خاص (GLB)", "Your own 3D file (GLB)")} testId="scene-file">
        <ModelFile glb={glb} info={glbInfo[index]} onChange={setGlb} />
      </Group>

      <Group title={tr("الشكل", "Shape")} onReset={look.shape || look.knobs ? () => without("shape", "knobs") : undefined} testId="scene-shape">
        {(glb ? [] : info?.knobs ?? []).map((k) => (
          <Slider
            key={k.id}
            label={k.label[lang] || k.label.en}
            value={knobValue(k)}
            min={k.min}
            max={k.max}
            step={k.step}
            values={k.values}
            onChange={(v) => set((l) => ({ ...l, knobs: { ...l.knobs, [k.id]: v } }), `knob-${k.id}`)}
            testId={`scene-knob-${k.id}`}
          />
        ))}
        {(["w", "h", "d"] as const).map((axis) => (
          <Slider
            key={axis}
            label={axis === "w" ? tr("مطّ بالعرض", "Stretch wide") : axis === "h" ? tr("مطّ بالطول", "Stretch tall") : tr("مطّ بالعمق", "Stretch deep")}
            value={shape[axis]}
            min={0.4}
            max={2.5}
            step={0.05}
            onChange={(v) => set((l) => ({ ...l, shape: { w: 1, h: 1, d: 1, ...l.shape, [axis]: v } }), `shape-${axis}`)}
            testId={`scene-shape-${axis}`}
          />
        ))}
      </Group>

      {glb ? (
        <p className="text-[11px] leading-5 text-white/40">{tr("الألوان والتشطيب ومقابض الشكل للموديلات المبنية بس؛ ملفك بيضل بألوانه.", "Colours, finish and shape knobs are for the built-in models; your file keeps its own colours.")}</p>
      ) : (
      <Group title={tr("الألوان والتشطيب", "Colours and finish")} onReset={look.colours || look.finish ? () => without("colours", "finish") : undefined} testId="scene-colours">
        <div className="grid grid-cols-2 gap-1">
          {STAGE_PARTS.map((part) => {
            const value = look.colours?.[part];
            return (
              <div key={part} className="flex items-center gap-1.5 rounded-md bg-white/[0.03] px-1.5 py-1">
                <input
                  type="color"
                  className="h-6 w-7 shrink-0 cursor-pointer rounded border border-white/[0.1] bg-transparent"
                  value={value ?? theme.swatch[2] ?? "#888888"}
                  onChange={(e) => set((l) => ({ ...l, colours: { ...l.colours, [part]: e.target.value } }), `colour-${part}`)}
                  aria-label={PART_LABEL[part]()}
                  data-testid={`scene-colour-${part}`}
                />
                <span className="min-w-0 flex-1 truncate text-[11px] text-white/60">{PART_LABEL[part]()}</span>
                {value ? (
                  <button
                    type="button"
                    className="text-[11px] text-white/40 hover:text-white"
                    aria-label={tr("لون الثيم", "The theme's colour")}
                    onClick={() =>
                      set((l) => {
                        const colours = { ...l.colours };
                        delete colours[part];
                        const next: StageLook = { ...l, colours };
                        if (!Object.keys(colours).length) delete next.colours;
                        return next;
                      })
                    }
                  >
                    ×
                  </button>
                ) : (
                  <span className="text-[10px] text-white/30">{tr("تلقائي", "Auto")}</span>
                )}
              </div>
            );
          })}
        </div>
        <select
          className={field}
          value={look.finish ?? ""}
          onChange={(e) => (e.target.value ? set((l) => ({ ...l, finish: e.target.value as StageLook["finish"] })) : without("finish"))}
          aria-label={tr("التشطيب", "Finish")}
          data-testid="scene-finish"
        >
          <option value="">
            {tr("تشطيب الثيم", "The theme's finish")}
            {theme.stage?.finish && theme.stage.finish in FINISH_LABEL ? ` (${FINISH_LABEL[theme.stage.finish as keyof typeof FINISH_LABEL]()})` : ""}
          </option>
          {STAGE_FINISHES.map((f) => (
            <option key={f} value={f}>
              {FINISH_LABEL[f]()}
            </option>
          ))}
        </select>
      </Group>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={!Object.keys(look).length} onClick={() => set(() => ({}))} data-testid="scene-reset-model">
          {tr("رجوع لأصل هالموديل", "Reset this model")}
        </button>
        <button
          type="button"
          className={btn}
          disabled={draft.models.every((m) => !Object.keys(m.look).length) && !Object.keys(draft.scene).length}
          onClick={() => change((d) => ({ ...d, models: d.models.map((m) => ({ ...m, look: {} })), scene: {} }))}
          data-testid="scene-reset-all"
        >
          {tr("رجوع لإعدادات الباقة", "Back to the pack's settings")}
        </button>
      </div>
    </div>
  );
}
