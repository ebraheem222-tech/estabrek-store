// السجل: every change from the admin in one place (settings, speed, security,
// pages, products, stock, prices, scheduled changes), by day, and one button to go
// back: to before a change, or undo it. Each part shows only to members who can
// see it, and goes back only for those who can change it.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import * as HistoryAPI from "../../api/history.api";
import type { HistoryArea, HistoryEntry } from "../../api/history.api";
import { Segmented } from "./cacheParts";
import { AREA_TEXT, entrySentence, groupByDay, noRestoreText, rangeOf, restoreLabel } from "./historyText";

type Range = "today" | "yesterday" | "week" | "month";
const field = "h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm";
const time = (iso: string) => new Date(iso).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });

export default function HistoryPage() {
  const qc = useQueryClient();
  const [range, setRange] = useState<Range>("week");
  const [area, setArea] = useState<HistoryArea | "">("");
  // The range is worked out when it's chosen (not at every render).
  const [dates, setDates] = useState(() => rangeOf("week"));
  const q = useQuery({ queryKey: ["history", dates.from, dates.to, area], queryFn: () => HistoryAPI.getHistory({ ...dates, area: area || null }) });
  const [confirm, setConfirm] = useState<HistoryEntry | null>(null);
  const restore = useMutation({
    mutationFn: (e: HistoryEntry) => HistoryAPI.restoreHistory(e.area, e.id),
    onSuccess: (r, e) => {
      toast.success(e.restore === "before" ? "رجع لقبل هالتغيير" : "انرجع عنه", { description: r.note ?? undefined });
      setConfirm(null);
      void qc.invalidateQueries();
    },
    onError: (err) => toast.error("ما زبط", { description: getApiErrorMessage(err) }),
  });
  const pick = (r: Range) => {
    setRange(r);
    setDates(rangeOf(r));
  };

  return (
    <div dir="rtl" className="space-y-4 pb-16" data-testid="history-page">
      <PageHeader title="السجل" subtitle="كل اللي تغيّر من لوحة الإدارة، يوم بيوم، وكبسة وحدة لترجع: لقبل التغيير، أو تتراجع عنه. الرجوع نفسه بيتسجّل، فبتقدر ترجع عنه كمان." />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-96">
          <Segmented
            value={range}
            disabled={false}
            onChange={pick}
            options={[
              { value: "today", label: "اليوم" },
              { value: "yesterday", label: "مبارح" },
              { value: "week", label: "أسبوع" },
              { value: "month", label: "شهر" },
            ]}
          />
        </div>
        <select className={field} value={area} onChange={(e) => setArea(e.target.value as HistoryArea | "")} aria-label="القسم">
          <option value="">كل الأقسام</option>
          {(q.data?.areas ?? (Object.keys(AREA_TEXT) as HistoryArea[])).map((a) => (
            <option key={a} value={a}>
              {AREA_TEXT[a]}
            </option>
          ))}
        </select>
      </div>

      {!q.data ? (
        <Card>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</Card>
      ) : !q.data.entries.length ? (
        <Card>
          <p className="text-sm text-white/60">ما تغيّر شي بهالمدة.</p>
        </Card>
      ) : (
        groupByDay(q.data.entries).map((g) => (
          <section key={g.key} className="space-y-2">
            <h2 className="px-1 text-sm font-semibold text-white/70">{g.label}</h2>
            <Card padding="none">
              <ul className="divide-y divide-white/10" data-testid="history-list">
                {g.entries.map((e) => {
                  const label = restoreLabel(e);
                  const why = noRestoreText(e);
                  const can = q.data.canRestore[e.area];
                  return (
                    <li key={`${e.area}:${e.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" data-testid={`history-${e.area}-${e.id}`}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="tabular-nums text-white/50">{time(e.at)}</span>
                          <Badge size="sm">{AREA_TEXT[e.area]}</Badge>
                          {e.title ? (
                            e.link ? (
                              <Link to={e.link} className="truncate font-medium hover:underline">
                                {e.title}
                              </Link>
                            ) : (
                              <span className="truncate font-medium">{e.title}</span>
                            )
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-sm text-white/80">{entrySentence(e)}</p>
                        {e.who ? <p className="text-xs text-white/50">{e.who}</p> : null}
                      </div>
                      {label && can ? (
                        <Button size="sm" variant="secondary" onClick={() => setConfirm(e)}>
                          {label}
                        </Button>
                      ) : why ? (
                        <span className="text-xs text-white/40">{why}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        ))
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm ? `${restoreLabel(confirm) ?? ""}: ${AREA_TEXT[confirm.area]}${confirm.title ? ` · ${confirm.title}` : ""}` : ""}
        message={
          !confirm
            ? ""
            : confirm.restore === "before"
              ? confirm.area === "products"
                ? "المنتج بيرجع متل ما كان قبل هالتغيير (ألوانه وصوره ومقاساته وأسعاره). المخزون بيضل متل ما هو هلّق."
                : confirm.area === "speed"
                  ? "كل إعدادات السرعة والكاش بترجع متل ما كانت قبل هالتغيير (الحركة، الرفع، المسارات، المهام كمان)."
                  : "بيرجع متل ما كان قبل هالتغيير. الشكل الحالي بينحفظ قبل، فبتقدر ترجعله."
              : "هالتغيير بس بيرجع. اللي تغيّر من بعده بإيدك بيضل متل ما هو."
        }
        confirmText={confirm ? restoreLabel(confirm) ?? "رجّع" : "رجّع"}
        variant="warning"
        isLoading={restore.isPending}
        onConfirm={() => {
          if (confirm) restore.mutate(confirm);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
