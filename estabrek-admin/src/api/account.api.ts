// src/api/account.api.ts
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type UpdateProfileInput = {
  name?: string;
  phone?: string | null;
  secondEmail?: string | null;
  secondPhone?: string | null;
};

export async function getAdminMe() {
  const res = await api.get(ENDPOINTS.admin.account.me);
  return res.data as any;
}

export async function updateAdminProfile(body: UpdateProfileInput) {
  const res = await api.patch(ENDPOINTS.admin.account.profile, body);
  return res.data as any;
}

export async function requestEmailChange(newEmail: string) {
  const res = await api.post(ENDPOINTS.admin.account.emailChangeRequest, { newEmail });
  return res.data as any;
}

export async function confirmEmailChange(token: string) {
  const res = await api.post(ENDPOINTS.admin.account.emailChangeConfirm, { token });
  return res.data as any;
}
