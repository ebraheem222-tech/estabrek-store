/**
 * A field's rules in the fields editor (B2): no doubles, a default for new rows, limits, a shape,
 * the words said when a rule fails, and a hint under the field. Only the rules that fit the
 * field's kind are offered (the server says which).
 */
import { say } from "../../studio/say";
import type { CollectionField } from "../../api/collections.api";
import { ValueInput, field as fieldBox, input } from "../data/GridCells";
import { LIMIT_NAME, SHAPE_NAME, defaultDraft, defaultFrom, limitFrom, setRules, type Lang, type RuleFit, type Shape } from "./fieldRules";

const label = "block text-xs text-white/60";

export function FieldRulesEditor({ field, lang, fit, shapes, onChange }: { field: CollectionField; lang: Lang; fit: RuleFit; shapes: Shape[]; onChange: (next: CollectionField) => void }) {
  const set = (patch: Parameters<typeof setRules>[1]) => onChange(setRules(field, patch));
  const limit = (v: number | string | undefined) => (v === undefined ? "" : String(v));
  const own = field.pattern !== undefined;
  return (
    <div className="grid w-full gap-3 rounded-lg bg-white/[0.03] p-3 md:grid-cols-2" data-testid={`rules-${field.id}`}>
      {fit.unique ? (
        <label className="flex items-center gap-2 text-xs text-white/70 md:col-span-2">
          <input type="checkbox" checked={field.unique === true} onChange={(e) => set(e.target.checked ? { unique: true, default: undefined } : { unique: false })} data-testid={`rule-${field.id}-unique`} />
          {say("ما بتتكرر: ما في سطرين بنفس القيمة|No doubles: no two rows with the same value|ללא כפילויות: אין שתי שורות עם אותו ערך")}
        </label>
      ) : null}
      {fit.limits ? (
        <>
          <label className={label}>
            {say(LIMIT_NAME[fit.limits][0])}
            <input className={`${input} mt-1`} type={fit.limits === "date" ? "date" : "number"} step="any" dir="ltr" value={limit(field.min)} onChange={(e) => set({ min: limitFrom(fit, e.target.value) })} data-testid={`rule-${field.id}-min`} />
          </label>
          <label className={label}>
            {say(LIMIT_NAME[fit.limits][1])}
            <input className={`${input} mt-1`} type={fit.limits === "date" ? "date" : "number"} step="any" dir="ltr" value={limit(field.max)} onChange={(e) => set({ max: limitFrom(fit, e.target.value) })} data-testid={`rule-${field.id}-max`} />
          </label>
        </>
      ) : null}
      {fit.shape ? (
        <label className={`${label} md:col-span-2`}>
          {say("شكل القيمة|What the value looks like|צורת הערך")}
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <select
              className={fieldBox}
              value={own ? "$own" : (field.shape ?? "")}
              data-testid={`rule-${field.id}-shape`}
              onChange={(e) => {
                const v = e.target.value;
                // A ready shape or the owner's own pattern, never both.
                if (v === "$own") set({ shape: undefined, pattern: field.pattern ?? "^.+$" });
                else onChange(setRules({ ...field, pattern: undefined }, { shape: (v || undefined) as Shape | undefined }));
              }}
            >
              <option value="">{say("أي شي|Anything|כל דבר")}</option>
              {shapes.map((s) => (
                <option key={s} value={s}>
                  {say(SHAPE_NAME[s])}
                </option>
              ))}
              <option value="$own">{say("نمط خاص (regex)|My own pattern (regex)|תבנית משלי (regex)")}</option>
            </select>
            {own ? <input className={`${input} min-w-[12rem] flex-1 font-mono`} dir="ltr" value={field.pattern ?? ""} placeholder="^[A-Z]{2}-\d{3}$" onChange={(e) => onChange({ ...field, pattern: e.target.value })} data-testid={`rule-${field.id}-pattern`} /> : null}
          </span>
        </label>
      ) : null}
      {/* One value for every new row is the opposite of "no doubles": such a field has no default. */}
      {fit.default && !field.unique ? (
        <label className={label}>
          {say("قيمة السطر الجديد (لما ما تنكتب)|A new row's value (when none is written)|ערך שורה חדשה (כשלא נכתב)")}
          <span className="mt-1 block">
            <ValueInput kind={field.type} field={field} lang={lang} value={defaultDraft(field, lang)} onChange={(v) => set({ default: defaultFrom(field, lang, v) })} testId={`rule-${field.id}-default`} />
          </span>
        </label>
      ) : null}
      <label className={label}>
        {say("تلميح تحت الحقل|A hint under the field|רמז מתחת לשדה")}
        <input className={`${input} mt-1`} value={field.help?.[lang] ?? ""} onChange={(e) => set({ help: { ...field.help, [lang]: e.target.value } })} data-testid={`rule-${field.id}-help`} />
      </label>
      <label className={`${label} md:col-span-2`}>
        {say("الكلام اللي بينقال لما قيمة تخالف القواعد|The words said when a value breaks the rules|המילים שנאמרות כשערך מפר את הכללים")}
        <input className={`${input} mt-1`} value={field.message?.[lang] ?? ""} placeholder={say("إذا فاضي بينقال السبب العام (متل «لازم رقم»)|Left empty, the general reason is said (like “A number is needed”)|אם ריק, תיאמר הסיבה הכללית")} onChange={(e) => set({ message: { ...field.message, [lang]: e.target.value } })} data-testid={`rule-${field.id}-message`} />
      </label>
    </div>
  );
}
