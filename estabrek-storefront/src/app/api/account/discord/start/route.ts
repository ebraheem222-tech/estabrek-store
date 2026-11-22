import { NextRequest, NextResponse } from "next/server";
import { callApi } from "@/lib/accountCookie";
import { DISCORD_COOKIE, shopOrigin, shopPath, stateIn, withWord, wordOfState } from "@/lib/socialSignIn";

export const dynamic = "force-dynamic";

/** «ادخل بحساب Discord»: the store's API signs where to come back to, and the shopper goes to Discord. */
export async function GET(req: NextRequest) {
  const origin = shopOrigin(req);
  const back = shopPath(req.nextUrl.searchParams.get("back"));
  const { status, data } = await callApi(req, "/customer/auth/discord/start", { redirectUri: `${origin}/api/account/discord/callback`, back });
  if (status !== 200 || typeof data?.url !== "string" || !data.url.startsWith("https://discord.com/oauth2/authorize?")) {
    return NextResponse.redirect(`${origin}${withWord("/account", "signin", typeof data?.error === "string" ? data.error : "DISCORD_OFF")}`, 303);
  }
  const word = wordOfState(stateIn(data.url));
  if (!word) return NextResponse.redirect(`${origin}${withWord("/account", "signin", "SOCIAL_STATE")}`, 303);
  const res = NextResponse.redirect(data.url, 303);
  // Only this browser can finish: a link someone else began never signs anyone in here.
  res.cookies.set(DISCORD_COOKIE, word, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/account/discord", maxAge: 600 });
  return res;
}
