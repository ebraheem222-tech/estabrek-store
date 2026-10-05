/**
 * Shop events for Google Analytics 4, Meta Pixel (Instagram/Facebook) and the
 * TikTok Pixel, set from the admin (Settings → التسويق والتتبع). Each call is
 * sent to whichever of them is switched on; with none switched on nothing is
 * sent and nothing is loaded.
 *
 * Events that happen before the pixels have loaded (a product page opening
 * right away) wait in a short queue and go out once they are ready.
 */

export type TrackItem = {
  id: string;
  name: string;
  price?: number;
  quantity?: number;
  /** Colour · size */
  variant?: string;
  category?: string;
};

type Win = Window & {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  ttq?: { track: (event: string, data?: Record<string, unknown>) => void; page: () => void };
  __estabrekPixelsReady?: boolean;
};

const queue: Array<() => void> = [];

function run(send: () => void) {
  if (typeof window === "undefined") return;
  const w = window as Win;
  if (w.__estabrekPixelsReady) {
    try { send(); } catch { /* a blocked tracker must never break the shop */ }
    return;
  }
  if (queue.length < 50) queue.push(send);
}

/** Called by MarketingPixels once the trackers are set up. */
export function analyticsReady() {
  if (typeof window === "undefined") return;
  (window as Win).__estabrekPixelsReady = true;
  while (queue.length) {
    const send = queue.shift()!;
    try { send(); } catch { /* ignore */ }
  }
}

const total = (items: TrackItem[]) => items.reduce((s, it) => s + (it.price ?? 0) * (it.quantity ?? 1), 0);
const round = (n: number) => Math.round(n * 100) / 100;

function fanOut(
  ga: string,
  meta: string,
  tiktok: string,
  items: TrackItem[],
  extra: { value?: number; currency?: string; orderId?: string } = {},
) {
  run(() => {
    const w = window as Win;
    const value = round(extra.value ?? total(items));
    const currency = extra.currency || "ILS";
    w.gtag?.("event", ga, {
      currency,
      value,
      ...(extra.orderId ? { transaction_id: extra.orderId } : {}),
      items: items.map((it) => ({
        item_id: it.id,
        item_name: it.name,
        price: it.price,
        quantity: it.quantity ?? 1,
        item_variant: it.variant,
        item_category: it.category,
      })),
    });
    w.fbq?.("track", meta, {
      content_type: "product",
      content_ids: items.map((it) => it.id),
      contents: items.map((it) => ({ id: it.id, quantity: it.quantity ?? 1, item_price: it.price })),
      num_items: items.reduce((s, it) => s + (it.quantity ?? 1), 0),
      value,
      currency,
    });
    w.ttq?.track(tiktok, {
      content_type: "product",
      contents: items.map((it) => ({ content_id: it.id, content_name: it.name, price: it.price, quantity: it.quantity ?? 1 })),
      value,
      currency,
      ...(extra.orderId ? { order_id: extra.orderId } : {}),
    });
  });
}

export function trackPageView(path: string) {
  run(() => {
    const w = window as Win;
    w.gtag?.("event", "page_view", { page_path: path, page_location: window.location.href, page_title: document.title });
    w.fbq?.("track", "PageView");
    w.ttq?.page();
  });
}

export const trackViewItem = (item: TrackItem, currency?: string) =>
  fanOut("view_item", "ViewContent", "ViewContent", [item], { currency });

export const trackAddToCart = (item: TrackItem, currency?: string) =>
  fanOut("add_to_cart", "AddToCart", "AddToCart", [item], { currency });

export const trackBeginCheckout = (items: TrackItem[], value: number, currency?: string) =>
  fanOut("begin_checkout", "InitiateCheckout", "InitiateCheckout", items, { value, currency });

/** An order sent without paying online (WhatsApp / pay on delivery): a lead, not yet a sale. */
export const trackLead = (items: TrackItem[], value: number, currency?: string, orderId?: string) =>
  fanOut("generate_lead", "Lead", "SubmitForm", items, { value, currency, orderId });

export const trackPurchase = (items: TrackItem[], value: number, currency?: string, orderId?: string) =>
  fanOut("purchase", "Purchase", "CompletePayment", items, { value, currency, orderId });

/* A card/PayPal payment finishes on another page: what was paid for is kept until then. */
const PENDING_KEY = "estabrek_pending_purchase";

export function rememberPurchase(items: TrackItem[], value: number, currency?: string) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ items, value, currency })); } catch { /* storage blocked */ }
}

/** Sends the remembered purchase once (a refresh of the success page doesn't count it twice). */
export function completePurchase(orderId?: string | null) {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;
    sessionStorage.removeItem(PENDING_KEY);
    const p = JSON.parse(raw) as { items: TrackItem[]; value: number; currency?: string };
    trackPurchase(p.items ?? [], Number(p.value) || 0, p.currency, orderId ?? undefined);
  } catch {
    /* ignore */
  }
}

/**
 * A product as the trackers see it. Its id is the product's link name (slug), the
 * same in every event (the bag only knows the slug), with colour · size as the variant.
 */
export function productItem(
  p: { id: string; slug?: string | null; title: string; category?: { name?: string | null } | null },
  opts: { color?: string | null; size?: string | null; price?: number | null; quantity?: number } = {},
): TrackItem {
  const variant = [opts.color, opts.size].filter((x) => x && x !== "Default").join(" · ");
  return {
    id: p.slug || p.id,
    name: p.title,
    price: opts.price != null && Number.isFinite(opts.price) ? Number(opts.price) : undefined,
    quantity: opts.quantity ?? 1,
    variant: variant || undefined,
    category: p.category?.name ?? undefined,
  };
}

/** The bag's lines (from the store's price check) as tracker items. */
export function bagItems(
  lines: Array<{ variantId: string; productSlug?: string | null; productTitle?: string; colorName?: string | null; sizeName?: string | null; unitPrice?: string | number; quantity: number }>,
): TrackItem[] {
  return lines.map((l) =>
    productItem(
      { id: l.variantId, slug: l.productSlug, title: l.productTitle || "" },
      { color: l.colorName, size: l.sizeName, price: l.unitPrice != null ? Number(l.unitPrice) : null, quantity: l.quantity },
    ),
  );
}
