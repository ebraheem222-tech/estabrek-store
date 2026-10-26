"use client";
/**
 * The about page in the store's theme: an opening with the store's line and a model of what
 * it sells, its own words (Admin → هوية المتجر → about, else the theme's), the theme's promises
 * as cards, and a way to the shop. Nothing in it belongs to one kind of store.
 */
import Link from "next/link";
import { tr } from "@/lib/words";
import { pick } from "@/lib/storeIdentity";
import { useNames, useStoreIdentity } from "@/store/storeIdentity";
import { useStoreLook } from "@/store/storeLook";
import type { Lang } from "@/lib/i18n";
import { say } from "../words";
import { ThemeIntro } from "./ThemeIntro";
import { modelFor } from "./modelFor";

export function ThemeAbout({ lang }: { lang: Lang }) {
  const { theme, industry } = useStoreLook();
  const id = useStoreIdentity();
  const n = useNames();
  if (!theme) return null;
  const about = pick(id.about, lang) || say(theme.copy.subtitle, lang);
  const line = pick(id.tagline, lang) || say(theme.copy.title, lang).replace(/\n/g, " ");
  return (
    <div className="th-about" data-testid="theme-about">
      <ThemeIntro eyebrow={tr(lang, "قصتنا", "Our story")} title={line} subtitle={about} cta={{ label: say(theme.copy.cta, lang), href: "/shop" }} model={modelFor(theme, industry)} />
      <section className="th-home th-section" data-th={theme.id} data-th-card={theme.card}>
        <div className="th-about-story" data-th-reveal="block">
          <h2 className="th-section-title">{tr(lang, `ليش ${n.store}؟`, "Why {0}?", [n.store])}</h2>
          <p>{about}</p>
        </div>
      </section>
      <section className="th-home th-section" data-th={theme.id} data-th-card={theme.card} aria-label={tr(lang, "وعودنا", "Our promises")}>
        <div className="th-about-values" data-th-stagger="">
          {theme.copy.marquee.map((m, i) => (
            <article key={i}>
              <span className="th-index-n" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{say(m, lang)}</h2>
            </article>
          ))}
        </div>
      </section>
      <section className="th-home th-section" data-th={theme.id}>
        <div className="th-cta-box" data-th-reveal="block">
          <h2 className="th-cta-title">{say(theme.copy.title, lang).replace(/\n/g, " ")}</h2>
          <p className="th-cta-sub">{say(theme.copy.subtitle, lang)}</p>
          <Link href="/shop" className="th-button" data-th-magnetic="">
            {say(theme.copy.cta, lang)}
          </Link>
        </div>
      </section>
    </div>
  );
}
