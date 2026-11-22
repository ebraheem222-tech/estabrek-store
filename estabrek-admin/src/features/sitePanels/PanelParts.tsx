// A whole site's panel parts beyond the first five (sites wave 1.3; backend lib/sitePanel.ts): a chart of rows a day,
// a kanban board by a choice, a month's calendar by a date, a person's page across the site's tables, a report for a
// period with its file, the rows with an address on a map, and a scanner finding a row by its code.
import { useState, type DragEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { QrScanner } from "../../components/QrScanner";
import { canScanQr } from "../../lib/qr";
import { getApiErrorMessage } from "../../api/http";
import { adminLang, loc } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";
import * as Panels from "../../api/sitePanels.api";
import type { PanelAsk, PanelCalendar, PanelChart, PanelColumn, PanelGame, PanelKanban, PanelMap, PanelPageView, PanelPeople, PanelPerson, PanelReport, PanelRow, PanelScanner, ReportPeriod } from "../../api/sitePanels.api";
import { cellText, inLang } from "./panelText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-9 min-w-0 rounded-lg border border-white/10 bg-surface-925 px-2 text-sm text-white";
/** Colours for a choice's options, in its order (the theme's accent first). */
const TONES = ["bg-accent-500", "bg-sky-400", "bg-emerald-400", "bg-amber-400", "bg-rose-400", "bg-violet-400", "bg-teal-300", "bg-orange-300"];
const toneOf = (options: Array<{ id: string }> | undefined, id: unknown) => TONES[Math.max(0, options?.findIndex((o) => o.id === id) ?? 0) % TONES.length];
const gridLink = (slug: string) => `/admin/data?table=${encodeURIComponent(slug)}`;
type Took = (v: PanelPageView) => void;
type Common = { view: PanelPageView; took: Took; onError: (e: unknown) => void };

function Head({ title, slug, more }: { title: string; slug?: string; more?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-medium">{title}</h2>
      <div className="flex items-center gap-3">
        {more}
        {slug ? <Link className="text-xs text-white/60 underline" to={gridLink(slug)}>{say("افتح الجدول|Open the table|לפתוח את הטבלה")}</Link> : null}
      </div>
    </div>
  );
}
/** A row's few cells as lines (the first one bold). */
function Lines({ columns, row, lang, skip }: { columns: PanelColumn[]; row: PanelRow; lang: "ar" | "en" | "he"; skip?: string[] }) {
  const shown = columns.filter((c) => !skip?.includes(c.id));
  return (
    <>
      {shown.map((c, k) => {
        const text = cellText(c, row.cells[c.id], lang);
        if (!text) return null;
        return k === 0 ? <div key={c.id} className="font-medium">{text}</div> : <div key={c.id} className="text-xs text-white/60" dir={c.type === "phone" || c.type === "email" ? "ltr" : undefined}>{text}</div>;
      })}
    </>
  );
}

/* ---------------- Chart: rows a day ---------------- */

export function ChartPart({ part }: { part: PanelChart }) {
  const lang = adminLang();
  const most = Math.max(1, ...part.days.map((d) => d.total));
  const sum = part.days.reduce((s, d) => s + d.total, 0);
  const options = part.options ?? [];
  return (
    <section className={box} data-testid={`site-part-${part.key}`} data-kind="chart">
      <Head title={`${inLang(part.title, lang)} (${sum})`} slug={part.table.slug} />
      {part.problem ? <p className="text-sm text-red-300">{part.problem}</p> : null}
      <div className="flex h-36 items-end gap-[3px]" role="img" aria-label={inLang(part.title, lang)} dir="ltr">
        {part.days.map((d) => (
          <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${new Date(`${d.day}T12:00:00Z`).toLocaleDateString(loc(), { day: "numeric", month: "short" })}: ${d.total}`} data-testid={`site-chart-${part.key}-${d.day}`} data-total={d.total}>
            {options.length && d.parts
              ? [...options].reverse().map((o) => (d.parts?.[o.id] ? <div key={o.id} className={`${toneOf(options, o.id)} w-full first:rounded-t`} style={{ height: `${(d.parts[o.id] / most) * 100}%` }} /> : null))
              : <div className="w-full rounded-t bg-accent-500" style={{ height: `${(d.total / most) * 100}%` }} />}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-white/40" dir="ltr">
        <span>{part.days[0] ? new Date(`${part.days[0].day}T12:00:00Z`).toLocaleDateString(loc(), { day: "numeric", month: "short" }) : ""}</span>
        <span>{say("اليوم|Today|היום")}</span>
      </div>
      {options.length ? (
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/65">
          {options.map((o) => (
            <span key={o.id} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${toneOf(options, o.id)}`} />{inLang(o.name, lang) || o.id}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/* ---------------- Kanban: rows in columns by a choice ---------------- */

export function KanbanPart({ part, view, took, onError, ask }: { part: PanelKanban; ask: PanelAsk } & Common) {
  const lang = adminLang();
  const [over, setOver] = useState<string | null>(null);
  const move = useMutation({ mutationFn: ({ row, to }: { row: string; to: string }) => Panels.move(view.featureId, view.page.key, part.key, row, to, lang, ask), onSuccess: took, onError });
  const drop = (to: string) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const row = e.dataTransfer.getData("text/plain");
    if (row && part.columns.some((c) => c.id !== to && c.rows.some((r) => r.id === row))) move.mutate({ row, to });
  };
  return (
    <section className={box} data-testid={`site-part-${part.key}`} data-kind="kanban">
      <Head title={inLang(part.title, lang)} slug={part.table.slug} />
      <div className="grid auto-cols-[minmax(14rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-1">
        {part.columns.map((col) => (
          <div
            key={col.id}
            className={`rounded-xl border p-2 ${over === col.id ? "border-accent-400/60 bg-accent-500/10" : "border-white/5 bg-white/[0.03]"}`}
            onDragOver={part.canMove ? (e) => { e.preventDefault(); setOver(col.id); } : undefined}
            onDragLeave={() => setOver(null)}
            onDrop={part.canMove ? drop(col.id) : undefined}
            data-testid={`site-kanban-${part.key}-${col.id}`}
          >
            <div className="mb-2 flex items-center justify-between px-1 text-sm">
              <span className="font-medium">{inLang(col.name, lang) || col.id}</span>
              <span className="text-xs text-white/50">{col.total}</span>
            </div>
            <ul className="space-y-2">
              {col.rows.map((row) => (
                <li key={row.id} draggable={part.canMove} onDragStart={(e) => e.dataTransfer.setData("text/plain", row.id)} className="rounded-lg border border-white/5 bg-surface-925/70 p-2 text-sm" data-testid={`site-card-${row.id}`}>
                  <Lines columns={part.show} row={row} lang={lang} />
                  {part.canMove ? (
                    // The same move without a mouse (a phone, the keyboard).
                    <select className={`${field} mt-2 h-8 w-full text-xs`} value="" disabled={move.isPending} aria-label={say("انقل لـ|Move to|להעביר אל")} onChange={(e) => e.target.value && move.mutate({ row: row.id, to: e.target.value })} data-testid={`site-card-${row.id}-move`}>
                      <option value="">{say("انقل لـ…|Move to…|להעביר אל…")}</option>
                      {part.columns.filter((c) => c.id !== col.id).map((c) => (
                        <option key={c.id} value={c.id}>{inLang(c.name, lang) || c.id}</option>
                      ))}
                    </select>
                  ) : null}
                </li>
              ))}
            </ul>
            {col.total > col.rows.length ? <p className="mt-2 px-1 text-xs text-white/45">{say("و{n} كمان|And {n} more|ועוד {n}").replace("{n}", String(col.total - col.rows.length))}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Calendar: a month's rows by a date ---------------- */

const addMonth = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
export function CalendarPart({ part, view, took, onError, ask, setAsk }: { part: PanelCalendar; ask: PanelAsk; setAsk: (a: PanelAsk) => void } & Common) {
  const lang = adminLang();
  const [open, setOpen] = useState<string | null>(null);
  const [day, setDay] = useState("");
  const move = useMutation({
    mutationFn: ({ row, to }: { row: string; to: string }) => Panels.move(view.featureId, view.page.key, part.key, row, to, lang, ask),
    onSuccess: (v) => {
      took(v);
      setOpen(null);
    },
    onError,
  });
  const [y, m] = part.month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  // Weeks start on Sunday (the shop's own region); blanks before the first.
  const lead = first.getUTCDay();
  const cells = [...Array.from({ length: lead }, () => null), ...Array.from({ length: days }, (_, k) => `${part.month}-${String(k + 1).padStart(2, "0")}`)];
  const dateOf = (r: PanelRow) => String(r.cells[part.date] ?? "").slice(0, 10);
  const weekday = (k: number) => new Date(Date.UTC(2026, 10, 1 + k)).toLocaleDateString(loc(), { weekday: "short" });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section className={box} data-testid={`site-part-${part.key}`} data-kind="calendar" data-month={part.month}>
      <Head
        title={inLang(part.title, lang)}
        slug={part.table.slug}
        more={
          <span className="flex items-center gap-1">
            <button type="button" className="rounded-lg px-2 py-1 text-sm hover:bg-white/10" onClick={() => setAsk({ ...ask, month: addMonth(part.month, -1) })} aria-label={say("الشهر اللي قبل|The month before|החודש הקודם")} data-testid={`site-calendar-${part.key}-prev`}><span className="inline-block rtl:rotate-180">‹</span></button>
            <span className="min-w-[8rem] text-center text-sm">{first.toLocaleDateString(loc(), { month: "long", year: "numeric", timeZone: "UTC" })}</span>
            <button type="button" className="rounded-lg px-2 py-1 text-sm hover:bg-white/10" onClick={() => setAsk({ ...ask, month: addMonth(part.month, 1) })} aria-label={say("الشهر الجاي|The month after|החודש הבא")} data-testid={`site-calendar-${part.key}-next`}><span className="inline-block rtl:rotate-180">›</span></button>
          </span>
        }
      />
      <div className="grid grid-cols-7 gap-1 text-xs">
        {Array.from({ length: 7 }, (_, k) => <div key={k} className="px-1 pb-1 text-center text-white/45">{weekday(k)}</div>)}
        {cells.map((d, k) =>
          d ? (
            <div key={d} className={`min-h-[5.5rem] rounded-lg border p-1 ${d === today ? "border-accent-400/50" : "border-white/5"} bg-white/[0.02]`} data-testid={`site-day-${d}`}>
              <div className="mb-1 text-[11px] text-white/45">{Number(d.slice(8))}</div>
              <div className="space-y-1">
                {part.rows.filter((r) => dateOf(r) === d).map((r) => (
                  <div key={r.id}>
                    <button type="button" className="w-full truncate rounded px-1 py-0.5 text-start text-[11px] text-white hover:brightness-110" onClick={() => { setOpen(open === r.id ? null : r.id); setDay(d); }} data-testid={`site-event-${r.id}`}>
                      <span className={`me-1 inline-block h-2 w-2 rounded-full ${part.color ? toneOf(part.options, r.cells[part.color]) : "bg-accent-500"}`} />
                      {cellText(part.show[0], r.cells[part.show[0]?.id ?? ""], lang) || "—"}
                    </button>
                    {open === r.id ? (
                      <div className="mt-1 space-y-1 rounded-lg border border-white/10 bg-surface-925 p-2" data-testid={`site-event-${r.id}-open`}>
                        <Lines columns={part.show} row={r} lang={lang} />
                        {part.canMove ? (
                          <div className="flex items-center gap-1 pt-1">
                            <input type="date" className={`${field} h-8 flex-1 text-xs`} value={day} onChange={(e) => setDay(e.target.value)} aria-label={say("يوم تاني|Another day|יום אחר")} data-testid={`site-event-${r.id}-day`} />
                            <Button size="xs" disabled={!day || day === d || move.isPending} onClick={() => move.mutate({ row: r.id, to: day })} data-testid={`site-event-${r.id}-move`}>{say("انقل|Move|להעביר")}</Button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div key={`blank-${k}`} />
          ),
        )}
      </div>
      {part.options?.length ? (
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/65">
          {part.options.map((o) => <span key={o.id} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${toneOf(part.options, o.id)}`} />{inLang(o.name, lang) || o.id}</span>)}
        </div>
      ) : null}
      {part.total > part.rows.length ? <p className="mt-2 text-xs text-white/50">{say("الشهر فيه أكتر من اللي ظاهر: افتح الجدول.|This month holds more than shown: open the table.|יש בחודש יותר ממה שמוצג: פתחו את הטבלה.")}</p> : null}
    </section>
  );
}

/* ---------------- A person's page ---------------- */

export function PeoplePart({ part, view }: { part: PanelPeople; view: PanelPageView }) {
  const lang = adminLang();
  const [q, setQ] = useState("");
  const search = useMutation({ mutationFn: (asked: string) => Panels.searchPeople(view.featureId, view.page.key, part.key, asked, lang), onError: (e) => toast.error(getApiErrorMessage(e)) });
  const people: PanelPerson[] = search.data?.people ?? [];
  return (
    <section className={box} data-testid={`site-part-${part.key}`} data-kind="people">
      <Head title={inLang(part.title, lang)} />
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim().length >= 2) search.mutate(q.trim()); }}>
        <input className={`${field} flex-1`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={say("رقم التلفون أو الاسم|A phone number or a name|מספר טלפון או שם")} aria-label={say("دوّر على زبون|Find a customer|לחפש לקוח")} data-testid={`site-people-${part.key}-q`} />
        <Button type="submit" size="sm" disabled={q.trim().length < 2} isLoading={search.isPending} data-testid={`site-people-${part.key}-go`}>{say("دوّر|Find|חיפוש")}</Button>
      </form>
      {search.isSuccess && !people.length ? <p className="mt-3 text-sm text-white/55" data-testid={`site-people-${part.key}-none`}>{say("ما لقينا حدا هيك.|Nobody like that.|לא נמצא אף אחד.")}</p> : null}
      <div className="mt-3 space-y-3">
        {people.map((p) => (
          <article key={p.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid={`site-person-${p.key}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-medium">{p.name || p.by}</div>
              <div className="text-xs text-white/55" dir="ltr">{p.by}</div>
            </div>
            {p.tables.map((t) => (
              <div key={t.table.id} className="mt-2">
                <div className="text-xs text-white/50">{inLang(t.title, lang)} ({t.rows.length})</div>
                <ul className="mt-1 space-y-1">
                  {t.rows.map((r) => (
                    <li key={r.id} className="rounded-lg bg-white/[0.03] px-2 py-1 text-sm">
                      {t.columns.map((c) => cellText(c, r.cells[c.id], lang)).filter(Boolean).join(" · ")}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Report: a period counted by a choice, and its file ---------------- */

const PERIOD_NAME: Record<ReportPeriod, string> = { week: "هالأسبوع|This week|השבוע", month: "هالشهر|This month|החודש", lastMonth: "الشهر اللي قبل|Last month|החודש הקודם", quarter: "آخر 90 يوم|The last 90 days|90 הימים האחרונים" };
export function ReportPart({ part, view, ask, setAsk }: { part: PanelReport; view: PanelPageView; ask: PanelAsk; setAsk: (a: PanelAsk) => void }) {
  const lang = adminLang();
  const most = Math.max(1, ...part.groups.map((g) => g.n));
  const file = useMutation({
    mutationFn: () => Panels.exportReport(view.featureId, view.page.key, part.key, part.period, lang),
    onSuccess: ({ blob, name }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  return (
    <section className={box} data-testid={`site-part-${part.key}`} data-kind="report" data-period={part.period}>
      <Head
        title={inLang(part.title, lang)}
        slug={part.table.slug}
        more={
          <select className={`${field} h-8 text-xs`} value={part.period} onChange={(e) => setAsk({ ...ask, period: e.target.value })} aria-label={say("الفترة|The period|התקופה")} data-testid={`site-report-${part.key}-period`}>
            {(Object.keys(PERIOD_NAME) as ReportPeriod[]).map((p) => <option key={p} value={p}>{say(PERIOD_NAME[p])}</option>)}
          </select>
        }
      />
      {part.problem ? <p className="text-sm text-red-300">{part.problem}</p> : null}
      {/* Each date kept whole, so the range reads from → to in either direction. */}
      <p className="text-xs text-white/50"><bdi>{new Date(`${part.from}T12:00:00Z`).toLocaleDateString(loc())}</bdi> – <bdi>{new Date(`${part.to}T12:00:00Z`).toLocaleDateString(loc())}</bdi> · {say("المجموع|In all|סך הכול")}: <span data-testid={`site-report-${part.key}-total`}>{part.total}</span></p>
      <ul className="mt-3 space-y-2">
        {part.groups.map((g) => (
          <li key={g.id || "none"} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm" data-testid={`site-report-${part.key}-${g.id || "none"}`}>
            <span className="truncate">{inLang(g.name, lang) || g.id || say("بدون|None|ללא")}</span>
            <span className="h-2 rounded-full bg-white/5"><span className="block h-2 rounded-full bg-accent-500" style={{ width: `${(g.n / most) * 100}%` }} /></span>
            <span className="text-end tabular-nums">{g.n}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <Button size="sm" variant="secondary" isLoading={file.isPending} disabled={!part.total} onClick={() => file.mutate()} data-testid={`site-report-${part.key}-export`}>{say("نزّل الفترة كملف (Excel/CSV)|Download the period as a file (Excel/CSV)|להוריד את התקופה כקובץ (Excel/CSV)")}</Button>
      </div>
    </section>
  );
}

/* ---------------- Map: rows with an address ---------------- */

export function MapPart({ part }: { part: PanelMap }) {
  const lang = adminLang();
  // Nothing is sent to the map's site until the owner picks a place.
  const [picked, setPicked] = useState<string | null>(null);
  const label = part.columns.find((c) => c.id === part.label);
  const address = part.columns.find((c) => c.id === part.address);
  const addressOf = (r: PanelRow) => (address ? cellText(address, r.cells[address.id], lang) : "");
  const chosen = part.rows.find((r) => r.id === picked);
  return (
    <section className={box} data-testid={`site-part-${part.key}`} data-kind="map">
      <Head title={inLang(part.title, lang)} slug={part.table.slug} />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <ul className="space-y-2">
          {part.rows.map((r) => (
            <li key={r.id}>
              <button type="button" className={`w-full rounded-xl border p-3 text-start text-sm ${picked === r.id ? "border-accent-400/60 bg-accent-500/10" : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"}`} onClick={() => setPicked(r.id)} data-testid={`site-place-${r.id}`}>
                <Lines columns={[...(label ? [label] : []), ...part.columns.filter((c) => c.id !== part.label)]} row={r} lang={lang} />
              </button>
            </li>
          ))}
        </ul>
        <div className="min-h-[16rem] overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          {chosen ? (
            <iframe title={addressOf(chosen)} src={`https://maps.google.com/maps?q=${encodeURIComponent(addressOf(chosen))}&z=15&hl=${lang}&output=embed`} className="h-full min-h-[16rem] w-full" loading="lazy" referrerPolicy="no-referrer" data-testid={`site-map-${part.key}`} />
          ) : (
            <p className="grid h-full min-h-[16rem] place-items-center p-4 text-center text-sm text-white/50">{say("اختار مكان من القائمة ليبيّن عالخريطة.|Pick a place from the list to see it on the map.|בחרו מקום מהרשימה כדי לראות אותו במפה.")}</p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Scanner: a code finds a row ---------------- */

export function ScannerPart({ part, view, onError }: { part: PanelScanner } & Common) {
  const lang = adminLang();
  const [code, setCode] = useState("");
  const [camera, setCamera] = useState(false);
  const [found, setFound] = useState<{ code: string; row: PanelRow } | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const find = useMutation({
    mutationFn: (asked: string) => Panels.findCode(view.featureId, view.page.key, part.key, asked),
    onSuccess: (r, asked) => {
      setFound({ code: asked, row: r.row });
      setMissing(null);
    },
    onError: (e, asked) => {
      setFound(null);
      setMissing((e as { response?: { status?: number } })?.response?.status === 404 ? asked : null);
      if ((e as { response?: { status?: number } })?.response?.status !== 404) onError(e);
    },
  });
  const decide = useMutation({
    mutationFn: (decision: string) => Panels.decide(view.featureId, view.page.key, part.key, found!.row.id, decision, lang),
    onSuccess: () => {
      toast.success(say("صار|Done|בוצע"));
      if (found) find.mutate(found.code);
    },
    onError,
  });
  return (
    <section className={box} data-testid={`site-part-${part.key}`} data-kind="scanner">
      <Head title={inLang(part.title, lang)} slug={part.table.slug} />
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) find.mutate(code.trim()); }}>
        <input className={`${field} h-11 flex-1 text-center font-mono text-lg`} dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} aria-label={say("الكود|The code|הקוד")} data-testid={`site-scanner-${part.key}-code`} />
        <Button type="submit" disabled={!code.trim()} isLoading={find.isPending} data-testid={`site-scanner-${part.key}-find`}>{say("دوّر|Find|חיפוש")}</Button>
        {canScanQr() ? <Button type="button" variant="secondary" onClick={() => setCamera(true)} data-testid={`site-scanner-${part.key}-camera`}>{say("الكاميرا|Camera|מצלמה")}</Button> : null}
      </form>
      {camera ? <QrScanner onCode={(text) => { setCamera(false); setCode(text); find.mutate(text); }} onClose={() => setCamera(false)} /> : null}
      {missing ? <p className="mt-3 text-sm text-amber-200" data-testid={`site-scanner-${part.key}-missing`}>{say("ما في شي بهالكود.|Nothing has this code.|אין שום דבר עם הקוד הזה.")}</p> : null}
      {found ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid={`site-scanner-${part.key}-row`}>
          <Lines columns={part.columns} row={found.row} lang={lang} />
          {part.canDecide ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {part.decisions.map((d) => (
                <Button key={d.key} size="sm" variant={d.tone === "good" ? "primary" : "secondary"} disabled={decide.isPending} onClick={() => decide.mutate(d.key)} data-testid={`site-scanner-${part.key}-${d.key}`}>{inLang(d.label, lang)}</Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/* ---------------- A game server: its status now, the last 24 hours ---------------- */

const GAME_NAME = { fivem: "FiveM", minecraft: "Minecraft Java", bedrock: "Minecraft Bedrock", steam: "Steam" } as const;
export function GamePart({ part, view, took, onError }: { part: PanelGame } & Common) {
  const lang = adminLang();
  const s = part.status;
  const check = useMutation({ mutationFn: () => Panels.checkGame(view.featureId, view.page.key, part.key, lang), onSuccess: took, onError });
  const most = Math.max(1, s?.max ?? 0, ...(s?.history ?? []).map((h) => h.players ?? 0));
  const state = !s || s.online === null ? "unknown" : s.online ? "on" : "off";
  return (
    <section className={box} data-testid={`site-part-${part.key}`} data-kind="game" data-state={state}>
      <Head
        title={inLang(part.title, lang)}
        more={part.canCheck ? <Button size="xs" variant="secondary" isLoading={check.isPending} onClick={() => check.mutate()} data-testid={`site-game-${part.key}-check`}>{say("اسأل هلّق|Ask now|לבדוק עכשיו")}</Button> : null}
      />
      {!s ? (
        <p className="text-sm text-white/60" data-testid={`site-game-${part.key}-none`}>{say("لسّا ما في عنوان للسيرفر: اكتبه بإعدادات الموقع.|No server address yet: write it in the site's settings.|עוד אין כתובת לשרת: כתבו אותה בהגדרות האתר.")}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${state === "on" ? "bg-emerald-400" : state === "off" ? "bg-red-400" : "bg-white/30"}`} />
            <strong data-testid={`site-game-${part.key}-state`}>{state === "on" ? say("شغّال|Online|מחובר") : state === "off" ? say("طافي|Offline|כבוי") : say("لسّا ما انسأل|Not checked yet|עוד לא נבדק")}</strong>
            {s.online && s.players !== null ? <span className="text-2xl font-semibold tabular-nums" dir="ltr" data-testid={`site-game-${part.key}-players`}>{s.players}{s.max ? ` / ${s.max}` : ""}</span> : null}
            <span className="text-xs text-white/50">{GAME_NAME[s.game]} · <span dir="ltr">{s.join.address}</span></span>
          </div>
          {s.name || s.map ? <p className="mt-1 text-sm text-white/65">{[s.name, s.map, s.version].filter(Boolean).join(" · ")}</p> : null}
          <div className="mt-3 flex h-24 items-end gap-[3px]" dir="ltr" role="img" aria-label={say("آخر 24 ساعة|The last 24 hours|24 השעות האחרונות")}>
            {s.history.map((h) => (
              <div key={h.hour} className={`flex-1 rounded-t ${h.online === false ? "bg-red-400/50" : "bg-accent-500"}`} style={{ height: `${h.players === null ? 3 : Math.max(3, (h.players / most) * 100)}%` }} title={`${new Date(h.hour).toLocaleTimeString(loc(), { hour: "2-digit", minute: "2-digit" })} · ${h.players ?? "—"}`} data-testid={`site-game-${part.key}-hour`} />
            ))}
          </div>
          <p className="mt-1 text-xs text-white/45">{say("آخر 24 ساعة، أكتر عدد لاعبين بكل ساعة.|The last 24 hours, the most players each hour.|24 השעות האחרונות, הכי הרבה שחקנים בכל שעה.")}{s.at ? ` · ${say("آخر سؤال|Last asked|נבדק לאחרונה")}: ${new Date(s.at).toLocaleTimeString(loc(), { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
        </>
      )}
    </section>
  );
}
