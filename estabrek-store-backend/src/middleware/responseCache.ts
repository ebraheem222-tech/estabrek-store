import type { RequestHandler, Response } from "express";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { cacheConfig, type NamespaceName } from "../lib/cacheConfig.js";
import { cacheOn, flightOf, lookup, noteHit, noteLoad, noteMiss, remember, stampOf, startFlight } from "../lib/cache.js";
import { stableJson, type CacheEntry } from "../lib/cacheEngine.js";

/**
 * Caches a public route's JSON answer (200 and 404) in its namespace
 * (lib/cache.ts). Same URL (query in any order) and, for POST, same body =
 * same answer. Never used with an Authorization header.
 *
 * - Fresh: sent from the cache (X-Cache: HIT).
 * - Expired but within the stale window: the first request builds a new copy,
 *   the ones arriving meanwhile get the previous copy at once (X-Cache: STALE).
 * - Missing: the first request builds it; identical requests arriving meanwhile
 *   wait for that one instead of all hitting the database.
 */
type Req = Parameters<RequestHandler>[0];
type NamespaceChoice = NamespaceName | ((req: Req) => NamespaceName);

const WAIT_MS = 5_000;
const NOT_FOUND_TTL_MS = 60_000;

/** Every path segment encoded the same way (an Arabic slug sent encoded or not is one key). */
function normalPath(path: string) {
  return path
    .split("/")
    .map((seg) => {
      try {
        return encodeURIComponent(decodeURIComponent(seg));
      } catch {
        return seg;
      }
    })
    .join("/");
}

/** The key a GET of this path (and query) is cached under (used by the warm-up too). */
export function cacheKeyFor(path: string, rawQuery = "") {
  const params = new URLSearchParams(rawQuery);
  params.sort();
  const query = params.toString();
  return `${normalPath(path)}${query ? `?${query}` : ""}`;
}

/** Path + query (sorted by name) + a hash of the body for POST. */
export function cacheKeyOf(req: Req) {
  const [path, raw = ""] = req.originalUrl.split("?", 2);
  if (req.method !== "POST") return cacheKeyFor(path, raw);
  const body = `#${createHash("sha1").update(stableJson(req.body ?? null)).digest("base64url")}`;
  return `POST ${cacheKeyFor(path, raw)}${body}`;
}

function waitFor<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    t.unref?.();
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(null);
      },
    );
  });
}

function browserHeaders(res: Response, ns: NamespaceName, status: number) {
  const c = cacheConfig().namespaces[ns];
  if (status !== 200 || c.browserSeconds <= 0) return;
  res.setHeader("Cache-Control", `public, max-age=${c.browserSeconds}, stale-while-revalidate=${Math.max(c.staleSeconds, c.browserSeconds)}`);
}

function sendEntry(res: Response, ns: NamespaceName, entry: CacheEntry, label: "HIT" | "STALE") {
  const status = entry.status ?? 200;
  res.setHeader("X-Cache", label);
  res.setHeader("Age", String(Math.max(0, Math.round((Date.now() - entry.createdAt) / 1000))));
  browserHeaders(res, ns, status);
  res.status(status).type("application/json").send(entry.body ?? "null");
}

type Options = {
  /** The product an answer is about (its popularity sets how long it stays). */
  subject?: (req: Req, body: unknown) => string | undefined | null;
};

export function cacheResponse(choice: NamespaceChoice, options: Options = {}): RequestHandler {
  return async (req, res, next) => {
    if (req.method !== "GET" && req.method !== "POST") return next();
    const ns = typeof choice === "function" ? choice(req) : choice;
    if (!cacheOn(ns) || req.headers.authorization) {
      res.setHeader("X-Cache", "BYPASS");
      return next();
    }
    const key = cacheKeyOf(req);
    const start = performance.now();
    try {
      const found = await lookup(ns, key);
      // Fresh, or stale while another request is already rebuilding it.
      if (found && (found.fresh || flightOf(ns, key))) {
        noteHit(ns, found.fresh, found.layer);
        return sendEntry(res, ns, found.entry, found.fresh ? "HIT" : "STALE");
      }
      if (!found) {
        const running = flightOf(ns, key);
        const shared = running ? await waitFor(running, WAIT_MS) : null;
        if (shared) {
          noteHit(ns, true, "l1");
          return sendEntry(res, ns, shared, "HIT");
        }
      }
    } catch {
      return next();
    }

    // Build it: run the route and keep what it answers.
    noteMiss(ns);
    const stamp = stampOf(ns);
    const finish = startFlight(ns, key);
    const json = res.json.bind(res);
    let handled = false;
    res.json = (body: unknown) => {
      if (handled) return json(body);
      handled = true;
      const status = res.statusCode;
      if (status !== 200 && status !== 404) {
        finish(null);
        return json(body);
      }
      let text: string;
      try {
        text = JSON.stringify(body) ?? "null";
      } catch {
        finish(null);
        return json(body);
      }
      const costMs = performance.now() - start;
      noteLoad(ns, costMs);
      const ttl = status === 404 ? Math.min(cacheConfig().namespaces[ns].ttlSeconds * 1000, NOT_FOUND_TTL_MS) : undefined;
      let subject: string | undefined;
      try {
        subject = options.subject?.(req, body) || undefined;
      } catch {
        subject = undefined;
      }
      finish(remember(ns, key, { body: text, status, text, costMs }, ttl, stamp, subject));
      res.setHeader("X-Cache", "MISS");
      browserHeaders(res, ns, status);
      if (!res.get("Content-Type")) res.type("application/json");
      return res.send(text);
    };
    res.on("close", () => finish(null));
    next();
  };
}
