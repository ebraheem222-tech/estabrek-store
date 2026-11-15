/**
 * A picture's live effect (shared/pictureFx.ts; the shop draws it with WebGL: pageTree/pictureFxRun.ts): which
 * one, how strong, and a try on the page (the editor's own pointer never reaches the page, so the effect is
 * played there by itself once).
 */
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { PICTURE_FX, PICTURE_FX_STRENGTH, pictureFxOf, pictureFxOnPointer, type PictureFxKind } from "../../../shared/pictureFx";
import { Range } from "./LookPanels";
import { say } from "./say";

const box = "space-y-2.5 rounded-xl border border-white/[0.08] p-3";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
const control = "w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";

export const PICTURE_FX_NAMES: Record<PictureFxKind, string> = {
  ripple: "تموّج مي (لما يمرّ الزبون عليها)|Water ripple (when the shopper is on it)|אדוות מים (כשהקונה עליה)",
  liquid: "سائل (لما يمرّ عليها)|Liquid (when the shopper is on it)|נוזלי (כשהקונה עליה)",
  shift: "انفصال ألوان (لما يمرّ عليها)|Colour split (when the shopper is on it)|פיצול צבעים (כשהקונה עליה)",
  reveal: "كشف ناعم (لما تبيّن بالسكرول)|Soft reveal (when it scrolls into view)|חשיפה רכה (כשהיא נגללת לתצוגה)",
};
const HINTS: Record<PictureFxKind, string> = {
  ripple: "حلقات مي بتطلع من مكان الماوس أو الإصبع وبتنتشر على الصورة.|Rings of water spread over the picture from where the pointer or the finger is.|טבעות מים מתפשטות על התמונה מהמקום של הסמן או האצבע.",
  liquid: "الصورة بتتماوج بهدوء طول ما الماوس عليها، وبترجع لما يروح.|The picture flows gently while the pointer is on it, and settles when it leaves.|התמונה זורמת בעדינות כל עוד הסמן עליה.",
  shift: "الأحمر والأزرق بيبعدوا عن بعض حوالين الماوس، متل عدسة.|Its red and blue slide apart round the pointer, like a lens.|האדום והכחול מתרחקים סביב הסמן, כמו עדשה.",
  reveal: "الصورة بتطلع من حبيبات ناعمة أول مرة بتبيّن بالسكرول. صورة ظاهرة من أول ما تفتح الصفحة بتضل متل ما هي.|The picture comes out of a soft grain the first time it scrolls into view. One that is on the screen as the page opens stays as it is.|התמונה יוצאת מגרעין רך בפעם הראשונה שהיא נגללת לתצוגה.",
};

export function PictureFxPanel({ node, busy, onOps, onTry }: { node: PageTreeNode; busy: boolean; onOps: (label: string, ops: PageDraftOp[]) => void; onTry: () => void }) {
  const props = (node.props ?? {}) as Record<string, unknown>;
  // A slider's pictures take the kinds that answer the pointer (a slide comes and goes by the slider's own motion).
  const slider = node.type === "slider";
  const kinds: readonly PictureFxKind[] = slider ? PICTURE_FX.filter(pictureFxOnPointer) : PICTURE_FX;
  const read = pictureFxOf(props.glfx);
  const fx = read && kinds.includes(read.kind) ? read : null;
  const label = slider ? say("تأثير حيّ على صور السلايدر|A live effect on the slider's pictures|אפקט חי על תמונות הסליידר") : say("تأثير حيّ على الصورة|A live effect on the picture|אפקט חי על התמונה");
  const save = (next: { kind: PictureFxKind; strength?: number } | null) => onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...props, glfx: next ?? undefined } }]);
  return (
    <div className={box} data-testid="studio-picture-fx" data-kind={fx?.kind ?? ""}>
      <div className="text-xs font-medium text-white/70">🌊 {label}</div>
      <select
        className={control} disabled={busy} value={fx?.kind ?? ""} aria-label={label} data-testid="studio-picture-fx-kind"
        onChange={(e) => save(e.target.value ? { kind: e.target.value as PictureFxKind, ...(fx?.strength !== undefined ? { strength: fx.strength } : {}) } : null)}
      >
        <option value="">{say("— بدون —|— none —|— ללא —")}</option>
        {kinds.map((k) => <option key={k} value={k}>{say(PICTURE_FX_NAMES[k])}</option>)}
      </select>
      {fx ? (
        <>
          <p className="text-[11px] leading-5 text-white/55" data-testid="studio-picture-fx-hint">{say(HINTS[fx.kind])}</p>
          <Range
            label={say("قوّته|Its strength|העוצמה")} min={PICTURE_FX_STRENGTH.min * 100} max={PICTURE_FX_STRENGTH.max * 100} step={5} unit="%" busy={busy}
            value={Math.round((fx.strength ?? PICTURE_FX_STRENGTH.normal) * 100)} onSave={(v) => save({ kind: fx.kind, strength: Math.round(v) / 100 })} testId="studio-picture-fx-strength"
          />
          <button type="button" className={btn} disabled={busy} onClick={onTry} data-testid="studio-picture-fx-try">
            ▶ {pictureFxOnPointer(fx.kind) ? say("جرّبه بالصفحة (الماوس بيمرّ لحاله)|Try it on the page (the pointer crosses by itself)|נסה בדף (הסמן עובר לבד)") : say("جرّبه بالصفحة|Try it on the page|נסה בדף")}
          </button>
          <p className="text-[10px] leading-4 text-white/35">{say("بيرسمه كرت الشاشة (WebGL) بالمتجر. الصورة بتضل متل ما هي للي طالب حركة أقل بجهازه، ولمتصفح ما بيدعمه، ولصورة من موقع ما بيسمح نقرا ألوانها.|The graphics card draws it (WebGL) in the shop. The picture stays as it is for whoever asked for less motion, in a browser that can't do it, and for a picture from a place that doesn't let its pixels be read.|כרטיס המסך מצייר אותו (WebGL) בחנות. התמונה נשארת כמו שהיא למי שביקש פחות תנועה.")}</p>
        </>
      ) : null}
    </div>
  );
}
