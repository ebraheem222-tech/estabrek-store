"use client";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { readCardDesign, readVisualControls, type CardDesign } from "@/lib/visualControls";
import { mountVisualInteractions } from "@/lib/visualInteractions";
import { storefrontPalette } from "@/lib/storefrontPalette";
import { discardThemePreview, stopThemeCycle } from "@/lib/themePreview";
import { stopThemeTween, suspendThemeFollowers } from "@/lib/themeTween";

const CardContext = createContext<CardDesign | null | undefined>(undefined);
export const useCardDesign = () => useContext(CardContext);
export function CardDesignScope({ value, children }: { value?: unknown; children: ReactNode }) {
  const parent = useCardDesign(), own = readCardDesign(value);
  return <CardContext.Provider value={own === undefined ? parent : own}>{children}</CardContext.Provider>;
}
export function VisualControlsProvider({ value, children }: { value: unknown; children: ReactNode }) {
  const config = useMemo(() => readVisualControls(value), [value]);
  const path = usePathname();
  useEffect(() => mountVisualInteractions(document, config.interactions, storefrontPalette, {
    automaticClicks: !path.includes("/studio-frame"),
    prepareBaseline: () => { stopThemeCycle(null); discardThemePreview(); },
    stopWriters: roots => { suspendThemeFollowers(document); roots.forEach(stopThemeTween); },
  }), [config, path]);
  return <CardContext.Provider value={config.cardDesign}>{children}</CardContext.Provider>;
}
export function PageVisualScope({ policy, cardDesign, lookTargets, children }: { policy?: unknown; cardDesign?: unknown; lookTargets?: string[]; children: ReactNode }) {
  return <CardDesignScope value={cardDesign}><div data-cms-interaction-page="" data-pt-page-look-targets={lookTargets?.join("|")} data-interactions={policy ? JSON.stringify(policy) : undefined} style={{ display: "contents" }}>{children}</div></CardDesignScope>;
}
