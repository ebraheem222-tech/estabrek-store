"use client";
// A loading screen's words (loading.tsx gets no route params): in the page's language.
import { useLanguage } from "@/components/cinematic/Language";
import { tr } from "@/lib/words";

export function LoadingText({ ar, en }: { ar: string; en: string }) {
  const { language } = useLanguage();
  return <>{tr(language, ar, en)}</>;
}
