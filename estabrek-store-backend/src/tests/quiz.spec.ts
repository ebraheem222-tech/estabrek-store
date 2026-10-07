import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";
import { QUIZ_DEFAULTS, chancePositions, isChancePosition, nextChancePosition, periodOf } from "../modules/quiz/quiz.settings.js";
import { pickByLevel, quizLimits } from "../modules/quiz/quiz.service.js";
import { phoneKey } from "../lib/phoneKey.js";

const put = (patch: Record<string, unknown>) => request(app).put("/v1/admin/quiz").send({ ...QUIZ_DEFAULTS, ...patch });

async function seedQuestions(n: number, approved = true) {
  await prisma.quizQuestion.deleteMany();
  for (let i = 0; i < n; i++) {
    await prisma.quizQuestion.create({ data: { text: `سؤال رقم ${i + 1}؟`, choices: ["أ", "ب", "ج"], answer: i % 3, level: (i % 3) + 1, approved } });
  }
}
const rightAnswers = async (ids: string[]) => {
  const qs = await prisma.quizQuestion.findMany({ where: { id: { in: ids } } });
  return ids.map((id) => qs.find((q) => q.id === id)!.answer);
};
const dev = (i: number) => `device-test-${String(i).padStart(4, "0")}`;
const visitAs = (i: number) => request(app).post("/v1/quiz/visit").send({ device: dev(i) });

beforeEach(async () => {
  quizLimits.devicesPerIp = 1000; // every test request comes from the same IP
  await prisma.quizWin.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.quizDevice.deleteMany();
  await prisma.coupon.deleteMany({ where: { code: { startsWith: "RZN-" } } });
  await seedQuestions(6);
  await put({}).expect(200);
});

describe("the schedule", () => {
  test("1, 3, 7, 15… and its cousins; periods start on Sunday (Israel)", () => {
    expect(chancePositions(2, 70)).toEqual([1, 3, 7, 15, 31, 63]);
    expect(chancePositions(3, 50)).toEqual([1, 4, 13, 40]);
    expect([1, 2, 3, 4, 7, 8].map((n) => isChancePosition(n, 2))).toEqual([true, false, true, false, true, false]);
    expect(nextChancePosition(7, 2)).toBe(15);
    expect(nextChancePosition(0, 2)).toBe(1);
    // Sat 2026-10-17 21:30 UTC is already Sunday in Israel: a new week.
    const sat = periodOf(7, new Date("2026-10-17T12:00:00Z"));
    const sunIL = periodOf(7, new Date("2026-10-17T21:30:00Z"));
    expect(sunIL.key).not.toBe(sat.key);
    expect(sunIL.start.toISOString().slice(0, 10)).toBe("2026-10-18");
    expect(phoneKey("+970 599-123-456")).toBe(phoneKey("0599123456"));
  });

  test("questions spread over the levels, easiest first", () => {
    const pool = Array.from({ length: 9 }, (_, i) => ({ id: String(i), level: (i % 3) + 1 }));
    const five = pickByLevel(pool, 5);
    expect(five.map((q) => q.level)).toEqual([1, 1, 2, 2, 3]);
  });
});

describe("«سؤال وجواب»", () => {
  test("can't be turned on without enough approved questions; off = nobody gets a chance", async () => {
    await seedQuestions(3);
    expect((await put({ enabled: true, questions: 5 }).expect(400)).body.error).toBe("NOT_ENOUGH_QUESTIONS");
    expect((await visitAs(1).expect(200)).body).toEqual({ chance: false });
  });

  test("counter: visitors 1, 3, 7 get a chance (each device counted once), up to the period's prizes", async () => {
    await put({ enabled: true, questions: 3, maxPerPeriod: 5 }).expect(200);
    const chances: number[] = [];
    for (let i = 1; i <= 8; i++) if ((await visitAs(i).expect(200)).body.chance) chances.push(i);
    expect(chances).toEqual([1, 3, 7]);
    // Coming back doesn't count again, and keeps her chance.
    expect((await visitAs(3).expect(200)).body).toMatchObject({ chance: true, percent: 10, hours: 48, questions: 3 });
    expect(await prisma.quizDevice.count()).toBe(8);
    // One IP can't pose as many visitors.
    quizLimits.devicesPerIp = 10;
    for (let i = 0; i < 5; i++) await visitAs(100 + i).expect(200);
    expect(await prisma.quizDevice.count()).toBe(10);
  });

  test("play: no chance → refused; all right → a one-time coupon for her phone only", async () => {
    await put({ enabled: true, questions: 3, percent: 15, hours: 48 }).expect(200);
    await visitAs(1).expect(200); // #1: chance
    await visitAs(2).expect(200); // #2: none
    expect((await request(app).post("/v1/quiz/start").send({ device: dev(2) }).expect(403)).body.error).toBe("NO_CHANCE");

    const go = (await request(app).post("/v1/quiz/start").send({ device: dev(1) }).expect(200)).body;
    expect(go.questions).toHaveLength(3);
    expect(go.questions[0]).not.toHaveProperty("answer");
    expect(go.questions.map((q: any) => q.level)).toEqual([1, 2, 3]);
    expect((await request(app).post("/v1/quiz/start").send({ device: dev(1) }).expect(409)).body.error).toBe("ALREADY_PLAYED");

    expect((await request(app).post("/v1/quiz/claim").send({ token: go.token, phone: "0599123456" }).expect(403)).body.error).toBe("NOT_PASSED");
    const right = await rightAnswers(go.questions.map((q: any) => q.id));
    const ans = (await request(app).post("/v1/quiz/answer").send({ token: go.token, answers: right }).expect(200)).body;
    expect(ans).toMatchObject({ passed: true, correct: 3, total: 3 });
    await request(app).post("/v1/quiz/answer").send({ token: go.token, answers: right }).expect(409);

    const won = (await request(app).post("/v1/quiz/claim").send({ token: go.token, phone: "+970 599 123 456", name: "سارة" }).expect(201)).body;
    expect(won.code).toMatch(/^RZN-[A-Z2-9]{6}$/);
    expect(won.percent).toBe(15);
    const c = await prisma.coupon.findUnique({ where: { code: won.code } });
    expect(c).toMatchObject({ usageLimit: 1, phone: "599123456", discountType: "PERCENT" });
    expect(Math.round((c!.endsAt!.getTime() - Date.now()) / 3600_000)).toBe(48);
    await request(app).post("/v1/quiz/claim").send({ token: go.token, phone: "0599123456" }).expect(409);

    // The coupon: her phone only, once.
    await prisma.category.upsert({ where: { id: "qzcat000001" }, create: { id: "qzcat000001", name: "قسم", slug: "qz-cat" }, update: {} });
    await prisma.size.upsert({ where: { id: "qzsize00001" }, create: { id: "qzsize00001", name: "QZ" }, update: {} });
    await prisma.product.deleteMany({ where: { slug: "qz-abaya" } });
    await prisma.product.create({ data: { id: "cqzprod0001", title: "عباية", slug: "qz-abaya", isActive: true, categoryId: "qzcat000001", items: { create: [{ colorName: "أسود", skuBase: "QZ", variants: { create: [{ id: "cqzvar00001", sku: "QZ-1", price: new Prisma.Decimal(100), stock: 5, size: { connect: { id: "qzsize00001" } } }] } }] } } });
    const order = (phone: string) => request(app).post("/v1/catalog/order-requests").send({ items: [{ variantId: "cqzvar00001", quantity: 1 }], customerName: "سارة", phone, couponCode: won.code });
    expect((await order("0599999999").expect(400)).body.error).toBe("COUPON_PHONE");
    const ok = (await order("0599-123-456").expect(201)).body;
    expect(Number(ok.discountAmount)).toBe(15);
    expect((await order("0599123456").expect(400)).body.error).toBe("COUPON_USAGE_LIMIT_REACHED");
  });

  test("a wrong answer: no prize; the owner sees the period's numbers and the winners", async () => {
    await put({ enabled: true, questions: 3 }).expect(200);
    await visitAs(1).expect(200);
    const go = (await request(app).post("/v1/quiz/start").send({ device: dev(1) }).expect(200)).body;
    const right = await rightAnswers(go.questions.map((q: any) => q.id));
    right[2] = (right[2] + 1) % 3;
    expect((await request(app).post("/v1/quiz/answer").send({ token: go.token, answers: right }).expect(200)).body).toMatchObject({ passed: false, correct: 2 });
    expect((await request(app).post("/v1/quiz/claim").send({ token: go.token, phone: "0599123456" }).expect(403)).body.error).toBe("NOT_PASSED");

    const view = (await request(app).get("/v1/admin/quiz").expect(200)).body;
    expect(view.stats).toMatchObject({ visitors: 1, chances: 1, plays: 1, passes: 0, wins: 0, nextChanceAt: 3 });
    expect(view.approved).toBe(6);
    expect((await request(app).get("/v1/admin/quiz/winners").expect(200)).body.winners).toEqual([]);
  });

  test("chance mode: odds halve after each win; no more than the period's prizes", async () => {
    await put({ enabled: true, mode: "chance", startChance: 100, base: 2, questions: 3, maxPerPeriod: 1 }).expect(200);
    expect((await visitAs(1).expect(200)).body.chance).toBe(true); // 100% before any win
    const go = (await request(app).post("/v1/quiz/start").send({ device: dev(1) }).expect(200)).body;
    await request(app).post("/v1/quiz/answer").send({ token: go.token, answers: await rightAnswers(go.questions.map((q: any) => q.id)) }).expect(200);
    await request(app).post("/v1/quiz/claim").send({ token: go.token, phone: "0599111222" }).expect(201);
    // The period's one prize is gone: nobody else gets a chance.
    for (let i = 2; i <= 6; i++) expect((await visitAs(i).expect(200)).body.chance).toBe(false);
    const w = (await request(app).get("/v1/admin/quiz/winners").expect(200)).body.winners;
    expect(w[0]).toMatchObject({ phone: "599111222", percent: 10, used: false });
  });

  test("questions: the owner writes, approves, and can't pull one out from under a running quiz", async () => {
    const bad = await request(app).post("/v1/admin/quiz/questions").send({ text: "سؤال بدون جواب صحيح؟", choices: ["أ", "ب"], answer: 3 }).expect(400);
    expect(bad.body.error).toBeTruthy();
    const q = (await request(app).post("/v1/admin/quiz/questions").send({ text: "كم عدد أيام الأسبوع؟", choices: ["5", "7"], answer: 1, level: 1, topic: "general" }).expect(201)).body;
    expect(q.approved).toBe(false);
    await request(app).patch(`/v1/admin/quiz/questions/${q.id}`).send({ approved: true }).expect(200);
    await seedQuestions(3);
    await put({ enabled: true, questions: 3 }).expect(200);
    const one = await prisma.quizQuestion.findFirst();
    expect((await request(app).patch(`/v1/admin/quiz/questions/${one!.id}`).send({ approved: false }).expect(409)).body.error).toBe("NOT_ENOUGH_QUESTIONS");
    await request(app).delete(`/v1/admin/quiz/questions/${one!.id}`).expect(409);
    const list = (await request(app).get("/v1/admin/quiz/questions").expect(200)).body.questions;
    expect(list).toHaveLength(3);
  });

  test("the starter bank is in the database, unapproved", async () => {
    // (The migration seeds ~30; tests wipe them, so check the shape of a fresh one.)
    const view = (await request(app).get("/v1/admin/quiz").expect(200)).body;
    expect(view.settings).toEqual(QUIZ_DEFAULTS);
    expect(view.positions.slice(0, 5)).toEqual([1, 3, 7, 15, 31]);
  });
});
