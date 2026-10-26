import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import { releaseOrder, revokeOrderInTx } from "../modules/fulfillment/fulfillment.service.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readEncryptedZip } from "../modules/protected/zipAes.js";

const SEVEN = [process.env.SEVEN_ZIP, "C:/Program Files/7-Zip/7z.exe", "/usr/bin/7z"].find((p) => p && fs.existsSync(p));

// Protected products with the database: the seeded p1 (size cvariant01) becomes a
// protected digital product. Requests without a token run as the test owner.

const base = "/v1/admin/catalog/products/p1/protected";
const SCRIPT = "import sys\nprint('ok')\n";

const binary = (res: any, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on("data", (c: Buffer) => chunks.push(c));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
};

async function clean() {
  await prisma.licence.deleteMany();
  await prisma.protectedFile.deleteMany();
  await prisma.protectedFileType.deleteMany();
  await resetDb();
  await prisma.productType.deleteMany({ where: { slug: "scripts" } });
}

async function order(qty = 1) {
  const r = await request(app).post("/v1/catalog/order-requests").send({ items: [{ variantId: "cvariant01", quantity: qty }], customerName: "ليلى خوري", phone: "0599111222" });
  expect([200, 201]).toContain(r.status);
  return String(r.body.id);
}
const tokenOf = async (id: string) => (await prisma.orderRequest.findUniqueOrThrow({ where: { id }, select: { accessToken: true } })).accessToken!;
const page = async (id: string) => (await request(app).get(`/v1/orders/access/${await tokenOf(id)}`).expect(200)).body;
const download = async (id: string, licenceId: string) => request(app).post(`/v1/orders/access/${await tokenOf(id)}/licences/${licenceId}`).buffer(true).parse(binary);

beforeEach(async () => {
  await clean();
  await seedCatalog();
  const t = await prisma.productType.create({ data: { name: "سكربتات", slug: "scripts", fulfillment: "DIGITAL", showColor: false, showSize: false } });
  await prisma.product.update({ where: { id: "p1" }, data: { typeId: t.id, isProtected: true, licenceHours: 24, licenceDownloads: 2 } });
  await request(app).post(base).attach("file", Buffer.from(SCRIPT), "tool.py").expect(201);
});
afterAll(clean);

describe("Protected products", () => {
  test("the master goes in encrypted; the list says where the mark goes", async () => {
    const stl = Buffer.alloc(84);
    const up = await request(app).post(base).attach("file", stl, "part.stl").expect(201);
    expect(up.body).toMatchObject({ name: "part.stl", ext: "stl", placed: "inside", mode: "stl" });
    await request(app).post(base).attach("file", Buffer.from([0x4d, 0x5a, 0, 1]), "app.exe").expect(201);
    const list = await request(app).get(base).expect(200);
    expect(list.body).toMatchObject({ isProtected: true, hours: 24, downloads: 2, defaults: { hours: 24, downloads: 3 } });
    expect(list.body.files.map((f: any) => [f.name, f.placed])).toEqual([["tool.py", "inside"], ["part.stl", "inside"], ["app.exe", "package"]]);
    const row = await prisma.protectedFile.findFirstOrThrow({ where: { name: "tool.py" } });
    expect(Buffer.from(row.dataEnc!).includes(Buffer.from("print('ok')"))).toBe(false);
  });

  test("paid: a serial per piece; her copy opens with it and carries her mark; the limit holds", async () => {
    const id = await order(2);
    await releaseOrder(id, "paid");
    const p = await page(id);
    expect(p.licences).toHaveLength(2);
    expect(p.licences[0]).toMatchObject({ title: "Blue Shirt", expired: false, downloadsLeft: 2, maxDownloads: 2, ready: true });
    expect(p.licences[0].serial).toMatch(/^ESTB(-[0-9A-Z]{4}){5}$/);
    expect(p.licences[0].serial).not.toBe(p.licences[1].serial);
    // The plain file isn't offered for a protected product.
    expect(p.files).toEqual([]);

    const first = p.licences[0];
    const res = await download(id, first.id);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/zip/);
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename="blue-shirt-[0-9A-Z]{6}\.zip"/);
    const files = readEncryptedZip(res.body, first.serial);
    expect(files.map((f) => f.name)).toEqual(["tool.py", "LICENCE.txt"]);
    const lic = await prisma.licence.findUniqueOrThrow({ where: { id: first.id } });
    expect(files[0].data.toString()).toBe(`${SCRIPT}# Licensed copy for order ${id.slice(-6).toUpperCase()} - personal use only - estb:${lic.markId}\n`);
    expect(files[1].data.toString("utf8")).toContain(`estb:${lic.markId}`);
    expect(() => readEncryptedZip(res.body, p.licences[1].serial)).toThrow();
    // The real tool opens the real download with her serial.
    if (SEVEN) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "estb-dl-"));
      try {
        fs.writeFileSync(path.join(dir, "copy.zip"), res.body);
        const x = spawnSync(SEVEN, ["x", `-p${first.serial}`, `-o${path.join(dir, "out")}`, "-y", path.join(dir, "copy.zip")], { encoding: "utf8" });
        expect(x.status, x.stdout + x.stderr).toBe(0);
        expect(fs.readFileSync(path.join(dir, "out", "tool.py"), "utf8")).toContain(`estb:${lic.markId}`);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }

    expect((await download(id, first.id)).status).toBe(200);
    const third = await download(id, first.id);
    expect(third.status).toBe(429);
    expect((await page(id)).licences[0].downloadsLeft).toBe(0);
    expect(await prisma.licenceDownload.count({ where: { licenceId: first.id } })).toBe(2);

    // The owner renews: a new window and the downloads again.
    await request(app).post(`/v1/admin/orders/${id}/delivery/licences/${first.id}/renew`).expect(200);
    expect((await page(id)).licences[0].downloadsLeft).toBe(2);
    expect((await download(id, first.id)).status).toBe(200);
  });

  test("the window closes; a cancelled order's serials stop and come back when it's released again", async () => {
    const id = await order();
    await releaseOrder(id, "accepted");
    const [l] = (await page(id)).licences;
    await prisma.licence.update({ where: { id: l.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const late = await download(id, l.id);
    expect(late.status).toBe(410);
    expect(JSON.parse(late.body.toString()).error).toBe("LICENCE_EXPIRED");
    expect((await page(id)).licences[0].expired).toBe(true);

    await prisma.licence.update({ where: { id: l.id }, data: { expiresAt: new Date(Date.now() + 3600_000) } });
    await prisma.$transaction((tx) => revokeOrderInTx(tx, id));
    expect((await prisma.licence.findUniqueOrThrow({ where: { id: l.id } })).status).toBe("revoked");
    expect((await page(id)).licences).toEqual([]);
    await releaseOrder(id, "manual");
    expect((await page(id)).licences.map((x: any) => x.id)).toEqual([l.id]);
    // Released again: no extra serial.
    expect(await prisma.licence.count({ where: { orderRequestId: id } })).toBe(1);
  });

  test("the owner: last 4 only until she asks; stop and restore one serial", async () => {
    const id = await order();
    await releaseOrder(id, "accepted");
    const card = await request(app).get(`/v1/admin/orders/${id}/delivery`).expect(200);
    expect(card.body.sellsLicences).toBe(true);
    expect(card.body.licences).toHaveLength(1);
    const l = card.body.licences[0];
    expect(l).toMatchObject({ status: "active", downloads: 0, maxDownloads: 2, ready: true });
    expect(JSON.stringify(card.body)).not.toMatch(/ESTB-/);
    const full = await request(app).post(`/v1/admin/orders/${id}/delivery/licences/${l.id}/reveal`).expect(200);
    expect(full.body.serial.endsWith(l.last4)).toBe(true);

    await request(app).post(`/v1/admin/orders/${id}/delivery/licences/${l.id}/stop`).expect(200);
    const stopped = await download(id, l.id);
    expect(stopped.status).toBe(410);
    expect(JSON.parse(stopped.body.toString()).error).toBe("LICENCE_STOPPED");
    // Stopped by the owner: releasing the order again doesn't bring it back.
    await releaseOrder(id, "manual");
    expect((await prisma.licence.findUniqueOrThrow({ where: { id: l.id } })).status).toBe("revoked");
    await request(app).post(`/v1/admin/orders/${id}/delivery/licences/${l.id}/restore`).expect(200);
    expect((await download(id, l.id)).status).toBe(200);
  });

  test("a leaked file leads to its order; another order's serial can't open this one", async () => {
    const id = await order();
    await releaseOrder(id, "paid");
    const [l] = (await page(id)).licences;
    const files = readEncryptedZip((await download(id, l.id)).body, l.serial);
    const traced = await request(app).post("/v1/admin/orders/protected-trace").attach("file", files[0].data, "leaked.py").expect(200);
    expect(traced.body.found).toHaveLength(1);
    expect(traced.body.found[0]).toMatchObject({ order: { id, customerName: "ليلى خوري" }, product: { id: "p1" }, downloads: 1 });
    const pasted = await request(app).post("/v1/admin/orders/protected-trace").send({ text: "someone posted: estb:ZZZZZZZZZZ" }).expect(200);
    expect(pasted.body).toMatchObject({ marks: ["ZZZZZZZZZZ"], found: [] });
    // A licence from another order isn't reachable through this order's link.
    const other = await order();
    await releaseOrder(other, "paid");
    const [ol] = (await page(other)).licences;
    expect((await download(id, ol.id)).status).toBe(404);
  });

  test("the plain file of a protected product can't be fetched; file types can be changed", async () => {
    const id = await order();
    await releaseOrder(id, "paid");
    const f = await prisma.productFile.create({ data: { productId: "p1", name: "raw.py", kind: "link", url: "https://example.com/raw.py" } });
    await request(app).post(`/v1/orders/access/${await tokenOf(id)}/files/${f.id}`).expect(404);

    const put = await request(app).put("/v1/admin/catalog/protected-types/rbxmx").send({ label: "Roblox XML", mode: "comment", commentStart: "<!--", commentEnd: "-->" }).expect(200);
    expect(put.body.types.find((t: any) => t.ext === "rbxmx")).toMatchObject({ mode: "comment", builtIn: false });
    await request(app).put("/v1/admin/catalog/protected-types/x y").send({ label: "x", mode: "package" }).expect(400);
    await request(app).put("/v1/admin/catalog/protected-types/nut").send({ label: "Squirrel", mode: "comment" }).expect(400);
    const del = await request(app).delete("/v1/admin/catalog/protected-types/rbxmx").expect(200);
    expect(del.body.types.find((t: any) => t.ext === "rbxmx")).toMatchObject({ mode: "package", builtIn: true });
  });

  test("files not uploaded yet: the serial is there, the download waits", async () => {
    await prisma.protectedFile.deleteMany();
    const id = await order();
    await releaseOrder(id, "paid");
    const [l] = (await page(id)).licences;
    expect(l.ready).toBe(false);
    const r = await download(id, l.id);
    expect(r.status).toBe(409);
    expect(JSON.parse(r.body.toString()).error).toBe("NOT_READY");
    // Not counted.
    expect((await prisma.licence.findUniqueOrThrow({ where: { id: l.id } })).downloads).toBe(0);
  });
});
