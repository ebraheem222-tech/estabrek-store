/**
 * The data grid's cells: how a value shows, the small editor a cell opens into, and the input for
 * one value of a kind of column (also used by filters, "set a value", the row's form, the fields
 * editor's defaults and the older item form). Values pass as the words in a box (./kinds.ts).
 */
import { useEffect, useRef, useState } from "react";
import { say } from "../../studio/say";
import type { CollectionField } from "../../api/collections.api";
import type { ColumnKind, GridRow, Lang } from "../../api/data.api";
import { STATUS_NAME, cellText, type Column } from "./dataText";
import { choiceName, draftFrom, mapLink, placeJoin, placeParts } from "./kinds";

/** A field as wide as its words (a small select beside others), and one that fills its place. */
export const field = "rounded-lg border border-white/15 bg-surface-925 px-2 py-1 text-sm";
export const input = `${field} w-full`;
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const STATUS_TONE: Record<string, string> = { DRAFT: "bg-white/10 text-white/70", PUBLISHED: "bg-emerald-500/15 text-emerald-300", ARCHIVED: "bg-amber-500/15 text-amber-300" };
const chip = "inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs";
const safeLink = (v: unknown) => (typeof v === "string" && /^(https:\/\/|\/(?!\/))/.test(v) ? v : null);

/** A cell as it shows in the grid. */
export function CellView({ column, row, lang }: { column: Column; row: GridRow; lang: Lang }) {
  const v = row.data?.[column.id];
  const text = cellText(column, row, lang);
  if (column.id === "$status") return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_TONE[row.status]}`}>{say(text)}</span>;
  if (column.id === "$slug") return <span className="font-mono text-xs text-white/70" dir="ltr">{text}</span>;
  if (!text) return null;
  switch (column.kind) {
    case "image":
      return typeof v === "string" ? <img src={v} alt="" loading="lazy" className="h-8 w-8 rounded object-cover" /> : null;
    case "color":
      return (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs" dir="ltr">
          <span className="h-4 w-4 rounded border border-white/20" style={{ background: String(v) }} />
          {text}
        </span>
      );
    case "multiSelect":
      return (
        <span className="flex max-w-[22rem] flex-wrap gap-1">
          {(Array.isArray(v) ? v : []).map((id) => (
            <span key={String(id)} className={chip}>
              {column.field ? choiceName(column.field, String(id), lang) : String(id)}
            </span>
          ))}
        </span>
      );
    case "select":
      return <span className={chip}>{text}</span>;
    case "email":
      return (
        <a href={`mailto:${String(v)}`} className="underline decoration-white/25 underline-offset-2" dir="ltr">
          {text}
        </a>
      );
    case "file":
    case "video":
    case "model3d": {
      const href = safeLink(v);
      const mark = column.kind === "video" ? "▶" : column.kind === "model3d" ? "◈" : "📎";
      return href ? (
        <a href={href} target="_blank" rel="noreferrer" className="inline-flex max-w-[16rem] items-center gap-1 truncate underline decoration-white/25 underline-offset-2" dir="ltr" title={href}>
          <span aria-hidden>{mark}</span>
          {text}
        </a>
      ) : (
        <span dir="ltr">{text}</span>
      );
    }
    case "location": {
      const href = mapLink(v);
      return href ? (
        <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline decoration-white/25 underline-offset-2">
          <span aria-hidden>⌖</span>
          <bdi>{text}</bdi>
        </a>
      ) : (
        <span>{text}</span>
      );
    }
    case "json":
      return <code className="block max-w-[16rem] truncate text-xs text-white/70" dir="ltr">{text}</code>;
    case "link":
    case "number":
    case "money":
    case "date":
    case "datetime":
    case "phone":
      return <span dir="ltr" className="tabular-nums">{text}</span>;
    default:
      return <span className="block max-w-[22rem] truncate" title={text.length > 40 ? text : undefined}>{text}</span>;
  }
}

/** One value of a kind of column, as the words in its box (./kinds.ts turns them): a number, a date, choices, a place… */
export function ValueInput({
  kind,
  field: f,
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
  const text = (extra: React.InputHTMLAttributes<HTMLInputElement>) => <input {...common} {...extra} value={value} onChange={(e) => onChange(e.target.value)} />;
  switch (kind) {
    case "$status":
      return (
        <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {say(STATUS_NAME[s])}
            </option>
          ))}
        </select>
      );
    case "select":
      return (
        <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {(f?.options ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {f ? choiceName(f, o.id, lang) : o.id}
            </option>
          ))}
        </select>
      );
    case "multiSelect": {
      // The box's words are the picked ids, in the choices' own order.
      const picked = new Set(value.split(",").map((x) => x.trim()).filter(Boolean));
      const toggle = (id: string, on: boolean) => {
        if (on) picked.add(id);
        else picked.delete(id);
        onChange((f?.options ?? []).map((o) => o.id).filter((x) => picked.has(x)).join(","));
      };
      return (
        <span className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-white/15 bg-surface-925 px-2 py-1.5" data-testid={testId} onKeyDown={onKeyDown}>
          {(f?.options ?? []).map((o, i) => (
            <label key={o.id} className="flex items-center gap-1 text-xs text-white/85">
              <input type="checkbox" autoFocus={autoFocus && i === 0} checked={picked.has(o.id)} onChange={(e) => toggle(o.id, e.target.checked)} data-testid={testId ? `${testId}-${o.id}` : undefined} />
              {f ? choiceName(f, o.id, lang) : o.id}
            </label>
          ))}
        </span>
      );
    }
    case "boolean":
      return (
        <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          <option value="true">{say("نعم|Yes|כן")}</option>
          <option value="false">{say("لا|No|לא")}</option>
        </select>
      );
    case "number":
    case "money":
      return text({ type: "number", step: "any", dir: "ltr" });
    case "date":
    case "$date":
      return text({ type: "date", dir: "ltr" });
    case "datetime":
      return text({ type: "datetime-local", dir: "ltr" });
    case "email":
      return text({ type: "email", dir: "ltr", placeholder: "name@example.com" });
    case "phone":
      return text({ type: "tel", dir: "ltr", placeholder: "+970 599 000 000" });
    case "color":
      return (
        <span className="flex items-center gap-1">
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#c86b98"} onChange={(e) => onChange(e.target.value)} className="h-7 w-8 shrink-0 rounded border border-white/15 bg-transparent" aria-label={say("لون|Colour|צבע")} />
          {text({ dir: "ltr", placeholder: "#c86b98" })}
        </span>
      );
    case "location": {
      const p = placeParts(value);
      const part = (key: "lat" | "lng" | "label", extra: React.InputHTMLAttributes<HTMLInputElement>) => (
        <input {...extra} className={input} value={p[key]} onKeyDown={onKeyDown} onChange={(e) => onChange(placeJoin({ ...p, [key]: e.target.value.replace(/,/g, key === "label" ? "," : "") }))} data-testid={testId ? `${testId}-${key}` : undefined} />
      );
      return (
        <span className="grid grid-cols-[minmax(4.5rem,1fr)_minmax(4.5rem,1fr)_minmax(6rem,2fr)] gap-1" data-testid={testId}>
          {part("lat", { type: "number", step: "any", dir: "ltr", autoFocus, placeholder: say("خط العرض|Latitude|קו רוחב"), "aria-label": say("خط العرض|Latitude|קו רוחב") })}
          {part("lng", { type: "number", step: "any", dir: "ltr", placeholder: say("خط الطول|Longitude|קו אורך"), "aria-label": say("خط الطول|Longitude|קו אורך") })}
          {part("label", { placeholder: say("إسم المكان|The place's name|שם המקום"), "aria-label": say("إسم المكان|The place's name|שם המקום") })}
        </span>
      );
    }
    case "json":
      return <textarea {...common} rows={big ? 6 : 3} dir="ltr" spellCheck={false} className={`${input} font-mono text-xs`} value={value} placeholder='{ "key": "value" }' onChange={(e) => onChange(e.target.value)} />;
    case "longText":
      return big ? <textarea {...common} rows={4} value={value} onChange={(e) => onChange(e.target.value)} /> : text({});
    case "image":
    case "file":
    case "video":
    case "model3d":
      return text({ dir: "ltr", placeholder: kind === "model3d" ? "https://…/model.glb" : "https://…" });
    case "link":
      return text({ dir: "ltr", placeholder: "/shop" });
    case "$slug":
      return text({ dir: "ltr" });
    default:
      return text({});
  }
}

/** What a cell's value is while it's being written, and back. */
export function draftOf(column: Column, row: GridRow, lang: Lang): string {
  if (column.id === "$slug") return row.slug;
  if (column.id === "$status") return row.status;
  const v = row.data?.[column.id];
  if (column.kind === "text" || column.kind === "longText") return v && typeof v === "object" ? ((v as Record<string, string>)[lang] ?? "") : "";
  return column.field ? draftFrom(column.field, v) : v === undefined || v === null ? "" : String(v);
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
  // One choice is made with one press: saved as soon as it changes.
  const pick = column.kind === "select" || column.kind === "boolean" || column.kind === "$status";
  useEffect(() => {
    if (pick && draft !== first.current) finish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  const long = column.kind === "longText";
  // Several boxes in one cell (choices, a place): leaving the cell saves, moving between its boxes doesn't.
  const many = column.kind === "multiSelect" || column.kind === "location";
  return (
    <div
      className={long || many ? "min-w-[18rem]" : "min-w-[9rem]"}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) finish(true);
      }}
    >
      <ValueInput
        kind={column.kind}
        field={column.field}
        lang={lang}
        value={draft}
        onChange={setDraft}
        autoFocus
        big={long}
        testId="cell-editor"
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
