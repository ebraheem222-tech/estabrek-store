import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import { env } from "../config/env.js";
import { backupKey, packBackup, unpackBackup } from "../modules/backups/backupFile.js";
import { dumpDatabase, insertOrder, parentsFirst, restoreDatabase } from "../modules/backups/backupDb.js";
import { backupDue, cloudinaryStorage, maybeRunDailyBackup, runBackup, setBackupStorage, type BackupStorage } from "../modules/backups/backup.service.js";

/** In-memory storage instead of Cloudinary. */
function fakeStorage(ready = true) {
  const files = new Map<string, Buffer>();
  const removed: string[] = [];
  const s: BackupStorage & { files: Map<string, Buffer>; removed: string[] } = {
    kind: "test",
    ready: () => ready,
    put: async (name, file) => {
      files.set(name, file);
      return { location: `backups/${name}` };
    },
    remove: async (loc) => {
      removed.push(loc);
    },
    link: async (loc) => `https://files.test/${loc}?sig=1`,
    files,
    removed,
  };
  return s;
}

const saved = { keep: env.BACKUP_KEEP, max: env.BACKUP_MAX_UPLOAD_MB };

beforeEach(async () => {
  await prisma.backupRun.deleteMany();
  await resetDb();
  await seedCatalog();
  Object.assign(env, { BACKUP_KEEP: saved.keep, BACKUP_MAX_UPLOAD_MB: saved.max });
  setBackupStorage(fakeStorage());
});
afterAll(async () => {
  setBackupStorage(cloudinaryStorage);
  Object.assign(env, { BACKUP_KEEP: saved.keep, BACKUP_MAX_UPLOAD_MB: saved.max });
  await prisma.backupRun.deleteMany();
});

describe("The backup file", () => {
  test("encrypted: opens only with the same key", async () => {
    const data = { format: "estabrek-backup" as const, version: 1 as const, createdAt: "2026-10-13T00:00:00Z", migration: "x", tables: { A: [{ id: "1", name: "سارة" }] } };
    const file = packBackup(data);
    expect(file.subarray(0, 6).toString()).toBe("ESTBK1");
    expect(file.includes(Buffer.from("سارة"))).toBe(false);
    expect(unpackBackup(file)).toEqual(data);
    expect(() => unpackBackup(file, backupKey("another-key-another-key"))).toThrow("WRONG_KEY_OR_DAMAGED_FILE");
    expect(() => unpackBackup(Buffer.from("hello"))).toThrow("NOT_A_BACKUP_FILE");
  });

  test("restore order: parents before children, and parents-first inside a table", () => {
    const fks = [
      { child: "Product", childColumn: "categoryId", parent: "Category", parentColumn: "id" },
      { child: "Category", childColumn: "parentId", parent: "Category", parentColumn: "id" },
      { child: "ProductVariant", childColumn: "productItemId", parent: "ProductItem", parentColumn: "id" },
      { child: "ProductItem", childColumn: "productId", parent: "Product", parentColumn: "id" },
    ];
    const order = insertOrder(["ProductVariant", "Product", "ProductItem", "Category"], fks);
    expect(order).toEqual(["Category", "Product", "ProductItem", "ProductVariant"]);
    const rows = [{ id: "c", parentId: "b" }, { id: "b", parentId: "a" }, { id: "a", parentId: null }];
    expect(parentsFirst(rows, "parentId").map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  test("the daily backup is due once a day at the set hour, or when the last one is too old", () => {
    const hour = (h: number) => new Date(Date.UTC(2026, 9, 13, h - 3, 10)); // Israel = UTC+3 in October
    expect(backupDue(null)).toBe(true);
    expect(backupDue(new Date(hour(3).getTime() - 2 * 3600_000), hour(3), 3)).toBe(false); // 2 hours ago
    expect(backupDue(new Date(hour(3).getTime() - 23 * 3600_000), hour(3), 3)).toBe(true);
    expect(backupDue(new Date(hour(12).getTime() - 23 * 3600_000), hour(12), 3)).toBe(false); // not the hour
    expect(backupDue(new Date(hour(12).getTime() - 31 * 3600_000), hour(12), 3)).toBe(true);
  });
});

describe("Backup and restore", () => {
  test("everything comes back as it was (text, numbers, dates, lists, JSON, sub-categories)", async () => {
    await prisma.siteSettings.deleteMany();
    await prisma.siteSettings.create({ data: { siteName: "استبرق", header: { theme: { id: "rose" }, storefront: { chatbotEnabled: false } } } });
    await prisma.staffRole.upsert({
      where: { id: "staffrole_test" },
      create: { id: "staffrole_test", name: "تجربة", permissions: ["orders:read", "catalog:write"] },
      update: { permissions: ["orders:read", "catalog:write"] },
    });
    await request(app).post("/v1/catalog/order-requests").send({ items: [{ variantId: "cvariant01", quantity: 2 }], customerName: "سارة", phone: "0599123456" }).expect(201);
    const before = await dumpDatabase();
    expect(before.tables.Product).toHaveLength(1);
    expect(before.tables.AdminSession).toBeUndefined();

    // Things go wrong…
    await prisma.orderRequestHistory.deleteMany();
    await prisma.orderRequestItem.deleteMany();
    await prisma.orderRequest.deleteMany();
    await prisma.productVariant.update({ where: { id: "cvariant01" }, data: { stock: 0, price: 1 } });
    await prisma.category.create({ data: { id: "c9", name: "Junk", slug: "junk" } });
    await prisma.siteSettings.updateMany({ data: { siteName: "oops", header: {} } });
    await prisma.staffRole.update({ where: { id: "staffrole_test" }, data: { permissions: [] } });

    const report = await restoreDatabase(unpackBackup(packBackup(before)));
    expect(report.rows).toBeGreaterThan(5);
    const v = await prisma.productVariant.findUnique({ where: { id: "cvariant01" } });
    expect(v!.stock).toBe(10);
    expect(Number(v!.price)).toBe(50);
    expect(await prisma.category.findUnique({ where: { id: "c9" } })).toBeNull();
    expect((await prisma.category.findUnique({ where: { id: "c2" } }))!.parentId).toBe("c1");
    const s = await prisma.siteSettings.findFirst();
    expect(s).toMatchObject({ siteName: "استبرق", header: { theme: { id: "rose" }, storefront: { chatbotEnabled: false } } });
    expect((await prisma.staffRole.findUnique({ where: { id: "staffrole_test" } }))!.permissions).toEqual(["orders:read", "catalog:write"]);
    const orders = await prisma.orderRequest.findMany({ include: { items: true } });
    expect(orders).toHaveLength(1);
    expect(orders[0].customerName).toBe("سارة");
    expect(orders[0].createdAt.toISOString()).toBe(new Date(before.tables.OrderRequest[0].createdAt as string + "Z").toISOString());
    expect(orders[0].items[0]).toMatchObject({ quantity: 2 });
    // Same data again → the same dump.
    const after = await dumpDatabase();
    for (const t of ["Product", "ProductVariant", "Category", "OrderRequest", "OrderRequestItem", "StaffRole", "SiteSettings"]) expect(after.tables[t]).toEqual(before.tables[t]);
    await prisma.staffRole.delete({ where: { id: "staffrole_test" } });
  });

  test("runs are stored, counted, and only the newest ones are kept", async () => {
    const st = fakeStorage();
    setBackupStorage(st);
    Object.assign(env, { BACKUP_KEEP: 2 });
    const first = await runBackup({ trigger: "manual" });
    expect(first).toMatchObject({ status: "SUCCEEDED", storage: "test" });
    expect(first.rows).toBeGreaterThan(3);
    expect((first.counts as any).Product).toBe(1);
    expect(st.files.size).toBe(1);
    expect(unpackBackup([...st.files.values()][0]).tables.Product).toHaveLength(1);
    await runBackup({ trigger: "auto" });
    await runBackup({ trigger: "auto" });
    expect(st.removed).toEqual([first.location]);
    expect((await prisma.backupRun.findUnique({ where: { id: first.id } }))!.location).toBeNull();
  });

  test("failures are recorded (no storage, file too big)", async () => {
    setBackupStorage(fakeStorage(false));
    expect(await runBackup({ trigger: "manual" })).toMatchObject({ status: "FAILED", error: "STORAGE_NOT_READY" });
    setBackupStorage(fakeStorage());
    Object.assign(env, { BACKUP_MAX_UPLOAD_MB: 0.000001 });
    expect(await runBackup({ trigger: "manual" })).toMatchObject({ status: "FAILED", error: "TOO_BIG_FOR_STORAGE" });
  });

  test("the daily run: once, not when switched off", async () => {
    await prisma.siteSettings.updateMany({ data: { backupsEnabled: false } });
    expect(await maybeRunDailyBackup()).toBeNull();
    await prisma.siteSettings.updateMany({ data: { backupsEnabled: true } });
    expect((await maybeRunDailyBackup())!.status).toBe("SUCCEEDED");
    expect(await maybeRunDailyBackup()).toBeNull();
  });
});

describe("In the admin", () => {
  test("status, take one now, download to the computer, link to a stored one", async () => {
    const view = await request(app).get("/v1/admin/system/backups").expect(200);
    expect(view.body).toMatchObject({ enabled: true, storage: { kind: "test", ready: true }, last: null, runs: [] });
    const run = await request(app).post("/v1/admin/system/backups/run").expect(201);
    expect(run.body.status).toBe("SUCCEEDED");
    const file = await request(app)
      .get("/v1/admin/system/backups/download")
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(file.headers["content-disposition"]).toMatch(/estabrek-backup-.*\.estbk/);
    expect(unpackBackup(file.body as Buffer).tables.Category).toHaveLength(2);
    const link = await request(app).get(`/v1/admin/system/backups/${run.body.id}/link`).expect(200);
    expect(link.body.url).toContain("https://files.test/");
    expect((await request(app).get("/v1/admin/system/backups").expect(200)).body.last.id).toBe(run.body.id);
  });
});
