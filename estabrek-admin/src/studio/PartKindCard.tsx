/**
 * What a selected inner object is (a word, a button, a picture, a clip or a box inside a
 * widget or an old section), where it lives, and what can be changed here. Shown first, so
 * the panel always names the selected object before its settings.
 */
import { tr } from "../lib/words";

export type PartKind = "text" | "button" | "image" | "video" | "box";

const KIND: Record<PartKind, { mark: string; name: () => string; can: () => string }> = {
  text: { mark: "T", name: () => tr("نص", "Text"), can: () => tr("الخط، الحجم، السماكة، اللون، المحاذاة والمسافات", "Font, size, weight, colour, alignment and spacing") },
  button: { mark: "⬭", name: () => tr("زر أو رابط", "Button or link"), can: () => tr("لون الزر، الإطار، الزوايا، خط الكلام وحالة مرور الماوس", "Button colour, border, corners, its words and its hover state") },
  image: { mark: "▣", name: () => tr("صورة", "Picture"), can: () => tr("القص والملء، الزوايا، الإطار، الفلاتر والظل", "Crop and fill, corners, frame, filters and shadow") },
  video: { mark: "▶", name: () => tr("فيديو", "Video"), can: () => tr("القص والملء، الزوايا، الإطار والفلاتر", "Crop and fill, corners, frame and filters") },
  box: { mark: "▢", name: () => tr("صندوق (حاوية)", "Box (container)"), can: () => tr("الخلفية، الإطار، الزوايا، الظل والمسافات الداخلية", "Background, border, corners, shadow and inner spacing") },
};

export function PartKindCard({ kind, preview, owner, live, count, onOwner }: {
  kind: PartKind;
  /** Its words or name as seen on the page (cut short). */
  preview?: string;
  /** The element it belongs to ("Countdown"). */
  owner?: string;
  /** A value the widget works out by itself (a countdown's number): its look changes here, its value in the owner. */
  live?: boolean;
  /** How many alike share this look inside the owner. */
  count: number;
  onOwner?: () => void;
}) {
  const k = KIND[kind];
  const words = preview?.replace(/\s+/g, " ").trim().slice(0, 40);
  return (
    <div className="space-y-2 rounded-xl border border-accent-400/30 bg-accent-500/[0.06] p-3" data-testid="studio-part-kind" data-kind={kind}>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-500/25 text-sm font-semibold text-white" aria-hidden="true">{k.mark}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white" data-testid="studio-part-kind-name">{k.name()}{live ? <span className="ms-1.5 rounded bg-white/10 px-1 py-px text-[10px] font-normal text-white/70">{tr("قيمة حيّة", "Live value")}</span> : null}</div>
          {words ? <div className="truncate text-[11px] text-white/55">«{words}»</div> : null}
        </div>
      </div>
      {owner ? <p className="text-[11px] leading-5 text-white/60">{tr("جزء داخل", "Inside")} <span className="text-white/85">{owner}</span>{count > 1 ? <> · {tr(`يتكرر ${count} مرات، والتعديل على كل النسخ`, "Repeats {0} times; changes apply to all of them", [count])}</> : null}</p> : null}
      <p className="text-[11px] leading-5 text-white/50"><span className="text-white/70">{tr("بتقدر تغيّر هون:", "You can change here:")}</span> {k.can()}</p>
      {onOwner ? <button type="button" className="text-xs text-accent-200 underline" data-testid="studio-part-owner" onClick={onOwner}>{tr("إعدادات العنصر الأصلي", "Owner settings")}</button> : null}
    </div>
  );
}
