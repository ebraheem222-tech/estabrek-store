import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { optionalCustomer } from "../../middleware/customerAuth.js";
import { deviceOf, dropPushSubscription, pushKeys, pushOpened, pushSettings, savePushSubscription } from "../../lib/push.js";

/**
 * /v1/push — the shop's notifications, on the shopper's side (lib/push.ts). Answers 404 PUSH_OFF
 * while the owner hasn't switched them on (the app, and its notifications).
 *
 * GET  /push/key          → { key }: the shop's public key, for the browser's PushManager.subscribe
 * POST /push/subscribe    { endpoint, keys: { p256dh, auth }, lang } (with a shopper's token: tied to them)
 * POST /push/unsubscribe  { endpoint }: always answered, on or off (saying no is never refused)
 * POST /push/opened       { id }: a shopper tapped a notification (the worker says so; counted for the admin)
 */
const r = Router();

const off = (res: import("express").Response) => res.status(404).json({ error: "PUSH_OFF", message: "Notifications are switched off" });

r.get(
  "/key",
  asyncHandler(async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!(await pushSettings()).on) return off(res);
    res.json({ key: (await pushKeys()).publicKey });
  }),
);

const Subscribe = z.object({
  endpoint: z.string().trim().min(10).max(1000),
  keys: z.object({ p256dh: z.string().min(80).max(120), auth: z.string().min(16).max(40) }),
  lang: z.enum(["ar", "en", "he"]).optional(),
});

r.post(
  "/subscribe",
  optionalCustomer,
  validate({ body: Subscribe }),
  asyncHandler(async (req, res) => {
    if (!(await pushSettings()).on) return off(res);
    const body = req.body as z.infer<typeof Subscribe>;
    try {
      await savePushSubscription({ endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth, lang: body.lang, device: deviceOf(req.get("user-agent")) }, req.customer?.id ?? null);
    } catch (e) {
      const code = (e as Error).message;
      if (code === "PUSH_ENDPOINT" || code === "PUSH_KEYS") return res.status(400).json({ error: code, message: code === "PUSH_ENDPOINT" ? "Not a push service's address" : "Not a browser's keys" });
      throw e;
    }
    res.status(201).json({ ok: true, signedIn: Boolean(req.customer?.id) });
  }),
);

r.post(
  "/unsubscribe",
  validate({ body: z.object({ endpoint: z.string().trim().min(10).max(1000) }) }),
  asyncHandler(async (req, res) => {
    res.json({ ok: true, removed: await dropPushSubscription(req.body.endpoint) });
  }),
);

r.post(
  "/opened",
  validate({ body: z.object({ id: z.string().min(10).max(40).regex(/^[a-z0-9]+$/) }) }),
  asyncHandler(async (req, res) => {
    res.json({ ok: true, counted: await pushOpened(req.body.id) });
  }),
);

export default r;
