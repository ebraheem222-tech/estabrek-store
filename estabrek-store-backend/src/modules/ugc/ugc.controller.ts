import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import {
  ListReviewsQuery,
  ListCommentsQuery,
  UpdateReviewStatusBody,
  UpdateCommentStatusBody,
} from "./ugc.schemas.js";
import {
  listReviews,
  listComments,
  setReviewStatus,
  setCommentStatus,
  deleteReview,
  deleteComment,
} from "./ugc.service.js";

const r = Router();

/** Reviews moderation */
r.get("/reviews",
  validate({ query: ListReviewsQuery }),
  asyncHandler(async (req, res) => {
    const q = ListReviewsQuery.parse(req.query);
    res.json(await listReviews(q));
  })
);

r.patch("/reviews/:id/status",
  validate({ body: UpdateReviewStatusBody }),
  asyncHandler(async (req, res) => {
    const updated = await setReviewStatus(req.params.id, req.body.toStatus);
    res.json(updated);
  })
);

r.delete("/reviews/:id",
  asyncHandler(async (req, res) => {
    await deleteReview(req.params.id);
    res.json({ ok: true });
  })
);

/** Comments moderation */
r.get("/comments",
  validate({ query: ListCommentsQuery }),
  asyncHandler(async (req, res) => {
    const q = ListCommentsQuery.parse(req.query);
    res.json(await listComments(q));
  })
);

r.patch("/comments/:id/status",
  validate({ body: UpdateCommentStatusBody }),
  asyncHandler(async (req, res) => {
    const updated = await setCommentStatus(req.params.id, req.body.toStatus);
    res.json(updated);
  })
);

r.delete("/comments/:id",
  asyncHandler(async (req, res) => {
    await deleteComment(req.params.id);
    res.json({ ok: true });
  })
);

export default r;
