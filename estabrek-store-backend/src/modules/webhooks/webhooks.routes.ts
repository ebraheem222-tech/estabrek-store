import { Router } from "express";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import { OutboxStatusUpdateBody } from "./webhooks.schemas.js";
import { updateOutboxFromWebhook } from "./webhooks.service.js";
import { verifyWebhookToken } from "../../config/webhooks.js";

const r = Router();

/**
 * Generic webhook to update OutboxMessage status by ID.
 * Usage example for a provider callback:
 *   POST /v1/webhooks/outbox/OUTBOX_ID?token=YOUR_WEBHOOK_TOKEN
 *   {
 *     "status":"SENT",
 *     "provider":"sendgrid",
 *     "providerMessageId":"abc123",
 *     "payload": { ...raw provider body... }
 *   }
 */
r.post(
  "/outbox/:id",
  validate({ body: OutboxStatusUpdateBody }),
  asyncHandler(async (req, res) => {
    if (!verifyWebhookToken(req)) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const out = await updateOutboxFromWebhook(req.params.id, req.body);
    res.json(out);
  })
);

/**
 * Optional convenience: same as above but outboxId comes in the body.
 *   POST /v1/webhooks/outbox?token=...
 *   { "outboxId":"...", "status":"FAILED", "error":"...", "payload":{...} }
 */
r.post(
  "/outbox",
  asyncHandler(async (req, res) => {
    if (!verifyWebhookToken(req)) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const { outboxId, ...rest } = req.body ?? {};
    if (!outboxId) return res.status(400).json({ error: "MISSING_OUTBOX_ID" });

    // reuse schema validation
    const parsed = OutboxStatusUpdateBody.parse(rest);
    const out = await updateOutboxFromWebhook(outboxId, parsed);
    res.json(out);
  })
);

export default r;
