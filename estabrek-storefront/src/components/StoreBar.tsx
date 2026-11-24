"use client";

import Link from "next/link";
import { useOptionalAccount } from "@/store/account";
import { useCart } from "@/store/cart";
import { useLanguage } from "@/components/cinematic/Language";
import { tr } from "@/lib/words";

/**
 * The store's own corner over a header the owner designed in the editor (StoreDesignRegion): such a header takes
 * the place of the store's own, with its account and cart icons, so with accounts switched on a shopper had no way
 * to sign in or open an account, and on a computer no way to the cart (a phone has the bar at the bottom). It shows
 * only what the owner's header doesn't link to already: signing in and a new account (or her account, signed in)
 * while accounts are on, and the cart with what's in it.
 */
export function StoreBar({ account, cart }: { account: boolean; cart: boolean }) {
  const { language: lang } = useLanguage();
  // Null while accounts are off (providers.tsx MaybeAccounts): nothing to sign in to.
  const acc = useOptionalAccount();
  const { count } = useCart();
  const withAccount = account && acc !== null;
  if (!withAccount && !cart) return null;
  const first = acc?.user?.name?.trim().split(/\s+/)[0];
  return (
    <div className="store-bar" data-testid="store-bar" data-only-cart={withAccount ? undefined : ""}>
      <div className="store-bar-in">
        {withAccount ? (
          acc.status === "signedIn" ? (
            <Link href="/account" className="store-bar-item" data-testid="store-bar-account">
              <PersonIcon />
              <span>{first || tr(lang, "حسابي", "My account")}</span>
            </Link>
          ) : (
            <>
              <Link href="/account/login" className="store-bar-item" data-testid="store-bar-login">
                <PersonIcon />
                <span>{tr(lang, "تسجيل الدخول", "Sign in")}</span>
              </Link>
              <Link href="/account/register" className="store-bar-item store-bar-strong" data-testid="store-bar-register">
                {tr(lang, "حساب جديد", "New account")}
              </Link>
            </>
          )
        ) : null}
        {cart ? (
          <Link href="/cart" className="store-bar-item store-bar-cart" data-testid="store-bar-cart" aria-label={tr(lang, "السلة", "Cart")}>
            <BagIcon />
            <span>{tr(lang, "السلة", "Cart")}</span>
            {count > 0 ? <span className="store-bar-count" data-testid="store-bar-count">{count > 99 ? "99+" : count}</span> : null}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.6-4 4.5-6 8-6s6.4 2 8 6" />
  </svg>
);
const BagIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8h12l-1 12H7L6 8z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);
