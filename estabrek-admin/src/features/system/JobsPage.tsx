// المهام بالخلفية: everything the server does on its own (sending messages,
// back-in-stock emails, the daily backup, popularity, shoppers' speed, the
// cache's housekeeping, video conversions): how each run went, the last error,
// pause / resume, its timer, and "run now". Refreshes every 5 seconds.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import * as JobsAPI from "../../api/jobs.api";
import type { Job, JobsPage as JobsData } from "../../api/jobs.api";
import { uptimeText } from "./cacheText";
import { Stat } from "./cacheParts";
import { JOB_TEXT, jobLabel } from "./jobNames";
import {
  JOB_GROUPS,
  OFF_TEXT,
  PAUSE_WARNING,
  STATUS_TEXT,
  TRIGGER_TEXT,
  agoText,
  everyText,
  inText,
  jobHealth,
  jobsSummary,
  runSummary,
  runTimeText,
  timerChoices,
} from "./jobsText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";
const KEY = ["system", "jobs"];

export default function JobsPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("system:write");
  const q = useQuery({ queryKey: KEY, queryFn: JobsAPI.getJobs, refetchInterval: 5000 });
  const [confirmPause, setConfirmPause] = useState<string | null>(null);
  const onError = (e: unknown) => toast.error("ما زبط", { description: getApiErrorMessage(e) });
  const put = (data: JobsData) => qc.setQueryData(KEY, data);

  const save = useMutation({
    mutationFn: (v: { name: string; paused?: boolean; everyMs?: number | null }) => JobsAPI.saveJobs({ jobs: { [v.name]: { paused: v.paused, everyMs: v.everyMs } } }),
    onSuccess: (data, v) => {
      put(data);
      setConfirmPause(null);
      toast.success(v.paused === true ? "توقّف" : v.paused === false ? "رجع يشتغل" : "انحفظ الوقت", { description: jobLabel(v.name) });
    },
    onError,
  });
  const run = useMutation({
    mutationFn: (name: string) => JobsAPI.runJob(name),
    onSuccess: (data, name) => {
      put(data);
      if (data.busy) toast.info("شغّال هلّق", { description: `${jobLabel(name)}: استنى ليخلص.` });
      else if (data.run && !data.run.ok) toast.error(`${jobLabel(name)}: فشل`, { description: data.run.error ?? "" });
      else if (data.run) toast.success(jobLabel(name), { description: runSummary(name, data.run) });
      else toast.info(jobLabel(name), { description: "بلّش وعم يكمّل بالخلفية." });
    },
    onError,
  });

  if (!q.data) {
    return (
      <div className={box}>
        {q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}
      </div>
    );
  }
  const d = q.data;
  const sum = jobsSummary(d.jobs, d.now);
  const setPaused = (job: Job, paused: boolean) => {
    if (paused && PAUSE_WARNING[job.name]) setConfirmPause(job.name);
    else save.mutate({ name: job.name, paused });
  };

  return (
    <div className="space-y-4 pb-24" data-testid="jobs-page">
      <section className={box}>
        <h1 className="text-lg font-semibold">المهام بالخلفية</h1>
        <p className="mt-1 text-sm text-white/60">
          كل شي السيرفر بيعمله لحاله: بعت الرسايل، إيميلات «رجع للمخزون»، النسخة الاحتياطية، حفظ الشعبية وسرعة الزباين، تنظيف الكاش وتحويل الفيديوهات. شوف آخر مرة
          اشتغل كل واحد وشو عمل، ووقّفه أو غيّر وقته أو شغّله هلّق.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="مهام" value={String(d.jobs.length)} note={`الأرقام من ${uptimeText((d.now - Date.parse(d.since)) / 1000)}`} />
          <Stat label="شغّالة هلّق" value={String(sum.running)} />
          <Stat label="موقّفة" value={String(sum.paused + sum.off)} note={sum.off ? `${sum.off} من السيرفر` : undefined} />
          <Stat label="فيها مشكلة" value={String(sum.problems)} testId="jobs-problems" />
        </div>
        {!d.scheduling ? <p className="mt-3 text-xs text-amber-300">المهام مش شغّالة على هالسيرفر (وضع تجربة أو سكربت).</p> : null}
      </section>

      {JOB_GROUPS.map(({ group, label }) => {
        const list = d.jobs.filter((j) => j.group === group);
        if (!list.length) return null;
        return (
          <section key={group} className="space-y-3">
            <h2 className="px-1 text-sm font-semibold text-white/70">{label}</h2>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {list.map((job) => (
                <JobCard
                  key={job.name}
                  job={job}
                  now={d.now}
                  canWrite={canWrite}
                  busy={(save.isPending && save.variables?.name === job.name) || (run.isPending && run.variables === job.name)}
                  onRun={() => run.mutate(job.name)}
                  onPause={(p) => setPaused(job, p)}
                  onTimer={(ms) => save.mutate({ name: job.name, everyMs: ms })}
                />
              ))}
            </div>
          </section>
        );
      })}

      <ConfirmDialog
        open={!!confirmPause}
        title={`توقيف: ${confirmPause ? jobLabel(confirmPause) : ""}`}
        message={confirmPause ? `${PAUSE_WARNING[confirmPause]} بيضل موقّف حتى بعد إعادة تشغيل السيرفر.` : ""}
        confirmText="وقّف"
        variant="warning"
        isLoading={save.isPending}
        onConfirm={() => {
          if (confirmPause) save.mutate({ name: confirmPause, paused: true });
        }}
        onCancel={() => setConfirmPause(null)}
      />
    </div>
  );
}

function JobCard({
  job,
  now,
  canWrite,
  busy,
  onRun,
  onPause,
  onTimer,
}: {
  job: Job;
  now: number;
  canWrite: boolean;
  busy: boolean;
  onRun: () => void;
  onPause: (paused: boolean) => void;
  onTimer: (ms: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const text = JOB_TEXT[job.name];
  const status = STATUS_TEXT[job.status];
  const health = jobHealth(job, now);
  const last = job.runs[0];
  const choices = timerChoices(job);

  return (
    <article className={`${box} ${health?.variant === "danger" ? "border-red-400/40" : ""}`} data-testid={`job-${job.name}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{text?.label ?? job.name}</h3>
          <p className="mt-0.5 text-xs text-white/60">{text?.what}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          <Badge size="sm" variant={status.variant} dot={job.status === "running"}>
            {status.label}
          </Badge>
          {health ? (
            <Badge size="sm" variant={health.variant}>
              {health.label}
            </Badge>
          ) : null}
        </div>
      </div>

      {job.off ? <p className="mt-3 rounded-xl bg-white/[0.04] p-2.5 text-xs text-white/70">{OFF_TEXT[job.off] ?? `مطفي من السيرفر (${job.off}).`}</p> : null}
      {health ? <p className={`mt-3 text-xs ${health.variant === "danger" ? "text-red-300" : "text-amber-300"}`}>{health.note}</p> : null}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-white/50">آخر مرة</dt>
          <dd>{job.status === "running" ? `شغّال من ${agoText(job.runningSince, now).replace("قبل ", "")}` : agoText(last?.at, now)}</dd>
        </div>
        <div>
          <dt className="text-white/50">النتيجة</dt>
          <dd className={last && !last.ok ? "text-red-300" : ""}>{last ? runSummary(job.name, last) : "—"}</dd>
        </div>
        <div>
          <dt className="text-white/50">الجاية</dt>
          <dd>{job.status === "paused" || job.status === "off" ? "—" : job.everyMs == null ? "وقت الحاجة" : inText(job.nextAt, now)}</dd>
        </div>
        <div>
          <dt className="text-white/50">مرات</dt>
          <dd className="tabular-nums">{`${job.total.runs.toLocaleString("en")}${job.total.failures ? ` · ${job.total.failures} فشل` : ""}${job.total.runs ? ` · ${runTimeText(job.total.avgMs)}` : ""}`}</dd>
        </div>
        {job.live
          ? Object.entries(job.live).map(([k, v]) => (
              <div key={k}>
                <dt className="text-white/50">{k === "waiting" ? "بالدور" : k}</dt>
                <dd className="tabular-nums">{v}</dd>
              </div>
            ))
          : null}
      </dl>

      {job.lastError ? (
        <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-2.5 text-xs" data-testid={`job-${job.name}-error`}>
          <div className="text-red-200">{`آخر خطأ، ${agoText(job.lastError.at, now)}`}</div>
          <div className="mt-0.5 break-words font-mono text-red-100/80" dir="ltr">
            {job.lastError.message}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {job.canRunNow ? (
          <Button size="sm" variant="secondary" onClick={onRun} disabled={!canWrite || job.status === "running"} isLoading={busy}>
            {job.name === "backup" ? "افحص هلّق" : job.name === "outbox" ? "ابعت هلّق" : "شغّل هلّق"}
          </Button>
        ) : null}
        {job.canPause && !job.off ? (
          <Button size="sm" variant="ghost" onClick={() => onPause(!job.paused)} disabled={!canWrite || busy}>
            {job.paused ? "كمّل" : "وقّف"}
          </Button>
        ) : null}
        {choices.length ? (
          <label className="flex items-center gap-2 text-xs text-white/60">
            <span>الوقت</span>
            <select
              className={field}
              value={String(job.everyMs)}
              disabled={!canWrite || busy || !!job.off}
              onChange={(e) => onTimer(Number(e.target.value) === job.defaultEveryMs ? null : Number(e.target.value))}
              aria-label={`الوقت بين كل مرة: ${text?.label ?? job.name}`}
            >
              {choices.map((ms) => (
                <option key={ms} value={ms}>
                  {`${everyText(ms)}${ms === job.defaultEveryMs ? " (الافتراضي)" : ""}`}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="text-xs text-white/50">{everyText(job.everyMs)}</span>
        )}
        {text?.link ? (
          <Link to={text.link.to} className="text-xs text-white/60 underline">
            {text.link.label}
          </Link>
        ) : null}
        {job.runs.length ? (
          <button type="button" className="ms-auto text-xs text-white/60 underline" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "خبّي التشغيلات" : `آخر ${job.runs.length} تشغيلات`}
          </button>
        ) : null}
      </div>

      {open ? (
        <ul className="mt-3 divide-y divide-white/10 text-xs" data-testid={`job-${job.name}-runs`}>
          {job.runs.map((r) => (
            <li key={`${r.at}-${r.ms}`} className="flex items-center justify-between gap-3 py-1.5">
              <span className="shrink-0 text-white/50">{`${agoText(r.at, now)} · ${TRIGGER_TEXT[r.trigger]}`}</span>
              <span className={`min-w-0 truncate ${r.ok ? "" : "text-red-300"}`} title={runSummary(job.name, r)}>
                {runSummary(job.name, r)}
              </span>
              <span className="shrink-0 tabular-nums text-white/50">{runTimeText(r.ms)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
