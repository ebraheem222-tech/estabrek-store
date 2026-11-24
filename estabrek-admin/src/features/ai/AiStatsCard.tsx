// «كيف ماشي الذكاء الاصطناعي»: what each use did since the server last started (calls, failures with
// the time limits, the average time, OpenAI or the own server), and the way to «جرّب النموذج».
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as AiAPI from "../../api/ai.api";
import type { AiFeature } from "../../api/ai.api";
import { AI_TEXT } from "./aiText";
import { say } from "../../studio/say";

const box = "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5";

/** A use's name: an AI switch's title, or one of the older uses without a switch. */
export function aiUseName(use: string): string {
  const extra: Record<string, string> = {
    search: say("البحث بالمعنى|Search by meaning|חיפוש לפי משמעות"),
    oldChat: say("الشات العادي|The plain chat|הצ׳אט הרגיל"),
    recommend: say("الترشيحات|The picks|ההמלצות"),
    pagesTools: say("أدوات المحرر القديمة|The editor's old tools|הכלים הישנים של העורך"),
    eval: say("جرّب النموذج|Try the model|לנסות את המודל"),
  };
  return extra[use] ?? (use in AI_TEXT ? AI_TEXT[use as AiFeature].title : use);
}

export function AiStatsCard() {
  const q = useQuery({ queryKey: ["ai-stats"], queryFn: AiAPI.aiStats, refetchInterval: 30_000 });
  const uses = (q.data?.uses ?? []).slice().sort((a, b) => b.calls - a.calls);
  return (
    <section className={box} data-testid="ai-stats">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{say("كيف ماشي الذكاء الاصطناعي|How the AI is doing|איך ה־AI מתפקד")}</h2>
        <Link to="/admin/ai/eval" className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-white/30" data-testid="ai-open-eval">
          {say("جرّب النموذج 🧪|Try the model 🧪|לנסות את המודל 🧪")}
        </Link>
      </div>
      <p className="mt-1 text-xs leading-6 text-white/55">
        {say(
          "من آخر مرة اشتغل فيها السيرفر. «ما ردّ» بتشمل اللي أخد وقت أكتر من حدّه (الشات 15 ثانية، وبعدها بيرد بأجوبتك المكتوبة).|Since the server last started. «Failed» includes what took longer than its limit (the chat: 15 s, then it answers with your written answers).|מאז שהשרת עלה לאחרונה. «נכשל» כולל מה שלקח יותר מהזמן שלו (הצ׳אט: 15 שניות, ואז הוא עונה מהתשובות הכתובות שלך).",
        )}
      </p>
      {!uses.length ? (
        <p className="mt-3 text-xs text-white/45">{say("لسا ما في طلبات.|No calls yet.|עדיין אין קריאות.")}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="text-white/45">
              <tr>
                <th className="p-1.5 text-start font-normal">{say("الميزة|Feature|תכונה")}</th>
                <th className="p-1.5 text-start font-normal">{say("طلبات|Calls|קריאות")}</th>
                <th className="p-1.5 text-start font-normal">{say("ما ردّ|Failed|נכשלו")}</th>
                <th className="p-1.5 text-start font-normal">{say("المعدل|Average|ממוצע")}</th>
                <th className="p-1.5 text-start font-normal">{say("على|On|על")}</th>
              </tr>
            </thead>
            <tbody>
              {uses.map((u) => {
                const bad = u.calls ? Math.round((u.failed / u.calls) * 100) : 0;
                return (
                  <tr key={u.use} className="border-t border-white/6" data-testid="ai-stats-row">
                    <td className="p-1.5" title={u.lastError ?? undefined}>{aiUseName(u.use)}</td>
                    <td className="p-1.5 tabular-nums">{u.calls}</td>
                    <td className={`p-1.5 tabular-nums ${bad >= 20 ? "text-amber-300" : ""}`}>{u.failed ? `${u.failed} (${bad}%)` : "0"}</td>
                    <td className="p-1.5 tabular-nums" dir="ltr">{(u.avgMs / 1000).toFixed(1)} s</td>
                    <td className="p-1.5">{u.via === "own" ? say("سيرفرك|Your server|השרת שלך") : u.via === "openai" ? "OpenAI" : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
