import { Router, type Request, type Response } from "express";
import { asyncHandler } from "../../utils/async.js";
import { hit } from "../../lib/hitLimit.js";
import { claimLinkCode, deliveries, linkHello, reportDeliveries, siteOfKey, whitelistAnswer } from "../../lib/gameLink.js";
import { addScores } from "../../lib/ranking.js";

/**
 * /v1/link — «إستبرق لينك» on a game server talking to its site (lib/gameLink.ts), with the key its download was
 * stamped with (Authorization: Bearer eslk_…). A key that isn't a switched-on site's answers 401.
 *
 * POST /link/hello      { game, version, players, online: [{ id, name }], lang } — every minute: { whitelist } (is the
 *                        site's whitelist on); those online get a minute on its play time board (lib/ranking.ts)
 * POST /link/whitelist  { ids: { license?, discord?, steam?, uuid? }, name, lang } — { allowed, message? }
 * POST /link/claim      { code, game, account: { id, name }, lang } — /link 482913 typed in the game: { ok, message }
 * POST /link/deliveries — a Minecraft server's purchases to give now: { items: [{ id, command }] } (each handed over once)
 * POST /link/deliveries/report { items: [{ id, ok, error? }] } — what it gave: { given, failed }
 * POST /link/scores     { items: [{ board, player: { id, name }, value }] } — the server's numbers for its rankings: { kept, skipped }
 */
const r = Router();
const MINUTE = 60_000;
const PER_MINUTE = 240;

async function siteOf(req: Request, res: Response): Promise<string | null> {
  const auth = req.get("authorization") ?? "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const featureId = await siteOfKey(key);
  if (!featureId) {
    res.status(401).json({ error: "LINK_KEY", message: "This key isn't a site's (download the link again from the site's panel)" });
    return null;
  }
  const { count } = await hit(`link:${featureId}`, MINUTE);
  if (count > PER_MINUTE) {
    res.status(429).json({ error: "RATE_LIMIT", message: "Too many calls this minute" });
    return null;
  }
  return featureId;
}
const body = (req: Request) => (req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {});

r.post(
  "/hello",
  asyncHandler(async (req, res) => {
    const featureId = await siteOf(req, res);
    if (!featureId) return;
    res.json(await linkHello(featureId, body(req)));
  }),
);
r.post(
  "/whitelist",
  asyncHandler(async (req, res) => {
    const featureId = await siteOf(req, res);
    if (!featureId) return;
    res.json(await whitelistAnswer(featureId, body(req)));
  }),
);
r.post(
  "/claim",
  asyncHandler(async (req, res) => {
    const featureId = await siteOf(req, res);
    if (!featureId) return;
    res.json(await claimLinkCode(body(req)));
  }),
);

r.post(
  "/scores",
  asyncHandler(async (req, res) => {
    const featureId = await siteOf(req, res);
    if (!featureId) return;
    res.json(await addScores(featureId, body(req).items));
  }),
);
r.post(
  "/deliveries",
  asyncHandler(async (req, res) => {
    const featureId = await siteOf(req, res);
    if (!featureId) return;
    res.json(await deliveries(featureId));
  }),
);
r.post(
  "/deliveries/report",
  asyncHandler(async (req, res) => {
    const featureId = await siteOf(req, res);
    if (!featureId) return;
    res.json(await reportDeliveries(featureId, body(req).items));
  }),
);

export default r;
