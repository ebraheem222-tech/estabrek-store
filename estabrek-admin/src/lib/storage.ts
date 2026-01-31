// src/lib/storage.ts
const ACCESS_KEY = "estabrek_admin_accessToken";
const REFRESH_KEY = "estabrek_admin_refreshToken";
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage failures (e.g., tracking prevention)
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
};

export function getAccessToken(): string | null {
  return safeGet(ACCESS_KEY) ?? memoryAccessToken;
}

export function getRefreshToken(): string | null {
  return safeGet(REFRESH_KEY) ?? memoryRefreshToken;
}

export function setTokens(tokens: StoredTokens) {
  memoryAccessToken = tokens.accessToken;
  memoryRefreshToken = tokens.refreshToken;
  safeSet(ACCESS_KEY, tokens.accessToken);
  safeSet(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens() {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  safeRemove(ACCESS_KEY);
  safeRemove(REFRESH_KEY);
}

export function hasTokens(): boolean {
  return !!getAccessToken() && !!getRefreshToken();
}

/**
 * Optional helper: decode JWT payload (no verification).
 * Useful for reading role/exp if your backend includes them.
 */
export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
