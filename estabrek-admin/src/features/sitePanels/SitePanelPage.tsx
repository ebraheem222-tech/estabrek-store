// A whole site's own page in the admin (sites wave 1; backend lib/sitePanel.ts): /admin/site/:featureId/:page.
// Its parts as its file declares them, each only for a member who may read it: numbers (with the window before),
// queues of rows waiting for a decision (one tap sets the row's fields), saved tables, the site's settings, quick
// actions that change a setting; and (PanelParts.tsx) charts, boards, calendars, a person's page, reports, maps and
// a scanner. A calendar's month and a report's period are in the address (?month=, ?period=).
import { useState } from "react";
import { Link, NavLink, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { useConfirm } from "../../components/useConfirm";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import * as Panels from "../../api/sitePanels.api";
import type { PanelActions, PanelAsk, PanelNumbers, PanelPageView, PanelQueue, PanelSettings, PanelView, PanelVotes } from "../../api/sitePanels.api";
import { SettingsEditor } from "../myFeatures/SiteSettings";
import { cellText, changeText, inLang } from "./panelText";
import { CalendarPart, ChartPart, GamePart, KanbanPart, LinkPart, MapPart, PeoplePart, ReportPart, ScannerPart, StreamersPart, TebexPart, WipePart } from "./PanelParts";
import { ArrangePanel } from "./ArrangePanel";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

export default function SitePanelPage() {
  const { featureId = "", page = "" } = useParams();
  const lang = adminLang();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const [params, setParams] = useSearchParams();
  const ask: PanelAsk = { ...(params.get("month") ? { month: params.get("month")! } : {}), ...(params.get("period") ? { period: params.get("period")! } : {}) };
  const setAsk = (next: PanelAsk) => setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => !!v)) as Record<string, string>, { replace: true });
  const key = ["site-panel", featureId, page, lang, ask.month ?? "", ask.period ?? ""];
  const q = useQuery({ queryKey: key, queryFn: () => Panels.getSitePanelPage(featureId, page, lang, ask), enabled: !!featureId && !!page, placeholderData: (before) => before });
  const took = (next: PanelPageView) => qc.setQueryData(key, next);
  const [arranging, setArranging] = useState(false);
  const onError = (e: unknown) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) });

  if (q.isLoading) return <Spinner />;
  if (q.isError || !q.data) return <div className="text-sm text-red-200" data-testid="site-panel-error">{getApiErrorMessage(q.error)}</div>;
  const v = q.data;

  return (
    <div className="space-y-4 pb-24" data-testid="site-panel" data-page={v.page.key}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" data-testid="site-panel-name">{v.name}</h1>
          <p className="text-sm text-white/60">{inLang(v.page.name, lang)}</p>
        </div>
        {v.arrange ? (
          <Button size="sm" variant={arranging ? "primary" : "secondary"} onClick={() => setArranging((a) => !a)} data-testid="site-panel-arrange">
            {arranging ? say("خلصت الترتيب|Done arranging|סיימתי לסדר") : say("رتّب الصفحة|Arrange the page|לסדר את העמוד")}
          </Button>
        ) : null}
        <nav className="flex flex-wrap gap-1" data-testid="site-panel-pages">
          {v.pages.map((p) => (
            <NavLink key={p.key} to={`/admin/site/${encodeURIComponent(v.featureId)}/${encodeURIComponent(p.key)}`} className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm ${isActive ? "bg-accent-500/20 text-white" : "text-white/60 hover:bg-white/5"}`} data-testid={`site-panel-tab-${p.key}`}>
              {inLang(p.name, lang)}
            </NavLink>
          ))}
        </nav>
      </header>
      {!v.enabled ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200" data-testid="site-panel-off">
          {say("الموقع موقّف: صفحاته مش ظاهرة بالمتجر لحد ما تشغّله.|The site is off: its pages aren't on the shop until you switch it on.|האתר כבוי: העמודים שלו לא מופיעים בחנות עד שתפעילו אותו.")}{" "}
          {hasPermission("features:read") ? <Link className="underline" to={`/admin/my-features/${encodeURIComponent(v.featureId)}`}>{say("صفحة الموقع|The site's page|עמוד האתר")}</Link> : null}
        </p>
      ) : null}
      {arranging && v.arrange ? (
        <ArrangePanel
          key={`${v.page.key}:${JSON.stringify(v.arrange.parts)}`}
          view={v}
          ask={ask}
          onSaved={(next) => {
            took(next);
            setArranging(false);
            // The page may now be shown, or hidden, in the menu.
            void qc.invalidateQueries({ queryKey: ["site-panels"] });
          }}
          onError={onError}
        />
      ) : null}
      {!v.parts.length && !arranging ? <p className="text-sm text-white/55" data-testid="site-panel-empty">{say("كل قطع هالصفحة مخفية. «رتّب الصفحة» بيرجّعها.|Every part of this page is hidden. «Arrange the page» brings them back.|כל החלקים בעמוד הזה מוסתרים. «לסדר את העמוד» מחזיר אותם.")}</p> : null}
      {v.parts.map((part) => {
        if (part.kind === "numbers") return <Numbers key={part.key} part={part} />;
        if (part.kind === "queue") return <Queue key={part.key} part={part} view={v} took={took} onError={onError} />;
        if (part.kind === "view") return <Table key={part.key} part={part} />;
        if (part.kind === "settings") return <Settings key={part.key} part={part} view={v} />;
        if (part.kind === "actions") return <Actions key={part.key} part={part} view={v} took={took} onError={onError} />;
        if (part.kind === "chart") return <ChartPart key={part.key} part={part} />;
        if (part.kind === "kanban") return <KanbanPart key={part.key} part={part} view={v} took={took} onError={onError} ask={ask} />;
        if (part.kind === "calendar") return <CalendarPart key={part.key} part={part} view={v} took={took} onError={onError} ask={ask} setAsk={setAsk} />;
        if (part.kind === "people") return <PeoplePart key={part.key} part={part} view={v} />;
        if (part.kind === "report") return <ReportPart key={part.key} part={part} view={v} ask={ask} setAsk={setAsk} />;
        if (part.kind === "map") return <MapPart key={part.key} part={part} />;
        if (part.kind === "game") return <GamePart key={part.key} part={part} view={v} took={took} onError={onError} />;
        if (part.kind === "tebex") return <TebexPart key={part.key} part={part} />;
        if (part.kind === "link") return <LinkPart key={part.key} part={part} view={v} />;
        if (part.kind === "streamers") return <StreamersPart key={part.key} part={part} />;
        if (part.kind === "wipe") return <WipePart key={part.key} part={part} />;
        return <ScannerPart key={part.key} part={part} view={v} took={took} onError={onError} />;
      })}
    </div>
  );
}

/** A part's numbers as cards (the admin's home shows a site's first ones too, dashboard/SiteToday.tsx). */
export function Numbers({ part }: { part: PanelNumbers }) {
  const lang = adminLang();
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid={`site-part-${part.key}`}>
      {part.items.map((n) => (
        <div key={n.key} className={box} data-testid={`site-number-${n.key}`}>
          <div className="text-sm text-white/65">{inLang(n.label, lang)}</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums" data-testid={`site-number-${n.key}-value`}>{n.value ?? "—"}</div>
          {n.before !== undefined ? <div className="mt-1 text-xs text-white/50" data-testid={`site-number-${n.key}-change`}>{changeText(n.value, n.before, n.window)}</div> : null}
        </div>
      ))}
    </section>
  );
}

/** Where a table opens in the data grid (for a member who may see it there). */
const gridLink = (slug: string) => `/admin/data?table=${encodeURIComponent(slug)}`;

function Queue({ part, view, took, onError }: { part: PanelQueue; view: PanelPageView; took: (v: PanelPageView) => void; onError: (e: unknown) => void }) {
  const lang = adminLang();
  const decide = useMutation({ mutationFn: ({ row, decision }: { row: string; decision: string }) => Panels.decide(view.featureId, view.page.key, part.key, row, decision, lang), onSuccess: took, onError });
  // A queue whose rows the staff vote on: each member's yes or no (pressed again: taken back), with a note.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const vote = useMutation({
    mutationFn: ({ row, said }: { row: string; said: "yes" | "no" | "none" }) => Panels.vote(view.featureId, view.page.key, part.key, row, said, notes[row] ?? "", lang),
    onSuccess: (next, { row }) => {
      took(next);
      setNotes((n) => {
        const next = { ...n };
        delete next[row];
        return next;
      });
    },
    onError,
  });
  const need = part.votes?.need ?? 0;
  const [first, ...rest] = part.columns;
  return (
    <section className={box} data-testid={`site-part-${part.key}`} data-kind="queue">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">
          {inLang(part.title, lang)} <span className="text-sm text-white/50" data-testid={`site-part-${part.key}-total`}>({part.total})</span>
        </h2>
        <Link className="text-xs text-white/60 underline" to={gridLink(part.table.slug)}>{say("افتح الجدول|Open the table|לפתוח את הטבלה")}</Link>
      </div>
      {part.problem ? <p className="mt-2 text-sm text-red-300">{part.problem}</p> : null}
      {!part.rows.length && !part.problem ? <p className="mt-3 text-sm text-white/55" data-testid={`site-part-${part.key}-empty`}>{inLang(part.empty ?? undefined, lang) || say("ما في شي بيستنّى.|Nothing waiting.|אין מה שממתין.")}</p> : null}
      <ul className="mt-3 space-y-2">
        {part.rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/5 bg-white/3 p-3" data-testid={`site-row-${row.id}`}>
            <div className="min-w-0 space-y-0.5 text-sm">
              {first ? <div className="font-medium">{cellText(first, row.cells[first.id], lang) || "—"}</div> : null}
              {rest.map((c) => {
                const text = cellText(c, row.cells[c.id], lang);
                return text ? (
                  <div key={c.id} className="text-white/65">
                    <span className="text-white/40">{inLang(c.name ?? undefined, lang)}: </span>
                    <span dir={c.type === "phone" || c.type === "email" || c.type === "$person" ? "ltr" : undefined}>{text}</span>
                  </div>
                ) : null;
              })}
              {part.votes && row.votes ? <Votes votes={row.votes} need={need} rowId={row.id} /> : null}
            </div>
            {part.canDecide ? (
              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="flex flex-wrap justify-end gap-2">
                  {part.decisions.map((d) => {
                    // A button "after the votes" waits for enough yes.
                    const waits = !!d.afterVotes && (row.votes?.yes ?? 0) < need;
                    return (
                      <Button key={d.key} size="sm" variant={d.tone === "good" ? "primary" : "secondary"} disabled={decide.isPending || waits} title={waits ? say("بدها {n} «مع» (هلّق {yes})|It waits for {n} yes ({yes} so far)|ממתין ל־{n} «בעד» ({yes} עד עכשיו)").replace("{n}", String(need)).replace("{yes}", String(row.votes?.yes ?? 0)) : undefined} onClick={() => decide.mutate({ row: row.id, decision: d.key })} data-testid={`site-decide-${row.id}-${d.key}`}>
                        {inLang(d.label, lang)}
                      </Button>
                    );
                  })}
                </div>
                {part.votes && row.votes ? (
                  <div className="flex flex-wrap items-center justify-end gap-2" data-testid={`site-vote-${row.id}`}>
                    <input
                      className="w-44 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs"
                      placeholder={say("ملاحظة مع صوتك (اختياري)|A note with your vote (optional)|הערה עם ההצבעה (לא חובה)")}
                      maxLength={500}
                      value={notes[row.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))}
                      data-testid={`site-vote-note-${row.id}`}
                    />
                    {(["yes", "no"] as const).map((said) => {
                      const mine = row.votes?.mine === said;
                      return (
                        <Button key={said} size="sm" variant={mine ? "primary" : "secondary"} aria-pressed={mine} disabled={vote.isPending} onClick={() => vote.mutate({ row: row.id, said: mine && !(notes[row.id] ?? "").trim() ? "none" : said })} data-testid={`site-vote-${row.id}-${said}`}>
                          {said === "yes" ? say("👍 مع|👍 Yes|👍 בעד") : say("👎 ضد|👎 No|👎 נגד")}
                        </Button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {part.total > part.rows.length ? <p className="mt-2 text-xs text-white/50">{say("و{n} كمان بالجدول.|And {n} more in the table.|ועוד {n} בטבלה.").replace("{n}", String(part.total - part.rows.length))}</p> : null}
    </section>
  );
}

/** A row's votes: how many each way (and how many yes its "after the votes" buttons wait for), and who said what. */
function Votes({ votes, need, rowId }: { votes: PanelVotes; need: number; rowId: string }) {
  return (
    <div className="mt-2 space-y-1 rounded-lg bg-white/4 p-2 text-xs" data-testid={`site-votes-${rowId}`}>
      <div className="font-medium text-white/80">
        <span data-testid={`site-votes-${rowId}-yes`}>{say("👍 {n} مع|👍 {n} yes|👍 {n} בעד").replace("{n}", String(votes.yes))}</span>
        {" · "}
        <span data-testid={`site-votes-${rowId}-no`}>{say("👎 {n} ضد|👎 {n} no|👎 {n} נגד").replace("{n}", String(votes.no))}</span>
        {need > 0 ? <span className="text-white/50">{" · "}{say("القبول بدّه {n} مع|Accepting takes {n} yes|קבלה דורשת {n} בעד").replace("{n}", String(need))}</span> : null}
      </div>
      {votes.by.map((v, i) => (
        <div key={`${v.name}-${i}`} className="text-white/60">
          <span className={v.vote === "yes" ? "text-emerald-300" : "text-red-300"}>{v.vote === "yes" ? "👍" : "👎"}</span> {v.name}
          {v.me ? <span className="text-white/40"> {say("(إنت)|(you)|(את/ה)")}</span> : null}
          {v.note ? <span className="text-white/50">: {v.note}</span> : null}
        </div>
      ))}
    </div>
  );
}

function Table({ part }: { part: PanelView }) {
  const lang = adminLang();
  return (
    <section className={box} data-testid={`site-part-${part.key}`} data-kind="view">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">
          {inLang(part.title, lang)} <span className="text-sm text-white/50">({part.total})</span>
        </h2>
        <Link className="text-xs text-white/60 underline" to={gridLink(part.table.slug)}>{say("افتح الجدول|Open the table|לפתוח את הטבלה")}</Link>
      </div>
      {part.problem ? <p className="mt-2 text-sm text-red-300">{part.problem}</p> : null}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-white/50">
              {part.columns.map((c) => (
                <th key={c.id} className="px-2 py-1.5 text-start font-normal">{inLang(c.name ?? undefined, lang)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {part.rows.map((row) => (
              <tr key={row.id} className="border-t border-white/5" data-testid={`site-view-row-${row.id}`}>
                {part.columns.map((c) => (
                  <td key={c.id} className="max-w-[18rem] truncate px-2 py-1.5" dir={c.type === "phone" ? "ltr" : undefined}>{cellText(c, row.cells[c.id], lang) || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!part.rows.length ? <p className="mt-2 text-sm text-white/55">{say("لسّا ما في شي هون.|Nothing here yet.|עוד אין כאן כלום.")}</p> : null}
      </div>
    </section>
  );
}

function Settings({ part, view }: { part: PanelSettings; view: PanelPageView }) {
  const lang = adminLang();
  const qc = useQueryClient();
  return (
    <SettingsEditor
      key={`${view.featureId}:${JSON.stringify(part.values)}`}
      featureId={view.featureId}
      view={{ declared: part.declared, values: part.values }}
      title={part.title ? inLang(part.title, lang) : null}
      onSaved={(saved) => {
        qc.setQueryData(["my-features", view.featureId], saved);
        void qc.invalidateQueries({ queryKey: ["site-panel", view.featureId] });
      }}
    />
  );
}

function Actions({ part, view, took, onError }: { part: PanelActions; view: PanelPageView; took: (v: PanelPageView) => void; onError: (e: unknown) => void }) {
  const lang = adminLang();
  const [confirm, dialog] = useConfirm();
  const qc = useQueryClient();
  const act = useMutation({
    mutationFn: (action: string) => Panels.act(view.featureId, view.page.key, part.key, action, lang),
    onSuccess: (next) => {
      took(next);
      // The site's page shows the settings too.
      void qc.invalidateQueries({ queryKey: ["my-features", view.featureId] });
      toast.success(say("صار: الموقع تغيّر|Done: the site changed|בוצע: האתר השתנה"));
    },
    onError,
  });
  // Only what would change something now (no "close booking" while it is closed).
  const open = part.items.filter((a) => !a.done);
  if (!open.length) return null;
  return (
    <section className={box} data-testid={`site-part-${part.key}`} data-kind="actions">
      {part.title ? <h2 className="mb-3 font-medium">{inLang(part.title, lang)}</h2> : null}
      <div className="flex flex-wrap gap-3">
        {open.map((a) => (
          <div key={a.key} className="max-w-xs">
            <Button
              size="sm"
              variant="secondary"
              isLoading={act.isPending && act.variables === a.key}
              onClick={async () => {
                if (await confirm({ title: inLang(a.label, lang), message: inLang(a.note ?? undefined, lang) || say("بيتغيّر الموقع هلّق.|The site changes now.|האתר ישתנה עכשיו."), confirmText: inLang(a.label, lang), variant: "info" })) act.mutate(a.key);
              }}
              data-testid={`site-action-${a.key}`}
            >
              {inLang(a.label, lang)}
            </Button>
            {a.note ? <p className="mt-1 text-xs text-white/50">{inLang(a.note, lang)}</p> : null}
          </div>
        ))}
      </div>
      {dialog}
    </section>
  );
}
