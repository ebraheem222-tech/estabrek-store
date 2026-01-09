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

  const global = evaluate(ip, globalAllowRules, globalBlockRules);
  if (global) return { allowed: false as const, code: global };

  if (isAdminPath(path)) {
    const admin = evaluate(ip, adminAllowRules, adminBlockRules);
    if (admin) return { allowed: false as const, code: admin };
  }

  if (isWebhookPath(path)) {
    const webhook = evaluate(ip, webhookAllowRules, webhookBlockRules);
    if (webhook) return { allowed: false as const, code: webhook };
  }

  return { allowed: true as const };
}
