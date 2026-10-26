"use client";
import { useEffect, useRef, useState } from "react";
import { LANG_NAME, LANG_SHORT, type Lang } from "@/lib/i18n";
import { useLanguage } from "./Language";

/** What the button says for the language it switches to. */
const TARGET_LABEL: Record<Lang, string> = { ar: "عربي", en: "EN", he: "עברית" };

/**
 * The header's language button: with two languages it switches to the other one;
 * with three it opens a short list. Only the store's own languages (admin → اللغات).
 */
export function LanguageSwitch() {
  const { language, setLanguage, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (languages.length < 2) return null;
  if (languages.length === 2) {
    const other = languages.find((l) => l !== language) ?? languages[0];
    return (
      <button className="language-button" onClick={() => setLanguage(other)} aria-label={LANG_NAME[other]} lang={other}>
        {TARGET_LABEL[other]}
      </button>
    );
  }
  return (
    <div className="language-switch" ref={box}>
      <button className="language-button" aria-haspopup="menu" aria-expanded={open} aria-label={LANG_NAME[language]} onClick={() => setOpen((v) => !v)}>
        {LANG_SHORT[language]} <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <ul className="language-menu" role="menu" data-testid="language-menu">
          {languages.map((l) => (
            <li key={l}>
              <button type="button" role="menuitemradio" aria-checked={l === language} lang={l} onClick={() => { setOpen(false); setLanguage(l); }}>
                {LANG_NAME[l]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
