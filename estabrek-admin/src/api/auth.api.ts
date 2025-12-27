// src/api/auth.api.ts
import { api, setTokens, clearTokens } from "./http";
import { ENDPOINTS } from "./endpoints";

export type AdminRole = "SUPERADMIN";

export type AdminUser = {
  id: string;
  email: string;
  role: AdminRole;
  name?: string | null;
  phone?: string | null;
  twoFactorEnabled?: boolean;
};

export type MfaMethod = "TOTP" | "SMS";

export type LoginOk = {
  accessToken: string;
  refreshToken: string;
  admin: AdminUser;
};

export type LoginMfaRequired = {
  mfaRequired: true;
  sessionId: string;
  adminId: string;
  method?: MfaMethod;
  challengeId?: string;
};

export type LoginResponse = LoginOk | LoginMfaRequired;

export async function login(input: { email: string; password: string }): Promise<LoginResponse> {
  const res = await api.post(ENDPOINTS.auth.login, input, { validateStatus: () => true });
  if (res.status === 206) return res.data as LoginMfaRequired;

  const data = res.data as LoginOk;
  if (data?.accessToken && data?.refreshToken) setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data;
}

export async function mfaFinalize(input: { sessionId: string; adminId: string; totp?: string; code?: string; challengeId?: string }) {
  const res = await api.post(ENDPOINTS.auth.mfaFinalize, input);
  const data = res.data as { accessToken: string; refreshToken: string; admin?: AdminUser };
  setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data;
}

export async function phoneStart(input: { phone: string }) {
  const res = await api.post(ENDPOINTS.auth.phoneStart, input);
  return res.data as { ok: true; challengeId: string; expiresAt: string };
}

export async function phoneVerify(input: { challengeId: string; code: string }) {
  const res = await api.post(ENDPOINTS.auth.phoneVerify, input, { validateStatus: () => true });

  if (res.status === 206) return res.data as LoginMfaRequired;

  const data = res.data as LoginOk;
  if (data?.accessToken && data?.refreshToken) setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data;
}

export async function forgotPassword(input: { email: string }) {
  const res = await api.post(ENDPOINTS.auth.passwordForgot, input);
  // backend returns { ok: true, token?: string }
  return res.data as { ok: true; token?: string };
}

export async function resetPassword(input: { token: string; newPassword: string }) {
  const res = await api.post(ENDPOINTS.auth.passwordReset, input);
  return res.data as { ok: true };
}

export async function twofaSetup() {
  const res = await api.post(ENDPOINTS.auth.twofaSetup, {});
  return res.data as { secret: string; uri: string };
}

export async function twofaEnableTotp(input: { secret: string; code: string; label?: string }) {
  const res = await api.post(ENDPOINTS.auth.twofaEnable, input);
  return res.data as { ok: true; deviceId: string };
}

export async function twofaDisable(input: { deviceId?: string }) {
  const res = await api.post(ENDPOINTS.auth.twofaDisable, input);
  return res.data as { ok: true };
}

export async function twofaSmsStart() {
  const res = await api.post(ENDPOINTS.auth.twofaSmsStart, {});
  return res.data as { ok: true; challengeId: string; expiresAt: string };
}

export async function twofaSmsConfirm(input: { challengeId: string; code: string; label?: string }) {
  const res = await api.post(ENDPOINTS.auth.twofaSmsConfirm, input);
  return res.data as { ok: true; deviceId: string };
}

export async function recoveryGenerate(input: { count?: number }) {
  const res = await api.post(ENDPOINTS.auth.recoveryGenerate, input ?? {});
  return res.data as { codes: string[] };
}

export async function logout() {
  const rt = localStorage.getItem("estabrek_admin_refreshToken");
  if (!rt) {
    clearTokens();
    return { ok: true };
  }

  const res = await api.post(ENDPOINTS.auth.logout, { refreshToken: rt });
  clearTokens();
  return res.data as { ok: true };
}

export async function me() {
  const res = await api.get(ENDPOINTS.auth.me);
  return res.data as { user: { sub: string; email?: string; role?: AdminRole } };
}
