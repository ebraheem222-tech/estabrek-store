"use client";
/**
 * What the store looks like, for the pages under the layout: its theme (with the store's own
 * changes, storeThemes/custom.ts), the mode it shows in, what it sells, and whether it wears the
 * rose design (its hijab pictures, words and guide belong to the store that picked it alone).
 * theme null = the rose design.
 */
import { createContext, useContext, type ReactNode } from "react";
import type { StoreTheme } from "@/storeThemes/types";
import type { Industry } from "@/lib/storeIdentity";

export type StoreLook = { theme: StoreTheme | null; mode: "light" | "dark"; industry: Industry; rose: boolean };

const Ctx = createContext<StoreLook>({ theme: null, mode: "light", industry: "general", rose: false });

export function StoreLookProvider({ value, children }: { value: StoreLook; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStoreLook = () => useContext(Ctx);
