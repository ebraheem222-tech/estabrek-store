"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiBaseClient } from "@/lib/apiClient";

/**
 * The shopper's account (optional). Signing in sends a 6-digit code by email;
 * the refresh token stays in an httpOnly cookie on this site (see
 * src/app/api/account/*), and the short access token only in memory here.
 */

export type Customer = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  preferredSize: string | null;
  favoriteColor: string | null;
  marketingOptIn: boolean;
};

type Status = "loading" | "guest" | "signedIn";

type AccountContextValue = {
  status: Status;
  user: Customer | null;
  /** Sends the code. Resolves with how long it lasts (and the code itself outside production). */
  sendCode: (email: string) => Promise<{ minutes: number; devCode?: string }>;
  verifyCode: (email: string, code: string) => Promise<Customer>;
  signOut: () => Promise<void>;
  /** Calls the store API as the signed-in shopper (adds the token, refreshes it once if needed). */
  api: <T = any>(path: string, init?: RequestInit) => Promise<T>;
  /** Headers for a request that should count as hers when she's signed in (e.g. placing an order). */
  authHeaders: () => Promise<Record<string, string>>;
  setUser: (u: Customer) => void;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export class AccountError extends Error {
  constructor(public code: string, public status: number, message?: string) {
    super(message ?? code);
  }
}

const FLAG = "estabrek_signed_in=1";
const hasSessionFlag = () => typeof document !== "undefined" && document.cookie.split(/;\s*/).includes(FLAG);

async function readJson(res: Response) {
  return res.json().catch(() => ({}));
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUserState] = useState<Customer | null>(null);
  const token = useRef<{ value: string; exp: number } | null>(null);
  const refreshing = useRef<Promise<string | null> | null>(null);

  const remember = (accessToken: string) => {
    // Renew a minute early.
    let exp = Date.now() + 14 * 60_000;
    try {
      const payload = JSON.parse(atob(accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload?.exp) exp = payload.exp * 1000 - 60_000;
    } catch {
      /* keep the default */
    }
    token.current = { value: accessToken, exp };
  };

  const signedOutLocally = useCallback(() => {
    token.current = null;
    setUserState(null);
    setStatus("guest");
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    if (refreshing.current) return refreshing.current;
    refreshing.current = (async () => {
      try {
        const res = await fetch("/api/account/refresh", { method: "POST", cache: "no-store" });
        const data = await readJson(res);
        if (!res.ok || !data?.accessToken) {
          if (res.status === 401 || res.status === 403) signedOutLocally();
          return null;
        }
        remember(data.accessToken);
        if (data.user) setUserState(data.user);
        setStatus("signedIn");
        return data.accessToken as string;
      } catch {
        return null;
      } finally {
        refreshing.current = null;
      }
    })();
    return refreshing.current;
  }, [signedOutLocally]);

  // Back on the site: restore the session if this device is signed in.
  useEffect(() => {
    if (hasSessionFlag()) void refresh().then((t) => !t && setStatus((s) => (s === "loading" ? "guest" : s)));
    else setStatus("guest");
  }, [refresh]);

  const currentToken = useCallback(async () => {
    if (token.current && token.current.exp > Date.now()) return token.current.value;
    return refresh();
  }, [refresh]);

  const api = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const send = async (t: string | null) =>
        fetch(`${apiBaseClient()}${path}`, {
          ...init,
          cache: "no-store",
          headers: { "Content-Type": "application/json", ...(init.headers ?? {}), ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        });
      let res = await send(await currentToken());
      if (res.status === 401) {
        const t = await refresh();
        if (!t) throw new AccountError("SIGNED_OUT", 401);
        res = await send(t);
      }
      const data = await readJson(res);
      if (!res.ok) {
        if (data?.error === "ACCOUNT_SUSPENDED") signedOutLocally();
        throw new AccountError(data?.error ?? "REQUEST_FAILED", res.status, data?.message);
      }
      return data as T;
    },
    [currentToken, refresh, signedOutLocally],
  );

  const sendCode = useCallback(async (email: string) => {
    const res = await fetch(`${apiBaseClient()}/customer/auth/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await readJson(res);
    if (!res.ok) throw new AccountError(data?.error ?? "REQUEST_FAILED", res.status, data?.message);
    return { minutes: Number(data.minutes) || 5, devCode: data.devCode as string | undefined };
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const res = await fetch("/api/account/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await readJson(res);
    if (!res.ok || !data?.accessToken) throw new AccountError(data?.error ?? "REQUEST_FAILED", res.status, data?.message);
    remember(data.accessToken);
    setUserState(data.user);
    setStatus("signedIn");
    return data.user as Customer;
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/account/logout", { method: "POST" }).catch(() => null);
    signedOutLocally();
  }, [signedOutLocally]);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (status !== "signedIn") return {};
    const t = await currentToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [status, currentToken]);

  const value = useMemo<AccountContextValue>(
    () => ({ status, user, sendCode, verifyCode, signOut, api, authHeaders, setUser: setUserState }),
    [status, user, sendCode, verifyCode, signOut, api, authHeaders],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside AccountProvider");
  return ctx;
}

/** Same as useAccount, but null outside the provider (shared components). */
export function useOptionalAccount() {
  return useContext(AccountContext);
}

/** Plain-Arabic text for the account errors. */
export function accountErrorText(e: unknown): string {
  const code = e instanceof AccountError ? e.code : "";
  switch (code) {
    case "WRONG_CODE":
      return "الكود مش صحيح. تأكدي منه وجرّبي كمان مرة.";
    case "CODE_EXPIRED":
      return "الكود انتهى. اطلبي كود جديد.";
    case "TOO_MANY_ATTEMPTS":
      return "محاولات كثيرة. اطلبي كود جديد.";
    case "TOO_MANY_CODES":
    case "RATE_LIMIT":
      return "طلبتِ أكواد كثيرة. استني كم دقيقة وجرّبي.";
    case "ACCOUNT_SUSPENDED":
      return "هذا الحساب موقوف. تواصلي معنا.";
    case "VALIDATION_ERROR":
      return "في معلومة مش مكتوبة صح. راجعيها.";
    case "SIGNED_OUT":
      return "انتهت الجلسة. سجّلي دخول من جديد.";
    default:
      return "صار خطأ. جرّبي كمان مرة.";
  }
}
