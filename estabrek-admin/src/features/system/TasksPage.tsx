// صف الشغل (E0.3): the background work that must not be lost. A task is kept until it is done
// (a restart in the middle doesn't drop it); one that fails is tried again after a growing wait;
// one that keeps failing is set aside here ("needs a look"), to try again or dismiss.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import * as TasksAPI from "../../api/tasks.api";
import type { Task, TaskStatus } from "../../api/tasks.api";
import { STATUSES, STATUS_NAME, countsLine, didText, keepLine, lateText, nextText, taskKindName, triesText, whenText } from "./tasksText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const chip = (on: boolean) => `rounded-lg px-3 py-1.5 text-sm transition ${on ? "bg-white/10 font-medium" : "text-white/60 hover:bg-white/5"}`;
const BADGE: Record<TaskStatus, "default" | "danger" | "warning" | "success"> = { failed: "danger", waiting: "default", running: "warning", done: "success", cancelled: "default" };

export default function TasksPage() {
  const lang = adminLang();
  const qc = useQueryClient();
  const canWrite = useAuth().hasPermission("system:write");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const q = useInfiniteQuery({
    queryKey: ["system", "tasks", status],
    queryFn: ({ pageParam }) => TasksAPI.getTasks({ status: status || undefined, before: pageParam || undefined, limit: 50 }),
    initialPageParam: "",
    getNextPageParam: (last) => last.next ?? undefined,
    refetchInterval: 15_000,
  });
  const first = q.data?.pages[0];
  const tasks = q.data?.pages.flatMap((p) => p.tasks) ?? [];
  const now = first?.now ?? Date.now();
  const late = first ? lateText(first, lang) : "";

  const onError = (e: unknown) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) });
  const again = () => qc.invalidateQueries({ queryKey: ["system", "tasks"] });
  const retry = useMutation({
    mutationFn: (id: string) => TasksAPI.retryTask(id),
    onSuccess: () => {
      toast.success(say("رجعت للصف|Back in the queue|חזרה לתור"));
      void again();
    },
    onError,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => TasksAPI.cancelTask(id),
    onSuccess: () => {
      toast.success(say("انشالت|Dismissed|בוטלה"));
      void again();
    },
    onError,
  });

  return (
    <div className="space-y-4 pb-24" data-testid="tasks-page">
      <section className={box}>
        <h1 className="text-lg font-semibold">{say("صف الشغل|The queue|תור העבודה")}</h1>
        <p className="mt-1 text-sm text-white/60">
          {say(
            "الشغل اللي السيرفر لازم يعمله بالخلفية وما بيصير يضيع. كل شغلة محفوظة بقاعدة البيانات لحد ما تخلص، فإذا انطفى السيرفر بنصّها بتكمّل بعد ما يرجع. اللي بتفشل بتنعاد لحالها بعد وقت بيطول كل مرة، واللي بتفشل بكل محاولاتها بتوقف هون لحتى تشوفها.|Work the server has to do in the background and must not lose. Each task is kept in the database until it is done, so if the server stops in the middle it goes on when it is back. One that fails is tried again by itself after a wait that grows each time; one that fails every try stops here for you to look at.|עבודה שהשרת חייב לעשות ברקע ואסור שתאבד. כל משימה נשמרת במסד הנתונים עד שהיא מסתיימת, כך שאם השרת נעצר באמצע היא ממשיכה כשהוא חוזר. משימה שנכשלת מנוסה שוב מעצמה אחרי המתנה שמתארכת בכל פעם; משימה שנכשלת בכל הניסיונות נעצרת כאן כדי שתבדקו אותה.",
          )}
        </p>
        {first ? (
          <div className="mt-4 space-y-1 text-sm">
            <div className={first.counts.failed ? "text-amber-300" : "text-white/80"} data-testid="tasks-counts">
              {countsLine(first, lang)}
            </div>
            <div className="text-xs text-white/50" data-testid="tasks-keep">
              {keepLine(first, lang)}{" "}
              <Link to="/admin/system/runs" className="underline">
                {say("كل محاولة مكتوبة بسجل التشغيل|Every try is written in the run log|כל ניסיון נרשם ביומן ההרצות")}
              </Link>
            </div>
          </div>
        ) : null}
        {late ? (
          <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200" data-testid="tasks-late">
            {late}{" "}
            <Link to="/admin/system/jobs" className="underline">
              {say("المهام بالخلفية|Background jobs|משימות רקע")}
            </Link>
          </div>
        ) : null}
      </section>

      <section className={box}>
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label={say("حالة الشغل|State of the work|מצב העבודה")}>
          <button type="button" role="tab" aria-selected={!status} className={chip(!status)} onClick={() => setStatus("")} data-testid="tasks-status-all">
            {say("الكل|All|הכול")}
          </button>
          {STATUSES.map((s) => (
            <button key={s} type="button" role="tab" aria-selected={status === s} className={chip(status === s)} onClick={() => setStatus(s)} data-testid={`tasks-status-${s}`}>
              {say(STATUS_NAME[s])}
              {first && s !== "done" && first.counts[s] ? <span className="ms-1.5 text-xs text-white/60">{first.counts[s].toLocaleString("en")}</span> : null}
            </button>
          ))}
        </div>

        {q.isLoading ? (
          <div className="mt-4">
            <Spinner />
          </div>
        ) : q.isError ? (
          <div className="mt-4 text-sm text-red-200">{getApiErrorMessage(q.error)}</div>
        ) : !tasks.length ? (
          <p className="mt-4 text-sm text-white/60" data-testid="tasks-empty">
            {status === "failed"
              ? say("ولا شغلة بدها نظر. 👌|Nothing needs a look. 👌|שום דבר לא דורש בדיקה. 👌")
              : status
                ? say("ما في شي بهالحالة.|Nothing in this state.|אין כלום במצב הזה.")
                : say("الصف فاضي: ما انضاف عليه شغل لسا.|The queue is empty: no work has been added yet.|התור ריק: עדיין לא נוספה עבודה.")}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-white/10" data-testid="tasks-list">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} now={now} canWrite={canWrite} busy={retry.isPending || cancel.isPending} onRetry={() => retry.mutate(t.id)} onCancel={() => cancel.mutate(t.id)} />
            ))}
          </ul>
        )}
        {q.hasNextPage ? (
          <div className="mt-4">
            <Button size="sm" variant="secondary" onClick={() => void q.fetchNextPage()} isLoading={q.isFetchingNextPage} data-testid="tasks-more">
              {say("الأقدم|Older|ישנות יותר")}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function TaskRow({ task, now, canWrite, busy, onRetry, onCancel }: { task: Task; now: number; canWrite: boolean; busy: boolean; onRetry: () => void; onCancel: () => void }) {
  const lang = adminLang();
  const stopped = task.status === "failed" || task.status === "cancelled";
  const next = nextText(task, now, lang);
  const did = didText(task, lang);
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3" data-testid={`task-${task.id}`} data-status={task.status}>
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={BADGE[task.status]} size="sm">
            {say(STATUS_NAME[task.status])}
          </Badge>
          <span className="font-medium">{taskKindName(task.kind, lang)}</span>
          <span className="text-xs text-white/60" data-testid={`task-tries-${task.id}`}>
            {triesText(task, lang)}
          </span>
        </div>
        {task.lastError && task.status !== "done" ? (
          <div className={`wrap-break-word text-sm ${task.status === "failed" ? "text-red-300" : "text-white/70"}`} data-testid={`task-error-${task.id}`}>
            {task.status === "failed" ? null : <span>{say("آخر مرة فشلت:|Last time it failed:|בפעם האחרונה נכשלה:")} </span>}
            <bdi>{task.lastError}</bdi>
          </div>
        ) : null}
        {did ? <div className="text-sm text-white/70">{did}</div> : null}
        {task.key ? (
          <bdi dir="ltr" className="block break-all text-xs text-white/50">
            {task.key}
          </bdi>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="text-end text-xs text-white/60">
          <div>{whenText(task.finishedAt ?? task.createdAt, now, lang)}</div>
          {next ? <div data-testid={`task-next-${task.id}`}>{next}</div> : null}
        </div>
        {canWrite && (stopped || task.status === "waiting") ? (
          <div className="flex flex-wrap justify-end gap-2">
            {stopped ? (
              <Button size="sm" variant="secondary" onClick={onRetry} disabled={busy} data-testid={`task-retry-${task.id}`}>
                {say("جرّبها كمان مرة|Try it again|לנסות שוב")}
              </Button>
            ) : null}
            {task.status !== "cancelled" ? (
              <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy} data-testid={`task-cancel-${task.id}`}>
                {say("شيلها|Dismiss|ביטול")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
