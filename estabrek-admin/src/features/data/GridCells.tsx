/**
 * The data grid's cells: how a value shows, the small editor a cell opens into, and the input for
 * one value of a kind of column (also used by filters, "set a value" and the row's form).
 */
import { useEffect, useRef, useState } from "react";
import { say } from "../../studio/say";
import type { CollectionField } from "../../api/collections.api";
import type { ColumnKind, GridRow, Lang } from "../../api/data.api";
import { STATUS_NAME, cellText, type Column } from "./dataText";

/** A field as wide as its words (a small select beside others), and one that fills its place. */
export const field = "rounded-lg border border-white/15 bg-surface-925 px-2 py-1 text-sm";
export const input = `${field} w-full`;
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const STATUS_TONE: Record<string, string> = { DRAFT: "bg-white/10 text-white/70", PUBLISHED: "bg-emerald-500/15 text-emerald-300", ARCHIVED: "bg-amber-500/15 text-amber-300" };
const optionName = (o: { id: string; name?: Partial<Record<Lang, string>> }, lang: Lang) => o.name?.[lang] || o.name?.ar || o.name?.en || o.name?.he || o.id;

/** A cell as it shows in the grid. */
export function CellView({ column, row, lang }: { column: Column; row: GridRow; lang: Lang }) {
  const v = row.data?.[column.id];
  const text = cellText(column, row, lang);
  if (column.id === "$status") return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_TONE[row.status]}`}>{say(text)}</span>;
  if (column.id === "$slug") return <span className="font-mono text-xs text-white/70" dir="ltr">{text}</span>;
  if (column.kind === "image" && typeof v === "string" && v) return <img src={v} alt="" loading="lazy" className="h-8 w-8 rounded object-cover" />;
  if (column.kind === "color" && typeof v === "string" && v) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs" dir="ltr">
        <span className="h-4 w-4 rounded border border-white/20" style={{ background: v }} />
        {v}
      </span>
    );
  }
  if (column.kind === "link" || column.kind === "number" || column.kind === "date") return <span dir="ltr" className="tabular-nums">{text}</span>;
  return <span className="block max-w-[22rem] truncate" title={text.length > 40 ? text : undefined}>{text}</span>;
}

/** One value of a kind of column: a number, a date, a choice, words… `value` and `onChange` speak strings (and booleans). */
export function ValueInput({
  kind,
  field,
  value,
  onChange,
  lang,
  autoFocus,
  onKeyDown,
  onBlur,
  testId,
  big,
}: {
  kind: ColumnKind;
  field?: CollectionField;
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onBlur?: () => void;
  testId?: string;
  big?: boolean;
}) {
  const common = { autoFocus, onKeyDown, onBlur, "data-testid": testId, className: input };
  if (kind === "$status") {
    return (
      <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {say(STATUS_NAME[s])}
          </option>
        ))}
      </select>
    );
  }
  if (kind === "select") {
    return (
      <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {(field?.options ?? []).map((o) => (
          <option key={o.id} value={o.id}>
            {optionName(o, lang)}
          </option>
        ))}
      </select>
    );
  }
  if (kind === "boolean") {
    return (
      <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        <option value="true">{say("نعم|Yes|כן")}</option>
        <option value="false">{say("لا|No|לא")}</option>
      </select>
    );
  }
  if (kind === "number") return <input {...common} type="number" step="any" dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} />;
  if (kind === "date" || kind === "$date") return <input {...common} type="date" dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} />;
  if (kind === "color") {
    return (
      <span className="flex items-center gap-1">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#c86b98"} onChange={(e) => onChange(e.target.value)} className="h-7 w-8 shrink-0 rounded border border-white/15 bg-transparent" aria-label={say("لون|Colour|צבע")} />
        <input {...common} dir="ltr" placeholder="#c86b98" value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    );
  }
  if (kind === "longText" && big) return <textarea {...common} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />;
  const ltr = kind === "image" || kind === "link" || kind === "$slug";
  return <input {...common} dir={ltr ? "ltr" : undefined} placeholder={kind === "image" ? "https://…" : kind === "link" ? "/shop" : undefined} value={value} onChange={(e) => onChange(e.target.value)} />;
}

/** What a cell's value is while it's being written, and back. */
export function draftOf(column: Column, row: GridRow, lang: Lang): string {
  if (column.id === "$slug") return row.slug;
  if (column.id === "$status") return row.status;
  const v = row.data?.[column.id];
  if (column.kind === "text" || column.kind === "longText") return v && typeof v === "object" ? ((v as Record<string, string>)[lang] ?? "") : "";
  if (column.kind === "boolean") return v === true ? "true" : v === false ? "false" : "";
  return v === undefined || v === null ? "" : String(v);
}

/** The cell open for writing: Enter (Ctrl+Enter in long text) or leaving it saves, Escape leaves it as it was. */
export function CellEditor({ column, row, lang, onSave, onCancel }: { column: Column; row: GridRow; lang: Lang; onSave: (draft: string) => void; onCancel: () => void }) {
  const first = useRef(draftOf(column, row, lang));
  const [draft, setDraft] = useState(first.current);
  const done = useRef(false);
  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    if (save && draft !== first.current) onSave(draft);
    else onCancel();
  };
  // A choice is made with one press: saved as soon as it changes.
  const pick = column.kind === "select" || column.kind === "boolean" || column.kind === "$status";
  useEffect(() => {
    if (pick && draft !== first.current) finish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  const long = column.kind === "longText";
  return (
    <div className={long ? "min-w-[18rem]" : "min-w-[9rem]"}>
      <ValueInput
        kind={column.kind}
        field={column.field}
        lang={lang}
        value={draft}
        onChange={setDraft}
        autoFocus
        big={long}
        testId="cell-editor"
        onBlur={() => finish(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            finish(false);
          } else if (e.key === "Enter" && (!long || e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            finish(true);
          }
        }}
      />
    </div>
  );
}
