import { prisma } from "./prisma.js";
import { aiEmbed, currentEmbedModel } from "../modules/ai/ai.client.js";
import { CONTENT_LANGS, ProductTranslations, translationsOf } from "./translations.js";

type ProductEmbeddingSource = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  category?: { name?: string | null } | null;
  translations?: unknown;
  embedding?: any;
  embeddingText?: string | null;
  embeddingModel?: string | null;
};

export type ProductEmbeddingResult =
  | { ok: true; updated: boolean; productId: string }
  | { ok: false; error: string };

function compactText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function buildProductEmbeddingText(product: ProductEmbeddingSource): string {
  const parts: string[] = [];
  if (product.title) parts.push(product.title);
  if (product.category?.name) parts.push(`Category: ${product.category.name}`);
  if (product.description) parts.push(product.description);
  if (product.slug) parts.push(`Slug: ${product.slug}`);
  // Its names in the shop's other languages, so a search in English or Hebrew finds it.
  const tr = translationsOf(ProductTranslations, product.translations);
  for (const lang of CONTENT_LANGS) {
    const one = tr[lang];
    if (one?.title) parts.push(`Title (${lang}): ${one.title}`);
    if (one?.description) parts.push(one.description.slice(0, 600));
  }
  return compactText(parts.join("\n"));
}

export async function indexProductTextEmbedding(productId: string, opts?: { force?: boolean }): Promise<ProductEmbeddingResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      translations: true,
      embedding: true,
      embeddingText: true,
      embeddingModel: true,
      category: { select: { name: true } },
    },
  });

  if (!product) return { ok: false, error: "NOT_FOUND" };

  const text = buildProductEmbeddingText(product);
  if (!text) return { ok: false, error: "EMPTY_TEXT" };

  // The search model now: the own server's (admin → الذكاء الاصطناعي), else OpenAI's; none = nothing to do.
  const model = await currentEmbedModel();
  if (!model) return { ok: false, error: "NO_SEARCH_MODEL" };
  if (!opts?.force && product.embedding && product.embeddingText === text && product.embeddingModel === model) {
    return { ok: true, updated: false, productId: product.id };
  }

  const embedded = await aiEmbed([text], "search");
  if (!embedded.ok) return { ok: false, error: embedded.error };

  await prisma.product.update({
    where: { id: product.id },
    data: {
      embedding: embedded.vectors[0] as any,
      embeddingText: text,
      embeddingModel: embedded.model,
      embeddingUpdatedAt: new Date(),
    },
  });

  return { ok: true, updated: true, productId: product.id };
}

/* ---------------- The whole catalogue again, for a new search model ---------------- */

/**
 * After the search model changes (another model, or the own server instead of OpenAI), every product's
 * numbers are made again with it: search compares only numbers from the same model, so until a
 * product is done it is found by its words. One run at a time, in this process; a run cut short
 * (a deploy) is simply started again and goes on from what isn't done.
 */
export type SearchIndexRun = { running: boolean; model: string | null; done: number; failed: number; startedAt: string | null; finishedAt: string | null; lastError: string | null };
let run: SearchIndexRun = { running: false, model: null, done: 0, failed: 0, startedAt: null, finishedAt: null, lastError: null };

const notDone = (model: string) => ({ isActive: true, OR: [{ embeddingModel: null }, { embeddingModel: { not: model } }] });

export async function searchIndexStatus() {
  const model = await currentEmbedModel();
  const [total, indexed] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    model ? prisma.product.count({ where: { isActive: true, embeddingModel: model } }) : Promise.resolve(0),
  ]);
  return { model, total, indexed, run };
}

/** Starts a run (false when one is going, or nothing makes the numbers). The run itself goes on after the answer. */
export async function startSearchIndex(opts: { pauseMs?: number } = {}): Promise<boolean> {
  if (run.running) return false;
  const model = await currentEmbedModel();
  if (!model) return false;
  run = { running: true, model, done: 0, failed: 0, startedAt: new Date().toISOString(), finishedAt: null, lastError: null };
  void (async () => {
    let after = "";
    let failsInARow = 0;
    try {
      for (;;) {
        const batch = await prisma.product.findMany({ where: { ...notDone(model), id: { gt: after } }, orderBy: { id: "asc" }, take: 20, select: { id: true } });
        if (!batch.length) break;
        for (const { id } of batch) {
          after = id;
          const r = await indexProductTextEmbedding(id, { force: true });
          if (r.ok) {
            run.done++;
            failsInARow = 0;
          } else {
            run.failed++;
            run.lastError = r.error.slice(0, 300);
            // The model server is down or refusing: stop instead of failing every product.
            if (++failsInARow >= 5) throw new Error(run.lastError);
          }
          if (opts.pauseMs) await new Promise((w) => setTimeout(w, opts.pauseMs));
        }
      }
    } catch (e) {
      run.lastError = (e as Error)?.message?.slice(0, 300) ?? "stopped";
    } finally {
      run.running = false;
      run.finishedAt = new Date().toISOString();
    }
  })();
  return true;
}

/** Tests: wait for the run going now to end. */
export async function searchIndexSettled(ms = 10_000) {
  const until = Date.now() + ms;
  while (run.running && Date.now() < until) await new Promise((w) => setTimeout(w, 20));
  return run;
}
