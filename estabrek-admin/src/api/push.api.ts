// الإشعارات from the admin's side (backend modules/admin/push.controller.ts, lib/push.ts): notifications to the
// shoppers' phones that said yes. Sent in the background; each one's counts fill in as it goes.
import { api } from "./http";

export type PushAudience = "all" | "customers" | "customer";
export type PushWords = Partial<Record<"ar" | "en" | "he", { title?: string; body?: string }>>;
export type PushMessage = {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  image: string | null;
  words: PushWords | null;
  audience: PushAudience;
  /** Who sent it: the owner, a function's step, or an order's own news. */
  from: "admin" | "function" | "order";
  fnId: string | null;
  status: "QUEUED" | "SENDING" | "DONE";
  total: number;
  sent: number;
  failed: number;
  /** Phones the push service had forgotten: taken off the list. */
  gone: number;
  /** Taps on it. */
  opened: number;
  createdAt: string;
  finishedAt: string | null;
};
export type PushOverview = {
  /** The app and its notifications are on (الإعدادات → التطبيق). */
  on: boolean;
  ask: "banner" | "account";
  orders: boolean;
  phones: { all: number; customers: number; byDevice: Partial<Record<"android" | "iphone" | "desktop", number>> };
  messages: PushMessage[];
  limits: { title: number; body: number; url: number };
};
export type PushSend = { title: string; body?: string; url?: string; image?: string; words?: PushWords; audience: PushAudience; email?: string };

export const getPush = async () => (await api.get<PushOverview>("/admin/push")).data;
export const pushCount = async (audience: PushAudience, email?: string) =>
  (await api.get<{ audience: PushAudience; phones: number; customer?: { id: string; name: string; email: string } }>("/admin/push/count", { params: { audience, ...(email ? { email } : {}) } })).data;
export const sendPush = async (body: PushSend) => (await api.post<{ message: { id: string; status: string; total: number } }>("/admin/push", body)).data;
