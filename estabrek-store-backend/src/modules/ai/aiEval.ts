/**
 * «جرّب النموذج» (admin → الذكاء الاصطناعي): the owner's own questions (real ones from shoppers),
 * asked to the shop's assistant as it is now (the model on the own server, or OpenAI), one after
 * another in the background. Each answer keeps its time, whether it failed, the pieces it showed and
 * the owner's mark (good / bad), so two models can be put side by side before one is switched on.
 *
 * Kept in one AiCache row (key "ai-eval:v1", an expiry far ahead) rather than a table of its own:
 * at most 50 questions and the last 3 runs.
 */
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { mainLanguage, type ContentLang } from "../../lib/translations.js";
import { getDefaultOpenAIModel } from "../../lib/openai.js";
import { agentReply } from "../chatbot/agent.service.js";
import { aiServerOf, ownServerSet } from "./ownModel.js";

export const EVAL_LIMITS = { questions: 50, text: 300, runs: 3 } as const;
const KEY = "ai-eval:v1";
const FOREVER = new Date("2100-01-01T00:00:00.000Z");

export type EvalQuestion = { id: string; text: string };
export type EvalMark = "good" | "bad";
export type EvalAnswer = { qid: string; text: string; answer: string; products: string[]; ms: number; ok: boolean; error: string | null; missed: boolean; mark: EvalMark | null };
export type EvalRun = { id: string; at: string; finishedAt: string | null; model: string; running: boolean; total: number; answers: EvalAnswer[] };
export type EvalStore = { questions: EvalQuestion[]; runs: EvalRun[] };

async function load(): Promise<EvalStore> {
  const row = await prisma.aiCache.findUnique({ where: { key: KEY } });
  const v = (row?.value ?? {}) as Partial<EvalStore>;
  return { questions: Array.isArray(v.questions) ? v.questions : [], runs: Array.isArray(v.runs) ? v.runs : [] };
}
async function save(store: EvalStore) {
  const value = store as unknown as Prisma.InputJsonValue;
  await prisma.aiCache.upsert({ where: { key: KEY }, create: { key: KEY, value, expiresAt: FOREVER }, update: { value, expiresAt: FOREVER } });
}

let runningId: string | null = null;

/** The questions and the runs; a run that was going when the server stopped is said to have stopped. */
export async function evalState() {
  const store = await load();
  let changed = false;
  for (const r of store.runs) {
    if (r.running && r.id !== runningId) {
      r.running = false;
      r.finishedAt = r.finishedAt ?? new Date().toISOString();
      changed = true;
    }
  }
  if (changed) await save(store);
  return { ...store, running: runningId !== null, limits: EVAL_LIMITS };
}

/** The owner's questions, one per line: cleaned, once each, at most 50; a question kept keeps its id (and its marks). */
export async function setQuestions(lines: string[]) {
  const store = await load();
  const byText = new Map(store.questions.map((q) => [q.text, q.id]));
  const seen = new Set<string>();
  const questions: EvalQuestion[] = [];
  for (const raw of lines) {
    const text = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, EVAL_LIMITS.text);
    if (text.length < 2 || seen.has(text)) continue;
    seen.add(text);
    questions.push({ id: byText.get(text) ?? randomUUID().slice(0, 12), text });
    if (questions.length >= EVAL_LIMITS.questions) break;
  }
  store.questions = questions;
  await save(store);
  return evalState();
}

/** The model the shop's assistant asks now, in words for the owner. */
async function modelNow(): Promise<string> {
  const s = await prisma.siteSettings.findFirst({ select: { header: true } });
  const server = aiServerOf(s?.header);
  return ownServerSet(server) ? `${server.model}${server.compact ? " (small)" : ""}` : `OpenAI ${getDefaultOpenAIModel()}`;
}

/** Starts a run of every question (null when one is going or there is nothing to ask). It goes on after the answer. */
export async function startRun(opts: { pauseMs?: number } = {}): Promise<EvalRun | null> {
  if (runningId) return null;
  const store = await load();
  if (!store.questions.length) return null;
  const s = await prisma.siteSettings.findFirst({ select: { header: true } });
  const locale: ContentLang = mainLanguage(s?.header);
  const run: EvalRun = { id: randomUUID().slice(0, 12), at: new Date().toISOString(), finishedAt: null, model: await modelNow(), running: true, total: store.questions.length, answers: [] };
  store.runs = [run, ...store.runs].slice(0, EVAL_LIMITS.runs);
  await save(store);
  runningId = run.id;
  const questions = store.questions.slice();
  void (async () => {
    try {
      for (const q of questions) {
        const started = Date.now();
        let a: EvalAnswer;
        try {
          const r = await agentReply({ locale, message: q.text, history: [], pageUrl: null, use: "eval" });
          a = { qid: q.id, text: q.text, answer: r.answer, products: r.products.map((p) => p.title).slice(0, 4), ms: Date.now() - started, ok: true, error: null, missed: r.missed, mark: null };
        } catch (e) {
          a = { qid: q.id, text: q.text, answer: "", products: [], ms: Date.now() - started, ok: false, error: String((e as Error)?.message ?? e).slice(0, 300), missed: true, mark: null };
        }
        // The answer is kept as soon as it comes, so the page shows the run moving.
        const now = await load();
        const target = now.runs.find((x) => x.id === run.id);
        if (!target) return;
        target.answers.push(a);
        await save(now);
        if (opts.pauseMs) await new Promise((w) => setTimeout(w, opts.pauseMs));
      }
    } finally {
      const now = await load();
      const target = now.runs.find((x) => x.id === run.id);
      if (target) {
        target.running = false;
        target.finishedAt = new Date().toISOString();
        await save(now);
      }
      runningId = null;
    }
  })();
  return run;
}

/** The owner's mark on one answer (null takes it away). False when there is no such answer. */
export async function markAnswer(runId: string, qid: string, mark: EvalMark | null): Promise<boolean> {
  const store = await load();
  const a = store.runs.find((r) => r.id === runId)?.answers.find((x) => x.qid === qid);
  if (!a) return false;
  a.mark = mark;
  await save(store);
  return true;
}

export async function deleteRun(runId: string): Promise<boolean> {
  if (runId === runningId) return false;
  const store = await load();
  const before = store.runs.length;
  store.runs = store.runs.filter((r) => r.id !== runId);
  if (store.runs.length === before) return false;
  await save(store);
  return true;
}

/** Tests: wait for the run going now to end. */
export async function evalSettled(ms = 10_000) {
  const until = Date.now() + ms;
  while (runningId && Date.now() < until) await new Promise((w) => setTimeout(w, 20));
}
