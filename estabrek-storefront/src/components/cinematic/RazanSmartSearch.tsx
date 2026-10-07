"use client";
/**
 * Search in her own words (admin → الذكاء الاصطناعي): «بدي فستان سهرة خمري لحد 300»
 * → Razan shows what she understood and the filters, one tap to apply.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBaseClient } from "@/lib/apiClient";

type Parsed = { q: string; categoryId: string | null; colors: string[]; sizeIds: string[]; minPrice: number | null; maxPrice: number | null; summary: string };

export function RazanSmartSearch({ query, ar }: { query: string; ar: boolean }) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  useEffect(() => {
    let alive = true;
    setParsed(null);
    fetch(`${apiBaseClient()}/ai/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: query }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setParsed(d); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [query]);
  if (!parsed) return null;
  const has = parsed.categoryId || parsed.colors.length || parsed.sizeIds.length || parsed.minPrice || parsed.maxPrice || (parsed.q && parsed.q !== query);
  if (!has) return null;
  const sp = new URLSearchParams();
  if (parsed.q) sp.set("q", parsed.q);
  if (parsed.categoryId) sp.set("categoryId", parsed.categoryId);
  if (parsed.colors.length) sp.set("colors", parsed.colors.join(","));
  if (parsed.sizeIds.length) sp.set("sizeIds", parsed.sizeIds.join(","));
  if (parsed.minPrice) sp.set("minPrice", String(parsed.minPrice));
  if (parsed.maxPrice) sp.set("maxPrice", String(parsed.maxPrice));
  return (
    <p className="rose-smart-search" data-testid="smart-search">
      <span>✨ {ar ? "رزان فهمت:" : "Rose understood:"} <b>{parsed.summary || parsed.q}</b></span>
      <Link href={`/search?${sp.toString()}`}>{ar ? "ورجيني هيك ←" : "Show me →"}</Link>
    </p>
  );
}
