"use client";

/**
 * The shop's hands for the pages' recipes (pageTree/recipeHands.ts): a recipe on any element can put a product in
 * the bag, save it to the wishlist or open WhatsApp to the store. Mounted once inside the shop's providers.
 */
import { useEffect, useRef } from "react";
import { getProductByIdClient } from "@/lib/apiClient";
import { getProductPrimaryImage } from "@/lib/catalog";
import { whatsappDigits, whatsappLink } from "@/lib/whatsapp";
import { useCart } from "@/store/cart";
import { useOptionalAccount } from "@/store/account";
import { useOptionalWishlist } from "@/store/wishlist";
import { useLanguage } from "@/components/cinematic/Language";
import { useQuickView } from "@/components/QuickViewModal";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { setHands, WHO_EVENT } from "@/pageTree/recipeHands";

export function RecipeHands() {
  const cart = useCart();
  const wishlist = useOptionalWishlist();
  const quick = useQuickView();
  const settings = useStorefrontSettings();
  const account = useOptionalAccount();
  const { language } = useLanguage();
  // The hands are given once; they always reach for what the shop holds now.
  const now = useRef({ cart, wishlist, quick, settings, language });
  now.current = { cart, wishlist, quick, settings, language };

  useEffect(() => {
    setHands({
      bagCount: () => now.current.cart.count,
      bag: async (productId, quantity, from) => {
        const product = await getProductByIdClient(productId, now.current.language).catch(() => null);
        if (!product) return "fail";
        const variants = (product.items ?? []).flatMap((item) => item.variants ?? []);
        // No stock number = not counted (can be bought).
        const open = variants.filter((v) => v.stock == null || v.stock > 0);
        if (!open.length) return "fail";
        if (variants.length === 1) {
          now.current.cart.addItem(open[0].id, quantity);
          return "added";
        }
        // Several choices: its quick view to pick one; its own page when the store has quick views switched off.
        if (now.current.settings?.productQuickView !== false) now.current.quick.openQuickView(product, from ?? null);
        else window.location.assign(`${window.location.pathname.match(/^\/(ar|en|he)(?=\/|$)/)?.[0] ?? ""}/p/${encodeURIComponent(product.slug ?? product.id)}`);
        return "choose";
      },
      wish: async (productId, value) => {
        const list = now.current.wishlist;
        if (!list) return false;
        if (value === "remove") {
          list.removeFromWishlist(productId);
          return true;
        }
        if (value === "add" && list.isInWishlist(productId)) return true;
        const product = await getProductByIdClient(productId, now.current.language).catch(() => null);
        if (!product) return false;
        const item = { id: product.id, title: product.title, slug: product.slug ?? product.id, image: getProductPrimaryImage(product) ?? undefined, price: product.minPrice ?? undefined };
        if (value === "add") list.addToWishlist(item);
        else list.toggleWishlist(item);
        return true;
      },
      whatsapp: (phone, text) => whatsappLink(phone || now.current.settings?.whatsappNumber, text || undefined),
      phone: () => whatsappDigits(now.current.settings?.whatsappNumber),
    });
    return () => setHands(null);
  }, []);

  // Signing in or out: recipes for customers or guests look again.
  const status = account?.status;
  useEffect(() => {
    window.dispatchEvent(new Event(WHO_EVENT));
  }, [status]);
  return null;
}
