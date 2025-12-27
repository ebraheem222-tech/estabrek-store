// src/features/auth/auth.service.ts
import * as AuthAPI from "../../api/auth.api";

/**
 * Service layer (optional) — keeps component clean.
 */
export async function doLogin(input: { email: string; password: string }) {
  return AuthAPI.login(input);
}

export async function doMfaFinalize(input: { sessionId: string; adminId: string; totp: string }) {
  return AuthAPI.mfaFinalize(input);
}
