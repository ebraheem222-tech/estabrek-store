// src/store/auth.store.ts
import { useSyncExternalStore } from "react";
import type { AdminUser, Role } from "../types/auth";
import { getAccessToken, getRefreshToken, setTokens as saveTokens, clearTokens as clearStoredTokens } from "../lib/storage";
import type { AdminPermission } from "../lib/authz";
import { hasRolePermission } from "../lib/authz";

type AuthStatus = "anonymous" | "authenticated" | "token_only";

export type AuthState = {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
  admin: AdminUser | null;
};

type Listener = () => void;

let state: AuthState = {
  accessToken: getAccessToken(),
  refreshToken: getRefreshToken(),
  admin: null,
  status: (() => {
    const at = getAccessToken();
    const rt = getRefreshToken();
    if (at && rt) return "token_only";
    return "anonymous";
  })(),
};

const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  emit();
}

export const authStore = {
  getState(): AuthState {
    return state;
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Use after login/refresh returns tokens (api/http already stores them, but we keep store in sync). */
  syncFromStorage() {
    const at = getAccessToken();
    const rt = getRefreshToken();
    setState({
      accessToken: at,
      refreshToken: rt,
      status: at && rt ? (state.admin ? "authenticated" : "token_only") : "anonymous",
    });
  },

  setAuth(tokens: { accessToken: string; refreshToken: string }, admin?: AdminUser | null) {
    saveTokens(tokens);
    setState({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      admin: admin ?? state.admin,
      status: admin ? "authenticated" : "token_only",
    });
  },

  setAdmin(admin: AdminUser | null) {
    const at = state.accessToken ?? getAccessToken();
    const rt = state.refreshToken ?? getRefreshToken();
    setState({
      admin,
      accessToken: at,
      refreshToken: rt,
      status: admin && at && rt ? "authenticated" : at && rt ? "token_only" : "anonymous",
    });
  },

  clear() {
    clearStoredTokens();
    setState({
      accessToken: null,
      refreshToken: null,
      admin: null,
      status: "anonymous",
    });
  },

  isSuperAdmin(): boolean {
    return state.admin?.role === ("SUPERADMIN" satisfies Role);
  },

  hasPermission(permission: AdminPermission): boolean {
    return hasRolePermission(state.admin?.role ?? null, permission);
  },
};

/** React hook to read store with selector (Zustand-like, no deps). */
export function useAuthStore<T>(selector: (s: AuthState) => T): T {
  return useSyncExternalStore(authStore.subscribe, () => selector(authStore.getState()));
}
