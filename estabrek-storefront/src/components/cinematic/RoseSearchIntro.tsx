"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { gsap } from "gsap";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";

type Suggestion = { label: string; href: string };

/**
 * Rose header for /search: one large search field in the campaign type, the
 * number of results for the current words, and quick links to the main
 * collections when she isn't sure what to type.
 */
export function RoseSearchIntro({ query, total, suggestions = [] }: { query?: string; total: number; suggestions?: Suggestion[] }) {
  const ar = useLanguage().language === "ar";
  const router = useRouter();
  const [value, setValue] = useState(query ?? "");
  const field = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => setValue(query ?? ""), [query]);
  useEffect(() => {
    if (!query) field.current?.focus({ preventScroll: true });
  }, [query]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = value.trim();
    if (!q) {
      if (box.current) gsap.fromTo(box.current, { x: 0 }, { keyframes: { x: [-8, 8, -5, 5, 0] }, duration: 0.4, ease: "power1.out" });
      field.current?.focus();
      return;
    }
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const count = ar
    ? total === 0 ? "لا توجد نتائج" : total === 1 ? "نتيجة واحدة" : total === 2 ? "نتيجتان" : total <= 10 ? `${total} نتائج` : `${total} نتيجة`
    : `${total} result${total === 1 ? "" : "s"}`;

  return (
    <section className="rose-search-intro" data-rose-palette="pearl">
      <span className="atelier-eyebrow">ESTABREK · {ar ? "البحث" : "SEARCH"}</span>
      <h1>
        {query ? (ar ? <>نتائج «{query}»</> : <>Results for “{query}”</>) : ar ? "عمّ تبحثين؟" : "What are you looking for?"}
        <span>{query ? count : ar ? "اكتبي اسم القطعة، اللون أو القماش." : "Type a piece, a colour or a fabric."}</span>
      </h1>
      <form ref={box} className="rose-search-field" role="search" onSubmit={submit}>
        <Icon name="search" />
        <input
          ref={field}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={ar ? "ابحثي في المتجر…" : "Search the store…"}
          aria-label={ar ? "ابحثي في المتجر" : "Search the store"}
          enterKeyHint="search"
        />
        <button type="submit" className="atelier-button button-dark">{ar ? "ابحثي" : "Search"}</button>
      </form>
      {suggestions.length > 0 && (
        <nav className="rose-search-suggest" aria-label={ar ? "اقتراحات" : "Suggestions"}>
          <span>{ar ? "جرّبي:" : "Try:"}</span>
          {suggestions.slice(0, 6).map((s) => (
            <Link key={s.href} href={s.href}>{s.label}</Link>
          ))}
        </nav>
      )}
    </section>
  );
}
