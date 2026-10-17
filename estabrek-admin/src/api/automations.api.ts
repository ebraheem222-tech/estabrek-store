// Automations, "when X, do Y" (admin → التلقائيات), and the admin's notification bell.
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type Trigger = "order.created" | "stock.low" | "video.ready" | "product.viral" | "job.failing";
export type Action = "notify" | "email" | "whatsapp" | "sms" | "pinProduct";

export type AutomationRule = {
  id: string;
  name: string;
  trigger: Trigger;
  conditions: Record<string, number>;
  action: Action;
  config: { to?: string; subject?: string; text?: string; hours?: number };
  enabled: boolean;
  cooldownMinutes: number;
  lastFiredAt: string | null;
  fired: number;
  createdAt: string;
};

export type AutomationRun = { id: string; ruleId: string; at: string; subject: string | null; ok: boolean; detail: string | null };

export type AutomationsPage = {
  rules: AutomationRule[];
  runs: AutomationRun[];
  triggers: Record<Trigger, { conditions: Record<string, number>; words: string[]; text: string; product: boolean }>;
  channels: { email: boolean; sms: boolean; whatsapp: boolean; outboxWorker: boolean };
  shop: { email: string | null; whatsapp: string | null; phone: string | null };
};

export type RuleInput = Pick<AutomationRule, "name" | "trigger" | "conditions" | "action" | "config" | "enabled" | "cooldownMinutes">;

export type AdminNotification = { id: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };

const A = ENDPOINTS.admin.automations;
const N = ENDPOINTS.admin.notifications;

export async function getAutomations() {
  return (await api.get(A.base)).data as AutomationsPage;
}
export async function createRule(body: RuleInput) {
  return (await api.post(A.base, body)).data as { rule: AutomationRule };
}
export async function updateRule(id: string, body: RuleInput) {
  return (await api.patch(A.one(id), body)).data as { rule: AutomationRule };
}
export async function deleteRule(id: string) {
  return (await api.delete(A.one(id))).data as { ok: true };
}
export async function testRule(id: string) {
  return (await api.post(A.test(id), {})).data as { ok: boolean; detail: string };
}

export async function getNotifications() {
  return (await api.get(N.base)).data as { notifications: AdminNotification[]; unread: number };
}
export async function markNotificationsRead(ids?: string[]) {
  return (await api.post(N.read, ids ? { ids } : {})).data as { unread: number };
}
