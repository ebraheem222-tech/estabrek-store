"use client";
/**
 * «سؤال وجواب»: she chose to play. A few questions (easy → hard), one per
 * screen; all right → a one-time coupon for her phone. The answers are
 * checked by the shop's server.
 */
import { useEffect, useRef, useState } from "react";
import { quizAnswer, quizClaim, quizSpent, quizStart, type QuizQuestion } from "@/lib/quizClient";

type Phase =
  | { at: "rules" }
  | { at: "q"; i: number }
  | { at: "checking" }
  | { at: "lost"; correct: number; total: number; right: number[] }
  | { at: "won" }
  | { at: "prize"; code: string; percent: number; endsAt: string };

const ERR: Record<string, string> = {
  NO_CHANCE: "الفرصة مش إلكِ هالمرة 🌸",
  ALREADY_PLAYED: "لعبتي هالفرصة قبل 🌸",
  QUIZ_EXPIRED: "خلص وقت الأسئلة. بتصير فرصة تانية قريباً 🌸",
  PRIZES_GONE: "خلصت جوائز هالفترة، سامحينا 🌸",
  ALREADY_WON: "هالرقم ربح بهالفترة قبل.",
  BAD_PHONE: "رقم الهاتف مش صحيح.",
  FEATURE_OFF: "المسابقة موقّفة هلأ.",
};

export function RazanQuestions({ ar, percent, hours, count, onClose }: { ar: boolean; percent: number; hours: number; count: number; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>({ at: "rules" });
  const [qs, setQs] = useState<QuizQuestion[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const token = useRef<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.querySelector<HTMLElement>(".razan-help-main, input")?.focus({ preventScroll: true });
  }, [phase]);

  const fail = (e: unknown) => setErr(ERR[(e as { code?: string })?.code ?? ""] ?? (ar ? "صار خطأ، جربي كمان مرة." : "Something went wrong."));

  const begin = async () => {
    setBusy(true);
    setErr(null);
    try {
      const go = await quizStart();
      quizSpent(); // one go per chance
      token.current = go.token;
      setQs(go.questions);
      setPicked([]);
      setPhase({ at: "q", i: 0 });
    } catch (e) {
      quizSpent();
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const choose = async (i: number, choice: number) => {
    const next = [...picked];
    next[i] = choice;
    setPicked(next);
    if (i + 1 < qs.length) {
      window.setTimeout(() => setPhase({ at: "q", i: i + 1 }), 250);
      return;
    }
    setPhase({ at: "checking" });
    try {
      const out = await quizAnswer(token.current!, next);
      setPhase(out.passed ? { at: "won" } : { at: "lost", correct: out.correct, total: out.total, right: out.answers });
    } catch (e) {
      fail(e);
      setPhase({ at: "rules" });
    }
  };

  const claim = async () => {
    if (phone.replace(/\D/g, "").length < 7) return setErr(ar ? "اكتبي رقمكِ صح." : "Enter your phone number.");
    setBusy(true);
    setErr(null);
    try {
      const out = await quizClaim(token.current!, phone.trim(), name.trim() || undefined);
      setPhase({ at: "prize", ...out });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const until = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(ar ? "ar" : "en", { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
    } catch {
      return "";
    }
  };

  return (
    <div className="razan-help razan-questions" ref={box} data-testid="razan-questions" data-phase={phase.at}>
      {phase.at === "rules" && (
        <>
          <p className="razan-help-q">{ar ? `🎁 سؤال وجواب: ${count} أسئلة دينية من السهل للصعب.` : `🎁 ${count} questions, easy to hard.`}</p>
          <ul className="razan-questions-rules">
            <li>{ar ? `كلها صح؟ بتربحي كوبون خصم ${percent}%.` : `All right? You win a ${percent}% coupon.`}</li>
            <li>{ar ? `الكوبون لرقمكِ بس، لمرة وحدة، صالح ${hours} ساعة.` : `For your phone only, once, valid ${hours} hours.`}</li>
            <li>{ar ? "مجاناً ومش شرط تشتري. إلكِ محاولة وحدة." : "Free, no purchase needed. One try."}</li>
          </ul>
          {err ? <p className="razan-help-err" role="alert">{err}</p> : null}
          <button type="button" className="razan-help-main" disabled={busy} onClick={() => void begin()}>{busy ? (ar ? "لحظة…" : "One moment…") : ar ? "يلا نبلّش" : "Start"}</button>
        </>
      )}

      {phase.at === "q" && qs[phase.i] && (
        <>
          <div className="razan-help-dots" aria-hidden="true">{qs.map((q, i) => <i key={q.id} data-on={i <= phase.i ? "" : undefined} />)}</div>
          <p className="razan-help-count">{ar ? `سؤال ${phase.i + 1} من ${qs.length}` : `Question ${phase.i + 1} of ${qs.length}`}</p>
          <p className="razan-help-q">{qs[phase.i].text}</p>
          <div className="razan-questions-choices" role="radiogroup" aria-label={qs[phase.i].text}>
            {qs[phase.i].choices.map((c, ci) => (
              <button key={ci} type="button" role="radio" aria-checked={picked[phase.i] === ci} className="razan-help-pick" onClick={() => void choose(phase.i, ci)}>{c}</button>
            ))}
          </div>
        </>
      )}

      {phase.at === "checking" && <p className="razan-help-q">{ar ? "عم نشوف إجاباتكِ…" : "Checking…"}</p>}

      {phase.at === "lost" && (
        <>
          <p className="razan-help-q">{ar ? `جاوبتي ${phase.correct} من ${phase.total} صح 🌸` : `${phase.correct} of ${phase.total} right 🌸`}</p>
          <p className="razan-help-hint">{ar ? "قريبة! هاي الإجابات الصح:" : "So close! The right answers:"}</p>
          <ol className="razan-questions-review">
            {qs.map((q, i) => (
              <li key={q.id} data-ok={picked[i] === phase.right[i] ? "" : undefined}>
                <span>{q.text}</span>
                <b>{q.choices[phase.right[i]] ?? ""}</b>
              </li>
            ))}
          </ol>
          <button type="button" className="razan-help-main" onClick={onClose}>{ar ? "حظ أوفر المرة الجاية" : "Better luck next time"}</button>
        </>
      )}

      {phase.at === "won" && (
        <>
          <p className="razan-help-q">{ar ? "ما شاء الله! كلها صح 🎉" : "All correct! 🎉"}</p>
          <p className="razan-help-hint">{ar ? "اكتبي رقمكِ — الكوبون بيشتغل مع هالرقم بس." : "Your phone — the coupon works with this number only."}</p>
          <label className="razan-help-field"><span>{ar ? "رقم الهاتف" : "Phone"}</span><input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={40} /></label>
          <label className="razan-help-field"><span>{ar ? "الاسم (اختياري)" : "Name (optional)"}</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} /></label>
          {err ? <p className="razan-help-err" role="alert">{err}</p> : null}
          <button type="button" className="razan-help-main" disabled={busy} onClick={() => void claim()}>{busy ? (ar ? "لحظة…" : "One moment…") : ar ? "بدي الكوبون 🎁" : "Get my coupon 🎁"}</button>
        </>
      )}

      {phase.at === "prize" && (
        <div className="razan-help-done">
          <span aria-hidden="true">🎁</span>
          <h3>{ar ? `كوبون خصم ${phase.percent}%` : `${phase.percent}% off`}</h3>
          <p className="razan-questions-code" dir="ltr" data-testid="quiz-code">{phase.code}</p>
          <button type="button" className="razan-help-unsure" onClick={() => { void navigator.clipboard?.writeText(phase.code).catch(() => undefined); }}>{ar ? "انسخي الكود" : "Copy code"}</button>
          <p>{ar ? `صالح لمرة وحدة لحد ${until(phase.endsAt)}. اكتبيه بالحقيبة مع نفس الرقم.` : `One use, until ${until(phase.endsAt)}. Enter it in your bag with the same phone.`}</p>
          <button type="button" className="razan-help-main" onClick={onClose}>{ar ? "تمام" : "Done"}</button>
        </div>
      )}
    </div>
  );
}
