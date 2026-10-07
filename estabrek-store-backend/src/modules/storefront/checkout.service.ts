import Stripe from "stripe";
import { activeCustomerId } from "../customer/customer.service.js";
import { prisma } from "../../lib/prisma.js";
import { quoteCart, submitOrderRequest } from "../catalog/catalog.service.js";
import { releaseOrder, sendDeliveryEmail } from "../fulfillment/fulfillment.service.js";

type CheckoutProvider = "stripe" | "paypal";

type CheckoutCreateInput = {
  provider: CheckoutProvider;
  /** Signed-in shopper (from her token, never from the request body). */
  userId?: string | null;
  items: Array<{ variantId: string; quantity: number }>;
  customerName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  note?: string | null;
  couponCode?: string | null;
  country?: string | null;
  city?: string | null;
  baseUrl: string;
};

type CheckoutVerifyInput = {
  provider: CheckoutProvider;
  sessionId: string;
};

type PaymentSettings = {
  siteName: string;
  currencyCode: string;
  storeCountryCode: string;
  stripeEnabled: boolean;
  stripeSecretKey: string | null;
  paypalEnabled: boolean;
  paypalClientId: string | null;
  paypalClientSecret: string | null;
};

type PayPalOrder = {
  id: string;
  status?: string;
  links?: Array<{ href: string; rel: string; method?: string }>;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{ id: string; status?: string }>;
    };
  }>;
};

function httpError(code: string, message?: string, statusCode: number = 400, meta?: any) {
  const err: any = new Error(message ?? code);
  err.statusCode = statusCode;
  err.code = code;
  if (meta !== undefined) err.meta = meta;
  return err;
}

function normalizeCurrency(code?: string | null) {
  return (code || "ILS").toLowerCase();
}

function toMinorUnits(value: number) {
  return Math.round(Number(value) * 100);
}

function formatAmount(value: number) {
  return Number(value).toFixed(2);
}

function isHttpUrl(value?: string | null) {
  if (!value) return false;
  return /^https?:\/\//i.test(value);
}

async function getPaymentSettings(): Promise<PaymentSettings> {
  let settings = await prisma.siteSettings.findFirst({
    select: {
      siteName: true,
      currencyCode: true,
      storeCountryCode: true,
      stripeEnabled: true,
      stripeSecretKey: true,
      paypalEnabled: true,
      paypalClientId: true,
      paypalClientSecret: true,
    },
  });
  if (!settings) {
    settings = await prisma.siteSettings.create({ data: {} });
  }
  return {
    siteName: settings.siteName ?? "Store",
    currencyCode: settings.currencyCode ?? "ILS",
    storeCountryCode: settings.storeCountryCode ?? "IL",
    stripeEnabled: settings.stripeEnabled ?? false,
    stripeSecretKey: settings.stripeSecretKey ?? null,
    paypalEnabled: settings.paypalEnabled ?? false,
    paypalClientId: settings.paypalClientId ?? null,
    paypalClientSecret: settings.paypalClientSecret ?? null,
  };
}

function getPayPalBaseUrl() {
  const mode = String(process.env.PAYPAL_ENV || "live").toLowerCase();
  return mode === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

async function getPayPalAccessToken(clientId: string, clientSecret: string) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access_token) {
    throw httpError("PAYPAL_AUTH_FAILED", "تعذر الاتصال بـ PayPal.", 502, data);
  }
  return String(data.access_token);
}

async function createPayPalOrder(args: {
  accessToken: string;
  siteName: string;
  currencyCode: string;
  total: number;
  returnUrl: string;
  cancelUrl: string;
  referenceId: string;
}) {
  const res = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: args.referenceId,
          description: `Order from ${args.siteName}`,
          amount: {
            currency_code: args.currencyCode,
            value: formatAmount(args.total),
          },
        },
      ],
      application_context: {
        brand_name: args.siteName,
        return_url: args.returnUrl,
        cancel_url: args.cancelUrl,
        user_action: "PAY_NOW",
      },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as PayPalOrder;
  if (!res.ok || !data?.id) {
    throw httpError("PAYPAL_CREATE_FAILED", "تعذر إنشاء طلب PayPal.", 502, data);
  }
  return data;
}

async function capturePayPalOrder(accessToken: string, orderId: string): Promise<PayPalOrder> {
  const res = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const data = (await res.json().catch(() => ({}))) as PayPalOrder;
  if (res.ok && data?.id) return data;

  // Fallback: check order status if already captured
  const detailRes = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const detail = (await detailRes.json().catch(() => ({}))) as PayPalOrder;
  if (detailRes.ok && detail?.status === "COMPLETED") return detail;

  throw httpError("PAYPAL_CAPTURE_FAILED", "تعذر تأكيد الدفع عبر PayPal.", 502, data);
}

async function finalizeCheckoutSession(args: {
  provider: CheckoutProvider;
  sessionRef: string;
  paymentReference?: string | null;
}) {
  const checkout = await prisma.checkoutSession.findFirst({
    where: { provider: args.provider, sessionRef: args.sessionRef },
  });
  if (!checkout) {
    throw httpError("CHECKOUT_NOT_FOUND", "جلسة الدفع غير موجودة.", 404);
  }

  const payload = (checkout.payload as any) ?? {};
  const existingOrderId = payload?.orderId as string | undefined;
  if (checkout.status === "COMPLETED" && existingOrderId) {
    return { orderId: existingOrderId, status: "COMPLETED" as const, ...(await deliveryFor(existingOrderId)) };
  }

  const order = await submitOrderRequest({
    items: Array.isArray(payload.items) ? payload.items : [],
    customerName: String(payload.customerName ?? ""),
    phone: String(payload.phone ?? ""),
    whatsapp: payload.whatsapp ?? undefined,
    email: payload.email ?? undefined,
    country: payload.country ?? undefined,
    city: payload.city ?? undefined,
    address: payload.address ?? undefined,
    note: payload.note ?? undefined,
    couponCode: payload.couponCode ?? undefined,
    source: `${args.provider.toUpperCase()}_CHECKOUT`,
    paymentProvider: args.provider.toUpperCase(),
    paymentStatus: "PAID",
    paymentReference: args.paymentReference ?? undefined,
  }, { skipStockCheck: true, userId: await activeCustomerId(payload.userId) }); // paid: always recorded, the owner sorts out stock

  await prisma.checkoutSession.update({
    where: { id: checkout.id },
    data: {
      status: "COMPLETED",
      payload: {
        ...payload,
        orderId: order.id,
        paymentReference: args.paymentReference ?? null,
      },
    },
  });

  // Paid online: digital files and tickets are hers right away.
  await releaseOrder(order.id, "paid").catch((e) => console.error("[checkout] release failed:", (e as Error)?.message));
  await sendDeliveryEmail(order.id).catch(() => null);

  return { orderId: order.id, status: "PAID" as const, ...(await deliveryFor(order.id)) };
}

/** The private order page token, when the order has files or tickets ready. */
async function deliveryFor(orderId: string) {
  const o = await prisma.orderRequest.findUnique({ where: { id: orderId }, select: { accessToken: true, deliveredAt: true } });
  return o?.accessToken && o.deliveredAt ? { accessToken: o.accessToken } : {};
}

export async function createCheckoutSession(input: CheckoutCreateInput) {
  const settings = await getPaymentSettings();
  const provider = input.provider;
  const baseUrl = input.baseUrl.replace(/\/+$/, "");

  if (provider === "stripe" && !settings.stripeEnabled) {
    throw httpError("STRIPE_DISABLED", "Stripe غير مفعل حالياً.", 400);
  }
  if (provider === "paypal" && !settings.paypalEnabled) {
    throw httpError("PAYPAL_DISABLED", "PayPal غير مفعل حالياً.", 400);
  }

  // Check the pieces are still there before taking the money.
  // The phone is checked here, before paying (a coupon can belong to one phone).
  const quote = await quoteCart({ items: input.items, couponCode: input.couponCode ?? undefined, phone: input.phone }, { requireStock: true });
  if (!quote?.lines?.length) {
    throw httpError("EMPTY_CART", "السلة فارغة.", 400);
  }

  const payload = {
    items: input.items,
    // Signed-in shopper: the paid order shows in her account.
    userId: input.userId ?? null,
    customerName: input.customerName,
    phone: input.phone,
    email: input.email ?? null,
    address: input.address ?? null,
    note: input.note ?? null,
    couponCode: input.couponCode ?? null,
    country: input.country ?? settings.storeCountryCode ?? null,
    city: input.city ?? null,
    currencyCode: quote.currencyCode,
    total: quote.total,
    createdAt: new Date().toISOString(),
  };

  const session = await prisma.checkoutSession.create({
    data: {
      provider,
      status: "PENDING",
      payload,
    },
  });

  try {
    if (provider === "stripe") {
      if (!settings.stripeSecretKey) {
        throw httpError("STRIPE_CONFIG_MISSING", "Stripe غير مهيأ. أضف المفاتيح أولاً.", 400);
      }
      const stripe = new Stripe(settings.stripeSecretKey, { apiVersion: "2023-10-16" });
      const currency = normalizeCurrency(quote.currencyCode);
      const lineItems = (quote.lines ?? []).map((line) => {
        const lineTotal = Number(line.lineTotal ?? line.lineSubtotal ?? 0);
        const qty = Math.max(1, Number(line.quantity ?? 1));
        const unitAmount = toMinorUnits(lineTotal / qty);
        if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
          throw httpError("INVALID_AMOUNT", "تعذر تجهيز مبلغ الدفع.", 400);
        }
        const nameParts = [line.productTitle, line.colorName, line.sizeName].filter(Boolean).join(" - ");
        const imageSrc = typeof line.imageUrl === "string" ? line.imageUrl : undefined;
        const imageUrl = imageSrc && isHttpUrl(imageSrc) ? [imageSrc] : undefined;
        return {
          quantity: qty,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: nameParts || "منتج",
              images: imageUrl,
            },
          },
        };
      });

      const stripeSession = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        success_url: `${baseUrl}/checkout/success?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/cart?payment=cancel`,
        client_reference_id: session.id,
        metadata: { checkoutSessionId: session.id },
        locale: "auto",
      });

      if (!stripeSession?.url) {
        throw httpError("STRIPE_NO_URL", "تعذر إنشاء رابط Stripe.", 502);
      }

      await prisma.checkoutSession.update({
        where: { id: session.id },
        data: {
          sessionRef: stripeSession.id,
          payload: { ...payload, stripeSessionId: stripeSession.id },
        },
      });

      return { ok: true, provider, redirectUrl: stripeSession.url, sessionId: session.id };
    }

    if (provider === "paypal") {
      if (!settings.paypalClientId || !settings.paypalClientSecret) {
        throw httpError("PAYPAL_CONFIG_MISSING", "PayPal غير مهيأ. أضف المفاتيح أولاً.", 400);
      }
      const accessToken = await getPayPalAccessToken(settings.paypalClientId, settings.paypalClientSecret);
      const order = await createPayPalOrder({
        accessToken,
        siteName: settings.siteName,
        currencyCode: (settings.currencyCode ?? "ILS").toUpperCase(),
        total: Number(quote.total ?? 0),
        returnUrl: `${baseUrl}/checkout/success?provider=paypal`,
        cancelUrl: `${baseUrl}/cart?payment=cancel`,
        referenceId: session.id,
      });

      const approveUrl = order.links?.find((l) => l.rel === "approve")?.href;
      if (!approveUrl) {
        throw httpError("PAYPAL_NO_APPROVAL", "تعذر الحصول على رابط PayPal.", 502);
      }

      await prisma.checkoutSession.update({
        where: { id: session.id },
        data: {
          sessionRef: order.id,
          payload: { ...payload, paypalOrderId: order.id },
        },
      });

      return { ok: true, provider, redirectUrl: approveUrl, sessionId: session.id };
    }

    throw httpError("PROVIDER_UNSUPPORTED", "مزود الدفع غير مدعوم.", 400);
  } catch (err) {
    await prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        status: "FAILED",
        payload: {
          ...payload,
          error: (err as any)?.message ?? "FAILED",
        },
      },
    });
    throw err;
  }
}

export async function verifyCheckoutSession(input: CheckoutVerifyInput) {
  const settings = await getPaymentSettings();

  if (input.provider === "stripe") {
    if (!settings.stripeSecretKey) {
      throw httpError("STRIPE_CONFIG_MISSING", "Stripe غير مهيأ.", 400);
    }
    const stripe = new Stripe(settings.stripeSecretKey, { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.retrieve(input.sessionId);
    if (!session) {
      throw httpError("STRIPE_NOT_FOUND", "جلسة Stripe غير موجودة.", 404);
    }

    if (session.payment_status !== "paid") {
      return { ok: false, provider: "stripe", status: session.payment_status ?? session.status };
    }

    const paymentRef = typeof session.payment_intent === "string" ? session.payment_intent : session.id;
    const result = await finalizeCheckoutSession({
      provider: "stripe",
      sessionRef: session.id,
      paymentReference: paymentRef,
    });
    return { ok: true, provider: "stripe", ...result };
  }

  if (input.provider === "paypal") {
    if (!settings.paypalClientId || !settings.paypalClientSecret) {
      throw httpError("PAYPAL_CONFIG_MISSING", "PayPal غير مهيأ.", 400);
    }
    const accessToken = await getPayPalAccessToken(settings.paypalClientId, settings.paypalClientSecret);
    const order = await capturePayPalOrder(accessToken, input.sessionId);
    if (order.status !== "COMPLETED") {
      return { ok: false, provider: "paypal", status: order.status ?? "PENDING" };
    }

    const captureId = order.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? order.id;
    const result = await finalizeCheckoutSession({
      provider: "paypal",
      sessionRef: order.id,
      paymentReference: captureId,
    });
    return { ok: true, provider: "paypal", ...result };
  }

  throw httpError("PROVIDER_UNSUPPORTED", "مزود الدفع غير مدعوم.", 400);
}
