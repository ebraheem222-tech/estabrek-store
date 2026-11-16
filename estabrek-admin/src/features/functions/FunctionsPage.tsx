// الـ Functions (F1): logic the owner builds from steps, tries dry, publishes and runs. This
// page is the list; one function is edited on its own page (FunctionEditor.tsx).
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { useConfirm } from "../../components/useConfirm";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import * as FnAPI from "../../api/functions.api";
import type { FnLite } from "../../api/functions.api";
import { STATE_NAME, stateOf } from "./fnText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-surface-925 px-3 text-sm text-white";
const BADGE = { draft: "default", changed: "warning", live: "success", off: "default" } as const;

export default function FunctionsPage() {
  const qc = useQueryClient();
  const go = useNavigate();
  const canWrite = useAuth().hasPermission("functions:write");
  const [confirm, dialog] = useConfirm();
  const [name, setName] = useState("");
  const q = useQuery({ queryKey: ["functions"], queryFn: FnAPI.getFunctions });
  const onError = (e: unknown) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) });
  const create = useMutation({
    mutationFn: () => FnAPI.createFunction({ name: name.trim() }),
    onSuccess: (fn) => {
      qc.setQueryData(["functions", fn.id], fn);
      void qc.invalidateQueries({ queryKey: ["functions"], exact: true });
      go(`/admin/functions/${fn.id}`);
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => FnAPI.deleteFunction(id),
    onSuccess: () => {
      toast.success(say("انحذفت|Deleted|נמחקה"));
      void qc.invalidateQueries({ queryKey: ["functions"] });
    },
    onError,
  });
  const ask = async (fn: FnLite) => {
    if (await confirm({ title: say("حذف الـ function|Delete the function|מחיקת הפונקציה"), message: say("«{name}» بتنحذف مع خطواتها. ما بترجع.|“{name}” is deleted with its steps. It can't be brought back.|«{name}» תימחק עם השלבים שלה. לא ניתן לשחזר.").replace("{name}", fn.name), confirmText: say("احذف|Delete|מחיקה"), variant: "danger" })) remove.mutate(fn.id);
  };

  return (
    <div className="space-y-4 pb-24" data-testid="fn-page">
      <section className={box}>
        <h1 className="text-lg font-semibold">{say("الـ Functions|Functions|פונקציות")}</h1>
        <p className="mt-1 text-sm text-white/60">
          {say(
            "منطق بتبنيه بخطوات، بدون كود: دوّر بجداولك، أضف وعدّل واحذف سطور، اسأل «إذا»، امشي على قائمة، وابعت رسالة أو تنبيه. بتجرّبها قبل (ما بتغيّر شي)، وبعدين بتنشرها.|Logic you build from steps, with no code: find in your tables, add, change and delete rows, ask “if”, go over a list, send a message or ring a bell. You try it first (it changes nothing), then publish it.|לוגיקה שבונים משלבים, בלי קוד: חיפוש בטבלאות, הוספה, שינוי ומחיקה של שורות, שאלת «אם», מעבר על רשימה, שליחת הודעה או התראה. מנסים קודם (לא משנה דבר), ואז מפרסמים.",
          )}
        </p>
        {canWrite ? (
          <form
            className="mt-4 flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) create.mutate();
            }}
          >
            <input className={field} value={name} maxLength={80} placeholder={say("اسم الـ function الجديدة، مثلاً: نقاط الزبون|The new function's name, e.g. Customer points|שם הפונקציה החדשה, למשל: נקודות לקוח")} onChange={(e) => setName(e.target.value)} data-testid="fn-new-name" />
            <Button type="submit" size="sm" variant="primary" disabled={!name.trim()} isLoading={create.isPending} data-testid="fn-new">
              {say("＋ function جديدة|＋ New function|＋ פונקציה חדשה")}
            </Button>
          </form>
        ) : null}
      </section>

      <section className={box}>
        {q.isLoading ? (
          <Spinner />
        ) : q.isError ? (
          <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div>
        ) : !q.data?.functions.length ? (
          <p className="text-sm text-white/60" data-testid="fn-empty">
            {say("ما في functions لسا.|No functions yet.|עדיין אין פונקציות.")}
          </p>
        ) : (
          <ul className="divide-y divide-white/10" data-testid="fn-list">
            {q.data.functions.map((fn) => {
              const state = stateOf(fn);
              return (
                <li key={fn.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3" data-testid={`fn-${fn.id}`} data-state={state}>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/admin/functions/${fn.id}`} className="font-medium hover:underline" data-testid={`fn-${fn.id}-open`}>
                        {fn.name}
                      </Link>
                      <Badge variant={BADGE[state]} size="sm">
                        {say(STATE_NAME[state])}
                      </Badge>
                    </div>
                    {fn.note ? <div className="break-words text-sm text-white/70">{fn.note}</div> : null}
                    <div className="text-xs text-white/60">
                      {say("{n} خطوة|{n} steps|{n} שלבים").replace("{n}", String(fn.steps))}
                      {" · "}
                      {fn.runs ? say("اشتغلت {n} مرة|ran {n} times|רצה {n} פעמים").replace("{n}", fn.runs.toLocaleString("en")) : say("ما اشتغلت لسا|hasn't run yet|עוד לא רצה")}
                    </div>
                  </div>
                  {canWrite ? (
                    <Button size="sm" variant="ghost" onClick={() => void ask(fn)} disabled={remove.isPending} data-testid={`fn-${fn.id}-delete`}>
                      {say("احذف|Delete|מחיקה")}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {dialog}
    </div>
  );
}
