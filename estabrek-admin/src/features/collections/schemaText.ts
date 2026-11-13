/**
 * A change of a table's fields, said to its owner before it's made (pure, tested): what each
 * changed field does to the rows that are there, in the three languages, and a field given
 * another kind in the editor. The counting itself is the server's (lib/schemaChange.ts).
 */
import type { CollectionField, FieldType, Impact } from "../../api/collections.api";
import { KIND_NAME } from "../data/kinds";
import { fitRules, type RuleFit } from "./fieldRules";

type Lang = "ar" | "en" | "he";
const n = (x: number) => x.toLocaleString("en");
const part = (words: string, i: number) => words.split("|")[i] ?? words.split("|")[0];
const join = (parts: string[]) => [0, 1, 2].map((i) => parts.map((p) => part(p, i)).join(" ")).join("|");

/** Does the change touch any row at all? (Else it's saved without asking.) */
export const touchesRows = (changes: Impact[]) => changes.some((c) => c.lost + c.hidden + c.failing + c.missing + c.doubles + c.converted > 0);

/** One changed field in a sentence or two ("عربي|English|עברית"). */
export function impactText(c: Impact, name: string): string {
  const out: string[] = [];
  const kind = (t: FieldType | undefined) => (t ? KIND_NAME[t] : "?|?|?");
  if (c.change === "retyped") {
    out.push(`«${name}»: من «${part(kind(c.from), 0)}» لـ «${part(kind(c.to), 0)}».|“${name}”: from ${part(kind(c.from), 1)} to ${part(kind(c.to), 1)}.|״${name}״: מ״${part(kind(c.from), 2)}״ ל״${part(kind(c.to), 2)}״.`);
    if (c.converted) out.push(`${n(c.converted)} قيمة بتتحوّل.|${n(c.converted)} values turn into the new kind.|${n(c.converted)} ערכים מומרים.`);
    if (c.lost) out.push(`${n(c.lost)} قيمة ما بتتحوّل: بتتخبّى، وبترجع متل ما هي إذا رجّعت النوع.|${n(c.lost)} values can't turn: they're put aside, and come back as they were if the kind is changed back.|${n(c.lost)} ערכים לא ניתנים להמרה: הם יוסתרו ויחזרו אם הסוג יוחזר.`);
    if (!c.rows) out.push("ما في قيم بهالحقل لسا.|No row holds a value there yet.|אין עדיין ערכים בשדה.");
  } else if (c.change === "removed") {
    out.push(`«${name}»: رح ينشال.|“${name}” goes.|״${name}״ יוסר.`);
    out.push(c.hidden ? `${n(c.hidden)} قيمة بتضل محفوظة ومخبّاة، وبترجع إذا رجّعت الحقل.|Its ${n(c.hidden)} values stay kept, hidden, and show again if the field comes back.|${n(c.hidden)} ערכים יישמרו מוסתרים ויחזרו אם השדה יוחזר.` : "ما كان فيه قيم.|It held no values.|לא היו בו ערכים.");
  } else if (c.change === "added") {
    out.push(`«${name}»: حقل جديد.|“${name}”: a new field.|״${name}״: שדה חדש.`);
    if (c.converted) out.push(`${n(c.converted)} قيمة قديمة تحت هالإسم بترجع تبيّن.|${n(c.converted)} earlier values under this id show again.|${n(c.converted)} ערכים קודמים יוצגו שוב.`);
    if (c.lost) out.push(`${n(c.lost)} قيمة قديمة ما بتناسب النوع: بتضل مخبّاة.|${n(c.lost)} earlier values don't fit its kind: they stay put aside.|${n(c.lost)} ערכים קודמים לא מתאימים לסוג: יישארו מוסתרים.`);
  } else {
    out.push(`«${name}»: قواعد أو اختيارات جديدة.|“${name}”: new rules or choices.|״${name}״: כללים או אפשרויות חדשים.`);
    if (c.failing) out.push(`${n(c.failing)} قيمة ما بتمشي معها: بتضل متل ما هي، وبتنرفض لما تتعدّل.|${n(c.failing)} values don't pass them: they stay as they are, and are refused when next changed.|${n(c.failing)} ערכים לא עומדים בהם: יישארו כפי שהם ויידחו בעריכה הבאה.`);
  }
  if (c.missing) out.push(`${n(c.missing)} سطر ما فيه قيمة والحقل إجباري.|${n(c.missing)} rows hold nothing there, and it's required.|${n(c.missing)} שורות ללא ערך בשדה חובה.`);
  if (c.doubles) out.push(`${n(c.doubles)} سطر بيتشاركوا قيمة مع غيرهم، والحقل ما بيتكرر.|${n(c.doubles)} rows share a value with another, and the field takes no doubles.|${n(c.doubles)} שורות חולקות ערך, והשדה ללא כפילויות.`);
  return join(out);
}

/** A short line for a version in the list: what that change did ("price: نص ← رقم"). */
export function versionLine(changes: Impact[], lang: Lang): string {
  const i = lang === "ar" ? 0 : lang === "en" ? 1 : 2;
  if (!changes.length) return part("تعديل بالأسماء أو الإعدادات|Names or settings changed|שמות או הגדרות שונו", i);
  return changes
    .map((c) => {
      if (c.change === "retyped") return `${c.field}: ${part(KIND_NAME[c.from!], i)} ← ${part(KIND_NAME[c.to!], i)}`;
      const word = c.change === "removed" ? "انشال|removed|הוסר" : c.change === "added" ? "انضاف|added|נוסף" : "قواعد|rules|כללים";
      return `${c.field}: ${part(word, i)}`;
    })
    .join(" · ");
}

/** A field given another kind in the editor: what the new kind can't have comes off, a choice kind gets its first choice. */
export function retype(field: CollectionField, type: FieldType, fit: RuleFit | undefined): CollectionField {
  if (type === field.type) return field;
  const { default: _default, currency: _currency, ...rest } = field;
  const choices = type === "select" || type === "multiSelect";
  const next: CollectionField = { ...rest, type };
  if (choices && !next.options?.length) next.options = [{ id: "one", name: { ...field.name } }];
  if (!choices) delete next.options;
  return fitRules(next, fit);
}
