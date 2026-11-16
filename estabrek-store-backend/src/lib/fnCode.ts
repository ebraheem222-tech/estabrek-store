/**
 * The cage for a function's "code" step (F2; lib/fnDef.ts): JavaScript the owner writes, for what
 * the steps can't say. It never runs in the server itself:
 *
 * - It runs in QuickJS (a small JavaScript engine) compiled to WebAssembly: a machine of its own
 *   with no files, no network, no `require`, no `process`: nothing but the language, the values
 *   the step hands it (`input`) and `log()`. What it gives back comes out as JSON.
 * - That machine lives in a worker thread, so code that spins doesn't hold the server's own
 *   thread: the shop keeps answering while it runs.
 * - Limits (`CODE_LIMITS`): two seconds, 32 MB, a bounded stack, and sizes for the code, what
 *   goes in, what comes out and what is logged. Code that runs over is stopped from inside (the
 *   engine is interrupted) and, should that fail, from outside (the worker is ended).
 * - A run that hit a limit ends its worker: the next run starts in a fresh one.
 *
 * Runs wait for each other in one line (one at a time); a line that is too long answers "busy".
 */
import { createRequire } from "node:module";
import { Worker } from "node:worker_threads";
import type { FnDef, Problem, Step } from "./fnDef.js";

export const CODE_LIMITS = {
  /** How long one run may take. */
  ms: 2000,
  /** The engine's memory. */
  memory: 32 * 1024 * 1024,
  stack: 512 * 1024,
  /** The code's own length, in letters. */
  code: 8000,
  /** What goes in and what comes out, as JSON. */
  input: 512_000,
  output: 256_000,
  logs: 40,
  logLine: 500,
  /** Runs waiting for their turn. */
  waiting: 40,
} as const;

export type CodeWhy = "error" | "syntax" | "time" | "memory" | "size" | "busy";
export type CodeOutcome = { ok: true; value: unknown; logs: string[]; ms: number } | { ok: false; why: CodeWhy; error: string; /** The line of the owner's code it happened on, when the engine said. */ line?: number; logs: string[]; ms: number };

/**
 * The worker's own program (plain JavaScript in a string: it is started with `eval`, so nothing
 * here depends on how this file was compiled). One job at a time: a fresh engine and context
 * for each, thrown away after it.
 */
const WORKER = [
  'const { parentPort, workerData } = require("node:worker_threads");',
  "const core = require(workerData.core);",
  "const variant = require(workerData.variant);",
  "const ready = core.newQuickJSWASMModuleFromVariant(variant.default || variant);",
  "const text = (e) => String((e && (e.message || e.name)) || e || 'The code failed');",
  // The owner's code is a function's body; `new Function` keeps it from closing the wrapper around it.
  'const RUN = \'(function () { var f = new Function("input", "log", __code); var out = f(JSON.parse(__input), log); if (out && typeof out.then === "function") throw new Error("The code gave back a promise: it runs straight through, without await"); return JSON.stringify(out === undefined ? null : out); })()\';',
  'const CHECK = \'new Function("input", "log", __code); "ok"\';',
  "function run(QuickJS, job) {",
  "  const t0 = Date.now();",
  "  const logs = [];",
  "  let out;",
  "  let broken = false;",
  "  let timedOut = false;",
  "  let runtime = null;",
  "  let vm = null;",
  "  try {",
  "    runtime = QuickJS.newRuntime();",
  "    runtime.setMemoryLimit(job.memory);",
  "    runtime.setMaxStackSize(job.stack);",
  "    const deadline = Date.now() + job.ms;",
  "    runtime.setInterruptHandler(() => { if (Date.now() > deadline) { timedOut = true; return true; } return false; });",
  "    vm = runtime.newContext();",
  '    const log = vm.newFunction("log", (...args) => {',
  "      if (logs.length >= job.logs) return;",
  "      const said = args.map((a) => { const v = vm.dump(a); return typeof v === 'string' ? v : v === undefined ? 'undefined' : JSON.stringify(v); }).join(' ');",
  "      logs.push(said.slice(0, job.logLine));",
  "    });",
  '    vm.setProp(vm.global, "log", log);',
  "    log.dispose();",
  "    for (const [name, value] of [['__input', job.input], ['__code', job.code]]) { const h = vm.newString(value); vm.setProp(vm.global, name, h); h.dispose(); }",
  '    const result = vm.evalCode(job.check ? CHECK : RUN, "cage.js");',
  "    if (result.error) {",
  "      const err = vm.dump(result.error);",
  "      result.error.dispose();",
  "      const message = text(err);",
  "      const memory = /out of memory/i.test(message);",
  "      const stack = err && typeof err.stack === 'string' ? err.stack : '';",
  "      out = { ok: false, why: timedOut ? 'time' : memory ? 'memory' : err && err.name === 'SyntaxError' ? 'syntax' : 'error', error: err && err.name && err.name !== 'Error' && !message.startsWith(err.name) ? err.name + ': ' + message : message, stack };",
  "      if (timedOut || memory) broken = true;",
  "    } else {",
  "      const json = vm.getString(result.value);",
  "      result.value.dispose();",
  "      out = { ok: true, json };",
  "    }",
  "  } catch (e) {",
  "    out = { ok: false, why: timedOut ? 'time' : 'error', error: text(e), stack: '' };",
  "    broken = true;",
  "  }",
  "  try { if (vm) vm.dispose(); if (runtime) runtime.dispose(); } catch (e) { broken = true; }",
  "  parentPort.postMessage(Object.assign(out, { id: job.id, logs, ms: Date.now() - t0, broken }));",
  // A machine that hit a limit isn't trusted with the next run.
  "  if (broken) setImmediate(() => process.exit(0));",
  "}",
  "parentPort.on('message', (job) => {",
  "  ready.then((QuickJS) => run(QuickJS, job)).catch((e) => {",
  "    parentPort.postMessage({ id: job.id, ok: false, why: 'error', error: text(e), stack: '', logs: [], ms: 0, broken: true });",
  "    setImmediate(() => process.exit(0));",
  "  });",
  "});",
].join("\n");

type Reply = { id: number; ok: boolean; json?: string; why?: CodeWhy; error?: string; stack?: string; logs: string[]; ms: number; broken: boolean };
type Job = { id: number; code: string; input: string; check: boolean; done: (reply: Reply) => void };

let worker: Worker | null = null;
let running: { job: Job; watch: NodeJS.Timeout } | null = null;
const line: Job[] = [];
let ids = 0;

/** The code as the engine gets it: strict, and its lines counted from the owner's first. */
const STRICT = '"use strict";\n';
/** `new Function` writes two lines of its own before the body, and ours is one more. */
const LINES_BEFORE = 3;

function lost(job: Job, why: CodeWhy, error: string) {
  job.done({ id: job.id, ok: false, why, error, stack: "", logs: [], ms: 0, broken: true });
}

function end() {
  const w = worker;
  worker = null;
  if (w) {
    w.removeAllListeners();
    void w.terminate().catch(() => {});
  }
}

function start(): Worker {
  const require = createRequire(import.meta.url);
  const w = new Worker(WORKER, {
    eval: true,
    // Its own program is plain JavaScript: none of the server's own start-up flags (a loader, a module type) go with it.
    execArgv: [],
    workerData: { core: require.resolve("quickjs-emscripten-core"), variant: require.resolve("@jitl/quickjs-wasmfile-release-sync") },
    // The worker's own JavaScript (not the cage's: that memory is the engine's, limited above).
    resourceLimits: { maxOldGenerationSizeMb: 256, maxYoungGenerationSizeMb: 32, stackSizeMb: 4 },
  });
  // An idle cage never keeps the server (or a test run) from ending.
  w.unref();
  w.on("message", (reply: Reply) => {
    const now = running;
    if (!now || now.job.id !== reply.id) return;
    clearTimeout(now.watch);
    running = null;
    if (reply.broken) end();
    now.job.done(reply);
    next();
  });
  const died = () => {
    if (worker === w) worker = null;
    const now = running;
    if (!now) return;
    clearTimeout(now.watch);
    running = null;
    lost(now.job, "error", "The code's machine stopped");
    next();
  };
  w.on("error", died);
  w.on("exit", died);
  return w;
}

function next() {
  if (running) return;
  const job = line.shift();
  if (!job) return;
  try {
    worker ??= start();
  } catch (e) {
    lost(job, "error", `The code's machine didn't start: ${e instanceof Error ? e.message : String(e)}`);
    return next();
  }
  // Should the engine not stop itself in time, the whole machine is ended from outside.
  const watch = setTimeout(() => {
    if (running?.job !== job) return;
    running = null;
    end();
    lost(job, "time", "");
    next();
  }, CODE_LIMITS.ms + 1500);
  watch.unref();
  running = { job, watch };
  worker.postMessage({ id: job.id, code: STRICT + job.code, input: job.input, check: job.check, ms: CODE_LIMITS.ms, memory: CODE_LIMITS.memory, stack: CODE_LIMITS.stack, logs: CODE_LIMITS.logs, logLine: CODE_LIMITS.logLine });
}

function ask(code: string, input: string, check: boolean): Promise<Reply> {
  return new Promise((done) => {
    const job: Job = { id: ++ids, code, input, check, done };
    if (line.length >= CODE_LIMITS.waiting) return lost(job, "busy", "");
    line.push(job);
    next();
  });
}

const WHY: Record<Exclude<CodeWhy, "error" | "syntax">, string> = {
  time: `The code ran longer than ${CODE_LIMITS.ms / 1000} seconds`,
  memory: `The code used more than ${CODE_LIMITS.memory / 1024 / 1024} MB`,
  size: "Too big",
  busy: "Too much code is running right now: try again in a moment",
};

/** The line of the owner's code an error names ("at <anonymous> (<input>:5)"), if it does. */
function lineOf(stack: string | undefined, lines: number): number | undefined {
  for (const m of (stack ?? "").matchAll(/:(\d+)(?::\d+)?\)?\s*$/gm)) {
    const n = Number(m[1]) - LINES_BEFORE;
    if (n >= 1 && n <= lines) return n;
  }
  return undefined;
}

function failed(reply: Reply, code: string): Extract<CodeOutcome, { ok: false }> {
  const why = reply.why ?? "error";
  const at = why === "error" || why === "syntax" ? lineOf(reply.stack, code.split("\n").length) : undefined;
  const said = why === "error" || why === "syntax" ? (reply.error || "The code failed").slice(0, 300) : WHY[why];
  return { ok: false, why, error: said, ...(at ? { line: at } : {}), logs: reply.logs ?? [], ms: reply.ms ?? 0 };
}

/**
 * The code run with what it was handed. `code` is a function's body: it reads `input`, may call
 * `log(...)`, and gives a value back with `return`. Never throws: a failure is the outcome.
 */
export async function runCode(code: string, input: unknown): Promise<CodeOutcome> {
  if (code.length > CODE_LIMITS.code) return { ok: false, why: "size", error: `The code is longer than ${CODE_LIMITS.code} letters`, logs: [], ms: 0 };
  let handed: string;
  try {
    handed = JSON.stringify(input ?? null) ?? "null";
  } catch {
    return { ok: false, why: "error", error: "What the code is handed can't be written as JSON", logs: [], ms: 0 };
  }
  if (handed.length > CODE_LIMITS.input) return { ok: false, why: "size", error: `The code is handed more than ${Math.round(CODE_LIMITS.input / 1000)} KB`, logs: [], ms: 0 };
  const reply = await ask(code, handed, false);
  if (!reply.ok) return failed(reply, code);
  const json = reply.json ?? "null";
  if (json.length > CODE_LIMITS.output) return { ok: false, why: "size", error: `The code gave back more than ${Math.round(CODE_LIMITS.output / 1000)} KB`, logs: reply.logs, ms: reply.ms };
  try {
    return { ok: true, value: JSON.parse(json), logs: reply.logs, ms: reply.ms };
  } catch {
    return { ok: false, why: "error", error: "What the code gave back can't be read", logs: reply.logs, ms: reply.ms };
  }
}

/**
 * Whether the code can be read at all (it isn't run): null, or the mistake in its writing and where.
 * A cage that couldn't answer says nothing here: the run itself will.
 */
export async function checkCode(code: string): Promise<{ error: string; line?: number } | null> {
  if (code.length > CODE_LIMITS.code) return { error: `The code is longer than ${CODE_LIMITS.code} letters` };
  const reply = await ask(code, "null", true);
  if (reply.ok || reply.why !== "syntax") return null;
  const f = failed(reply, code);
  return { error: f.error, ...(f.line ? { line: f.line } : {}) };
}

/** The code steps of a function that can't be read (a mistake in the writing), each where it is: they stand in the way of publishing. */
export async function codeProblems(def: FnDef): Promise<Problem[]> {
  const out: Problem[] = [];
  const walk = async (steps: Step[] | undefined, base: string) => {
    for (const [k, s] of (steps ?? []).entries()) {
      const at = `${base}.${k}`;
      if (s.act === "code") {
        const bad = s.code.trim() ? await checkCode(s.code) : null;
        if (bad) out.push({ at, message: `The code can't be read: ${bad.error}${bad.line ? ` (line ${bad.line})` : ""}` });
      } else if (s.act === "if") {
        await walk(s.do, `${at}.do`);
        await walk(s.else, `${at}.else`);
      } else if (s.act === "each") await walk(s.do, `${at}.do`);
    }
  };
  await walk(def.do, "do");
  await walk(def.else, "else");
  return out;
}

/** For tests: the cage's worker is ended (the next run starts a fresh one). */
export function resetCodeForTests() {
  end();
}
