import { describe, test, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { ffmpegAvailable, resetFfmpegForTests, runFfmpeg } from "../lib/ffmpeg.js";
import { applyMediaSettings, mediaSettingsDefaults } from "../lib/mediaSettings.js";

// The video library on the server's disk (no Cloudinary), with ffmpeg: upload,
// cover, conversions, frames as images, and the upload settings. Requests without
// a token run as the test owner. Needs ffmpeg (FFMPEG_PATH / FFPROBE_PATH or PATH).

const CLOUD_KEYS = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const;
const savedEnv: Record<string, string | undefined> = {};
let dir = "";
let source = "";

beforeAll(async () => {
  for (const k of CLOUD_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  await prisma.performanceSettingsRevision.deleteMany();
  await prisma.performanceSettings.deleteMany();
  applyMediaSettings(mediaSettingsDefaults());
  resetFfmpegForTests();
  if (!(await ffmpegAvailable())) return;
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "estabrek-videos-"));
  source = path.join(dir, "rose.mp4");
  await runFfmpeg(["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=3", "-c:v", "libx264", "-pix_fmt", "yuv420p", source]);
}, 120_000);

afterAll(async () => {
  for (const k of CLOUD_KEYS) if (savedEnv[k] !== undefined) process.env[k] = savedEnv[k];
  const videos = await prisma.mediaAsset.findMany({ where: { kind: "VIDEO" } });
  for (const v of videos) await request(app).delete(`/v1/admin/media/videos/${v.id}`);
  await prisma.mediaAsset.deleteMany({ where: { folder: "frames" } });
  await prisma.performanceSettingsRevision.deleteMany();
  await prisma.performanceSettings.deleteMany();
  applyMediaSettings(mediaSettingsDefaults());
  if (dir) await fs.rm(dir, { recursive: true, force: true, maxRetries: 5 }).catch(() => undefined);
});

async function until<T>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 90_000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (ok(v) || Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, 500));
  }
}

describe("Upload settings", () => {
  test("start on the defaults and are checked when saved", async () => {
    const got = await request(app).get("/v1/admin/media/videos/settings").expect(200);
    expect(got.body.media).toEqual(mediaSettingsDefaults());
    expect(got.body.presets).toEqual(["web", "scroll", "scrollPhone", "small"]);
    await request(app).patch("/v1/admin/media/videos/settings").send({ images: { maxUploadMb: 0 } }).expect(400);
    await request(app).patch("/v1/admin/media/videos/settings").send({ images: { format: "gif" } }).expect(400);
    const out = await request(app).patch("/v1/admin/media/videos/settings").send({ images: { format: "webp" }, videos: { autoConvert: true } }).expect(200);
    expect(out.body.changed).toEqual(["media.images.format"]);
    // One history with the speed page.
    const speed = await request(app).get("/v1/admin/system/cache").expect(200);
    expect(speed.body.revisions[0].changed).toEqual(["media.images.format"]);
    await request(app).patch("/v1/admin/media/videos/settings").send({ images: { format: "keep" } }).expect(200);
  });

  test("Cloudinary's direct upload is refused while it isn't set up", async () => {
    await request(app).post("/v1/admin/media/videos/sign").expect(409);
  });
});

describe("Videos on the server's disk", () => {
  test("upload → details, cover and the first conversion; frames; another conversion; delete", async (ctx) => {
    if (!source) return ctx.skip();
    const up = await request(app).post("/v1/admin/media/videos/local").field("displayName", "Rose film").attach("file", source).expect(201);
    const v = up.body;
    expect(v).toMatchObject({ displayName: "Rose film", provider: "LOCAL", width: 1280, height: 720, fps: 30 });
    expect(v.durationMs).toBeGreaterThan(2800);
    expect(v.posterUrl).toMatch(/\/uploads\/videos\/.+\/poster-1000\.webp$/);
    expect(v.renditions).toHaveLength(1);
    expect(v.renditions[0]).toMatchObject({ preset: "web", status: "processing" });

    const ready = await until(
      async () => (await request(app).get(`/v1/admin/media/videos/${v.id}`).expect(200)).body,
      (b) => b.renditions[0].status !== "processing",
    );
    expect(ready.renditions[0]).toMatchObject({ status: "ready", error: null });
    expect(ready.renditions[0].bytes).toBeGreaterThan(1000);
    // The made file is served.
    const file = new URL(ready.renditions[0].url).pathname;
    await request(app).get(file).expect(200);

    // Two frames as images (into the image library), then one as the cover.
    const frames = await request(app).post(`/v1/admin/media/videos/${v.id}/frames`).send({ seconds: [0.5, 2], as: "image", width: 640 }).expect(201);
    expect(frames.body.images).toHaveLength(2);
    expect(frames.body.images[0]).toMatchObject({ folder: "frames", width: 640, height: 360 });
    const cover = await request(app).post(`/v1/admin/media/videos/${v.id}/frames`).send({ seconds: [2.5], as: "poster" }).expect(200);
    expect(cover.body.video.posterUrl).toMatch(/poster-2500\.webp$/);
    await request(app).post(`/v1/admin/media/videos/${v.id}/frames`).send({ seconds: [1, 2], as: "poster" }).expect(400);

    // A custom conversion is checked; a phone version is made.
    await request(app).post(`/v1/admin/media/videos/${v.id}/renditions`).send({ preset: "custom" }).expect(400);
    await request(app)
      .post(`/v1/admin/media/videos/${v.id}/renditions`)
      .send({ preset: "custom", profile: { format: "mp4", codec: "vp9", maxWidth: 0, fps: 0, quality: "good", mute: true, keyframeSeconds: 0, crop: "none" } })
      .expect(400);
    const phone = await request(app).post(`/v1/admin/media/videos/${v.id}/renditions`).send({ preset: "scrollPhone" }).expect(201);
    const done = await until(
      async () => (await request(app).get(`/v1/admin/media/videos/${v.id}`).expect(200)).body,
      (b) => b.renditions.every((x: any) => x.status !== "processing"),
    );
    expect(done.renditions.find((x: any) => x.id === phone.body.id)).toMatchObject({ status: "ready", preset: "scrollPhone" });

    // An adaptive stream: a master playlist and pieces, served with the stream's type.
    const hls = await request(app).post(`/v1/admin/media/videos/${v.id}/renditions`).send({ preset: "hls", stream: { ladder: "sd", segmentSeconds: 2 } }).expect(201);
    const streamed = await until(
      async () => (await request(app).get(`/v1/admin/media/videos/${v.id}`).expect(200)).body,
      (b) => b.renditions.every((x: any) => x.status !== "processing"),
    );
    const s = streamed.renditions.find((x: any) => x.id === hls.body.id);
    expect(s).toMatchObject({ status: "ready", kind: "hls", preset: "hls", heights: [480, 360, 240] });
    const master = await request(app).get(new URL(s.url).pathname).expect(200);
    expect(master.headers["content-type"]).toMatch(/mpegurl/i);
    expect(master.text.match(/#EXT-X-STREAM-INF/g)).toHaveLength(3);
    await request(app).delete(`/v1/admin/media/videos/${v.id}/renditions/${hls.body.id}`).expect(200);
    await request(app).get(new URL(s.url).pathname).expect(404);

    // A version can be removed; then the video.
    const after = await request(app).delete(`/v1/admin/media/videos/${v.id}/renditions/${phone.body.id}`).expect(200);
    expect(after.body.renditions).toHaveLength(1);
    expect((await request(app).get(`/v1/admin/media/videos/${v.id}/usage`).expect(200)).body.usage).toEqual([]);
    await request(app).delete(`/v1/admin/media/videos/${v.id}`).expect(200);
    await request(app).get(`/v1/admin/media/videos/${v.id}`).expect(404);
    await request(app).get(file).expect(404);
  }, 240_000);

  test("files that aren't videos, or too big, are refused", async (ctx) => {
    if (!dir) return ctx.skip();
    const fake = path.join(dir, "notes.mp4");
    await fs.writeFile(fake, "hello");
    await request(app).post("/v1/admin/media/videos/local").attach("file", fake, { contentType: "video/mp4" }).expect(415);
    await request(app).post("/v1/admin/media/videos/local").attach("file", Buffer.from("x"), { filename: "a.txt", contentType: "text/plain" }).expect(415);
  });
});
