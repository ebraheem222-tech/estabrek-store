import { env } from "./env.js";
import {
  adminIpAllowlist,
  adminIpBlocklist,
  globalIpAllowlist,
  globalIpBlocklist,
  webhookIpAllowlist,
  webhookIpBlocklist,
} from "./ipLists.manual.js";
import { compileIpRules, isIpInRules, normalizeIp, parseIpList, type CompiledIpRule } from "../utils/ip.js";
import { policy, policyVersion } from "../lib/securityPolicy.js";

const globalAllowRules = compileIpRules([
  ...globalIpAllowlist,
  ...parseIpList(env.IP_ALLOWLIST),
]);
const globalBlockRules = compileIpRules([
  ...globalIpBlocklist,
  ...parseIpList(env.IP_BLOCKLIST),
]);

const adminAllowRules = compileIpRules([
  ...adminIpAllowlist,
  ...parseIpList(env.ADMIN_IP_ALLOWLIST),
]);
const adminBlockRules = compileIpRules([
  ...adminIpBlocklist,
  ...parseIpList(env.ADMIN_IP_BLOCKLIST),
]);

const webhookAllowRules = compileIpRules([
  ...webhookIpAllowlist,
  ...parseIpList(env.WEBHOOK_IP_ALLOWLIST),
]);
const webhookBlockRules = compileIpRules([
  ...webhookIpBlocklist,
  ...parseIpList(env.WEBHOOK_IP_BLOCKLIST),
]);

/**
 * Lists from the admin's Security page, added to the environment lists above.
 * Rebuilt only when the policy changes.
 */
let compiledFor = -1;
let fromPolicy = { siteBlock: [] as CompiledIpRule[], adminAllow: [] as CompiledIpRule[], adminBlock: [] as CompiledIpRule[] };
function policyRules() {
  const v = policyVersion();
  const p = policy(); // may refresh in the background
  if (v !== compiledFor) {
    fromPolicy = {
      siteBlock: compileIpRules(p.ip.siteBlock),
      adminAllow: compileIpRules(p.ip.adminAllow),
      adminBlock: compileIpRules(p.ip.adminBlock),
    };
    compiledFor = v;
  }
  return fromPolicy;
}

/** Would these lists stop this IP from reaching the admin? (Used before saving.) */
export function wouldBlockAdmin(ip: string, lists: { siteBlock: string[]; adminAllow: string[]; adminBlock: string[] }) {
  const n = normalizeIp(ip);
  if (isIpInRules(n, compileIpRules(lists.siteBlock))) return "BLOCKS_YOUR_IP" as const;
  if (isIpInRules(n, compileIpRules(lists.adminBlock))) return "BLOCKS_YOUR_IP" as const;
  const allow = compileIpRules(lists.adminAllow);
  if (allow.length && !isIpInRules(n, allow)) return "NOT_IN_ALLOWLIST" as const;
  return null;
}

function isAdminPath(p: string) {
  return p === "/v1/admin" || p.startsWith("/v1/admin/");
}

function isWebhookPath(p: string) {
  return p === "/v1/webhooks" || p.startsWith("/v1/webhooks/");
}

function evaluate(ip: string, allowRules: CompiledIpRule[], blockRules: CompiledIpRule[]) {
  if (blockRules.length && isIpInRules(ip, blockRules)) return "IP_BLOCKED" as const;
  if (allowRules.length && !isIpInRules(ip, allowRules)) return "IP_NOT_ALLOWED" as const;
  return null;
}

export function checkIpAccess(params: { ip: string; path: string }) {
  const ip = normalizeIp(params.ip);
  const path = params.path || "/";

  const extra = policyRules();

  const global = evaluate(ip, globalAllowRules, [...globalBlockRules, ...extra.siteBlock]);
  if (global) return { allowed: false as const, code: global };

  if (isAdminPath(path)) {
    const admin = evaluate(ip, [...adminAllowRules, ...extra.adminAllow], [...adminBlockRules, ...extra.adminBlock]);
    if (admin) return { allowed: false as const, code: admin };
  }

  if (isWebhookPath(path)) {
    const webhook = evaluate(ip, webhookAllowRules, webhookBlockRules);
    if (webhook) return { allowed: false as const, code: webhook };
  }

  return { allowed: true as const };
}
