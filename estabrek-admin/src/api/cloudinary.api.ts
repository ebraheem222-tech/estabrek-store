// The store's own Cloudinary account (backend lib/cloudinaryAccount.ts, /v1/admin/settings/cloudinary): where its
// pictures and videos go. Given here instead of the server's variables; its secret goes to the server and never
// comes back.
import { api } from "./http";

export type CloudinaryAccount = { source: "env" | "saved" | "none"; cloudName: string | null; apiKeyEnd: string | null; savedAt: string | null };

const BASE = "/admin/settings/cloudinary";
export async function getCloudinaryAccount() {
  return (await api.get(BASE)).data as CloudinaryAccount;
}
/** Tried with Cloudinary first, then kept. */
export async function saveCloudinaryAccount(body: { cloudName: string; apiKey: string; apiSecret: string }) {
  return (await api.put(BASE, body)).data as CloudinaryAccount;
}
export async function removeCloudinaryAccount() {
  return (await api.delete(BASE)).data as CloudinaryAccount;
}
