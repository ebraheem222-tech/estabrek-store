// الـ Functions: the builder. A list of steps, each a card that opens to its own form; a
// question and a loop hold lists of their own. Every change makes a new draft (fnDraft.ts): the
// page above keeps it and saves it.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Cond, Filter, FnDef, FnLite, FnTable, Match, Op, Problem, RowStatus, Step, StepKind, Val } from "../../api/functions.api";
import { adminLang } from "../../lib/lang";
import { say } from "../../studio/say";
import { STATUS_NAME, SYSTEM_NAME, kindOf, opName, opNeeds } from "../data/dataText";
import { FAIL_ACTS, GROUPS, addStep, atOf, fieldName, fromVal, listAt, moveStep, nameOk, newStep, offers, removeStep, setList, setStep, tableName, toVal, type Path } from "./fnDraft";
import { ACT_NAME, ALONE, CMP_NAME, GROUP_NAME, SET_OP, condsLine, problemText, stepLine } from "./fnText";

export type Builder = {
  def: FnDef;
  change: (next: FnDef) => void;
  tables: FnTable[];
  /** The other functions (one can be called). */
  fns: FnLite[];
  ops: Record<string, Op[]>;
  problems: Problem[];
  /** The step the last run stopped at. */
  failedAt: string | null;
  canWrite: boolean;
  /** The one step whose form is open. */
  openAt: string | null;
  setOpenAt: (at: string | null) => void;
};
const BuilderContext = createContext<Builder | null>(null);
export const BuilderProvider = BuilderContext.Provider;
const useBuilder = () => {
  const b = useContext(BuilderContext);
  if (!b) throw new Error("No builder");
  return b;
};

const field = "h-9 min-w-0 rounded-lg border border-white/10 bg-surface-925 px-2 text-sm text-white";
const label = "text-xs text-white/60";
const SYSTEM = ["$slug", "$status", "$createdAt", "$updatedAt", "$publishedAt"] as const;

/* ---------------- Small inputs ---------------- */

/** The names a value can use here, as a menu that puts one in. */
function NameMenu({ at, onPick, testid }: { at: Path; onPick: (name: string) => void; testid?: string }) {
  const b = useBuilder();
  const names = offers(b.def, at, b.tables);
  if (!b.canWrite || !names.length) return null;
  return (
    <select
      className={`${field} w-24 shrink-0 text-white/70`}
      value=""
      aria-label={say("حط اسم|Put a name in|הוספת שם")}
      onChange={(e) => {
        if (e.target.value) onPick(e.target.value);
      }}
      data-testid={testid}
    >
      <option value="">{say("＋ اسم|＋ name|＋ שם")}</option>
      {names.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}

/** Words the owner types, with names put in from the menu. `plain`: always words; else a number, yes/no or a list is kept as one. */
function ValueInput({ at, value, onChange, plain, long, placeholder, testid }: { at: Path; value: Val | undefined; onChange: (v: Val) => void; plain?: boolean; long?: boolean; placeholder?: string; testid?: string }) {
  const b = useBuilder();
  const shown = fromVal(value);
  // What is being typed is kept as typed ("1.0" on its way to "1.05"); it follows the draft when the draft says something else.
  const [text, setText] = useState(shown);
  useEffect(() => {
    setText((was) => (fromVal(plain ? was : toVal(was)) === shown ? was : shown));
  }, [shown, plain]);
  const set = (next: string) => {
    setText(next);
    onChange(plain ? next : toVal(next));
  };
  const props = { className: `${field} w-full ${long ? "h-auto min-h-[72px] py-2" : ""}`, value: text, placeholder, disabled: !b.canWrite, dir: "auto" as const, "data-testid": testid };
  return (
    <div className="flex min-w-[11rem] flex-1 items-start gap-1">
      {long ? <textarea {...props} rows={3} onChange={(e) => set(e.target.value)} /> : <input {...props} onChange={(e) => set(e.target.value)} />}
      <NameMenu at={at} onPick={(n) => set(`${text}{{${n}}}`)} testid={testid ? `${testid}-names` : undefined} />
    </div>
  );
}

/** A name the run keeps something under: taken only when it is one. */
function NameInput({ value, onChange, placeholder, optional, testid }: { value: string | undefined; onChange: (name: string | undefined) => void; placeholder?: string; optional?: boolean; testid?: string }) {
  const b = useBuilder();
  const [text, setText] = useState(value ?? "");
  useEffect(() => setText(value ?? ""), [value]);
  const bad = text !== "" ? !nameOk(text) : !optional;
  return (
    <input
      className={`${field} w-32 ${bad ? "border-red-400/60" : ""}`}
      dir="ltr"
      value={text}
      placeholder={placeholder}
      disabled={!b.canWrite}
      aria-invalid={bad || undefined}
      title={bad ? say("اسم بيبدأ بحرف صغير: حروف إنجليزية، أرقام و _|A name starts with a small letter: letters, digits and _|שם מתחיל באות קטנה: אותיות באנגלית, ספרות ו-_") : undefined}
      onChange={(e) => {
        const next = e.target.value.trim();
        setText(next);
        if (next === "" ? optional : nameOk(next)) onChange(next || undefined);
      }}
      data-testid={testid}
    />
  );
}

function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`${label} w-24 shrink-0`}>{name}</span>
      {children}
    </div>
  );
}

function TablePick({ value, onChange, testid }: { value: string; onChange: (id: string) => void; testid?: string }) {
  const b = useBuilder();
  const lang = adminLang();
  return (
    <select className={`${field} max-w-[16rem]`} value={value} disabled={!b.canWrite} onChange={(e) => onChange(e.target.value)} data-testid={testid}>
      {!b.tables.some((t) => t.id === value) ? <option value={value}>{value ? say("جدول انحذف|A deleted table|טבלה שנמחקה") : say("اختار جدول|Pick a table|בחירת טבלה")}</option> : null}
      {b.tables.map((t) => (
        <option key={t.id} value={t.id}>
          {tableName(t, lang)}
        </option>
      ))}
    </select>
  );
}

/* ---------------- Conditions ---------------- */

export function CondList({ at, list, conds, match, onChange }: { /** Where the conditions are, for the names they can use. */ at: Path; /** Their own place in the draft, for test ids. */ list: string; conds: Cond[]; match: Match | undefined; onChange: (conds: Cond[], match: Match | undefined) => void }) {
  const b = useBuilder();
  const lang = adminLang();
  const set = (k: number, patch: Partial<Cond>) => onChange(conds.map((c, i) => (i === k ? { ...c, ...patch } : c)), match);
  return (
    <div className="space-y-2" data-testid={`conds-${list}`}>
      {conds.map((c, k) => (
        <div key={k} className="flex flex-wrap items-start gap-2">
          <ValueInput at={at} value={c.left} onChange={(left) => set(k, { left })} placeholder="{{input.total}}" testid={`cond-${list}-${k}-left`} />
          <select
            className={`${field} shrink-0`}
            value={c.cmp}
            disabled={!b.canWrite}
            onChange={(e) => {
              const cmp = e.target.value as Cond["cmp"];
              // A question with nothing on its right keeps nothing there.
              onChange(conds.map((x, i) => (i === k ? (ALONE.includes(cmp) ? { left: x.left, cmp } : { left: x.left, cmp, right: x.right ?? "" }) : x)), match);
            }}
            data-testid={`cond-${list}-${k}-cmp`}
          >
            {(Object.keys(CMP_NAME) as Array<Cond["cmp"]>).map((cmp) => (
              <option key={cmp} value={cmp}>
                {say(CMP_NAME[cmp])}
              </option>
            ))}
          </select>
          {ALONE.includes(c.cmp) ? null : <ValueInput at={at} value={c.right} onChange={(right) => set(k, { right })} testid={`cond-${list}-${k}-right`} />}
          {b.canWrite ? (
            <button type="button" className="h-9 shrink-0 px-2 text-sm text-white/60 hover:text-red-300" onClick={() => onChange(conds.filter((_c, i) => i !== k), match)} aria-label={say("شيل الشرط|Remove the condition|הסרת התנאי")} data-testid={`cond-${list}-${k}-remove`}>
              ✕
            </button>
          ) : null}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        {b.canWrite ? (
          <button type="button" className="text-sm underline" onClick={() => onChange([...conds, { left: "", cmp: "eq", right: "" }], match)} data-testid={`cond-${list}-add`}>
            {say("＋ شرط|＋ condition|＋ תנאי")}
          </button>
        ) : null}
        {conds.length > 1 ? (
          <select className={field} value={match ?? "all"} disabled={!b.canWrite} onChange={(e) => onChange(conds, e.target.value === "any" ? "any" : undefined)} data-testid={`cond-${list}-match`}>
            <option value="all">{say("كلهم لازم يصحّوا|All of them hold|כולם מתקיימים")}</option>
            <option value="any">{say("واحد منهم بيكفي|Any one of them holds|אחד מהם מספיק")}</option>
          </select>
        ) : null}
      </div>
      <span className="sr-only">{condsLine(conds, match, lang)}</span>
    </div>
  );
}

/* ---------------- A step's own form ---------------- */

function ValuesForm({ at, table, values, onChange }: { at: Path; table: string; values: Record<string, Val>; onChange: (values: Record<string, Val>) => void }) {
  const b = useBuilder();
  const lang = adminLang();
  const id = atOf(at);
  const fields = b.tables.find((t) => t.id === table)?.fields ?? [];
  const free = fields.filter((f) => !(f.id in values));
  return (
    <div className="space-y-2" data-testid={`values-${id}`}>
      {Object.entries(values).map(([key, v]) => {
        const f = fields.find((x) => x.id === key.split(".")[0]);
        return (
          <div key={key} className="flex flex-wrap items-start gap-2">
            <span className="flex h-9 w-32 shrink-0 items-center truncate text-sm" title={key}>
              {f ? fieldName(f, lang) : key}
            </span>
            <ValueInput at={at} value={v} onChange={(next) => onChange({ ...values, [key]: next })} placeholder={f?.options?.length ? f.options.map((o) => o.id).join(" · ") : f?.type === "boolean" ? "true / false" : undefined} testid={`value-${id}-${key}`} />
            {b.canWrite ? (
              <button type="button" className="h-9 shrink-0 px-2 text-sm text-white/60 hover:text-red-300" onClick={() => onChange(Object.fromEntries(Object.entries(values).filter(([k]) => k !== key)))} aria-label={say("شيل الحقل|Remove the field|הסרת השדה")} data-testid={`value-${id}-${key}-remove`}>
                ✕
              </button>
            ) : null}
          </div>
        );
      })}
      {b.canWrite && free.length ? (
        <select
          className={`${field} text-white/70`}
          value=""
          onChange={(e) => {
            if (e.target.value) onChange({ ...values, [e.target.value]: "" });
          }}
          data-testid={`values-${id}-add`}
        >
          <option value="">{say("＋ حقل|＋ field|＋ שדה")}</option>
          {free.map((f) => (
            <option key={f.id} value={f.id}>
              {fieldName(f, lang)}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

function FiltersForm({ at, table, filters, match, onChange }: { at: Path; table: string; filters: Filter[]; match: Match | undefined; onChange: (filters: Filter[], match: Match | undefined) => void }) {
  const b = useBuilder();
  const lang = adminLang();
  const id = atOf(at);
  const fields = b.tables.find((t) => t.id === table)?.fields ?? [];
  const kind = (column: string) => kindOf(column, fields as never) ?? "text";
  const columnName = (column: string) => (column.startsWith("$") ? say(SYSTEM_NAME[column as (typeof SYSTEM)[number]] ?? column) : fieldName(fields.find((f) => f.id === column) ?? { id: column, name: null }, lang));
  const columns = [...fields.map((f) => f.id), "$status", "$slug", "$createdAt", "$updatedAt"];
  const set = (k: number, next: Filter) => onChange(filters.map((f, i) => (i === k ? next : f)), match);
  // "any of" takes a list: typed with commas between, or one name that is a list.
  const listOut = (v: Val | undefined) => (Array.isArray(v) ? v.map((x) => fromVal(x)).join(", ") : fromVal(v));
  const listIn = (v: Val): Val => (typeof v === "string" && !/^\{\{[^{}]+\}\}$/.test(v.trim()) ? v.split(",").map((x) => toVal(x.trim())).filter((x) => x !== "") : v);
  return (
    <div className="space-y-2" data-testid={`filters-${id}`}>
      {filters.map((f, k) => {
        const ops = b.ops[kind(f.field)] ?? [];
        const needs = opNeeds(f.op as never);
        return (
          <div key={k} className="flex flex-wrap items-start gap-2">
            <select
              className={`${field} max-w-[12rem] shrink-0`}
              value={f.field}
              disabled={!b.canWrite}
              onChange={(e) => {
                const next = e.target.value;
                const allowed = b.ops[kind(next)] ?? [];
                set(k, { field: next, op: allowed.includes(f.op) ? f.op : allowed[0] ?? "is", ...(f.value !== undefined ? { value: f.value } : {}) });
              }}
              data-testid={`filter-${id}-${k}-field`}
            >
              {!columns.includes(f.field) ? <option value={f.field}>{f.field}</option> : null}
              {columns.map((c) => (
                <option key={c} value={c}>
                  {columnName(c)}
                </option>
              ))}
            </select>
            <select className={`${field} shrink-0`} value={f.op} disabled={!b.canWrite} onChange={(e) => set(k, { ...f, op: e.target.value as Op })} data-testid={`filter-${id}-${k}-op`}>
              {(ops.includes(f.op) ? ops : [f.op, ...ops]).map((op) => (
                <option key={op} value={op}>
                  {say(opName(op as never, kind(f.field) as never))}
                </option>
              ))}
            </select>
            {needs === "none" ? null : needs === "list" ? (
              <ValueInput at={at} plain value={listOut(f.value)} onChange={(v) => set(k, { ...f, value: listIn(v) })} placeholder="a, b, c" testid={`filter-${id}-${k}-value`} />
            ) : (
              <ValueInput at={at} value={f.value} onChange={(value) => set(k, { ...f, value })} testid={`filter-${id}-${k}-value`} />
            )}
            {needs === "two" ? <ValueInput at={at} value={f.value2} onChange={(value2) => set(k, { ...f, value2 })} testid={`filter-${id}-${k}-value2`} /> : null}
            {b.canWrite ? (
              <button type="button" className="h-9 shrink-0 px-2 text-sm text-white/60 hover:text-red-300" onClick={() => onChange(filters.filter((_f, i) => i !== k), match)} aria-label={say("شيل الشرط|Remove the condition|הסרת התנאי")} data-testid={`filter-${id}-${k}-remove`}>
                ✕
              </button>
            ) : null}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        {b.canWrite && columns.length ? (
          <button type="button" className="text-sm underline" onClick={() => onChange([...filters, { field: columns[0], op: (b.ops[kind(columns[0])] ?? ["is"])[0], value: "" }], match)} data-testid={`filter-${id}-add`}>
            {say("＋ شرط على السطور|＋ a condition on the rows|＋ תנאי על השורות")}
          </button>
        ) : null}
        {filters.length > 1 ? (
          <select className={field} value={match ?? "all"} disabled={!b.canWrite} onChange={(e) => onChange(filters, e.target.value === "any" ? "any" : undefined)}>
            <option value="all">{say("كلهم|All of them|כולם")}</option>
            <option value="any">{say("واحد منهم|Any of them|אחד מהם")}</option>
          </select>
        ) : null}
      </div>
    </div>
  );
}

const STATUSES: RowStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

function StepForm({ path, step }: { path: Path; step: Step }) {
  const b = useBuilder();
  const lang = adminLang();
  const id = atOf(path);
  const set = (next: Step) => b.change(setStep(b.def, path, next));
  const keepAs = (as: string | undefined, onChange: (as: string | undefined) => void, optional = true) => (
    <Row name={say("احفظه باسم|Keep it as|לשמור בשם")}>
      <NameInput value={as} onChange={onChange} optional={optional} placeholder={optional ? say("بدون اسم|no name|ללא שם") : undefined} testid={`step-${id}-as`} />
    </Row>
  );
  const status = (value: RowStatus | undefined, onChange: (s: RowStatus | undefined) => void, none: string) => (
    <Row name={say("الحالة|Status|מצב")}>
      <select className={field} value={value ?? ""} disabled={!b.canWrite} onChange={(e) => onChange((e.target.value || undefined) as RowStatus | undefined)} data-testid={`step-${id}-status`}>
        <option value="">{none}</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {say(STATUS_NAME[s])}
          </option>
        ))}
      </select>
    </Row>
  );
  const row = (value: Val, onChange: (v: Val) => void) => (
    <Row name={say("أي سطر|Which row|איזו שורה")}>
      <ValueInput at={path} value={value} onChange={onChange} placeholder={say("رقمه، عنوانه، أو {{row}}|its id, its address, or {{row}}|המזהה, הכתובת או {{row}}")} testid={`step-${id}-row`} />
    </Row>
  );
  const table = (value: string, onChange: (t: string) => void) => (
    <Row name={say("الجدول|Table|טבלה")}>
      <TablePick value={value} onChange={onChange} testid={`step-${id}-table`} />
    </Row>
  );
  const words = (name: string, value: string | undefined, onChange: (v: string) => void, opts: { long?: boolean; placeholder?: string; key: string }) => (
    <Row name={name}>
      <ValueInput at={path} plain long={opts.long} value={value ?? ""} onChange={(v) => onChange(String(v))} placeholder={opts.placeholder} testid={`step-${id}-${opts.key}`} />
    </Row>
  );

  switch (step.act) {
    case "find": {
      const fields = b.tables.find((t) => t.id === step.table)?.fields ?? [];
      const sort = step.sort?.[0];
      return (
        <>
          {table(step.table, (t) => set({ act: "find", table: t, as: step.as, ...(step.limit ? { limit: step.limit } : {}) }))}
          <FiltersForm at={path} table={step.table} filters={step.filters ?? []} match={step.match} onChange={(filters, match) => set({ ...step, filters: filters.length ? filters : undefined, match })} />
          <Row name={say("الترتيب|Order|סדר")}>
            <select className={`${field} max-w-[12rem]`} value={sort?.field ?? ""} disabled={!b.canWrite} onChange={(e) => set({ ...step, sort: e.target.value ? [{ field: e.target.value, dir: sort?.dir ?? "asc" }] : undefined })} data-testid={`step-${id}-sort`}>
              <option value="">{say("متل ما هم|As they are|כמו שהן")}</option>
              {[...fields.filter((f) => f.type !== "relation").map((f) => f.id), "$createdAt", "$updatedAt"].map((c) => (
                <option key={c} value={c}>
                  {c.startsWith("$") ? say(SYSTEM_NAME[c as (typeof SYSTEM)[number]]) : fieldName(fields.find((f) => f.id === c)!, lang)}
                </option>
              ))}
            </select>
            {sort ? (
              <select className={field} value={sort.dir ?? "asc"} disabled={!b.canWrite} onChange={(e) => set({ ...step, sort: [{ field: sort.field, dir: e.target.value as "asc" | "desc" }] })}>
                <option value="asc">{say("من الأصغر|Smallest first|מהקטן")}</option>
                <option value="desc">{say("من الأكبر|Largest first|מהגדול")}</option>
              </select>
            ) : null}
          </Row>
          <Row name={say("لحد كم سطر|Up to how many|עד כמה שורות")}>
            <input type="number" min={1} max={200} className={`${field} w-24`} value={step.limit ?? 50} disabled={!b.canWrite} onChange={(e) => set({ ...step, limit: Math.max(1, Math.min(200, Math.round(Number(e.target.value) || 1))) })} data-testid={`step-${id}-limit`} />
          </Row>
          {keepAs(step.as, (as) => as && set({ ...step, as }), false)}
        </>
      );
    }
    case "get":
      return (
        <>
          {table(step.table, (t) => set({ ...step, table: t }))}
          {row(step.row, (v) => set({ ...step, row: v }))}
          {keepAs(step.as, (as) => as && set({ ...step, as }), false)}
        </>
      );
    case "add":
      return (
        <>
          {table(step.table, (t) => set({ act: "add", table: t, values: {}, ...(step.status ? { status: step.status } : {}), ...(step.as ? { as: step.as } : {}) }))}
          <ValuesForm at={path} table={step.table} values={step.values} onChange={(values) => set({ ...step, values })} />
          {status(step.status, (s) => set({ ...step, status: s }), say(STATUS_NAME.DRAFT))}
          <Row name={say("صاحب السطر|The row's owner|בעל השורה")}>
            <ValueInput
              at={path}
              value={step.owner}
              onChange={(v) => set({ ...step, owner: v === "" ? undefined : v })}
              placeholder={say("فاضي = سطر للمتجر · {{caller}} = الزبون اللي نادى|empty = the store's row · {{caller}} = the shopper who called|ריק = שורה של החנות · {{caller}} = הלקוח שקרא")}
              testid={`step-${id}-owner`}
            />
          </Row>
          {keepAs(step.as, (as) => set({ ...step, as }))}
        </>
      );
    case "change":
      return (
        <>
          {table(step.table, (t) => set({ act: "change", table: t, row: step.row, values: {}, ...(step.as ? { as: step.as } : {}) }))}
          {row(step.row, (v) => set({ ...step, row: v }))}
          <ValuesForm at={path} table={step.table} values={step.values} onChange={(values) => set({ ...step, values })} />
          {status(step.status, (s) => set({ ...step, status: s }), say("متل ما هي|As it is|כמו שהוא"))}
          {keepAs(step.as, (as) => set({ ...step, as }))}
        </>
      );
    case "delete":
      return (
        <>
          {table(step.table, (t) => set({ ...step, table: t }))}
          {row(step.row, (v) => set({ ...step, row: v }))}
          <p className="text-xs text-white/60">{say("بيروح لسلة المحذوفات، وبترجّعه منها خلال 30 يوم.|It goes to the trash; you can bring it back within 30 days.|השורה עוברת לאשפה, וניתן להחזיר אותה תוך 30 יום.")}</p>
        </>
      );
    case "set":
      return (
        <Row name={say("الاسم|Name|שם")}>
          <NameInput value={step.name} onChange={(name) => name && set({ ...step, name })} testid={`step-${id}-name`} />
          <select className={field} value={step.op ?? "set"} disabled={!b.canWrite} onChange={(e) => set({ ...step, op: e.target.value === "set" ? undefined : (e.target.value as "add" | "multiply" | "append") })} data-testid={`step-${id}-op`}>
            {(Object.keys(SET_OP) as Array<keyof typeof SET_OP>).map((op) => (
              <option key={op} value={op}>
                {say(SET_OP[op])}
              </option>
            ))}
          </select>
          <ValueInput at={path} value={step.value} onChange={(value) => set({ ...step, value })} testid={`step-${id}-value`} />
        </Row>
      );
    case "if":
      return <CondList at={path} list={id} conds={step.if} match={step.match} onChange={(conds, match) => set({ ...step, if: conds, match })} />;
    case "each":
      return (
        <>
          <Row name={say("القائمة|The list|הרשימה")}>
            <ValueInput at={path} plain value={step.list} onChange={(v) => set({ ...step, list: String(v) })} placeholder="{{rows}}" testid={`step-${id}-list`} />
          </Row>
          <Row name={say("كل واحد اسمه|Each one is called|כל אחד נקרא")}>
            <NameInput value={step.as} onChange={(as) => set({ ...step, as })} optional placeholder="item" testid={`step-${id}-as`} />
          </Row>
        </>
      );
    case "call": {
      const callee = b.fns.find((f) => f.id === step.fn);
      return (
        <>
          <Row name="Function">
            <select className={`${field} max-w-[16rem]`} value={step.fn} disabled={!b.canWrite} onChange={(e) => set({ act: "call", fn: e.target.value, input: {}, ...(step.as ? { as: step.as } : {}) })} data-testid={`step-${id}-fn`}>
              {!callee ? <option value={step.fn}>{step.fn ? say("function انحذفت|A deleted function|פונקציה שנמחקה") : say("اختار function|Pick a function|בחירת פונקציה")}</option> : null}
              {b.fns.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.published ? "" : ` (${say("مش منشورة|not published|לא פורסמה")})`}
                </option>
              ))}
            </select>
          </Row>
          {(callee?.takes ?? []).map((i) => (
            <Row key={i.name} name={`${i.name}${i.required ? " *" : ""}`}>
              <ValueInput at={path} value={step.input?.[i.name]} onChange={(v) => set({ ...step, input: { ...(step.input ?? {}), [i.name]: v } })} testid={`step-${id}-input-${i.name}`} />
            </Row>
          ))}
          {keepAs(step.as, (as) => set({ ...step, as }))}
        </>
      );
    }
    case "stop":
      return words(say("السبب|The reason|הסיבה"), step.message, (message) => set({ ...step, message }), { key: "message", placeholder: say("ما في زبون بهالإيميل|No customer with this email|אין לקוח עם האימייל הזה") });
    case "return":
      return (
        <Row name={say("الجواب|The answer|התשובה")}>
          <ValueInput at={path} value={step.value} onChange={(value) => set({ ...step, value })} placeholder={'{{row}}  ·  {"id": "{{row.$id}}"}'} testid={`step-${id}-value`} />
        </Row>
      );
    case "notify":
      return (
        <>
          {words(say("العنوان|Title|כותרת"), step.title, (title) => set({ ...step, title }), { key: "title" })}
          {words(say("النص|Text|טקסט"), step.text, (text) => set({ ...step, text: text || undefined }), { key: "text" })}
          {words(say("رابط بالأدمن|A link in the admin|קישור בניהול"), step.link, (link) => set({ ...step, link: link || undefined }), { key: "link", placeholder: "/admin/data" })}
        </>
      );
    case "email":
      return (
        <>
          {words(say("لمين|To|אל"), step.to, (to) => set({ ...step, to: to || undefined }), { key: "to", placeholder: say("فاضي = إيميل المتجر|empty = the shop's email|ריק = האימייל של החנות") })}
          {words(say("العنوان|Subject|נושא"), step.subject, (subject) => set({ ...step, subject }), { key: "subject" })}
          {words(say("النص|Text|טקסט"), step.text, (text) => set({ ...step, text }), { key: "text", long: true })}
        </>
      );
    default:
      return (
        <>
          {words(say("لمين|To|אל"), step.to, (to) => set({ ...step, to: to || undefined }), { key: "to", placeholder: say("فاضي = رقم المتجر|empty = the shop's number|ריק = המספר של החנות") })}
          {words(say("النص|Text|טקסט"), step.text, (text) => set({ ...step, text }), { key: "text", long: true })}
        </>
      );
  }
}

/* ---------------- The cards ---------------- */

/** A line of words with names in it ({{order.total}}): the names read left to right, whichever way the page's words run. */
export function Line({ text }: { text: string }) {
  // A thing or a list written out ({"id": "{{row.$id}}"}) is all left to right.
  if (/^[[{]/.test(text) && !text.startsWith("{{")) return <bdi dir="ltr">{text}</bdi>;
  return (
    <>
      {text.split(/(\{\{[^{}]*\}\})/).map((part, k) =>
        k % 2 ? (
          <bdi key={k} dir="ltr">
            {part}
          </bdi>
        ) : (
          part
        ),
      )}
    </>
  );
}

function StepCard({ path, step, last }: { path: Path; step: Step; last: boolean }) {
  const b = useBuilder();
  const lang = adminLang();
  const id = atOf(path);
  const open = b.openAt === id;
  const problems = b.problems.filter((p) => p.at === id || p.at.startsWith(`${id}.if.`));
  const failed = b.failedAt === id;
  const n = Number(path[path.length - 1]);
  const inner = (name: "do" | "else", title: string) => (
    <div className="mt-3 border-s-2 border-white/10 ps-3">
      <div className={`${label} mb-2`}>{title}</div>
      <StepList list={[...path, name]} />
    </div>
  );
  return (
    <li className={`rounded-xl border p-3 ${failed ? "border-red-400/60" : problems.length ? "border-amber-400/50" : "border-white/10"} bg-white/[0.03]`} data-testid={`step-${id}`} data-act={step.act} data-open={open}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-start" onClick={() => b.setOpenAt(open ? null : id)} aria-expanded={open} data-testid={`step-${id}-head`}>
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs">{n + 1}</span>
          <span className="shrink-0 text-sm font-medium">{say(ACT_NAME[step.act])}</span>
          <span className="min-w-0 basis-full truncate text-sm text-white/60 sm:flex-1 sm:basis-0" data-testid={`step-${id}-line`}>
            <Line text={stepLine(step, b, lang)} />
          </span>
        </button>
        {b.canWrite ? (
          <div className="flex shrink-0 items-center">
            <button type="button" className="h-8 w-8 text-white/60 hover:text-white disabled:opacity-30" disabled={n === 0} onClick={() => { b.change(moveStep(b.def, path, -1)); b.setOpenAt(null); }} aria-label={say("لفوق|Move up|למעלה")} data-testid={`step-${id}-up`}>
              ↑
            </button>
            <button type="button" className="h-8 w-8 text-white/60 hover:text-white disabled:opacity-30" disabled={last} onClick={() => { b.change(moveStep(b.def, path, 1)); b.setOpenAt(null); }} aria-label={say("لتحت|Move down|למטה")} data-testid={`step-${id}-down`}>
              ↓
            </button>
            <button type="button" className="h-8 w-8 text-white/60 hover:text-red-300" onClick={() => { b.change(removeStep(b.def, path)); b.setOpenAt(null); }} aria-label={say("شيل الخطوة|Remove the step|הסרת השלב")} data-testid={`step-${id}-remove`}>
              ✕
            </button>
          </div>
        ) : null}
      </div>
      {problems.length ? (
        <ul className="mt-2 space-y-0.5 text-xs text-amber-300" data-testid={`step-${id}-problems`}>
          {problems.map((p, k) => (
            <li key={k}>{problemText(p.message, lang)}</li>
          ))}
        </ul>
      ) : null}
      {open ? <div className="mt-3 space-y-3">{<StepForm path={path} step={step} />}</div> : null}
      {step.act === "if" ? (
        <>
          {inner("do", say("إذا صحّ:|If so:|אם כן:"))}
          {step.else ? (
            inner("else", say("وإلا:|Else:|אחרת:"))
          ) : b.canWrite ? (
            <button type="button" className="mt-2 text-xs underline" onClick={() => b.change(setList(b.def, [...path, "else"], []))} data-testid={`step-${id}-else-add`}>
              {say("＋ «وإلا»|＋ “else”|＋ «אחרת»")}
            </button>
          ) : null}
          {step.else && !step.else.length && b.canWrite ? (
            <button type="button" className="mt-2 text-xs underline" onClick={() => b.change(setList(b.def, [...path, "else"], undefined))} data-testid={`step-${id}-else-remove`}>
              {say("شيل «وإلا»|Remove “else”|הסרת «אחרת»")}
            </button>
          ) : null}
        </>
      ) : null}
      {step.act === "each" ? inner("do", say("لكل واحد:|For each one:|לכל אחד:")) : null}
    </li>
  );
}

/** The steps of one list, and the menu that adds one at its end. `fail`: only what a function may do after a failure. */
export function StepList({ list, fail }: { list: Path; fail?: boolean }) {
  const b = useBuilder();
  const id = atOf(list);
  const steps = listAt(b.def, list);
  const groups = GROUPS.map((g) => ({ ...g, acts: g.acts.filter((a) => !fail || FAIL_ACTS.includes(a)) })).filter((g) => g.acts.length);
  return (
    <div data-testid={`steps-${id}`}>
      {steps.length ? (
        <ol className="space-y-2">
          {steps.map((s, k) => (
            <StepCard key={k} path={[...list, k]} step={s} last={k === steps.length - 1} />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-white/60" data-testid={`steps-${id}-empty`}>
          {say("ما في خطوات هون لسا.|No steps here yet.|עדיין אין כאן שלבים.")}
        </p>
      )}
      {b.canWrite ? (
        <select
          className={`${field} mt-2 text-white/80`}
          value=""
          aria-label={say("أضف خطوة|Add a step|הוספת שלב")}
          onChange={(e) => {
            const act = e.target.value as StepKind;
            if (!act) return;
            b.change(addStep(b.def, list, newStep(act, { tables: b.tables, fns: b.fns, def: b.def })));
            b.setOpenAt(atOf([...list, steps.length]));
          }}
          data-testid={`steps-${id}-add`}
        >
          <option value="">{say("＋ أضف خطوة|＋ Add a step|＋ הוספת שלב")}</option>
          {groups.map((g) => (
            <optgroup key={g.key} label={say(GROUP_NAME[g.key])}>
              {g.acts.map((a) => (
                <option key={a} value={a}>
                  {say(ACT_NAME[a])}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      ) : null}
    </div>
  );
}
