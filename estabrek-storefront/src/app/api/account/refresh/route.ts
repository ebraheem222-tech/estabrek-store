import { NextRequest, NextResponse } from "next/server";
import { RT_COOKIE, callApi, withSession, withoutSession } from "@/lib/accountCookie";

export const dynamic = "force-dynamic";

/** A fresh access token from the httpOnly refresh cookie (rotated each time). */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(RT_COOKIE)?.value;
  if (!refreshToken) return withoutSession(NextResponse.json({ error: "SIGNED_OUT" }, { status: 401 }));
  const { status, data } = await callApi(req, "/customer/auth/refresh", { refreshToken });
  if (status !== 200 || !data?.refreshToken) {
    // Expired, signed out elsewhere, or suspended: forget this device's session.
    const res = NextResponse.json({ error: data?.error ?? "SIGNED_OUT" }, { status: status === 200 ? 502 : status });
    return status === 401 || status === 403 ? withoutSession(res) : res;
  }
  const res = NextResponse.json({ accessToken: data.accessToken, user: data.user });
  return withSession(res, data.refreshToken, data.refreshExpiresInDays ?? 60);
}
