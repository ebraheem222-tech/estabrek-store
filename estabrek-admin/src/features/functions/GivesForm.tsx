// الـ Functions: what a function promises to give back. The owner may say the kind of its answer
// (text, a number, yes/no, a list, a thing with these fields), as they say the kinds of what it is
// handed. A try-out and the function's own tests then say when the answer isn't that, before it
// is published; and a function that calls this one is offered the fields by name.
import type { GiveField, GiveType, Gives } from "../../api/functions.api";
import { say } from "../../studio/say";
import { freeName } from "./fnDraft";
import { GIVE_TYPE } from "./fnText";

const field = "h-9 min-w-0 rounded-lg border border-white/10 bg-surface-925 px-2 text-sm text-white";
const TYPES: GiveType[] = ["text", "number", "bool", "list", "thing"];
const FIELD_TYPES: GiveType[] = ["text", "number", "bool", "list", "thing", "any"];
/** A field's name: letters, digits and _. */
export const fieldNameOk = (name: string) => /^[A-Za-z_$][A-Za-z0-9_$]{0,39}$/.test(name);
/** Whether a kind of answer has fields of its own: a thing, or a list (of things). */
const hasFields = (type: GiveType | undefined) => type === "thing" || type === "list";

/** The promise as the draft keeps it: none at all when nothing is promised; no fields where the kind has none. */
export function tidyGives(gives: Gives | undefined): Gives | undefined {
  if (!gives || gives.type === "any") return undefined;
  const fields = hasFields(gives.type) ? (gives.fields ?? []) : [];
  return fields.length ? { type: gives.type, fields } : { type: gives.type };
}

export function GivesForm({ gives, onChange, canWrite }: { gives: Gives | undefined; onChange: (next: Gives | undefined) => void; canWrite: boolean }) {
  const fields = gives?.fields ?? [];
  const set = (next: GiveField[]) => onChange(tidyGives({ type: gives?.type ?? "thing", fields: next }));
  const names = fields.map((f) => f.name);
  return (
    <div className="space-y-2" data-testid="fn-gives">
      <select className={`${field} w-56`} value={gives?.type ?? ""} disabled={!canWrite} onChange={(e) => onChange(tidyGives(e.target.value ? { type: e.target.value as GiveType, fields } : undefined))} aria-label={say("نوع الجواب|The answer's kind|סוג התשובה")} data-testid="fn-gives-type">
        <option value="">{say("ما بتوعد بشي محدّد|It promises nothing in particular|היא לא מבטיחה דבר מסוים")}</option>
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {say(GIVE_TYPE[t])}
          </option>
        ))}
      </select>
      {hasFields(gives?.type) ? (
        <>
          <div className="text-xs text-white/70">{gives?.type === "list" ? say("كل شي بالقائمة فيه (اختياري):|Each thing in the list holds (optional):|כל דבר ברשימה מכיל (לא חובה):") : say("الشي فيه هالحقول:|The thing holds these fields:|הדבר מכיל את השדות האלה:")}</div>
          {fields.map((f, k) => (
            <div key={k} className="flex flex-wrap items-center gap-2" data-testid={`fn-gives-field-${k}`}>
              <input
                className={`${field} w-40 ${fieldNameOk(f.name) && names.indexOf(f.name) === k ? "" : "border-red-400/60"}`}
                dir="ltr"
                value={f.name}
                disabled={!canWrite}
                aria-label={say("اسم الحقل|The field's name|שם השדה")}
                onChange={(e) => set(fields.map((x, n) => (n === k ? { ...x, name: e.target.value.trim() } : x)))}
                data-testid={`fn-gives-field-${k}-name`}
              />
              <select className={field} value={f.type} disabled={!canWrite} onChange={(e) => set(fields.map((x, n) => (n === k ? { ...x, type: e.target.value as GiveType } : x)))} data-testid={`fn-gives-field-${k}-type`}>
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {say(GIVE_TYPE[t])}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-sm text-white/80">
                <input type="checkbox" className="h-4 w-4 accent-current" checked={!!f.required} disabled={!canWrite} onChange={(e) => set(fields.map((x, n) => (n === k ? (e.target.checked ? { ...x, required: true } : { name: x.name, type: x.type }) : x)))} data-testid={`fn-gives-field-${k}-required`} />
                {say("دايماً موجود|Always there|תמיד קיים")}
              </label>
              {canWrite ? (
                <button type="button" className="h-9 px-2 text-sm text-white/60 hover:text-red-300" onClick={() => set(fields.filter((_x, n) => n !== k))} aria-label={say("شيل الحقل|Remove the field|הסרת השדה")} data-testid={`fn-gives-field-${k}-remove`}>
                  ✕
                </button>
              ) : null}
            </div>
          ))}
          {canWrite && fields.length < 30 ? (
            <button type="button" className="text-sm underline" onClick={() => set([...fields, { name: freeName("field", names), type: "text" }])} data-testid="fn-gives-field-add">
              {say("＋ حقل|＋ field|＋ שדה")}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
