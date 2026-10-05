"use client";
// Rose-styled "page not found" / "something went wrong", in the shop's look and language.
import Link from "next/link";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";

type Props = { kind: "404" | "error"; onRetry?: () => void; reference?: string };

export function RoseStatusPage({ kind, onRetry, reference }: Props) {
  const ar = useLanguage().language === "ar";
  const notFound = kind === "404";
  return (
    <main id="main-content" tabIndex={-1} className="rose-status" data-testid={notFound ? "not-found" : "error-page"}>
      <div className="rose-status-card">
        <span className="rose-status-code" aria-hidden="true">{notFound ? "404" : "!"}</span>
        <span className="atelier-eyebrow">{notFound ? (ar ? "الصفحة غير موجودة" : "PAGE NOT FOUND") : ar ? "حدث خطأ" : "SOMETHING WENT WRONG"}</span>
        <h1>{notFound ? (ar ? "يبدو أن هذه الصفحة انتقلت." : "This page seems to have moved.") : ar ? "عذراً، لم تُحمَّل الصفحة." : "Sorry, this page didn't load."}</h1>
        <p>
          {notFound
            ? ar ? "ربما تغيّر الرابط أو نفدت القطعة. اكتشفي الجديد أو ابحثي عمّا تحبين." : "The link may have changed or the piece sold out. See what's new or search for what you love."
            : ar ? "حاولي مرة أخرى بعد لحظة. إذا تكرر، راسلينا وسنساعدكِ." : "Please try again in a moment. If it keeps happening, message us and we'll help."}
        </p>
        <div className="rose-status-actions">
          {onRetry ? (
            <button type="button" className="atelier-button button-dark" onClick={onRetry}>{ar ? "حاولي مرة أخرى" : "Try again"}<Icon name="arrow" /></button>
          ) : (
            <Link href="/shop" className="atelier-button button-dark">{ar ? "تسوّقي الجديد" : "Shop what's new"}<Icon name="arrow" /></Link>
          )}
          <Link href="/" className="atelier-text-link">{ar ? "الرئيسية" : "Home"}</Link>
          <Link href="/search" className="atelier-text-link">{ar ? "بحث" : "Search"}</Link>
          <Link href="/contact" className="atelier-text-link">{ar ? "تواصلي معنا" : "Contact us"}</Link>
        </div>
        {reference ? <small className="rose-status-ref" dir="ltr">{reference}</small> : null}
      </div>
    </main>
  );
}
