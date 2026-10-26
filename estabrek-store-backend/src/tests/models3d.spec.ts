import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { glbHeader, GLB_MAX_BYTES } from "../lib/glb.js";
import { MODEL_FOLDER, signModelUpload } from "../lib/cloudinary.js";

// The store's own 3D models for a gaming theme's stage (admin → ثيمات المتجر → محرّر المشهد):
// a file is kept only if it is a binary glTF 2.0, and Cloudinary uploads are signed for
// the models folder as raw files. The shop's test model is a real .glb (its make-test-glb.py).

const SHOP_GLB = path.resolve(__dirname, "../../../estabrek-storefront/tests/fixtures/stage-box.glb");

describe("binary glTF files", () => {
  test("a real .glb passes, with its length", async () => {
    const file = new Uint8Array(await fs.readFile(SHOP_GLB));
    expect(glbHeader(file.slice(0, 12), file.byteLength)).toEqual({ ok: true, length: file.byteLength });
    expect(glbHeader(file.slice(0, 12))).toEqual({ ok: true, length: file.byteLength });
  });

  test("anything else is refused, and why", async () => {
    const file = new Uint8Array(await fs.readFile(SHOP_GLB));
    expect(glbHeader(file.slice(0, 8))).toEqual({ ok: false, reason: "TOO_SHORT" });
    expect(glbHeader(new TextEncoder().encode('{"asset":{"version":"2.0"}}'))).toEqual({ ok: false, reason: "NOT_GLB" });
    const v1 = file.slice(0, 12);
    new DataView(v1.buffer).setUint32(4, 1, true);
    expect(glbHeader(v1)).toEqual({ ok: false, reason: "NOT_GLTF2" });
    // A cut-off upload: the header says more than arrived.
    expect(glbHeader(file.slice(0, 12), file.byteLength - 100)).toEqual({ ok: false, reason: "WRONG_LENGTH" });
    expect(GLB_MAX_BYTES).toBe(25 * 1024 * 1024);
  });
});

describe("Cloudinary: model uploads", () => {
  const saved = { ...process.env };
  beforeAll(() => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "123456";
    process.env.CLOUDINARY_API_SECRET = "very-secret";
  });
  afterAll(() => {
    process.env.CLOUDINARY_CLOUD_NAME = saved.CLOUDINARY_CLOUD_NAME;
    process.env.CLOUDINARY_API_KEY = saved.CLOUDINARY_API_KEY;
    process.env.CLOUDINARY_API_SECRET = saved.CLOUDINARY_API_SECRET;
  });

  test("signed for the models folder, sent as a raw file, the secret never in it", () => {
    const s = signModelUpload(Date.UTC(2026, 9, 25, 12, 0, 0));
    const expected = createHash("sha1").update(`folder=${MODEL_FOLDER}&timestamp=${s.timestamp}very-secret`).digest("hex");
    expect(s.signature).toBe(expected);
    expect(s).toMatchObject({ cloudName: "demo-cloud", apiKey: "123456", folder: "estabrek/models", uploadUrl: "https://api.cloudinary.com/v1_1/demo-cloud/raw/upload" });
    expect(JSON.stringify(s)).not.toContain("very-secret");
  });
});
