/**
 * /v1/admin/quiz — «سؤال وجواب»: the switch and rules, this period's numbers,
 * the questions (the owner approves each one before it's asked) and the winners.
 */
import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { AppError, NotFound } from "../../utils/httpError.js";
import { QUIZ_DEFAULTS, QuizSchema, chancePositions, nextChancePosition, quizOf } from "../quiz/quiz.settings.js";
import { approvedCount, quizStats } from "../quiz/quiz.service.js";
import { adminIdOf, changedKeys, getOrCreateSettings, keepRevision, triggerSettingsRevalidate } from "./settings.controller.js";

export const quizAdmin = Router();
const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

quizAdmin.get(
  "/",
  asyncHandler(async (_req, res) => {
    const s = await getOrCreateSettings();
    const quiz = quizOf(s.header);
    const stats = await quizStats(quiz);
    res.json({
      settings: quiz,
      defaults: QUIZ_DEFAULTS,
      stats: { ...stats, nextChanceAt: quiz.mode === "counter" ? nextChancePosition(stats.visitors, quiz.base) : null },
      positions: chancePositions(quiz.base, 1000),
      approved: await approvedCount(),
    });
  }),
);

quizAdmin.put(
  "/",
  validate({ body: QuizSchema }),
  asyncHandler(async (req, res) => {
    const next = QuizSchema.parse(req.body);
    if (next.enabled && (await approvedCount()) < next.questions) {
      throw new AppError(400, "NOT_ENOUGH_QUESTIONS", `Approve at least ${next.questions} questions first`, { needed: next.questions });
    }
    const s = await getOrCreateSettings();
    const data = { header: { ...obj(s.header), quiz: next } as Prisma.InputJsonValue };
    const current = s as unknown as Record<string, unknown>;
    const changed = changedKeys(current, data as Record<string, unknown>);
    if (changed.length) {
      await keepRevision(current, changed, await adminIdOf(req), "تعديل إعدادات «سؤال وجواب»");
      await prisma.siteSettings.update({ where: { id: s.id }, data });
      triggerSettingsRevalidate();
    }
    res.json({ settings: next });
  }),
);

/* ---------------- Questions ---------------- */

const select = { id: true, text: true, choices: true, answer: true, level: true, topic: true, approved: true, active: true, createdAt: true, updatedAt: true } as const;
const Question = z
  .object({
    text: z.string().trim().min(5).max(300),
    choices: z.array(z.string().trim().min(1).max(120)).min(2).max(4),
    answer: z.number().int().min(0).max(3),
    level: z.number().int().min(1).max(3).default(1),
    topic: z.string().trim().min(1).max(40).default("general"),
    approved: z.boolean().default(false),
    active: z.boolean().default(true),
  })
  .refine((q) => q.answer < q.choices.length, { message: "The right answer must be one of the choices", path: ["answer"] })
  .refine((q) => new Set(q.choices).size === q.choices.length, { message: "Choices must differ", path: ["choices"] });

quizAdmin.get(
  "/questions",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.quizQuestion.findMany({ orderBy: [{ level: "asc" }, { createdAt: "asc" }], select });
    res.json({ questions: rows });
  }),
);

quizAdmin.post(
  "/questions",
  validate({ body: Question }),
  asyncHandler(async (req, res) => {
    const q = Question.parse(req.body);
    res.status(201).json(await prisma.quizQuestion.create({ data: q, select }));
  }),
);

quizAdmin.patch(
  "/questions/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const cur = await prisma.quizQuestion.findUnique({ where: { id }, select });
    if (!cur) throw NotFound("Question not found");
    const merged = Question.safeParse({ ...cur, ...obj(req.body) });
    if (!merged.success) throw new AppError(400, "VALIDATION_ERROR", "Check the question", merged.error.flatten());
    const s = quizOf((await getOrCreateSettings()).header);
    // Turning a question off can't leave a running quiz short.
    if (s.enabled && cur.approved && cur.active && (!merged.data.approved || !merged.data.active) && (await approvedCount()) - 1 < s.questions) {
      throw new AppError(409, "NOT_ENOUGH_QUESTIONS", "The quiz is on and needs this question", { needed: s.questions });
    }
    res.json(await prisma.quizQuestion.update({ where: { id }, data: merged.data, select }));
  }),
);

quizAdmin.delete(
  "/questions/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const cur = await prisma.quizQuestion.findUnique({ where: { id }, select: { approved: true, active: true } });
    if (!cur) throw NotFound("Question not found");
    const s = quizOf((await getOrCreateSettings()).header);
    if (s.enabled && cur.approved && cur.active && (await approvedCount()) - 1 < s.questions) {
      throw new AppError(409, "NOT_ENOUGH_QUESTIONS", "The quiz is on and needs this question", { needed: s.questions });
    }
    await prisma.quizQuestion.delete({ where: { id } });
    res.json({ ok: true });
  }),
);

/* ---------------- Winners ---------------- */

quizAdmin.get(
  "/winners",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.quizWin.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, period: true, phone: true, name: true, createdAt: true, coupon: { select: { code: true, usedCount: true, endsAt: true, discountValue: true } } },
    });
    res.json({
      winners: rows.map((w) => ({
        id: w.id,
        period: w.period,
        phone: w.phone,
        name: w.name,
        createdAt: w.createdAt,
        code: w.coupon.code,
        percent: Number(w.coupon.discountValue),
        used: w.coupon.usedCount > 0,
        endsAt: w.coupon.endsAt,
      })),
    });
  }),
);
