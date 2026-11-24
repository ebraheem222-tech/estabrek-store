/**
 * A picture's own colours, read from its pixels (shared/pictureSense.ts, in the shop's frame): shown as swatches
 * with each one's share of the picture, with what a page can make of them (a ground, ink that reads on it, an
 * accent). From here they become colour variables, or dress the part of the page the picture is in: in its ground
 * and ink, or with a soft backdrop of its colours that drifts (the shop's mesh).
 */
import type { PictureColour, PictureRoles } from "../../../shared/pictureSense";
import { say } from "./say";

export type PictureLook = { nodeId: string; colours: PictureColour[]; roles: PictureRoles | null };
const btn = "rounded-lg bg-white/6 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-40";

export function PictureColoursCard({ look, busy, room, partName, onAdd, onDress, onBackdrop, onClose }: {
  look: PictureLook;
  busy: boolean;
  /** How many of these colours would be new variables (0: they are all there, or there is no room). */
  room: number;
  /** The part of the page the picture is in (none: nothing to dress). */
  partName?: string;
  onAdd: () => void;
  onDress: () => void;
  /** The part gets a soft backdrop of the picture's colours that drifts (none when the picture has too few). */
  onBackdrop?: () => void;
  onClose: () => void;
}) {
  const { colours, roles } = look;
  return (
    <div className="space-y-2 rounded-xl border border-white/8 p-2" data-testid="studio-picture-colours">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/80">{say("ألوان الصورة|The picture's colours|צבעי התמונה")}</div>
        <button type="button" className="px-1 text-white/50 hover:text-white" aria-label={say("سكّر|Close|סגור")} onClick={onClose} data-testid="studio-picture-close">×</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {colours.map((c) => (
          <span key={c.hex} className="inline-flex items-center gap-1 rounded-md border border-white/8 px-1 py-0.5 text-[10px] text-white/70" title={`${Math.round(c.share * 100)}%`} data-testid="studio-picture-colour" data-hex={c.hex}>
            <span className="h-4 w-4 rounded-sm border border-black/10" style={{ background: c.hex }} aria-hidden="true" />
            <span dir="ltr">{c.hex}</span>
            <span className="text-white/40" dir="ltr">{Math.round(c.share * 100)}%</span>
          </span>
        ))}
      </div>
      {roles ? (
        <div className="flex items-center gap-2 rounded-lg border border-black/10 px-2 py-1.5 text-xs" style={{ background: roles.ground, color: roles.ink }} data-testid="studio-picture-roles" data-ground={roles.ground} data-ink={roles.ink} data-accent={roles.accent}>
          <span className="font-semibold">{say("أرضية وكلام|Ground and words|רקע ומילים")}</span>
          <span className="h-3 w-3 rounded-full" style={{ background: roles.accent }} aria-hidden="true" />
          <span className="text-[10px] opacity-80">{say("ولون بارز|and an accent|וצבע מודגש")}</span>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1">
        <button type="button" className={btn} disabled={busy || room < 1} onClick={onAdd} title={say("بيزيدهم كألوان بالمتغيرات: بتختارهم بالإسم بأي عنصر|Adds them as colour variables: any element takes them by name|מוסיף אותם כמשתני צבע")} data-testid="studio-picture-add">
          ✦ {say("زيدهم للمتغيرات|Add them to the variables|הוסף למשתנים")}{room > 0 ? ` +${room}` : ""}
        </button>
        {roles && partName ? (
          <button type="button" className={btn} disabled={busy} onClick={onDress} title={say("أرضية القسم ولون كلامه من ألوان الصورة|The part's ground and its words' colour from the picture's colours|רקע החלק וצבע המילים שלו מצבעי התמונה")} data-testid="studio-picture-dress">
            {say("لبّس|Dress|הלבש")} «{partName}»
          </button>
        ) : null}
        {roles && partName && onBackdrop ? (
          <button type="button" className={btn} disabled={busy} onClick={onBackdrop} title={say("خلفية ناعمة للقسم من ألوان الصورة، بتتحرك على مهلها (واقفة للي طالب حركة أقل)|A soft backdrop for the part made of the picture's colours, drifting slowly (still for whoever asked for less motion)|רקע רך לחלק מצבעי התמונה, נע לאט")} data-testid="studio-picture-backdrop">
            🌈 {say("خلفية متحرّكة من ألوانها|A moving backdrop of its colours|רקע נע מצבעיה")}
          </button>
        ) : null}
      </div>
      {room < 1 ? <p className="text-[10px] leading-4 text-white/40">{say("هالألوان موجودة بالمتغيرات، أو ما ضل مكان لألوان جديدة.|These colours are already variables, or there is no room for new ones.|הצבעים כבר במשתנים, או שאין מקום לחדשים.")}</p> : null}
    </div>
  );
}
