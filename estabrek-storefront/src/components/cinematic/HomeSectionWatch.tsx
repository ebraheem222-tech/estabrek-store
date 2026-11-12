"use client";
import { useEffect } from "react";
import { abTests, abValue } from "@/lib/ab";
import { watchHomeSections } from "@/lib/homeStats";

/**
 * On the home page: counts what each section does (lib/homeStats.ts), and when the home's order is being tried
 * (an A/B test of kind "homeOrder"), counts this visit for its side (the order itself is drawn by
 * HOME_ORDER_SCRIPT before the page shows).
 */
export function HomeSectionWatch() {
  useEffect(() => {
    const frame = document.querySelector<HTMLElement>(".rose-page-frame.rose-home");
    if (!frame) return;
    if (abTests().some((t) => t.kind === "homeOrder")) abValue("homeOrder");
    return watchHomeSections(frame);
  }, []);
  return null;
}
