import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { finishVercelConnect, forwardAllowed, ownAddressOf, readConnectState } from "../../lib/shopLink.js";

/**
 * /v1/vercel — «وصّل Vercel» (lib/shopLink.ts). Vercel sends a store's owner back to one address, the
 * platform's own server (the Integration's Redirect URL), with a single-use code and the state the
 * store began with.
 *
 * GET /callback?code&state&teamId — the state's server is this one: the code traded for a token, the
 *     shop made, and the owner sent back to their setup (…/setup?shop=made|failed). Another copy's
 *     server: the owner sent on to that server's own /v1/vercel/callback, which does the same (an
 *     https server on Railway, or one the platform's owner named in VERCEL_FORWARD_HOSTS).
 *
 * Opened by the owner's browser, not by the admin: the state's one-time code is what lets it in.
 */
const r = Router();

/** A page in words when there's nowhere to send the owner (a link used already, or too old). */
function plain(res: import("express").Response, status: number, ar: string, en: string) {
  res.status(status).type("text/plain; charset=utf-8").setHeader("Cache-Control", "no-store");
  res.send(`${ar}\n${en}\n`);
}

r.get(
  "/callback",
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, unknown>;
    const state = readConnectState(q.state);
    const code = typeof q.code === "string" && /^[A-Za-z0-9_-]{8,200}$/.test(q.code) ? q.code : null;
    const teamId = typeof q.teamId === "string" && /^team_[A-Za-z0-9]{4,60}$/.test(q.teamId) ? q.teamId : undefined;
    if (!state || !code) return plain(res, 400, "هالرابط مش صالح: ارجع على إعداد المتجر واكبس «وصّل Vercel» كمان مرة.", "This link isn't valid: go back to the store's setup and press “Connect Vercel” again.");
    const own = ownAddressOf(req);
    if (!own || state.b !== own) {
      // Another copy's owner: on to their own server, with what Vercel gave and nothing else.
      if (!forwardAllowed(state.b)) return plain(res, 400, "هالرابط لسيرفر مش معروف.", "This link is for a server that isn't known.");
      const on = new URLSearchParams({ code, state: String(q.state) });
      if (teamId) on.set("teamId", teamId);
      if (typeof q.configurationId === "string" && /^icfg_[A-Za-z0-9]{4,60}$/.test(q.configurationId)) on.set("configurationId", q.configurationId);
      res.setHeader("Cache-Control", "no-store");
      return res.redirect(302, `${state.b}/v1/vercel/callback?${on.toString()}`);
    }
    const done = await finishVercelConnect({ code, teamId, state, api: own });
    if (!done) return plain(res, 410, "هالرابط انستعمل أو صار قديم: ارجع على إعداد المتجر واكبس «وصّل Vercel» كمان مرة.", "This link was used already or is too old: go back to the store's setup and press “Connect Vercel” again.");
    res.setHeader("Cache-Control", "no-store");
    res.redirect(302, done.to);
  }),
);

export default r;
