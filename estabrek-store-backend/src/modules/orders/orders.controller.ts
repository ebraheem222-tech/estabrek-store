import { Router } from "express";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import { ListOrdersQuery, UpdateStatusBody, QueueMessageBody } from "./orders.schemas.js";
import { listOrders, getOrder, updateStatus, queueMessage } from "./orders.service.js";

const r = Router();

// GET /v1/admin/orders
r.get(
  "/",
  validate({ query: ListOrdersQuery }),
  asyncHandler(async (req, res) => {
    const { status, page, pageSize } = req.query as unknown as {
      status?: any; page: number; pageSize: number;
    };
    const out = await listOrders({ status, page, pageSize });
    res.json(out);
  })
);

// GET /v1/admin/orders/:id
r.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const o = await getOrder(req.params.id);
    if (!o) return res.status(404).json({ error: "NOT_FOUND" });
    res.json(o);
  })
);

// PATCH /v1/admin/orders/:id/status
r.patch(
  "/:id/status",
  validate({ body: UpdateStatusBody }),
  asyncHandler(async (req, res) => {
    const ord = await updateStatus({
      id: req.params.id,
      to: req.body.toStatus,
      note: req.body.note ?? null,
    });
    res.json(ord);
  })
);

// POST /v1/admin/orders/:id/message
r.post(
  "/:id/message",
  validate({ body: QueueMessageBody }),
  asyncHandler(async (req, res) => {
    const msg = await queueMessage(req.params.id, req.body);
    res.status(201).json(msg);
  })
);

export default r;
