"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "./Language";
const ImageSearch = dynamic(() => import("@/components/ImageSearchPanel").then(m => m.ImageSearchPanel), { ssr: false });
const Recommendations = dynamic(() => import("@/components/AIRecommendations").then(m => m.AIRecommendations), { ssr: false });
export function RoseShopTools({ imageSearch, recommendations }: { imageSearch: boolean; recommendations: boolean }) {
  const [open, setOpen] = useState(false);
  const ar = useLanguage().language === "ar";
  if (!imageSearch && !recommendations) return null;
  return <details className="rose-shop-tools" onToggle={e => setOpen(e.currentTarget.open)}><summary>{ar ? "طرق أخرى لاكتشاف إطلالتكِ" : "More ways to find your look"}</summary>
    {open && <div>{imageSearch && <ImageSearch />}{recommendations && <Recommendations title={ar ? "قد تحبين أيضاً" : "You might also love"} />}</div>}
  </details>;
}
