/**
 * A picture's edit in focus mode (docs/cms-big-engine-plan.ar.md A3): crop to a ratio (zoomed and moved), turn,
 * mirror, ready filters, light, contrast, colour, warmth, sharpness, black and white. Every change shows at once in
 * the frame (CSS, shared/imageEdit.ts recipeCss); "Apply" makes the real picture from the original on the server
 * (POST /admin/uploads/edit) and the page shows that copy, so no shopper's phone does the work. The original stays:
 * the edit is changed again from it, or undone.
 */
import { useEffect, useRef, useState } from "react";
import type { PageTreeNode } from "../../api/pages.api";
import { FILTERS, FILTER_RECIPE, RATIOS, cropFor, isPlain, recipeCss, safeRecipe, type Filter, type Recipe } from "../../../../shared/imageEdit";
import { Range } from "../LookPanels";
import { say } from "../say";

const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] hover:bg-white/[0.1] disabled:opacity-40";
const chip = (on: boolean) => `rounded-lg px-2 py-1 text-[11px] ${on ? "bg-accent-500/30 text-white" : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1]"}`;
const FILTER_WORD: Record<Filter, string> = {
  none: "بدون|None|ללא", warm: "دافئ|Warm|חם", cool: "بارد|Cool|קר", mono: "أبيض وأسود|Black & white|שחור־לבן",
  soft: "ناعم|Soft|רך", vivid: "حيوي|Vivid|עז", vintage: "قديم|Vintage|וינטג׳",
};
type Crop = { ratio: string; zoom: number; x: number; y: number };

export function ImageEditPanel({ node, aspect, busy, onPreview, onApply, onUndo }: {
  node: PageTreeNode;
  /** The original picture's width / height (from the frame), for the crop's ratio. */
  aspect: number | null;
  busy: boolean;
  onPreview: (css: { filter: string; transform: string; viewBox: string }) => void;
  /** Make the real picture; resolves with an error to show, or null when done. */
  onApply: (recipe: Recipe) => Promise<string | null>;
  onUndo: () => void;
}) {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const saved = (props.edit as { from: string; recipe: Recipe } | undefined) ?? null;
  const [recipe, setRecipe] = useState<Recipe>(() => safeRecipe(saved?.recipe));
  const [crop, setCrop] = useState<Crop>({ ratio: "free", zoom: 1, x: 0.5, y: 0.5 });
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const first = useRef(true);
  // What the picture looks like now, shown in the frame (and taken off when the panel closes).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onPreview(recipeCss(recipe));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(recipe)]);
  useEffect(() => () => onPreview({ filter: "", transform: "", viewBox: "" }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const turnedAspect = aspect ? (recipe.rotate === 90 || recipe.rotate === 270 ? 1 / aspect : aspect) : null;
  const setCropFrom = (c: Crop, rotate = recipe.rotate) => {
    setCrop(c);
    const ratio = RATIOS.find(([k]) => k === c.ratio)?.[1] ?? null;
    const a = aspect ? (rotate === 90 || rotate === 270 ? 1 / aspect : aspect) : 1;
    const box = !ratio && c.zoom === 1 ? undefined : cropFor(ratio, c.zoom, { x: c.x, y: c.y }, a);
    setRecipe((r) => ({ ...r, rotate, crop: box }));
  };
  const set = (patch: Partial<Recipe>) => setRecipe((r) => ({ ...r, ...patch }));
  const changed = JSON.stringify(safeRecipe(recipe)) !== JSON.stringify(safeRecipe(saved?.recipe));
  // The ready filter the values match (an unset value counts as 0, or off).
  const filterOn = FILTERS.find((f) => f !== "none" && Object.entries(FILTER_RECIPE[f]).every(([k, v]) => ((recipe as Record<string, unknown>)[k] ?? (typeof v === "boolean" ? false : 0)) === v)) ?? null;

  return (
    <div className="space-y-3 rounded-xl border border-accent-400/30 p-3" data-testid="studio-image-edit" data-edited={saved ? "1" : undefined}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/80">{say("تعديل الصورة|Edit the picture|עריכת התמונה")}{saved ? ` · ${say("معدّلة|edited|נערכה")}` : ""}</div>
        {saved ? <button type="button" className={btn} disabled={busy || working} onClick={onUndo} data-testid="studio-image-undo">{say("رجّعها للأصل|Back to the original|חזרה למקור")}</button> : null}
      </div>

      <div className="space-y-2">
        <div className="text-[11px] text-white/55">{say("القص|Crop|חיתוך")}</div>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={say("نسبة القص|Crop ratio|יחס חיתוך")}>
          {RATIOS.map(([k]) => (
            <button key={k} type="button" role="radio" aria-checked={crop.ratio === k} className={chip(crop.ratio === k)} disabled={busy || working || (!turnedAspect && k !== "free")} onClick={() => setCropFrom({ ...crop, ratio: k })} data-testid="studio-image-ratio" data-ratio={k}>
              {k === "free" ? say("كاملة|Whole|שלמה") : k}
            </button>
          ))}
        </div>
        <Range label={say("تكبير|Zoom|זום")} min={1} max={4} step={0.05} busy={busy || working} value={crop.zoom} onSave={(v) => setCropFrom({ ...crop, zoom: v })} testId="studio-image-zoom" />
        {recipe.crop ? (
          <>
            <Range label={say("المكان أفقي|Across|אופקי")} min={0} max={1} step={0.01} busy={busy || working} value={crop.x} onSave={(v) => setCropFrom({ ...crop, x: v })} testId="studio-image-x" />
            <Range label={say("المكان عامودي|Up and down|אנכי")} min={0} max={1} step={0.01} busy={busy || working} value={crop.y} onSave={(v) => setCropFrom({ ...crop, y: v })} testId="studio-image-y" />
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1">
        <button type="button" className={btn} disabled={busy || working} onClick={() => setCropFrom(crop, (((recipe.rotate ?? 0) + 270) % 360) as Recipe["rotate"])} data-testid="studio-image-left">↺ {say("لف شمال|Turn left|סיבוב שמאלה")}</button>
        <button type="button" className={btn} disabled={busy || working} onClick={() => setCropFrom(crop, (((recipe.rotate ?? 0) + 90) % 360) as Recipe["rotate"])} data-testid="studio-image-right">↻ {say("لف يمين|Turn right|סיבוב ימינה")}</button>
        <button type="button" className={chip(recipe.flipX === true)} disabled={busy || working} onClick={() => set({ flipX: !recipe.flipX || undefined })} data-testid="studio-image-flipx">⇋ {say("مراية|Mirror|מראה")}</button>
        <button type="button" className={chip(recipe.flipY === true)} disabled={busy || working} onClick={() => set({ flipY: !recipe.flipY || undefined })} data-testid="studio-image-flipy">⇵ {say("قلب|Flip|הפוך")}</button>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] text-white/55">{say("فلاتر جاهزة|Ready filters|פילטרים מוכנים")}</div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button key={f} type="button" className={chip(f === "none" ? !filterOn && isPlain({ ...recipe, crop: undefined, rotate: undefined, flipX: undefined, flipY: undefined }) : filterOn === f)} disabled={busy || working} onClick={() => set(FILTER_RECIPE[f])} data-testid="studio-image-filter" data-filter={f}>
              {say(FILTER_WORD[f])}
            </button>
          ))}
        </div>
        <Range label={say("الإضاءة|Light|תאורה")} min={-1} max={1} step={0.05} busy={busy || working} value={recipe.light ?? 0} onSave={(v) => set({ light: v })} testId="studio-image-light" />
        <Range label={say("التباين|Contrast|ניגודיות")} min={-1} max={1} step={0.05} busy={busy || working} value={recipe.contrast ?? 0} onSave={(v) => set({ contrast: v })} testId="studio-image-contrast" />
        <Range label={say("الألوان|Colour|צבעוניות")} min={-1} max={1} step={0.05} busy={busy || working || recipe.mono === true} value={recipe.saturate ?? 0} onSave={(v) => set({ saturate: v })} testId="studio-image-saturate" />
        <Range label={say("الدفا|Warmth|חמימות")} min={-1} max={1} step={0.05} busy={busy || working || recipe.mono === true} value={recipe.warmth ?? 0} onSave={(v) => set({ warmth: v })} testId="studio-image-warmth" />
        <Range label={say("الحدّة|Sharpness|חדות")} min={0} max={1} step={0.05} busy={busy || working} value={recipe.sharpen ?? 0} onSave={(v) => set({ sharpen: v })} testId="studio-image-sharpen" />
        <label className="flex items-center gap-2 text-[11px] text-white/60">
          <input type="checkbox" checked={recipe.mono === true} disabled={busy || working} onChange={(e) => set({ mono: e.target.checked || undefined })} data-testid="studio-image-mono" />
          {say("أبيض وأسود|Black and white|שחור־לבן")}
        </label>
      </div>

      <div className="flex gap-1">
        <button
          type="button" className="flex-1 rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          disabled={busy || working || !changed || isPlain(recipe)}
          onClick={async () => {
            setWorking(true);
            setNote(null);
            const problem = await onApply(safeRecipe(recipe));
            setWorking(false);
            setNote(problem ?? say("انعملت النسخة المعدّلة، والأصل محفوظ.|The edited copy is made; the original is kept.|העותק הערוך נוצר; המקור נשמר."));
          }}
          data-testid="studio-image-apply"
        >
          {working ? say("عم نعملها…|Making it…|יוצרים…") : say("طبّق على الصورة|Apply to the picture|החל על התמונה")}
        </button>
        <button type="button" className={btn} disabled={busy || working || !changed} onClick={() => { setRecipe(safeRecipe(saved?.recipe)); setCrop({ ratio: "free", zoom: 1, x: 0.5, y: 0.5 }); }} data-testid="studio-image-reset">{say("إلغاء|Cancel|ביטול")}</button>
      </div>
      {note ? <p className="text-[11px] leading-5 text-white/60" data-testid="studio-image-note">{note}</p> : null}
      <p className="text-[10px] leading-4 text-white/35">{say("بتشوف التعديل فوراً؛ «طبّق» بيعمل نسخة جاهزة بمكتبة الوسائط، فالزبون بياخد صورة جاهزة.|You see the edit at once; «Apply» makes a ready copy in the media library, so shoppers get a finished picture.|רואים את העריכה מיד; «החל» יוצר עותק מוכן.")}</p>
    </div>
  );
}
