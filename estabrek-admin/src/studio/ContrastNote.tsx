/**
 * How well an element's words read on what is behind them (the element's settings, beside its text colour). The
 * shop says the two colours as it draws them (pageTree/studioInk.ts); the maths is shared/colour.ts: the WCAG
 * contrast, what the words need at their size, and the nearest colour of the same hue that would read.
 */
import { contrast, neededContrast, readableColour } from "../../../shared/colour";
import { say } from "./say";

/** What the shop says of an element's words: their colour over their ground, or why there is nothing to judge. */
export type InkReading = { color: string; ground: string; size: number; bold: boolean } | { unknown: "picture" | "colour" };

/** The verdict on a reading: the contrast to one decimal, what the words need, whether they have it, and a colour that would. */
export function contrastVerdict(ink: InkReading | null): { ratio: number; need: number; ok: boolean; better: string | null } | null {
  if (!ink || "unknown" in ink) return null;
  const ratio = contrast(ink.color, ink.ground);
  if (ratio === null) return null;
  const need = neededContrast(ink.size, ink.bold);
  const ok = ratio >= need;
  const better = ok ? null : readableColour(ink.color, ink.ground, need);
  return { ratio: Math.round(ratio * 10) / 10, need, ok, better };
}

export function ContrastNote({ ink, busy, onFix }: { ink: InkReading | null; busy: boolean; onFix?: (hex: string) => void }) {
  if (!ink) return null;
  if ("unknown" in ink) {
    if (ink.unknown !== "picture") return null;
    return <p className="rounded-lg border border-white/[0.06] px-2 py-1 text-[11px] leading-5 text-white/45" data-testid="studio-contrast" data-ok="unknown">{say("الكلام فوق صورة أو تدرّج ألوان: تأكد بعينك إنو بينقرأ.|The words are over a picture or a gradient: check by eye that they read.|המילים מעל תמונה או מעבר צבעים: בדוק בעין שהן קריאות.")}</p>;
  }
  const v = contrastVerdict(ink);
  if (!v) return null;
  const swatch = (color: string) => <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: ink.ground, color }} aria-hidden>Aa</span>;
  if (v.ok) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-white/[0.06] px-2 py-1 text-[11px] leading-5 text-white/55" data-testid="studio-contrast" data-ok="1" data-ratio={v.ratio}>
        {swatch(ink.color)}
        <span>{say("الكلام بينقرأ منيح على خلفيته|The words read well on their background|המילים קריאות היטב על הרקע")} <span dir="ltr">({v.ratio.toFixed(1)})</span></span>
      </p>
    );
  }
  // Big or bold words may read at a lower contrast: said, so the lower number isn't a surprise.
  const big = v.need === 3 ? say(" (خط كبير)| (big text)| (טקסט גדול)") : "";
  return (
    <div className="space-y-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2 py-1.5 text-[11px] leading-5 text-amber-100" role="status" data-testid="studio-contrast" data-ok="0" data-ratio={v.ratio}>
      <div className="flex items-center gap-2">
        {swatch(ink.color)}
        <span>{say(`الكلام بينقرأ بصعوبة على خلفيته: التباين ${v.ratio.toFixed(1)}، ولازم ${v.need} على الأقل${big}.|The words are hard to read on their background: the contrast is ${v.ratio.toFixed(1)}, and they need at least ${v.need}${big}.|המילים קשות לקריאה על הרקע: הניגודיות ${v.ratio.toFixed(1)}, והן צריכות לפחות ${v.need}${big}.`)}</span>
      </div>
      {v.better && onFix ? (
        <button type="button" className="flex items-center gap-2 rounded-md bg-white/15 px-2 py-1 text-white hover:bg-white/25 disabled:opacity-40" disabled={busy} onClick={() => onFix(v.better!)} data-testid="studio-contrast-fix" data-colour={v.better}>
          {swatch(v.better)}
          {say("خلّيه ينقرأ (أقرب لون من نفس النوع)|Make it readable (the nearest colour of the same hue)|הפוך לקריא (הצבע הקרוב ביותר מאותו גוון)")}
        </button>
      ) : null}
    </div>
  );
}
