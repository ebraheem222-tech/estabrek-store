import { NextRequest, NextResponse } from "next/server";
import { callApi } from "@/lib/accountCookie";
import { backOfState, shopOrigin, withWord } from "@/lib/socialSignIn";

export const dynamic = "force-dynamic";

/** Steam sent the shopper back: the store's API asks Steam whether its answer is real, then keeps their SteamID. */
export async function GET(req: NextRequest) {
  const origin = shopOrigin(req);
  const q = req.nextUrl.searchParams;
  const state = q.get("state") ?? "";
  const back = backOfState(state);
  const params: Record<string, string> = {};
  for (const [k, v] of q) if (k.startsWith("openid.") && Object.keys(params).length < 20) params[k.slice(0, 80)] = v.slice(0, 2000);
  // They went back without signing in on Steam.
  if (params["openid.mode"] === "cancel") return NextResponse.redirect(`${origin}${back}`, 303);
  if (!state || params["openid.mode"] !== "id_res") return NextResponse.redirect(`${origin}${withWord(back, "steam", "STEAM_REFUSED")}`, 303);
  const { status, data } = await callApi(req, "/customer/auth/steam", { params, state: state.slice(0, 2000) });
  const word = status === 200 ? "linked" : typeof data?.error === "string" ? data.error : "STEAM_REFUSED";
  return NextResponse.redirect(`${origin}${withWord(back, "steam", word)}`, 303);
}
