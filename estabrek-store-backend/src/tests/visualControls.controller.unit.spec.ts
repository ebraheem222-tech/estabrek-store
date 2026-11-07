import { beforeEach, expect, test, vi } from "vitest";
import express from "express";
import request from "supertest";
const m = vi.hoisted(() => ({ row: null as any, revalidate: vi.fn(), write: true, db: { siteSettings: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() }, $queryRaw: vi.fn(), $transaction: vi.fn() } }));
vi.mock("../lib/prisma.js", () => ({ prisma: m.db }));
vi.mock("../config/env.js", () => ({ env: { NODE_ENV: "test", JWT_SECRET: "test-only-not-a-production-key" } }));
vi.mock("../modules/admin/settings.controller.js", () => ({ getOrCreateSettings: async () => m.row, triggerSettingsRevalidate: m.revalidate }));
import controls from "../modules/admin/visualControls.controller.js";
const app = express(); app.use(express.json());
app.use((req, _res, next) => { (req as any).access = { owner: false, permissions: new Set(["settings:read", ...(m.write ? ["settings:write"] : [])]) }; next(); });
app.use("/controls", controls);
app.use((err: any, _req: any, res: any, _next: any) => res.status(err.status ?? (err.name === "ZodError" ? 400 : 500)).json({ error: err.name }));
beforeEach(() => {
  vi.clearAllMocks(); m.write = true; m.row = { id: "site", header: { identity: "keep" }, visualControls: null };
  m.db.siteSettings.findUnique.mockImplementation(async () => structuredClone(m.row));
  m.db.siteSettings.update.mockImplementation(async ({ data }) => { Object.assign(m.row, data); return structuredClone(m.row); });
  m.db.$transaction.mockImplementation(async fn => fn(m.db)); m.db.$queryRaw.mockResolvedValue([{ id: "site" }]);
});
test("global save increments an independent revision and preserves unrelated settings", async () => {
  expect((await request(app).get("/controls").expect(200)).body.revision).toBe(0);
  const saved = await request(app).put("/controls").send({ version: 1, revision: 0, cardDesign: { swatchSize: 30 }, interactions: { version: 1, bindings: { click: [] } } }).expect(200);
  expect(saved.body.revision).toBe(1); expect(m.row.header).toEqual({ identity: "keep" }); expect(m.revalidate).toHaveBeenCalledOnce();
  await request(app).put("/controls").send({ version: 1, revision: 0 }).expect(409);
  expect(m.row.visualControls.cardDesign.swatchSize).toBe(30);
});
test("read-only members cannot save; invalid actions cannot reach storage", async () => {
  m.write = false; await request(app).get("/controls").expect(200);
  await request(app).put("/controls").send({ version: 1, revision: 0 }).expect(403);
  m.write = true;
  await request(app).put("/controls").send({ version: 1, revision: 0, interactions: { version: 1, bindings: { click: [{ type: "eval", code: "bad" }] } } }).expect(400);
  expect(m.db.siteSettings.update).not.toHaveBeenCalled();
});
