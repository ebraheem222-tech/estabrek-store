/**
 * Traffic pressure with decay (the "e^-x" model).
 *
 * Each IP has a score. Every request adds a weight (a page view 1, a change 3,
 * a sign-in 8, a failed/unknown request +4), and the score fades by itself:
 *
 *     s ← s · e^(−Δt/τ) + w          (τ = half-life / ln 2, so it halves every half-life)
 *     pressure p = 1 − e^(−s / capacity)      → 0 (calm) … 1 (flooding)
 *
 * A shopper browsing normally stays low; a bot hammering the server climbs to 1.
 * From slowAt the answers are delayed (up to 2 s), at blockAt the IP is blocked
 * for blockMinutes · 2^strikes (capped), so repeat offenders wait longer each time.
 * In "watch" mode nothing is slowed or blocked: we only record who would be.
 *
 * Kept in this server's memory (one Railway instance). Blocks set by hand live
 * in the database (IpBlock).
 */
import { policy, type Policy } from "./securityPolicy.js";

export type PressureSettings = Policy["pressure"];

export function decay(score: number, elapsedMs: number, halfLifeSeconds: number) {
  if (elapsedMs <= 0) return score;
  return score * Math.pow(2, -elapsedMs / (halfLifeSeconds * 1000));
}

export function pressureOf(score: number, capacity: number) {
  return 1 - Math.exp(-Math.max(0, score) / capacity);
}

export function blockMinutesFor(strikes: number, base: number, maxHours: number) {
  return Math.min(base * Math.pow(2, Math.max(0, strikes)), maxHours * 60);
}

/** Delay (ms) for a pressure between slowAt and blockAt: 0 → 2000. */
export function slowDelayMs(p: number, slowAt: number, blockAt: number) {
  const a = slowAt / 100;
  const b = blockAt / 100;
  if (p < a) return 0;
  return Math.round(Math.min(1, (p - a) / Math.max(0.01, b - a)) * 2000);
}

export type Client = {
  ip: string;
  score: number;
  at: number;
  firstAt: number;
  lastAt: number;
  hits: number;
  lastPath: string;
  lastMethod: string;
  userAgent: string;
  /** Automatic block (enforced in "on" mode). */
  blockedUntil: number;
  /** "watch" mode: when it would have been blocked until. */
  wouldBlockUntil: number;
  strikes: number;
  lastBlockAt: number;
  peak: number;
  slowed: number;
};

const clients = new Map<string, Client>();
const MAX_CLIENTS = 20_000;
let lastSweep = 0;

function fresh(ip: string, now: number): Client {
  return { ip, score: 0, at: now, firstAt: now, lastAt: now, hits: 0, lastPath: "", lastMethod: "", userAgent: "", blockedUntil: 0, wouldBlockUntil: 0, strikes: 0, lastBlockAt: 0, peak: 0, slowed: 0 };
}

function sweep(now: number, s: PressureSettings) {
  if (now - lastSweep < 30_000 && clients.size < MAX_CLIENTS) return;
  lastSweep = now;
  for (const [ip, c] of clients) {
    const score = decay(c.score, now - c.at, s.halfLifeSeconds);
    const idle = now - c.lastAt > 10 * 60_000;
    if (score < 0.5 && idle && c.blockedUntil < now && c.wouldBlockUntil < now) clients.delete(ip);
  }
  // Still too many (a flood of new IPs): drop the calmest.
  if (clients.size >= MAX_CLIENTS) {
    const calm = [...clients.values()].sort((a, b) => a.score - b.score).slice(0, Math.ceil(MAX_CLIENTS / 4));
    for (const c of calm) clients.delete(c.ip);
  }
}

export type Verdict =
  | { action: "allow"; pressure: number }
  | { action: "slow"; pressure: number; delayMs: number }
  | { action: "block"; pressure: number; until: number; fresh: boolean };

/**
 * Counts one request and says what to do with it. `mode` "watch" always allows
 * (but records), "on" enforces.
 */
export function hit(input: { ip: string; weight: number; path: string; method: string; userAgent?: string; now?: number }, s: PressureSettings = policy().pressure): Verdict {
  const now = input.now ?? Date.now();
  sweep(now, s);
  const c = clients.get(input.ip) ?? fresh(input.ip, now);
  clients.set(input.ip, c);
  c.score = decay(c.score, now - c.at, s.halfLifeSeconds);
  c.at = now;
  c.lastAt = now;
  c.hits += 1;
  c.lastPath = input.path.slice(0, 160);
  c.lastMethod = input.method;
  if (input.userAgent) c.userAgent = input.userAgent.slice(0, 200);

  const enforce = s.mode === "on";
  if (enforce && c.blockedUntil > now) return { action: "block", pressure: pressureOf(c.score, s.capacity), until: c.blockedUntil, fresh: false };

  c.score += input.weight;
  const p = pressureOf(c.score, s.capacity);
  c.peak = Math.max(c.peak, p);

  if (p >= s.blockAt / 100) {
    const activeUntil = enforce ? c.blockedUntil : c.wouldBlockUntil;
    if (activeUntil > now) return enforce ? { action: "block", pressure: p, until: activeUntil, fresh: false } : { action: "allow", pressure: p };
    // Strikes are forgiven after a calm day.
    if (now - c.lastBlockAt > 24 * 60 * 60_000) c.strikes = 0;
    const until = now + blockMinutesFor(c.strikes, s.blockMinutes, s.maxBlockHours) * 60_000;
    c.strikes += 1;
    c.lastBlockAt = now;
    if (enforce) {
      c.blockedUntil = until;
      return { action: "block", pressure: p, until, fresh: true };
    }
    c.wouldBlockUntil = until;
    return { action: "allow", pressure: p };
  }
  const delayMs = slowDelayMs(p, s.slowAt, s.blockAt);
  if (delayMs > 0) {
    c.slowed += 1;
    if (enforce) return { action: "slow", pressure: p, delayMs };
  }
  return { action: "allow", pressure: p };
}

/** Extra weight after the answer (a failed sign-in, a page that doesn't exist…). */
export function penalize(ip: string, weight: number, s: PressureSettings = policy().pressure, now = Date.now()) {
  const c = clients.get(ip);
  if (!c || weight <= 0) return;
  c.score = decay(c.score, now - c.at, s.halfLifeSeconds) + weight;
  c.at = now;
  c.peak = Math.max(c.peak, pressureOf(c.score, s.capacity));
}

/** Clears an IP: score, strikes and automatic block. */
export function forgive(ip: string) {
  return clients.delete(ip);
}

export type ClientView = {
  ip: string;
  pressure: number;
  peak: number;
  hits: number;
  firstAt: number;
  lastAt: number;
  lastPath: string;
  lastMethod: string;
  userAgent: string;
  status: "ok" | "slowed" | "blocked" | "would-block";
  blockedUntil: number | null;
  strikes: number;
};

/** The busiest IPs right now (highest pressure first). */
export function snapshot(limit = 100, s: PressureSettings = policy().pressure, now = Date.now()): { clients: ClientView[]; tracked: number } {
  const out: ClientView[] = [];
  for (const c of clients.values()) {
    const p = pressureOf(decay(c.score, now - c.at, s.halfLifeSeconds), s.capacity);
    const blocked = c.blockedUntil > now;
    const would = c.wouldBlockUntil > now;
    const status: ClientView["status"] = blocked ? "blocked" : would ? "would-block" : p >= s.slowAt / 100 ? "slowed" : "ok";
    out.push({
      ip: c.ip,
      pressure: Math.round(p * 1000) / 1000,
      peak: Math.round(c.peak * 1000) / 1000,
      hits: c.hits,
      firstAt: c.firstAt,
      lastAt: c.lastAt,
      lastPath: c.lastPath,
      lastMethod: c.lastMethod,
      userAgent: c.userAgent,
      status,
      blockedUntil: blocked ? c.blockedUntil : would ? c.wouldBlockUntil : null,
      strikes: c.strikes,
    });
  }
  const rank = (v: ClientView) => (v.status === "blocked" || v.status === "would-block" ? 2 : 0) + v.pressure;
  out.sort((a, b) => rank(b) - rank(a) || b.hits - a.hits);
  return { clients: out.slice(0, limit), tracked: clients.size };
}

/** Tests only. */
export function resetPressure() {
  clients.clear();
  lastSweep = 0;
}
