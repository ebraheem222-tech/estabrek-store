/**
 * A section's trail of pictures (the theme library's "Cursor Image Trail", the shop's PointerParts.tsx): up to eight
 * pictures left along the pointer's way over the section, each popping in and fading; and their size.
 */
import { useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { MediaLibraryModal } from "../components/media/MediaLibraryModal";
import { Range } from "./LookPanels";
import { say } from "./say";

const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";

export function TrailPanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: (label: string, ops: PageDraftOp[]) => void }) {
  const [library, setLibrary] = useState(false);
  const raw = node.props?.trail;
  const trail = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as { images?: unknown; size?: unknown }) : null;
  const images = Array.isArray(trail?.images) ? (trail!.images as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const size = typeof trail?.size === "number" ? trail.size : 140;
  const label = say("صور بتلحق الماوس|Pictures following the pointer|תמונות שעוקבות אחרי העכבר");
  const save = (next: string[], nextSize = size) =>
    onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...node.props, trail: next.length ? { images: next, ...(nextSize !== 140 ? { size: nextSize } : {}) } : undefined } }]);
  return (
    <div className="space-y-2 rounded-xl border border-white/[0.08] p-3" data-testid="studio-trail">
      <div className="text-xs font-medium text-white/70">{label}</div>
      <p className="text-[10px] leading-4 text-white/40">{say("لما الماوس يمرق فوق القسم بتطلع صور ورا بعض وبتختفي. لحد 8 صور.|As the pointer crosses the section, pictures pop up along its way and fade. Up to 8.|כשהעכבר עובר מעל המקטע צצות תמונות לאורך הדרך ונעלמות. עד 8.")}</p>
      {images.length ? (
        <div className="grid grid-cols-4 gap-1">
          {images.map((src, i) => (
            <button key={`${src}-${i}`} type="button" disabled={busy} title={say("شيلها|Remove it|הסרה")} onClick={() => save(images.filter((_, k) => k !== i))} className="relative overflow-hidden rounded-md border border-white/10" data-testid="studio-trail-image">
              <img src={src} alt="" className="aspect-[4/5] w-full object-cover" />
              <span className="absolute end-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px] text-white">✕</span>
            </button>
          ))}
        </div>
      ) : null}
      {images.length < 8 ? (
        <button type="button" className={btn} disabled={busy} onClick={() => setLibrary(true)} data-testid="studio-trail-add">
          + {say("أضف صورة|Add a picture|הוספת תמונה")}
        </button>
      ) : null}
      {images.length ? <Range label={say("حجم الصور|The pictures' size|גודל התמונות")} value={size} min={80} max={280} step={10} unit="px" busy={busy} onSave={(v) => save(images, v)} testId="studio-trail-size" /> : null}
      <MediaLibraryModal open={library} onClose={() => setLibrary(false)} title={label} onSelect={(u) => { setLibrary(false); save([...images, u].slice(0, 8)); }} />
    </div>
  );
}
