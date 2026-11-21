/**
 * The store's own model server (admin → الذكاء الاصطناعي → وين بيشتغل): any server that speaks
 * OpenAI's chat-completions language (Ollama, LM Studio, vLLM, llama.cpp, a rented GPU box, or a
 * hosted service with an OpenAI-style address). Kept in SiteSettings.header.aiServer; its key sealed
 * (lib/secretBox.ts) and never sent back to the admin.
 *
 * The call is made by this server, so in production it is hemmed in like a function's call to a site
 * (lib/fnHttp.ts): https only, and the name must point out on the internet (never this machine or the
 * network it sits in). Outside production plain http and this machine are allowed, for a model on
 * the developer's own computer.
 */
import http from "node:http";
import https from "node:https";
import sharp from "sharp";
import { z } from "zod";
import type { AiPrompt } from "./ai.client.js";
import { safeLookup } from "../../lib/fnHttp.js";
import { open } from "../../lib/secretBox.js";
import { loadImageFromUrl } from "../../lib/imageEmbeddings.js";

export const AI_SERVER_KINDS = ["openai", "own"] as const;
export type AiServerKind = (typeof AI_SERVER_KINDS)[number];

export const AiServerSchema = z.object({
  kind: z.enum(AI_SERVER_KINDS).catch("openai").default("openai"),
  /** The server's address, e.g. https://models.example.com/v1 (…/chat/completions is added). */
  url: z.string().trim().max(300).catch("").default(""),
  /** The model's name on that server, e.g. "allam-7b-instruct" or "qwen2.5:7b". */
  model: z.string().trim().max(120).catch("").default(""),
  /** The model reads pictures too (product writer from photos, pictures' descriptions). */
  vision: z.boolean().catch(false).default(false),
  /** Another model on the same server for pictures (e.g. "qwen3-vl:4b"); "" = the words model when it reads them. */
  visionModel: z.string().trim().max(120).catch("").default(""),
  /** A model on the same server for search by meaning (embeddings, e.g. "bge-m3"); "" = none (OpenAI's when its key is there). */
  embedModel: z.string().trim().max(120).catch("").default(""),
  /** The server's key, sealed; null = none (Ollama and LM Studio need none). */
  key: z.string().max(4000).nullable().catch(null).default(null),
});
export type AiServer = z.infer<typeof AiServerSchema>;

export const aiServerOf = (header: unknown): AiServer => {
  const raw = header && typeof header === "object" ? (header as Record<string, unknown>).aiServer : undefined;
  return AiServerSchema.parse(raw && typeof raw === "object" ? raw : {});
};

/** What the admin may see of it: never the key, only whether there is one. */
export const aiServerView = (s: AiServer) => ({ kind: s.kind, url: s.url, model: s.model, vision: s.vision, visionModel: s.visionModel, embedModel: s.embedModel, hasKey: Boolean(s.key) });

/** The own server is set up enough to be called. */
export const ownServerSet = (s: AiServer) => s.kind === "own" && Boolean(s.url) && Boolean(s.model);
/** The model on the own server that reads pictures: its own, or the words model when it reads them; "" = none. */
export const ownPicturesModel = (s: AiServer) => (ownServerSet(s) ? s.visionModel || (s.vision ? s.model : "") : "");
/** The own server makes the numbers search by meaning compares (embeddings). */
export const ownEmbedSet = (s: AiServer) => s.kind === "own" && Boolean(s.url) && Boolean(s.embedModel);
/** How a vector made by the own server is named in the database (Product.embeddingModel), apart from OpenAI's. */
export const ownEmbedName = (s: AiServer) => `own:${s.embedModel}`;

const isProduction = () => process.env.NODE_ENV === "production";

/**
 * The chat-completions address for what the owner wrote: "https://host" or "https://host/v1" get
 * "/v1/chat/completions" or "/chat/completions"; an address that already ends so is kept. Throws the
 * reason in words when it can't be used.
 */
export function ownModelEndpoint(written: string, production = isProduction()): URL {
  let u: URL;
  try {
    u = new URL(written.trim());
  } catch {
    throw new Error("The address isn't one (it starts with https://)");
  }
  if (u.protocol !== "https:" && !(u.protocol === "http:" && !production)) throw new Error("The address starts with https://");
  if (u.username || u.password) throw new Error("An address doesn't carry a name and password: put the key in its own field");
  if (u.search || u.hash) throw new Error("The address has no ? or # part");
  const path = u.pathname.replace(/\/+$/, "");
  u.pathname = /\/chat\/completions$/.test(path) ? path : path === "" ? "/v1/chat/completions" : `${path}/chat/completions`;
  return u;
}

export const OWN_MODEL_LIMITS = { ms: 90_000, answer: 4_000_000 } as const;

/** The embeddings address next to the chat one (…/v1/embeddings). */
export function ownEmbedEndpoint(written: string, production = isProduction()): URL {
  const u = ownModelEndpoint(written, production);
  u.pathname = u.pathname.replace(/\/chat\/completions$/, "/embeddings");
  return u;
}

export type OwnTransport = (req: { url: URL; headers: Record<string, string>; body: string; ms: number }) => Promise<{ status: number; text: string }>;

const overNetwork: OwnTransport = ({ url, headers, body, ms }) =>
  new Promise((done, fail) => {
    const secure = url.protocol === "https:";
    const lib = secure ? https : http;
    const req = lib.request(
      {
        method: "POST",
        host: url.hostname.replace(/^\[|\]$/g, ""),
        servername: secure ? url.hostname : undefined,
        port: url.port || (secure ? 443 : 80),
        path: url.pathname,
        headers: { ...headers, "content-length": String(Buffer.byteLength(body)) },
        // In production the name must point out on the internet (lib/fnHttp.ts safeLookup).
        lookup: isProduction() ? safeLookup : undefined,
        agent: false,
        timeout: ms,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size > OWN_MODEL_LIMITS.answer) return res.destroy(Object.assign(new Error("The answer is too big"), { code: "TOO_BIG" }));
          chunks.push(c);
        });
        res.on("end", () => done({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", fail);
      },
    );
    const timer = setTimeout(() => req.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })), ms);
    req.on("timeout", () => req.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })));
    req.on("error", fail);
    req.on("close", () => clearTimeout(timer));
    req.end(body);
  });

let transport: OwnTransport = overNetwork;
/** Tests: the network stood in for (null: the real one again). */
export function setOwnModelTransportForTests(t: OwnTransport | null) {
  transport = t ?? overNetwork;
}

/**
 * A picture sent inside the request (data: URL), not as a link: servers like Ollama read only that,
 * and the model's server may not reach the shop's pictures anyway. Made smaller (1024 px, JPEG)
 * to keep the request light. A picture that can't be read is left out (the model gets the words).
 */
export type PictureLoader = (url: string) => Promise<{ buffer: Buffer; mime: string } | null>;
const PICTURE_BYTES = 8 * 1024 * 1024;

/** An https picture fetched by this server: the name must point out on the internet, no redirect, 15 s, 8 MB. */
const safeGet = (url: URL): Promise<{ buffer: Buffer; mime: string } | null> =>
  new Promise((done) => {
    const req = https.request(
      { method: "GET", host: url.hostname, servername: url.hostname, port: url.port || 443, path: `${url.pathname}${url.search}`, lookup: safeLookup, agent: false, timeout: 15_000 },
      (res) => {
        if ((res.statusCode ?? 0) !== 200) {
          res.resume();
          return done(null);
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size > PICTURE_BYTES) {
            res.destroy();
            return done(null);
          }
          chunks.push(c);
        });
        res.on("end", () => done({ buffer: Buffer.concat(chunks), mime: String(res.headers["content-type"] ?? "").split(";")[0] }));
        res.on("error", () => done(null));
      },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => done(null));
    req.end();
  });

const defaultLoader: PictureLoader = async (url) => {
  // The shop's own pictures (/uploads on disk or in the database) are read where they are.
  if (url.startsWith("/uploads/")) return loadImageFromUrl(url);
  if (!isProduction()) return loadImageFromUrl(url);
  // On the live server: https only, and never an address inside the network.
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password) return null;
  return safeGet(u);
};
let loadPicture: PictureLoader = defaultLoader;
export function setPictureLoaderForTests(f: PictureLoader | null) {
  loadPicture = f ?? defaultLoader;
}

export async function inlinePicture(url: string): Promise<string | null> {
  if (url.startsWith("data:image/")) return url;
  const got = await loadPicture(url).catch(() => null);
  if (!got?.buffer?.length) return null;
  try {
    const jpg = await sharp(got.buffer).rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * The JSON object in a model's words: a reasoning model's <think>…</think> and ``` fences are
 * dropped, then the first {…} that reads as JSON is taken (local models often add a sentence).
 */
export function readJsonAnswer(text: string): unknown | null {
  const t = text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?/gi, "");
  try {
    return JSON.parse(t.trim());
  } catch {
    // look for the object inside
  }
  for (let start = t.indexOf("{"); start >= 0; start = t.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    for (let i = start; i < t.length; i++) {
      const ch = t[i];
      if (inString) {
        if (ch === "\\") i++;
        else if (ch === '"') inString = false;
      } else if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) {
        try {
          return JSON.parse(t.slice(start, i + 1));
        } catch {
          break;
        }
      }
    }
  }
  return null;
}

/** The words of a chat-completions answer (a string, or a list of text parts). */
function contentOf(json: unknown): string {
  const msg = (json as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message?.content;
  if (typeof msg === "string") return msg;
  if (Array.isArray(msg)) return msg.map((p) => (p && typeof p === "object" && typeof (p as { text?: unknown }).text === "string" ? (p as { text: string }).text : "")).join("");
  return "";
}

const failed = (e: unknown) => {
  const code = (e as { code?: string })?.code;
  return code === "ETIMEDOUT"
    ? "The model server didn't answer in time"
    : code === "PRIVATE_ADDRESS"
      ? "The address points inside the network: it isn't called"
      : code === "ENOTFOUND" || code === "EAI_AGAIN"
        ? "No server is found at that address"
        : code === "ECONNREFUSED"
          ? "The model server refused the connection (is it running?)"
          : code === "TOO_BIG"
            ? "The model server's answer is too big"
            : `The model server couldn't be reached (${String((e as Error)?.message ?? e).slice(0, 120)})`;
};

/** Ask the own server for JSON. Never throws: the reason comes back in words. */
export async function ownJson<T>(server: AiServer, p: AiPrompt, opts: { ms?: number; model?: string } = {}): Promise<{ ok: true; data: T; ms: number } | { ok: false; error: string }> {
  let url: URL;
  try {
    url = ownModelEndpoint(server.url);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  let key = "";
  if (server.key) {
    try {
      key = open(server.key);
    } catch {
      return { ok: false, error: "The model server's key can't be read: save it again" };
    }
  }
  const pictures = p.images?.length ? (await Promise.all(p.images.slice(0, 4).map(inlinePicture))).filter((x): x is string => Boolean(x)) : [];
  if (p.images?.length && !pictures.length) return { ok: false, error: "The pictures couldn't be read to send to the model" };
  const user: unknown = pictures.length ? [{ type: "text", text: p.user }, ...pictures.map((u) => ({ type: "image_url", image_url: { url: u } }))] : p.user;
  const model = opts.model || server.model;
  const base = {
    model,
    messages: [
      { role: "system", content: `${p.system}\nAnswer with one JSON object only, no other words.` },
      { role: "user", content: user },
    ],
    max_tokens: p.maxTokens ?? 1200,
    temperature: 0.3,
    stream: false,
  };
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  if (key) headers.authorization = `Bearer ${key}`;
  const started = Date.now();
  const ms = Math.max(1000, Math.min(opts.ms ?? OWN_MODEL_LIMITS.ms, OWN_MODEL_LIMITS.ms));
  try {
    let res = await transport({ url, headers, body: JSON.stringify({ ...base, response_format: { type: "json_object" } }), ms });
    // Some servers don't know "response_format": ask again without it.
    if ((res.status === 400 || res.status === 422) && /response_format|json_object/i.test(res.text)) {
      res = await transport({ url, headers, body: JSON.stringify(base), ms });
    }
    if (res.status === 401 || res.status === 403) return { ok: false, error: `The model server refused the key (${res.status})` };
    if (res.status === 404) return { ok: false, error: /model/i.test(res.text) ? `The model server doesn't have the model "${model}"` : "Nothing answers at that address (404): check the address" };
    if (res.status < 200 || res.status >= 300) return { ok: false, error: `The model server answered ${res.status}: ${res.text.replace(/\s+/g, " ").slice(0, 200)}` };
    let json: unknown;
    try {
      json = JSON.parse(res.text);
    } catch {
      return { ok: false, error: "The model server's answer isn't JSON (is the address the OpenAI-style one?)" };
    }
    const data = readJsonAnswer(contentOf(json));
    if (data == null || typeof data !== "object") return { ok: false, error: "The model didn't answer with JSON" };
    return { ok: true, data: data as T, ms: Date.now() - started };
  } catch (e) {
    return { ok: false, error: failed(e) };
  }
}

/** Numbers for search by meaning (embeddings), from the own server's embeddings model. Never throws. */
export async function ownEmbed(server: AiServer, texts: string[], opts: { ms?: number } = {}): Promise<{ ok: true; vectors: number[][]; model: string } | { ok: false; error: string }> {
  if (!ownEmbedSet(server)) return { ok: false, error: "No search model is set on the own server" };
  let url: URL;
  try {
    url = ownEmbedEndpoint(server.url);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  let key = "";
  if (server.key) {
    try {
      key = open(server.key);
    } catch {
      return { ok: false, error: "The model server's key can't be read: save it again" };
    }
  }
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  if (key) headers.authorization = `Bearer ${key}`;
  const input = texts.map((t) => t.slice(0, 8000));
  try {
    const res = await transport({ url, headers, body: JSON.stringify({ model: server.embedModel, input }), ms: Math.max(1000, Math.min(opts.ms ?? 60_000, OWN_MODEL_LIMITS.ms)) });
    if (res.status === 404) return { ok: false, error: /model/i.test(res.text) ? `The model server doesn't have the model "${server.embedModel}"` : "Nothing answers at the embeddings address (404)" };
    if (res.status < 200 || res.status >= 300) return { ok: false, error: `The model server answered ${res.status}: ${res.text.replace(/\s+/g, " ").slice(0, 200)}` };
    const json = JSON.parse(res.text) as { data?: Array<{ embedding?: unknown; index?: number }> };
    const rows = (json.data ?? []).slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const vectors = rows.map((r) => (Array.isArray(r.embedding) ? r.embedding.map(Number) : []));
    if (vectors.length !== input.length || vectors.some((v) => !v.length || v.some((n) => !Number.isFinite(n)))) return { ok: false, error: "The model server's numbers came back incomplete" };
    return { ok: true, vectors, model: ownEmbedName(server) };
  } catch (e) {
    return { ok: false, error: e instanceof SyntaxError ? "The model server's answer isn't JSON" : failed(e) };
  }
}
