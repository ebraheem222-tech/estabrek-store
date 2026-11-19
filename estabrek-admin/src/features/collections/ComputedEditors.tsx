/**
 * A computed field's settings in the fields editor: a formula's equation (the fields it can read and the functions
 * it can call put in with a click, checked by the server as it's written, with what it works out to for the first
 * rows), and a rollup's way to rows, what it works out and of which field.
 */
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { say } from "../../studio/say";
import { useDebounce } from "../../hooks/useDebounce";
import { adminLang } from "../../lib/lang";
import { tryFormula, type Collection, type CollectionField, type ComputedResult, type RollupCalc } from "../../api/collections.api";
import { input } from "../data/GridCells";
import { shownText } from "../data/kinds";
import { CURRENCIES } from "./fieldRules";
import { CALCS, CALC_NAME, FORMULA_GROUPS, FORMULA_RESULTS, RESULT_NAME, fieldRef, formulaReadable, pointAt, rollupOf, rollupWays, wayOf } from "./computedText";

type Lang = "ar" | "en" | "he";
const label = "block text-xs text-white/60";
const chip = "rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] hover:bg-white/[0.14]";
const words = (v: { ar?: string; en?: string; he?: string } | undefined, lang: Lang) => v?.[lang] || v?.ar || v?.en || v?.he || "";
const pick = (lang: Lang, s: { ar: string; he: string } | undefined, en: string) => (lang === "ar" ? s?.ar : lang === "he" ? s?.he : undefined) ?? en;

export function FormulaEditor({ field, fields, tableId, lang, onChange }: { field: CollectionField; fields: CollectionField[]; tableId: string; lang: Lang; onChange: (next: CollectionField) => void }) {
  const box = useRef<HTMLTextAreaElement>(null);
  const formula = field.formula ?? "";
  const asked = useDebounce(formula, 450);
  // The fields as being edited: an equation may read a field added a moment ago.
  const shape = useDebounce(JSON.stringify(fields.map((f) => ({ id: f.id, type: f.type, result: f.result, options: f.options }))), 450);
  const tried = useQuery({ queryKey: ["formula", tableId, field.id, asked, shape], queryFn: () => tryFormula(tableId, { formula: asked, field: field.id, fields }), enabled: asked.trim().length > 0, staleTime: 30_000 });
  const insert = (bit: string) => {
    const el = box.current;
    const [a, b] = [el?.selectionStart ?? formula.length, el?.selectionEnd ?? formula.length];
    const next = `${formula.slice(0, a)}${bit}${formula.slice(b)}`;
    onChange({ ...field, formula: next });
    // The caret goes inside a function's brackets, or after a field.
    const at = a + (bit.includes("(") ? bit.indexOf("(") + 1 : bit.length);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at, at); });
  };
  const result = tried.data?.ok ? tried.data.result : null;
  const shownAs = (field.result ?? result ?? "number") as ComputedResult;
  return (
    <div className="space-y-3 md:col-span-2" data-testid={`formula-${field.id}`}>
      <label className={label}>
        {say("المعادلة|The equation|המשוואה")}
        <textarea ref={box} className={`${input} mt-1 font-mono text-sm`} dir="ltr" rows={3} spellCheck={false} value={formula} placeholder='price * qty' onChange={(e) => onChange({ ...field, formula: e.target.value })} data-testid={`formula-${field.id}-text`} />
      </label>
      {tried.data && !tried.data.ok ? (
        <div className="rounded-lg bg-red-500/10 p-2 text-xs text-red-200" data-testid={`formula-${field.id}-problem`}>
          {pointAt(tried.data.at) ? <pre className="mb-1 overflow-x-auto font-mono text-[12px] leading-4 text-red-200/80" dir="ltr">{`${asked}\n${pointAt(tried.data.at)}`}</pre> : null}
          {pick(adminLang() as Lang, tried.data.say, tried.data.message)}
        </div>
      ) : tried.data?.ok ? (
        <div className="rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-100" data-testid={`formula-${field.id}-ok`}>
          {say(`بتعطي: ${RESULT_NAME[tried.data.result].split("|")[0]}|It gives: ${RESULT_NAME[tried.data.result].split("|")[1]}|נותנת: ${RESULT_NAME[tried.data.result].split("|")[2]}`)}
          {tried.data.sample.length ? (
            <span className="ms-2 text-emerald-100/70" data-testid={`formula-${field.id}-sample`}>
              {tried.data.sample.map((s) => `${s.slug}: ${s.value === null || s.value === undefined ? "—" : shownText({ type: shownAs === "datetime" ? "date" : shownAs, currency: field.currency }, typeof s.value === "object" ? words(s.value as never, lang) : s.value, lang) || String(s.value)}`).join(" · ")}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-1">
        <div className={label}>{say("حقول الجدول (كبسة بتحطّها بالمعادلة)|The table's fields (a click puts one in)|שדות הטבלה (לחיצה מוסיפה)")}</div>
        <div className="flex flex-wrap gap-1">
          {formulaReadable(fields, field.id).map((f) => (
            <button key={f.id} type="button" className={chip} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(fieldRef(f.id))} title={f.id} data-testid={`formula-${field.id}-field-${f.id}`}>
              {words(f.name, lang) || f.id} <code className="text-white/40" dir="ltr">{f.id}</code>
            </button>
          ))}
        </div>
      </div>
      <details className="rounded-lg border border-white/10 p-2" data-testid={`formula-${field.id}-functions`}>
        <summary className="cursor-pointer text-xs text-white/70">{say("الدوال والعمليات: + − × ÷ % ، = < > ، and or not|Functions and operators: + − × ÷ %, = < >, and or not|פונקציות ופעולות: + − × ÷ %, = < >, and or not")}</summary>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {FORMULA_GROUPS.map((g) => (
            <div key={g.say}>
              <div className="mb-1 text-[11px] font-medium text-white/50">{say(g.say)}</div>
              <ul className="space-y-1">
                {g.fns.map((fn) => (
                  <li key={fn.name} className="flex items-start gap-2 text-[11px] text-white/65">
                    <button type="button" className={`${chip} shrink-0 font-mono`} dir="ltr" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(fn.insert)} data-testid={`formula-${field.id}-fn-${fn.name}`}>{fn.name === "&" ? "&" : `${fn.insert.split("(")[0]}()`}</button>
                    <span>
                      {say(fn.say)} <code className="text-white/35" dir="ltr">{fn.example}</code>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
      <div className="flex flex-wrap items-end gap-3">
        <label className={label}>
          {say("بتنعرض كـ|Shown as|מוצג כ")}
          <select className={`${input} mt-1 w-44`} value={field.result ?? ""} onChange={(e) => onChange({ ...field, result: (e.target.value || undefined) as ComputedResult | undefined, ...(e.target.value === "money" ? { currency: field.currency ?? "ILS" } : { currency: undefined }) })} data-testid={`formula-${field.id}-result`}>
            <option value="">{say("حسب المعادلة|As the equation gives|לפי המשוואה")}{result ? ` (${say(RESULT_NAME[result])})` : ""}</option>
            {FORMULA_RESULTS.map((r) => (
              <option key={r} value={r}>{say(RESULT_NAME[r])}</option>
            ))}
          </select>
        </label>
        {field.result === "money" ? (
          <label className={label}>
            {say("العملة|Currency|מטבע")}
            <select className={`${input} mt-1 w-24`} value={field.currency ?? "ILS"} onChange={(e) => onChange({ ...field, currency: e.target.value })} data-testid={`formula-${field.id}-currency`}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        ) : null}
      </div>
      <p className="text-[11px] leading-5 text-white/45">
        {say(
          "بينحسب كل ما ينقرأ السطر، فما بيقدم أبداً، وما حدا بيكتب فيه. الحقل الفاضي بيصير صفر بالحساب، والقسمة على صفر بتخلّي الجواب فاضي. بيبين بالجدول وبالصفحات والـ API متل أي حقل، بس ما بينفرز ولا بينفلتر فيه. والاختيار بينقارن باسمه بأي لغة: status = \"مدفوع\".|Worked out each time the row is read, so it is never old, and nobody writes in it. An empty field is 0 in a sum, and dividing by zero leaves the answer empty. It shows in the grid, on pages and in the API like any field, but rows can't be sorted or filtered by it. A choice compares by its name in any language: status = \"Paid\".|מחושב בכל קריאה של השורה, כך שאינו מתיישן, ואף אחד לא כותב בו. שדה ריק הוא 0 בחישוב, וחלוקה באפס משאירה תשובה ריקה. מוצג בטבלה, בדפים וב-API כמו כל שדה, אבל אי אפשר למיין או לסנן לפיו.",
        )}
      </p>
    </div>
  );
}

export function RollupEditor({ field, fields, self, tables, lang, storeName, onChange }: { field: CollectionField; fields: CollectionField[]; self: string; tables: Array<Pick<Collection, "id" | "name" | "slug" | "fields">>; lang: Lang; storeName: (to: string) => string | null; onChange: (next: CollectionField) => void }) {
  const ways = rollupWays(self, fields, tables, lang, storeName);
  const way = ways.find((w) => w.key === wayOf(field));
  const calc = field.calc ?? "count";
  const store = !!way && way.table.startsWith("store:");
  const ofs = rollupOf(way, tables, calc);
  const set = (patch: Partial<CollectionField>) => onChange({ ...field, ...patch });
  if (!ways.length)
    return (
      <p className="text-[11px] leading-5 text-amber-200/80 md:col-span-2" data-testid={`rollup-${field.id}-none`}>
        {say("ما في ربط يقرأ منه: ضيف لهالجدول حقل «ربط بجدول»، أو خلّي جدول تاني يربط فيه.|There's no relation to read through: give this table a “Link to a table” field, or have another table link it.|אין קשר לקרוא דרכו: הוסיפו לטבלה שדה «קישור לטבלה», או קשרו אליה טבלה אחרת.")}
      </p>
    );
  return (
    <div className="grid gap-3 md:col-span-2 md:grid-cols-2" data-testid={`rollup-${field.id}`}>
      <label className={`${label} md:col-span-2`}>
        {say("من وين بيحسب|Where it counts from|מאיפה הוא מחשב")}
        <select className={`${input} mt-1`} value={way?.key ?? ""} onChange={(e) => { const w = ways.find((x) => x.key === e.target.value); if (w) set({ via: w.via, from: w.from, of: undefined, ...(w.table.startsWith("store:") ? { calc: "count", published: undefined } : {}) }); }} data-testid={`rollup-${field.id}-way`}>
          {!way ? <option value="">—</option> : null}
          {ways.map((w) => <option key={w.key} value={w.key}>{w.name}</option>)}
        </select>
      </label>
      <label className={label}>
        {say("شو بيحسب|What it works out|מה הוא מחשב")}
        <select className={`${input} mt-1`} value={calc} onChange={(e) => set({ calc: e.target.value as RollupCalc, of: undefined })} data-testid={`rollup-${field.id}-calc`}>
          {CALCS.filter((c) => !store || c === "count").map((c) => <option key={c} value={c}>{say(CALC_NAME[c])}</option>)}
        </select>
      </label>
      {calc !== "count" ? (
        <label className={label}>
          {say("لأي حقل|Of which field|של איזה שדה")}
          <select className={`${input} mt-1`} value={field.of ?? ""} onChange={(e) => set({ of: e.target.value || undefined })} data-testid={`rollup-${field.id}-of`}>
            <option value="">—</option>
            {ofs.map((f) => <option key={f.id} value={f.id}>{words(f.name, lang) || f.id}</option>)}
          </select>
        </label>
      ) : null}
      {!store ? (
        <label className="flex items-center gap-2 text-xs text-white/70 md:col-span-2">
          <input type="checkbox" checked={field.published === true} onChange={(e) => set({ published: e.target.checked || undefined })} data-testid={`rollup-${field.id}-published`} />
          {say("بس السطور المنشورة|Only the published rows|רק השורות שפורסמו")}
        </label>
      ) : null}
      <p className="text-[11px] leading-5 text-white/45 md:col-span-2">
        {say(
          "بينحسب لحاله كل ما ينقرأ السطر (السطور اللي بالسلة ما بتنحسب)، وبتقدر ترتّب الجدول وتفلتره فيه. المجموع والمعدّل للأرقام والمبالغ، والأصغر والأكبر كمان للتواريخ.|Worked out each time the row is read (rows in the trash don't count), and the grid can be sorted and filtered by it. A sum or an average is of numbers or money; the smallest or biggest of dates too.|מחושב בכל קריאה של השורה (שורות באשפה לא נספרות), ואפשר למיין ולסנן לפיו. סכום וממוצע של מספרים וכסף; קטן וגדול גם של תאריכים.",
        )}
      </p>
    </div>
  );
}
