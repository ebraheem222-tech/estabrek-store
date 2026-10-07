"use client";
/**
 * AI on the product page (admin → الذكاء الاصطناعي, each its own switch):
 * size advice from her height and weight (nothing kept), pieces that
 * complete the look, and what shoppers say (Arabic or English).
 */
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import { cldUrl } from "@/lib/cloudinary";
import { formatMoney } from "@/lib/catalog";

/* ---------------- Size advice ---------------- */

type Advice = { size: string; inStock: boolean; confidence: "high" | "medium" | "low"; why: string };

export function RoseSizeAdvice({ productId, ar, onPick }: { productId: string; ar: boolean; onPick: (size: string) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ height: "", weight: "", usual: "", fit: "regular" as "tight" | "regular" | "loose" });
  const [busy, setBusy] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const height = Number(form.height), weight = Number(form.weight);
    if (!(height >= 120 && height <= 210) || !(weight >= 30 && weight <= 200)) return setErr(ar ? "اكتبي الطول بالسنتيمتر (مثلاً 162) والوزن بالكيلو." : "Height in cm (e.g. 162) and weight in kg.");
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${apiBaseClient()}/ai/size`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, height, weight, usual: form.usual.trim() || undefined, fit: form.fit }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error === "AI_BUSY" ? (ar ? "رزان مشغولة شوي، جربي بعد شوي." : "Busy, try again soon.") : ar ? "ما قدرت أحدد مقاس هلأ. جربي دليل المقاسات أو راسلينا." : "Couldn't tell right now.");
      setAdvice(d);
    } catch (e: any) {
      setErr(e?.message ?? null);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return <button type="button" className="rose-ai-link" onClick={() => setOpen(true)}>{ar ? "✨ مش متأكدة من مقاسك؟ اسألي رزان" : "✨ Not sure of your size? Ask Rose"}</button>;
  }
  return (
    <form className="rose-ai-card rose-size-advice" onSubmit={submit} data-testid="size-advice">
      <div className="rose-ai-row">
        <label><span>{ar ? "الطول (سم)" : "Height (cm)"}</span><input inputMode="numeric" dir="ltr" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} maxLength={3} /></label>
        <label><span>{ar ? "الوزن (كغ)" : "Weight (kg)"}</span><input inputMode="numeric" dir="ltr" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} maxLength={3} /></label>
        <label><span>{ar ? "مقاسك العادي" : "Usual size"}</span><input dir="ltr" value={form.usual} onChange={(e) => setForm({ ...form, usual: e.target.value })} maxLength={10} placeholder="M" /></label>
      </div>
      <div className="rose-ai-chips" role="radiogroup" aria-label={ar ? "كيف بتحبيها" : "How you like it"}>
        {([["tight", ar ? "مزبوطة" : "Fitted"], ["regular", ar ? "عادية" : "Regular"], ["loose", ar ? "واسعة" : "Loose"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={form.fit === k} onClick={() => setForm({ ...form, fit: k })}>{l}</button>
        ))}
      </div>
      {err ? <p className="rose-ai-err" role="alert">{err}</p> : null}
      {advice ? (
        <div className="rose-ai-answer" role="status">
          <p><b>{ar ? `مقاسكِ: ${advice.size}` : `Your size: ${advice.size}`}</b>{advice.confidence !== "high" ? <small>{ar ? (advice.confidence === "medium" ? " (على الأغلب)" : " (تقريباً)") : ` (${advice.confidence})`}</small> : null}</p>
          {advice.why ? <p>{advice.why}</p> : null}
          {advice.inStock ? <button type="button" onClick={() => onPick(advice.size)}>{ar ? `اختاري ${advice.size}` : `Pick ${advice.size}`}</button> : <p>{ar ? "هالمقاس خلص هلأ." : "This size is sold out."}</p>}
        </div>
      ) : null}
      <div className="rose-ai-actions">
        <button type="submit" disabled={busy}>{busy ? (ar ? "لحظة…" : "One moment…") : ar ? "شو مقاسي؟" : "My size?"}</button>
        <button type="button" className="ghost" onClick={() => setOpen(false)}>{ar ? "إغلاق" : "Close"}</button>
      </div>
      <small className="rose-ai-note">{ar ? "اقتراح من رزان بالذكاء الاصطناعي، ما بينحفظ إشي عنكِ." : "An AI suggestion; nothing about you is kept."}</small>
    </form>
  );
}

/* ---------------- Complete the look ---------------- */

type LookPiece = { id: string; title: string; slug: string; image: string | null; price: number | null; reason: string };

export function RoseShopTheLook({ productId, ar }: { productId: string; ar: boolean }) {
  const [pieces, setPieces] = useState<LookPiece[] | null>(null);
  useEffect(() => {
    let alive = true;
    setPieces(null);
    fetch(`${apiBaseClient()}/ai/look/${encodeURIComponent(productId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setPieces(d?.products ?? []); })
      .catch(() => alive && setPieces([]));
    return () => { alive = false; };
  }, [productId]);
  if (!pieces?.length) return null;
  return (
    <section className="rose-ai-look" data-testid="shop-the-look" aria-label={ar ? "كمّلي اللبسة" : "Complete the look"}>
      <h2>{ar ? "✨ كمّلي اللبسة" : "✨ Complete the look"}</h2>
      <ul>
        {pieces.map((p) => (
          <li key={p.id}>
            <Link href={`/p/${encodeURIComponent(p.slug)}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.image ? <img src={cldUrl(p.image, { w: 240, h: 300, c: "fill", g: "auto" })} alt="" loading="lazy" /> : <span className="rose-ai-noimg" />}
              <b>{p.title}</b>
              {p.price != null ? <em>{formatMoney(p.price, "ILS")}</em> : null}
              {p.reason ? <small>{p.reason}</small> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- What shoppers say ---------------- */

type Summary = { ar: string; en: string; pros: string[]; cons: string[] };

export function RoseReviewSummary({ productId, ar }: { productId: string; ar: boolean }) {
  const [data, setData] = useState<{ summary: Summary | null; count: number; average?: number } | null>(null);
  const [lang, setLang] = useState<"ar" | "en">(ar ? "ar" : "en");
  useEffect(() => {
    let alive = true;
    fetch(`${apiBaseClient()}/ai/reviews/${encodeURIComponent(productId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setData(d))
      .catch(() => undefined);
    return () => { alive = false; };
  }, [productId]);
  useEffect(() => setLang(ar ? "ar" : "en"), [ar]);
  if (!data?.summary) return null;
  const s = data.summary;
  return (
    <section className="rose-ai-card rose-ai-reviews" data-testid="review-summary" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="rose-ai-reviews-head">
        <h2>{lang === "ar" ? "شو بيحكوا الزبونات" : "What shoppers say"}</h2>
        <span>{data.average ? `★ ${data.average}` : ""} · {lang === "ar" ? `${data.count} تقييمات` : `${data.count} reviews`}</span>
        <button type="button" onClick={() => setLang((l) => (l === "ar" ? "en" : "ar"))}>{lang === "ar" ? "English" : "عربي"}</button>
      </div>
      <p>{lang === "ar" ? s.ar : s.en}</p>
      {lang === "ar" && (s.pros.length || s.cons.length) ? (
        <ul>
          {s.pros.map((x) => <li key={x} data-kind="pro">👍 {x}</li>)}
          {s.cons.map((x) => <li key={x} data-kind="con">👎 {x}</li>)}
        </ul>
      ) : null}
      <small className="rose-ai-note">{lang === "ar" ? "ملخص بالذكاء الاصطناعي من تقييمات الزبونات." : "AI summary of customer reviews."}</small>
    </section>
  );
}
