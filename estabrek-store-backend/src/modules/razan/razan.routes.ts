/**
 * Razan's public endpoints:
 *   POST /v1/razan/events        {key}   one count for the admin report (no personal data)
 *   GET  /v1/razan/preview/:id           settings the owner is trying (from the admin «رزان» page)
 *   GET  /v1/razan/style/start           «رزان بتختارلك»: the quiz's choices from what the shop has
 *   POST /v1/razan/style         {answers} pieces ranked for her, each with its reasons
 */
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { AppError } from "../../utils/httpError.js";
import { prisma } from "../../lib/prisma.js";
import { countRazan, countRazanKey, isRazanEvent, readPreview } from "./razan.service.js";
import { razanOf } from "./razan.settings.js";
import { OCCASIONS, answerKeys, quizStart, suggest } from "./styleQuiz.service.js";

const r = Router();

r.post(
  "/events",
  validate({ body: z.object({ key: z.string().max(40) }) }),
  asyncHandler(async (req, res) => {
    const key = req.body.key;
    if (!isRazanEvent(key)) throw new AppError(400, "UNKNOWN_EVENT", "Unknown event");
    await countRazan(key, req.ip);
    res.status(204).end();
  }),
);

r.get(
  "/preview/:id",
  asyncHandler(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const s = readPreview(String(req.params.id));
    if (!s) throw new AppError(404, "PREVIEW_EXPIRED", "This preview has ended");
    res.json({ razan: s });
  }),
);

/* ---------------- «رزان بتختارلك» ---------------- */

async function quizSettings() {
  const s = await prisma.siteSettings.findFirst({ select: { header: true } });
  const razan = razanOf(s?.header);
  if (!razan.enabled || !razan.styleQuiz.enabled) throw new AppError(404, "FEATURE_OFF", "The style quiz is off");
  return razan.styleQuiz;
}

r.get(
  "/style/start",
  asyncHandler(async (_req, res) => {
    await quizSettings();
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json(await quizStart());
  }),
);

const Id = z.string().min(1).max(64);
const Answers = z.object({
  occasion: z.enum(Object.keys(OCCASIONS) as [keyof typeof OCCASIONS, ...Array<keyof typeof OCCASIONS>]).nullish(),
  season: z.enum(["summer", "winter"]).nullish(),
  colors: z.array(z.string().max(20)).max(6).optional(),
  look: z.enum(["full", "piece"]).nullish(),
  size: z.string().trim().max(20).nullish(),
  budgetMax: z.number().positive().max(100000).nullish(),
  liked: z.array(Id).max(40).optional(),
  disliked: z.array(Id).max(40).optional(),
  exclude: z.array(Id).max(80).optional(),
  /** The first answer of a quiz (counted once for the report). */
  final: z.boolean().optional(),
});

r.post(
  "/style",
  validate({ body: Answers }),
  asyncHandler(async (req, res) => {
    const cfg = await quizSettings();
    const a = Answers.parse(req.body);
    const out = await suggest(a, { results: cfg.results, variety: cfg.variety });
    if (a.final) {
      await countRazan(out.noMatch ? "quiz:nomatch" : "quiz:done", req.ip);
      for (const k of answerKeys(a)) await countRazanKey(k, req.ip);
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(out);
  }),
);

export default r;
