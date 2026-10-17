import { describe, expect, it } from "vitest";
import { codecsFor, durationText, frameTimes, isVideoFile, profileSummary, renditionSummary, renditionsLine, speedText, timeText } from "./videoText";
import { contentRange, planChunks, sendInChunks, type SendPiece } from "../../lib/chunkedUpload";
import type { Rendition } from "../../api/videos.api";

const MB = 1024 * 1024;

describe("video words", () => {
  it("profiles, times and counts", () => {
    expect(profileSummary({ format: "mp4", codec: "h264", maxWidth: 1920, fps: 0, quality: "best", mute: true, keyframeSeconds: 0.05, crop: "none" })).toBe(
      "MP4 · H.264 · 1920px · أعلى جودة · بدون صوت · إطار رئيسي كل 0.05 ث",
    );
    expect(profileSummary({ format: "webm", codec: "vp9", maxWidth: 0, fps: 30, quality: "eco", mute: false, keyframeSeconds: 0, crop: "phone" })).toBe(
      "WEBM · VP9 · الحجم الأصلي · 9:16 · 30 إطار · توفير",
    );
    expect(codecsFor("webm")).toEqual(["vp9", "av1"]);
    expect(renditionSummary({ kind: "hls", profile: null, stream: { ladder: "hd", segmentSeconds: 4 }, heights: [720, 480, 360] })).toBe("HLS · 720p، 480p، 360p · قطع 4 ث");
    expect(renditionSummary({ kind: "hls", profile: null, stream: { ladder: "sd", segmentSeconds: 2 }, heights: null })).toBe("HLS · لحد 480p (نت بطيء) · قطع 2 ث");
    expect(durationText(65_400)).toBe("1:05");
    expect(durationText(null)).toBe("—");
    expect(timeText(2.5)).toBe("0:02.50");
    expect(timeText(71.25)).toBe("1:11.25");
    expect(renditionsLine([])).toBe("ما في نسخ محوّلة");
    expect(renditionsLine([{ status: "ready" }, { status: "ready" }, { status: "processing" }] as Rendition[])).toBe("2 جاهزة · 1 عم تنعمل");
    expect(speedText(4.2 * MB, 4.2 * MB * 90)).toBe("4.2 MB/ث · باقي دقيقة");
    expect(isVideoFile({ name: "a.MOV", type: "" })).toBe(true);
    expect(isVideoFile({ name: "a.gif", type: "image/gif" })).toBe(false);
  });

  it("frames through the video, never past the end, at most 24", () => {
    expect(frameTimes(3000, 1)).toEqual([0, 1, 2]);
    expect(frameTimes(60_000, 1)).toHaveLength(24);
    expect(frameTimes(null, 1)).toEqual([]);
    expect(frameTimes(3000, 0)).toEqual([]);
  });
});

describe("sending a video in pieces", () => {
  it("pieces of at least 5 MB, the last one shorter", () => {
    expect(planChunks(45 * MB, 20 * MB)).toEqual([
      { start: 0, end: 20 * MB },
      { start: 20 * MB, end: 40 * MB },
      { start: 40 * MB, end: 45 * MB },
    ]);
    expect(planChunks(12 * MB, 1 * MB)).toHaveLength(3); // 5 MB minimum
    expect(contentRange({ start: 0, end: 20 * MB }, 45 * MB)).toBe(`bytes 0-${20 * MB - 1}/${45 * MB}`);
  });

  const file = new Blob([new Uint8Array(12 * MB)]);

  it("sends every piece once and returns Cloudinary's last answer", async () => {
    const ranges: string[] = [];
    const send: SendPiece = async (piece, range) => {
      ranges.push(contentRange(range, file.size));
      expect(piece.size).toBe(range.end - range.start);
      return { status: 200, body: range.end === file.size ? { public_id: "estabrek/videos/rose", duration: 3 } : { done: false } };
    };
    const progress: number[] = [];
    const state = { offset: 0, result: null };
    const out = await sendInChunks({ file, chunkBytes: 5 * MB, state, send, signal: new AbortController().signal, onProgress: (s) => progress.push(s) });
    expect(out).toMatchObject({ public_id: "estabrek/videos/rose" });
    expect(ranges).toHaveLength(3);
    expect(progress.at(-1)).toBe(file.size);
  });

  it("a piece that fails is sent again; a paused upload continues where it stopped", async () => {
    let calls = 0;
    const send: SendPiece = async (_p, range) => {
      calls += 1;
      if (calls === 2) throw new Error("Network error"); // the second piece fails once
      return { status: 200, body: range.end === file.size ? { public_id: "v" } : {} };
    };
    const state = { offset: 0, result: null };
    await sendInChunks({ file, chunkBytes: 5 * MB, state, send, signal: new AbortController().signal, backoffMs: 1 });
    expect(calls).toBe(4);

    // Continue from 10 MB: only the last piece goes.
    let resumed = 0;
    const again = { offset: 10 * MB, result: null };
    await sendInChunks({
      file,
      chunkBytes: 5 * MB,
      state: again,
      send: async (_p, range) => {
        resumed += 1;
        expect(range.start).toBe(10 * MB);
        return { status: 200, body: { public_id: "v" } };
      },
      signal: new AbortController().signal,
    });
    expect(resumed).toBe(1);
  });

  it("a refusal (4xx) isn't tried again; stopping keeps the offset", async () => {
    let calls = 0;
    await expect(
      sendInChunks({
        file,
        chunkBytes: 5 * MB,
        state: { offset: 0, result: null },
        send: async () => {
          calls += 1;
          return { status: 400, body: { error: { message: "Invalid Signature" } } };
        },
        signal: new AbortController().signal,
        backoffMs: 1,
      }),
    ).rejects.toThrow("Invalid Signature");
    expect(calls).toBe(1);

    const stop = new AbortController();
    const state = { offset: 0, result: null };
    await expect(
      sendInChunks({
        file,
        chunkBytes: 5 * MB,
        state,
        send: async (_p, range) => {
          if (range.start > 0) stop.abort();
          return { status: 200, body: {} };
        },
        signal: stop.signal,
      }),
    ).rejects.toThrow();
    expect(state.offset).toBe(10 * MB);
  });
});
