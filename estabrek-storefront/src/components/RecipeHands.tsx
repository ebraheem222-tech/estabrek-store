"use client";

/**
 * The shop's hands for the pages' recipes (pageTree/recipeHands.ts): a recipe on any element can put a product in
 * the bag, save it to the wishlist or open WhatsApp to the store. Mounted once inside the shop's providers.
 */
import { useEffect, useRef } from "react";
import { apiBaseClient, getProductByIdClient } from "@/lib/apiClient";
import { getProductPrimaryImage } from "@/lib/catalog";
import { whatsappDigits, whatsappLink } from "@/lib/whatsapp";
import { useCart } from "@/store/cart";
import { useOptionalAccount } from "@/store/account";
import { useOptionalWishlist } from "@/store/wishlist";
import { useLanguage } from "@/components/cinematic/Language";
import { useQuickView } from "@/components/QuickViewModal";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { setHands, WHO_EVENT } from "@/pageTree/recipeHands";
import { rowsOf } from "@/pageTree/rowsSpec";

export function RecipeHands() {
  const cart = useCart();
  const wishlist = useOptionalWishlist();
  const quick = useQuickView();
  const settings = useStorefrontSettings();
  const account = useOptionalAccount();
  const { language } = useLanguage();
  // The hands are given once; they always reach for what the shop holds now.
  const now = useRef({ cart, wishlist, quick, settings, language, account });
  now.current = { cart, wishlist, quick, settings, language, account };

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
      fn: async (address, input) => {
        try {
          // The first moment of a page, her session is still coming back: wait for it (a few seconds at most), so
          // a press then is hers and not a guest's.
          for (let k = 0; k < 40 && now.current.account?.status === "loading"; k++) await new Promise((r) => window.setTimeout(r, 100));
          // Hers when she is signed in (the shop's own short token); anyone's otherwise.
          const who = (await now.current.account?.authHeaders()) ?? {};
          const res = await fetch(`${apiBaseClient()}/fn/${encodeURIComponent(address)}`, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", ...who }, body: JSON.stringify({ input }) });
          const data = (await res.json().catch(() => ({}))) as { ok?: boolean; value?: unknown; error?: unknown };
          if (res.ok && data.ok) return { ok: true, value: data.value ?? null };
          // The function's own words come with 422; the other refusals carry a code, not words for a shopper.
          return { ok: false, status: res.status, error: res.status === 422 && typeof data.error === "string" ? data.error : "" };
        } catch {
          return { ok: false, status: 0, error: "" };
        }
      },
      row: async (table, values, lang) => {
        try {
          for (let k = 0; k < 40 && now.current.account?.status === "loading"; k++) await new Promise((r) => window.setTimeout(r, 100));
          const who = (await now.current.account?.authHeaders()) ?? {};
          const res = await fetch(`${apiBaseClient()}/data/${encodeURIComponent(table)}`, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", ...who }, body: JSON.stringify({ values, lang }) });
          type Wrong = { field?: unknown; message?: unknown; say?: Record<string, unknown> | null };
          const data = (await res.json().catch(() => ({}))) as { details?: { issues?: Wrong[] } | null };
          if (res.ok) return { ok: true, value: data };
          // What is wrong, field by field (the server's 400 ROW_INVALID carries them in `details.issues`): the owner's
          // own words for the field's rule when they wrote them, the server's otherwise.
          const issues = (Array.isArray(data.details?.issues) ? data.details.issues : []).flatMap((i) => {
            const own = i.say && typeof i.say[lang] === "string" ? (i.say[lang] as string) : "";
            const text = own || (typeof i.message === "string" ? i.message : "");
            return typeof i.field === "string" && text ? [{ field: i.field, text }] : [];
          });
          return { ok: false, status: res.status, error: "", issues };
        } catch {
          return { ok: false, status: 0, error: "" };
        }
      },
      upload: async (table, field, file) => {
        try {
          for (let k = 0; k < 40 && now.current.account?.status === "loading"; k++) await new Promise((r) => window.setTimeout(r, 100));
          const who = (await now.current.account?.authHeaders()) ?? {};
          const body = new FormData();
          body.append("file", file, file.name);
          const res = await fetch(`${apiBaseClient()}/data/${encodeURIComponent(table)}/files/${encodeURIComponent(field)}`, { method: "POST", cache: "no-store", headers: who, body });
          const data = (await res.json().catch(() => ({}))) as { value?: unknown; error?: unknown; details?: { maxMb?: unknown } | null };
          if (res.ok && typeof data.value === "string") return { ok: true, value: data.value };
          return { ok: false, status: res.status, code: typeof data.error === "string" ? data.error : "", ...(typeof data.details?.maxMb === "number" ? { maxMb: data.details.maxMb } : {}) };
        } catch {
          return { ok: false, status: 0, code: "" };
        }
      },
      rows: async (table, query) => {
        try {
          for (let k = 0; k < 40 && now.current.account?.status === "loading"; k++) await new Promise((r) => window.setTimeout(r, 100));
          const who = (await now.current.account?.authHeaders()) ?? {};
          const res = await fetch(`${apiBaseClient()}/data/${encodeURIComponent(table)}?${query}`, { cache: "no-store", headers: who });
          if (!res.ok) return { ok: false, status: res.status };
          const data = (await res.json().catch(() => ({}))) as { data?: unknown; total?: unknown };
          const rows = rowsOf(data.data);
          return { ok: true, rows, total: typeof data.total === "number" && data.total >= 0 ? data.total : rows.length };
        } catch {
          return { ok: false, status: 0 };
        }
      },
      one: async (table, id, lang) => {
        try {
          for (let k = 0; k < 40 && now.current.account?.status === "loading"; k++) await new Promise((r) => window.setTimeout(r, 100));
          const who = (await now.current.account?.authHeaders()) ?? {};
          const res = await fetch(`${apiBaseClient()}/data/${encodeURIComponent(table)}/${encodeURIComponent(id)}?shown=1&lang=${encodeURIComponent(lang)}`, { cache: "no-store", headers: who });
          return res.ok ? rowsOf([await res.json().catch(() => null)])[0] ?? null : null;
        } catch {
          return null;
        }
      },
      live: async (tables, after, signal) => {
        try {
          for (let k = 0; k < 40 && now.current.account?.status === "loading"; k++) await new Promise((r) => window.setTimeout(r, 100));
          const who = (await now.current.account?.authHeaders()) ?? {};
          const q = new URLSearchParams({ tables: tables.join(",") });
          if (after) q.set("after", after);
          const res = await fetch(`${apiBaseClient()}/live?${q}`, { cache: "no-store", headers: { Accept: "text/event-stream", ...who }, signal });
          if (!res.ok || !res.body) return { ok: false, status: res.status };
          return { ok: true, body: res.body };
        } catch {
          return { ok: false, status: 0 };
        }
      },
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
