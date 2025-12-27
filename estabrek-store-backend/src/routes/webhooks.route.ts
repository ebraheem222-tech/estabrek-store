import { Router } from "express";
import { env } from "../config/env.js";

const router = Router();

// توكن بسيط (وبنفس الوقت مرن للهيدر)
function checkWebhookToken(req: any, res: any, next: any) {
  // خلي الاختبارات تمشي لو عامل TEST_BYPASS_AUTH
  if (env.NODE_ENV !== "production" && process.env.TEST_BYPASS_AUTH === "true") return next();

  const token =
    req.header("x-webhook-token") ||
    req.header("x-webhook") ||
    (req.header("authorization")?.startsWith("Bearer ")
      ? req.header("authorization")?.slice("Bearer ".length)
      : undefined);

  if (env.WEBHOOK_TOKEN && token !== env.WEBHOOK_TOKEN) {
    return res.status(401).json({ ok: false, error: "BAD_TOKEN" });
  }
  next();
}

router.post("/wire", checkWebhookToken, (req, res) => {
  const eventId = req.body?.eventId ?? "evt_1";
  res.status(200).json({ ok: true, eventId });
});

router.post("/order-request", checkWebhookToken, async (req, res) => {
  // إذا بدك هون لاحقاً تعمل create بالـ prisma
  res.status(200).json({ ok: true, id: "or_webhook_1" });
});

export default router;
