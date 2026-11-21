/**
 * The one door to the AI provider. Everything goes through here so that:
 * nothing runs without a model to ask (OPENAI_API_KEY, or the store's own
 * model server: ownModel.ts), each call is counted per feature and day (the
 * owner sees the cost), shoppers can't run up the bill past the daily limit,
 * saved answers are reused, and tests can swap the provider.
 *
 * Words go to the own server when the owner chose it; pictures read go there
 * only when it reads pictures (else to OpenAI when its key is there);
 * pictures made (the photo studio) are OpenAI's only.
 */
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { getDefaultOpenAIModel, getOpenAIVisionModel, openaiResponsesJson } from "../../lib/openai.js";
import { AppError } from "../../utils/httpError.js";
import { NO_KEY_NEEDED, type AiFeature } from "./ai.settings.js";
import { aiServerOf, ownJson, ownServerSet, type AiServer } from "./ownModel.js";

export type AiPrompt = { system: string; user: string; images?: string[]; maxTokens?: number };
export type AiProvider = {
  json: <T>(p: AiPrompt) => Promise<{ ok: true; data: T } | { ok: false; error: string }>;
  /** Edits a photo (e.g. a clean background); returns PNG bytes. */
  editImage: (image: Buffer, prompt: string) => Promise<{ ok: true; png: Buffer } | { ok: false; error: string }>;
};

const openai: AiProvider = {
  async json<T>(p: AiPrompt) {
    const content: unknown[] = [{ type: "input_text", text: p.user }];
    for (const url of p.images ?? []) content.push({ type: "input_image", image_url: url });
    const r = await openaiResponsesJson<T>({
      model: p.images?.length ? getOpenAIVisionModel() : getDefaultOpenAIModel(),
      input: [
        { role: "system", content: [{ type: "input_text", text: p.system }] },
        { role: "user", content },
      ],
      max_output_tokens: p.maxTokens ?? 1200,
    });
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
  },
  async editImage(image, prompt) {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) return { ok: false, error: "OPENAI_API_KEY is not set" };
    try {
      const form = new FormData();
      form.set("model", process.env.OPENAI_IMAGE_EDIT_MODEL?.trim() || "gpt-image-1");
      form.set("prompt", prompt);
      form.set("image", new Blob([new Uint8Array(image)], { type: "image/png" }), "piece.png");
      const res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
      const json = (await res.json().catch(() => ({}))) as { data?: Array<{ b64_json?: string }>; error?: { message?: string } };
      const b64 = json.data?.[0]?.b64_json;
      if (!res.ok || !b64) return { ok: false, error: json.error?.message ?? `OpenAI ${res.status}` };
      return { ok: true, png: Buffer.from(b64, "base64") };
    } catch (e) {
      return { ok: false, error: (e as Error)?.message ?? "image edit failed" };
    }
  },
};

let provider: AiProvider = openai;
let providerSwapped = false;

/** Tests: a fake provider (and the key counts as present). */
export function setAiProvider(p: AiProvider | null) {
  provider = p ?? openai;
  providerSwapped = Boolean(p);
}

/** OpenAI's key is there (or the tests' stand-in provider). */
export const aiKeyReady = () => providerSwapped || Boolean(process.env.OPENAI_API_KEY?.trim());

/** Words can be written: OpenAI, or the own model server the owner set up (header = SiteSettings.header). */
export const aiTextReady = (header: unknown) => aiKeyReady() || ownServerSet(aiServerOf(header));
/** Pictures can be read: OpenAI, or an own model that reads pictures. */
export const aiVisionReady = (header: unknown) => {
  const s = aiServerOf(header);
  return aiKeyReady() || (ownServerSet(s) && s.vision);
};
/** Pictures can be made (the photo studio): OpenAI only. */
export const aiImageEditReady = () => aiKeyReady();

/** What one feature needs to run: plain rules nothing, the photo studio OpenAI, the product writer pictures read, the rest words. */
export function aiReadyFor(feature: AiFeature, header: unknown): boolean {
  if (NO_KEY_NEEDED.has(feature)) return true;
  if (feature === "photoStudio") return aiImageEditReady();
  if (feature === "productWriter") return aiVisionReady(header);
  return aiTextReady(header);
}

/** The own server as saved, read again at most every few seconds (forgotten when the owner saves it). */
let serverMemo: { at: number; value: Promise<AiServer> } | null = null;
function currentServer(): Promise<AiServer> {
  if (serverMemo && Date.now() - serverMemo.at < 5000) return serverMemo.value;
  const value = prisma.siteSettings.findFirst({ select: { header: true } }).then((s) => aiServerOf(s?.header));
  serverMemo = { at: Date.now(), value };
  value.catch(() => {
    serverMemo = null;
  });
  return value;
}
export function forgetAiServer() {
  serverMemo = null;
}

const today = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

async function countUse(feature: AiFeature) {
  await prisma.aiUsage.upsert({
    where: { day_feature: { day: today(), feature } },
    create: { day: today(), feature, count: 1 },
    update: { count: { increment: 1 } },
  });
}

/** The features shoppers start (the daily ceiling covers them together). */
export const PUBLIC_FEATURES: readonly AiFeature[] = ["smartSearch", "shopTheLook", "sizeAdvice", "reviewSummary", "shopAgent"];

/** Shoppers' AI calls today (all public features together). */
export async function publicCallsToday() {
  const rows = await prisma.aiUsage.findMany({ where: { day: today(), feature: { in: [...PUBLIC_FEATURES] } } });
  return rows.reduce((s, r) => s + r.count, 0);
}

export async function aiUsage(days = 30) {
  const since = new Date(today().getTime() - (days - 1) * 864e5);
  const rows = await prisma.aiUsage.findMany({ where: { day: { gte: since } } });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.feature] = (out[r.feature] ?? 0) + r.count;
  return out;
}

/** Ask for JSON. Throws AI_FAILED (502) when the provider fails, so callers can show a calm message. */
export async function aiJson<T>(feature: AiFeature, p: AiPrompt): Promise<T> {
  if (!providerSwapped) {
    const server = await currentServer();
    if (ownServerSet(server)) {
      if (!p.images?.length || server.vision) {
        await countUse(feature);
        const own = await ownJson<T>(server, p);
        if (!own.ok) {
          console.warn(`[ai] ${feature} on the own model server failed:`, own.error.slice(0, 300));
          throw new AppError(502, "AI_FAILED", `The store's own model didn't answer: ${own.error}`);
        }
        return own.data;
      }
      // Pictures, and the own model doesn't read them: OpenAI when its key is there.
      if (!aiKeyReady()) throw new AppError(409, "AI_NO_VISION", "The store's own model doesn't read pictures");
    }
  }
  if (!aiKeyReady()) throw new AppError(404, "AI_OFF", "AI is not set up");
  await countUse(feature);
  const r = await provider.json<T>(p);
  if (!r.ok) {
    console.warn(`[ai] ${feature} failed:`, r.error.slice(0, 300));
    throw new AppError(502, "AI_FAILED", "The AI didn't answer, try again");
  }
  return r.data;
}

export async function aiEditImage(feature: AiFeature, image: Buffer, prompt: string) {
  if (!aiKeyReady()) throw new AppError(404, "AI_OFF", "AI is not set up");
  await countUse(feature);
  const r = await provider.editImage(image, prompt);
  if (!r.ok) {
    console.warn(`[ai] ${feature} failed:`, r.error.slice(0, 300));
    throw new AppError(502, "AI_FAILED", "The AI didn't answer, try again");
  }
  return r.png;
}

/* ---------------- Saved answers ---------------- */

export const cacheKey = (...parts: unknown[]) => createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 40);

export async function cached<T>(key: string, hours: number, make: () => Promise<T>): Promise<T> {
  const hit = await prisma.aiCache.findUnique({ where: { key } });
  if (hit && hit.expiresAt.getTime() > Date.now()) return hit.value as T;
  const value = await make();
  const expiresAt = new Date(Date.now() + hours * 3600_000);
  await prisma.aiCache.upsert({
    where: { key },
    create: { key, value: value as Prisma.InputJsonValue, expiresAt },
    update: { value: value as Prisma.InputJsonValue, expiresAt },
  });
  // Old answers go now and then.
  if (Math.random() < 0.02) await prisma.aiCache.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => undefined);
  return value;
}

/** Clips untrusted text before it goes into a prompt. */
export const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
