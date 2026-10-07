import { NextRequest, NextResponse } from "next/server";
import { RT_COOKIE, callApi, withoutSession } from "@/lib/accountCookie";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(RT_COOKIE)?.value;
  if (refreshToken) await callApi(req, "/customer/auth/logout", { refreshToken }).catch(() => null);
  return withoutSession(NextResponse.json({ ok: true }));
}
