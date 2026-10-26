"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, LANG_DEFAULTS, dirOf, isLang, isRtl, stripLang, withLang, type Lang, type LangConfig } from "@/lib/i18n";

export type Language = Lang;

type Ctx = {
  language: Lang;
  setLanguage: (value: Lang) => void;
  /** The languages this store offers (admin → اللغات). */
  languages: Lang[];
  /** Arabic or Hebrew: the page reads right to left. */
  rtl: boolean;
};

const Context = createContext<Ctx>({ language: "ar", setLanguage: () => {}, languages: LANG_DEFAULTS.enabled, rtl: true });

/** Before languages had their own addresses the choice lived in the browser only. */
const LEGACY_KEY = "estabrek-language";

export function LanguageProvider({ initial = "ar", config = LANG_DEFAULTS, children }: { initial?: Lang; config?: LangConfig; children: React.ReactNode }) {
  const router = useRouter();
  const [language, update] = useState<Lang>(initial);
  // The server sent a page in another language (a link with /en/…, or after a switch).
  useEffect(() => update(initial), [initial]);

  const setLanguage = useCallback(
    (value: Lang) => {
      if (!config.enabled.includes(value)) return;
      update(value);
      document.cookie = `${LANG_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
      try {
        localStorage.setItem(LEGACY_KEY, value);
      } catch {}
      document.documentElement.lang = value;
      document.documentElement.dir = dirOf(value);
      // The server sends the page again in the new language; an address with a
      // language in it (/en/…) becomes the same page in the new one.
      const path = window.location.pathname;
      if (/^\/(ar|en|he)(\/|$)/.test(path)) router.replace(withLang(stripLang(path), value, config) + window.location.search);
      else router.refresh();
    },
    [router, config],
  );

  // A choice saved the old way (browser only) moves to the cookie, once.
  const moved = useRef(false);
  useEffect(() => {
    if (moved.current) return;
    moved.current = true;
    try {
      const hasCookie = document.cookie.split("; ").some((c) => c.startsWith(`${LANG_COOKIE}=`));
      const saved = localStorage.getItem(LEGACY_KEY);
      if (!hasCookie && isLang(saved) && saved !== initial && config.enabled.includes(saved)) setLanguage(saved);
    } catch {}
  }, [initial, config, setLanguage]);

  const value = useMemo(() => ({ language, setLanguage, languages: config.enabled, rtl: isRtl(language) }), [language, setLanguage, config.enabled]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLanguage() {
  return useContext(Context);
}
