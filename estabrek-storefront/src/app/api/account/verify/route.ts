import { NextRequest, NextResponse } from "next/server";
import { callApi, withSession } from "@/lib/accountCookie";

export const dynamic = "force-dynamic";

/** Email + 6-digit code → signed in (refresh token kept in an httpOnly cookie). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { status, data } = await callApi(req, "/customer/auth/verify", { email: body?.email, code: body?.code });
  if (status !== 200 || !data?.refreshToken) return NextResponse.json(data, { status: status === 200 ? 502 : status });
  const res = NextResponse.json({ accessToken: data.accessToken, user: data.user, isNew: data.isNew });
  return withSession(res, data.refreshToken, data.refreshExpiresInDays ?? 60);
}
