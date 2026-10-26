"use client";
/**
 * The page's address without its language (/en/cart → /cart), so checks like
 * "is this the cart?" work in every language. Use instead of next/navigation's.
 */
import { usePathname as useNextPathname } from "next/navigation";
import { stripLang } from "./i18n";

export function usePathname(): string {
  return stripLang(useNextPathname() || "/");
}
