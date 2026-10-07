"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { gsap } from "gsap";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { rememberSearch } from "@/lib/razanHistory";
import { useSiteFeatures } from "@/store/siteFeatures";
import { RazanSmartSearch } from "./RazanSmartSearch";

type Suggestion = { label: string; href: string };

/**
 * Rose header for /search: one large search field in the campaign type, the
 * number of results for the current words, and quick links to the main
 * collections when she isn't sure what to type.
 */
export function RoseSearchIntro({ query, total, suggestions = [], filtered = false }: { query?: string; total: number; suggestions?: Suggestion[]; filtered?: boolean }) {
  const ar = useLanguage().language === "ar";
  const router = useRouter();
  const { voiceSearchEnabled } = useStorefrontSettings();
  const { requests, ai } = useSiteFeatures();
  // Her own words (3+ words, no filters picked yet): Razan can turn them into filters.
  const sentence = Boolean(query && !filtered && ai.smartSearch && query.trim().split(/\s+/).length >= 3);
  const [value, setValue] = useState(query ?? "");
  const field = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => setValue(query ?? ""), [query]);
  // Razan's history (admin → رزان): what she looked for, to find it again later.
  useEffect(() => { if (query?.trim()) rememberSearch(query); }, [query]);
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
      <span className="atelier-eyebrow">{ar ? "البحث" : "SEARCH"}</span>
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
        {voiceSearchEnabled && <VoiceSearchButton className="rose-search-voice" />}
        <button type="submit" className="atelier-button button-dark">{ar ? "ابحثي" : "Search"}</button>
      </form>
      {sentence ? <RazanSmartSearch query={query!.trim()} ar={ar} /> : null}
      {query && requests.enabled && requests.kinds.newPiece ? (
        <p className={`rose-search-request${total === 0 ? " empty" : ""}`}>
          {total === 0 ? (ar ? "ما لقيناها عنا هلأ — بس بنقدر ندوّرلكِ عليها." : "We don't have it right now — but we can look for it.") : ar ? "ما لقيتي اللي بدك؟" : "Not what you wanted?"}{" "}
          <Link href={`/request?q=${encodeURIComponent(query)}`}>{ar ? "اطلبيها منّا ←" : "Ask us for it →"}</Link>
        </p>
      ) : null}
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
