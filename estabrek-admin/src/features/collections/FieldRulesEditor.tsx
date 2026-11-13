/**
 * A field's rules in the fields editor (B2): no doubles, a default for new rows, limits, a shape,
 * the words said when a rule fails, and a hint under the field. Only the rules that fit the
 * field's kind are offered (the server says which).
 */
import { say } from "../../studio/say";
import type { CollectionField, FieldType } from "../../api/collections.api";
import { KIND_NAME } from "../data/kinds";
import { ValueInput, field as fieldBox, input } from "../data/GridCells";
import { useState } from "react";
import { CURRENCIES, LIMIT_NAME, LINK_KINDS, LINK_KIND_NAME, ON_DELETE, ON_DELETE_NAME, SHAPE_NAME, addChoice, defaultDraft, defaultFrom, limitFrom, linkKind, moveChoice, removeChoice, renameChoice, setLinkKind, setOnDelete, setRules, type Lang, type LinkKind, type RuleFit, type Shape } from "./fieldRules";

const label = "block text-xs text-white/60";

export function FieldRulesEditor({
  field,
  lang,
  fit,
  shapes,
  onChange,
  onRetype,
  tables,
}: {
  field: CollectionField;
  lang: Lang;
  fit: RuleFit;
  shapes: Shape[];
  onChange: (next: CollectionField) => void;
  /** Another kind for the field (what it does to the rows is shown before the save). */
  onRetype?: (type: FieldType) => void;
  /** The tables a relation can link (this one too), each by its name. */
  tables?: Array<{ id: string; name: string }>;
}) {
  const set = (patch: Parameters<typeof setRules>[1]) => onChange(setRules(field, patch));
  const limit = (v: number | string | undefined) => (v === undefined ? "" : String(v));
  const own = field.pattern !== undefined;
  const [fresh, setFresh] = useState("");
  const choices = field.type === "select" || field.type === "multiSelect";
  const small = "rounded-lg bg-white/[0.07] px-2 py-1 text-xs hover:bg-white/[0.12] disabled:opacity-40";
  const add = () => {
    if (!fresh.trim()) return;
    onChange(addChoice(field, fresh, lang));
    setFresh("");
  };
  return (
    <div className="grid w-full gap-3 rounded-lg bg-white/[0.03] p-3 md:grid-cols-2" data-testid={`rules-${field.id}`}>
      {onRetype ? (
        <label className={`${label} md:col-span-2`}>
          {say("نوع الحقل|The field's kind|סוג השדה")}
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <select className={fieldBox} value={field.type} onChange={(e) => onRetype(e.target.value as FieldType)} data-testid={`rule-${field.id}-kind`}>
              {(Object.keys(KIND_NAME) as FieldType[]).map((t) => (
                <option key={t} value={t}>
                  {say(KIND_NAME[t])}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-white/40">{say("قبل الحفظ بتشوف شو بيصير بالقيم الموجودة.|Before the save you see what happens to the values that are there.|לפני השמירה תראה מה קורה לערכים הקיימים.")}</span>
          </span>
        </label>
      ) : null}
      {choices ? (
        <div className="space-y-2 md:col-span-2" data-testid={`choices-${field.id}`}>
          <div className={label}>{say("الاختيارات (بالترتيب اللي بتنعرض فيه)|The choices (in the order they're offered)|האפשרויות (בסדר שבו הן מוצעות)")}</div>
          <ul className="space-y-1">
            {(field.options ?? []).map((o, i, all) => (
              <li key={o.id} className="flex items-center gap-2" data-testid={`choice-${field.id}-${o.id}`}>
                <input className={`${input} flex-1`} value={o.name?.[lang] ?? ""} placeholder={o.name?.ar || o.name?.en || o.name?.he || o.id} onChange={(e) => onChange(renameChoice(field, o.id, lang, e.target.value))} aria-label={say("إسم الاختيار|The choice's name|שם האפשרות")} data-testid={`choice-${field.id}-${o.id}-name`} />
                <code className="text-[10px] text-white/30" dir="ltr">{o.id}</code>
                <button type="button" className={small} disabled={i === 0} onClick={() => onChange(moveChoice(field, o.id, -1))} aria-label="↑">↑</button>
                <button type="button" className={small} disabled={i === all.length - 1} onClick={() => onChange(moveChoice(field, o.id, 1))} aria-label="↓">↓</button>
                <button type="button" className={`${small} text-red-300`} disabled={all.length <= 1} onClick={() => onChange(removeChoice(field, o.id))} aria-label={say("شيل الاختيار|Remove the choice|הסר אפשרות")} data-testid={`choice-${field.id}-${o.id}-remove`}>×</button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <input className={`${input} flex-1`} value={fresh} placeholder={say("اختيار جديد…|A new choice…|אפשרות חדשה…")} onChange={(e) => setFresh(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} data-testid={`choices-${field.id}-new`} />
            <button type="button" className={small} disabled={!fresh.trim() || (field.options?.length ?? 0) >= 30} onClick={add} data-testid={`choices-${field.id}-add`}>+ {say("ضيف|Add|הוסף")}</button>
          </div>
          <p className="text-[11px] text-white/40">{say("شيل اختيار ما بيمسحه من السطور اللي فيها: بتضل عليه لحد ما تتعدّل.|Removing a choice doesn't clear it from the rows that have it: they keep it until they're changed.|הסרת אפשרות לא מוחקת אותה מהשורות שמחזיקות בה.")}</p>
        </div>
      ) : null}
      {field.type === "relation" ? (
        <div className="grid gap-3 md:col-span-2 md:grid-cols-2" data-testid={`relation-${field.id}`}>
          <label className={label}>
            {say("الجدول اللي بيرتبط فيه|The table it links|הטבלה המקושרת")}
            <select className={`${input} mt-1`} value={field.to ?? ""} onChange={(e) => onChange({ ...field, to: e.target.value })} data-testid={`rule-${field.id}-to`}>
              {/* A table that's gone (or not chosen yet) is said, not hidden behind the first one in the list. */}
              {!(tables ?? []).some((t) => t.id === field.to) ? <option value={field.to ?? ""}>{field.to ? say("جدول مش موجود|A table that isn't there|טבלה שאינה קיימת") : "—"}</option> : null}
              {(tables ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            {say("لما ينحذف السطر المربوط|When the linked row is deleted|כשהשורה המקושרת נמחקת")}
            <select className={`${input} mt-1`} value={field.onDelete ?? "unlink"} onChange={(e) => onChange(setOnDelete(field, e.target.value as (typeof ON_DELETE)[number]))} data-testid={`rule-${field.id}-ondelete`}>
              {ON_DELETE.map((v) => (
                <option key={v} value={v}>
                  {say(ON_DELETE_NAME[v])}
                </option>
              ))}
            </select>
          </label>
          <label className={`${label} md:col-span-2`}>
            {say("كيف بيرتبطوا|How they pair up|איך הן מתקשרות")}
            <select className={`${input} mt-1`} value={linkKind(field)} onChange={(e) => onChange(setLinkKind(field, e.target.value as LinkKind))} data-testid={`rule-${field.id}-pairing`}>
              {LINK_KINDS.map((k) => (
                <option key={k} value={k}>
                  {say(LINK_KIND_NAME[k])}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-white/40 md:col-span-2">
            {say(
              "الروابط بتنحفظ بجدول لحالها: تغيير هالإعدادات ما بيمسح ولا رابط، وإذا شلت الحقل ورجّعته بترجع روابطه.|The links are kept in a table of their own: changing these settings deletes none of them, and a field removed and put back gets its links back.|הקישורים נשמרים בטבלה משלהם: שינוי ההגדרות אינו מוחק אף קישור, ושדה שהוסר והוחזר מקבל את קישוריו בחזרה.",
            )}
          </p>
        </div>
      ) : null}
      {field.type === "money" ? (
        <label className={label}>
          {say("العملة|Currency|מטבע")}
          <span className="mt-1 flex items-center gap-2">
            <select className={fieldBox} value={(CURRENCIES as readonly string[]).includes(field.currency ?? "ILS") ? (field.currency ?? "ILS") : "$other"} onChange={(e) => onChange(e.target.value === "$other" ? { ...field, currency: "" } : { ...field, currency: e.target.value })} data-testid={`rule-${field.id}-currency`}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="$other">{say("غيرها…|Another…|אחר…")}</option>
            </select>
            {!(CURRENCIES as readonly string[]).includes(field.currency ?? "ILS") ? <input className={`${fieldBox} w-20 font-mono uppercase`} dir="ltr" maxLength={3} value={field.currency ?? ""} placeholder="XXX" onChange={(e) => onChange({ ...field, currency: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })} data-testid={`rule-${field.id}-currency-own`} /> : null}
          </span>
        </label>
      ) : null}
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
