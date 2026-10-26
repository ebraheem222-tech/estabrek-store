/**
 * A gaming theme's stage at work under the gallery's preview: the models and games, and
 * the 3D scene editor, both changing one draft (stageDraft.ts) with undo and redo. The
 * shop's frame (the studio frame of the home) draws the draft as it changes and, in the
 * scene editor, shows handles on the model being edited and reports them back (its start,
 * or its scroll path's end), shows the scroll the editor picks, and says what each model's
 * own 3D file holds; the frame is spoken to by postMessage only (no 3D here). The scene
 * editor works on one model, or on the whole stage (layout, floor, camera, lights).
 * One save writes it all to the store.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { CatalogCategory } from "../../api/catalog.api";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { tr } from "../../lib/words";
import { saveStageOptions, type StageDefaults, type StageModelInfo, type StageOptions, type StoreThemeInfo } from "../../studio/storeThemes";
import type { GlbInfo } from "./ModelFile";
import { SceneEditor, type SceneTool } from "./SceneEditor";
import { ScenePanel } from "./ScenePanel";
import { StagePanel } from "./StagePanel";
import { draftFrom, draftModels, draftOptions, sameDraft, useStageDraft, withLook } from "./stageDraft";

/** The shop's StudioBridge listens for this source. */
const SOURCE = "estabrek-studio";
export type StageTab = "models" | "scene";

const num = (v: unknown, min: number, max: number, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback);
const vec = (v: unknown, min: number, max: number, fallback: number): [number, number, number] =>
  Array.isArray(v) ? [num(v[0], min, max, fallback), num(v[1], min, max, fallback), num(v[2], min, max, fallback)] : [fallback, fallback, fallback];
/** Typing somewhere: the keys belong to that field. */
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function StageWorkspace({
  theme,
  models,
  categories,
  saved,
  frame,
  origin,
  live,
  tab,
  setTab,
  onShowHome,
  onSaved,
  onDirty,
  defaults,
}: {
  theme: StoreThemeInfo;
  models: StageModelInfo[];
  /** The shop's camera and lights before the editor, and their ranges. */
  defaults: StageDefaults | null;
  categories: CatalogCategory[];
  saved: StageOptions;
  frame: RefObject<HTMLIFrameElement | null>;
  origin: string;
  /** The frame is the home's studio frame (it can draw the draft). */
  live: boolean;
  tab: StageTab;
  setTab: (t: StageTab) => void;
  onShowHome: () => void;
  onSaved: () => void;
  onDirty: (dirty: boolean) => void;
}) {
  const lang = adminLang();
  const api = useStageDraft(() => draftFrom(theme, saved, lang));
  const { draft, change, undo, redo } = api;
  const [base, setBase] = useState(() => draftFrom(theme, saved, lang));
  const dirty = !sameDraft(draft, base);
  const [saving, setSaving] = useState(false);
  const [index, setIndex] = useState(0);
  const [tool, setTool] = useState<SceneTool>({ mode: "translate", play: true, snap: false, lockScale: true, key: "start" });
  const [part, setPart] = useState<"model" | "stage">("model");
  const [preview, setPreview] = useState<number | null>(null);
  const [glbInfo, setGlbInfo] = useState<Record<number, GlbInfo>>({});
  const at = Math.max(0, Math.min(index, draft.models.length - 1));
  const editing = tab === "scene";
  // The handles move the path's end only for a model that has a path.
  const key = tool.key === "end" && draft.models[at]?.look.path ? "end" : "start";

  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const stay = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", stay);
    return () => window.removeEventListener("beforeunload", stay);
  }, [dirty]);

  // The frame draws the draft: sent on every change, once a frame at most.
  const ack = useRef(0);
  type Edit = { index: number; mode: SceneTool["mode"]; play: boolean; snap: boolean; key: SceneTool["key"]; preview: number | null };
  const latest = useRef({ draft, edit: null as null | Edit });
  latest.current = { draft, edit: editing ? { index: at, mode: tool.mode, play: tool.play, snap: tool.snap, key, preview } : null };
  const queued = useRef(0);
  const post = useCallback(() => {
    if (queued.current) return;
    queued.current = requestAnimationFrame(() => {
      queued.current = 0;
      const win = frame.current?.contentWindow;
      if (!win || !origin || !live) return;
      const { draft: d, edit } = latest.current;
      win.postMessage({ source: SOURCE, type: "stageScene", themeId: theme.id, models: draftModels(d), games: draftOptions(d).games, scene: d.scene, edit, ack: ack.current }, origin);
    });
  }, [frame, origin, live, theme.id]);
  useEffect(
    () => () => {
      cancelAnimationFrame(queued.current);
      queued.current = 0;
    },
    [],
  );
  useEffect(() => {
    post();
  }, [post, draft, editing, at, tool.mode, tool.play, tool.snap, key, preview]);

  useEffect(() => {
    if (!live) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || e.source !== frame.current?.contentWindow) return;
      const d = e.data as Record<string, unknown> | null;
      if (!d || d.source !== SOURCE) return;
      if (d.type === "ready" || d.type === "stageHello") {
        // A new page in the frame: its moves are numbered from the start again.
        ack.current = 0;
        post();
      } else if (d.type === "stagePick" && typeof d.index === "number") {
        setIndex(d.index);
      } else if (d.type === "stageTransform" && typeof d.index === "number") {
        const i = d.index;
        const pos = vec(d.pos, -6, 6, 0);
        const rot = vec(d.rot, -360, 360, 0);
        const scale = vec(d.scale, 0.1, 4, 1);
        const end = d.key === "end";
        ack.current = Math.max(ack.current, num(d.seq, 0, Number.MAX_SAFE_INTEGER, 0));
        change(
          (dr) =>
            i < dr.models.length
              ? withLook(dr, i, (l) => (end && l.path ? { ...l, path: { ...l.path, pos, rot, scale } } : { ...l, pos, rot, scale }))
              : dr,
          `handle:${i}:${end ? "end" : "start"}`,
          d.final === true,
        );
        post();
      } else if (d.type === "stageGlb" && typeof d.index === "number" && typeof d.url === "string") {
        const info: GlbInfo = { url: d.url, clips: Array.isArray(d.clips) ? d.clips.filter((c): c is string => typeof c === "string").slice(0, 50) : [], error: typeof d.error === "string" ? d.error : undefined };
        setGlbInfo((all) => ({ ...all, [d.index as number]: info }));
      } else if (d.type === "key") {
        if (d.action === "undo") undo();
        else if (d.action === "redo") redo();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [live, origin, frame, post, change, undo, redo]);

  // Ctrl+Z / Ctrl+Y (and Ctrl+Shift+Z) here too, outside the fields.
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || typing(e.target)) return;
      const k = e.key.toLowerCase();
      if (k !== "z" && k !== "y") return;
      e.preventDefault();
      if (k === "y" || e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [undo, redo]);

  const save = async () => {
    setSaving(true);
    try {
      await saveStageOptions(theme.id, draftOptions(draft));
      setBase(draft);
      toast.success(tr("انحفظ المشهد للمتجر", "The stage was saved to the store"));
      onSaved();
    } catch (e) {
      toast.error(tr("ما انحفظ المشهد", "The stage wasn't saved"), { description: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-30";
  return (
    <section className="space-y-3 rounded-2xl border border-white/[0.08] p-3" data-testid="stage-workspace">
      <div className="flex flex-wrap items-center gap-1">
        <div className="me-auto flex gap-1" role="tablist" aria-label={tr("المشهد", "The stage")}>
          {(["models", "scene"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-xs ${tab === t ? "bg-white/[0.14] text-white" : "text-white/60 hover:bg-white/[0.06]"}`} data-testid={`stage-tab-${t}`}>
              {t === "models" ? tr("الموديلات والألعاب", "Models and games") : tr("محرّر المشهد", "Scene editor")}
            </button>
          ))}
        </div>
        <button type="button" className={btn} disabled={!api.canUndo} onClick={undo} title="Ctrl+Z" data-testid="stage-undo">
          ↶ {tr("تراجع", "Undo")}
        </button>
        <button type="button" className={btn} disabled={!api.canRedo} onClick={redo} title="Ctrl+Y" data-testid="stage-redo">
          ↷ {tr("إعادة", "Redo")}
        </button>
      </div>

      {tab === "models" ? (
        <StagePanel theme={theme} models={models} categories={categories} api={api} />
      ) : (
        <>
          <div className="flex gap-1 rounded-lg bg-white/[0.03] p-1" role="group" aria-label={tr("بتعدّل على", "Editing")}>
            {(["model", "stage"] as const).map((x) => (
              <button key={x} type="button" aria-pressed={part === x} onClick={() => setPart(x)} className={`flex-1 rounded-md px-2 py-1 text-xs ${part === x ? "bg-white/[0.14] text-white" : "text-white/60 hover:bg-white/[0.06]"}`} data-testid={`scene-part-${x}`}>
                {x === "model" ? tr("موديل", "A model") : tr("المشهد كله", "The whole stage")}
              </button>
            ))}
          </div>
          {part === "model" ? (
            <SceneEditor theme={theme} models={models} api={api} index={at} setIndex={setIndex} tool={tool} setTool={setTool} live={live} onShowHome={onShowHome} preview={preview} setPreview={setPreview} glbInfo={glbInfo} />
          ) : (
            <ScenePanel theme={theme} api={api} defaults={defaults} />
          )}
        </>
      )}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-white/[0.06] bg-surface-950/90 pt-2 backdrop-blur">
        <span className={`me-auto text-[11px] ${dirty ? "text-amber-200" : "text-white/40"}`} data-testid="stage-dirty" data-dirty={dirty ? "1" : "0"}>
          {dirty ? tr("في تغييرات ما انحفظت", "Unsaved changes") : tr("كل شي محفوظ", "Everything is saved")}
        </span>
        <button type="button" className={btn} disabled={!dirty || saving} onClick={() => change(() => base)} data-testid="stage-discard">
          {tr("تجاهل التغييرات", "Discard changes")}
        </button>
        <button type="button" className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40" disabled={saving || !dirty} onClick={() => void save()} data-testid="stage-save">
          {tr("حفظ للمتجر", "Save to the store")}
        </button>
      </div>
    </section>
  );
}
