/**
 * The data grid's cells: how a value shows, the small editor a cell opens into, and the input for
 * one value of a kind of column (also used by filters, "set a value", the row's form, the fields
 * editor's defaults and the older item form). Values pass as the words in a box (./kinds.ts).
 */
import { useEffect, useRef, useState } from "react";
import { say } from "../../studio/say";
import type { CollectionField } from "../../api/collections.api";
import type { ColumnKind, GridRow, Lang, LinkedFrom } from "../../api/data.api";
import { STATUS_NAME, cellText, type Column } from "./dataText";
import { choiceName, draftFrom, linkedName, linkedOf, mapLink, placeJoin, placeParts } from "./kinds";
import { RelationInput } from "./RelationInput";
import { RichTextBox } from "./RichTextBox";
import { privateFile } from "../../api/data.api";

/** A field as wide as its words (a small select beside others), and one that fills its place. */
export const field = "rounded-lg border border-white/15 bg-surface-925 px-2 py-1 text-sm";
export const input = `${field} w-full`;
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const STATUS_TONE: Record<string, string> = { DRAFT: "bg-white/10 text-white/70", PUBLISHED: "bg-emerald-500/15 text-emerald-300", ARCHIVED: "bg-amber-500/15 text-amber-300" };
const chip = "inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs";
const safeLink = (v: unknown) => (typeof v === "string" && /^(https:\/\/|\/(?!\/))/.test(v) ? v : null);

/** Who links a row through one relation: how many rows, the first few by name, and how many more there are. */
export function FromCell({ got, lang }: { got: LinkedFrom | undefined; lang: Lang }) {
  if (!got?.n) return null;
  return (
    <span className="flex max-w-[22rem] flex-wrap items-center gap-1" data-testid="cell-from" data-count={got.n}>
      <span className="rounded-full bg-accent-500/20 px-1.5 text-xs tabular-nums" title={say("كم سطر مربوط فيه|Rows that link it|שורות המקושרות אליו")}>
        {got.n.toLocaleString("en")}
      </span>
      {got.rows.map((r) => (
        <span key={r.id} className={chip} title={r.slug}>
          <bdi>{linkedName(r, lang)}</bdi>
        </span>
      ))}
      {got.n > got.rows.length ? <span className="text-xs text-white/45" dir="ltr">+{(got.n - got.rows.length).toLocaleString("en")}</span> : null}
    </span>
  );
}

/** A cell as it shows in the grid. */
/** A private file a shopper uploaded ("file:<id>"): opened through a link the server makes now, that runs out. */
function PrivateFile({ tableId, fileId }: { tableId?: string; fileId: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!tableId) return <span className={chip}>🔒 {say("ملف خاص|A private file|קובץ פרטי")}</span>;
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs underline decoration-white/25 underline-offset-2 disabled:opacity-50"
      disabled={busy}
      onClick={async (e) => {
        e.stopPropagation();
        setBusy(true);
        setFailed(false);
        // Opened before the answer comes, so the browser lets it open; then sent where the link points.
        const tab = window.open("about:blank", "_blank");
        try {
          const f = await privateFile(tableId, fileId);
          if (tab) {
            tab.opener = null;
            tab.location.href = f.url;
          }
          else window.open(f.url, "_blank", "noopener");
        } catch {
          tab?.close();
          setFailed(true);
        } finally {
          setBusy(false);
        }
      }}
      data-testid={`private-file-${fileId}`}
    >
      🔒 {failed ? say("ما انفتح|Didn't open|לא נפתח") : say("ملف خاص: افتحه|A private file: open it|קובץ פרטי: פתיחה")}
    </button>
  );
}

export function CellView({ column, row, lang, tableId }: { column: Column; row: GridRow; lang: Lang; /** The table: a private file in it is opened through it. */ tableId?: string }) {
  const v = row.data?.[column.id];
  const ref = (column.kind === "image" || column.kind === "file") && typeof v === "string" ? /^file:([a-z0-9]{20,40})$/.exec(v)?.[1] : undefined;
  if (ref) return <PrivateFile tableId={tableId} fileId={ref} />;
  const text = cellText(column, row, lang);
  if (column.id === "$status") return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_TONE[row.status]}`}>{say(text)}</span>;
  if (column.id === "$slug") return <span className="font-mono text-xs text-white/70" dir="ltr">{text}</span>;
  if (column.kind === "$from") return <FromCell got={row.from?.[column.id]} lang={lang} />;
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
    case "relation":
      // The linked rows, each by its name.
      return (
        <span className="flex max-w-[22rem] flex-wrap gap-1">
          {linkedOf(v).map((r) => (
            <span key={r.id} className={`${chip} ${r.hidden ? "bg-white/[0.06] text-white/55" : "bg-accent-500/15"}`} title={r.hidden ? undefined : r.slug} data-hidden={r.hidden ? "" : undefined}>
              <bdi>{linkedName(r, lang)}</bdi>
            </span>
          ))}
        </span>
      );
    case "email":
      return (
        <a href={`mailto:${String(v)}`} className="underline decoration-white/25 underline-offset-2" dir="ltr">
          {text}
        </a>
      );
    case "customer": {
      // The shopper it points at: their name when an account has that email (and the member may see the customers), then the email.
      const who = row.customers?.[column.id];
      return (
        <span className="inline-flex max-w-[22rem] items-center gap-1.5" data-testid={`customer-${column.id}`}>
          {who ? <span className={`${chip} bg-accent-500/15`} title={say("زبون عنده حساب بهالإيميل|A customer with an account at this address|לקוח עם חשבון בכתובת הזו")}><bdi>{who.name || say("زبون|a customer|לקוח")}</bdi></span> : null}
          <bdi dir="ltr" className="truncate text-white/75">{text}</bdi>
        </span>
      );
    }
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
    case "customer":
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
    case "relation":
      return f ? <RelationInput field={f} value={value} onChange={onChange} lang={lang} autoFocus={autoFocus} onKeyDown={onKeyDown} testId={testId} /> : null;
    case "json":
      return <textarea {...common} rows={big ? 6 : 3} dir="ltr" spellCheck={false} className={`${input} font-mono text-xs`} value={value} placeholder='{ "key": "value" }' onChange={(e) => onChange(e.target.value)} />;
    case "longText":
      return big ? <textarea {...common} rows={4} value={value} onChange={(e) => onChange(e.target.value)} /> : text({});
    case "richText":
      // Its marks from a bar over the box, and how a page draws them (RichTextBox.tsx).
      return big ? <RichTextBox value={value} onChange={onChange} className={input} testId={testId} /> : <textarea {...common} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />;
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
  // The owner's tables hold words per language; the store's own hold them plain.
  if (column.kind === "text" || column.kind === "longText" || column.kind === "richText") return typeof v === "string" ? v : v && typeof v === "object" ? ((v as Record<string, string>)[lang] ?? "") : "";
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
  const pick = column.kind === "select" || column.kind === "boolean" || column.kind === "$status" || (column.kind === "relation" && !column.field?.many);
  useEffect(() => {
    if (pick && draft !== first.current) finish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  const long = column.kind === "longText" || column.kind === "richText";
  // Several boxes in one cell (choices, a place): leaving the cell saves, moving between its boxes doesn't.
  const many = column.kind === "multiSelect" || column.kind === "location" || column.kind === "relation";
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
