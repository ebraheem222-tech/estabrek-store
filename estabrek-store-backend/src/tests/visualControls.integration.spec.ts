import { beforeAll, afterAll, expect, test } from "vitest";
import request from "supertest";
import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
let app: Express; let prisma: PrismaClient;
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL || "http://invalid");
  if (process.env.TEST_DATABASE_ISOLATED !== "true" || !["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/estabrek_cms_publish_test") throw new Error("Only the dedicated localhost CI fixture is allowed.");
  app = (await import("./helpers/testApp.js")).default; prisma = (await import("../lib/prisma.js")).prisma;
});
afterAll(async () => { if (prisma) await prisma.$disconnect(); });
test("concurrent saves use the real row lock; general settings saves and restores retain visual controls", async () => {
  const initial = (await request(app).get("/v1/admin/visual-controls").expect(200)).body;
  const saves = await Promise.all([20, 32].map(swatchSize => request(app).put("/v1/admin/visual-controls").send({ ...initial, cardDesign: { swatchSize } })));
  expect(saves.map(r => r.status).sort()).toEqual([200, 409]);
  const winner = saves.find(r => r.status === 200)!.body;
  await request(app).patch("/v1/admin/settings").send({ siteName: "Visual fixture before" }).expect(200);
  await request(app).patch("/v1/admin/settings").send({ siteName: "Visual fixture after" }).expect(200);
  const revisions = (await request(app).get("/v1/admin/settings/revisions").expect(200)).body.rows;
  await request(app).post(`/v1/admin/settings/revisions/${revisions[0].id}/restore`).expect(200);
  expect((await request(app).get("/v1/admin/visual-controls").expect(200)).body).toEqual(winner);
  expect((await request(app).get("/v1/settings").expect(200)).body.site.visualControls).toEqual(winner);
});
