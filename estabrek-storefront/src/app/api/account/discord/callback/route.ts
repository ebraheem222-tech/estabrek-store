import { NextRequest, NextResponse } from "next/server";
import { callApi, withSession } from "@/lib/accountCookie";
import { DISCORD_COOKIE, shopOrigin, shopPath, withWord, wordOfState } from "@/lib/socialSignIn";

export const dynamic = "force-dynamic";

/** Discord sent the shopper back: the store's API trades the code and signs them in (the refresh token in an httpOnly cookie). */
export async function GET(req: NextRequest) {
  const origin = shopOrigin(req);
  const q = req.nextUrl.searchParams;
  const code = q.get("code") ?? "";
  const state = q.get("state") ?? "";
  // They said no on Discord's page (or came here by hand).
  if (!code || !state) return NextResponse.redirect(`${origin}${withWord("/account", "signin", q.get("error") ? "DISCORD_DECLINED" : "SOCIAL_STATE")}`, 303);
  const fail = (why: string) => {
    const res = NextResponse.redirect(`${origin}${withWord("/account", "signin", why)}`, 303);
    res.cookies.set(DISCORD_COOKIE, "", { path: "/api/account/discord", maxAge: 0 });
    return res;
  };
  // Begun in this browser (the word its start left), or not at all.
  const word = wordOfState(state);
  if (!word || req.cookies.get(DISCORD_COOKIE)?.value !== word) return fail("SOCIAL_STATE");
  const { status, data } = await callApi(req, "/customer/auth/discord", { code: code.slice(0, 200), state: state.slice(0, 2000) });
  if (status !== 200 || !data?.refreshToken) return fail(typeof data?.error === "string" ? data.error : "DISCORD_REFUSED");
  const res = NextResponse.redirect(`${origin}${shopPath(data.back)}`, 303);
  res.cookies.set(DISCORD_COOKIE, "", { path: "/api/account/discord", maxAge: 0 });
  return withSession(res, data.refreshToken, data.refreshExpiresInDays ?? 60);
}
