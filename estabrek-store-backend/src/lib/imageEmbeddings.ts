import fs from "fs/promises";
import path from "path";
import { getOpenAIVisionModel, openaiEmbedText, openaiResponsesJson } from "./openai.js";
import { clipEmbedImage } from "./clipEmbeddings.js";

type Locale = "ar" | "he" | "en";

export type ImageEmbeddingResult = {
  ok: true;
  embedding: number[];
  embeddingText: string;
  caption: string;
  tags: string[];
  model: string;
} | {
  ok: false;
  error: string;
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function guessMimeFromExt(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function bufferToDataUrl(buffer: Buffer, mime: string) {
  const safeMime = ALLOWED_IMAGE_MIME.has(mime) ? mime : "image/jpeg";
  return `data:${safeMime};base64,${buffer.toString("base64")}`;
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tags) {
    const s = String(t ?? "").trim().toLowerCase();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out.slice(0, 10);
}

function resolveLocalUploadPath(url: string): string | null {
  let pathname = url;
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      pathname = new URL(url).pathname;
    }
  } catch {
    pathname = url;
  }
  if (!pathname.startsWith("/uploads/")) return null;
  return path.join(process.cwd(), pathname);
}

async function loadImageFromDisk(filePath: string): Promise<{ buffer: Buffer; mime: string } | null> {
  try {
    const st = await fs.stat(filePath);
    if (st.size > MAX_IMAGE_BYTES) return null;
    const buffer = await fs.readFile(filePath);
    return { buffer, mime: guessMimeFromExt(filePath) };
  } catch {
    return null;
  }
}

export async function loadImageFromUrl(url: string): Promise<{ buffer: Buffer; mime: string } | null> {
  const localPath = resolveLocalUploadPath(url);
  if (localPath) {
    const local = await loadImageFromDisk(localPath);
    if (local) return local;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mime = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const len = Number(res.headers.get("content-length") || 0);
    if (len && len > MAX_IMAGE_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_IMAGE_BYTES) return null;
    return { buffer: buf, mime: mime || "application/octet-stream" };
  } catch {
    return null;
  }
}

function buildEmbeddingText(input: {
  caption: string;
  tags: string[];
  productTitle?: string | null;
  categoryName?: string | null;
  colorName?: string | null;
  description?: string | null;
}) {
  const parts: string[] = [];
  const caption = input.caption.trim();
  if (caption) parts.push(caption);
  if (input.tags?.length) parts.push(input.tags.join(", "));
  if (input.productTitle) parts.push(String(input.productTitle).trim());
  if (input.categoryName) parts.push(String(input.categoryName).trim());
  if (input.colorName) parts.push(String(input.colorName).trim());
  if (input.description) {
    const desc = String(input.description).trim();
    if (desc) parts.push(desc.length > 200 ? desc.slice(0, 200) : desc);
  }
  return parts.filter(Boolean).join(" | ");
}

type ImageDescribeResult = {
  ok: true;
  caption: string;
  tags: string[];
} | {
  ok: false;
  error: string;
};

async function describeImageFromBuffer(buffer: Buffer, mime: string, locale?: Locale): Promise<ImageDescribeResult> {
  if (!buffer?.length) return { ok: false, error: "IMAGE_BUFFER_EMPTY" };
  const dataUrl = bufferToDataUrl(buffer, mime);
  const model = getOpenAIVisionModel();
  const sys = [
    "You describe product images for semantic search.",
    'Return STRICT JSON only: {"caption": string, "tags": string[]}.',
    "Caption should be short (1 sentence). Tags should be 3-8 short keywords.",
    "Output tags in English even if the UI locale differs.",
  ].join("\n");

  const user = {
    task: "describe_product_image",
    locale: locale ?? "en",
  };

  const result = await openaiResponsesJson<any>({
    model,
    input: [
      { role: "system", content: sys },
      {
        role: "user",
        content: [
          { type: "input_text", text: JSON.stringify(user) },
          { type: "input_image", image_url: dataUrl },
        ],
      },
    ],
    max_output_tokens: 250,
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  if (!result.ok) return { ok: false, error: result.error };
  const caption = typeof result.data?.caption === "string" ? result.data.caption.trim() : "";
  const tags = normalizeTags(result.data?.tags);
  if (!caption) return { ok: false, error: "IMAGE_DESCRIPTION_EMPTY" };
  return { ok: true, caption, tags };
}

export async function createImageEmbeddingFromBuffer(
  buffer: Buffer,
  mime: string,
  opts?: {
    locale?: Locale;
    productTitle?: string | null;
    categoryName?: string | null;
    colorName?: string | null;
    description?: string | null;
  }
): Promise<ImageEmbeddingResult> {
  const provider = (process.env.IMAGE_SEARCH_PROVIDER ?? "").toLowerCase();
  if (provider === "clip") {
    const clip = await clipEmbedImage(buffer);
    if (!clip.ok) return { ok: false, error: clip.error };
    return {
      ok: true,
      embedding: clip.embedding,
      embeddingText: "clip:image",
      caption: "",
      tags: [],
      model: clip.model,
    };
  }

  const desc = await describeImageFromBuffer(buffer, mime, opts?.locale);
  if (!desc.ok) {
    return { ok: false, error: desc.error || "IMAGE_DESCRIPTION_FAILED" };
  }

  const embeddingText = buildEmbeddingText({
    caption: desc.caption,
    tags: desc.tags,
    productTitle: opts?.productTitle,
    categoryName: opts?.categoryName,
    colorName: opts?.colorName,
    description: opts?.description,
  });

  const emb = await openaiEmbedText(embeddingText);
  if (!emb.ok) return { ok: false, error: emb.error };

  return {
    ok: true,
    embedding: emb.embedding,
    embeddingText,
    caption: desc.caption,
    tags: desc.tags,
    model: emb.model,
  };
}
