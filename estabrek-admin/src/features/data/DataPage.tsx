/**
 * الجداول (the data grid): every table (a collection) as a grid like a spreadsheet's. The server
 * filters, sorts and searches (a table of tens of thousands of rows opens like a small one); cells
 * are written in place; many rows change at once; deleted rows wait in the trash; CSV goes in and out.
 * A table's fields and its item page are still made in المجموعات.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../../lib/toast";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { listCollections, type Collection } from "../../api/collections.api";
import * as DataAPI from "../../api/data.api";
import type { BulkOp, GridFilter, GridMeta, GridPage, GridQuery, GridRow, GridTable, Lang, View } from "../../api/data.api";
import { CellEditor, CellView, ValueInput, field, input } from "./GridCells";
import { ImportDialog } from "./ImportDialog";
import { parseCsv } from "./csv";
import { XLSX_TYPE, writeXlsx } from "./xlsx";
import { RowDrawer } from "./RowDrawer";
import { LANGS, LANG_NAME, VIEW_NAME, cellPatch, columnsOf, editable, filterColumns, filterValue, kindOf, newFilter, nextSort, opName, issueSay, opNeeds, pageInfo, queryOut, sheetCells, type Column } from "./dataText";

const card = "rounded-2xl border border-white/10 bg-white/[0.03]";
const btn = "rounded-lg bg-white/[0.07] px-3 py-1.5 text-xs hover:bg-white/[0.12] disabled:opacity-40";
const primary = "rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:brightness-110 disabled:opacity-40";
const danger = "rounded-lg bg-red-500/15 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/25 disabled:opacity-40";
const VIEWS: View[] = ["all", "draft", "published", "archived", "trash"];
const PAGE_SIZES = [25, 50, 100, 200];
const words = (v: Collection["name"] | undefined, lang: Lang) => v?.[lang] || v?.ar || v?.en || v?.he || "";

/** One refused value's reason: the field's own words when its owner wrote some, else the general ones. */
export function issueText(issue: DataAPI.Issue): string {
  const words = issueSay(issue, adminLang() as Lang);
  return "own" in words ? words.own : say(words.general);
}

/** The refused values from the server, said in the admin's language. */
export function problemText(e: unknown): string {
  const issues = (e as { response?: { data?: { details?: { issues?: DataAPI.Issue[] } } } })?.response?.data?.details?.issues;
  if (Array.isArray(issues) && issues.length) return issues.map((i) => `${i.field}: ${issueText(i)}`).join(" · ");
  return getApiErrorMessage(e);
}

export default function DataPage() {
  const lang = adminLang() as Lang;
  const tables = useQuery({ queryKey: ["collections"], queryFn: listCollections });
  const meta = useQuery({ queryKey: ["data", "meta"], queryFn: DataAPI.gridMeta, staleTime: Infinity });
  // The store's own tables (products, orders…), to look at: only the ones this member may see.
  const store = useQuery({ queryKey: ["data", "store"], queryFn: DataAPI.storeTables, retry: false });
  // The open table is in the address (?table=blog, or ?store=orders): a link can open one, and a reload keeps it.
  const [params, setParams] = useSearchParams();
  const mine: GridTable[] = tables.data ?? [];
  const theirs: GridTable[] = store.data ?? [];
  const table = (params.get("store") ? theirs.find((c) => c.slug === params.get("store")) : mine.find((c) => c.slug === params.get("table"))) ?? mine[0] ?? theirs[0] ?? null;
  const setOpen = (c: GridTable) => setParams(c.readOnly ? { store: c.slug } : { table: c.slug }, { replace: true });

  return (
    <div className="space-y-4 p-4 md:p-6" data-testid="data-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{say("الجداول|Tables|טבלאות")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/55">
            {say(
              "كل جدول من بياناتك بشبكة وحدة: فلتر، رتّب، دوّر، عدّل بالخلية، غيّر كتير سطور مرة وحدة، واستورد وصدّر Excel و CSV.|Each of your tables in one grid: filter, sort, search, write in the cell, change many rows at once, and bring Excel and CSV in and out.|כל טבלה ברשת אחת: סינון, מיון, חיפוש, עריכה בתא, שינוי שורות רבות יחד וייבוא וייצוא Excel ו־CSV.",
            )}
          </p>
        </div>
        <Link to="/admin/collections" className={btn} data-testid="data-schema-link">
          {say("جدول جديد والحقول|New table & fields|טבלה חדשה ושדות")}
        </Link>
      </header>

      {tables.isLoading ? <div className="text-sm text-white/50">…</div> : null}
      {tables.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(tables.error)}</div> : null}
      {tables.data && !tables.data.length ? (
        <div className={`${card} p-4 text-sm text-white/60`} data-testid="data-empty">
          {say("ما في جداول لسا. اعمل أول جدول من «المجموعات» (مدونة، فروع، أو حقولك الخاصة).|No tables yet. Make the first one in Collections (a blog, branches, or your own fields).|אין עדיין טבלאות. צור את הראשונה ב״אוספים״.")}
        </div>
      ) : null}

      {table ? (
        <div className="flex flex-col gap-4 lg:flex-row">
          <nav className="flex shrink-0 gap-2 overflow-x-auto lg:w-52 lg:flex-col" aria-label={say("الجداول|Tables|טבלאות")} data-testid="data-tables">
            {[
              { title: "جداولك|Your tables|הטבלאות שלך", list: mine, prefix: "data-table" },
              { title: "جداول المتجر (للعرض)|The store's tables (to look at)|טבלאות החנות (לצפייה)", list: theirs, prefix: "store-table" },
            ].map((group) =>
              group.list.length ? (
                <div key={group.prefix} className="flex shrink-0 gap-2 lg:flex-col">
                  <div className="hidden px-1 pt-1 text-xs text-white/45 lg:block">{say(group.title)}</div>
                  {group.list.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setOpen(c)}
                      aria-current={c.id === table.id}
                      data-testid={`${group.prefix}-${c.slug}`}
                      className={`shrink-0 rounded-xl border px-3 py-2 text-start text-sm ${c.id === table.id ? "border-accent-500/60 bg-accent-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                    >
                      <span className="block truncate font-medium">{words(c.name, lang) || c.slug}</span>
                      <span className="block text-xs text-white/50">{`${c.items.toLocaleString("en")} ${say("سطر|rows|שורות")}`}</span>
                    </button>
                  ))}
                </div>
              ) : null,
            )}
          </nav>
          <div className="min-w-0 flex-1">{meta.data ? <TableGrid key={table.id} table={table} meta={meta.data} lang={lang} /> : null}</div>
        </div>
      ) : null}
    </div>
  );
}

function TableGrid({ table, meta, lang }: { table: GridTable; meta: GridMeta; lang: Lang }) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  /** One of the store's own tables: looked at here, changed from its own page. */
  const readOnly = !!table.readOnly;
  const canWrite = !readOnly && hasPermission("pages:write");
  /** The language the words columns show and are written in. */
  const [wordsLang, setWordsLang] = useState<Lang>(lang);
  const [query, setQuery] = useState<GridQuery>({ page: 1, pageSize: 50, view: "all", filters: [], sort: [], match: "all" });
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  /** Every row the question matches, not only the ticked ones on this page. */
  const [allMatching, setAllMatching] = useState(false);
  const [editing, setEditing] = useState<{ row: string; column: string } | null>(null);
  const [drawer, setDrawer] = useState<GridRow | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [setting, setSetting] = useState<{ field: string; value: string } | null>(null);

  // The search waits for the typing to stop.
  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => ((q.search ?? "") === search.trim() ? q : { ...q, search: search.trim(), page: 1 })), 300);
    return () => clearTimeout(t);
  }, [search]);

  const columns = useMemo(() => columnsOf(table, lang), [table, lang]);
  const sent = useMemo(() => queryOut({ ...query, lang: wordsLang }), [query, wordsLang]);
  const key = ["data", "rows", table.id, sent];
  const rows = useQuery({ queryKey: key, queryFn: () => (readOnly ? DataAPI.getStoreRows(table.slug, sent) : DataAPI.getRows(table.id, sent)), placeholderData: (prev: GridPage | undefined) => prev });
  const data = rows.data;
  const view = query.view ?? "all";
  const inTrash = view === "trash";

  const change = (patch: Partial<GridQuery>) => {
    setQuery((q) => ({ ...q, page: 1, ...patch }));
    setPicked(new Set());
    setAllMatching(false);
    setEditing(null);
  };
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["data", "rows", table.id] });
    void qc.invalidateQueries({ queryKey: ["collections"] });
  };
  const onError = (e: unknown) => toast.error(say("ما زبط|That didn't work|זה לא הצליח"), { description: problemText(e) });

  const patch = useMutation({
    mutationFn: (v: { row: GridRow; body: Parameters<typeof DataAPI.patchRow>[2] }) => DataAPI.patchRow(table.id, v.row.id, { ...v.body, lang: wordsLang }),
    onSuccess: (saved, v) => {
      qc.setQueryData<GridPage>(key, (page) => (page ? { ...page, rows: page.rows.map((r) => (r.id === saved.id ? { ...r, ...saved } : r)) } : page));
      // A new status moves the row between the tabs.
      if (v.body.status) refresh();
    },
    onError,
  });
  const bulk = useMutation({
    mutationFn: (v: { op: BulkOp; field?: string; value?: unknown }) =>
      DataAPI.bulkRows(table.id, { ...(allMatching ? { query: { ...sent, page: 1 } } : { ids: [...picked] }), op: v.op, field: v.field, value: v.value, lang: wordsLang }),
    onSuccess: (out, v) => {
      refresh();
      setPicked(new Set());
      setAllMatching(false);
      setSetting(null);
      setConfirmPurge(false);
      const n = out.changed.toLocaleString("en");
      toast.success(
        v.op === "trash"
          ? say(`${n} سطر راحوا لسلة المحذوفات|${n} rows moved to the trash|${n} שורות עברו לאשפה`)
          : v.op === "restore"
            ? say(`${n} سطر رجعوا|${n} rows are back|${n} שורות חזרו`)
            : v.op === "purge"
              ? say(`${n} سطر انحذفوا نهائياً|${n} rows deleted for good|${n} שורות נמחקו לצמיתות`)
              : say(`${n} سطر تغيّروا|${n} rows changed|${n} שורות שונו`),
      );
    },
    onError,
  });
  const download = useMutation({
    // The server writes the asked rows as CSV; an Excel file is made from it here.
    mutationFn: async (as: "csv" | "xlsx") => {
      const csv = await (readOnly ? DataAPI.exportStoreRows(table.slug, { ...sent, page: 1 }) : DataAPI.exportRows(table.id, { ...sent, page: 1 }));
      if (as === "csv") return { blob: csv, name: `${table.slug}.csv` };
      const book = writeXlsx(sheetCells(parseCsv(await csv.text(), ","), table.fields), table.slug);
      return { blob: new Blob([book as unknown as BlobPart], { type: XLSX_TYPE }), name: `${table.slug}.xlsx` };
    },
    onSuccess: ({ blob, name }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    onError,
  });

  const pageRows = data?.rows ?? [];
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => picked.has(r.id));
  const chosen = allMatching ? (data?.total ?? 0) : picked.size;
  const info = pageInfo(data?.total ?? 0, sent.page ?? 1, sent.pageSize ?? 50);
  const filters = query.filters ?? [];
  const setFilter = (i: number, next: GridFilter | null) => change({ filters: next ? filters.map((f, k) => (k === i ? next : f)) : filters.filter((_, k) => k !== i) });
  const fieldColumns = columns.filter((c) => c.field);
  const askable = useMemo(() => filterColumns(columns, readOnly), [columns, readOnly]);
  const firstAsk = askable.find((c) => c.field) ?? askable[0];

  return (
    <section className={`${card} overflow-hidden`} data-testid="data-grid" data-table={table.slug}>
      {/* The tabs: each view with how many rows it holds. */}
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-3 pt-3" role="tablist">
        {(readOnly ? VIEWS.slice(0, 1) : VIEWS).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={v === view} data-testid={`view-${v}`} onClick={() => change({ view: v })} className={`rounded-t-lg px-3 py-2 text-xs ${v === view ? "bg-white/10 font-medium text-white" : "text-white/55 hover:text-white"}`}>
            {say(VIEW_NAME[v])}
            <span className="ms-1.5 tabular-nums text-white/45" data-testid={`count-${v}`}>
              {(data?.counts[v] ?? 0).toLocaleString("en")}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 py-3">
        <input className={`${input} max-w-xs`} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={say("دوّر بكل القيم…|Search every value…|חיפוש בכל הערכים…")} data-testid="data-search" aria-label={say("بحث|Search|חיפוש")} />
        <button type="button" className={btn} data-testid="filter-add" disabled={filters.length >= meta.limits.filters} onClick={() => change({ filters: [...filters, newFilter(firstAsk.id, firstAsk.kind, meta.ops)] })}>
          {say("＋ فلتر|＋ Filter|＋ סינון")}
        </button>
        {readOnly ? (
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/55" data-testid="data-read-only">
            {say("للعرض بس: التعديل من صفحته|To look at: it's changed from its own page|לצפייה בלבד: העריכה מהדף שלו")}
          </span>
        ) : (
          <label className="flex items-center gap-1 whitespace-nowrap text-xs text-white/55">
            {say("لغة الكلام|Words in|שפת הטקסט")}
            <select className={field} value={wordsLang} onChange={(e) => setWordsLang(e.target.value as Lang)} data-testid="words-lang">
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANG_NAME[l]}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="ms-auto flex flex-wrap items-center gap-2">
          <button type="button" className={btn} onClick={() => download.mutate("xlsx")} disabled={download.isPending || !data?.total} data-testid="data-export-xlsx">
            {say("صدّر Excel|Export Excel|ייצוא Excel")}
          </button>
          <button type="button" className={btn} onClick={() => download.mutate("csv")} disabled={download.isPending || !data?.total} data-testid="data-export">
            {say("صدّر CSV|Export CSV|ייצוא CSV")}
          </button>
          {canWrite && !inTrash ? (
            <>
              <button type="button" className={btn} onClick={() => setImporting(true)} data-testid="data-import">
                {say("استورد Excel / CSV|Import Excel / CSV|ייבוא Excel / CSV")}
              </button>
              <button type="button" className={primary} onClick={() => setDrawer("new")} data-testid="row-add">
                {say("＋ سطر|＋ Row|＋ שורה")}
              </button>
            </>
          ) : null}
        </span>
      </div>

      {filters.length ? (
        <div className="space-y-2 border-t border-white/10 px-3 py-3" data-testid="data-filters">
          {filters.map((f, i) => (
            <FilterRow key={i} index={i} filter={f} columns={askable} meta={meta} lang={lang} onChange={(next) => setFilter(i, next)} />
          ))}
          {filters.length > 1 ? (
            <label className="flex items-center gap-2 text-xs text-white/55">
              {say("السطر لازم يطابق|A row must match|שורה צריכה להתאים")}
              <select className={field} value={query.match ?? "all"} onChange={(e) => change({ match: e.target.value as "all" | "any" })} data-testid="filter-match">
                <option value="all">{say("كل الفلاتر|every filter|כל הסינונים")}</option>
                <option value="any">{say("أي فلتر|any filter|סינון כלשהו")}</option>
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {chosen ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-accent-500/[0.07] px-3 py-2 text-xs" data-testid="bulk-bar">
          <span className="font-medium" data-testid="bulk-count">{`${chosen.toLocaleString("en")} ${say("محدّد|chosen|נבחרו")}`}</span>
          {!allMatching && allOnPage && (data?.total ?? 0) > pageRows.length ? (
            <button type="button" className="underline" onClick={() => setAllMatching(true)} data-testid="bulk-all">
              {say(`حدّد كل الـ ${data!.total.toLocaleString("en")} بالنتيجة|Choose all ${data!.total.toLocaleString("en")} in the result|בחר את כל ${data!.total.toLocaleString("en")} בתוצאה`)}
            </button>
          ) : null}
          <span className="ms-auto flex flex-wrap items-center gap-2">
            {inTrash ? (
              <>
                <button type="button" className={btn} disabled={!canWrite || bulk.isPending} onClick={() => bulk.mutate({ op: "restore" })} data-testid="bulk-restore">
                  {say("رجّع|Put back|שחזר")}
                </button>
                <button type="button" className={danger} disabled={!canWrite || bulk.isPending} onClick={() => setConfirmPurge(true)} data-testid="bulk-purge">
                  {say("احذف نهائياً|Delete for good|מחק לצמיתות")}
                </button>
              </>
            ) : (
              <>
                <button type="button" className={btn} disabled={!canWrite || bulk.isPending} onClick={() => bulk.mutate({ op: "publish" })} data-testid="bulk-publish">
                  {say("انشر|Publish|פרסם")}
                </button>
                <button type="button" className={btn} disabled={!canWrite || bulk.isPending} onClick={() => bulk.mutate({ op: "draft" })} data-testid="bulk-draft">
                  {say("مسودة|Draft|טיוטה")}
                </button>
                <button type="button" className={btn} disabled={!canWrite || bulk.isPending} onClick={() => bulk.mutate({ op: "archive" })} data-testid="bulk-archive">
                  {say("أرشف|Archive|ארכיון")}
                </button>
                <button type="button" className={btn} disabled={!canWrite || bulk.isPending || !fieldColumns.length} onClick={() => setSetting(setting ? null : { field: fieldColumns[0].id, value: "" })} data-testid="bulk-set">
                  {say("حط قيمة…|Set a value…|קבע ערך…")}
                </button>
                <button type="button" className={danger} disabled={!canWrite || bulk.isPending} onClick={() => bulk.mutate({ op: "trash" })} data-testid="bulk-trash">
                  {say("للسلة|To the trash|לאשפה")}
                </button>
              </>
            )}
            <button type="button" className="text-white/55 underline" onClick={() => { setPicked(new Set()); setAllMatching(false); setSetting(null); }}>
              {say("شيل التحديد|Clear|נקה")}
            </button>
          </span>
          {setting ? (
            <div className="flex w-full flex-wrap items-center gap-2 pt-1" data-testid="bulk-set-form">
              <select className={field} value={setting.field} onChange={(e) => setSetting({ field: e.target.value, value: "" })} data-testid="bulk-set-field">
                {fieldColumns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="w-56">
                <ValueInput kind={kindOf(setting.field, table.fields)!} field={table.fields.find((f) => f.id === setting.field)} lang={lang} value={setting.value} onChange={(value) => setSetting({ ...setting, value })} testId="bulk-set-value" />
              </span>
              <button type="button" className={primary} disabled={bulk.isPending} onClick={() => bulk.mutate({ op: "set", field: setting.field, value: kindOf(setting.field, table.fields) === "boolean" ? (setting.value === "" ? null : setting.value === "true") : setting.value })} data-testid="bulk-set-apply">
                {say("طبّق عالمحدّد|Apply to the chosen|החל על הנבחרים")}
              </button>
              <span className="text-white/45">{say("قيمة فاضية بتفضّي الخانة.|An empty value empties the cell.|ערך ריק מרוקן את התא.")}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto border-t border-white/10">
        <table className="w-full min-w-max text-sm" data-testid="data-table">
          <thead className="bg-white/[0.04] text-xs text-white/60">
            <tr>
              <th className={`w-9 px-3 py-2 ${readOnly ? "hidden" : ""}`}>
                <input
                  type="checkbox"
                  checked={allOnPage}
                  aria-label={say("حدّد كل الصفحة|Choose the whole page|בחר את כל העמוד")}
                  data-testid="pick-page"
                  onChange={(e) => {
                    setAllMatching(false);
                    setPicked(e.target.checked ? new Set(pageRows.map((r) => r.id)) : new Set());
                  }}
                />
              </th>
              {columns.map((c) => {
                const s = query.sort?.find((x) => x.field === c.id);
                return (
                  <th key={c.id} className="whitespace-nowrap px-3 py-2 text-start font-medium" aria-sort={s ? (s.dir === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" className="inline-flex items-center gap-1 hover:text-white disabled:cursor-default disabled:hover:text-inherit" disabled={c.computed} title={c.computed ? say("بينحسب لكل صفحة: ما بيترتّب فيه|Worked out per page: it can't be sorted by|מחושב לכל עמוד: אי אפשר למיין לפיו") : undefined} onClick={() => change({ sort: nextSort(query.sort, c.id) })} data-testid={`sort-${c.id}`}>
                      {c.id.startsWith("$") ? say(c.name) : c.name}
                      {c.field?.required ? <span className="text-red-300">*</span> : null}
                      <span className="text-accent-300">{s ? (s.dir === "asc" ? "▲" : "▼") : ""}</span>
                    </button>
                  </th>
                );
              })}
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.id} className={`border-t border-white/[0.06] ${picked.has(row.id) || allMatching ? "bg-accent-500/[0.06]" : "hover:bg-white/[0.03]"}`} data-testid={`row-${row.slug}`}>
                <td className={`px-3 py-1.5 ${readOnly ? "hidden" : ""}`}>
                  <input
                    type="checkbox"
                    checked={allMatching || picked.has(row.id)}
                    aria-label={row.slug}
                    data-testid={`pick-${row.slug}`}
                    onChange={(e) => {
                      setAllMatching(false);
                      setPicked((was) => {
                        const next = new Set(allMatching ? pageRows.map((r) => r.id) : was);
                        if (e.target.checked) next.add(row.id);
                        else next.delete(row.id);
                        return next;
                      });
                    }}
                  />
                </td>
                {columns.map((c) => {
                  const open = editing?.row === row.id && editing.column === c.id;
                  const can = canWrite && !inTrash && editable(c);
                  return (
                    <td
                      key={c.id}
                      className={`px-3 py-1.5 align-middle ${can ? "cursor-text" : ""}`}
                      data-testid={`cell-${row.slug}-${c.id}`}
                      onDoubleClick={() => (can ? setEditing({ row: row.id, column: c.id }) : undefined)}
                      tabIndex={can ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (can && !open && (e.key === "Enter" || e.key === "F2")) {
                          e.preventDefault();
                          setEditing({ row: row.id, column: c.id });
                        }
                      }}
                    >
                      {open ? (
                        <CellEditor
                          column={c}
                          row={row}
                          lang={wordsLang}
                          onCancel={() => setEditing(null)}
                          onSave={(draft) => {
                            setEditing(null);
                            patch.mutate({ row, body: cellPatch(c, row, wordsLang, draft) });
                          }}
                        />
                      ) : (
                        <CellView column={c} row={row} lang={wordsLang} />
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-end">
                  {!inTrash && !readOnly ? (
                    <button type="button" className="rounded px-1.5 text-white/50 hover:bg-white/10 hover:text-white" onClick={() => setDrawer(row)} aria-label={say("افتح السطر|Open the row|פתח שורה")} data-testid={`open-${row.slug}`}>
                      ⤢
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {data && !pageRows.length ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-10 text-center text-sm text-white/50" data-testid="data-no-rows">
                  {inTrash
                    ? say("السلة فاضية.|The trash is empty.|האשפה ריקה.")
                    : sent.search || sent.filters?.length
                      ? say("ما في سطور بتطابق.|No rows match.|אין שורות תואמות.")
                      : say("الجدول فاضي: ضيف سطر أو استورد ملف.|The table is empty: add a row or import a file.|הטבלה ריקה: הוסף שורה או ייבא קובץ.")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {rows.isError ? <div className="border-t border-white/10 px-3 py-3 text-sm text-red-200" data-testid="data-error">{problemText(rows.error)}</div> : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 px-3 py-2 text-xs text-white/55">
        <span data-testid="data-total">
          {data ? `${info.from.toLocaleString("en")}–${info.to.toLocaleString("en")} ${say("من|of|מתוך")} ${data.total.toLocaleString("en")}` : "…"}
        </span>
        {data ? <span className="text-white/35">{`${data.ms} ms`}</span> : null}
        {inTrash ? <span>{say(`السطور بتنحذف نهائياً بعد ${meta.limits.trashDays} يوم.|Rows are deleted for good after ${meta.limits.trashDays} days.|שורות נמחקות לצמיתות אחרי ${meta.limits.trashDays} ימים.`)}</span> : null}
        <span className="ms-auto flex items-center gap-2">
          <select className={field} value={query.pageSize ?? 50} onChange={(e) => change({ pageSize: Number(e.target.value) })} aria-label={say("سطور بالصفحة|Rows a page|שורות בעמוד")} data-testid="page-size">
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button type="button" className={btn} disabled={(sent.page ?? 1) <= 1} onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))} data-testid="page-prev">
            {say("السابق|Back|הקודם")}
          </button>
          <span className="whitespace-nowrap tabular-nums" dir="ltr" data-testid="page-now">{`${sent.page ?? 1} / ${info.pages.toLocaleString("en")}`}</span>
          <button type="button" className={btn} disabled={(sent.page ?? 1) >= info.pages} onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))} data-testid="page-next">
            {say("التالي|Next|הבא")}
          </button>
        </span>
      </div>

      <ConfirmDialog
        open={confirmPurge}
        title={say("حذف نهائي|Delete for good|מחיקה לצמיתות")}
        message={say(`${chosen.toLocaleString("en")} سطر رح ينحذفوا نهائياً وما بيرجعوا.|${chosen.toLocaleString("en")} rows will be deleted for good and can't come back.|${chosen.toLocaleString("en")} שורות יימחקו לצמיתות ולא ניתן לשחזרן.`)}
        confirmText={say("احذف نهائياً|Delete for good|מחק לצמיתות")}
        variant="danger"
        isLoading={bulk.isPending}
        onConfirm={() => bulk.mutate({ op: "purge" })}
        onCancel={() => setConfirmPurge(false)}
      />
      {drawer && !readOnly ? <RowDrawer table={table} row={drawer === "new" ? null : drawer} lang={lang} canWrite={canWrite} onClose={() => setDrawer(null)} onSaved={() => { setDrawer(null); refresh(); }} /> : null}
      {importing && !readOnly ? <ImportDialog table={table} lang={lang} wordsLang={wordsLang} batch={meta.limits.importRows} onClose={() => setImporting(false)} onDone={() => { setImporting(false); refresh(); }} /> : null}
    </section>
  );
}

/** One filter: the column, what is asked of it, and the value (or two, or a few choices). */
function FilterRow({ index, filter, columns, meta, lang, onChange }: { index: number; filter: GridFilter; columns: Column[]; meta: GridMeta; lang: Lang; onChange: (next: GridFilter | null) => void }) {
  const all = columns;
  const column = all.find((c) => c.id === filter.field) ?? all[0];
  const ops = meta.ops[column.kind] ?? [];
  const needs = opNeeds(filter.op);
  const text = (v: unknown) => (v === undefined || v === null ? "" : String(v));
  const choices = column.kind === "$status" ? (["DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((s) => ({ id: s, name: s as string })) : (column.field?.options ?? []).map((o) => ({ id: o.id, name: o.name?.[lang] || o.name?.ar || o.name?.en || o.id }));
  const listed = Array.isArray(filter.value) ? (filter.value as string[]) : [];
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid={`filter-${index}`}>
      <select className={field} value={column.id} data-testid={`filter-${index}-field`} onChange={(e) => { const c = all.find((x) => x.id === e.target.value)!; onChange(newFilter(c.id, c.kind, meta.ops)); }}>
        {all.map((c) => (
          <option key={c.id} value={c.id}>
            {c.id.startsWith("$") ? say(c.name) : c.name}
          </option>
        ))}
      </select>
      <select className={field} value={filter.op} data-testid={`filter-${index}-op`} onChange={(e) => onChange({ field: filter.field, op: e.target.value as GridFilter["op"] })}>
        {ops.map((op) => (
          <option key={op} value={op}>
            {say(opName(op, column.kind))}
          </option>
        ))}
      </select>
      {needs === "one" || needs === "two" ? (
        <span className="w-44">
          <ValueInput kind={column.kind} field={column.field} lang={lang} value={text(filter.value)} onChange={(v) => onChange({ ...filter, value: filterValue(column.kind, v) })} testId={`filter-${index}-value`} />
        </span>
      ) : null}
      {needs === "two" ? (
        <>
          <span className="text-xs text-white/45">{say("و|and|ו")}</span>
          <span className="w-44">
            <ValueInput kind={column.kind} field={column.field} lang={lang} value={text(filter.value2)} onChange={(v) => onChange({ ...filter, value2: filterValue(column.kind, v) })} testId={`filter-${index}-value2`} />
          </span>
        </>
      ) : null}
      {needs === "list" ? (
        <span className="flex flex-wrap gap-2" data-testid={`filter-${index}-list`}>
          {choices.map((o) => (
            <label key={o.id} className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={listed.includes(o.id)} onChange={(e) => onChange({ ...filter, value: e.target.checked ? [...listed, o.id] : listed.filter((x) => x !== o.id) })} />
              {o.name}
            </label>
          ))}
        </span>
      ) : null}
      <button type="button" className="rounded px-1.5 text-white/50 hover:bg-white/10 hover:text-white" onClick={() => onChange(null)} aria-label={say("شيل الفلتر|Remove the filter|הסר סינון")} data-testid={`filter-${index}-remove`}>
        ×
      </button>
    </div>
  );
}
