// حالة السيرفر: which commit the server runs, the branch's last one, and whether a
// deployment is waiting, late or failed. A failed deployment leaves the old server
// answering and nothing says so; here it shows, and the bell rings. Refreshes every 15 seconds.
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import * as DeployAPI from "../../api/deploy.api";
import type { DeployPage } from "../../api/deploy.api";
import * as AutomationsAPI from "../../api/automations.api";
import { uptimeText } from "./cacheText";
import { agoText, inText } from "./jobsText";
import { ACTION_TEXT, channelWarning } from "./automationText";
import { STATE_TEXT, commitLink, deploySentence, hasEmailRule, markText, shortCommit, watchProblem } from "./serverText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const KEY = ["system", "deploy"];

export default function ServerStatePage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("system:write");
  const canRules = hasPermission("settings:write");
  const q = useQuery({ queryKey: KEY, queryFn: DeployAPI.getDeploy, refetchInterval: 15_000 });
  const onError = (e: unknown) => toast.error("ما زبط", { description: getApiErrorMessage(e) });

  const check = useMutation({
    mutationFn: DeployAPI.checkDeploy,
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
      if (data.busy) toast.info("عم يفحص هلّق", { description: "استنى ثواني." });
      else toast.success(STATE_TEXT[data.state].label, { description: deploySentence(data, data.now) });
    },
    onError,
  });
  const addEmail = useMutation({
    mutationFn: () => AutomationsAPI.createRule({ name: "النشر ما صار حي", trigger: "deploy.failed", conditions: {}, action: "email", config: {}, enabled: true, cooldownMinutes: 60 }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      toast.success("انضاف تنبيه بالإيميل", { description: "بتغيّر العنوان والنص من «التلقائيات»." });
    },
    onError,
  });

  if (!q.data) {
    return <div className={box}>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</div>;
  }
  const d = q.data;
  const state = STATE_TEXT[d.state];
  const bad = d.state === "late" || d.state === "failed";
  const problem = watchProblem(d);
  const emailNote = channelWarning("email", { email: d.channels.email, sms: false, whatsapp: false, outboxWorker: d.channels.outboxWorker });

  return (
    <div className="space-y-4 pb-24" data-testid="server-page">
      <section className={`${box} ${bad ? "border-red-400/40" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">حالة السيرفر</h1>
            <p className="mt-1 text-sm text-white/60">أي نسخة من الكود شغّالة على السيرفر، وهل هي آخر تعديل نزل. إذا تعديل ما صار حي، بتعرف من هون وبيرن الجرس.</p>
          </div>
          <Badge variant={state.variant} dot={d.state === "deploying"}>
            <span data-testid="server-state">{state.label}</span>
          </Badge>
        </div>
        <p className={`mt-4 text-sm ${bad ? "text-red-200" : "text-white/80"}`} data-testid="server-sentence">
          {deploySentence(d, d.now)}
        </p>
        {d.error && d.reason !== "cantReach" ? <p className="mt-2 text-xs text-amber-300">{`آخر فحص ما وصل لـ GitHub (${d.error}). اللي فوق من آخر فحص نجح.`}</p> : null}
        {problem ? (
          <p className="mt-2 text-xs text-amber-300" data-testid="server-watch-problem">
            {problem}{" "}
            <Link to="/admin/system/jobs" className="underline">
              المهام بالخلفية
            </Link>
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/60">
          <Button size="sm" variant="secondary" onClick={() => check.mutate()} disabled={!canWrite} isLoading={check.isPending} data-testid="server-check">
            افحص هلّق
          </Button>
          <span>{`آخر فحص: ${d.checkedAt ? agoText(d.checkedAt, d.now) : "لسا"}`}</span>
          {d.watch?.nextAt ? <span>{`الجاي: ${inText(d.watch.nextAt, d.now)}`}</span> : null}
          <span>{`التنبيه بعد ${d.lateAfterMinutes} دقايق تأخير`}</span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <CommitCard
          testId="server-live"
          title="شغّال هلّق على السيرفر"
          repo={d.live.repo}
          commit={d.live.commit}
          message={d.live.message}
          note={`السيرفر شغّال من ${uptimeText((d.now - Date.parse(d.live.startedAt)) / 1000)}`}
        />
        <CommitCard
          testId="server-latest"
          title={`آخر تعديل بالفرع ${d.live.branch}`}
          repo={d.live.repo}
          commit={d.latest?.commit ?? null}
          message={d.latest?.message ?? null}
          note={!d.latest ? "لسا ما انعرف" : d.state === "current" ? "هو نفسه الشغّال" : `وصل ${agoText(d.latest.since, d.now)}${d.mark ? ` · علامة Railway: ${markText(d.mark)}` : ""}`}
        />
      </div>

      <section className={box}>
        <h2 className="font-semibold">كيف بيوصلك التنبيه</h2>
        <ul className="mt-3 space-y-2 text-sm" data-testid="server-alerts">
          <li className="flex items-center justify-between gap-3">
            <span>الجرس باللوحة</span>
            <span className="text-xs text-white/60">بيرن لحاله، بدون أي ضبط</span>
          </li>
          {d.rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3">
              <span>{`${ACTION_TEXT[r.action] ?? r.action}: ${r.name}`}</span>
              <span className={`text-xs ${r.enabled ? "text-white/60" : "text-amber-300"}`}>{r.enabled ? "شغّالة" : "موقّفة"}</span>
            </li>
          ))}
        </ul>
        {hasEmailRule(d) && emailNote ? <p className="mt-3 text-xs text-amber-300">{emailNote}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!hasEmailRule(d) ? (
            <Button size="sm" variant="secondary" onClick={() => addEmail.mutate()} disabled={!canRules} isLoading={addEmail.isPending} data-testid="server-add-email">
              ضيف تنبيه بالإيميل
            </Button>
          ) : null}
          <Link to="/admin/system/automations" className="text-xs text-white/60 underline">
            واتساب أو SMS أو نص تاني: من «التلقائيات»
          </Link>
        </div>
      </section>
    </div>
  );
}

function CommitCard({ title, repo, commit, message, note, testId }: { title: string; repo: DeployPage["live"]["repo"]; commit: string | null; message: string | null; note: string; testId: string }) {
  const href = commitLink(repo, commit);
  return (
    <section className={box} data-testid={testId}>
      <h2 className="text-sm text-white/60">{title}</h2>
      <div className="mt-2 text-xl font-semibold tabular-nums">
        {/* The commit reads left to right, and still starts where the page's lines start. */}
        <bdi className="font-mono" dir="ltr">
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="underline decoration-white/30 underline-offset-4">
              {shortCommit(commit)}
            </a>
          ) : (
            shortCommit(commit)
          )}
        </bdi>
      </div>
      {message ? (
        <p className="mt-1 break-words text-sm text-white/80">
          <bdi>{message}</bdi>
        </p>
      ) : null}
      <p className="mt-2 text-xs text-white/50">{note}</p>
    </section>
  );
}
