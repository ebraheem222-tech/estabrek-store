// src/api/http.ts
import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import type { AxiosInstance } from "axios";
import { env } from "../config/env";
import { ENDPOINTS } from "./endpoints";

const ACCESS_KEY = "estabrek_admin_accessToken";
const REFRESH_KEY = "estabrek_admin_refreshToken";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}
export function setTokens(tokens: { accessToken: string; refreshToken: string }) {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/**
 * Axios instance used for normal API calls (has interceptors)
 */
export const api: AxiosInstance = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Backward-compat alias (some pages import { http })
export const http = api;

/**
 * Raw instance (NO interceptors) used only for refresh to avoid loops.
 */
const raw: AxiosInstance = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh (prevents 10 parallel refresh calls)
let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

async function refreshTokens(): Promise<{ accessToken: string; refreshToken: string }> {
  const rt = getRefreshToken();
  if (!rt) {
    clearTokens();
    throw new Error("NO_REFRESH_TOKEN");
  }

  // Backend expects: { refreshToken }
  const res = await raw.post(ENDPOINTS.auth.refresh, { refreshToken: rt });
  const tokens = res.data as { accessToken: string; refreshToken: string };
  setTokens(tokens);
  return tokens;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // If we don't have original request, just throw
    if (!original) throw error;

    // Do not retry refresh/login/logout itself
    const url = original.url ?? "";
    const isAuthEndpoint =
      url.includes(ENDPOINTS.auth.refresh) ||
      url.includes(ENDPOINTS.auth.login) ||
      url.includes(ENDPOINTS.auth.logout) ||
      url.includes(ENDPOINTS.auth.mfaFinalize) ||
      url.includes(ENDPOINTS.auth.mfaTokensFromSession);

    if (status !== 401 || original._retry || isAuthEndpoint) {
      throw error;
    }

    original._retry = true;

    try {
      if (!refreshPromise) refreshPromise = refreshTokens();
      await refreshPromise;
      refreshPromise = null;

      // retry original request with new access token (request interceptor will attach it)
      return api.request(original);
    } catch (e) {
      refreshPromise = null;
      clearTokens();
      throw error;
    }
  }
);

/**
 * Optional: normalize backend error shape into something consistent.
 */
export function getApiErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Unknown error";

  const ax = err as AxiosError<any>;
  const data = ax.response?.data;

  // Common validation shapes: { errors: [...] } or { errors: { field: [..] } }
  const errors = (data as any)?.errors;
  if (Array.isArray(errors) && errors.length) {
    return errors.map((e) => (typeof e === "string" ? e : JSON.stringify(e))).join(" | ");
  }
  if (errors && typeof errors === "object") {
    const parts: string[] = [];
    Object.keys(errors).forEach((k) => {
      const val = (errors as any)[k];
      if (Array.isArray(val)) {
        parts.push(`${k}: ${val.join(", ")}`);
      } else if (typeof val === "string") {
        parts.push(`${k}: ${val}`);
      }
    });
    if (parts.length) return parts.join(" | ");
  }

  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  if (typeof ax.message === "string") return ax.message;

  return "Request failed";
}
