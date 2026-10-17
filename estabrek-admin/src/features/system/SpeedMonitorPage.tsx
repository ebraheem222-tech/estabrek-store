// مراقبة السرعة والأولوية: what makes the server slow (routes, database queries,
// the main thread, errors) and the request lanes that keep heavy work from making
// checkout and browsing wait. Numbers refresh every 5 seconds. The second tab
// (تجربة الزباين) is the shop's speed on shoppers' own devices.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import * as SpeedAPI from "../../api/speed.api";
import type { LaneName, Monitor, SpeedLive, TrafficConfig } from "../../api/speed.api";
import { relativeTime } from "../team/teamText";
import { formatBytes, uptimeText } from "./cacheText";
import { Bar, NumberInput, Segmented, Stat } from "./cacheParts";
import { ShopperSpeedPanel } from "./ShopperSpeedPanel";
import {
  LANES,
  LANE_TEXT,
  MODE_TEXT,
  describeTrafficField,
  indexWhyText,
  isValidMatch,
  loopStatus,
  msText,
  poolAdvice,
  rowsText,
  ruleForRoute,
  shareText,
  speedChangedPaths,
  speedOutOfRange,
  speedPatch,
  threadsAdvice,
  upsertRule,
} from "./speedText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";
const describe = (paths: string[]) => paths.map((p) => describeTrafficField(p) ?? p).join("، ") || "بدون تغيير";

type Tab = "server" | "shoppers";

function PageTop({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-lg font-semibold">مراقبة السرعة والأولوية</h1>
      <div className="sm:w-96">
        <Segmented
          value={tab}
          disabled={false}
          onChange={onTab}
          options={[
            { value: "server", label: "السيرفر" },
            { value: "shoppers", label: "تجربة الزباين" },
          ]}
        />
      </div>
    </div>
  );
}

export default function SpeedMonitorPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("system:write");
  const [tab, setTab] = useState<Tab>(() => (typeof window !== "undefined" && window.location.hash === "#shoppers" ? "shoppers" : "server"));
  const q = useQuery({ queryKey: ["system", "speed"], queryFn: SpeedAPI.getSpeedPage });
  const liveQ = useQuery({ queryKey: ["system", "speed", "live"], queryFn: SpeedAPI.getSpeedLive, refetchInterval: 5000, enabled: !!q.data && tab === "server" });
  const [draft, setDraft] = useState<TrafficConfig | null>(null);
  const [seen, setSeen] = useState<TrafficConfig | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  if (q.data && q.data.config !== seen) {
    setSeen(q.data.config);
    setDraft(q.data.config);
  }
  const patch = useMemo(() => (draft && q.data ? speedPatch(draft, q.data.config) : {}), [draft, q.data]);
  const dirty = Object.keys(patch).length > 0;
  const bad = useMemo(() => (draft && q.data ? speedOutOfRange(draft, q.data.limits) : []), [draft, q.data]);
  const onError = (e: unknown) => toast.error("ما زبط", { description: getApiErrorMessage(e) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["system", "speed"] });
  const save = useMutation({ mutationFn: () => SpeedAPI.saveSpeed(patch), onSuccess: (o) => (toast.success("انحفظت الإعدادات", { description: describe(o.changed) }), refresh()), onError });
  const reset = useMutation({ mutationFn: SpeedAPI.resetSpeed, onSuccess: () => (toast.success("رجعت للافتراضي"), setConfirmReset(false), refresh()), onError });
  const resetStats = useMutation({ mutationFn: SpeedAPI.resetSpeedStats, onSuccess: () => (toast.success("بلّشت الأرقام من جديد"), refresh()), onError });

  const onTab = (t: Tab) => {
    setTab(t);
    try {
      window.history.replaceState(null, "", t === "server" ? window.location.pathname : `#${t}`);
    } catch {
      /* ignore */
    }
  };
  if (tab === "shoppers") {
    return (
      <div dir="rtl" className="space-y-4 pb-24" data-testid="speed-page">
        <PageTop tab={tab} onTab={onTab} />
        <ShopperSpeedPanel />
      </div>
    );
  }
  if (!q.data || !draft) {
    return (
      <div dir="rtl" className="space-y-4">
        <PageTop tab={tab} onTab={onTab} />
        <div className={box}>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</div>
      </div>
    );
  }
  const d = q.data;
  const live: SpeedLive = liveQ.data ?? d;
  const m = live.monitor;
  const loop = loopStatus(m.eventLoop.now.p99);
  const advice = [poolAdvice(m.databasePool), threadsAdvice(m.workerThreads)].filter(Boolean) as string[];
  const setLane = (l: LaneName, f: keyof TrafficConfig["lanes"][LaneName], v: number) =>
    setDraft((p) => (p ? { ...p, lanes: { ...p.lanes, [l]: { ...p.lanes[l], [f]: v } } } : p));
  const moveRoute = (route: string, lane: LaneName) => setDraft((p) => (p ? { ...p, routes: upsertRule(p.routes, ruleForRoute(route, lane)) } : p));

  return (
    <div dir="rtl" className="space-y-4 pb-24" data-testid="speed-page">
      <PageTop tab={tab} onTab={onTab} />
      <section className={box}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-white/60">
              شو اللي بيبطّئ السيرفر (الروابط، استعلامات قاعدة البيانات، الأخطاء)، و«المسارات» اللي بتخلّي الشغل التقيل يستنى دوره بدل ما يأخّر الدفع والتصفّح.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge size="sm" variant={loop.variant} dot>
                {`الخيط الرئيسي: ${loop.label} (${msText(m.eventLoop.now.p99)})`}
              </Badge>
              <Badge size="sm">{`${m.databasePool.limit} اتصال بقاعدة البيانات`}</Badge>
              <Badge size="sm">{`${m.workerThreads.size} خيوط للصور وكلمات المرور`}</Badge>
              <Badge size="sm">{`الأرقام من ${uptimeText((m.now - Date.parse(m.since)) / 1000)}`}</Badge>
              <Badge size="sm" variant={d.config.mode === "on" ? "success" : d.config.mode === "watch" ? "info" : "default"}>
                {`المسارات: ${MODE_TEXT[d.config.mode].label}`}
              </Badge>
            </div>
            {advice.length ? (
              <ul className="mt-3 space-y-1 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                {advice.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : null}
          </div>
          {canWrite ? (
            <Button size="sm" variant="secondary" className="shrink-0 whitespace-nowrap" onClick={() => resetStats.mutate()} isLoading={resetStats.isPending}>
              ابدأ الأرقام من جديد
            </Button>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="طلبات" value={m.totals.requests.toLocaleString("en")} note={`بمعدل ${msText(m.totals.avgMs)}`} />
          <Stat label="بطيئة" value={m.minutes.reduce((s, x) => s + x.slow, 0).toLocaleString("en")} note={`أبطأ من ${msText(d.config.slowMs)}`} />
          <Stat label="أخطاء سيرفر" value={m.totals.errors.toLocaleString("en")} note="500 وفوق" />
          <Stat label="ذاكرة السيرفر" value={formatBytes(m.memory.rssBytes)} note={`منها ${formatBytes(m.memory.heapUsedBytes)} بيانات`} />
        </div>
        <LoopChart monitor={m} />
      </section>

      <section className={box}>
        <h2 className="font-semibold">المسارات (الأولوية)</h2>
        <p className="mt-1 text-xs text-white/60">{MODE_TEXT[draft.mode].hint}</p>
        <div className="mt-3 sm:max-w-md">
          <Segmented
            value={draft.mode}
            disabled={!canWrite}
            onChange={(v) => setDraft({ ...draft, mode: v })}
            options={(Object.keys(MODE_TEXT) as TrafficConfig["mode"][]).map((k) => ({ value: k, label: MODE_TEXT[k].label }))}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberInput
            id="speed-global"
            label="الحد الكلي"
            unit="طلب بنفس الوقت"
            help="كل المسارات مع بعض."
            value={draft.globalLimit}
            def={d.defaults.globalLimit}
            limits={d.limits.globalLimit}
            invalid={bad.includes("traffic.globalLimit")}
            disabled={!canWrite}
            onChange={(v) => setDraft({ ...draft, globalLimit: v })}
          />
          <NumberInput
            id="speed-slow"
            label="حد الطلب البطيء"
            unit="ms"
            help="الأبطأ من هيك بيبيّن كمثال تحت."
            value={draft.slowMs}
            def={d.defaults.slowMs}
            limits={d.limits.slowMs}
            invalid={bad.includes("traffic.slowMs")}
            disabled={!canWrite}
            onChange={(v) => setDraft({ ...draft, slowMs: v })}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2" data-testid="speed-lanes">
          {LANES.map((l) => {
            const s = live.lanes.lanes[l];
            const c = draft.lanes[l];
            return (
              <div key={l} className="rounded-xl border border-white/10 bg-white/[0.03] p-4" data-testid={`lane-${l}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{LANE_TEXT[l].label}</h3>
                    <p className="text-xs text-white/50">{LANE_TEXT[l].note}</p>
                  </div>
                  <span className="text-sm tabular-nums">{`${s.running}/${s.limit}`}</span>
                </div>
                <Bar value={s.limit ? s.running / s.limit : 0} />
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <Mini label="عم يستنى" value={`${s.waiting}`} />
                  <Mini label="استنى" value={`${s.queued} · ${msText(s.avgWaitMs)}`} />
                  <Mini label="أطول انتظار" value={msText(s.waitMsMax)} />
                  <Mini label="مشغول (وقت)" value={`${s.timedOut}`} />
                  <Mini label="مشغول (دور مليان)" value={`${s.rejected}`} />
                  <Mini label="نسخة من الكاش" value={`${s.servedStale}`} />
                  {d.config.mode === "watch" ? <Mini label="كان رح يستنى" value={`${s.wouldQueue}`} /> : null}
                  <Mini label="أعلى عدد" value={`${s.peak}`} />
                </dl>
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
                  {(["limit", "queue", "waitMs", "weight"] as const).map((f) => (
                    <NumberInput
                      key={f}
                      id={`lane-${l}-${f}`}
                      label={{ limit: "الحد", queue: "طول الدور", waitMs: "أطول انتظار", weight: "الأولوية" }[f]}
                      unit={{ limit: "بنفس الوقت", queue: "طلب", waitMs: "ms", weight: "أدوار" }[f]}
                      value={c[f]}
                      def={d.defaults.lanes[l][f]}
                      limits={d.limits[f]}
                      invalid={bad.includes(`traffic.lanes.${l}.${f}`)}
                      disabled={!canWrite}
                      onChange={(v) => setLane(l, f, v)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={box}>
        <h2 className="font-semibold">الروابط الأبطأ (حسب الوقت الكلي)</h2>
        <p className="mt-1 text-xs text-white/60">«قاعدة البيانات» = قديش من وقته كان استعلامات. «استنى» = بدوره بالمسار. بتقدر تنقل رابط لمسار تاني من القائمة.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs" data-testid="speed-routes">
            <thead className="text-white/50">
              <tr className="text-right">
                <th className="py-2 font-normal">الرابط</th>
                <th className="font-normal">مرات</th>
                <th className="font-normal">المعدل</th>
                <th className="font-normal">p95</th>
                <th className="font-normal">الأبطأ</th>
                <th className="font-normal">قاعدة البيانات</th>
                <th className="font-normal">استنى</th>
                <th className="font-normal">أخطاء</th>
                <th className="font-normal">المسار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {m.routes.map((r) => (
                <tr key={r.route}>
                  <td className="py-2 font-mono" dir="ltr" style={{ textAlign: "right" }}>
                    {r.route}
                  </td>
                  <td className="tabular-nums">{r.count.toLocaleString("en")}</td>
                  <td className="tabular-nums">{msText(r.avgMs)}</td>
                  <td className="tabular-nums">{msText(r.p95Ms)}</td>
                  <td className="tabular-nums">{msText(r.maxMs)}</td>
                  <td className="tabular-nums">{`${shareText(r.dbShare)} · ${r.avgDbQueries}`}</td>
                  <td className="tabular-nums">{msText(r.avgWaitMs)}</td>
                  <td className={`tabular-nums ${r.errors ? "text-red-300" : ""}`}>{r.errors}</td>
                  <td>
                    {canWrite && r.lane ? (
                      <select value={r.lane} onChange={(e) => moveRoute(r.route, e.target.value as LaneName)} className={`${field} h-8 text-xs`} aria-label="المسار">
                        {LANES.map((l) => (
                          <option key={l} value={l}>
                            {LANE_TEXT[l].label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      LANE_TEXT[r.lane as LaneName]?.label ?? "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!m.routes.length ? <p className="py-3 text-sm text-white/60">لسا ما في طلبات.</p> : null}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={box}>
          <h2 className="font-semibold">أمثلة على طلبات بطيئة</h2>
          {m.slow.length ? (
            <ul className="mt-3 divide-y divide-white/10 text-xs" data-testid="speed-slow">
              {m.slow.slice(0, 20).map((s, i) => (
                <li key={`${s.at}-${i}`} className="py-2">
                  <div className="flex justify-between gap-2">
                    <span className="truncate font-mono" dir="ltr">
                      {s.route}
                    </span>
                    <span className={`shrink-0 tabular-nums ${s.status >= 500 ? "text-red-300" : ""}`}>{msText(s.ms)}</span>
                  </div>
                  <div className="text-white/50">
                    {[relativeTime(s.at), `قاعدة البيانات ${msText(s.dbMs)} (${s.dbCount})`, s.waitedMs ? `استنى ${msText(s.waitedMs)}` : null, `${s.status}`].filter(Boolean).join(" · ")}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-white/60">ما في طلبات أبطأ من {msText(d.config.slowMs)}.</p>
          )}
        </section>
        <section className={box}>
          <h2 className="font-semibold">الاستعلامات الأبطأ (قاعدة البيانات)</h2>
          {m.queries.length ? (
            <ul className="mt-3 divide-y divide-white/10 text-xs" data-testid="speed-queries">
              {m.queries.slice(0, 15).map((qq) => (
                <li key={qq.sql} className="py-2">
                  <div className="line-clamp-2 font-mono text-white/80" dir="ltr" title={qq.sql}>
                    {qq.sql}
                  </div>
                  <div className="text-white/50">{`${qq.count.toLocaleString("en")} مرة · بمعدل ${msText(qq.avgMs)} · الأبطأ ${msText(qq.maxMs)} · الكل ${msText(qq.totalMs)}`}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-white/60">لسا ما في استعلامات.</p>
          )}
          <IndexAdvice />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={box}>
          <h2 className="font-semibold">أخطاء السيرفر</h2>
          {m.errors.length ? (
            <ul className="mt-3 divide-y divide-white/10 text-xs" data-testid="speed-errors">
              {m.errors.slice(0, 15).map((e) => (
                <li key={e.route} className="py-2">
                  <div className="flex justify-between gap-2">
                    <span className="truncate font-mono" dir="ltr">
                      {e.route}
                    </span>
                    <span className="shrink-0 text-red-300">{`${e.count}×`}</span>
                  </div>
                  <div className="text-white/50">{[relativeTime(e.lastAt), e.lastMessage].filter(Boolean).join(" · ")}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-white/60">ما في أخطاء.</p>
          )}
        </section>
        <RulesCard draft={draft} builtIn={d.builtInRoutes} canWrite={canWrite} onChange={(routes) => setDraft({ ...draft, routes })} />
      </div>

      {canWrite ? (
        <div className="flex justify-start">
          <Button size="sm" variant="ghost" onClick={() => setConfirmReset(true)}>
            رجوع إعدادات المسارات للافتراضي
          </Button>
        </div>
      ) : null}

      {canWrite && dirty ? (
        <div className="fixed inset-x-0 bottom-16 z-30 px-4 sm:bottom-4 lg:right-72" data-testid="speed-save-bar">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[var(--surface,#fff)] p-3 shadow-xl">
            <span className="text-sm">
              {bad.length ? <span className="text-red-300">في قيم برّا الحد المسموح: {describe(bad)}</span> : <>تغييرات مش محفوظة: {describe(speedChangedPaths(draft, d.config))}</>}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDraft(d.config)}>
                تراجع
              </Button>
              <Button variant="primary" onClick={() => save.mutate()} isLoading={save.isPending} disabled={bad.length > 0}>
                حفظ
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmReset}
        title="رجوع للافتراضي"
        message="إعدادات المسارات بترجع لـ «مراقبة بس» والحدود الافتراضية، وقواعدك بتنمسح. النسخة الحالية بتنحفظ بالسجل (صفحة السرعة والكاش)."
        confirmText="رجوع للافتراضي"
        variant="warning"
        isLoading={reset.isPending}
        onConfirm={() => reset.mutate()}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}

/** Missing indexes for the slow queries: asked for (it reads the database's index list), never created from here. */
function IndexAdvice() {
  const q = useQuery({ queryKey: ["system", "speed", "indexes"], queryFn: SpeedAPI.getIndexAdvice, enabled: false });
  const copy = (text: string) => {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => toast.success("انتسخ"))
      .catch(() => undefined);
  };
  return (
    <div className="mt-4 border-t border-white/10 pt-3" data-testid="speed-indexes">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-white/60">فهارس ناقصة: بتخلّي قاعدة البيانات تلاقي الأسطر بدون ما تقرا الجدول كله.</span>
        <Button size="sm" variant="secondary" onClick={() => void q.refetch()} isLoading={q.isFetching}>
          {q.data ? "افحص من جديد" : "اقترح فهارس"}
        </Button>
      </div>
      {q.isError ? <p className="mt-2 text-xs text-red-300">{getApiErrorMessage(q.error)}</p> : null}
      {q.data && !q.data.suggestions.length ? (
        <p className="mt-2 text-xs text-white/60">{q.data.checked ? `انفحص ${q.data.checked} استعلام بطيء: ما في فهارس ناقصة.` : "ما في استعلامات بطيئة كفاية لنفحصها لسا."}</p>
      ) : null}
      {q.data?.suggestions.length ? (
        <ul className="mt-3 space-y-3 text-xs">
          {q.data.suggestions.map((s) => (
            <li key={`${s.table}|${s.columns.join(",")}`} className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
              <div className="font-medium">{`${s.table}: ${s.columns.join("، ")}`}</div>
              <p className="mt-0.5 text-white/70">{indexWhyText(s)}</p>
              <p className="mt-0.5 text-white/50">{`${rowsText(s.rows)} · ${s.query.count.toLocaleString("en")} مرة بمعدل ${msText(s.query.avgMs)}`}</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-black/20 px-2 py-1 font-mono" dir="ltr" title={`model ${s.table} { … ${s.prisma} }`}>
                  {s.prisma}
                </code>
                <Button size="sm" variant="ghost" onClick={() => copy(s.prisma)}>
                  انسخ
                </Button>
              </div>
              <p className="mt-2 text-white/50">{`ضيف السطر لـ model ${s.table} بـ schema.prisma واعمل migration. ما بينعمل من هون: الفهرس تغيير بقاعدة البيانات، وبناؤه على جدول كبير بياخد وقت.`}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-white/50">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/** The main thread's delay over the last 10 minutes (every 10 s, p99). */
function LoopChart({ monitor }: { monitor: Monitor }) {
  const h = monitor.eventLoop.history.slice(-60);
  if (h.length < 2) return null;
  const max = Math.max(50, ...h.map((x) => x.p99));
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-white/60">
        <span>تأخير الخيط الرئيسي، آخر 10 دقايق</span>
        <span>{`الأعلى ${msText(Math.max(...h.map((x) => x.p99)))}`}</span>
      </div>
      <svg viewBox="0 0 600 50" className="mt-2 h-12 w-full" preserveAspectRatio="none" role="img" aria-label="تأخير الخيط الرئيسي">
        {h.map((x, i) => {
          const hh = Math.max(1, (x.p99 / max) * 48);
          const color = x.p99 < 50 ? "fill-emerald-400/80" : x.p99 < 200 ? "fill-amber-400/80" : "fill-red-400/80";
          return <rect key={x.t} x={(h.length - 1 - i) * 10 + 1} y={50 - hh} width={8} height={hh} className={color} />;
        })}
      </svg>
    </div>
  );
}

function RulesCard({ draft, builtIn, canWrite, onChange }: { draft: TrafficConfig; builtIn: SpeedAPI.RouteRule[]; canWrite: boolean; onChange: (r: SpeedAPI.RouteRule[]) => void }) {
  const [match, setMatch] = useState("");
  const [lane, setLane] = useState<LaneName>("heavy");
  const valid = isValidMatch(match);
  return (
    <section className={box} data-testid="speed-rules">
      <h2 className="font-semibold">قواعد المسارات</h2>
      <p className="mt-1 text-xs text-white/60">قواعدك قبل القواعد الجاهزة. الأطول بيربح. مثال: «GET /v1/catalog/attribute-facets» أو «/v1/ai» (أي نوع طلب).</p>
      {draft.routes.length ? (
        <ul className="mt-3 divide-y divide-white/10 text-xs">
          {draft.routes.map((r) => (
            <li key={r.match} className="flex items-center justify-between gap-2 py-2">
              <span className="truncate font-mono" dir="ltr">
                {r.match}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span>{LANE_TEXT[r.lane].label}</span>
                {canWrite ? (
                  <button type="button" className="text-red-300 underline" onClick={() => onChange(draft.routes.filter((x) => x.match !== r.match))}>
                    شيل
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-white/60">ما في قواعد خاصة.</p>
      )}
      {canWrite ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={match} onChange={(e) => setMatch(e.target.value)} placeholder="GET /v1/..." dir="ltr" className={`${field} min-w-0 flex-1`} aria-label="الرابط" />
          <select value={lane} onChange={(e) => setLane(e.target.value as LaneName)} className={field} aria-label="المسار">
            {LANES.map((l) => (
              <option key={l} value={l}>
                {LANE_TEXT[l].label}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!valid}
            onClick={() => {
              onChange(upsertRule(draft.routes, { match: match.trim(), lane }));
              setMatch("");
            }}
          >
            ضيف
          </Button>
        </div>
      ) : null}
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-white/60">القواعد الجاهزة ({builtIn.length})</summary>
        <ul className="mt-2 space-y-1">
          {builtIn.map((r) => (
            <li key={r.match} className="flex justify-between gap-2">
              <span className="font-mono" dir="ltr">
                {r.match}
              </span>
              <span className="text-white/60">{LANE_TEXT[r.lane].label}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
