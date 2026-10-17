import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

// sharp keeps files open on Windows while they're cached; the temp folders must go.
sharp.cache(false);
const removeDir = (dir: string) => fs.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => undefined);
import { VIDEO_PRESET_PROFILES, VideoProfileSchema, cloudinaryTransformation, ffmpegArgs, ffmpegHlsArgs, parseRenditions, streamHeights } from "../lib/videoProfiles.js";
import { mediaSettingsChanges, mediaSettingsDefaults, mergeMediaSettings } from "../lib/mediaSettings.js";
import { checkVideoUrl, signVideoUpload, videoFrameUrl, videoRenditionUrl, videoStreamUrl, VIDEO_FOLDER } from "../lib/cloudinary.js";
import { ffmpegAvailable, grabFrame, probeVideo, queueConversion, resetFfmpegForTests, runFfmpeg } from "../lib/ffmpeg.js";

// Images and videos (admin → الوسائط): conversion profiles, upload settings, the
// Cloudinary pieces that need no network, the image optimizer, and real ffmpeg
// conversions when ffmpeg is installed (FFMPEG_PATH / FFPROBE_PATH, or on the PATH).

describe("Conversion profiles", () => {
  test("every preset is a valid profile", () => {
    for (const p of Object.values(VIDEO_PRESET_PROFILES)) expect(VideoProfileSchema.safeParse(p).success).toBe(true);
  });

  test("container and codec must go together", () => {
    const web = VIDEO_PRESET_PROFILES.web;
    expect(VideoProfileSchema.safeParse({ ...web, codec: "vp9" }).success).toBe(false);
    expect(VideoProfileSchema.safeParse({ ...web, format: "webm", codec: "h264" }).success).toBe(false);
    expect(VideoProfileSchema.safeParse({ ...web, format: "webm", codec: "av1" }).success).toBe(true);
    expect(VideoProfileSchema.safeParse({ ...web, maxWidth: 1000 }).success).toBe(false);
    expect(VideoProfileSchema.safeParse({ ...web, fps: 75 }).success).toBe(false);
  });

  test("the same profile as a Cloudinary transformation", () => {
    expect(cloudinaryTransformation(VIDEO_PRESET_PROFILES.web)).toBe("vc_h264,w_1280,c_limit,q_auto:good");
    expect(cloudinaryTransformation(VIDEO_PRESET_PROFILES.scroll)).toBe("vc_h264,w_1920,c_limit,q_auto:best,ki_0.05/ac_none");
    expect(cloudinaryTransformation(VIDEO_PRESET_PROFILES.scrollPhone)).toBe("vc_h264,c_fill,ar_9:16,g_center,w_720,q_auto:best,ki_0.05/ac_none");
    expect(cloudinaryTransformation({ ...VIDEO_PRESET_PROFILES.small, fps: 30 })).toBe("vc_vp9,w_854,c_limit,fps_30,q_auto:eco");
  });

  test("…and as ffmpeg arguments", () => {
    const a = ffmpegArgs("in.mov", "out.mp4", VIDEO_PRESET_PROFILES.scroll, 120);
    expect(a).toEqual(expect.arrayContaining(["-c:v", "libx264", "-crf", "18", "-an", "-movflags", "+faststart"]));
    expect(a[a.indexOf("-g") + 1]).toBe("6"); // a key frame every 0.05 s at 120 fps
    expect(a[a.indexOf("-vf") + 1]).toBe("scale='min(1920,iw)':-2");
    const phone = ffmpegArgs("in.mov", "out.mp4", VIDEO_PRESET_PROFILES.scrollPhone);
    expect(phone[phone.indexOf("-vf") + 1]).toBe("crop='min(iw,ih*9/16)':'min(ih,iw*16/9)',scale='min(720,iw)':-2");
    const small = ffmpegArgs("in.mov", "out.webm", VIDEO_PRESET_PROFILES.small);
    expect(small).toEqual(expect.arrayContaining(["-c:v", "libvpx-vp9", "-b:v", "0", "-c:a", "libopus"]));
    expect(small.at(-1)).toBe("out.webm");
  });

  test("a stream's sizes never go above the upload (at least the smallest)", () => {
    expect(streamHeights("full_hd", 1080)).toEqual([1080, 720, 480, 360]);
    expect(streamHeights("full_hd", 720)).toEqual([720, 480, 360]);
    expect(streamHeights("sd", 400)).toEqual([360, 240]);
    expect(streamHeights("sd", 200)).toEqual([240]);
    expect(streamHeights("hd", null)).toEqual([720, 480, 360]);
  });

  test("the stream's ffmpeg command: one scaled copy per size, key frames on every piece", () => {
    const { args, heights } = ffmpegHlsArgs("in.mp4", "out", { ladder: "hd", segmentSeconds: 4 }, { height: 1080, hasAudio: true });
    expect(heights).toEqual([720, 480, 360]);
    expect(args[args.indexOf("-filter_complex") + 1]).toBe("[0:v]split=3[s0][s1][s2];[s0]scale=-2:720[v0];[s1]scale=-2:480[v1];[s2]scale=-2:360[v2]");
    expect(args[args.indexOf("-var_stream_map") + 1]).toBe("v:0,a:0 v:1,a:1 v:2,a:2");
    expect(args[args.indexOf("-force_key_frames") + 1]).toBe("expr:gte(t,n_forced*4)");
    expect(args.at(-1)).toBe("out/v%v/index.m3u8");
    const silent = ffmpegHlsArgs("in.mp4", "out", { ladder: "sd", segmentSeconds: 2 }, { height: 240, hasAudio: false }).args;
    expect(silent[silent.indexOf("-filter_complex") + 1]).toBe("[0:v]scale=-2:240[v0]");
    expect(silent[silent.indexOf("-var_stream_map") + 1]).toBe("v:0");
    expect(silent).not.toContain("-c:a");
  });

  test("saved conversions are read back safely", () => {
    expect(parseRenditions(null)).toEqual([]);
    expect(parseRenditions([{ id: "a", status: "ready" }, null, { nope: 1 }])).toHaveLength(1);
  });
});

describe("Upload settings", () => {
  test("defaults keep the old behaviour, except removing the hidden data from photos", () => {
    const d = mediaSettingsDefaults();
    expect(d.images).toEqual({ maxUploadMb: 10, maxDimension: 0, stripMetadata: true, format: "keep", quality: 0 });
    expect(d.videos).toMatchObject({ maxUploadMb: 500, defaultPreset: "web", autoConvert: true });
  });

  test("saved values field by field; broken ones fall back", () => {
    const m = mergeMediaSettings({ images: { maxUploadMb: 25, format: "gif", quality: 500 }, videos: { defaultPreset: "scroll", nope: 1 } });
    expect(m.images).toMatchObject({ maxUploadMb: 25, format: "keep", quality: 0 });
    expect(m.videos.defaultPreset).toBe("scroll");
    expect(mediaSettingsChanges(mediaSettingsDefaults(), m)).toEqual(["media.images.maxUploadMb", "media.videos.defaultPreset"]);
  });
});

describe("Cloudinary (no network)", () => {
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
    vi.unstubAllGlobals();
  });

  test("the upload signature is Cloudinary's: sorted params + secret, SHA-1", () => {
    const s = signVideoUpload(Date.UTC(2026, 9, 16, 12, 0, 0));
    expect(s.timestamp).toBe(Date.UTC(2026, 9, 16, 12, 0, 0) / 1000);
    const expected = createHash("sha1").update(`folder=${VIDEO_FOLDER}&timestamp=${s.timestamp}very-secret`).digest("hex");
    expect(s.signature).toBe(expected);
    expect(s).toMatchObject({ cloudName: "demo-cloud", apiKey: "123456", folder: VIDEO_FOLDER, uploadUrl: "https://api.cloudinary.com/v1_1/demo-cloud/video/upload" });
    expect(s.chunkBytes).toBeGreaterThanOrEqual(5 * 1024 * 1024);
    expect(JSON.stringify(s)).not.toContain("very-secret");
  });

  test("addresses of a conversion and of a frame", () => {
    const url = videoRenditionUrl("estabrek/videos/rose", "vc_h264,w_1280,c_limit,q_auto:good", "mp4");
    expect(url).toBe("https://res.cloudinary.com/demo-cloud/video/upload/vc_h264,w_1280,c_limit,q_auto:good/v1/estabrek/videos/rose.mp4");
    expect(videoStreamUrl("estabrek/videos/rose", "full_hd")).toBe("https://res.cloudinary.com/demo-cloud/video/upload/sp_full_hd/v1/estabrek/videos/rose.m3u8");
    const frame = videoFrameUrl("estabrek/videos/rose", 2.5, "webp", 1280);
    expect(frame).toMatch(/^https:\/\/res\.cloudinary\.com\/demo-cloud\/video\/upload\/.*so_2\.5.*\/estabrek\/videos\/rose\.webp$/);
    expect(frame).toContain("w_1280");
  });

  test("a conversion is ready (200), still being made (423) or failed (Cloudinary's reason)", async () => {
    const answers: Record<string, Response> = {
      a: new Response(null, { status: 200, headers: { "content-length": "12345" } }),
      b: new Response(null, { status: 423 }),
      c: new Response(null, { status: 400, headers: { "x-cld-error": "Invalid transformation" } }),
    };
    vi.stubGlobal("fetch", async (url: string) => answers[url]);
    expect(await checkVideoUrl("a")).toEqual({ status: "ready", bytes: 12345, error: null });
    expect(await checkVideoUrl("b")).toMatchObject({ status: "processing" });
    expect(await checkVideoUrl("c")).toEqual({ status: "failed", bytes: null, error: "Invalid transformation" });
    vi.stubGlobal("fetch", async () => {
      throw new Error("offline");
    });
    expect((await checkVideoUrl("d")).status).toBe("processing");
  });
});

describe("Images: the admin's settings when saving a photo", () => {
  let dir: string;
  let optimize: (typeof import("../modules/admin/uploads.controller.js"))["optimizeImageInPlace"];
  beforeAll(async () => {
    process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/none";
    process.env.JWT_SECRET ||= "test-secret-at-least-16";
    optimize = (await import("../modules/admin/uploads.controller.js")).optimizeImageInPlace;
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "estabrek-img-"));
  }, 60_000);
  afterAll(async () => {
    await removeDir(dir);
  });

  /** A 3000×2000 photo with camera data, like a phone's. */
  async function photo(name: string) {
    const file = path.join(dir, name);
    await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#c2577f" } })
      .withExif({ IFD0: { Make: "PhoneMaker", Model: "Phone 15", Copyright: "owner" } })
      .jpeg()
      .toFile(file);
    return file;
  }
  const base = mediaSettingsDefaults().images;

  test("the hidden data is removed, and the photo fits the size", async () => {
    const file = await photo("a.jpg");
    expect((await sharp(file).metadata()).exif).toBeTruthy();
    const out = await optimize(file, { ...base, maxDimension: 1200 });
    expect(out.ok).toBe(true);
    const meta = await sharp(out.filePath).metadata();
    expect(meta.exif).toBeUndefined();
    expect([meta.width, meta.height]).toEqual([1200, 800]);
  });

  test("kept when the admin wants it kept", async () => {
    const file = await photo("b.jpg");
    const out = await optimize(file, { ...base, stripMetadata: false, maxDimension: 1200 });
    expect((await sharp(out.filePath).metadata()).exif).toBeTruthy();
  });

  test("another format: a new file with its own name and type", async () => {
    const file = await photo("c.jpg");
    const out = await optimize(file, { ...base, format: "webp", quality: 70 });
    expect(out.filePath.endsWith("c.webp")).toBe(true);
    expect(out.mime).toBe("image/webp");
    expect((await sharp(out.filePath).metadata()).format).toBe("webp");
    await expect(fs.stat(file)).rejects.toThrow();
  });
});

describe("ffmpeg (real conversions, when installed)", async () => {
  resetFfmpegForTests();
  const has = await ffmpegAvailable();
  let dir: string;
  let source: string;
  beforeAll(async () => {
    if (!has) return;
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "estabrek-vid-"));
    source = path.join(dir, "source.mp4");
    // 2 s, 1280×720, 60 fps, with a tone: a stand-in for an upload.
    await runFfmpeg([
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=60:duration=2",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", source,
    ]);
  }, 120_000);
  afterAll(async () => {
    if (dir) await removeDir(dir);
  });

  test.skipIf(!has)("reads a video's length, size, frame rate and sound", async () => {
    const info = await probeVideo(source);
    expect(info).toMatchObject({ width: 1280, height: 720, fps: 60, codec: "h264", hasAudio: true });
    expect(info.durationMs).toBeGreaterThan(1900);
    expect(info.durationMs).toBeLessThan(2200);
  });

  test.skipIf(!has)("the scroll preset: silent, key frame every 0.05 s", async () => {
    const out = path.join(dir, "scroll.mp4");
    await runFfmpeg(ffmpegArgs(source, out, VIDEO_PRESET_PROFILES.scroll, 60));
    const info = await probeVideo(out);
    expect(info).toMatchObject({ width: 1280, height: 720, codec: "h264", hasAudio: false });
  }, 120_000);

  test.skipIf(!has)("the phone preset is cut to 9:16 and 720 wide at most", async () => {
    const out = path.join(dir, "phone.mp4");
    await runFfmpeg(ffmpegArgs(source, out, VIDEO_PRESET_PROFILES.scrollPhone, 60));
    const info = await probeVideo(out);
    expect(info.height).toBe(720);
    expect(info.width).toBe(404); // 720 × 9/16 = 405 → even
  }, 120_000);

  test.skipIf(!has)("the small preset makes a WebM (VP9) at 854 wide, 30 fps when asked", async () => {
    const out = path.join(dir, "small.webm");
    await runFfmpeg(ffmpegArgs(source, out, { ...VIDEO_PRESET_PROFILES.small, fps: 30 }, 60));
    const info = await probeVideo(out);
    expect(info).toMatchObject({ width: 854, codec: "vp9", fps: 30 });
  }, 180_000);

  test.skipIf(!has)("a frame becomes an image", async () => {
    const out = path.join(dir, "frame.webp");
    await grabFrame(source, 1.25, out, 640);
    const meta = await sharp(out).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 640, height: 360 });
  }, 60_000);

  test.skipIf(!has)("an adaptive stream: a master playlist, one playlist per size, pieces of 1 s", async () => {
    const out = path.join(dir, "stream");
    await fs.mkdir(out, { recursive: true });
    const { args } = ffmpegHlsArgs(source, out, { ladder: "hd", segmentSeconds: 1 }, { height: 720, hasAudio: true });
    await runFfmpeg(args);
    const master = await fs.readFile(path.join(out, "master.m3u8"), "utf8");
    expect(master.match(/#EXT-X-STREAM-INF/g)).toHaveLength(3);
    expect(master).toContain("RESOLUTION=1280x720");
    expect(master).toContain("RESOLUTION=640x360");
    expect(master).toContain("v0/index.m3u8");
    const sizes = await fs.readFile(path.join(out, "v2", "index.m3u8"), "utf8");
    expect(sizes).toContain("#EXT-X-ENDLIST");
    expect(sizes.match(/piece_\d+\.ts/g)?.length).toBe(2); // 2 s of video in 1 s pieces
    const piece = await probeVideo(path.join(out, "v2", "piece_000.ts"));
    expect(piece).toMatchObject({ height: 360, codec: "h264", hasAudio: true });
  }, 180_000);

  test.skipIf(!has)("conversions wait their turn", async () => {
    const order: number[] = [];
    await Promise.all([1, 2, 3].map((n) => queueConversion(async () => { await new Promise((r) => setTimeout(r, 30 - n * 10)); order.push(n); })));
    expect(order).toEqual([1, 2, 3]);
  });

  test.skipIf(!has)("a broken file says why", async () => {
    const bad = path.join(dir, "bad.mp4");
    await fs.writeFile(bad, "not a video");
    await expect(probeVideo(bad)).rejects.toThrow();
  });
});
