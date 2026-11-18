import { NextRequest, NextResponse } from "next/server";
import { callApi, withSession } from "@/lib/accountCookie";

export const dynamic = "force-dynamic";

/** Google's sign-in token → signed in (the server checks it; the refresh token is kept in an httpOnly cookie). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const credential = typeof body?.credential === "string" ? body.credential.slice(0, 4096) : "";
  const { status, data } = await callApi(req, "/customer/auth/google", { credential });
  if (status !== 200 || !data?.refreshToken) return NextResponse.json(data, { status: status === 200 ? 502 : status });
  const res = NextResponse.json({ accessToken: data.accessToken, user: data.user, isNew: data.isNew });
  return withSession(res, data.refreshToken, data.refreshExpiresInDays ?? 60);
}
