"use client";
/**
 * «كمّلي اللبسة» without AI (every store): pieces from the shop's other categories in colours that go with the
 * colour she picked (GET /catalog/products/:id/look, api look.service.ts). It follows her pick: another colour,
 * other pieces. Each opens in the colour that matched. The AI stylist's version (with its reasons) shows instead
 * when the owner switched it on (admin → الذكاء الاصطناعي).
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import { cldUrl } from "@/lib/cloudinary";
import { formatMoney } from "@/lib/catalog";
import { tr } from "@/lib/words";
import { useStoreIdentity } from "@/store/storeIdentity";
import { useLanguage } from "./Language";

type LookPiece = { id: string; title: string; slug: string; image: string | null; price: number | null; colorName: string | null };

export function RoseCompleteLook({ productId, colorHex, colorName }: { productId: string; colorHex?: string | null; colorName?: string | null }) {
  const { language: lang } = useLanguage();
  const { currency } = useStoreIdentity();
  const box = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const [pieces, setPieces] = useState<LookPiece[] | null>(null);
  const hex = /^#?[0-9a-f]{6}$/i.test(colorHex ?? "") ? colorHex!.replace("#", "") : "";

  // Asked for once the section is near the screen (it sits below the piece's details).
  useEffect(() => {
    const el = box.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === "undefined") { setNear(true); return; }
    const seen = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { seen.disconnect(); setNear(true); } }, { rootMargin: "800px 0px" });
    seen.observe(el);
    return () => seen.disconnect();
  }, [near]);

  useEffect(() => {
    if (!near) return;
    let alive = true;
    fetch(`${apiBaseClient()}/catalog/products/${encodeURIComponent(productId)}/look${hex ? `?color=${hex}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setPieces(Array.isArray(d?.products) ? d.products : []); })
      .catch(() => alive && setPieces([]));
    return () => { alive = false; };
  }, [near, productId, hex]);

  const empty = pieces != null && pieces.length === 0;
  return (
    <section ref={box} className="rose-ai-look rose-look" data-testid="complete-look" aria-label={tr(lang, "كمّلي اللبسة", "Complete the look")} hidden={empty || undefined}>
      {pieces?.length ? (
        <>
          <h2>{tr(lang, "✨ كمّلي اللبسة", "✨ Complete the look")}</h2>
          {colorName ? <p className="rose-look-sub">{tr(lang, `بألوان بتلبق مع ${colorName}`, "In colours that go with {0}", [colorName])}</p> : null}
          <ul>
            {pieces.map((p) => (
              <li key={p.id}>
                <Link href={`/p/${encodeURIComponent(p.slug)}${p.colorName ? `?c=${encodeURIComponent(p.colorName)}` : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image ? <img src={cldUrl(p.image, { w: 360, h: 450, c: "fill", g: "auto" })} alt="" loading="lazy" /> : <span className="rose-ai-noimg" />}
                  <b>{p.title}</b>
                  {p.price != null ? <em>{formatMoney(p.price, currency)}</em> : null}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
