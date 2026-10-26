/**
 * ffmpeg on the server, for videos kept on the server's disk (no Cloudinary):
 * reading a video's details, conversions (one at a time) and frames as images.
 * FFMPEG_PATH / FFPROBE_PATH point at the programs when they aren't on the PATH.
 * Without ffmpeg, videos still upload and play; conversions and frames say so.
 */
import { spawn } from "node:child_process";
import { recordJobRun } from "./jobs.js";

export const ffmpegPath = () => process.env.FFMPEG_PATH || "ffmpeg";
export const ffprobePath = () => process.env.FFPROBE_PATH || "ffprobe";

type Run = { code: number | null; stdout: string; stderr: string };

function run(cmd: string, args: string[], timeoutMs: number): Promise<Run> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let child;
    try {
      child = spawn(cmd, args, { windowsHide: true });
    } catch (e) {
      return reject(e);
    }
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 20_000) stderr = stderr.slice(-10_000);
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

let available: Promise<boolean> | null = null;

/** ffmpeg and ffprobe can be started (checked once). */
export function ffmpegAvailable(): Promise<boolean> {
  if (!available) {
    available = Promise.all([run(ffmpegPath(), ["-version"], 5_000), run(ffprobePath(), ["-version"], 5_000)])
      .then(([a, b]) => a.code === 0 && b.code === 0)
      .catch(() => false);
  }
  return available;
}

export type VideoInfo = { durationMs: number | null; width: number | null; height: number | null; fps: number | null; codec: string | null; hasAudio: boolean };

function rate(value: unknown): number | null {
  const [a, b] = String(value ?? "").split("/").map(Number);
  if (!Number.isFinite(a) || !a) return null;
  const r = b ? a / b : a;
  return Number.isFinite(r) && r > 0 ? Math.round(r * 1000) / 1000 : null;
}

export async function probeVideo(file: string): Promise<VideoInfo> {
  const out = await run(ffprobePath(), ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], 30_000);
  if (out.code !== 0) throw new Error(lastLine(out.stderr) || "ffprobe failed");
  const json = JSON.parse(out.stdout || "{}");
  const streams: any[] = Array.isArray(json.streams) ? json.streams : [];
  const v = streams.find((s) => s.codec_type === "video");
  if (!v) throw new Error("No video track");
  const duration = Number(json.format?.duration ?? v.duration);
  return {
    durationMs: Number.isFinite(duration) ? Math.round(duration * 1000) : null,
    width: Number(v.width) || null,
    height: Number(v.height) || null,
    fps: rate(v.avg_frame_rate) ?? rate(v.r_frame_rate),
    codec: v.codec_name ?? null,
    hasAudio: streams.some((s) => s.codec_type === "audio"),
  };
}

function lastLine(text: string) {
  return text.trim().split(/\r?\n/).filter(Boolean).slice(-2).join(" ").slice(0, 300);
}

export async function runFfmpeg(args: string[], timeoutMs = 60 * 60_000) {
  const out = await run(ffmpegPath(), args, timeoutMs);
  if (out.code !== 0) throw new Error(lastLine(out.stderr) || `ffmpeg stopped (${out.code})`);
}

/** The frame at `seconds` as an image file (format from the extension: .webp, .jpg, .png). */
export async function grabFrame(input: string, seconds: number, output: string, width = 1600) {
  await runFfmpeg(
    ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(Math.max(0, seconds)), "-i", input, "-frames:v", "1", "-vf", `scale='min(${width},iw)':-2`, output],
    120_000,
  );
}

/* One conversion at a time: they use every core. */
let chain: Promise<unknown> = Promise.resolve();
let waiting = 0;

export function queueConversion<T>(job: () => Promise<T>): Promise<T> {
  waiting += 1;
  // Each conversion is a run of the videoConvert job (admin → المهام بالخلفية).
  const counted = () => recordJobRun("videoConvert", "event", job);
  const next = chain.then(counted, counted);
  chain = next.catch(() => undefined).finally(() => {
    waiting -= 1;
  });
  return next;
}

export const conversionsWaiting = () => waiting;

/** Tests: look for ffmpeg again. */
export function resetFfmpegForTests() {
  available = null;
}
