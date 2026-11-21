// Admin → الإعدادات → النشرة البريدية → Mailchimp (the backend's lib/mailchimp.ts, modules/admin/mailchimp.controller.ts).
// The key is sent once and kept sealed on the server; it never comes back here.
import { api } from "./http";

export type MailchimpState = {
  enabled: boolean;
  keySet: boolean;
  /** The saved key's data centre ("us21"), to tell which account. */
  keyCentre: string | null;
  /** A key is saved but this server can't open it (it was sealed with another server key): type it again. */
  keyUnreadable: boolean;
  listId: string | null;
  doubleOptIn: boolean;
  syncedAt: string | null;
  error: string | null;
  subscribers: number;
  inAudience: number;
};
export type MailchimpList = { id: string; name: string; members: number };

export async function getMailchimp() {
  return (await api.get("/admin/newsletter/mailchimp")).data as MailchimpState;
}
/** A key typed now (its audiences), or the one saved when none is given. */
export async function mailchimpLists(apiKey?: string) {
  return (await api.post("/admin/newsletter/mailchimp/lists", apiKey ? { apiKey } : {})).data as { lists: MailchimpList[] };
}
export async function saveMailchimp(body: { enabled?: boolean; apiKey?: string | null; listId?: string | null; doubleOptIn?: boolean }) {
  return (await api.put("/admin/newsletter/mailchimp", body)).data as MailchimpState;
}
export async function syncMailchimp() {
  return (await api.post("/admin/newsletter/mailchimp/sync")).data as MailchimpState & { queued: number };
}
