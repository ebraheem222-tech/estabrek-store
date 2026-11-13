/**
 * A relation's box (B3): the rows it links as chips, and a search of the linked table to pick
 * from. One row or several, by the field. Its value is the box's words (./kinds.ts linksDraft):
 * the linked rows with their names, so the chips read without asking the server again.
 */
import { useEffect, useState } from "react";
import { say } from "../../studio/say";
import type { CollectionField, Linked } from "../../api/collections.api";
import { lookupRows } from "../../api/data.api";
import { draftLinks, linkedName, linksDraft, type Lang } from "./kinds";

const chip = "inline-flex items-center gap-1 rounded-full bg-accent-500/15 px-2 py-0.5 text-xs text-white/90";

export function RelationInput({
  field,
  value,
  onChange,
  lang,
  autoFocus,
  onKeyDown,
  testId,
}: {
  field: Pick<CollectionField, "to" | "many">;
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  testId?: string;
}) {
  const picked = draftLinks(value);
  const [search, setSearch] = useState("");
  // The list opens when the box is used (in a cell: at once).
  const [open, setOpen] = useState(!!autoFocus);
  const [found, setFound] = useState<{ rows: Linked[]; total: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const id = (part: string) => (testId ? `${testId}-${part}` : undefined);

  // The linked table's rows, found by the written words (the typing is waited for).
  useEffect(() => {
    if (!open || !field.to) return;
    let stale = false;
    const timer = setTimeout(
      () => {
        lookupRows(field.to!, search)
          .then((out) => {
            if (stale) return;
            setFound(out);
            setFailed(false);
          })
          .catch(() => {
            if (!stale) setFailed(true);
          });
      },
      search ? 250 : 0,
    );
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [open, field.to, search]);

  const has = (rowId: string) => picked.some((p) => p.id === rowId);
  const toggle = (row: Linked) => {
    // One row: the new one takes the place of the old. Several: added after the others, or taken out.
    const next = has(row.id) ? picked.filter((p) => p.id !== row.id) : field.many ? [...picked, row] : [row];
    onChange(linksDraft(next));
  };

  if (!field.to) return <span className="block text-xs text-amber-300">{say("اختار الجدول اللي بيرتبط فيه من قواعد الحقل.|Choose the table it links in the field's rules.|בחר בכללי השדה את הטבלה המקושרת.")}</span>;
  return (
    <span className="block rounded-lg border border-white/15 bg-surface-925 p-1.5" data-testid={testId} onKeyDown={onKeyDown}>
      <span className="flex flex-wrap items-center gap-1">
        {picked.map((row) => (
          <span key={row.id} className={chip} data-testid={id(`chosen-${row.slug}`)}>
            <bdi>{linkedName(row, lang)}</bdi>
            <button type="button" className="text-white/60 hover:text-white" onClick={() => toggle(row)} aria-label={say("فك الربط|Unlink|בטל קישור")} data-testid={id(`remove-${row.slug}`)}>
              ×
            </button>
          </span>
        ))}
        <input
          className="min-w-[7rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-white/35"
          value={search}
          autoFocus={autoFocus}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          placeholder={field.many ? say("دوّر على سطور لتربطها…|Find rows to link…|חפש שורות לקישור…") : say("دوّر على سطر لتربطه…|Find a row to link…|חפש שורה לקישור…")}
          aria-label={say("دوّر بالجدول المربوط|Search the linked table|חיפוש בטבלה המקושרת")}
          data-testid={id("search")}
        />
      </span>
      {open ? (
        <span className="mt-1 block max-h-44 overflow-y-auto border-t border-white/10 pt-1" data-testid={id("list")}>
          {failed ? <span className="block px-1 py-1 text-xs text-red-300">{say("ما قدرنا نجيب السطور.|The rows couldn't be read.|לא ניתן היה לקרוא את השורות.")}</span> : null}
          {!failed && !found ? <span className="block px-1 py-1 text-xs text-white/40">…</span> : null}
          {!failed && found && !found.rows.length ? (
            <span className="block px-1 py-1 text-xs text-white/50" data-testid={id("none")}>
              {search ? say("ما في سطر بهالكلام.|No row with these words.|אין שורה עם המילים האלה.") : say("الجدول المربوط فاضي.|The linked table is empty.|הטבלה המקושרת ריקה.")}
            </span>
          ) : null}
          {!failed && found
            ? found.rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => toggle(row)}
                  aria-pressed={has(row.id)}
                  data-testid={id(`pick-${row.slug}`)}
                  className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-start text-xs hover:bg-white/10 ${has(row.id) ? "text-accent-200" : "text-white/85"}`}
                >
                  <span className="w-3 shrink-0" aria-hidden>
                    {has(row.id) ? "✓" : ""}
                  </span>
                  <bdi className="min-w-0 flex-1 truncate">{linkedName(row, lang)}</bdi>
                  <span className="shrink-0 font-mono text-[10px] text-white/35" dir="ltr">
                    {row.slug}
                  </span>
                </button>
              ))
            : null}
          {!failed && found && found.total > found.rows.length ? (
            <span className="block px-1 py-1 text-[11px] text-white/40">
              {say(`أول ${found.rows.length} من ${found.total.toLocaleString("en")}: اكتب لتلاقي الباقي.|The first ${found.rows.length} of ${found.total.toLocaleString("en")}: write to find the others.|${found.rows.length} הראשונות מתוך ${found.total.toLocaleString("en")}: כתוב כדי למצוא את השאר.`)}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
