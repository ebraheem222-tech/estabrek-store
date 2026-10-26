"use client";
/**
 * «سؤال وجواب»: she chose to play. A few questions (easy → hard), one per
 * screen; all right → a one-time coupon for her phone. The answers are
 * checked by the shop's server.
 */
import { useEffect, useRef, useState } from "react";
import { quizAnswer, quizClaim, quizSpent, quizStart, type QuizQuestion } from "@/lib/quizClient";
import { tr } from "@/lib/words";
import { useLanguage } from "../Language";

type Phase =
  | { at: "rules" }
  | { at: "q"; i: number }
  | { at: "checking" }
  | { at: "lost"; correct: number; total: number; right: number[] }
  | { at: "won" }
  | { at: "prize"; code: string; percent: number; endsAt: string };

/** [Arabic, English]: shown with tr() in the page's language. */
const ERR: Record<string, readonly [string, string]> = {
  NO_CHANCE: ["الفرصة مش إلكِ هالمرة 🌸", "Not your turn this time 🌸"],
  ALREADY_PLAYED: ["لعبتي هالفرصة قبل 🌸", "You already played this round 🌸"],
  QUIZ_EXPIRED: ["خلص وقت الأسئلة. بتصير فرصة تانية قريباً 🌸", "Time's up for these questions. Another chance is coming soon 🌸"],
  PRIZES_GONE: ["خلصت جوائز هالفترة، سامحينا 🌸", "This round's prizes are all gone, sorry 🌸"],
  ALREADY_WON: ["هالرقم ربح بهالفترة قبل.", "This number already won this round."],
  BAD_PHONE: ["رقم الهاتف مش صحيح.", "That phone number isn't right."],
  FEATURE_OFF: ["المسابقة موقّفة هلأ.", "The quiz is off right now."],
};

export function RazanQuestions({ ar, percent, hours, count, onClose }: { ar: boolean; percent: number; hours: number; count: number; onClose: () => void }) {
  const { language: lang } = useLanguage();
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

  const fail = (e: unknown) => {
    const words = ERR[(e as { code?: string })?.code ?? ""];
    setErr(words ? tr(lang, words[0], words[1]) : tr(lang, "صار خطأ، جربي كمان مرة.", "Something went wrong."));
  };

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
    if (phone.replace(/\D/g, "").length < 7) return setErr(tr(lang, "اكتبي رقمكِ صح.", "Enter your phone number."));
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
      return new Intl.DateTimeFormat(lang, { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
    } catch {
      return "";
    }
  };

  return (
    <div className="razan-help razan-questions" ref={box} data-testid="razan-questions" data-phase={phase.at}>
      {phase.at === "rules" && (
        <>
          <p className="razan-help-q">{tr(lang, `🎁 سؤال وجواب: ${count} أسئلة دينية من السهل للصعب.`, "🎁 {0} questions, easy to hard.", [count])}</p>
          <ul className="razan-questions-rules">
            <li>{tr(lang, `كلها صح؟ بتربحي كوبون خصم ${percent}%.`, "All right? You win a {0}% coupon.", [percent])}</li>
            <li>{tr(lang, `الكوبون لرقمكِ بس، لمرة وحدة، صالح ${hours} ساعة.`, "For your phone only, once, valid {0} hours.", [hours])}</li>
            <li>{tr(lang, "مجاناً ومش شرط تشتري. إلكِ محاولة وحدة.", "Free, no purchase needed. One try.")}</li>
          </ul>
          {err ? <p className="razan-help-err" role="alert">{err}</p> : null}
          <button type="button" className="razan-help-main" disabled={busy} onClick={() => void begin()}>{busy ? (tr(lang, "لحظة…", "One moment…")) : tr(lang, "يلا نبلّش", "Start")}</button>
        </>
      )}

      {phase.at === "q" && qs[phase.i] && (
        <>
          <div className="razan-help-dots" aria-hidden="true">{qs.map((q, i) => <i key={q.id} data-on={i <= phase.i ? "" : undefined} />)}</div>
          <p className="razan-help-count">{tr(lang, `سؤال ${phase.i + 1} من ${qs.length}`, "Question {0} of {1}", [phase.i + 1, qs.length])}</p>
          <p className="razan-help-q">{qs[phase.i].text}</p>
          <div className="razan-questions-choices" role="radiogroup" aria-label={qs[phase.i].text}>
            {qs[phase.i].choices.map((c, ci) => (
              <button key={ci} type="button" role="radio" aria-checked={picked[phase.i] === ci} className="razan-help-pick" onClick={() => void choose(phase.i, ci)}>{c}</button>
            ))}
          </div>
        </>
      )}

      {phase.at === "checking" && <p className="razan-help-q">{tr(lang, "عم نشوف إجاباتكِ…", "Checking…")}</p>}

      {phase.at === "lost" && (
        <>
          <p className="razan-help-q">{tr(lang, `جاوبتي ${phase.correct} من ${phase.total} صح 🌸`, "{0} of {1} right 🌸", [phase.correct, phase.total])}</p>
          <p className="razan-help-hint">{tr(lang, "قريبة! هاي الإجابات الصح:", "So close! The right answers:")}</p>
          <ol className="razan-questions-review">
            {qs.map((q, i) => (
              <li key={q.id} data-ok={picked[i] === phase.right[i] ? "" : undefined}>
                <span>{q.text}</span>
                <b>{q.choices[phase.right[i]] ?? ""}</b>
              </li>
            ))}
          </ol>
          <button type="button" className="razan-help-main" onClick={onClose}>{tr(lang, "حظ أوفر المرة الجاية", "Better luck next time")}</button>
        </>
      )}

      {phase.at === "won" && (
        <>
          <p className="razan-help-q">{tr(lang, "ما شاء الله! كلها صح 🎉", "All correct! 🎉")}</p>
          <p className="razan-help-hint">{tr(lang, "اكتبي رقمكِ — الكوبون بيشتغل مع هالرقم بس.", "Your phone — the coupon works with this number only.")}</p>
          <label className="razan-help-field"><span>{tr(lang, "رقم الهاتف", "Phone")}</span><input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={40} /></label>
          <label className="razan-help-field"><span>{tr(lang, "الاسم (اختياري)", "Name (optional)")}</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} /></label>
          {err ? <p className="razan-help-err" role="alert">{err}</p> : null}
          <button type="button" className="razan-help-main" disabled={busy} onClick={() => void claim()}>{busy ? (tr(lang, "لحظة…", "One moment…")) : tr(lang, "بدي الكوبون 🎁", "Get my coupon 🎁")}</button>
        </>
      )}

      {phase.at === "prize" && (
        <div className="razan-help-done">
          <span aria-hidden="true">🎁</span>
          <h3>{tr(lang, `كوبون خصم ${phase.percent}%`, "{0}% off", [phase.percent])}</h3>
          <p className="razan-questions-code" dir="ltr" data-testid="quiz-code">{phase.code}</p>
          <button type="button" className="razan-help-unsure" onClick={() => { void navigator.clipboard?.writeText(phase.code).catch(() => undefined); }}>{tr(lang, "انسخي الكود", "Copy code")}</button>
          <p>{tr(lang, `صالح لمرة وحدة لحد ${until(phase.endsAt)}. اكتبيه بالحقيبة مع نفس الرقم.`, "One use, until {0}. Enter it in your bag with the same phone.", [until(phase.endsAt)])}</p>
          <button type="button" className="razan-help-main" onClick={onClose}>{tr(lang, "تمام", "Done")}</button>
        </div>
      )}
    </div>
  );
}
