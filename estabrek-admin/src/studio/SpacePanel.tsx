/**
 * A box's things laid out in 3D (the theme library's 3D pieces, the shop's pageTree/Space3D.tsx): on a ring, up a helix,
 * on a cube's faces, as a book's pages or a phone's screens. What it holds stays the owner's own elements, each edited
 * as usual; this only sets how they're placed, how fast they turn by themselves, whether a visitor may turn them by
 * hand, and how much a ring or a cube leans.
 */
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { SPACE_KINDS, type SpaceKind } from "../../../estabrek-storefront/src/pageTree/spaceSpec";
import { Range } from "./LookPanels";
import { say } from "./say";
type Space = { kind: SpaceKind; speed?: number; drag?: boolean; tilt?: number };

export const SPACE_NAMES: Record<SpaceKind, string> = {
  ring: "حلقة بتلف (اسحبها بإيدك)|A turning ring (drag it round)|טבעת מסתובבת (גוררים אותה)",
  helix: "حلزون متل الـ DNA|A helix, like DNA|סליל, כמו DNA",
  cube: "مكعّب: كل وجه عنصر|A cube: one element a face|קובייה: אלמנט לכל פאה",
  book: "كتاب بتقلب صفحاته|A book whose pages turn|ספר שדפיו מתהפכים",
  phone: "موبايل بيلف مع التمرير|A phone turning as you scroll|טלפון שמסתובב בגלילה",
};
const HINTS: Record<SpaceKind, string> = {
  ring: "كل عنصر جوّا الصندوق كرت على الحلقة (لحد 16).|Each element in the box is a card on the ring (up to 16).|כל אלמנט בקופסה הוא קלף על הטבעת (עד 16).",
  helix: "العناصر بتطلع على حلزون بيلف (لحد 24).|The elements climb a turning helix (up to 24).|האלמנטים עולים על סליל מסתובב (עד 24).",
  cube: "أول 6 عناصر هم وجوه المكعّب.|The first 6 elements are the cube's faces.|6 האלמנטים הראשונים הם פאות הקובייה.",
  book: "كل عنصرين ورقة: الأول وجهها والتاني ظهرها. بتنقلب بكبسة أو سحبة أو بالأسهم.|Every two elements are a leaf: its front, then its back. Turned with a click, a swipe or the arrow keys.|כל שני אלמנטים הם דף: חזית ואז גב. מתהפך בלחיצה, החלקה או בחצים.",
  phone: "كل عنصر شاشة، وبتتبدّل الشاشات مع التمرير (لحد 6).|Each element is a screen; they change as the page scrolls (up to 6).|כל אלמנט הוא מסך; המסכים מתחלפים בגלילה (עד 6).",
};
const btn = "rounded-lg border px-2 py-1.5 text-start text-[11px] disabled:opacity-40";

export const spaceOf = (raw: unknown): Space | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Space;
  return (SPACE_KINDS as readonly string[]).includes(r.kind) ? r : null;
};

export function SpacePanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: (label: string, ops: PageDraftOp[]) => void }) {
  const now = spaceOf(node.props?.space);
  const label = say("ترتيب 3D|3D layout|פריסה בתלת ממד");
  const save = (next: Space | null) => {
    const clean = next ? Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)) : undefined;
    onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...node.props, space: clean } }]);
  };
  const kids = node.children?.length ?? 0;
  return (
    <div className="space-y-2 rounded-xl border border-white/8 p-3" data-testid="studio-space">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/70">{label}</div>
        <span className="text-[10px] text-white/40">{now ? say(SPACE_NAMES[now.kind]) : say("مسطّح|Flat|שטוח")}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {SPACE_KINDS.map((k) => (
          <button key={k} type="button" disabled={busy} aria-pressed={now?.kind === k} data-space-kind={k} title={say(SPACE_NAMES[k])}
            onClick={() => save(now?.kind === k ? null : { kind: k, ...(now?.speed !== undefined ? { speed: now.speed } : {}), ...(now?.drag === false ? { drag: false } : {}) })}
            className={`${btn} ${now?.kind === k ? "border-accent-400/70 bg-accent-500/15 text-white" : "border-white/[0.08] text-white/75 hover:bg-white/[0.05]"}`}>
            {say(SPACE_NAMES[k])}
          </button>
        ))}
      </div>
      {now ? (
        <>
          <p className="text-[10px] leading-4 text-white/40">{say(HINTS[now.kind])}{kids < 2 ? ` ${say("حط جوّاه عنصرين أو أكتر.|Put two or more elements in it.|שימו בו שני אלמנטים או יותר.")}` : ""}</p>
          {now.kind !== "book" && now.kind !== "phone" ? (
            <Range label={say("سرعة اللف لحاله (0 = بس باليد)|Turns by itself (0 = by hand only)|מסתובב לבד (0 = רק ביד)")} value={now.speed ?? 1} min={-3} max={3} step={0.5} busy={busy} onSave={(v) => save({ ...now, speed: v === 1 ? undefined : v })} testId="studio-space-speed" />
          ) : null}
          {now.kind === "ring" || now.kind === "cube" ? (
            <Range label={say("الميلان|Lean|הטיה")} value={now.tilt ?? (now.kind === "ring" ? -8 : 0)} min={-30} max={30} step={1} unit="°" busy={busy} onSave={(v) => save({ ...now, tilt: v })} testId="studio-space-tilt" />
          ) : null}
          {now.kind !== "book" && now.kind !== "phone" ? (
            <label className="flex items-center gap-2 text-[11px] text-white/70">
              <input type="checkbox" checked={now.drag !== false} disabled={busy} onChange={(e) => save({ ...now, drag: e.target.checked ? undefined : false })} data-testid="studio-space-drag" />
              {say("الزائر بيقدر يلفّه بإيده|Visitors may turn it by hand|המבקרים יכולים לסובב ביד")}
            </label>
          ) : null}
          <p className="text-[10px] leading-4 text-white/35">{say("بالمحرّر ما بيلف لحاله، ولللي طالب حركة أقل بيضل مسطّح.|In the editor it doesn't turn by itself; for less motion it stays flat.|בעורך הוא לא מסתובב לבד; למי שביקש פחות תנועה הוא נשאר שטוח.")}</p>
        </>
      ) : null}
    </div>
  );
}
