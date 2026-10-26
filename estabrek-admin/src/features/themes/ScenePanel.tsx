/**
 * The whole 3D stage in the scene editor: how the models stand (layout), the floor, the
 * camera (lens, distance, height, pointer sway, its move over the scroll and its turn round
 * the stage) and the lights (fill, key and its direction, rim lights and their colours,
 * reflections, halos). Unset = the theme's own; each group goes back to it on its own.
 * It changes the stage's draft (stageDraft.ts), drawn live in the shop's frame.
 */
import type { ReactNode } from "react";
import { tr } from "../../lib/words";
import { STAGE_FLOORS, STAGE_LAYOUTS, type StageCamera, type StageDefaults, type StageLights, type StageScene, type StoreThemeInfo } from "../../studio/storeThemes";
import type { StageDraftApi } from "./stageDraft";

const field = "w-full rounded-md border border-white/[0.1] bg-surface-925 px-1.5 py-1 text-xs text-white";

const LAYOUT_LABEL: Record<(typeof STAGE_LAYOUTS)[number], () => string> = {
  orbit: () => tr("دائرة حول المختار", "A circle round the picked one"),
  hero: () => tr("المختار كبير والباقي جنبه", "The picked one big, the rest beside it"),
  podium: () => tr("منصة تتويج", "A podium"),
  shelf: () => tr("رف", "A shelf"),
};
const FLOOR_LABEL: Record<(typeof STAGE_FLOORS)[number], () => string> = {
  grid: () => tr("شبكة", "Grid"),
  stage: () => tr("منصة دائرية", "Round stage"),
  none: () => tr("بدون أرضية", "No floor"),
};
const CAMERA_LABEL: Record<keyof StageCamera, () => string> = {
  fov: () => tr("زاوية العدسة", "Lens angle"),
  distance: () => tr("البعد", "Distance"),
  height: () => tr("الارتفاع", "Height"),
  target: () => tr("لوين بتطّلع", "Looks at height"),
  sway: () => tr("لحاق الماوس", "Follows the pointer"),
  dolly: () => tr("رجوع مع السكرول", "Pulls back on scroll"),
  drop: () => tr("نزول مع السكرول", "Goes down on scroll"),
  orbit: () => tr("دوران حول المشهد", "Turns round the stage"),
};
const STEP: Record<keyof StageCamera, number> = { fov: 1, distance: 0.1, height: 0.05, target: 0.05, sway: 0.05, dolly: 0.1, drop: 0.05, orbit: 0.01 };
const LIGHT_LABEL: Record<"ambient" | "key" | "keyAngle" | "rim" | "env", () => string> = {
  ambient: () => tr("الإضاءة العامة", "Fill light"),
  key: () => tr("الضوء الرئيسي", "Key light"),
  keyAngle: () => tr("اتجاه الضوء الرئيسي", "Key light direction"),
  rim: () => tr("أضواء الحواف", "Rim lights"),
  env: () => tr("الانعكاسات", "Reflections"),
};
const LIGHT_STEP = { ambient: 0.05, key: 0.1, keyAngle: 1, rim: 1, env: 0.05 } as const;

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

function Range({ label, value, min, max, step, onChange, testId }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; testId?: string }) {
  return (
    <label className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 text-[11px] text-white/60">
      <span className="truncate">{label}</span>
      <span dir="ltr" className="text-[10px] tabular-nums text-white/40">
        {Number(value.toFixed(step >= 1 ? 0 : 2))}
      </span>
      <input type="range" className="col-span-2 accent-[var(--color-accent-500,#a43b64)]" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} data-testid={testId} />
    </label>
  );
}

export function ScenePanel({ theme, api, defaults }: { theme: StoreThemeInfo; api: StageDraftApi; defaults: StageDefaults | null }) {
  const { draft, change } = api;
  const scene = draft.scene;
  const set = (fn: (s: StageScene) => StageScene, key = "") => change((d) => ({ ...d, scene: fn(d.scene) }), key);
  const without = (...keys: Array<keyof StageScene>) => set((s) => Object.fromEntries(Object.entries(s).filter(([k]) => !keys.includes(k as keyof StageScene))) as StageScene);
  if (!defaults) return <p className="text-[11px] text-white/45">{tr("ما وصلت إعدادات المشهد من المتجر.", "The stage's settings didn't come from the store.")}</p>;
  const cam = scene.camera ?? defaults.camera;
  const lights: StageLights = scene.lights ?? defaults.lights;
  const setCam = (k: keyof StageCamera, v: number) => set((s) => ({ ...s, camera: { ...defaults.camera, ...s.camera, [k]: v } }), `camera-${k}`);
  const setLights = (patch: Partial<StageLights>, key = "") => set((s) => ({ ...s, lights: { ...defaults.lights, ...s.lights, ...patch } }), key);
  const own = theme.stage;

  return (
    <div className="space-y-3" data-testid="scene-panel">
      <Group title={tr("ترتيب الموديلات والأرضية", "Layout and floor")} onReset={scene.layout || scene.floor || scene.floorColour || scene.floorGlow !== undefined ? () => without("layout", "floor", "floorColour", "floorGlow") : undefined} testId="scene-layout-group">
        <select className={field} value={scene.layout ?? ""} onChange={(e) => (e.target.value ? set((s) => ({ ...s, layout: e.target.value as StageScene["layout"] })) : without("layout"))} aria-label={tr("الترتيب", "Layout")} data-testid="scene-layout">
          <option value="">
            {tr("ترتيب الثيم", "The theme's layout")}
            {own?.layout && own.layout in LAYOUT_LABEL ? ` (${LAYOUT_LABEL[own.layout as keyof typeof LAYOUT_LABEL]()})` : ""}
          </option>
          {STAGE_LAYOUTS.map((l) => (
            <option key={l} value={l}>
              {LAYOUT_LABEL[l]()}
            </option>
          ))}
        </select>
        <select className={field} value={scene.floor ?? ""} onChange={(e) => (e.target.value ? set((s) => ({ ...s, floor: e.target.value as StageScene["floor"] })) : without("floor"))} aria-label={tr("الأرضية", "Floor")} data-testid="scene-floor">
          <option value="">
            {tr("أرضية الثيم", "The theme's floor")}
            {own?.floor && own.floor in FLOOR_LABEL ? ` (${FLOOR_LABEL[own.floor as keyof typeof FLOOR_LABEL]()})` : ""}
          </option>
          {STAGE_FLOORS.map((f) => (
            <option key={f} value={f}>
              {FLOOR_LABEL[f]()}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/60">
          <label className="flex items-center gap-1.5">
            <input type="color" className="h-6 w-7 cursor-pointer rounded border border-white/[0.1] bg-transparent" value={scene.floorColour ?? "#0b0b12"} onChange={(e) => set((s) => ({ ...s, floorColour: e.target.value }), "floorColour")} data-testid="scene-floor-colour" />
            {tr("لون المنصة", "Stage colour")}
            {scene.floorColour ? (
              <button type="button" className="text-white/40 hover:text-white" onClick={() => without("floorColour")} aria-label={tr("لون الثيم", "The theme's colour")}>
                ×
              </button>
            ) : (
              <span className="text-[10px] text-white/30">{tr("تلقائي", "Auto")}</span>
            )}
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={scene.floorGlow !== false} onChange={(e) => set((s) => ({ ...s, floorGlow: e.target.checked }))} data-testid="scene-floor-glow" />
            {tr("حلقات مضيئة", "Glowing rings")}
          </label>
        </div>
      </Group>

      <Group title={tr("الكاميرا", "Camera")} onReset={scene.camera ? () => without("camera") : undefined} testId="scene-camera">
        {(Object.keys(defaults.camera) as Array<keyof StageCamera>).map((k) => (
          <Range key={k} label={CAMERA_LABEL[k]()} value={cam[k]} min={defaults.cameraRange[k][0]} max={defaults.cameraRange[k][1]} step={STEP[k]} onChange={(v) => setCam(k, v)} testId={`scene-camera-${k}`} />
        ))}
      </Group>

      <Group title={tr("الإضاءة", "Lights")} onReset={scene.lights ? () => without("lights") : undefined} testId="scene-lights">
        {(Object.keys(LIGHT_LABEL) as Array<keyof typeof LIGHT_LABEL>).map((k) => (
          <Range key={k} label={LIGHT_LABEL[k]()} value={lights[k]} min={defaults.lightsRange[k][0]} max={defaults.lightsRange[k][1]} step={LIGHT_STEP[k]} onChange={(v) => setLights({ [k]: v }, `lights-${k}`)} testId={`scene-lights-${k}`} />
        ))}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/60">
          <span>{tr("لون أضواء الحواف", "Rim light colours")}</span>
          {[0, 1].map((j) => (
            <input
              key={j}
              type="color"
              className="h-6 w-7 cursor-pointer rounded border border-white/[0.1] bg-transparent"
              value={lights.colours?.[j] ?? theme.swatch[j === 0 ? 2 : 3] ?? "#888888"}
              onChange={(e) => {
                const next: [string, string] = [...(lights.colours ?? [theme.swatch[2] ?? "#888888", theme.swatch[3] ?? "#888888"])] as [string, string];
                next[j] = e.target.value;
                setLights({ colours: next }, `lights-colour-${j}`);
              }}
              aria-label={`${tr("لون أضواء الحواف", "Rim light colours")} ${j + 1}`}
              data-testid={`scene-lights-colour-${j}`}
            />
          ))}
          {lights.colours ? (
            <button
              type="button"
              className="text-white/40 hover:text-white"
              onClick={() =>
                set((s) => {
                  const l = { ...defaults.lights, ...s.lights };
                  delete l.colours;
                  return { ...s, lights: l };
                })
              }
            >
              {tr("ألوان الثيم", "The theme's colours")}
            </button>
          ) : (
            <span className="text-[10px] text-white/30">{tr("تلقائي", "Auto")}</span>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-white/60">
          <input type="checkbox" checked={lights.halos !== false} onChange={(e) => setLights({ halos: e.target.checked })} data-testid="scene-lights-halos" />
          {tr("هالات الضوء ورا الموديلات", "Halos behind the models")}
        </label>
      </Group>

      <button
        type="button"
        className="rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-30"
        disabled={!Object.keys(scene).length}
        onClick={() => change((d) => ({ ...d, scene: {} }))}
        data-testid="scene-reset-stage"
      >
        {tr("رجوع لمشهد الثيم", "Back to the theme's stage")}
      </button>
    </div>
  );
}
