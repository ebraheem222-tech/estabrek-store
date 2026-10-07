"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import { useAccount, accountErrorText, type Customer } from "@/store/account";
import { selectStorefrontColor } from "@/lib/storefrontColor";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";

/**
 * حسابي: sign in with a code sent by email (no password), then her orders,
 * addresses and details. Favourites have their own page and sync on their own.
 */
export function RoseAccount() {
  return (
    <Suspense fallback={null}>
      <AccountInner />
    </Suspense>
  );
}

function AccountInner() {
  const { status } = useAccount();
  if (status === "loading") {
    return (
      <section className="rose-account rose-account-loading" aria-busy="true">
        <span className="rose-cart-empty-icon"><Icon name="user" /></span>
      </section>
    );
  }
  return status === "signedIn" ? <SignedIn /> : <SignIn />;
}

/* ============================== Sign in ============================== */

function safeNext(v: string | null) {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
}

function SignIn() {
  const ar = useLanguage().language === "ar";
  const { sendCode, verifyCode } = useAccount();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [minutes, setMinutes] = useState(5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErr(ar ? "اكتبي إيميل صحيح." : "Enter a valid email.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const out = await sendCode(email.trim());
      setMinutes(out.minutes);
      setDevCode(out.devCode ?? null);
      setStep("code");
      setCode("");
      setResendIn(30);
    } catch (x) {
      setErr(accountErrorText(x));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setErr(ar ? "الكود 6 أرقام." : "The code has 6 digits.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const user = await verifyCode(email.trim(), code.trim());
      // Her favourite colour dresses the site, unless she already picked one on this device.
      try {
        if (user.favoriteColor && !window.localStorage.getItem("estabrek_theme_color")) selectStorefrontColor(user.favoriteColor);
      } catch {
        /* storage blocked */
      }
      if (next) router.push(next);
    } catch (x) {
      setErr(accountErrorText(x));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rose-account rose-account-signin" data-testid="account-signin">
      <span className="rose-cart-empty-icon"><Icon name="user" /></span>
      <span className="atelier-eyebrow">{ar ? "حسابي" : "MY ACCOUNT"}</span>
      <h1>{ar ? "أهلاً فيكِ." : "Welcome."}</h1>
      <p>
        {ar
          ? "بدون كلمة مرور: بنبعتلكِ كود على إيميلكِ. بالحساب بتلاقي طلباتكِ ومفضّلتكِ على كل أجهزتكِ، وعنوانكِ جاهز للطلب الجاي."
          : "No password: we email you a code. Your orders and favourites follow you on every device, and your address is ready next time."}
      </p>

      {step === "email" ? (
        <form className="rose-cart-form rose-account-form" onSubmit={send} noValidate>
          <label>
            <span>{ar ? "الإيميل" : "Email"}</span>
            <input type="email" inputMode="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required autoFocus />
          </label>
          {err ? <p className="rose-form-error" role="alert">{err}</p> : null}
          <button type="submit" className="atelier-button button-dark" disabled={busy}>
            {busy ? (ar ? "لحظة…" : "One moment…") : ar ? "ابعتيلي الكود" : "Send me a code"}
            <Icon name="arrow" />
          </button>
        </form>
      ) : (
        <form className="rose-cart-form rose-account-form" onSubmit={verify} noValidate>
          <p className="rose-account-sent">
            {ar ? (
              <>بعتنا كود من 6 أرقام لـ <b dir="ltr">{email.trim()}</b>. صالح {minutes} دقائق. (إذا ما وصل، شوفي الـ Spam.)</>
            ) : (
              <>We sent a 6-digit code to <b>{email.trim()}</b>. It lasts {minutes} minutes (check spam if it isn't there).</>
            )}
          </p>
          {devCode ? <p className="rose-cart-note">Dev code: <b dir="ltr">{devCode}</b></p> : null}
          <label>
            <span>{ar ? "الكود" : "Code"}</span>
            <input
              className="rose-account-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              autoFocus
            />
          </label>
          {err ? <p className="rose-form-error" role="alert">{err}</p> : null}
          <button type="submit" className="atelier-button button-dark" disabled={busy}>
            {busy ? (ar ? "لحظة…" : "One moment…") : ar ? "دخول" : "Sign in"}
            <Icon name="arrow" />
          </button>
          <div className="rose-account-links">
            <button type="button" onClick={() => void send()} disabled={resendIn > 0 || busy}>
              {resendIn > 0 ? (ar ? `كود جديد بعد ${resendIn} ثانية` : `New code in ${resendIn}s`) : ar ? "ابعتي كود جديد" : "Send a new code"}
            </button>
            <button type="button" onClick={() => { setStep("email"); setErr(null); }}>
              {ar ? "تغيير الإيميل" : "Change email"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/* ============================== Signed in ============================== */

type Tab = "orders" | "addresses" | "details";

function SignedIn() {
  const ar = useLanguage().language === "ar";
  const { user, signOut } = useAccount();
  const [tab, setTab] = useState<Tab>("orders");
  const first = user?.name?.trim().split(/\s+/)[0];

  return (
    <section className="rose-account" data-testid="account-home">
      <header className="rose-cart-head">
        <span className="atelier-eyebrow">{ar ? "حسابي" : "MY ACCOUNT"}</span>
        <h1>
          {first ? (ar ? `أهلاً ${first}.` : `Hello ${first}.`) : ar ? "أهلاً فيكِ." : "Hello."}
          <span dir="ltr">{user?.email}</span>
        </h1>
        <button type="button" className="rose-cart-clear" onClick={() => void signOut()}>
          {ar ? "تسجيل الخروج" : "Sign out"}
        </button>
      </header>

      <nav className="rose-account-tabs" role="tablist" aria-label={ar ? "أقسام الحساب" : "Account sections"}>
        {(
          [
            ["orders", ar ? "طلباتي" : "Orders"],
            ["addresses", ar ? "عناويني" : "Addresses"],
            ["details", ar ? "معلوماتي" : "Details"],
          ] as const
        ).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
        <Link href="/wishlist" className="rose-account-tab-link">
          {ar ? "المفضلة" : "Favourites"}
          <Icon name="heart" />
        </Link>
      </nav>

      {tab === "orders" ? <Orders /> : tab === "addresses" ? <Addresses /> : <Details />}
    </section>
  );
}

/* ---------- orders ---------- */

type Order = {
  id: string;
  status: string;
  createdAt: string;
  total: number | null;
  currencyCode: string;
  paymentStatus: string | null;
  items: Array<{ id: string; productTitle: string; productSlug: string | null; colorName: string | null; sizeName: string | null; quantity: number; imageUrl: string | null }>;
};

const STATUS_AR: Record<string, string> = {
  NEW: "وصلنا طلبكِ",
  CONTACTED: "تواصلنا معكِ",
  ACCEPTED: "قيد التجهيز",
  SHIPPED: "بالطريق إليكِ",
  CLOSED: "وصل",
  REJECTED: "ما تمّ",
  CANCELED: "انلغى",
  REFUNDED: "رجع المبلغ",
};
const STATUS_EN: Record<string, string> = {
  NEW: "Received",
  CONTACTED: "We contacted you",
  ACCEPTED: "Being prepared",
  SHIPPED: "On its way",
  CLOSED: "Delivered",
  REJECTED: "Not completed",
  CANCELED: "Cancelled",
  REFUNDED: "Refunded",
};

function money(v: number | null, currency: string) {
  if (v == null) return "";
  try {
    return new Intl.NumberFormat("ar", { style: "currency", currency: currency || "ILS" }).format(v);
  } catch {
    return `₪${v}`;
  }
}

function useLoad<T>(path: string) {
  const { api } = useAccount();
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => {
    setErr(null);
    api<T>(path)
      .then(setData)
      .catch((e) => setErr(accountErrorText(e)));
  }, [api, path]);
  useEffect(load, [load]);
  return { data, err, reload: load, setData };
}

function Orders() {
  const ar = useLanguage().language === "ar";
  const { data, err } = useLoad<{ orders: Order[] }>("/customer/me/orders");
  if (err) return <p className="rose-form-error" role="alert">{err}</p>;
  if (!data) return <p className="rose-account-muted">{ar ? "جاري التحميل…" : "Loading…"}</p>;
  if (!data.orders.length) {
    return (
      <div className="rose-account-empty">
        <p>{ar ? "ما في طلبات بحسابكِ بعد. الطلبات اللي بتعمليها وأنتِ داخلة بتبيّن هون." : "No orders yet. Orders you place while signed in show here."}</p>
        <Link href="/shop" className="atelier-button button-dark">{ar ? "اكتشفي المجموعة" : "Explore the collection"}<Icon name="arrow" /></Link>
      </div>
    );
  }
  const date = (iso: string) => new Date(iso).toLocaleDateString(ar ? "ar" : "en", { day: "numeric", month: "long", year: "numeric" });
  return (
    <ul className="rose-account-orders" data-testid="account-orders">
      {data.orders.map((o) => (
        <li key={o.id} className="rose-account-order">
          <div className="rose-account-order-head">
            <span className={`rose-account-status status-${o.status.toLowerCase()}`}>{(ar ? STATUS_AR : STATUS_EN)[o.status] ?? o.status}</span>
            <span>{date(o.createdAt)}</span>
            <b>{money(o.total, o.currencyCode)}</b>
          </div>
          <ul className="rose-account-order-items">
            {o.items.map((i) => (
              <li key={i.id}>
                {i.imageUrl ? <img src={i.imageUrl} alt="" loading="lazy" /> : <span className="rose-image-placeholder">استبرق</span>}
                <span>
                  {i.productSlug ? <Link href={`/p/${encodeURIComponent(i.productSlug)}`}>{i.productTitle}</Link> : i.productTitle}
                  <small>{[i.colorName, i.sizeName, i.quantity > 1 ? `× ${i.quantity}` : null].filter(Boolean).join(" · ")}</small>
                </span>
              </li>
            ))}
          </ul>
          <small className="rose-account-muted" dir="ltr">#{o.id.slice(-8)}</small>
        </li>
      ))}
    </ul>
  );
}

/* ---------- addresses ---------- */

type Address = { id: string; label: string | null; fullName: string; phone: string; city: string; address: string; notes: string | null; isDefault: boolean };
const EMPTY = { label: "", fullName: "", phone: "", city: "", address: "", notes: "", isDefault: false };

function Addresses() {
  const ar = useLanguage().language === "ar";
  const { api, user } = useAccount();
  const { data, err, reload } = useLoad<{ addresses: Address[] }>("/customer/me/addresses");
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setFormErr(null);
    try {
      await api("/customer/me/addresses", {
        method: "POST",
        body: JSON.stringify({ ...form, label: form.label || null, notes: form.notes || null }),
      });
      setForm(null);
      reload();
    } catch (x) {
      setFormErr(accountErrorText(x));
    } finally {
      setBusy(false);
    }
  };
  const act = async (path: string, init: RequestInit) => {
    try {
      await api(path, init);
      reload();
    } catch (x) {
      setFormErr(accountErrorText(x));
    }
  };

  if (err) return <p className="rose-form-error" role="alert">{err}</p>;
  if (!data) return <p className="rose-account-muted">{ar ? "جاري التحميل…" : "Loading…"}</p>;
  return (
    <div className="rose-account-addresses" data-testid="account-addresses">
      {data.addresses.length ? (
        <ul className="rose-account-cards">
          {data.addresses.map((a) => (
            <li key={a.id} className="rose-account-card">
              <b>{a.label || a.fullName}{a.isDefault ? <em>{ar ? "الأساسي" : "Default"}</em> : null}</b>
              <span>{a.fullName} · <span dir="ltr">{a.phone}</span></span>
              <span>{a.city}، {a.address}</span>
              {a.notes ? <small>{a.notes}</small> : null}
              <div className="rose-account-links">
                {!a.isDefault ? (
                  <button type="button" onClick={() => act(`/customer/me/addresses/${a.id}`, { method: "PATCH", body: JSON.stringify({ isDefault: true }) })}>
                    {ar ? "خليه الأساسي" : "Make default"}
                  </button>
                ) : null}
                <button type="button" onClick={() => act(`/customer/me/addresses/${a.id}`, { method: "DELETE" })}>{ar ? "حذف" : "Delete"}</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rose-account-muted">{ar ? "ما في عناوين. ضيفي عنوانكِ وبيتعبّى لحاله بالسلة." : "No addresses yet. Add one and it fills in at checkout."}</p>
      )}

      {form ? (
        <form className="rose-cart-form rose-account-form" onSubmit={save} noValidate>
          <h3>{ar ? "عنوان جديد" : "New address"}</h3>
          <label><span>{ar ? "اسم للعنوان (اختياري)" : "Label (optional)"}</span><input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={ar ? "البيت، الشغل…" : "Home, work…"} /></label>
          <label><span>{ar ? "الاسم" : "Name"} *</span><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoComplete="name" /></label>
          <label><span>{ar ? "رقم الهاتف" : "Phone"} *</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" autoComplete="tel" dir="ltr" /></label>
          <label><span>{ar ? "المدينة" : "City"} *</span><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} autoComplete="address-level2" /></label>
          <label><span>{ar ? "العنوان" : "Address"} *</span><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} autoComplete="street-address" placeholder={ar ? "الحي، الشارع، رقم البيت" : "Area, street, house"} /></label>
          <label><span>{ar ? "ملاحظات للتوصيل" : "Delivery notes"}</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <label className="rose-account-check"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /><span>{ar ? "العنوان الأساسي" : "Default address"}</span></label>
          {formErr ? <p className="rose-form-error" role="alert">{formErr}</p> : null}
          <div className="rose-account-actions">
            <button type="submit" className="atelier-button button-dark" disabled={busy}>{ar ? "حفظ العنوان" : "Save address"}</button>
            <button type="button" className="rose-cart-clear" onClick={() => setForm(null)}>{ar ? "إلغاء" : "Cancel"}</button>
          </div>
        </form>
      ) : (
        <button type="button" className="atelier-button" onClick={() => setForm({ ...EMPTY, fullName: user?.name ?? "", phone: user?.phone ?? "" })}>
          {ar ? "إضافة عنوان" : "Add an address"}
        </button>
      )}
      {formErr && !form ? <p className="rose-form-error" role="alert">{formErr}</p> : null}
    </div>
  );
}

/* ---------- details ---------- */

function Details() {
  const ar = useLanguage().language === "ar";
  const { user, api, setUser, signOut } = useAccount();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    preferredSize: user?.preferredSize ?? "",
    favoriteColor: user?.favoriteColor ?? "",
    marketingOptIn: user?.marketingOptIn ?? false,
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const siteColor = (() => {
    try {
      return typeof window !== "undefined" ? window.localStorage.getItem("estabrek_theme_color") : null;
    } catch {
      return null;
    }
  })();

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const out = await api<Customer>("/customer/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          preferredSize: form.preferredSize.trim() || null,
          favoriteColor: /^#[0-9a-f]{6}$/i.test(form.favoriteColor) ? form.favoriteColor : null,
          marketingOptIn: form.marketingOptIn,
        }),
      });
      setUser(out);
      setMsg(ar ? "انحفظت معلوماتكِ." : "Saved.");
    } catch (x) {
      setErr(accountErrorText(x));
    } finally {
      setBusy(false);
    }
  };

  const everywhere = async () => {
    try {
      await api("/customer/me/logout-everywhere", { method: "POST" });
    } finally {
      await signOut();
    }
  };

  return (
    <form className="rose-cart-form rose-account-form rose-account-details" onSubmit={save} noValidate data-testid="account-details">
      <label><span>{ar ? "الاسم" : "Name"}</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></label>
      <label><span>{ar ? "رقم الهاتف" : "Phone"}</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" autoComplete="tel" dir="ltr" /></label>
      <label><span>{ar ? "مقاسي" : "My size"}</span><input value={form.preferredSize} onChange={(e) => setForm({ ...form, preferredSize: e.target.value })} placeholder={ar ? "مثال: M أو 38" : "e.g. M or 38"} maxLength={20} /></label>
      <div className="rose-account-color">
        <span>{ar ? "لوني المفضّل (الموقع بيتلوّن فيه لما تفوتي)" : "My colour (the site wears it when you sign in)"}</span>
        <div>
          {form.favoriteColor ? <i style={{ background: form.favoriteColor }} aria-hidden /> : null}
          {siteColor && siteColor !== form.favoriteColor ? (
            <button type="button" onClick={() => setForm({ ...form, favoriteColor: siteColor })}>
              <i style={{ background: siteColor }} aria-hidden />
              {ar ? "احفظي لون الموقع الحالي" : "Keep the current site colour"}
            </button>
          ) : null}
          {form.favoriteColor ? (
            <button type="button" onClick={() => setForm({ ...form, favoriteColor: "" })}>{ar ? "بدون" : "None"}</button>
          ) : null}
        </div>
      </div>
      <label className="rose-account-check">
        <input type="checkbox" checked={form.marketingOptIn} onChange={(e) => setForm({ ...form, marketingOptIn: e.target.checked })} />
        <span>{ar ? "ابعتولي جديد المجموعات والعروض على الإيميل" : "Email me new collections and offers"}</span>
      </label>
      {err ? <p className="rose-form-error" role="alert">{err}</p> : null}
      {msg ? <p className="rose-cart-note" role="status">{msg}</p> : null}
      <div className="rose-account-actions">
        <button type="submit" className="atelier-button button-dark" disabled={busy}>{ar ? "حفظ" : "Save"}</button>
        <button type="button" className="rose-cart-clear" onClick={() => void everywhere()}>{ar ? "الخروج من كل الأجهزة" : "Sign out everywhere"}</button>
      </div>
    </form>
  );
}
