/**
 * «شوفها على حيطك» in the product composer (shared/wallArt.ts): a piece that hangs on a wall (a painting, a print, a
 * mirror, a clock) with its real size and frame. The shop's product page then shows it at its size in a drawn room
 * and on the shopper's own wall through the camera. Sizes whose names say a size («50×70») use their own.
 */
import { FRAME_LOOK, WALL_CM, WALL_FRAMES, sizeFromName, type WallFrame } from "../../../../../shared/wallArt";
import { say } from "../../../studio/say";
import type { ComposerDraft } from "./composerModel";
import { fieldCls } from "./styles";
import { Section, Toggle } from "./ui";

const FRAME_NAMES: Record<WallFrame, string> = {
  none: "بلا برواز (طباعة على كانفاس)|No frame (a canvas print)|ללא מסגרת (הדפסה על קנבס)",
  black: "برواز أسود|Black frame|מסגרת שחורה",
  white: "برواز أبيض|White frame|מסגרת לבנה",
  wood: "برواز خشب|Wooden frame|מסגרת עץ",
  gold: "برواز دهبي|Gold frame|מסגרת זהב",
};

export function WallBlock({ draft, update, step, sizeNames }: { draft: ComposerDraft; update: (fn: (d: ComposerDraft) => ComposerDraft) => void; step: number; sizeNames: string[] }) {
  const wall = draft.wall ?? { on: false, w: "", h: "", frame: "none" };
  const frame: WallFrame = (WALL_FRAMES as readonly string[]).includes(wall.frame) ? (wall.frame as WallFrame) : "none";
  const set = (patch: Partial<NonNullable<ComposerDraft["wall"]>>) => update((d) => ({ ...d, wall: { ...(d.wall ?? wall), ...patch } }));
  const own = sizeNames.filter((n) => sizeFromName(n));
  const bad = (v: string) => v !== "" && !(Number(v) >= WALL_CM.min && Number(v) <= WALL_CM.max);
  return (
    <Section
      id="wall"
      step={step}
      title={say("شوفها على حيطك|On your wall|על הקיר שלך")}
      hint={say("للّوحات والبوسترات والمرايات والساعات: الزبون بيشوفها بقياسها الحقيقي بغرفة، وعلى حيطه بكاميرا موبايله.|For paintings, posters, mirrors and clocks: shoppers see it at its real size in a room, and on their own wall through their phone's camera.|לציורים, פוסטרים, מראות ושעונים: הקונים רואים אותם בגודל האמיתי בחדר, ועל הקיר שלהם דרך מצלמת הטלפון.")}
    >
      <div data-testid="composer-wall">
        <Toggle checked={wall.on} onChange={(on) => set(on ? { on, w: wall.w || "50", h: wall.h || "70" } : { on })} label={say("بتتعلّق على الحيط|Hangs on a wall|נתלה על הקיר")} />
        {wall.on ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block text-xs text-white/60">
              {say("العرض (سم)|Width (cm)|רוחב (ס״מ)")}
              <input className={fieldCls} inputMode="decimal" value={wall.w} onChange={(e) => set({ w: e.target.value.replace(/[^\d.]/g, "") })} data-testid="composer-wall-w" aria-invalid={bad(wall.w) || undefined} />
            </label>
            <label className="block text-xs text-white/60">
              {say("الطول (سم)|Height (cm)|גובה (ס״מ)")}
              <input className={fieldCls} inputMode="decimal" value={wall.h} onChange={(e) => set({ h: e.target.value.replace(/[^\d.]/g, "") })} data-testid="composer-wall-h" aria-invalid={bad(wall.h) || undefined} />
            </label>
            <label className="block text-xs text-white/60">
              {say("البرواز|Frame|מסגרת")}
              <select className={fieldCls} value={frame} onChange={(e) => set({ frame: e.target.value as WallFrame })} data-testid="composer-wall-frame">
                {WALL_FRAMES.map((f) => <option key={f} value={f}>{say(FRAME_NAMES[f])}</option>)}
              </select>
            </label>
            {bad(wall.w) || bad(wall.h) ? <p role="alert" className="text-xs text-red-400 sm:col-span-3">{say(`القياس لازم يكون بين ${WALL_CM.min} و${WALL_CM.max} سم.|The size must be between ${WALL_CM.min} and ${WALL_CM.max} cm.|המידה צריכה להיות בין ${WALL_CM.min} ל־${WALL_CM.max} ס״מ.`)}</p> : null}
            <p className="text-xs leading-5 text-white/45 sm:col-span-3" data-testid="composer-wall-sizes">
              {own.length
                ? say(`المقاسات اللي اسمها فيه قياس (${own.join("، ")}) بتنعرض بقياسها، والباقي بهالقياس.|Sizes whose names say a size (${own.join(", ")}) show at that size; the rest at this one.|מידות ששמן אומר מידה (${own.join(", ")}) מוצגות בגודל הזה; השאר בגודל הזה.`)
                : say("نصيحة: إذا سمّيت المقاسات بقياسها (50×70، 70×100، A3)، كل مقاس بينعرض بقياسه.|Tip: name the sizes by their size (50×70, 70×100, A3) and each shows at its own size.|טיפ: אם המידות נקראות לפי הגודל (50×70, 70×100, A3), כל אחת מוצגת בגודל שלה.")}
              {frame !== "none" ? say(` البرواز بيزيد ${FRAME_LOOK[frame].cm} سم من كل جهة.| The frame adds ${FRAME_LOOK[frame].cm} cm on each side.| המסגרת מוסיפה ${FRAME_LOOK[frame].cm} ס״מ מכל צד.`) : null}
            </p>
          </div>
        ) : null}
      </div>
    </Section>
  );
}
