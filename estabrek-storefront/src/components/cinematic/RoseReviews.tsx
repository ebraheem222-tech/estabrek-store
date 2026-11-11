"use client";
/**
 * The product page's reviews: the average and how many (from the product itself, so it shows at once and
 * search engines read it), what shoppers wrote (approved ones only, first names only), and a form to write
 * one. A review waits for the owner's check (admin → التقييمات) before it shows; a signed-in shopper's review
 * carries her account (the server takes it from her session, never from the form).
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/words";
import { useOptionalAccount } from "@/store/account";
import { useLanguage } from "./Language";

export type ProductRating = { count: number; average: number } | null | undefined;

type Review = { id: string; rating: number; title: string | null; body: string; createdAt: string; author: string | null };

const FIRST = 3;

/** Five stars filled to `value` (0–5), drawn as two layers so a half star shows. */
export function Stars({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className="rose-stars" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <span className="rose-stars-empty">★★★★★</span>
      <span className="rose-stars-full" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  );
}

/** The small "★ 4.5 (12)" by the price: a link down to the reviews. */
export function RatingLink({ rating }: { rating: ProductRating }) {
  const { language: lang } = useLanguage();
  if (!rating?.count) return null;
  return (
    <a className="rose-rating-link" href="#pdp-reviews" data-testid="product-rating">
      <Stars value={rating.average} label={tr(lang, `${rating.average} من 5`, "{0} out of 5", [rating.average])} />
      <b>{rating.average}</b>
      <span>({howMany(rating.count, lang)})</span>
    </a>
  );
}

export function RoseReviews({ productId, rating }: { productId: string; rating: ProductRating }) {
  const { language: lang } = useLanguage();
  const account = useOptionalAccount();
  const box = useRef<HTMLElement>(null);
  const count = rating?.count ?? 0;
  const [list, setList] = useState<Review[] | null>(null);
  const [all, setAll] = useState(false);
  const [writing, setWriting] = useState(false);

  // What they wrote is fetched when the section comes near the screen (none to fetch with no reviews yet).
  useEffect(() => {
    const el = box.current;
    if (!el || !count) return;
    let alive = true;
    const load = () => {
      fetch(`${apiBaseClient()}/ugc/products/${encodeURIComponent(productId)}/reviews`)
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => alive && setList(Array.isArray(rows) ? rows : []))
        .catch(() => alive && setList([]));
    };
    if (typeof IntersectionObserver === "undefined") { load(); return () => { alive = false; }; }
    const seen = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { seen.disconnect(); load(); }
    }, { rootMargin: "600px 0px" });
    seen.observe(el);
    return () => { alive = false; seen.disconnect(); };
  }, [productId, count]);

  // How the stars spread (5 to 1), when the list holds every review.
  const spread = list && list.length === count && count > 0
    ? [5, 4, 3, 2, 1].map((n) => ({ n, share: list.filter((r) => r.rating === n).length / count }))
    : null;
  const shown = list ? (all ? list : list.slice(0, FIRST)) : [];

  return (
    <section ref={box} className="rose-reviews" id="pdp-reviews" aria-labelledby="pdp-reviews-title" data-testid="product-reviews">
      <div className="rose-reviews-side">
        <h2 id="pdp-reviews-title">{tr(lang, "التقييمات", "Reviews")}</h2>
        {count ? (
          <div className="rose-reviews-score">
            <strong>{rating!.average}</strong>
            <div>
              <Stars value={rating!.average} label={tr(lang, `${rating!.average} من 5`, "{0} out of 5", [rating!.average])} />
              <span>{howMany(count, lang)}</span>
            </div>
          </div>
        ) : null}
        {!writing ? (
          <button type="button" className="rose-reviews-write" onClick={() => setWriting(true)} data-testid="review-write">
            {tr(lang, "اكتبي رأيكِ", "Write a review")}
          </button>
        ) : null}
        {spread ? (
          <ul className="rose-reviews-spread" aria-hidden="true">
            {spread.map(({ n, share }) => (
              <li key={n}><span>{n}★</span><i><b style={{ width: `${Math.round(share * 100)}%` }} /></i><small>{Math.round(share * 100)}%</small></li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="rose-reviews-main">
        {writing ? <ReviewForm productId={productId} authHeaders={account?.authHeaders} signedInName={account?.user?.name ?? null} onClose={() => setWriting(false)} /> : null}

        {!count && !writing ? <p className="rose-reviews-empty">{tr(lang, "لسا ما في تقييمات. كوني أول وحدة بتكتب رأيها.", "No reviews yet. Be the first to share yours.")}</p> : null}

        {shown.length ? (
          <ol className="rose-reviews-list" data-testid="review-list">
            {shown.map((r) => (
              <li key={r.id}>
                <div className="rose-review-top">
                  <Stars value={r.rating} label={starsText(r.rating, lang)} />
                  <b>{r.author || tr(lang, "زبونة", "Shopper")}</b>
                  <time dateTime={r.createdAt}>{when(r.createdAt, lang)}</time>
                </div>
                {r.title ? <h3>{r.title}</h3> : null}
                <p>{r.body}</p>
              </li>
            ))}
          </ol>
        ) : null}
        {list && list.length > FIRST && !all ? (
          <button type="button" className="rose-reviews-more" onClick={() => setAll(true)}>{tr(lang, "عرض كل التقييمات", "Show all reviews")}</button>
        ) : null}
      </div>
    </section>
  );
}

function ReviewForm({ productId, authHeaders, signedInName, onClose }: {
  productId: string;
  authHeaders?: () => Promise<Record<string, string>>;
  signedInName: string | null;
  onClose: () => void;
}) {
  const { language: lang } = useLanguage();
  const [stars, setStars] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "invalid">("idle");

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!stars || body.trim().length < 5) { setState("invalid"); return; }
    setState("sending");
    try {
      const auth = authHeaders ? await authHeaders().catch(() => ({})) : {};
      const r = await fetch(`${apiBaseClient()}/catalog/products/${encodeURIComponent(productId)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({ rating: stars, body: body.trim(), ...(title.trim() ? { title: title.trim() } : {}) }),
      });
      setState(r.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "sent") {
    return (
      <div className="rose-review-form rose-review-sent" role="status" data-testid="review-sent">
        <p>{tr(lang, "شكراً إلكِ! رح يبيّن هون بعد ما نراجعه.", "Thank you! It shows here once we've checked it.")}</p>
        <button type="button" onClick={onClose}>{tr(lang, "تمام", "Done")}</button>
      </div>
    );
  }

  return (
    <form className="rose-review-form" onSubmit={send} data-testid="review-form" noValidate>
      <fieldset className="rose-review-stars">
        <legend>{tr(lang, "تقييمكِ", "Your rating")}</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} data-on={n <= stars || undefined}>
            <input type="radio" name="review-stars" value={n} checked={stars === n} onChange={() => setStars(n)} />
            <span aria-hidden="true">★</span>
            <span className="sr-only">{starsText(n, lang)}</span>
          </label>
        ))}
      </fieldset>
      <label>
        <span>{tr(lang, "عنوان قصير (اختياري)", "A short title (optional)")}</span>
        <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        <span>{tr(lang, "شو رأيكِ بالقطعة؟", "What did you think of it?")}</span>
        <textarea value={body} rows={4} maxLength={2000} required onChange={(e) => setBody(e.target.value)} />
      </label>
      {signedInName ? <small className="rose-review-as">{tr(lang, `بيبيّن باسمكِ الأول: ${signedInName.trim().split(/\s+/)[0]}`, "Shown with your first name: {0}", [signedInName.trim().split(/\s+/)[0]])}</small> : null}
      {state === "invalid" ? <p className="rose-review-error" role="alert">{tr(lang, "اختاري النجوم واكتبي 5 أحرف على الأقل.", "Pick the stars and write at least 5 letters.")}</p> : null}
      {state === "error" ? <p className="rose-review-error" role="alert">{tr(lang, "ما قدرنا نبعته. جرّبي كمان مرة.", "We couldn't send it. Please try again.")}</p> : null}
      <div className="rose-review-actions">
        <button type="submit" disabled={state === "sending"}>{tr(lang, "أرسلي رأيكِ", "Send your review")}</button>
        <button type="button" className="ghost" onClick={onClose}>{tr(lang, "إلغاء", "Cancel")}</button>
      </div>
    </form>
  );
}

/** "تقييم واحد", "3 تقييمات", "12 تقييم"; "1 review", "3 reviews". */
function howMany(n: number, lang: Lang) {
  if (n === 1) return tr(lang, "تقييم واحد", "1 review");
  return tr(lang, n <= 10 ? `${n} تقييمات` : `${n} تقييم`, "{0} reviews", [n]);
}

/** "نجمة وحدة", "نجمتين", "3 نجوم"; "1 star", "3 stars". */
function starsText(n: number, lang: Lang) {
  if (n === 1) return tr(lang, "نجمة وحدة", "1 star");
  if (n === 2) return tr(lang, "نجمتين", "2 stars");
  return tr(lang, `${n} نجوم`, "{0} stars", [n]);
}

function when(iso: string, lang: string) {
  try {
    return new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  } catch {
    return "";
  }
}
