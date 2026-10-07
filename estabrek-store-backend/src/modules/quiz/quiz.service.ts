/**
 * «سؤال وجواب»: a visitor who gets a chance (counter 1, 3, 7, 15… or a draw)
 * can choose to answer a few questions, easy → hard. All right → a unique
 * coupon for her phone, one use, valid for the owner's hours. Answers are
 * checked here, never in the browser.
 */
import { createHash, randomBytes, randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { phoneKey } from "../../lib/phoneKey.js";
import { AppError } from "../../utils/httpError.js";
import { isChancePosition, periodOf, quizOf, type QuizSettings } from "./quiz.settings.js";

const ATTEMPT_MS = 20 * 60_000;
/** One IP can't make up many "devices" in one period (tests raise it: they all come from one IP). */
export const quizLimits = { devicesPerIp: 5 };

export async function quizSettings() {
  const s = await prisma.siteSettings.findFirst({ select: { header: true } });
  return quizOf(s?.header);
}

const deviceKey = (raw: string) => createHash("sha256").update(`quiz:${raw}`).digest("hex").slice(0, 32);

export async function approvedCount() {
  return prisma.quizQuestion.count({ where: { approved: true, active: true } });
}

/** Ready to run: on, and enough approved questions. */
async function ready(cfg: QuizSettings) {
  return cfg.enabled && (await approvedCount()) >= cfg.questions;
}

/** A visit: counts this device once per period and says whether it has a chance (stable for the period). */
export async function visit(rawDevice: string, ip: string | null | undefined, now = new Date()) {
  const cfg = await quizSettings();
  if (!(await ready(cfg))) return { chance: false };
  const period = periodOf(cfg.resetDays, now).key;
  const device = deviceKey(rawDevice);
  return prisma.$transaction(async (tx) => {
    // One visitor at a time gets the next number.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`quiz:${period}`}))`;
    const seen = await tx.quizDevice.findUnique({ where: { period_device: { period, device } } });
    if (seen) return { chance: seen.chance && !seen.used, ...(seen.chance && !seen.used ? prize(cfg) : {}) };
    if (ip && (await tx.quizDevice.count({ where: { period, ip } })) >= quizLimits.devicesPerIp) return { chance: false };
    const last = await tx.quizDevice.findFirst({ where: { period }, orderBy: { seq: "desc" }, select: { seq: true } });
    const seq = (last?.seq ?? 0) + 1;
    const wins = await tx.quizWin.count({ where: { period } });
    let chance = false;
    if (wins < cfg.maxPerPeriod) {
      if (cfg.mode === "counter") chance = isChancePosition(seq, cfg.base);
      else chance = randomInt(1_000_000) < (cfg.startChance / 100 / Math.pow(cfg.base, wins)) * 1_000_000;
    }
    await tx.quizDevice.create({ data: { period, device, seq, chance, ip: ip ?? null } });
    return { chance, ...(chance ? prize(cfg) : {}) };
  });
}

const prize = (cfg: QuizSettings) => ({ percent: cfg.percent, hours: cfg.hours, questions: cfg.questions });

/** She chose to play: her questions, easy → hard (the answers stay here). One go per chance. */
export async function startQuiz(rawDevice: string, now = new Date()) {
  const cfg = await quizSettings();
  if (!(await ready(cfg))) throw new AppError(404, "FEATURE_OFF", "The quiz is off");
  const period = periodOf(cfg.resetDays, now).key;
  const device = deviceKey(rawDevice);
  const row = await prisma.quizDevice.findUnique({ where: { period_device: { period, device } } });
  if (!row?.chance) throw new AppError(403, "NO_CHANCE", "No chance this time");
  if (row.used) throw new AppError(409, "ALREADY_PLAYED", "Already played");
  const pool = await prisma.quizQuestion.findMany({ where: { approved: true, active: true }, select: { id: true, text: true, choices: true, level: true } });
  const picked = pickByLevel(pool, cfg.questions);
  const token = randomBytes(18).toString("base64url");
  const used = await prisma.quizDevice.updateMany({ where: { period, device, used: false }, data: { used: true } });
  if (!used.count) throw new AppError(409, "ALREADY_PLAYED", "Already played");
  await prisma.quizAttempt.create({ data: { token, period, device, questionIds: picked.map((q) => q.id), expiresAt: new Date(now.getTime() + ATTEMPT_MS) } });
  return {
    token,
    expiresAt: new Date(now.getTime() + ATTEMPT_MS).toISOString(),
    ...prize(cfg),
    questions: picked.map((q) => ({ id: q.id, text: q.text, choices: q.choices as string[], level: q.level })),
  };
}

/** n questions spread over the levels, easiest first (random within a level). */
export function pickByLevel<T extends { level: number }>(pool: T[], n: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const levels = [...new Set(shuffled.map((q) => q.level))].sort((a, b) => a - b);
  const out: T[] = [];
  // Round-robin over levels so a go has easy, medium and hard ones.
  const byLevel = new Map(levels.map((l) => [l, shuffled.filter((q) => q.level === l)]));
  while (out.length < n && [...byLevel.values()].some((l) => l.length)) {
    for (const l of levels) {
      const q = byLevel.get(l)!.shift();
      if (q && out.length < n) out.push(q);
    }
  }
  return out.sort((a, b) => a.level - b.level);
}

async function liveAttempt(token: string, now: Date, graceMs = 0) {
  const a = await prisma.quizAttempt.findUnique({ where: { token } });
  if (!a || a.expiresAt.getTime() + graceMs < now.getTime()) throw new AppError(410, "QUIZ_EXPIRED", "This go has ended");
  return a;
}

/** Her answers (choice index per question, in order). All right → she can claim the coupon. */
export async function answerQuiz(token: string, answers: number[], now = new Date()) {
  const a = await liveAttempt(token, now);
  if (a.finishedAt) throw new AppError(409, "ALREADY_ANSWERED", "Already answered");
  const ids = a.questionIds as string[];
  const qs = await prisma.quizQuestion.findMany({ where: { id: { in: ids } }, select: { id: true, answer: true } });
  const right = new Map(qs.map((q) => [q.id, q.answer]));
  const correctList = ids.map((id) => right.get(id) ?? -1);
  const correct = ids.filter((id, i) => answers[i] === right.get(id)).length;
  const passed = correct === ids.length;
  const done = await prisma.quizAttempt.updateMany({ where: { id: a.id, finishedAt: null }, data: { correct, passed, finishedAt: now } });
  if (!done.count) throw new AppError(409, "ALREADY_ANSWERED", "Already answered");
  return { passed, correct, total: ids.length, answers: correctList };
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => `RZN-${Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("")}`;

/** All right: a unique one-time coupon for her phone. */
export async function claimPrize(token: string, input: { phone: string; name?: string | null }, now = new Date()) {
  const a = await liveAttempt(token, now, 30 * 60_000);
  if (!a.passed) throw new AppError(403, "NOT_PASSED", "Not all answers were right");
  if (a.claimed) throw new AppError(409, "ALREADY_CLAIMED", "Already claimed");
  const phone = phoneKey(input.phone);
  if (phone.length < 7) throw new AppError(400, "BAD_PHONE", "Check the phone number");
  const cfg = await quizSettings();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`quiz:${a.period}`}))`;
    if ((await tx.quizWin.count({ where: { period: a.period } })) >= cfg.maxPerPeriod) throw new AppError(409, "PRIZES_GONE", "No prizes left this time");
    if (await tx.quizWin.findUnique({ where: { period_phone: { period: a.period, phone } } })) throw new AppError(409, "ALREADY_WON", "This phone already won this time");
    const claimed = await tx.quizAttempt.updateMany({ where: { id: a.id, claimed: false }, data: { claimed: true } });
    if (!claimed.count) throw new AppError(409, "ALREADY_CLAIMED", "Already claimed");
    const endsAt = new Date(now.getTime() + cfg.hours * 3600_000);
    let coupon: { id: string; code: string } | null = null;
    for (let i = 0; i < 5 && !coupon; i++) {
      try {
        coupon = await tx.coupon.create({
          data: {
            code: newCode(),
            discountType: "PERCENT",
            discountValue: new Prisma.Decimal(cfg.percent),
            usageLimit: 1,
            isActive: true,
            startsAt: now,
            endsAt,
            phone,
            note: "جائزة «سؤال وجواب» — لرقم واحد ومرة وحدة",
          },
          select: { id: true, code: true },
        });
      } catch (e) {
        if ((e as Prisma.PrismaClientKnownRequestError)?.code !== "P2002") throw e; // same code: try another
      }
    }
    if (!coupon) throw new AppError(500, "CODE_FAILED", "Could not make a code");
    await tx.quizWin.create({ data: { period: a.period, device: a.device, phone, name: input.name?.trim() || null, couponId: coupon.id } });
    return { code: coupon.code, percent: cfg.percent, endsAt: endsAt.toISOString() };
  });
}

/** The owner's view of the current period. */
export async function quizStats(cfg: QuizSettings, now = new Date()) {
  const p = periodOf(cfg.resetDays, now);
  const [visitors, chances, plays, passes, wins] = await Promise.all([
    prisma.quizDevice.count({ where: { period: p.key } }),
    prisma.quizDevice.count({ where: { period: p.key, chance: true } }),
    prisma.quizAttempt.count({ where: { period: p.key } }),
    prisma.quizAttempt.count({ where: { period: p.key, passed: true } }),
    prisma.quizWin.count({ where: { period: p.key } }),
  ]);
  return { period: p.key, startsAt: p.start.toISOString(), endsAt: p.end.toISOString(), visitors, chances, plays, passes, wins };
}
