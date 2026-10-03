"use client";
import { createContext, useContext, useEffect, useState } from "react";
export type Language = "en" | "ar";
const Context = createContext<{
  language: Language;
  setLanguage: (value: Language) => void;
}>({ language: "ar", setLanguage: () => {} });
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, update] = useState<Language>("ar");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("estabrek-language");
      if (saved === "ar" || saved === "en") update(saved);
    } catch {}
  }, []);
  function setLanguage(value: Language) {
    update(value);
    try {
      localStorage.setItem("estabrek-language", value);
    } catch {}
  }
  return (
    <Context.Provider value={{ language, setLanguage }}>
      {children}
    </Context.Provider>
  );
}
export function useLanguage() {
  return useContext(Context);
}
