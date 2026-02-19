import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NODE_ENV = "test";
  process.env.TEST_BYPASS_AUTH = "true";
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test";
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-key-123456";
});

import adminController from "../modules/admin/admin.controller.js";
import pagesController from "../modules/admin/pages.controller.js";
import { errorHandler } from "../middleware/error.js";

const prisma = vi.hoisted(() => ({
  adminSecurityEvent: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
})) as any;

vi.mock("../lib/prisma.js", () => ({ prisma }));

function buildAdminTestApp() {
  const app = express();
  app.use(express.json());

  const withAdminUser = (req: any, _res: any, next: () => void) => {
    req.user = { sub: "admin-1", role: "SUPERADMIN", email: "admin@local" };
    next();
  };

  app.use("/v1/admin", withAdminUser, adminController);
  app.use("/v1/admin/pages", withAdminUser, pagesController);
  app.use(errorHandler);

  return app;
}

describe("Admin audit + section validation endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.adminSecurityEvent.findMany.mockResolvedValue([]);
    prisma.adminSecurityEvent.count.mockResolvedValue(0);
  });

  it("POST /v1/admin/audit/events stores custom CMS event type and returns mapped output", async () => {
    prisma.adminSecurityEvent.create.mockResolvedValue({
      id: "evt_1",
      type: "SESSION_CREATED",
      ip: "127.0.0.1",
      userAgent: "vitest",
      metadata: { auditType: "CMS_SECTION_UPDATE", pageId: "page_1" },
      at: new Date("2026-02-18T12:00:00.000Z"),
    });

    const app = buildAdminTestApp();
    const res = await request(app)
      .post("/v1/admin/audit/events")
      .send({ type: "CMS_SECTION_UPDATE", metadata: { pageId: "page_1" } })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.event.type).toBe("CMS_SECTION_UPDATE");
    expect(res.body.event.createdAt).toBe("2026-02-18T12:00:00.000Z");
    expect(prisma.adminSecurityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminUserId: "admin-1",
          type: "SESSION_CREATED",
        }),
      })
    );
  });

  it("GET /v1/admin/audit/events filters by mapped custom audit type", async () => {
    prisma.adminSecurityEvent.findMany.mockResolvedValue([
      {
        id: "evt_1",
        type: "SESSION_CREATED",
        ip: null,
        userAgent: null,
        metadata: { auditType: "CMS_SECTION_UPDATE", pageId: "page_1" },
        at: new Date("2026-02-18T12:00:00.000Z"),
      },
      {
        id: "evt_2",
        type: "SESSION_CREATED",
        ip: null,
        userAgent: null,
        metadata: { auditType: "CMS_SECTION_DELETE", pageId: "page_1" },
        at: new Date("2026-02-18T11:00:00.000Z"),
      },
    ]);

    const app = buildAdminTestApp();
    const res = await request(app)
      .get("/v1/admin/audit/events")
      .query({ type: "CMS_SECTION_UPDATE", take: 50, skip: 0 })
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].type).toBe("CMS_SECTION_UPDATE");
  });

  it("POST /v1/admin/account/security-events supports compatibility audit writes", async () => {
    prisma.adminSecurityEvent.create.mockResolvedValue({
      id: "evt_compat",
      type: "SESSION_CREATED",
      ip: null,
      userAgent: null,
      metadata: { auditType: "CMS_PAGE_UPDATE" },
      at: new Date("2026-02-18T10:30:00.000Z"),
    });

    const app = buildAdminTestApp();
    const res = await request(app)
      .post("/v1/admin/account/security-events")
      .send({ type: "CMS_PAGE_UPDATE", metadata: { pageId: "page_9" } })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.event.type).toBe("CMS_PAGE_UPDATE");
  });

  it("POST /v1/admin/pages/sections/validate returns ok for valid HERO payload", async () => {
    const app = buildAdminTestApp();
    const res = await request(app)
      .post("/v1/admin/pages/sections/validate")
      .send({ type: "HERO", data: { title: "Welcome" } })
      .expect(200);

    expect(res.body).toMatchObject({
      ok: true,
      source: "server",
      issues: [],
    });
  });

  it("POST /v1/admin/pages/sections/validate returns publish issues for invalid payload", async () => {
    const app = buildAdminTestApp();
    const res = await request(app)
      .post("/v1/admin/pages/sections/validate")
      .send({ type: "HERO", data: {} })
      .expect(200);

    expect(res.body.ok).toBe(false);
    expect(res.body.issues[0]).toMatchObject({
      path: "data",
      code: "PUBLISH_VALIDATION",
    });
  });

  it("POST /v1/admin/pages/sections/validate rejects unsupported section type", async () => {
    const app = buildAdminTestApp();
    const res = await request(app)
      .post("/v1/admin/pages/sections/validate")
      .send({ type: "UNKNOWN_SECTION", data: {} })
      .expect(200);

    expect(res.body.ok).toBe(false);
    expect(res.body.issues[0]).toMatchObject({
      path: "type",
      code: "UNSUPPORTED_TYPE",
    });
  });
});
