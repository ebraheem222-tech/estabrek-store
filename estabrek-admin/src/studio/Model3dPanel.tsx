/**
 * A 3D model's panel in the new editor (model3d): which model (one of the shop's built-in
 * models, or the store's own .glb from the 3D library), swapped for another without
 * touching anything else about it; then its look (finish, part colours, shape knobs; a
 * file's animation), pose, motion, light, camera, floor and background, and what shoppers
 * may do with it. The shop checks it all again (pageTree/model3d.ts).
 */
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { Modal } from "../components/ui/Modal";
import { ModelFile } from "../features/themes/ModelFile";
import { MediaLibraryModal } from "../components/media/MediaLibraryModal";
import { adminLang, type Lang } from "../lib/lang";
import { tr } from "../lib/words";
import { Range } from "./LookPanels";
import { Field } from "./StudioPanels";
import { Choice, ColourPick } from "./StudioTreePanels";
import { STAGE_ANIMS, STAGE_FINISHES, STAGE_PARTS, loadStoreThemes, type StageGlb, type StageModelInfo } from "./storeThemes";
import { MODEL3D_LOOKS, lookOf3d, withLook } from "./model3dLooks";

type Ops = (label: string, ops: PageDraftOp[]) => void;
// The model's settings are plain nested data the backend checks; read loosely here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = Record<string, any>;
const box = "space-y-2.5 rounded-xl border border-white/[0.08] p-3";
const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/** The built-in models' list (from the shop, with each one's shape knobs). */
function useModels(): StageModelInfo[] {
  const q = useQuery({ queryKey: ["store-themes", "full"], queryFn: loadStoreThemes, staleTime: 300_000 });
  return q.data?.models ?? [];
}
const nameOf = (m: StageModelInfo | undefined, lang: Lang) => (m ? m.label[lang] || m.label.en : "");

const FINISH_LABEL: Record<string, () => string> = {
  neon: () => tr("نيون", "Neon"), metal: () => tr("معدن", "Metal"), toy: () => tr("لعبة", "Toy"), voxel: () => tr("مكعبات", "Voxel"),
  matte: () => tr("مطفي", "Matte"), glass: () => tr("زجاج", "Glass"), gold: () => tr("ذهب", "Gold"),
};
const PART_LABEL: Record<string, () => string> = {
  body: () => tr("الجسم", "Body"), trim: () => tr("الأطراف", "Trim"), accent: () => tr("اللمسات", "Accents"),
  glow: () => tr("التوهّج", "Glow"), screen: () => tr("الشاشة", "Screen"), metal: () => tr("المعدن", "Metal"),
};
const ANIM_LABEL: Record<string, () => string> = {
  none: () => tr("ثابت", "Still"), spin: () => tr("بيلف", "Spins"), float: () => tr("بيطفو", "Floats"), bounce: () => tr("بينط", "Bounces"),
  pulse: () => tr("بينبض", "Pulses"), swing: () => tr("بيتمرجح", "Swings"), orbit: () => tr("بيدور بدائرة", "Circles"),
};
const LIGHT_LABEL: Record<string, () => string> = {
  studio: () => tr("استوديو", "Studio"), soft: () => tr("ناعم", "Soft"), sunset: () => tr("غروب", "Sunset"),
  neon: () => tr("نيون", "Neon"), night: () => tr("ليل", "Night"), warm: () => tr("دافي", "Warm"),
};
/** Each light's own values (the shop's pageTree/model3d.ts LIGHTS), shown on the sliders until changed. */
const LIGHT_BASE: Record<string, { ambient: number; key: number; env: number; rim: number }> = {
  studio: { ambient: 0.6, key: 2.2, env: 1.2, rim: 20 }, soft: { ambient: 1, key: 1.2, env: 0.8, rim: 8 }, sunset: { ambient: 0.5, key: 2.4, env: 1, rim: 40 },
  neon: { ambient: 0.3, key: 1, env: 0.8, rim: 70 }, night: { ambient: 0.2, key: 0.8, env: 0.5, rim: 50 }, warm: { ambient: 0.7, key: 2, env: 1, rim: 25 },
};

function Fold({ title, open, children, testId }: { title: string; open?: boolean; children: ReactNode; testId?: string }) {
  return (
    <details className="rounded-lg border border-white/[0.06] px-2 py-1.5" open={open} data-testid={testId}>
      <summary className="cursor-pointer select-none text-[11px] font-medium text-white/70">{title}</summary>
      <div className="mt-2 space-y-2.5">{children}</div>
    </details>
  );
}

/** Picking a model: one of the shop's built-in ones, or the store's own .glb. */
function ModelSwap({ open, model, file, onModel, onFile, onClose }: { open: boolean; model?: string; file?: StageGlb; onModel: (kind: string) => void; onFile: (glb: StageGlb | undefined) => void; onClose: () => void }) {
  const models = useModels();
  const lang = adminLang();
  const [tab, setTab] = useState<"built" | "file">(file ? "file" : "built");
  const [find, setFind] = useState("");
  const shown = useMemo(() => {
    const q = find.trim().toLowerCase();
    return models.filter((m) => !q || m.kind.includes(q) || Object.values(m.label).some((w) => w.toLowerCase().includes(q)));
  }, [models, find]);
  const tabBtn = (t: "built" | "file", label: string) => (
    <button type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-lg px-2.5 py-1 text-xs ${tab === t ? "bg-accent-500 text-white" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"}`} data-tab={t}>{label}</button>
  );
  return (
    <Modal open={open} title={tr("بدّل الموديل (كل الإعدادات التانية بتضل)", "Swap the model (everything else stays)")} onClose={onClose} widthClassName="max-w-3xl">
      <div className="space-y-3" data-testid="model3d-swap">
        <div className="flex gap-1.5" role="tablist">
          {tabBtn("built", tr("موديلات جاهزة", "Built-in models"))}
          {tabBtn("file", tr("ملفاتك ‎.glb", "Your .glb files"))}
        </div>
        {tab === "built" ? (
          <>
            <input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder={tr("دوّر: حذاء، ساعة، عطر…", "Find: sneaker, watch, perfume…")} className="w-full rounded-lg border border-white/[0.1] bg-surface-925 px-3 py-2 text-sm text-white" data-testid="model3d-find" />
            <div className="grid max-h-[50vh] grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-1 overflow-y-auto">
              {shown.map((m) => (
                <button key={m.kind} type="button" onClick={() => onModel(m.kind)} className={`rounded-lg border px-2 py-2 text-start text-xs ${model === m.kind && !file ? "border-accent-400 bg-accent-500/20 text-white" : "border-white/[0.08] text-white/80 hover:bg-white/[0.06]"}`} data-model={m.kind}>
                  {nameOf(m, lang)}
                  <span className="block text-[10px] text-white/35" dir="ltr">{m.kind}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <ModelFile glb={file} onChange={onFile} />
        )}
      </div>
    </Modal>
  );
}

export function Model3dPanel({ node, lang, busy, onOps }: { node: PageTreeNode; lang: Lang; busy: boolean; onOps: Ops }) {
  const p = (node.props ?? {}) as Obj;
  const models = useModels();
  const [swap, setSwap] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const set = (label: string, patch: Obj) => onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...p, ...patch } }]);
  const part = (key: string, patch: Obj | null, label = tr("الموديل ثلاثي الأبعاد", "The 3D model")) => set(label, { [key]: patch ? { ...(isObj(p[key]) ? p[key] : {}), ...patch } : undefined });
  const file = isObj(p.file) ? (p.file as StageGlb) : undefined;
  const info = models.find((m) => m.kind === p.model);
  const turn = isObj(p.turn) ? p.turn : { x: 0, y: 0, z: 0 };
  const anim = isObj(p.anim) ? p.anim : null;
  const lights = isObj(p.lights) ? p.lights : {};
  const preset = typeof lights.preset === "string" ? lights.preset : "studio";
  const base = LIGHT_BASE[preset] ?? LIGHT_BASE.studio;
  const cam = isObj(p.camera) ? p.camera : {};
  const words = typeof p.label === "object" && p.label ? String((p.label as Record<string, string>)[lang] ?? "") : "";
  const toggle = (key: string, label: string, testId?: string) => (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-white/75">{label}</span>
      <input type="checkbox" disabled={busy} checked={p[key] === true} onChange={(e) => set(label, { [key]: e.target.checked || undefined })} data-testid={testId} />
    </label>
  );
  return (
    <div className={box} data-testid="studio-model3d">
      <div className="text-xs font-medium text-white/70">{tr("الموديل ثلاثي الأبعاد", "The 3D model")}</div>
      <div className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] p-2">
        <div className="min-w-0 text-xs">
          <div className="truncate text-white/85" data-testid="model3d-now">{file ? file.name || tr("ملفك", "Your file") : nameOf(info, lang) || String(p.model ?? "")}</div>
          <div className="text-[10px] text-white/40">{file ? tr("ملف ‎.glb من مكتبتك", "A .glb from your library") : tr("موديل جاهز", "A built-in model")}</div>
        </div>
        <button type="button" className="shrink-0 rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40" disabled={busy} onClick={() => setSwap(true)} data-testid="model3d-swap-open">{tr("بدّل الموديل", "Swap the model")}</button>
      </div>
      <ModelSwap
        open={swap} model={typeof p.model === "string" ? p.model : undefined} file={file} onClose={() => setSwap(false)}
        // A built-in model in place of a file, or a file over the built-in one: only the model changes.
        onModel={(kind) => {
          setSwap(false);
          set(tr("بدّل الموديل", "Swap the model"), { model: kind, file: undefined });
        }}
        onFile={(glb) => {
          setSwap(false);
          set(tr("بدّل الموديل", "Swap the model"), { file: glb ?? undefined, model: p.model ?? "sneaker" });
        }}
      />

      <Fold title={tr("صورة بديلة للموديل", "Model fallback picture")} open={Boolean(p.poster)} testId="model3d-poster">
        <p className="text-[11px] leading-5 text-white/45">{tr("صورة من مكتبتك بتظهر أثناء التحميل أو إذا تعذّر عرض الموديل. اختيارية، وما بتغيّر ملفك أو حركته.", "A picture from your library shown while loading or when the model cannot be displayed. Optional; keeps your file and its motion.")}</p>
        {typeof p.poster === "string" ? <img src={p.poster} alt="" className="h-28 w-full rounded-lg object-contain" /> : null}
        <Field label={tr("رابط الصورة البديلة (اختياري)", "Fallback picture URL (optional)")} value={typeof p.poster === "string" ? p.poster : ""} onSave={(value) => {
          const url = value.trim();
          if (!busy && (!url || /^(\/(?!\/)|https:\/\/)[^\s<>"'`\\]+$/i.test(url))) set(tr("صورة بديلة للموديل", "Model fallback picture"), { poster: url || undefined });
        }} testId="model3d-poster-url" />
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => setPosterOpen(true)} className="rounded-lg bg-white/[0.06] px-2 py-1.5 text-xs disabled:opacity-40" data-testid="model3d-poster-choose">{tr("اختيار صورة", "Choose a picture")}</button>
          {p.poster ? <button type="button" disabled={busy} onClick={() => set(tr("صورة بديلة للموديل", "Model fallback picture"), { poster: undefined })} className="rounded-lg bg-white/[0.06] px-2 py-1.5 text-xs disabled:opacity-40" data-testid="model3d-poster-clear">{tr("إزالة الصورة البديلة", "Remove fallback picture")}</button> : null}
        </div>
        <MediaLibraryModal open={posterOpen} onClose={() => setPosterOpen(false)} title={tr("صورة بديلة للموديل", "Model fallback picture")} onSelect={(poster) => { setPosterOpen(false); set(tr("صورة بديلة للموديل", "Model fallback picture"), { poster }); }} />
      </Fold>

      <div className="grid grid-cols-2 gap-1" role="group" aria-label={tr("أشكال جاهزة", "Ready looks")} data-testid="model3d-looks">
        {MODEL3D_LOOKS.map((l) => (
          <button key={l.key} type="button" disabled={busy} aria-pressed={lookOf3d(p) === l.key} onClick={() => onOps(l.name(), [{ op: "setProps", nodeId: node.id, props: withLook(p, l) }])} className={`truncate rounded-lg border px-1.5 py-1.5 text-start text-[11px] ${lookOf3d(p) === l.key ? "border-accent-400/70 bg-accent-500/15 text-white" : "border-white/[0.08] text-white/75 hover:bg-white/[0.05]"} disabled:opacity-40`} data-look={l.key} title={l.name()}>
            {l.name()}
          </button>
        ))}
      </div>

      <Fold title={tr("شكله", "Its look")} open testId="model3d-look">
        {file ? (
          <>
            <Choice
              label={tr("حركة الملف نفسه", "The file's own animation")} value={file.clip === "*" ? "first" : file.clip ? "named" : "none"} busy={busy} testId="model3d-clip"
              options={[["none", tr("بلا", "None")], ["first", tr("أول حركة فيه", "Its first one")], ["named", tr("بالاسم", "By name")]]}
              onPick={(v) => set(tr("حركة الملف", "The file's animation"), { file: { ...file, clip: v === "first" ? "*" : v === "named" ? (file.clip && file.clip !== "*" ? file.clip : "Idle") : undefined } })}
            />
            {file.clip && file.clip !== "*" ? <Field label={tr("اسم الحركة", "The animation's name")} value={file.clip} onSave={(v) => set(tr("حركة الملف", "The file's animation"), { file: { ...file, clip: v.trim().slice(0, 100) || undefined } })} testId="model3d-clip-name" /> : null}
          </>
        ) : (
          <>
            <div className="text-[11px] text-white/55">{tr("الخامة", "Finish")}</div>
            <div className="grid grid-cols-4 gap-1" role="group">
              {STAGE_FINISHES.map((f) => (
                <button key={f} type="button" aria-pressed={(p.finish ?? "metal") === f} disabled={busy} onClick={() => set(tr("الخامة", "Finish"), { finish: f })} className={`rounded-lg px-1 py-1 text-[11px] ${(p.finish ?? "metal") === f ? "bg-accent-500/30 text-white" : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"}`} data-finish={f}>{FINISH_LABEL[f]()}</button>
              ))}
            </div>
            {STAGE_PARTS.map((k) => (
              <ColourPick key={k} label={`${tr("لون", "Colour")}: ${PART_LABEL[k]()}`} value={isObj(p.colours) ? p.colours[k] ?? "" : ""} busy={busy} onPick={(c) => part("colours", { [k]: c ?? undefined }, tr("لون الموديل", "Model colour"))} testId={`model3d-colour-${k}`} />
            ))}
            {(info?.knobs ?? []).map((k) => (
              <Range
                key={k.id} label={k.label[lang] || k.label.en} min={k.min} max={k.max} step={k.step} busy={busy}
                value={isObj(p.knobs) && typeof p.knobs[k.id] === "number" ? p.knobs[k.id] : k.def}
                onSave={(v) => part("knobs", { [k.id]: v }, tr("شكل الموديل", "Model shape"))} testId={`model3d-knob-${k.id}`}
              />
            ))}
          </>
        )}
      </Fold>

      <Fold title={tr("وضعيته", "Its pose")} testId="model3d-pose">
        {(["x", "y", "z"] as const).map((a) => (
          <Range key={a} label={`${tr("لفّة", "Turn")} ${a.toUpperCase()}`} min={-180} max={180} step={5} unit="°" busy={busy} value={Number(turn[a]) || 0} onSave={(v) => set(tr("وضعية الموديل", "Model pose"), { turn: { x: 0, y: 0, z: 0, ...turn, [a]: v } })} testId={`model3d-turn-${a}`} />
        ))}
        <Range label={tr("الحجم", "Size")} min={0.2} max={3} step={0.05} busy={busy} value={typeof p.size === "number" ? p.size : 1} onSave={(v) => set(tr("حجم الموديل", "Model size"), { size: v === 1 ? undefined : v })} testId="model3d-size" />
        <Range label={tr("لفوق أو لتحت", "Up or down")} min={-2} max={2} step={0.05} busy={busy} value={typeof p.lift === "number" ? p.lift : 0} onSave={(v) => set(tr("وضعية الموديل", "Model pose"), { lift: v || undefined })} testId="model3d-lift" />
      </Fold>

      <Fold title={tr("حركته", "Its motion")} testId="model3d-motion">
        <Choice
          label={tr("الحركة", "Motion")} value={anim?.type ?? "none"} busy={busy} testId="model3d-anim"
          options={STAGE_ANIMS.map((a): [string, string] => [a, ANIM_LABEL[a]()])}
          onPick={(v) => set(tr("حركة الموديل", "Model motion"), { anim: v === "none" ? undefined : { speed: 1, amount: 1, trigger: "always", ...(anim ?? {}), type: v } })}
        />
        {anim ? (
          <>
            <Range label={tr("السرعة", "Speed")} min={0} max={5} step={0.1} busy={busy} value={anim.speed ?? 1} onSave={(v) => part("anim", { speed: v })} testId="model3d-anim-speed" />
            <Range label={tr("القوّة", "Strength")} min={0} max={2} step={0.1} busy={busy} value={anim.amount ?? 1} onSave={(v) => part("anim", { amount: v })} />
            <Choice label={tr("إمتى", "When")} value={anim.trigger ?? "always"} busy={busy} testId="model3d-anim-trigger" options={[["always", tr("دايماً", "Always")], ["hover", tr("مع الماوس", "With the mouse")], ["scroll", tr("مع السكرول", "With the scroll")]]} onPick={(v) => part("anim", { trigger: v })} />
          </>
        ) : null}
        <Range label={tr("بيلف لحاله (سالب = بالعكس)", "Turns by itself (minus = the other way)")} min={-2} max={2} step={0.1} busy={busy} value={typeof p.auto === "number" ? p.auto : 0} onSave={(v) => set(tr("لفّة لحاله", "Turns by itself"), { auto: v || undefined })} testId="model3d-auto" />
        {toggle("tilt", tr("بيميل باتجاه الماوس", "Leans toward the mouse"), "model3d-tilt")}
      </Fold>

      <Fold title={tr("الإضاءة", "Light")} testId="model3d-light">
        <div className="grid grid-cols-3 gap-1" role="group">
          {Object.keys(LIGHT_LABEL).map((k) => (
            <button key={k} type="button" aria-pressed={preset === k} disabled={busy} onClick={() => set(tr("الإضاءة", "Light"), { lights: { preset: k } })} className={`rounded-lg px-1 py-1 text-[11px] ${preset === k ? "bg-accent-500/30 text-white" : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"}`} data-light={k}>{LIGHT_LABEL[k]()}</button>
          ))}
        </div>
        <Range label={tr("ضو عام", "Overall light")} min={0} max={3} step={0.05} busy={busy} value={lights.ambient ?? base.ambient} onSave={(v) => part("lights", { preset, ambient: v }, tr("الإضاءة", "Light"))} />
        <Range label={tr("الضو الرئيسي", "Main light")} min={0} max={8} step={0.1} busy={busy} value={lights.key ?? base.key} onSave={(v) => part("lights", { preset, key: v }, tr("الإضاءة", "Light"))} testId="model3d-light-key" />
        <Range label={tr("الانعكاسات", "Reflections")} min={0} max={4} step={0.1} busy={busy} value={lights.env ?? base.env} onSave={(v) => part("lights", { preset, env: v }, tr("الإضاءة", "Light"))} />
        <Range label={tr("أضواء الأطراف", "Rim lights")} min={0} max={120} step={1} busy={busy} value={lights.rim ?? base.rim} onSave={(v) => part("lights", { preset, rim: v }, tr("الإضاءة", "Light"))} />
        {[0, 1].map((i) => (
          <ColourPick
            key={i} label={i ? tr("لون ضو الطرف التاني", "Second rim colour") : tr("لون ضو الطرف الأول", "First rim colour")}
            value={Array.isArray(lights.colours) ? lights.colours[i] : ""} busy={busy}
            onPick={(c) => {
              const now: [string, string] = Array.isArray(lights.colours) ? [...lights.colours] as [string, string] : ["#ffffff", "#ffffff"];
              now[i] = c ?? "#ffffff";
              part("lights", { preset, colours: now }, tr("الإضاءة", "Light"));
            }}
          />
        ))}
      </Fold>

      <Fold title={tr("الكاميرا والأرضية", "Camera and floor")} testId="model3d-camera">
        <Range label={tr("العدسة (أصغر = أقرب)", "Lens (smaller = closer)")} min={15} max={80} step={1} unit="°" busy={busy} value={cam.fov ?? 34} onSave={(v) => part("camera", { fov: v })} testId="model3d-fov" />
        <Range label={tr("البعد", "Distance")} min={2} max={20} step={0.1} busy={busy} value={cam.distance ?? 6.2} onSave={(v) => part("camera", { distance: v })} />
        <Range label={tr("الارتفاع", "Height")} min={-5} max={5} step={0.1} busy={busy} value={cam.height ?? 0.4} onSave={(v) => part("camera", { height: v })} />
        <Choice
          label={tr("الأرضية", "Floor")} value={p.floor ?? "shadow"} busy={busy} testId="model3d-floor"
          options={[["shadow", tr("ظل ناعم", "Soft shadow")], ["disc", tr("قاعدة", "A base")], ["grid", tr("شبكة", "Grid")], ["none", tr("بلا", "None")]]}
          onPick={(v) => set(tr("الأرضية", "Floor"), { floor: v === "shadow" ? undefined : v })}
        />
        <ColourPick label={tr("الخلفية (فاضي = شفافة)", "Background (empty = see-through)")} value={p.bg ?? ""} busy={busy} onPick={(c) => set(tr("الخلفية", "Background"), { bg: c ?? undefined })} testId="model3d-bg" />
      </Fold>

      <Fold title={tr("الزبون والموديل", "Shoppers and the model")} testId="model3d-shoppers">
        {toggle("drag", tr("بيقدر يلفّه بإيده", "Can turn it by hand"), "model3d-drag")}
        {p.drag ? toggle("zoom", tr("وبيقرّب ويبعّد", "And zoom in and out")) : null}
        <Field label={tr("رابط لما يكبس عليه (بيلغي اللف باليد)", "A link when it's clicked (turning by hand goes)")} value={typeof p.href === "string" ? p.href : ""} onSave={(v) => set(tr("الرابط", "Link"), { href: /^(\/(?!\/)|#|https?:\/\/)/.test(v.trim()) ? v.trim() : undefined })} testId="model3d-href" />
      </Fold>

      <Field label={tr("وصفه لقارئ الشاشة (فاضي = زينة بس)", "Its description for screen readers (empty = decoration only)")} value={words} onSave={(v) => {
        const all = { ...((p.label ?? {}) as Record<string, string>) };
        if (v.trim()) all[lang] = v;
        else delete all[lang];
        set(tr("تعديل", "Edit"), { label: Object.keys(all).length ? all : undefined });
      }} />
      <p className="text-[10px] leading-4 text-white/35">{tr("الموديل بيرسم بس لما يقرب من الشاشة، وبيوقف لما يبعد. اللي طالب حركة أقل بيشوفه ثابت.", "The model draws only near the screen and stops when it leaves. Whoever asked for less motion sees it still.")}</p>
    </div>
  );
}
