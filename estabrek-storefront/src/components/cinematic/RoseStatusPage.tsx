"use client";
// Rose-styled "page not found" / "something went wrong", in the shop's look and language.
import Link from "next/link";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";
import { tr } from "@/lib/words";

type Props = { kind: "404" | "error"; onRetry?: () => void; reference?: string };

export function RoseStatusPage({ kind, onRetry, reference }: Props) {
  const { language: lang } = useLanguage();
  const ar = lang === "ar";
  const notFound = kind === "404";
  return (
    <main id="main-content" tabIndex={-1} className="rose-status" data-testid={notFound ? "not-found" : "error-page"}>
      <div className="rose-status-card">
        <span className="rose-status-code" aria-hidden="true">{notFound ? "404" : "!"}</span>
        <span className="atelier-eyebrow">{notFound ? (tr(lang, "الصفحة غير موجودة", "PAGE NOT FOUND")) : tr(lang, "حدث خطأ", "SOMETHING WENT WRONG")}</span>
        <h1>{notFound ? (tr(lang, "يبدو أن هذه الصفحة انتقلت.", "This page seems to have moved.")) : tr(lang, "عذراً، لم تُحمَّل الصفحة.", "Sorry, this page didn't load.")}</h1>
        <p>
          {notFound
            ? tr(lang, "ربما تغيّر الرابط أو نفدت القطعة. اكتشفي الجديد أو ابحثي عمّا تحبين.", "The link may have changed or the piece sold out. See what's new or search for what you love.")
            : tr(lang, "حاولي مرة أخرى بعد لحظة. إذا تكرر، راسلينا وسنساعدكِ.", "Please try again in a moment. If it keeps happening, message us and we'll help.")}
        </p>
        <div className="rose-status-actions">
          {onRetry ? (
            <button type="button" className="atelier-button button-dark" onClick={onRetry}>{tr(lang, "حاولي مرة أخرى", "Try again")}<Icon name="arrow" /></button>
          ) : (
            <Link href="/shop" className="atelier-button button-dark">{tr(lang, "تسوّقي الجديد", "Shop what's new")}<Icon name="arrow" /></Link>
          )}
          <Link href="/" className="atelier-text-link">{tr(lang, "الرئيسية", "Home")}</Link>
          <Link href="/search" className="atelier-text-link">{tr(lang, "بحث", "Search")}</Link>
          <Link href="/contact" className="atelier-text-link">{tr(lang, "تواصلي معنا", "Contact us")}</Link>
        </div>
        {reference ? <small className="rose-status-ref" dir="ltr">{reference}</small> : null}
      </div>
    </main>
  );
}
