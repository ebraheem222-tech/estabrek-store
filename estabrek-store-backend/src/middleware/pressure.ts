import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";
import { policy, policyVersion } from "../lib/securityPolicy.js";
import { hit, penalize } from "../lib/pressure.js";
import { compileIpRules, isIpInRules, normalizeIp, type CompiledIpRule } from "../utils/ip.js";
import { verifyAccessToken } from "../config/security.js";

/**
 * Traffic protection (admin → حماية الضغط): IPs blocked by hand, then the decay
 * model from lib/pressure.ts. Signed-in admins and the allow list are never
 * counted. Mode "off" skips the model (hand blocks still apply).
 */

/* ---------- blocks set by hand (database, refreshed every 15 s) ---------- */

let manual = new Map<string, number | null>(); // ip → until (ms) or null = until unblocked
let manualAt = 0;
let manualLoading: Promise<void> | null = null;

export function refreshIpBlocks(): Promise<void> {
  if (manualLoading) return manualLoading;
  manualLoading = (async () => {
    try {
      const rows = await prisma.ipBlock.findMany({ where: { OR: [{ until: null }, { until: { gt: new Date() } }] }, select: { ip: true, until: true } });
      manual = new Map(rows.map((r) => [r.ip, r.until ? r.until.getTime() : null]));
    } catch {
      /* database unreachable: keep the last list */
    } finally {
      manualAt = Date.now();
      manualLoading = null;
    }
  })();
  return manualLoading;
}

/** Blocked by hand right now? Returns until (ms), null = no end, undefined = not blocked. */
export function manualBlockOf(ip: string, now = Date.now()): number | null | undefined {
  if (now - manualAt > 15_000 && !manualLoading) void refreshIpBlocks();
  if (!manual.has(ip)) return undefined;
  const until = manual.get(ip)!;
  return until === null || until > now ? until : undefined;
}

/* ---------- allow list ---------- */

let allowRules: CompiledIpRule[] = [];
let allowVersion = -1;
function allowed(ip: string) {
  if (allowVersion !== policyVersion()) {
    allowRules = compileIpRules(policy().pressure.allow);
    allowVersion = policyVersion();
  }
  return allowRules.length > 0 && isIpInRules(ip, allowRules);
}

function isAuthPath(path: string) {
  return path.startsWith("/v1/auth") || path.startsWith("/v1/customer/auth") || path.startsWith("/v1/stock-alerts");
}

function isAdmin(header: string | undefined) {
  if (!header?.startsWith("Bearer ")) return false;
  try {
    verifyAccessToken(header.slice(7));
    return true;
  } catch {
    return false;
  }
}

export const pressureGuard: RequestHandler = (req, res, next) => {
  if (req.method === "OPTIONS" || req.path === "/health" || req.path === "/") return next();
  const ip = normalizeIp(req.ip || "") || "unknown";

  const hand = manualBlockOf(ip);
  if (hand !== undefined) {
    if (hand) res.setHeader("Retry-After", Math.max(1, Math.ceil((hand - Date.now()) / 1000)).toString());
    return res.status(403).json({ error: "IP_BLOCKED", until: hand });
  }

  const s = policy().pressure;
  if (s.mode === "off" || allowed(ip) || isAdmin(req.headers.authorization)) return next();

  const weight = isAuthPath(req.path) ? s.weightAuth : req.method === "GET" || req.method === "HEAD" ? s.weightRead : s.weightWrite;
  const verdict = hit({ ip, weight, path: req.path, method: req.method, userAgent: req.get("user-agent") ?? "" }, s);

  if (verdict.action === "block") {
    res.setHeader("Retry-After", Math.max(1, Math.ceil((verdict.until - Date.now()) / 1000)).toString());
    return res.status(429).json({ error: "TOO_MANY_REQUESTS", retryAt: verdict.until });
  }
  // Failed sign-ins, forbidden and unknown pages weigh extra (scanners, guessing).
  res.on("finish", () => {
    if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 404) penalize(ip, s.weightFail, s);
  });
  if (verdict.action === "slow") {
    res.setHeader("X-Slowed-Down", String(verdict.delayMs));
    setTimeout(next, verdict.delayMs);
    return;
  }
  next();
};
