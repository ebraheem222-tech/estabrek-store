"use client";
/**
 * A shop element's own words (its search, filters, sorting, count and more), in the page's language,
 * for the parts of the shop that draw them; each part keeps its built-in word when none is given.
 * Outside a shop element (the shop's own pages) there are none.
 */
import { createContext, useContext, type ReactNode } from "react";
import { defaultPartWords, type ShopWordField } from "../../../shared/partWords";

export type ShopWords = Partial<Record<ShopWordField, string>>;

const Words = createContext<ShopWords>({});

export function ShopWordsScope({ value, children }: { value: ShopWords; children: ReactNode }) {
  return <Words.Provider value={value}>{children}</Words.Provider>;
}

/** The shop element's own words (empty outside one). */
export const useShopWords = () => useContext(Words);

/** Its own word, else the built-in one in this language (what the editor's sample shop shows). */
export function shopWord(words: ShopWords, field: ShopWordField, lang: "ar" | "en" | "he"): string {
  return words[field] || defaultPartWords("shop", field)?.[lang] || "";
}
