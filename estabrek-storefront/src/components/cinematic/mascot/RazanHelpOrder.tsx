"use client";
/**
 * «رزان بتساعدك تطلبي»: one question per screen for shoppers who find the bag
 * and the checkout form hard. Colour (with photos) → size → how many → name →
 * phone → city and address (skipped when nothing ships) → summary → confirm.
 * It sends a normal order request marked RAZAN_HELP. On every step she can ask
 * for a call instead («بدي حدا يحكيني»): name + phone and the team calls her.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { catalogItemKey, catalogItemLabel, formatMoney, getVariantEffectivePrice } from "@/lib/catalog";
import { imagesFor, inStock, itemHex, sizeKeyOf } from "@/lib/roseProductMedia";
import { cldUrl } from "@/lib/cloudinary";
import { apiBaseClient } from "@/lib/apiClient";
import { productItem, trackLead } from "@/lib/analytics";
import { deliveryCities, normalizeDelivery } from "@/lib/delivery";
import { razanCount } from "@/lib/razanRuntime";
import { razanSelection } from "@/lib/razanProduct";
import { useOptionalAccount } from "@/store/account";
import { useSiteFeatures } from "@/store/siteFeatures";
import { showsLeft } from "@/lib/scarcity";
import { useNames } from "@/store/storeIdentity";
import { tr } from "@/lib/words";
import { translatedTypeLabel } from "@/lib/localize";
import { useLanguage } from "../Language";

type Step = "color" | "size" | "qty" | "name" | "phone" | "address" | "summary";
type Done = { kind: "order"; orderId?: string } | { kind: "call" };

const PHONE_OK = (v: string) => v.replace(/\D/g, "").length >= 7;
const MAX_QTY = 10;

export function RazanHelpOrder({ product, ar, onClose }: { product: CatalogProduct; ar: boolean; onClose: () => void }) {
  const { language: lang } = useLanguage();
  const n = useNames();
  const account = useOptionalAccount();
  const { delivery: deliveryRaw, scarcity } = useSiteFeatures();
  const cities = useMemo(() => deliveryCities(normalizeDelivery(deliveryRaw)).flatMap((g) => g.cities), [deliveryRaw]);
  const kind = product.type ?? null;
  const fulfillment = kind?.fulfillment ?? "SHIPPING";
  const ships = fulfillment === "SHIPPING";
  const items = useMemo(() => (product.items ?? []).filter((it) => (it.variants ?? []).length > 0), [product]);
  const colorWord = ar ? kind?.colorLabel || "اللون" : translatedTypeLabel(kind, lang, "colorLabel") || tr(lang, "اللون", "colour");
  const sizeWord = ar ? kind?.sizeLabel || "المقاس" : translatedTypeLabel(kind, lang, "sizeLabel") || tr(lang, "المقاس", "size");

  // Start from what the page has selected.
  const [colorKey, setColorKey] = useState(() => {
    const sel = razanSelection().color;
    const i = items.findIndex((it, idx) => catalogItemKey(it, idx) === sel);
    const firstOk = items.findIndex((it) => (it.variants ?? []).some(inStock));
    const at = i >= 0 ? i : Math.max(0, firstOk);
    return items[at] ? catalogItemKey(items[at], at) : "";
  });
  const itemIndex = Math.max(0, items.findIndex((it, i) => catalogItemKey(it, i) === colorKey));
  const item = items[itemIndex];
  const variants = useMemo(() => item?.variants ?? [], [item]);
  const [sizeKey, setSizeKey] = useState(() => razanSelection().size ?? "");
  const variant = variants.find((v) => sizeKeyOf(v) === sizeKey && inStock(v)) ?? null;
  const [unsure, setUnsure] = useState(false);
  const [qty, setQty] = useState(1);
  const signedUser = account?.status === "signedIn" ? account.user : null;
  const [form, setForm] = useState(() => ({ name: signedUser?.name ?? "", phone: signedUser?.phone ?? "", email: signedUser?.email ?? "", city: "", address: "" }));
  const [call, setCall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const showColor = kind?.showColor !== false && items.length > 1;
  const sizesHere = useMemo(() => Array.from(new Set(variants.map(sizeKeyOf))), [variants]);
  const showSize = kind?.showSize !== false && !(sizesHere.length === 1 && sizesHere[0] === "default");
  const steps = useMemo<Step[]>(() => {
    const s: Step[] = [];
    if (showColor) s.push("color");
    if (showSize) s.push("size");
    s.push("qty", "name", "phone");
    if (ships) s.push("address");
    s.push("summary");
    return s;
  }, [showColor, showSize, ships]);
  const [at, setAt] = useState(0);
  const step = steps[Math.min(at, steps.length - 1)];

  // One size only (or sizes hidden): it is chosen for her.
  useEffect(() => {
    if (showSize) return;
    const v = variants.find(inStock);
    if (v) setSizeKey(sizeKeyOf(v));
  }, [showSize, variants]);

  const left = variant?.stock == null ? MAX_QTY : Math.min(MAX_QTY, Math.max(0, variant.stock));
  useEffect(() => { if (qty > left && left > 0) setQty(left); }, [left, qty]);

  // The next screen takes the focus (keyboard and screen readers follow her).
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>("input, button.razan-help-pick[aria-pressed='true'], .razan-help-main");
    el?.focus({ preventScroll: true });
  }, [step, call, done]);

  const price = variant ? getVariantEffectivePrice(variant) : null;
  const currency = (product as any).currencyCode ?? null;
  const emailOk = !form.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  const can = (s: Step) => {
    if (s === "color") return Boolean(item) && variants.some(inStock);
    if (s === "size") return Boolean(variant);
    if (s === "qty") return qty >= 1 && qty <= Math.max(1, left);
    if (s === "name") return form.name.trim().length >= 2;
    if (s === "phone") return PHONE_OK(form.phone);
    if (s === "address") return form.city.trim().length >= 2;
    return Boolean(variant) && !busy;
  };
  const next = () => {
    if (!can(step)) return;
    setErr(null);
    setAt((i) => Math.min(steps.length - 1, i + 1));
  };
  const back = () => { setErr(null); setAt((i) => Math.max(0, i - 1)); };

  const pickColor = (key: string) => {
    setColorKey(key);
    const it = items.find((x, i) => catalogItemKey(x, i) === key);
    // Keep her size when the new colour has it.
    const keep = it?.variants?.find((v) => sizeKeyOf(v) === sizeKey && inStock(v));
    if (!keep) setSizeKey("");
  };

  async function order() {
    if (!variant || busy) return;
    if (!emailOk) { setErr(tr(lang, "الإيميل مش مكتوب صح.", "That email doesn't look right.")); return; }
    setBusy(true);
    setErr(null);
    const note = [
      tr(lang, `طلب بمساعدة ${n.assistant}`, "Ordered with {0}'s help", [n.assistant]),
      unsure ? (tr(lang, "مش متأكدة من المقاس — بدها حدا يساعدها فيه", "Not sure about the size — please help her choose")) : "",
    ].filter(Boolean).join(" · ");
    try {
      const res = await fetch(`${apiBaseClient()}/catalog/order-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...((await account?.authHeaders()) ?? {}) },
        body: JSON.stringify({
          items: [{ variantId: variant.id, quantity: qty }],
          lang,
          customerName: form.name.trim(),
          phone: form.phone.trim(),
          ...(form.email.trim() ? { email: form.email.trim() } : {}),
          city: ships ? form.city.trim() || undefined : undefined,
          address: ships ? form.address.trim() || undefined : undefined,
          note,
          source: "RAZAN_HELP",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data?.error === "OUT_OF_STOCK") {
        const a = data?.details?.lines?.[0]?.available ?? 0;
        throw new Error(a > 0
          ? tr(lang, `ضايل منها ${a} بس. غيّري الكمية وجربي كمان مرة.`, "Only {0} left. Change the quantity and try again.", [a])
          : tr(lang, "خلصت هالقطعة بهاد الاختيار هلأ. اختاري لون أو مقاس تاني، أو اطلبي حدا يحكيكِ.", "This choice just sold out. Pick another colour or size, or ask us to call you."));
      }
      if (res.status === 409 && data?.error === "EVENT_OVER") throw new Error(tr(lang, "موعد هالحجز مرق، فما عاد فينا نحجزه.", "This booking has already taken place."));
      if (!res.ok) throw new Error(tr(lang, `ما زبط نبعت الطلب (${res.status}). جربي كمان مرة.`, "Could not send the order ({0}). Please try again.", [res.status]));
      const orderId = data?.id ? String(data.id) : undefined;
      trackLead([productItem(product, { color: item?.colorName, size: variant.size?.name, price, quantity: qty })], (price ?? 0) * qty, currency ?? undefined, orderId);
      razanCount("order:help");
      setDone({ kind: "order", orderId });
    } catch (e: any) {
      setErr(e?.message || (tr(lang, "صار خطأ", "Something went wrong")));
    } finally {
      setBusy(false);
    }
  }

  async function askCall() {
    if (busy || form.name.trim().length < 2 || !PHONE_OK(form.phone)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${apiBaseClient()}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "CALLBACK", name: form.name.trim(), phone: form.phone.trim(), productId: product.id, ...(variant ? { variantId: variant.id } : {}), source: "RAZAN_HELP", lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) throw new Error(tr(lang, "وصلتنا طلباتكِ، فريقنا رح يحكيكِ قريباً.", "We already have your request; we'll call you soon."));
      if (!res.ok) throw new Error(data?.message || (tr(lang, "ما زبط نبعت الطلب. جربي كمان مرة.", "Could not send. Please try again.")));
      razanCount("call:help");
      setDone({ kind: "call" });
    } catch (e: any) {
      setErr(e?.message || (tr(lang, "صار خطأ", "Something went wrong")));
    } finally {
      setBusy(false);
    }
  }

  const field = (key: "name" | "phone" | "email" | "city" | "address") => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  if (done) {
    return (
      <div className="razan-help" ref={box} data-testid="razan-help" aria-live="polite">
        <div className="razan-help-done">
          <span aria-hidden="true">🌸</span>
          {done.kind === "order" ? (
            <>
              <h3>{tr(lang, "وصلنا طلبكِ!", "We have your order!")}</h3>
              {done.orderId ? <p>{tr(lang, "رقم الطلب", "Order number")}: <b dir="ltr">{done.orderId}</b></p> : null}
              <p>{tr(lang, "رح نتواصل معكِ على رقمكِ لنأكد الطلب والتوصيل.", "We'll contact you on your number to confirm the order and delivery.")}</p>
            </>
          ) : (
            <>
              <h3>{tr(lang, "تمام، رح نحكيكِ!", "Done — we'll call you!")}</h3>
              <p>{tr(lang, "حدا من فريقنا رح يتصل فيكِ قريباً ويساعدكِ تطلبي.", "Someone from our team will call you soon and help you order.")}</p>
            </>
          )}
          <button type="button" className="razan-help-main" onClick={onClose}>{tr(lang, "تمام، شكراً", "Thanks!")}</button>
        </div>
      </div>
    );
  }

  if (call) {
    return (
      <div className="razan-help" ref={box} data-testid="razan-help">
        <p className="razan-help-q">{tr(lang, "ولا يهمّك! اكتبيلنا اسمكِ ورقمكِ وحدا من فريقنا بيحكيكِ.", "No problem! Leave your name and number and we'll call you.")}</p>
        <label className="razan-help-field"><span>{tr(lang, "الاسم", "Name")}</span><input {...field("name")} autoComplete="name" maxLength={80} /></label>
        <label className="razan-help-field"><span>{tr(lang, "رقم الهاتف", "Phone")}</span><input {...field("phone")} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={24} /></label>
        {err ? <p className="razan-help-err" role="alert">{err}</p> : null}
        <div className="razan-help-nav">
          <button type="button" className="ghost" onClick={() => { setCall(false); setErr(null); }}>{tr(lang, "رجوع", "Back")}</button>
          <button type="button" className="razan-help-main" disabled={busy || form.name.trim().length < 2 || !PHONE_OK(form.phone)} onClick={() => void askCall()}>
            {busy ? (tr(lang, "لحظة…", "One moment…")) : tr(lang, "احكوني", "Call me")}
          </button>
        </div>
      </div>
    );
  }

  // Nothing left to order: she can still ask the team to call her.
  if (!items.some((it) => (it.variants ?? []).some(inStock))) {
    return (
      <div className="razan-help" ref={box} data-testid="razan-help">
        <p className="razan-help-q">{tr(lang, "هالقطعة خلصت هلأ 😔 بس فينا نحكيكِ أول ما ترجع أو نلاقيلك إشي شبهها.", "This piece is sold out right now 😔 we can call you when it's back or find you something similar.")}</p>
        <button type="button" className="razan-help-main" onClick={() => setCall(true)}>{tr(lang, "📞 احكوني", "📞 Call me")}</button>
      </div>
    );
  }

  const photo = (it: (typeof items)[number]) => imagesFor(product, it)[0];
  const total = price != null ? price * qty : null;

  return (
    <div className="razan-help" ref={box} data-testid="razan-help" data-step={step}>
      <div className="razan-help-dots" aria-hidden="true">
        {steps.map((s, i) => <i key={s} data-on={i <= at ? "" : undefined} />)}
      </div>
      <p className="razan-help-count">{tr(lang, `خطوة ${at + 1} من ${steps.length}`, "Step {0} of {1}", [at + 1, steps.length])}</p>

      {step === "color" && (
        <>
          <p className="razan-help-q">{tr(lang, `أي ${colorWord} بدك؟`, "Which {0}?", [colorWord])}</p>
          <div className="razan-help-colors">
            {items.map((it, i) => {
              const key = catalogItemKey(it, i);
              const out = !(it.variants ?? []).some(inStock);
              const img = photo(it);
              const hex = itemHex(it);
              return (
                <button key={key} type="button" className="razan-help-pick" aria-pressed={key === colorKey} disabled={out} onClick={() => pickColor(key)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {img ? <img src={cldUrl(img, { w: 160, h: 200, c: "fill", g: "auto" })} alt="" loading="lazy" /> : <span className="razan-help-swatch" style={{ background: hex ?? "#ccc" }} />}
                  <span>{catalogItemLabel(it, i)}{out ? (tr(lang, " · خلص", " · sold out")) : ""}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === "size" && (
        <>
          <p className="razan-help-q">{tr(lang, `شو ${sizeWord} اللي بدك؟`, "Which {0}?", [sizeWord])}</p>
          <div className="razan-help-sizes">
            {variants.map((v) => {
              const key = sizeKeyOf(v);
              return (
                <button key={v.id} type="button" className="razan-help-pick" aria-pressed={key === sizeKey} disabled={!inStock(v)} onClick={() => { setSizeKey(key); setUnsure(false); }}>
                  {key === "default" ? (tr(lang, "مقاس واحد", "One size")) : key}
                  {!inStock(v) ? <small>{tr(lang, "خلص", "sold out")}</small> : null}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="razan-help-unsure"
            aria-pressed={unsure}
            onClick={() => {
              setUnsure(true);
              // The middle size in stock as a start; the team checks it with her.
              const ok = variants.filter(inStock);
              if (ok.length) setSizeKey(sizeKeyOf(ok[Math.floor((ok.length - 1) / 2)]));
            }}
          >
            {tr(lang, "مش متأكدة؟ 🤔", "Not sure? 🤔")}
          </button>
          {unsure ? <p className="razan-help-hint">{tr(lang, "اخترتلك المقاس الوسط، وفريقنا رح يتأكد معكِ منه قبل ما نبعت. بتقدري تغيّريه.", "I picked the middle size; our team will check it with you before sending. You can change it.")}</p> : null}
        </>
      )}

      {step === "qty" && (
        <>
          <p className="razan-help-q">{tr(lang, "قديش قطعة بدك؟", "How many?")}</p>
          <div className="razan-help-qty">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label={tr(lang, "أقل", "Fewer")}>−</button>
            <output aria-live="polite">{qty}</output>
            <button type="button" onClick={() => setQty((q) => Math.min(Math.max(1, left), q + 1))} disabled={qty >= left} aria-label={tr(lang, "أكثر", "More")}>+</button>
          </div>
          {showsLeft(scarcity, variant?.stock, "price") ? <p className="razan-help-hint">{tr(lang, `ضايل ${variant?.stock} بس`, "Only {0} left", [variant?.stock])}</p> : null}
        </>
      )}

      {step === "name" && (
        <>
          <p className="razan-help-q">{tr(lang, "شو اسمكِ؟", "What's your name?")}</p>
          <label className="razan-help-field"><input {...field("name")} aria-label={tr(lang, "الاسم", "Name")} autoComplete="name" maxLength={80} onKeyDown={(e) => e.key === "Enter" && next()} /></label>
        </>
      )}

      {step === "phone" && (
        <>
          <p className="razan-help-q">{tr(lang, "رقم هاتفكِ؟ (لنأكد معكِ الطلب)", "Your phone number? (to confirm with you)")}</p>
          <label className="razan-help-field"><input {...field("phone")} aria-label={tr(lang, "رقم الهاتف", "Phone")} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={24} onKeyDown={(e) => e.key === "Enter" && next()} /></label>
          {!ships ? (
            <label className="razan-help-field"><span>{tr(lang, "إيميلكِ (اختياري، لنبعتلك الرابط)", "Email (optional, for your link)")}</span><input {...field("email")} type="email" autoComplete="email" dir="ltr" maxLength={120} /></label>
          ) : null}
        </>
      )}

      {step === "address" && (
        <>
          <p className="razan-help-q">{tr(lang, "لوين نبعتلك؟", "Where should we deliver?")}</p>
          <label className="razan-help-field">
            <span>{tr(lang, "المدينة / البلد", "City / town")}</span>
            <input {...field("city")} autoComplete="address-level2" maxLength={80} list={cities.length ? "razan-help-cities" : undefined} />
          </label>
          {cities.length ? <datalist id="razan-help-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist> : null}
          <label className="razan-help-field"><span>{tr(lang, "العنوان (الحي، الشارع…) — اختياري", "Address (optional)")}</span><input {...field("address")} autoComplete="street-address" maxLength={200} /></label>
        </>
      )}

      {step === "summary" && (
        <>
          <p className="razan-help-q">{tr(lang, "هيك طلبكِ، صح؟", "Here's your order — all good?")}</p>
          <div className="razan-help-summary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {item && photo(item) ? <img src={cldUrl(photo(item)!, { w: 160, h: 200, c: "fill", g: "auto" })} alt="" /> : null}
            <dl>
              <div><dt>{tr(lang, "القطعة", "Piece")}</dt><dd>{product.title}</dd></div>
              {showColor && item ? <div><dt>{colorWord}</dt><dd>{catalogItemLabel(item, itemIndex)}</dd></div> : null}
              {showSize && variant ? <div><dt>{sizeWord}</dt><dd>{sizeKeyOf(variant)}{unsure ? (tr(lang, " (رح نتأكد معكِ)", " (we'll check)")) : ""}</dd></div> : null}
              <div><dt>{tr(lang, "الكمية", "Qty")}</dt><dd>{qty}</dd></div>
              <div><dt>{tr(lang, "الاسم", "Name")}</dt><dd>{form.name.trim()}</dd></div>
              <div><dt>{tr(lang, "الهاتف", "Phone")}</dt><dd dir="ltr">{form.phone.trim()}</dd></div>
              {ships ? <div><dt>{tr(lang, "التوصيل", "Delivery")}</dt><dd>{[form.city.trim(), form.address.trim()].filter(Boolean).join("، ")}</dd></div> : null}
              {total != null ? <div className="razan-help-total"><dt>{tr(lang, "المجموع", "Total")}</dt><dd>{formatMoney(total, currency)}{ships ? <small>{tr(lang, " + التوصيل (منأكده معكِ)", " + delivery (we'll confirm)")}</small> : null}</dd></div> : null}
            </dl>
          </div>
        </>
      )}

      {err ? <p className="razan-help-err" role="alert">{err}</p> : null}

      <div className="razan-help-nav">
        {at > 0 ? <button type="button" className="ghost" onClick={back}>{tr(lang, "رجوع", "Back")}</button> : <span />}
        {step === "summary" ? (
          <button type="button" className="razan-help-main" disabled={!can("summary")} onClick={() => void order()}>
            {busy ? (tr(lang, "عم نبعت…", "Sending…")) : tr(lang, "أكّدي الطلب ✓", "Confirm order ✓")}
          </button>
        ) : (
          <button type="button" className="razan-help-main" disabled={!can(step)} onClick={next}>{tr(lang, "التالي", "Next")}</button>
        )}
      </div>
      <button type="button" className="razan-help-call" onClick={() => { setCall(true); setErr(null); }}>
        {tr(lang, "📞 بدي حدا يحكيني", "📞 I'd rather someone called me")}
      </button>
    </div>
  );
}
