"use client";
import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { useWishlist } from "@/store/wishlist";
import { LqipImage } from "@/components/LqipImage";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";

function price(value?: number) {
  if (value == null || !Number.isFinite(value)) return null;
  try {
    return new Intl.NumberFormat("ar", { style: "currency", currency: "ILS" }).format(value);
  } catch {
    return `₪${value.toFixed(2)}`;
  }
}

/** Rose wishlist: the saved pieces as the same rounded 4:5 cards as the shop. */
export function RoseWishlist() {
  const ar = useLanguage().language === "ar";
  const { items, removeFromWishlist, clearWishlist, count } = useWishlist();
  const grid = useRef<HTMLUListElement>(null);

  const remove = (id: string) => {
    const card = grid.current?.querySelector<HTMLElement>(`[data-wish="${CSS.escape(id)}"]`);
    if (!card) return removeFromWishlist(id);
    gsap.to(card, { opacity: 0, scale: 0.92, y: 12, duration: 0.3, ease: "power2.in", onComplete: () => removeFromWishlist(id) });
  };

  const label = ar
    ? count === 1 ? "قطعة واحدة" : count === 2 ? "قطعتان" : count <= 10 ? `${count} قطع` : `${count} قطعة`
    : `${count} piece${count === 1 ? "" : "s"}`;

  if (!count) {
    return (
      <section className="rose-cart rose-cart-empty rose-wishlist-empty">
        <span className="rose-cart-empty-icon"><Icon name="heart" /></span>
        <span className="atelier-eyebrow">{ar ? "المفضلة" : "WISHLIST"}</span>
        <h1>{ar ? "لم تحفظي أي قطعة بعد." : "Nothing saved yet."}</h1>
        <p>{ar ? "اضغطي على القلب فوق أي قطعة تعجبكِ، وستجدينها هنا متى عدتِ." : "Tap the heart on any piece you love and you'll find it here whenever you come back."}</p>
        <div className="rose-cart-empty-actions">
          <Link href="/shop" className="atelier-button button-dark">{ar ? "اكتشفي المجموعة" : "Explore the collection"}<Icon name="arrow" /></Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rose-wishlist">
      <header className="rose-cart-head">
        <span className="atelier-eyebrow">{ar ? "المفضلة" : "WISHLIST"}</span>
        <h1>{ar ? "قطعكِ المفضلة." : "Your favourites."}<span>{label}</span></h1>
        <button type="button" className="rose-cart-clear" onClick={() => clearWishlist()}>{ar ? "مسح الكل" : "Clear all"}</button>
      </header>
      <ul ref={grid} className="rose-wishlist-grid">
        {items.map((item) => {
          const href = `/p/${encodeURIComponent(item.slug)}`;
          const p = price(item.price);
          return (
            <li key={item.id} data-wish={item.id} className="rose-wish-card">
              <Link href={href} className="rose-wish-frame">
                {item.image ? (
                  <LqipImage src={item.image} alt={item.title} fill blurDataUrl={item.imageBlurDataUrl ?? undefined} loading="lazy" className="object-cover" sizes="(max-width: 760px) 50vw, 25vw" />
                ) : (
                  <span className="rose-image-placeholder">استبرق</span>
                )}
              </Link>
              <button type="button" className="rose-pdp-wish rose-wish-remove" aria-pressed="true" onClick={() => remove(item.id)} aria-label={`${ar ? "إزالة من المفضلة" : "Remove from wishlist"} ${item.title}`}>
                <Icon name="heart" />
              </button>
              <div className="rose-wish-body">
                <Link href={href} className="rose-wish-title">{item.title}</Link>
                {p && <span className="rose-wish-price">{p}</span>}
                <Link href={href} className="rose-wish-cta">{ar ? "اختاري اللون والمقاس" : "Choose colour & size"}<Icon name="arrow" /></Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
