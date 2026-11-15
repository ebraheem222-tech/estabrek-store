// جرّب طلب (B4): a request sent to the API as the outside sends it (no admin sign-in with it: a
// key, or nothing), and the answer as it comes back. A request that writes is a real one, on the
// store's own rows: it asks first.
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { useConfirm } from "../../components/useConfirm";
import { adminLang } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";
import type { ApiTable } from "../../api/dataApi.api";
import { nameOf } from "./apiText";
import { PLAY_NAME, curlOf, keyNeeded, methodOf, needsBody, needsRow, playActs, playRequest, playTables, prettyBody, sampleBody, shopperMatters, statusWords, writes, type PlayAct, type PlayRequest } from "./playText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-10 w-full rounded-xl border border-white/10 bg-surface-925 px-3 text-sm text-white";
const option = { backgroundColor: "var(--surface)", color: "var(--text)" };

type Answer = { status: number; ms: number; body: string; limit: string | null; left: string | null } | { failed: string };

export function ApiPlayground({ tables, url }: { tables: ApiTable[]; url: string }) {
  const lang = adminLang();
  const open = useMemo(() => playTables(tables), [tables]);
  const [tableId, setTableId] = useState("");
  const table = open.find((t) => t.id === tableId) ?? open[0];
  const acts = table ? playActs(table) : [];
  const [act, setAct] = useState<PlayAct>("list");
  const current = acts.includes(act) ? act : acts[0];
  const [row, setRow] = useState("");
  const [query, setQuery] = useState("pageSize=5&sort=-createdAt");
  const [body, setBody] = useState("");
  const [key, setKey] = useState("");
  const [token, setToken] = useState("");
  const [problem, setProblem] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<PlayRequest | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  // Another table: its own fields in the body to start from, and the last answer isn't about it.
  useEffect(() => {
    setBody(table ? sampleBody(table) : "");
    setAnswer(null);
    setSent(null);
    setProblem("");
  }, [table?.id]);

  if (!table || !current) {
    return (
      <section className={box} data-testid="api-play">
        <h2 className="font-semibold">{say("جرّب طلب|Try a request|נסו בקשה")}</h2>
        <p className="mt-3 text-sm text-white/60" data-testid="play-empty">
          {say("ما في جدول مفتوح لتجرّب عليه: افتح جدول من فوق.|No table is open to try: open one above.|אין טבלה פתוחה לנסות עליה: פתחו אחת למעלה.")}
        </p>
      </section>
    );
  }

  const send = async () => {
    const made = playRequest(table, { act: current, row, query, body, key, token: shopperMatters(table) ? token : "" }, url, lang);
    if ("problem" in made) return setProblem(made.problem);
    setProblem("");
    if (writes(current)) {
      const yes = await confirm({
        title: say("هاد طلب حقيقي|This is a real request|זו בקשה אמיתית"),
        message:
          current === "delete"
            ? say("السطر بيروح عالسلة (بترجّعه من «الجداول» خلال 30 يوم).|The row goes to the trash (you can bring it back from Tables for 30 days).|השורה עוברת לסל (אפשר להחזיר אותה מ«טבלאות» במשך 30 יום).")
            : say("بيكتب على بيانات المتجر نفسها، مش تجربة عالجنب.|It writes to the store's own data, not to a copy on the side.|היא כותבת לנתוני החנות עצמם, לא לעותק בצד."),
        confirmText: say("ابعت|Send|שליחה"),
        variant: "warning",
      });
      if (!yes) return;
    }
    const request = made.request;
    setSending(true);
    setSent(request);
    setAnswer(null);
    const t0 = performance.now();
    try {
      // As the outside sends it: no cookies, no admin sign-in, only the key (when there is one).
      const res = await fetch(request.url, { method: request.method, headers: request.headers, body: request.body, credentials: "omit" });
      const text = await res.text();
      setAnswer({ status: res.status, ms: Math.round(performance.now() - t0), body: prettyBody(text), limit: res.headers.get("X-RateLimit-Key-Limit"), left: res.headers.get("X-RateLimit-Key-Remaining") });
    } catch (e) {
      setAnswer({ failed: e instanceof Error ? e.message : String(e) });
    } finally {
      setSending(false);
    }
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(say("انتسخ|Copied|הועתק"));
    } catch {
      toast.error(say("ما قدر ينسخ؛ حدّده وانسخه بإيدك|Couldn't copy; select it and copy by hand|ההעתקה נכשלה; סמנו והעתיקו ידנית"));
    }
  };

  return (
    <section className={box} data-testid="api-play">
      <h2 className="font-semibold">{say("جرّب طلب|Try a request|נסו בקשה")}</h2>
      <p className="mt-1 text-sm text-white/60">
        {say(
          "الطلب بينبعت متل ما بيبعته أي برنامج من برّا: بدون دخولك للأدمن، بمفتاح أو بدون. هيك بتشوف بالضبط شو بيشوف اللي برّا.|The request is sent as any program outside sends it: without your admin sign-in, with a key or without. You see exactly what the outside sees.|הבקשה נשלחת כמו שתוכנה מבחוץ שולחת אותה: בלי הכניסה שלכם לניהול, עם מפתח או בלי. כך רואים בדיוק מה שרואים מבחוץ.",
        )}
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-white/60">
          <span>{say("الجدول|Table|טבלה")}</span>
          <select className={field} value={table.id} onChange={(e) => setTableId(e.target.value)} data-testid="play-table">
            {open.map((t) => (
              <option key={t.id} value={t.id} style={option}>
                {nameOf(t.name, t.slug, lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-white/60">
          <span>{say("شو بدك تعمل|What to do|מה לעשות")}</span>
          <select className={field} value={current} onChange={(e) => setAct(e.target.value as PlayAct)} data-testid="play-act">
            {acts.map((a) => (
              <option key={a} value={a} style={option}>
                {`${methodOf(a)} · ${say(PLAY_NAME[a])}`}
              </option>
            ))}
          </select>
        </label>
        {needsRow(current) ? (
          <label className="space-y-1 text-xs text-white/60">
            <span>{say("عنوان السطر أو رقمه|The row's address or id|כתובת השורה או המזהה")}</span>
            <input className={field} dir="ltr" value={row} onChange={(e) => setRow(e.target.value)} data-testid="play-row" />
          </label>
        ) : null}
        {current === "list" ? (
          <label className="space-y-1 text-xs text-white/60 sm:col-span-2">
            <span>{say("الفلترة والترتيب (اللي بعد علامة ؟ بالعنوان)|Filters and order (what follows the ? in the address)|סינון ומיון (מה שבא אחרי ? בכתובת)")}</span>
            <input className={`${field} font-mono`} dir="ltr" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="price[gte]=10&sort=-price&lang=en" data-testid="play-query" />
          </label>
        ) : null}
        {needsBody(current) ? (
          <label className="space-y-1 text-xs text-white/60 sm:col-span-2">
            <span>{say("القيم (JSON)|The values (JSON)|הערכים (JSON)")}</span>
            <textarea className="h-40 w-full rounded-xl border border-white/10 bg-surface-925 p-3 font-mono text-xs text-white" dir="ltr" value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} data-testid="play-body" />
          </label>
        ) : null}
        <label className="space-y-1 text-xs text-white/60 sm:col-span-2">
          <span>
            {keyNeeded(table, current)
              ? say("المفتاح (لازم لهالطلب)|The key (this request needs one)|המפתח (נדרש לבקשה הזו)")
              : say("المفتاح (اختياري: بدونه بتشوف شو بيشوف أي حدا)|The key (optional: without it you see what anyone sees)|המפתח (לא חובה: בלעדיו רואים מה שכל אחד רואה)")}
          </span>
          <input className={`${field} font-mono`} dir="ltr" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="ek_…" data-testid="play-key" />
          <span className="block text-white/50">{say("بيضل بهالصفحة بس وما بينحفظ.|It stays on this page only and isn't kept.|הוא נשאר בדף הזה בלבד ואינו נשמר.")}</span>
        </label>
        {shopperMatters(table) ? (
          <label className="space-y-1 text-xs text-white/60 sm:col-span-2">
            <span>{say("توكن زبون (اختياري): لتجرّب كزبون مسجّل دخوله|A shopper's token (optional): to try as a signed-in shopper|אסימון לקוח (לא חובה): כדי לנסות כלקוח מחובר")}</span>
            <input className={`${field} font-mono`} dir="ltr" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} data-testid="play-token" />
            <span className="block text-white/50">
              {say(
                "هو التوكن اللي بياخده الزبون لما يسجّل دخوله بالمتجر. معه بيشوف وبيغيّر سطوره هو بس.|The token a shopper gets on signing in to the store. With it they see and change their own rows only.|האסימון שהלקוח מקבל בכניסה לחנות. איתו הוא רואה ומשנה רק את השורות שלו.",
              )}
            </span>
          </label>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="primary" size="sm" onClick={() => void send()} isLoading={sending} data-testid="play-send">
          {writes(current) ? say("ابعت (طلب حقيقي)|Send (a real request)|שליחה (בקשה אמיתית)") : say("ابعت|Send|שליחה")}
        </Button>
        {problem ? (
          <span className="text-sm text-red-300" data-testid="play-problem">
            {problem}
          </span>
        ) : null}
      </div>

      {sent ? (
        <div className="mt-4 space-y-3" data-testid="play-result">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-white/60">
              <span>{say("نفس الطلب للـ terminal|The same request for a terminal|אותה בקשה לטרמינל")}</span>
              <button type="button" className="underline" onClick={() => void copy(curlOf(sent))}>
                {say("انسخ|Copy|העתקה")}
              </button>
            </div>
            <pre dir="ltr" className="mt-1 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-left text-xs" data-testid="play-curl">
              {curlOf(sent)}
            </pre>
          </div>
          {answer && "failed" in answer ? (
            <p className="text-sm text-red-300" data-testid="play-failed">
              {say("الطلب ما وصل للسيرفر:|The request didn't reach the server:|הבקשה לא הגיעה לשרת:")} <bdi dir="ltr">{answer.failed}</bdi>
            </p>
          ) : answer ? (
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                <Badge variant={answer.status < 300 ? "success" : answer.status < 500 ? "warning" : "danger"} size="sm">
                  <span data-testid="play-status">{answer.status}</span>
                </Badge>
                <span data-testid="play-status-words">{statusWords(answer.status, lang)}</span>
                <span>{`${answer.ms} ms`}</span>
                {answer.limit ? <span data-testid="play-limit">{say("ضايل للمفتاح هالدقيقة: {left} من {limit}|Left for the key this minute: {left} of {limit}|נותרו למפתח בדקה הזו: {left} מתוך {limit}").replace("{left}", answer.left ?? "?").replace("{limit}", answer.limit)}</span> : null}
              </div>
              <pre dir="ltr" className="mt-2 max-h-96 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-left text-xs" data-testid="play-answer">
                {answer.body}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
      {confirmDialog}
    </section>
  );
}
