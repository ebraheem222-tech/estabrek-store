// «ما عرف يجاوب»: what shoppers asked the shop's assistant that the store's facts didn't answer,
// the same question once with how many times. One tap writes the answer as a knowledge-base entry,
// so next time the assistant knows it.
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { listMisses } from "../../api/chatbot.api";
import { getApiErrorMessage } from "../../api/http";
import { formatDateTime } from "../../lib/format";
import { say } from "../../studio/say";

export function ChatbotMisses({ onAnswer, onOpenChat }: { onAnswer: (question: string) => void; onOpenChat: (conversationId: string) => void }) {
  const q = useQuery({ queryKey: ["chatbot", "misses"], queryFn: () => listMisses(30) });
  const items = q.data?.items ?? [];
  const open = items.filter((m) => !m.covered).length;
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5" data-testid="chatbot-misses">
      <div>
        <h2 className="font-semibold">{say("أسئلة ما عرف المساعد يجاوبها|Questions the assistant couldn't answer|שאלות שהעוזר לא ידע לענות עליהן")}</h2>
        <p className="mt-1 text-xs leading-6 text-white/55">
          {say(
            "آخر 30 يوم. اكتب الجواب مرة وحدة، وبعدها المساعد بيعرفه. المساعد الذكي بيتشغّل من|The last 30 days. Write the answer once and the assistant knows it from then on. The smart assistant is switched on from|30 הימים האחרונים. כותבים את התשובה פעם אחת, ומאז העוזר יודע אותה. את העוזר החכם מפעילים מ",
          )}{" "}
          <Link to="/admin/ai" className="underline underline-offset-2">{say("صفحة الذكاء الاصطناعي|the AI page|עמוד הבינה המלאכותית")}</Link>
        </p>
      </div>
      {q.isLoading ? (
        <div className="flex items-center gap-2 text-sm"><Spinner /> {say("جاري التحميل…|Loading…|טוען…")}</div>
      ) : q.isError ? (
        <p className="text-sm text-red-200">{getApiErrorMessage(q.error)}</p>
      ) : !items.length ? (
        <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100" data-testid="chatbot-misses-none">
          {say("ما في أسئلة بدون جواب هالفترة ✓|No unanswered questions lately ✓|אין שאלות בלי תשובה לאחרונה ✓")}
        </p>
      ) : (
        <>
          <p className="text-xs text-white/60">{say(`${open} سؤال بدها جواب|${open} questions need an answer|${open} שאלות מחכות לתשובה`)}</p>
          <ul className="divide-y divide-white/6">
            {items.map((m) => (
              <li key={`${m.conversationId}-${m.question}`} className="flex flex-wrap items-start justify-between gap-3 py-3" data-testid="chatbot-miss">
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-6">«{m.question}»</p>
                  <p className="mt-0.5 text-[11px] text-white/45">
                    {m.count > 1 ? say(`انسأل ${m.count} مرات|Asked ${m.count} times|נשאל ${m.count} פעמים`) + " · " : ""}
                    {m.lastAt ? formatDateTime(m.lastAt) : ""}
                    {m.covered ? <span className="ms-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-200">{say("صار إله جواب|Answered now|יש לה תשובה עכשיו")}</span> : null}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onOpenChat(m.conversationId)}>{say("المحادثة|The chat|השיחה")}</Button>
                  {!m.covered ? <Button size="sm" variant="primary" onClick={() => onAnswer(m.question)}>{say("اكتب الجواب|Write the answer|לכתוב תשובה")}</Button> : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
