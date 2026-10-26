import { describe, test, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";
import { cutoutFailure, cutoutUrl, fetchCutout, publicIdFromUrl } from "../lib/cloudCutout.js";
import { applyMediaSettings, mediaSettingsDefaults } from "../lib/mediaSettings.js";

// «شيل الخلفية» with Cloudinary, without a network or a database: Cloudinary's answers
// are stubbed (fetch) and so are the media rows (prisma). Also: a cut-out saved as a new
// picture (keepAsNew) and its transparency kept when the store saves photos as JPEG.

sharp.cache(false);

const db = vi.hoisted(() => ({
  mediaAsset: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  mediaFolder: { upsert: vi.fn() },
}));
const dedup = vi.hoisted(() => ({ findDuplicateMediaAsset: vi.fn() }));
vi.mock("../lib/prisma.js", () => ({ prisma: db }));
vi.mock("../lib/mediaDedup.js", () => dedup);

const CLOUD_KEYS = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const;
const savedEnv: Record<string, string | undefined> = {};
const setCloud = (on: boolean) => {
  if (on) {
    process.env.CLOUDINARY_CLOUD_NAME = "shop-cloud";
    process.env.CLOUDINARY_API_KEY = "123456";
    process.env.CLOUDINARY_API_SECRET = "very-secret";
  } else for (const k of CLOUD_KEYS) delete process.env[k];
};

let uploads: typeof import("../modules/admin/uploads.controller.js");
let app: express.Express;

beforeAll(async () => {
  for (const k of CLOUD_KEYS) savedEnv[k] = process.env[k];
  process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/none";
  process.env.JWT_SECRET ||= "test-secret-at-least-16";
  uploads = await import("../modules/admin/uploads.controller.js");
  app = express();
  app.use(express.json());
  app.use("/uploads", uploads.default);
}, 60_000);

afterAll(() => {
  for (const k of CLOUD_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  applyMediaSettings(mediaSettingsDefaults());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const on = () => applyMediaSettings({ ...mediaSettingsDefaults(), images: { ...mediaSettingsDefaults().images, cloudCutout: true } });
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
const answer = (status: number, headers: Record<string, string> = {}, body: BodyInit | null = null) => new Response(body, { status, headers });

describe("A picture's place on Cloudinary", () => {
  test("its public id, from the address the store saved", () => {
    const base = "https://res.cloudinary.com/shop-cloud/image/upload";
    expect(publicIdFromUrl(`${base}/v1761400000/products/rose-bag.jpg`, "shop-cloud")).toBe("products/rose-bag");
    expect(publicIdFromUrl(`${base}/f_auto,q_auto/v12/a/b/c.webp`, "shop-cloud")).toBe("a/b/c");
    expect(publicIdFromUrl(`${base}/w_400/c_fill,h_300/shoe.png`, "shop-cloud")).toBe("shoe");
    expect(publicIdFromUrl(`${base}/v1/my%20photo.jpeg`, "shop-cloud")).toBe("my photo");
  });

  test("not ours, not an upload, not an image, or not an address → none", () => {
    expect(publicIdFromUrl("https://res.cloudinary.com/other/image/upload/v1/x.jpg", "shop-cloud")).toBeNull();
    expect(publicIdFromUrl("https://res.cloudinary.com/shop-cloud/image/fetch/v1/x.jpg", "shop-cloud")).toBeNull();
    expect(publicIdFromUrl("https://res.cloudinary.com/shop-cloud/video/upload/v1/x.mp4", "shop-cloud")).toBeNull();
    expect(publicIdFromUrl("https://evil.example/shop-cloud/image/upload/v1/x.jpg", "shop-cloud")).toBeNull();
    expect(publicIdFromUrl("http://localhost:4000/uploads/images/x.jpg", "shop-cloud")).toBeNull();
    expect(publicIdFromUrl("not a url", "shop-cloud")).toBeNull();
    expect(publicIdFromUrl("https://res.cloudinary.com/shop-cloud/image/upload/v1/x.jpg", undefined)).toBeNull();
  });

  test("the cut-out's address is signed, a PNG, with the background removal effect", () => {
    cloudinary.config({ cloud_name: "shop-cloud", api_key: "123456", api_secret: "very-secret", secure: true });
    const url = cutoutUrl(cloudinary, "products/rose-bag");
    expect(url).toMatch(/^https:\/\/res\.cloudinary\.com\/shop-cloud\/image\/upload\/s--[^/]+--\/e_background_removal\/(v1\/)?products\/rose-bag\.png(\?_a=[\w-]+)?$/);
    expect(cutoutUrl(cloudinary, "x", true)).toContain("e_background_removal:fineedges_y");
  });
});

describe("Waiting for Cloudinary", () => {
  const clock = () => {
    let t = 0;
    return { now: () => t, sleep: async (ms: number) => void (t += ms) };
  };

  test("423 while it works, then the PNG", async () => {
    const answers = [answer(423), answer(420), answer(200, { "content-type": "image/png" }, PNG)];
    const fetch = vi.fn(async () => answers.shift()!);
    const out = await fetchCutout("u", { fetch, ...clock() });
    expect(out).toEqual({ ok: true, png: PNG });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  test("gives up after the time limit", async () => {
    const out = await fetchCutout("u", { fetch: async () => answer(423), ...clock(), timeoutMs: 10_000, everyMs: 3_000 });
    expect(out).toMatchObject({ ok: false, status: 504, error: "CLOUD_CUTOUT_TIMEOUT" });
  });

  test("Cloudinary's refusals become a clear reason", async () => {
    expect(cutoutFailure(403, "")).toMatchObject({ status: 409, error: "CLOUD_CUTOUT_NOT_ENABLED" });
    expect(cutoutFailure(400, "Background removal is not enabled for this account")).toMatchObject({ error: "CLOUD_CUTOUT_NOT_ENABLED" });
    expect(cutoutFailure(420, "Monthly transformation quota exceeded")).toMatchObject({ status: 429, error: "CLOUD_CUTOUT_QUOTA" });
    expect(cutoutFailure(404, "Resource not found")).toMatchObject({ status: 404, error: "NOT_FOUND_ON_CLOUDINARY" });
    expect(cutoutFailure(400, "Invalid transformation")).toEqual({ status: 502, error: "CLOUD_CUTOUT_FAILED", message: "Invalid transformation" });
    const out = await fetchCutout("u", { fetch: async () => answer(401, { "x-cld-error": "Not allowed" }), ...clock() });
    expect(out).toEqual({ ok: false, status: 409, error: "CLOUD_CUTOUT_NOT_ENABLED", message: "Not allowed" });
    const offline = await fetchCutout("u", { fetch: async () => Promise.reject(new Error("offline")), ...clock() });
    expect(offline).toMatchObject({ ok: false, error: "CLOUD_CUTOUT_FAILED", message: "offline" });
  });
});

describe("POST /admin/uploads/background-removal", () => {
  const url = "https://res.cloudinary.com/shop-cloud/image/upload/v1761400000/products/rose-bag.jpg";

  test("off by default: the status says so and the cut is refused", async () => {
    applyMediaSettings(mediaSettingsDefaults());
    setCloud(true);
    const got = await request(app).get("/uploads/background-removal").expect(200);
    expect(got.body).toEqual({ cloudinary: { on: false, ready: true, transformations: 75 } });
    const res = await request(app).post("/uploads/background-removal").send({ url }).expect(409);
    expect(res.body.error).toBe("CLOUD_CUTOUT_OFF");
  });

  test("switched on but the store has no Cloudinary", async () => {
    on();
    setCloud(false);
    expect((await request(app).get("/uploads/background-removal")).body.cloudinary).toMatchObject({ on: true, ready: false });
    const res = await request(app).post("/uploads/background-removal").send({ url }).expect(409);
    expect(res.body.error).toBe("CLOUDINARY_NOT_CONFIGURED");
  });

  test("a picture that isn't on the store's Cloudinary, or no picture at all", async () => {
    on();
    setCloud(true);
    expect((await request(app).post("/uploads/background-removal").send({}).expect(400)).body.error).toBe("BAD_REQUEST");
    const other = await request(app).post("/uploads/background-removal").send({ url: "https://res.cloudinary.com/other/image/upload/v1/x.jpg" }).expect(400);
    expect(other.body.error).toBe("NOT_ON_CLOUDINARY");
    db.mediaAsset.findUnique.mockResolvedValueOnce({ provider: "LOCAL", providerId: null });
    expect((await request(app).post("/uploads/background-removal").send({ assetId: "a1" }).expect(400)).body.error).toBe("NOT_ON_CLOUDINARY");
  });

  test("the PNG comes back once Cloudinary is ready; the original isn't touched", async () => {
    on();
    setCloud(true);
    const asked: string[] = [];
    const answers = [answer(423), answer(200, { "content-type": "image/png" }, PNG)];
    vi.stubGlobal("fetch", async (u: string) => {
      asked.push(u);
      return answers.shift()!;
    });
    const res = await request(app).post("/uploads/background-removal").send({ url }).buffer(true).parse((r, cb) => {
      const parts: Buffer[] = [];
      r.on("data", (c: Buffer) => parts.push(c));
      r.on("end", () => cb(null, Buffer.concat(parts)));
    });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(Buffer.compare(res.body as Buffer, PNG)).toBe(0);
    expect(asked).toHaveLength(2);
    expect(asked[0]).toMatch(/\/image\/upload\/s--[^/]+--\/e_background_removal\/.*products\/rose-bag\.png(\?_a=[\w-]+)?$/);
  }, 15_000);

  test("by the media item's id, with finer edges", async () => {
    on();
    setCloud(true);
    db.mediaAsset.findUnique.mockResolvedValueOnce({ provider: "CLOUDINARY", providerId: "products/cat" });
    const asked: string[] = [];
    vi.stubGlobal("fetch", async (u: string) => {
      asked.push(u);
      return answer(200, {}, PNG);
    });
    await request(app).post("/uploads/background-removal").send({ assetId: "a2", fineEdges: true }).expect(200);
    expect(asked[0]).toContain("e_background_removal:fineedges_y");
    expect(asked[0]).toContain("products/cat.png");
  });

  test("the account can't remove backgrounds: a clear message", async () => {
    on();
    setCloud(true);
    vi.stubGlobal("fetch", async () => answer(403, { "x-cld-error": "Background removal is not allowed on this plan" }));
    const res = await request(app).post("/uploads/background-removal").send({ url }).expect(409);
    expect(res.body).toEqual({ error: "CLOUD_CUTOUT_NOT_ENABLED", message: "Background removal is not allowed on this plan" });
  });
});

describe("Saving the cut-out", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "estabrek-cutout-"));
  });
  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 5 }).catch(() => undefined);
  });

  /** A 400×300 product on transparency (or on white). */
  const picture = async (file: string, transparent: boolean) => {
    const bg = transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : { r: 255, g: 255, b: 255, alpha: 1 };
    const product = await sharp({ create: { width: 200, height: 150, channels: 4, background: { r: 194, g: 87, b: 127, alpha: 1 } } }).png().toBuffer();
    await sharp({ create: { width: 400, height: 300, channels: 4, background: bg } }).composite([{ input: product, left: 100, top: 75 }]).png().toFile(file);
    return file;
  };

  test("a store that saves photos as JPEG still keeps a cut-out's transparency", async () => {
    setCloud(false);
    const base = { ...mediaSettingsDefaults().images, format: "jpeg" as const };
    const cut = await uploads.optimizeImageInPlace(await picture(path.join(dir, "cut.png"), true), base);
    expect(cut.filePath.endsWith("cut.png")).toBe(true);
    const meta = await sharp(cut.filePath).metadata();
    expect(meta.hasAlpha).toBe(true);
    expect((await sharp(cut.filePath).stats()).isOpaque).toBe(false);
    // An opaque PNG still becomes a JPEG, as before.
    const flat = await uploads.optimizeImageInPlace(await picture(path.join(dir, "flat.png"), false), base);
    expect(flat.filePath.endsWith("flat.jpg")).toBe(true);
  });

  test("keepAsNew: a new media item even when it looks like one we have", async () => {
    setCloud(false);
    applyMediaSettings(mediaSettingsDefaults());
    const req = { headers: {}, protocol: "http", get: () => "localhost:4000" };
    const existing = { id: "old", filename: "old.png", displayName: "old.png", folder: null, tags: [], mime: "image/png", size: 1, width: 400, height: 300, blurDataUrl: "x", createdAt: new Date(), updatedAt: new Date(), provider: "LOCAL" };
    dedup.findDuplicateMediaAsset.mockResolvedValue(existing);
    db.mediaAsset.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "new", ...data, createdAt: new Date(), updatedAt: new Date() }));
    await fs.mkdir(uploads.IMAGES_DIR, { recursive: true });
    const names = [`test-cutout-${Date.now()}-a.png`, `test-cutout-${Date.now()}-b.png`];
    try {
      for (const n of names) await picture(path.join(uploads.IMAGES_DIR, n), true);
      const size = (await fs.stat(path.join(uploads.IMAGES_DIR, names[0]))).size;
      const same = await uploads.ingestImages(req, [{ filename: names[0], originalname: "rose.png", mimetype: "image/png", size }], { folder: null, tags: [] });
      expect("files" in same && same.files[0].id).toBe("old");
      expect(db.mediaAsset.create).not.toHaveBeenCalled();

      const fresh = await uploads.ingestImages(req, [{ filename: names[1], originalname: "rose-cutout.png", mimetype: "image/png", size }], { folder: "products", tags: ["cutout"], keepAsNew: true });
      expect("files" in fresh && fresh.files[0].id).toBe("new");
      expect(dedup.findDuplicateMediaAsset).toHaveBeenCalledTimes(1);
      expect(db.mediaAsset.create).toHaveBeenCalledTimes(1);
      expect(db.mediaAsset.create.mock.calls[0][0].data).toMatchObject({ folder: "products", tags: ["cutout"], displayName: "rose-cutout.png", mime: "image/png" });
    } finally {
      for (const n of names) await fs.rm(path.join(uploads.IMAGES_DIR, n), { force: true }).catch(() => undefined);
    }
  });
});
