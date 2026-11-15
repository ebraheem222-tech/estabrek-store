import type { RequestHandler } from "express";
import { recordRun } from "../lib/runs.js";

/**
 * A webhook taken in goes to the run log (E0.2, lib/runs.ts): which address, how long, whether
 * it was accepted. One refused the same way over and over (a wrong signature, a scanner) is
 * written once a minute, not each time.
 */
const refused = new Map<string, number>();

export const webhookRun: RequestHandler = (req, res, next) => {
  // The webhook routes are mounted twice over the same address: one listener a request.
  if (req.method !== "POST" || res.locals.webhookRun) return next();
  res.locals.webhookRun = true;
  const t0 = Date.now();
  res.on("finish", () => {
    const status = res.statusCode;
    // An address nobody answers isn't a webhook.
    if (status === 404) return;
    const name = `${req.baseUrl}${req.path}`.replace(/\/+$/, "").slice(0, 120) || "/";
    const ok = status < 400;
    if (!ok) {
      const key = `${name}:${status}`;
      if (t0 - (refused.get(key) ?? 0) < 60_000) return;
      refused.set(key, t0);
      if (refused.size > 500) refused.clear();
    }
    recordRun({ kind: "webhook", name, trigger: req.method, startedAt: t0, ms: Date.now() - t0, ok, result: { status }, error: ok ? null : String(res.locals.errorMessage ?? `HTTP ${status}`) });
  });
  next();
};
