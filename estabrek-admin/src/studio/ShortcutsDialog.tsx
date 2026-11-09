/**
 * Everything the canvas does with the mouse and keyboard, in one list ("?" opens it). Words in the
 * three languages side by side (say.ts).
 */
import { say } from "./say";

const GROUPS: [title: string, rows: [keys: string, what: string][]][] = [
  ["التحديد|Selecting|בחירה", [
    ["Click", "بيحدد العنصر نفسه|Selects the object itself|בוחר את האובייקט עצמו"],
    ["Click ×2", "كبسة تانية على المحدد بتفوت لجوّاه|A second click on the selected one goes inside it|לחיצה שנייה על הנבחר נכנסת פנימה"],
    ["Ctrl/⌘ + Click", "أعمق قطعة تحت الماوس مباشرة|The deepest part under the pointer, at once|החלק העמוק ביותר מתחת לסמן"],
    ["Alt + Click", "اللي تحته، واحد ورا التاني|What's underneath, one after another|מה שמתחת, אחד אחרי השני"],
    ["Shift + Click", "زيد أو شيل من التحديد|Add to or take from the selection|הוספה או הסרה מהבחירה"],
    ["Drag on empty space", "مربع بيحدد كذا عنصر|A box that selects several|מלבן שבוחר כמה"],
    ["Right click", "قائمة: اختار من كل اللي تحت الماوس|Menu: pick from all under the pointer|תפריט: בחירה מכל מה שמתחת"],
    ["Enter", "لجوّا (أو اكتب بالكلام)|Inside (or write in the text)|פנימה (או כתיבה בטקסט)"],
    ["Esc", "للي حواليه|Up to what holds it|אל מה שמכיל אותו"],
    ["Ctrl/⌘ + A", "كل اللي جنبه|Everything beside it|כל מה שלידו"],
  ]],
  ["التحريك والحجم|Moving and size|הזזה וגודל", [
    ["Drag", "بيتحرك (من أي قطعة جوّاه) مع خطوط المحاذاة والمسافات|Moves (from any part inside) with guides and distances|זז (מכל חלק בפנים) עם קווי יישור ומרחקים"],
    ["Shift + Drag", "على خط مستقيم|In a straight line|בקו ישר"],
    ["Ctrl/⌘ + Drag", "بدون التصاق|Without snapping|ללא הצמדה"],
    ["Alt (let go)", "بيترك الأصل وبيحط نسخة|Leaves the original and puts a copy|משאיר את המקור ושם עותק"],
    ["Alt (hold)", "المسافة للي تحت الماوس|Distance to what's under the pointer|מרחק למה שמתחת לסמן"],
    ["Alt + ← ↑ → ↓", "بيتحرك 1px (مع Shift: 10px)|Nudges 1px (with Shift: 10px)|הזזה של 1px (עם Shift: 10px)"],
    ["← ↑ → ↓", "للعنصر اللي جنبه|To the element beside it|לאובייקט שלידו"],
    ["Double-click", "اكتب جوّا الكلام|Write in the text|כתיבה בטקסט"],
  ]],
  ["التعديل|Editing|עריכה", [
    ["Ctrl/⌘ + Z", "تراجع|Undo|ביטול"],
    ["Ctrl/⌘ + Y", "إعادة|Redo|חזרה"],
    ["Ctrl/⌘ + C / X / V", "نسخ / قص / لصق|Copy / cut / paste|העתקה / גזירה / הדבקה"],
    ["Ctrl/⌘ + D", "نسخة جنبه|A copy beside it|עותק לידו"],
    ["Ctrl/⌘ + Alt + C / V", "انسخ الشكل / الصق الشكل|Copy the look / paste the look|העתקת המראה / הדבקת המראה"],
    ["Ctrl/⌘ + G", "اجمعهم بحاوية (مع Shift: فكّهم)|Group them (with Shift: ungroup)|קיבוץ (עם Shift: פירוק)"],
    ["Delete", "احذف|Delete|מחיקה"],
  ]],
  ["الشاشة|The view|התצוגה", [
    ["Space + Drag", "حرّك اللوحة|Move the canvas|הזזת הקנבס"],
    ["Ctrl/⌘ + Wheel", "تكبير وتصغير عند الماوس|Zoom at the pointer|זום בסמן"],
    ["Ctrl/⌘ + 0", "الصفحة كلها|Fit the page|התאמה לעמוד"],
    ["Ctrl/⌘ + 1", "100%|100%|100%"],
    ["Ctrl/⌘ + + / −", "كبّر / صغّر|Zoom in / out|הגדלה / הקטנה"],
    ["?", "هالقائمة|This list|הרשימה הזו"],
  ]],
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4" onClick={onClose} data-testid="studio-shortcuts">
      <div role="dialog" aria-modal="true" aria-label={say("اختصارات المحرر|Editor shortcuts|קיצורי העורך")} className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-surface-950 p-5 text-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{say("اختصارات المحرر|Editor shortcuts|קיצורי העורך")}</h2>
          <button type="button" className="rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1]" onClick={onClose} data-testid="studio-shortcuts-close">{say("سكّر|Close|סגירה")}</button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {GROUPS.map(([title, rows]) => (
            <section key={title} className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">{say(title)}</h3>
              {rows.map(([keys, what]) => (
                <div key={keys} className="flex items-start justify-between gap-3 border-b border-white/[0.05] pb-1.5">
                  <span className="text-white/80">{say(what)}</span>
                  <kbd dir="ltr" className="shrink-0 rounded-md border border-white/15 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] text-white/70">{keys}</kbd>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
