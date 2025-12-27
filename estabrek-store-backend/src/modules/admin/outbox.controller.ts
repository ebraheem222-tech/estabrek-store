import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { ListOutboxQuery, RetryBody, CancelBody } from "./outbox.schemas.js";
import {
  listOutbox,
  getOutboxMessage,
  retryOutboxMessage,
  cancelOutboxMessage,
  processQueueOnce,
} from "../outbox/outbox.service.js";

const r = Router();

/** GET /v1/admin/outbox */
r.get("/", validate({ query: ListOutboxQuery }), asyncHandler(async (req, res) => {
  const q = ListOutboxQuery.parse(req.query);
  const out = await listOutbox(q);
  res.json(out);
}));

/** GET /v1/admin/outbox/:id */
r.get("/:id", asyncHandler(async (req, res) => {
  const msg = await getOutboxMessage(req.params.id);
  if (!msg) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(msg);
}));

/** POST /v1/admin/outbox/:id/retry */
r.post("/:id/retry", validate({ body: RetryBody }), asyncHandler(async (req, res) => {
  const msg = await retryOutboxMessage(req.params.id);
  res.json(msg);
}));

/** POST /v1/admin/outbox/:id/cancel */
r.post("/:id/cancel", validate({ body: CancelBody }), asyncHandler(async (req, res) => {
  const msg = await cancelOutboxMessage(req.params.id, req.body.reason);
  res.json(msg);
}));

/** POST /v1/admin/outbox/process (manual trigger for the worker) */
r.post("/process", asyncHandler(async (_req, res) => {
  const result = await processQueueOnce(25);
  res.json(result);
}));

export default r;
