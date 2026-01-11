// Lightweight auth helpers for incoming webhooks.
// We use a shared token sent either as ?token=... or "Authorization: Bearer <token>"

import type { Request } from "express";
import { env } from "./env.js";

export function extractWebhookToken(req: Request): string | undefined {
  // 1) query token
  const q = (req.query?.token as string | undefined)?.trim();
  if (q) return q;

  // 2) Authorization: Bearer <token>
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();

  // 3) custom header (optional)
  const h = (req.headers["x-webhook-token"] as string | undefined)?.trim();
  if (h) return h;

  return undefined;
}

export function verifyWebhookToken(req: Request): boolean {
  const tok = extractWebhookToken(req);
  return !!tok && tok === env.WEBHOOK_TOKEN;
}
