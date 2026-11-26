/**
 * «طلّع الغرض من الصورة»: the owner clicks the thing in the picture (a person, a product…), a small model on this
 * device cuts it out (lib/sam.ts, in the cut editor: free, no key), and the cut lies over the picture as its front
 * layer, exactly where it was (the shop lays it as the picture is: shared fit and focus). It can then come toward the
 * viewer on its own: as the pointer comes, or as the page scrolls through it (and the motion studio can move it as
 * any layer, its "after" piece).
 */
import { useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { CutoutEditor } from "../components/media/CutoutEditor";
import type { Layer, Layers } from "./keyframes";
import { Choice } from "./StudioTreePanels";
import { say } from "./say";

const box = "space-y-2.5 rounded-xl border border-white/8 p-3";
const btn = "rounded-lg bg-white/6 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-40";
const POPS = [
  ["hover", "لما يمرّ الماوس|When the pointer comes|כשהעכבר מגיע"],
  ["scroll", "مع السكرول|With the scroll|עם הגלילה"],
  ["still", "ثابت|Still|קבוע"],
] as const;

/** The layers with the front one set (or gone), nothing empty kept. */
export function withFront(layers: Layers | undefined, after: Layer | null): Layers | undefined {
  const next: Layers = { ...(layers ?? {}) };
  if (after) next.after = after;
  else delete next.after;
  return next.before || next.after ? next : undefined;
}

export function PopOutPanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: (label: string, ops: PageDraftOp[]) => void }) {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const layers = props.layers as Layers | undefined;
  const cut = layers?.after?.image ? layers.after : null;
  const src = typeof props.src === "string" ? props.src : "";
  const [open, setOpen] = useState(false);
  const label = say("طلّع الغرض من الصورة|Bring the thing out of the picture|הוצא את הפריט מהתמונה");
  const save = (after: Layer | null) => {
    const next = withFront(layers, after);
    const { layers: _old, ...rest } = props;
    onOps(label, [{ op: "setProps", nodeId: node.id, props: next ? { ...rest, layers: next } : rest }]);
  };
  // A colour layer in front of it would give way: say so.
  const replacesColour = Boolean(layers?.after && !layers.after.image);
  return (
    <div className={box} data-testid="studio-popout" data-on={cut ? "" : undefined}>
      <div className="text-xs font-medium text-white/70">✂️ {label}</div>
      <p className="text-[10px] leading-4 text-white/45">{say("كبسة على الغرض (شخص، منتج…) والذكاء على جهازك بيقصّه، وبيصير طبقة لحالها فوق الصورة بنفس مكانه: بتطلع لقدّام لما يمرّ الماوس أو مع السكرول، وفيك تحرّكها بستوديو الحركة. مجاني وبلا مفتاح.|Click the thing (a person, a product…) and AI on your device cuts it out; it becomes a layer of its own over the picture, right where it was: it comes forward when the pointer comes or with the scroll, and the motion studio can move it. Free, no key.|לחיצה על הפריט (אדם, מוצר…) וה־AI במכשיר שלך גוזר אותו; הוא הופך לשכבה משלו מעל התמונה, בדיוק במקומו: יוצא קדימה כשהעכבר מגיע או עם הגלילה, ואפשר להזיז אותו בסטודיו התנועה. חינם, בלי מפתח.")}</p>
      {cut ? (
        <div className="flex items-center gap-2">
          <img src={cut.image} alt="" className="h-12 w-12 rounded-md bg-[conic-gradient(#ffffff22_25%,#0000_0_50%,#ffffff22_0_75%,#0000_0)] bg-size-[10px_10px] object-contain" data-testid="studio-popout-cut" />
          <span className="text-[11px] text-white/55">{say("الغرض المقصوص (طبقة قدّام)|The cut thing (a front layer)|הפריט הגזור (שכבה קדמית)")}</span>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={btn} disabled={busy || !src} onClick={() => setOpen(true)} data-testid="studio-popout-cut-start">
          ✂️ {cut ? say("قصّ من جديد|Cut it again|גזור מחדש") : say("اختار الغرض بكبسة|Pick the thing with a click|בחר את הפריט בלחיצה")}
        </button>
        {cut ? <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => save(null)} data-testid="studio-popout-remove">{say("شيل الطبقة|Remove the layer|הסר את השכבה")}</button> : null}
      </div>
      {replacesColour && !cut ? <p className="text-[10px] leading-4 text-amber-200/70">{say("الطبقة القدّامية الملوّنة اللي عليها بتتبدّل بالغرض.|Its coloured front layer gives way to the thing.|השכבה הקדמית הצבעונית שלה תוחלף בפריט.")}</p> : null}
      {cut ? (
        <Choice
          label={say("كيف بيطلع لقدّام|How it comes forward|איך הוא יוצא קדימה")}
          value={cut.pop ?? "still"}
          busy={busy}
          options={POPS.map(([k, n]) => [k, say(n)])}
          onPick={(v) => save({ ...cut, pop: v === "still" ? undefined : (v as "hover" | "scroll") })}
          testId="studio-popout-pop"
        />
      ) : null}
      <CutoutEditor
        open={open}
        target={src ? { url: src, name: "cut" } : null}
        startWith="pick"
        transparentOnly
        title={label}
        onClose={() => setOpen(false)}
        onSaved={(picture) => save({ image: picture.url, front: true, pop: cut?.pop ?? "hover" })}
      />
    </div>
  );
}
