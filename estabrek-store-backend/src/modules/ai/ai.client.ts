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
import { getDefaultOpenAIModel, getOpenAIEmbeddingModel, getOpenAIVisionModel, openaiEmbedText, openaiResponsesJson } from "../../lib/openai.js";
import { AppError } from "../../utils/httpError.js";
import { NO_KEY_NEEDED, aiOf, type AiFeature } from "./ai.settings.js";
import { aiServerOf, ownEmbed, ownEmbedName, ownEmbedSet, ownJson, ownPicturesModel, ownServerSet, type AiServer } from "./ownModel.js";

export type AiPrompt = { system: string; user: string; images?: string[]; maxTokens?: number };
export type AiProvider = {
  json: <T>(p: AiPrompt) => Promise<{ ok: true; data: T } | { ok: false; error: string }>;
  /** Edits a photo (e.g. a clean background); returns PNG bytes. */
  editImage: (image: Buffer, prompt: string) => Promise<{ ok: true; png: Buffer } | { ok: false; error: string }>;
  /** Numbers for search by meaning (tests' stand-ins may leave it out). */
  embed?: (texts: string[]) => Promise<{ ok: true; vectors: number[][]; model: string } | { ok: false; error: string }>;
};

/**
 * What a call is counted under (AiUsage.feature): an AI switch, or one of the shop's older uses that
 * have no switch of their own (search by meaning, the plain chat, the picks, the page editor's old tools).
 */
export type AiUse = AiFeature | "search" | "oldChat" | "recommend" | "pagesTools";

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
/** Pictures can be read: OpenAI, or an own model that reads pictures (the words model, or its own pictures model). */
export const aiVisionReady = (header: unknown) => aiKeyReady() || Boolean(ownPicturesModel(aiServerOf(header)));
/** Search by meaning can make its numbers: the own server's search model, or OpenAI's. */
export const aiEmbedReady = (header: unknown) => ownEmbedSet(aiServerOf(header)) || aiKeyReady();
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

async function countUse(feature: AiUse) {
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
export async function aiJson<T>(feature: AiUse, p: AiPrompt): Promise<T> {
  if (!providerSwapped) {
    const server = await currentServer();
    if (ownServerSet(server)) {
      const picturesModel = ownPicturesModel(server);
      if (!p.images?.length || picturesModel) {
        await countUse(feature);
        const own = await ownJson<T>(server, p, p.images?.length ? { model: picturesModel } : {});
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

/**
 * The same door for the shop's older callers that never throw (the plain chat, the picks, the page
 * editor's old tools): {ok, data} or {ok: false, error}. A shopper's call (shopper: true) also stops
 * at the owner's daily ceiling, and counts towards it.
 */
export async function aiAsk<T>(use: AiUse, p: AiPrompt, opts: { shopper?: boolean } = {}): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    if (opts.shopper) {
      const s = await prisma.siteSettings.findFirst({ select: { header: true } });
      if ((await publicCallsToday()) >= aiOf(s?.header).dailyLimit) return { ok: false, error: "The shop's AI is resting for today" };
    }
    return { ok: true, data: await aiJson<T>(use, p) };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "AI failed" };
  }
}

/* ---------------- Search by meaning (embeddings) ---------------- */

/** The name of the numbers search compares now (Product.embeddingModel), or null when nothing makes them. */
export async function currentEmbedModel(): Promise<string | null> {
  if (providerSwapped) return provider.embed ? "test-embed" : null;
  const server = await currentServer();
  if (ownEmbedSet(server)) return ownEmbedName(server);
  return aiKeyReady() ? getOpenAIEmbeddingModel() : null;
}

/**
 * Numbers for each text, from the own server's search model when it has one, else OpenAI's. Every
 * vector says which model made it: numbers from two models are never compared.
 */
export async function aiEmbed(texts: string[], use: AiUse = "search"): Promise<{ ok: true; vectors: number[][]; model: string } | { ok: false; error: string }> {
  if (!texts.length) return { ok: true, vectors: [], model: (await currentEmbedModel()) ?? "" };
  if (providerSwapped) {
    if (!provider.embed) return { ok: false, error: "No search model" };
    await countUse(use);
    return provider.embed(texts);
  }
  const server = await currentServer();
  if (ownEmbedSet(server)) {
    await countUse(use);
    const r = await ownEmbed(server, texts);
    if (!r.ok) console.warn(`[ai] ${use} embeddings on the own model server failed:`, r.error.slice(0, 300));
    return r;
  }
  if (!aiKeyReady()) return { ok: false, error: "No search model" };
  await countUse(use);
  const vectors: number[][] = [];
  let model = getOpenAIEmbeddingModel();
  for (const t of texts) {
    const r = await openaiEmbedText(t);
    if (!r.ok) return { ok: false, error: r.error };
    vectors.push(r.embedding);
    model = r.model;
  }
  return { ok: true, vectors, model };
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
