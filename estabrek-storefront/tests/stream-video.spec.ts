import { test, expect, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isStreamUrl } from "../src/components/StreamVideo";

// A page's video section playing an adaptive stream (HLS) from the video library:
// it plays in pieces, the browser's download button is gone, and plain MP4 links
// are still plain videos. The stream is made here with ffmpeg (FFMPEG_PATH or the
// PATH); without ffmpeg the playback test is skipped.

const MOCK = "http://127.0.0.1:4100";
const STREAM_DIR = path.join(os.tmpdir(), "estabrek-test-stream");
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const hasFfmpeg = spawnSync(ffmpeg, ["-version"], { windowsHide: true }).status === 0;

async function useStream(page: Page, on: boolean) {
  await page.request.get(`${MOCK}/__test/stream?on=${on ? 1 : 0}`);
  await page.request.post("/api/revalidate", { data: { tags: ["cms:pages", "cms"] } });
}

test("stream links are told apart from files", () => {
  expect(isStreamUrl("https://res.cloudinary.com/x/video/upload/sp_full_hd/v1/a.m3u8")).toBe(true);
  expect(isStreamUrl("/uploads/videos/a/b/master.m3u8?t=1")).toBe(true);
  expect(isStreamUrl("https://x/a.mp4", "HLS")).toBe(true);
  expect(isStreamUrl("https://x/a.mp4")).toBe(false);
  expect(isStreamUrl(null)).toBe(false);
});

test.describe("A stream on a page", () => {
  test.skip(!hasFfmpeg, "needs ffmpeg to make the test stream");

  test.beforeAll(() => {
    fs.rmSync(STREAM_DIR, { recursive: true, force: true });
    fs.mkdirSync(STREAM_DIR, { recursive: true });
    // 6 s at 720p and 360p, pieces of 2 s: what the video library makes (ffmpegHlsArgs).
    const out = spawnSync(
      ffmpeg,
      [
        "-y", "-hide_banner", "-loglevel", "error",
        "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=6",
        "-filter_complex", "[0:v]split=2[s0][s1];[s0]scale=-2:720[v0];[s1]scale=-2:360[v1]",
        "-map", "[v0]", "-c:v:0", "libx264", "-b:v:0", "2800k",
        "-map", "[v1]", "-c:v:1", "libx264", "-b:v:1", "800k",
        "-preset", "veryfast", "-pix_fmt", "yuv420p", "-force_key_frames", "expr:gte(t,n_forced*2)",
        "-f", "hls", "-hls_time", "2", "-hls_playlist_type", "vod", "-hls_flags", "independent_segments",
        "-hls_segment_filename", `${STREAM_DIR}/v%v/piece_%03d.ts`, "-master_pl_name", "master.m3u8",
        "-var_stream_map", "v:0 v:1", `${STREAM_DIR}/v%v/index.m3u8`,
      ],
      { windowsHide: true },
    );
    if (out.status !== 0) throw new Error(String(out.stderr));
  });

  test.afterAll(async ({ request }) => {
    await request.get(`${MOCK}/__test/stream?on=0`);
    await request.post("/api/revalidate", { data: { tags: ["cms:pages", "cms"] } });
    fs.rmSync(STREAM_DIR, { recursive: true, force: true });
  });

  test("plays in pieces, without a download button", async ({ page }) => {
    const pieces: string[] = [];
    page.on("request", (r) => {
      if (/\/stream\/v\d\/piece_\d+\.ts$/.test(r.url())) pieces.push(r.url());
    });
    await useStream(page, true);
    await page.goto("/");
    const video = page.locator('video[data-stream="hls"]');
    await video.scrollIntoViewIfNeeded();
    await expect(video).toHaveAttribute("controlslist", "nodownload");
    await video.evaluate((el: HTMLVideoElement) => {
      el.muted = true;
      return el.play();
    });
    await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime), { timeout: 20_000 }).toBeGreaterThan(1);
    // Pieces, not one file: the first ones came, the rest only as it plays.
    expect(pieces.length).toBeGreaterThan(0);
    expect(pieces.length).toBeLessThan(6);
    expect(await video.evaluate((el: HTMLVideoElement) => el.error)).toBeNull();
  });
});
