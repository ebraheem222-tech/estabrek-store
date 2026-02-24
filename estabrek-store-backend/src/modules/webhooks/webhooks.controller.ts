// src/modules/webhooks/webhooks.controller.ts
import express, { Router } from "express";
import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../utils/async.js";
import { ORDER_REQUEST_STATUSES, applyOrderStatusTransition } from "../orders/orderStatusWorkflow.js";

const r = Router();
const ORDER_STATUS_SET = new Set<string>(ORDER_REQUEST_STATUSES);

/** Use a raw parser only for this route (preferred for HMAC). */
const rawJson = express.raw({ type: "application/json" });

function timingSafeEq(a: string, b: string) {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function verifySignature(req: express.Request): boolean {
  const tokenFromQuery = (req.query.token as string | undefined)?.trim();
  if (tokenFromQuery && tokenFromQuery === env.WEBHOOK_TOKEN) return true;

  const sig = (req.headers["x-webhook-signature"] as string | undefined)?.trim();
  if (!sig) return false;

  // Prefer raw body captured by raw middleware or a prior verify hook.
  const raw: Buffer | string =
    (req as any).rawBody ??
    (Buffer.isBuffer(req.body) ? (req.body as Buffer) : JSON.stringify(req.body ?? {}));

  const h = crypto.createHmac("sha256", env.WEBHOOK_TOKEN).update(raw).digest("hex");
  return timingSafeEq(h, sig);
}

/**
 * Generic webhook endpoint
 * POST /v1/webhooks/incoming?token=... (or header x-webhook-signature)
 *
 * Body shape:
 * {
 *   "type": "order.status.update" | "outbox.status.update" | ...,
 *   "data": { ... }
 * }
 */
r.post(
  "/incoming",
  rawJson, // important: keep raw body available
  asyncHandler(async (req, res) => {
    if (!verifySignature(req)) {
      return res.status(401).json({ error: "INVALID_SIGNATURE" });
    }

    // If a raw Buffer was used, parse JSON here.
    let payload: any;
    if (Buffer.isBuffer(req.body)) {
      try {
        payload = JSON.parse(req.body.toString("utf8"));
      } catch {
        return res.status(400).json({ error: "INVALID_JSON" });
      }
    } else {
      payload = req.body;
    }

    const type = payload?.type as string | undefined;
    const data = payload?.data;

    if (!type || typeof data === "undefined") {
      return res.status(400).json({ error: "BAD_PAYLOAD" });
    }

    switch (type) {
      case "order.status.update": {
        // data: { id: string, toStatus: "NEW"|"CONTACTED"|... , note?: string }
        const { id, toStatus: rawToStatus, note } = data as {
          id: string;
          toStatus: string;
          note?: string;
        };
        if (!id || !rawToStatus || !ORDER_STATUS_SET.has(rawToStatus)) {
          return res.status(400).json({ error: "BAD_PAYLOAD" });
        }
        const toStatus = rawToStatus as (typeof ORDER_REQUEST_STATUSES)[number];

        const result = await prisma.$transaction(
          async (tx) =>
            applyOrderStatusTransition(tx, {
              orderId: id,
              toStatus,
              note: note ?? null,
              actor: "webhook",
            }),
          { isolationLevel: "Serializable" }
        );

        if (!result.ok) {
          if (result.code === "NOT_FOUND") return res.status(404).json({ error: "NOT_FOUND" });
          if (result.code === "VARIANT_NOT_FOUND") {
            return res.status(404).json({ error: "VARIANT_NOT_FOUND", variantId: result.variantId });
          }
          if (result.code === "INSUFFICIENT_STOCK") {
            return res.status(400).json({
              error: "INSUFFICIENT_STOCK",
              variantId: result.variantId,
              requested: result.requested,
              available: result.available,
            });
          }
          return res.status(400).json({ error: result.code, message: result.message });
        }
        return res.json({ ok: true });
      }

      case "outbox.status.update": {
        // data: { id: string, status: "QUEUED"|"SENT"|"FAILED", error?: string }
        const { id, status, error } = data as {
          id: string;
          status: "QUEUED" | "SENT" | "FAILED";
          error?: string;
        };
        if (!id || !status) return res.status(400).json({ error: "BAD_PAYLOAD" });

        await prisma.outboxMessage.update({
          where: { id },
          data: {
            status,
            lastError: error ?? undefined,
          },
        });
        return res.json({ ok: true });
      }

      // Add more event types here as needed:
      // - "catalog.product.invalidateCache"
      // - "user.created"
      // - "payment.succeeded"
      default:
        // Accept unknown types (idempotent), but do nothing.
        return res.json({ ok: true, ignored: true, type });
    }
  })
);

export default r;
