"use client";
import { useRef, type ReactNode } from "react";
import { useLanguage } from "./Language";
import { ScrollPalette } from "./ScrollPalette";
import { ScrollExperience } from "./ScrollExperience";

export function RosePageFrame({ children, className = "", home = false }: { children: ReactNode; className?: string; home?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  return <div ref={root} className={`rose-page-frame ${home ? "cinematic-home rose-home" : "rose-interior"} ${className}`} dir={language === "ar" ? "rtl" : "ltr"} lang={language}>
    {!home && !className.includes("rose-shop") && <ScrollPalette root={root} />}
    <ScrollExperience root={root} language={language} />
    {children}
  </div>;
}
