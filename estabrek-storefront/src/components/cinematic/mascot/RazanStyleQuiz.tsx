"use client";
/**
 * «رزان بتختارلك»: a few taps (occasion, season, colours, a full look or a
 * piece, size, budget, photos she likes) and Razan picks pieces for her, each
 * with why. 👍/👎 teach her; her taste stays on this device only.
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import { cldUrl } from "@/lib/cloudinary";
import { formatMoney } from "@/lib/catalog";
import { razanCount } from "@/lib/razanRuntime";
import { useSiteFeatures } from "@/store/siteFeatures";

type Start = {
  occasions: Array<{ key: string; label: string }>;
  colors: Array<{ key: string; label: string; hex: string }>;
  sizes: string[];
  budgets: number[];
  photos: Array<{ id: string; title: string; image: string | null }>;
};
type Answers = { occasion?: string | null; season?: "summer" | "winter" | null; colors: string[]; look?: "full" | "piece" | null; size?: string | null; budgetMax?: number | null };
type Result = { id: string; title: string; slug: string; image: string | null; price: number | null; reasons: string[] };
type Step = "occasion" | "season" | "colors" | "look" | "size" | "budget" | "photos" | "results";

const TASTE_KEY = "razan_taste";
type Taste = { answers: Answers; liked: string[]; disliked: string[]; at: number };
const readTaste = (): Taste | null => {
  try {
    const t = JSON.parse(localStorage.getItem(TASTE_KEY) || "null");
    return t && typeof t === "object" && t.answers ? t : null;
  } catch { return null; }
};
const saveTaste = (t: Taste) => { try { localStorage.setItem(TASTE_KEY, JSON.stringify(t)); } catch { /* private window */ } };

const OCC_EMOJI: Record<string, string> = { daily: "☕", work: "💼", evening: "✨", wedding: "💍", prayer: "🤍", eid: "🌙" };

export function RazanStyleQuiz({ ar, onPick }: { ar: boolean; onPick: () => void }) {
  const { requests } = useSiteFeatures();
  const [start, setStart] = useState<Start | null>(null);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState<Taste | null>(null);
  const [answers, setAnswers] = useState<Answers>({ colors: [] });
  const [liked, setLiked] = useState<string[]>([]);
  const [disliked, setDisliked] = useState<string[]>([]);
  const [step, setStep] = useState<Step | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(false);

  useEffect(() => {
    let alive = true;
    setSaved(readTaste());
    fetch(`${apiBaseClient()}/razan/style/start`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => alive && setStart(d))
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, []);

  // Steps the shop can answer (no occasions found → no occasion question, etc.).
  const steps = useMemo<Step[]>(() => {
    if (!start) return [];
    const s: Step[] = [];
    if (start.occasions.length) s.push("occasion");
    s.push("season");
    if (start.colors.length > 1) s.push("colors");
    s.push("look");
    if (start.sizes.length > 1) s.push("size");
    if (start.budgets.length) s.push("budget");
    if (start.photos.length >= 3) s.push("photos");
    return s;
  }, [start]);

  const ask = async (a: Answers, opts: { final?: boolean; exclude?: string[]; like?: string[]; dislike?: string[] } = {}) => {
    setBusy(true);
    try {
      const res = await fetch(`${apiBaseClient()}/razan/style`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...a, liked: opts.like ?? liked, disliked: opts.dislike ?? disliked, exclude: opts.exclude, final: opts.final }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(String(res.status));
      setResults(d.products ?? []);
      setNoMatch(Boolean(d.noMatch));
      setFeedback(false);
      setStep("results");
      saveTaste({ answers: a, liked: opts.like ?? liked, disliked: opts.dislike ?? disliked, at: Date.now() });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const begin = () => {
    setAnswers({ colors: [] });
    setLiked([]);
    setDisliked([]);
    setResults(null);
    setStep(steps[0] ?? "results");
    razanCount("quiz:start");
    if (!steps.length) void ask({ colors: [] }, { final: true });
  };
  const again = () => {
    if (!saved) return;
    setAnswers(saved.answers);
    setLiked(saved.liked);
    setDisliked(saved.disliked);
    void ask(saved.answers, { like: saved.liked, dislike: saved.disliked });
  };
  const go = (next: Partial<Answers>) => {
    const a = { ...answers, ...next };
    setAnswers(a);
    const i = steps.indexOf(step as Step);
    const after = steps[i + 1];
    if (after) setStep(after);
    else void ask(a, { final: true });
  };
  const back = () => {
    const i = steps.indexOf(step as Step);
    if (i > 0) setStep(steps[i - 1]);
    else setStep(null);
  };

  const thumbs = (id: string, up: boolean) => {
    setFeedback(true);
    razanCount(up ? "quiz:like" : "quiz:dislike");
    if (up) { setLiked((l) => (l.includes(id) ? l : [...l, id])); setDisliked((d) => d.filter((x) => x !== id)); }
    else { setDisliked((d) => (d.includes(id) ? d : [...d, id])); setLiked((l) => l.filter((x) => x !== id)); setResults((r) => r?.filter((x) => x.id !== id) ?? r); }
  };

  if (failed) return <p className="razan-quiz-q" data-testid="razan-quiz">{ar ? "ما زبط أفتح الاختيارات هلأ. جربي كمان شوي 🌸" : "Couldn't load right now. Try again in a bit 🌸"}</p>;
  if (!start) return <p className="razan-quiz-q" data-testid="razan-quiz">{ar ? "لحظة…" : "One moment…"}</p>;

  const chip = (label: React.ReactNode, on: boolean, onClick: () => void, key?: string) => (
    <button key={key} type="button" className="razan-help-pick razan-quiz-chip" aria-pressed={on} onClick={onClick}>{label}</button>
  );
  const skip = (next: Partial<Answers>) => (
    <button type="button" className="razan-help-unsure" onClick={() => go(next)}>{ar ? "ما بتفرق معي" : "Doesn't matter"}</button>
  );
  const at = step && step !== "results" ? steps.indexOf(step) : -1;

  return (
    <div className="razan-help razan-quiz" data-testid="razan-quiz" data-step={step ?? "intro"}>
      {at >= 0 ? (
        <>
          <div className="razan-help-dots" aria-hidden="true">{steps.map((s, i) => <i key={s} data-on={i <= at ? "" : undefined} />)}</div>
          <p className="razan-help-count">{ar ? `سؤال ${at + 1} من ${steps.length}` : `Question ${at + 1} of ${steps.length}`}</p>
        </>
      ) : null}

      {step === null && (
        <>
          <p className="razan-help-q">{ar ? "خليني أختارلك! 🌸 جاوبيني على كم سؤال سريع وبطلعلك قطع بتناسبك." : "Let me pick for you! 🌸 A few quick questions and I'll find pieces that suit you."}</p>
          <button type="button" className="razan-help-main" onClick={begin}>{ar ? "يلا نبلّش" : "Let's start"}</button>
          {saved ? <button type="button" className="razan-help-unsure" onClick={again}>{ar ? "رجّعيلي اختياراتي من آخر مرة" : "Use my answers from last time"}</button> : null}
          <small className="razan-quiz-note">{ar ? "اختياراتكِ بتضل على جهازكِ بس." : "Your answers stay on this device only."}</small>
        </>
      )}

      {step === "occasion" && start && (
        <>
          <p className="razan-help-q">{ar ? "لوين بدك تلبسي؟" : "What's the occasion?"}</p>
          <div className="razan-help-sizes">{start.occasions.map((o) => chip(<>{OCC_EMOJI[o.key] ?? "🌸"} {o.label}</>, answers.occasion === o.key, () => go({ occasion: o.key }), o.key))}</div>
          {skip({ occasion: null })}
        </>
      )}

      {step === "season" && (
        <>
          <p className="razan-help-q">{ar ? "صيفي ولا شتوي؟" : "Summer or winter?"}</p>
          <div className="razan-help-sizes">
            {chip(ar ? "☀️ صيفي خفيف" : "☀️ Light summer", answers.season === "summer", () => go({ season: "summer" }))}
            {chip(ar ? "❄️ شتوي دافي" : "❄️ Warm winter", answers.season === "winter", () => go({ season: "winter" }))}
          </div>
          {skip({ season: null })}
        </>
      )}

      {step === "colors" && start && (
        <>
          <p className="razan-help-q">{ar ? "شو الألوان اللي بتحبيها؟ (لحد 3)" : "Which colours do you love? (up to 3)"}</p>
          <div className="razan-quiz-colors">
            {start.colors.map((c) => {
              const on = answers.colors.includes(c.key);
              return (
                <button key={c.key} type="button" className="razan-quiz-color" aria-pressed={on} onClick={() => setAnswers((a) => ({ ...a, colors: on ? a.colors.filter((x) => x !== c.key) : a.colors.length >= 3 ? a.colors : [...a.colors, c.key] }))}>
                  <i style={{ background: c.hex }} aria-hidden="true" />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
          <div className="razan-help-nav">
            <button type="button" className="ghost" onClick={back}>{ar ? "رجوع" : "Back"}</button>
            <button type="button" className="razan-help-main" onClick={() => go({})}>{answers.colors.length ? (ar ? "التالي" : "Next") : ar ? "ما بتفرق" : "Any"}</button>
          </div>
        </>
      )}

      {step === "look" && (
        <>
          <p className="razan-help-q">{ar ? "بدك لبسة كاملة ولا قطعة تكمّلي فيها لبسك؟" : "A full look, or a piece to complete one?"}</p>
          <div className="razan-help-sizes">
            {chip(ar ? "👗 لبسة كاملة" : "👗 Full look", answers.look === "full", () => go({ look: "full" }))}
            {chip(ar ? "🧣 قطعة بتكمّل" : "🧣 A piece", answers.look === "piece", () => go({ look: "piece" }))}
          </div>
          {skip({ look: null })}
        </>
      )}

      {step === "size" && start && (
        <>
          <p className="razan-help-q">{ar ? "شو مقاسكِ؟" : "Your size?"}</p>
          <div className="razan-help-sizes">{start.sizes.map((s) => chip(s, answers.size === s, () => go({ size: s }), s))}</div>
          {skip({ size: null })}
        </>
      )}

      {step === "budget" && start && (
        <>
          <p className="razan-help-q">{ar ? "قديش ميزانيتكِ تقريباً؟" : "Roughly your budget?"}</p>
          <div className="razan-help-sizes">{start.budgets.map((b) => chip(ar ? `لحد ${formatMoney(b, "ILS")}` : `Up to ${formatMoney(b, "ILS")}`, answers.budgetMax === b, () => go({ budgetMax: b }), String(b)))}</div>
          {skip({ budgetMax: null })}
        </>
      )}

      {step === "photos" && start && (
        <>
          <p className="razan-help-q">{ar ? "أي وحدة من هدول بتعجبك؟ (اختياري)" : "Which of these do you like? (optional)"}</p>
          <div className="razan-help-colors">
            {start.photos.map((p) => (
              <button key={p.id} type="button" className="razan-help-pick" aria-pressed={liked.includes(p.id)} aria-label={p.title} onClick={() => setLiked((l) => (l.includes(p.id) ? l.filter((x) => x !== p.id) : [...l, p.id]))}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.image ? <img src={cldUrl(p.image, { w: 160, h: 200, c: "fill", g: "auto" })} alt="" loading="lazy" /> : <span className="razan-help-swatch" />}
                {liked.includes(p.id) ? <span>💗</span> : null}
              </button>
            ))}
          </div>
          <div className="razan-help-nav">
            <button type="button" className="ghost" onClick={back}>{ar ? "رجوع" : "Back"}</button>
            <button type="button" className="razan-help-main" disabled={busy} onClick={() => go({})}>{busy ? (ar ? "عم دوّر…" : "Looking…") : ar ? "ورجيني شو اخترتيلي" : "Show me"}</button>
          </div>
        </>
      )}

      {step === "results" && (
        <>
          {noMatch || !results?.length ? (
            <>
              <p className="razan-help-q">{ar ? "ما لقيت إشي بيشبه اللي بدك هلأ 😔" : "I couldn't find something close right now 😔"}</p>
              {requests.enabled && requests.kinds.newPiece ? (
                <Link className="razan-help-main razan-quiz-link" href="/request" onClick={onPick}>{ar ? "احكيلنا عنها ونحن بندوّر" : "Tell us and we'll look for it"}</Link>
              ) : (
                <Link className="razan-help-main razan-quiz-link" href="/contact" onClick={onPick}>{ar ? "احكي معنا" : "Talk to us"}</Link>
              )}
            </>
          ) : (
            <>
              <p className="razan-help-q">{ar ? "هدول اخترتلك ياهم 💗" : "I picked these for you 💗"}</p>
              <ul className="razan-quiz-results">
                {results.map((p) => (
                  <li key={p.id} data-liked={liked.includes(p.id) ? "" : undefined}>
                    <Link href={`/p/${encodeURIComponent(p.slug)}`} onClick={onPick}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.image ? <img src={cldUrl(p.image, { w: 160, h: 200, c: "fill", g: "auto" })} alt="" loading="lazy" /> : <span className="razan-help-swatch" />}
                      <span>
                        <b>{p.title}</b>
                        {p.price != null ? <em>{formatMoney(p.price, "ILS")}</em> : null}
                        {p.reasons.map((r) => <small key={r}>✓ {r}</small>)}
                      </span>
                    </Link>
                    <div className="razan-quiz-thumbs">
                      <button type="button" aria-label={ar ? "عجبتني" : "I like it"} aria-pressed={liked.includes(p.id)} onClick={() => thumbs(p.id, true)}>👍</button>
                      <button type="button" aria-label={ar ? "مش ذوقي" : "Not for me"} onClick={() => thumbs(p.id, false)}>👎</button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="razan-quiz-actions">
            {feedback ? <button type="button" className="razan-help-main" disabled={busy} onClick={() => void ask(answers)}>{ar ? "اختاريلي من جديد حسب رأيي 🔄" : "Pick again from my 👍/👎 🔄"}</button> : null}
            {results?.length ? <button type="button" className="razan-help-unsure" disabled={busy} onClick={() => void ask(answers, { exclude: results.map((r) => r.id) })}>{ar ? "رجّعيلي غيرهم" : "Show me others"}</button> : null}
            <button type="button" className="razan-help-unsure" onClick={begin}>{ar ? "من الأول" : "Start over"}</button>
          </div>
        </>
      )}
    </div>
  );
}
