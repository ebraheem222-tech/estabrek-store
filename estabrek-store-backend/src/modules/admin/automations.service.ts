/**
 * Automations, "when X, do Y" (admin → التلقائيات). Events come in through
 * lib/automations emitAutomation (a new order, a video ready, a job failing) or
 * from the background job "automations" (every 2 minutes: stock below a rule's
 * line, a product's popularity jumping, pinned products due back). Each enabled
 * rule for the event checks its condition and its cooldown for the same thing,
 * then does its action:
 *   notify       the bell in the admin
 *   email        to the owner through the outbox (OWNER_ALERT)
 *   whatsapp     through the outbox (the WhatsApp sender is a stub until a provider is set)
 *   sms          through the outbox (Twilio)
 *   pinProduct   the product is pinned in the cache, for a few hours
 * Every run is kept (AutomationRun, the latest 500).
 */
import type { AutomationRule } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { triggerJob } from "../../lib/jobs.js";
import { readPerformance, savePerformance } from "../../lib/performanceSettings.js";
import { rankedProducts } from "../../lib/popularity.js";
import { DEFAULT_TEXT, conditionsMet, render, setAutomationHandler, type ActionConfig, type Trigger } from "../../lib/automations.js";
import { enqueueMessage } from "../outbox/outbox.service.js";
import { getOrCreateSettings } from "./settings.controller.js";

const KEEP_RUNS = 500;
const MIN = 60_000;

let cache: { at: number; rules: AutomationRule[] } | null = null;

/** After a rule is saved: read them again. */
export function forgetRules() {
  cache = null;
}

async function rulesFor(trigger: Trigger, now = Date.now()) {
  if (!cache || now - cache.at > 30_000) cache = { at: now, rules: await prisma.automationRule.findMany({ where: { enabled: true } }) };
  return cache.rules.filter((r) => r.trigger === trigger);
}

const adminLink = (path: unknown) => {
  const base = (env.ADMIN_APP_URL ?? "").replace(/\/+$/, "");
  return base && typeof path === "string" && path.startsWith("/") ? `${base}${path}` : null;
};

/** Does the rule's thing; returns what it did, in a few words. Throws when it can't. */
async function runAction(rule: Pick<AutomationRule, "id" | "name" | "trigger" | "action" | "config">, data: Record<string, unknown>, subject: string, now: number): Promise<string> {
  const c = (rule.config ?? {}) as ActionConfig;
  const text = render(c.text || DEFAULT_TEXT[rule.trigger as Trigger] || rule.name, data);
  if (rule.action === "notify") {
    await prisma.adminNotification.create({ data: { title: rule.name, body: text, link: typeof data.link === "string" ? data.link : null } });
    return "إشعار باللوحة";
  }
  if (rule.action === "email" || rule.action === "whatsapp" || rule.action === "sms") {
    const s = await getOrCreateSettings();
    const to =
      c.to?.trim() ||
      (rule.action === "email" ? s.ordersEmail || s.contactEmail : rule.action === "whatsapp" ? s.whatsappNumber || s.contactPhone : s.contactPhone || s.whatsappNumber) ||
      "";
    if (!to) throw new Error(rule.action === "email" ? "NO_EMAIL: add one to the rule or the settings" : "NO_PHONE: add one to the rule or the settings");
    await enqueueMessage(
      rule.action === "email"
        ? { channel: "EMAIL", to, template: "OWNER_ALERT", payloadJson: { subject: render(c.subject || rule.name, data), text, url: adminLink(data.link) } }
        : { channel: rule.action === "whatsapp" ? "WHATSAPP" : "SMS", to, template: "OWNER_ALERT", payloadJson: { text } },
    );
    // Sent now when the server sends messages by itself (OUTBOX_WORKER), else with the next "send now".
    triggerJob("outbox");
    return `${rule.action === "email" ? "إيميل" : rule.action === "whatsapp" ? "واتساب" : "SMS"} ← ${to}`;
  }
  // pinProduct
  const productId = typeof data.productId === "string" ? data.productId : null;
  if (!productId) throw new Error("NO_PRODUCT");
  const { cache: cfg } = await readPerformance();
  const hours = c.hours ?? 48;
  if (!cfg.popularity.pinned.includes(productId)) {
    if (cfg.popularity.pinned.length >= 50) throw new Error("PINNED_FULL: 50 pinned already");
    await savePerformance({}, { cache: { ...cfg, popularity: { ...cfg.popularity, pinned: [...cfg.popularity.pinned, productId] } } });
    // Unpinned by the job after `hours` (only if this rule pinned it).
    await prisma.automationState.upsert({
      where: { ruleId_subject: { ruleId: rule.id, subject: `pin:${productId}` } },
      create: { ruleId: rule.id, subject: `pin:${productId}`, lastAt: new Date(now), until: new Date(now + hours * 3600_000) },
      update: { lastAt: new Date(now), until: new Date(now + hours * 3600_000) },
    });
    return `تثبيت بالكاش لمدة ${hours} ساعة`;
  }
  return "مثبّت أصلاً";
}

async function record(rule: AutomationRule, subject: string, ok: boolean, detail: string, now: number) {
  await prisma.automationRun.create({ data: { ruleId: rule.id, subject, ok, detail: detail.slice(0, 300), at: new Date(now) } });
  await prisma.automationRule.update({ where: { id: rule.id }, data: { lastFiredAt: new Date(now), fired: { increment: 1 } } });
  // Only the latest runs are kept.
  if (Math.random() < 0.05) {
    const old = await prisma.automationRun.findMany({ orderBy: { at: "desc" }, skip: KEEP_RUNS, select: { id: true } });
    if (old.length) await prisma.automationRun.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  }
}

/** An event: every rule for it (or just `only`), its condition, its cooldown for the same thing, its action. */
export async function handleEvent(trigger: Trigger, data: Record<string, unknown>, subject: string, now = Date.now(), only?: AutomationRule[]) {
  let ran = 0;
  for (const rule of only ?? (await rulesFor(trigger, now))) {
    if (!conditionsMet(trigger, (rule.conditions ?? {}) as Record<string, unknown>, data)) continue;
    const key = { ruleId_subject: { ruleId: rule.id, subject } };
    if (rule.cooldownMinutes > 0) {
      const st = await prisma.automationState.findUnique({ where: key });
      if (st && now - st.lastAt.getTime() < rule.cooldownMinutes * MIN) continue;
    }
    await prisma.automationState.upsert({ where: key, create: { ruleId: rule.id, subject, lastAt: new Date(now) }, update: { lastAt: new Date(now) } });
    let ok = true;
    let detail: string;
    try {
      detail = await runAction(rule, data, subject, now);
    } catch (e) {
      ok = false;
      detail = e instanceof Error ? e.message : String(e);
    }
    await record(rule, subject, ok, detail, now);
    ran += 1;
  }
  return ran;
}

/** "Try it": the rule's action with example words, recorded as a test. */
export async function testRule(rule: AutomationRule, sample: Record<string, unknown>, now = Date.now()) {
  let ok = true;
  let detail: string;
  try {
    detail = await runAction(rule, sample, "test", now);
  } catch (e) {
    ok = false;
    detail = e instanceof Error ? e.message : String(e);
  }
  await prisma.automationRun.create({ data: { ruleId: rule.id, subject: "test", ok, detail: `تجربة: ${detail}`.slice(0, 300), at: new Date(now) } });
  return { ok, detail };
}

/* ---------------- The background job ---------------- */

/** Popularity a while ago (the job's own memory), to see a jump. */
const scoreHistory: Array<{ at: number; scores: Map<string, number> }> = [];

async function watchStock(now: number) {
  const rules = await rulesFor("stock.low", now);
  if (!rules.length) return 0;
  let fired = 0;
  for (const rule of rules) {
    const threshold = Number(((rule.conditions ?? {}) as { threshold?: number }).threshold ?? 3);
    const low = await prisma.productVariant.findMany({
      where: { stock: { lte: threshold }, item: { isActive: true, product: { isActive: true } } },
      select: { id: true, sku: true, stock: true, size: { select: { name: true } }, item: { select: { colorName: true, product: { select: { id: true, title: true } } } } },
      take: 200,
    });
    const latched = await prisma.automationState.findMany({ where: { ruleId: rule.id, latched: true }, select: { subject: true } });
    const lowIds = new Set(low.map((v) => `variant:${v.id}`));
    // Back above the line: may fire again next time it drops.
    const back = latched.filter((s) => s.subject.startsWith("variant:") && !lowIds.has(s.subject)).map((s) => s.subject);
    if (back.length) await prisma.automationState.updateMany({ where: { ruleId: rule.id, subject: { in: back } }, data: { latched: false } });
    const still = new Set(latched.map((s) => s.subject));
    for (const v of low) {
      const subject = `variant:${v.id}`;
      if (still.has(subject)) continue;
      const data = { product: v.item.product.title, productId: v.item.product.id, color: v.item.colorName === "Default" ? "" : v.item.colorName, size: v.size.name, sku: v.sku, stock: v.stock, threshold, link: "/admin/inventory/low-stock" };
      // Only this rule (others for the same trigger have their own lines).
      fired += await handleEvent("stock.low", data, subject, now, [rule]);
      await prisma.automationState.update({ where: { ruleId_subject: { ruleId: rule.id, subject } }, data: { latched: true } }).catch(() => undefined);
    }
  }
  return fired;
}

async function watchViral(now: number) {
  const current = new Map(rankedProducts(200, now).map((p) => [p.id, p.score]));
  scoreHistory.push({ at: now, scores: current });
  while (scoreHistory.length && now - scoreHistory[0].at > 75 * MIN) scoreHistory.shift();
  const rules = await rulesFor("product.viral", now);
  if (!rules.length) return 0;
  // The oldest picture at least 50 minutes old (an hour, give or take the job's timer).
  const then = scoreHistory.find((h) => now - h.at >= 50 * MIN);
  if (!then) return 0;
  const ids = [...current.keys()];
  const titles = new Map((await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })).map((p) => [p.id, p.title]));
  let fired = 0;
  for (const rule of rules) {
    const c = (rule.conditions ?? {}) as { minScore?: number; factor?: number };
    for (const [id, score] of current) {
      const before = then.scores.get(id) ?? 0;
      const factor = score / Math.max(1, before);
      if (score < (c.minScore ?? 20) || factor < (c.factor ?? 3) || !titles.has(id)) continue;
      const data = { productId: id, product: titles.get(id), score: Math.round(score), before: Math.round(before), factor: Math.round(factor * 10) / 10, link: "/admin/system/cache#popular" };
      fired += await handleEvent("product.viral", data, `product:${id}`, now, [rule]);
    }
  }
  return fired;
}

/** Pinned by a rule and its time is up: unpinned (unless the owner unpinned it already). */
async function unpinDue(now: number) {
  const due = await prisma.automationState.findMany({ where: { subject: { startsWith: "pin:" }, until: { lte: new Date(now) } } });
  if (!due.length) return 0;
  const { cache: cfg } = await readPerformance();
  const ids = new Set(due.map((d) => d.subject.slice(4)));
  const pinned = cfg.popularity.pinned.filter((id) => !ids.has(id));
  if (pinned.length !== cfg.popularity.pinned.length) await savePerformance({}, { cache: { ...cfg, popularity: { ...cfg.popularity, pinned } } });
  await prisma.automationState.updateMany({ where: { subject: { in: due.map((d) => d.subject) } }, data: { until: null } });
  return due.length;
}

let checkVideos: (() => Promise<unknown>) | null = null;

/** The videos page's check for conversions still going (Cloudinary), so "video ready" comes on time. */
export function setVideoChecker(fn: () => Promise<unknown>) {
  checkVideos = fn;
}

export async function runAutomations(now = Date.now()) {
  if (checkVideos) await checkVideos().catch(() => undefined);
  const stock = await watchStock(now);
  const viral = await watchViral(now);
  const unpinned = await unpinDue(now);
  return { stock, viral, unpinned };
}

/** At start: events reach the rules. */
export function startAutomations() {
  setAutomationHandler((trigger, data, subject) => handleEvent(trigger, data, subject));
}

/** Tests. */
export function resetAutomationsForTests() {
  cache = null;
  scoreHistory.length = 0;
}
