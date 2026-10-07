import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { baseUrl } from "@/lib/serverBaseUrl";

/**
 * Shopper sign-in lives in two cookies on the storefront's own domain:
 *  - estabrek_rt: the refresh token, httpOnly (page scripts can never read it);
 *  - estabrek_signed_in=1: readable flag so the page knows to ask for a session.
 * The short access token is only kept in memory by the page.
 */
export const RT_COOKIE = "estabrek_rt";
export const FLAG_COOKIE = "estabrek_signed_in";

const secure = process.env.NODE_ENV === "production";

export function withSession(res: NextResponse, refreshToken: string, days: number) {
  const maxAge = Math.max(1, Math.round(days)) * 86_400;
  res.cookies.set(RT_COOKIE, refreshToken, { httpOnly: true, secure, sameSite: "lax", path: "/api/account", maxAge });
  res.cookies.set(FLAG_COOKIE, "1", { httpOnly: false, secure, sameSite: "lax", path: "/", maxAge });
  return res;
}

export function withoutSession(res: NextResponse) {
  res.cookies.set(RT_COOKIE, "", { httpOnly: true, secure, sameSite: "lax", path: "/api/account", maxAge: 0 });
  res.cookies.set(FLAG_COOKIE, "", { httpOnly: false, secure, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

/** Calls the store API from the storefront server, passing on the shopper's IP (for sign-in limits). */
export async function callApi(req: NextRequest, path: string, body: unknown) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(ip ? { "X-Forwarded-For": ip } : {}),
      "User-Agent": req.headers.get("user-agent") ?? "estabrek-storefront",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data: data as any };
}
