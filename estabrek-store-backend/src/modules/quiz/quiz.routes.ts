/**
 * «سؤال وجواب» (public, used by Razan on the storefront):
 *   POST /v1/quiz/visit  {device}           counted once a period; {chance} says if she may play
 *   POST /v1/quiz/start  {device}           she chose to play: her questions (no answers)
 *   POST /v1/quiz/answer {token, answers}   checked here; all right → she can claim
 *   POST /v1/quiz/claim  {token, phone}     a one-time coupon for her phone
 */
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { answerQuiz, claimPrize, startQuiz, visit } from "./quiz.service.js";

const r = Router();
const Device = z.object({ device: z.string().trim().min(8).max(80) });
const Token = z.string().min(10).max(80);

r.post(
  "/visit",
  validate({ body: Device }),
  asyncHandler(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await visit(req.body.device, req.ip));
  }),
);

r.post(
  "/start",
  validate({ body: Device }),
  asyncHandler(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await startQuiz(req.body.device));
  }),
);

r.post(
  "/answer",
  validate({ body: z.object({ token: Token, answers: z.array(z.number().int().min(-1).max(9)).max(10) }) }),
  asyncHandler(async (req, res) => {
    res.json(await answerQuiz(req.body.token, req.body.answers));
  }),
);

r.post(
  "/claim",
  validate({ body: z.object({ token: Token, phone: z.string().trim().min(5).max(40), name: z.string().trim().max(120).optional() }) }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await claimPrize(req.body.token, { phone: req.body.phone, name: req.body.name }));
  }),
);

export default r;
