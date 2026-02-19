// src/hooks/useAuth.ts
import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as AuthAPI from "../api/auth.api";
import * as AccountAPI from "../api/account.api";
import { getApiErrorMessage } from "../api/http";
import { authStore, useAuthStore } from "../store/auth.store";
import { hasTokens } from "../lib/storage";
import { toast } from "../lib/toast";
import type { AdminUser } from "../types/auth";
import { getPermissionsForRole, type AdminPermission } from "../lib/authz";

export function useAuth() {
  const status = useAuthStore((s) => s.status);
  const admin = useAuthStore((s) => s.admin);

  const isAuthenticated = status === "authenticated";
  const isTokenOnly = status === "token_only";

  // Fetch admin profile if tokens exist but admin not loaded yet
  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => {
      const res = await AccountAPI.getAdminMe();
      // backend might return { admin: {...} } or direct admin.
      const adminObj: AdminUser = (res?.admin ?? res) as AdminUser;
      authStore.setAdmin(adminObj);
      return adminObj;
    },
    enabled: hasTokens() && !admin,
    staleTime: 60_000,
  });

  const loginMutation = useMutation({
    mutationFn: AuthAPI.login,
    onSuccess: (res) => {
      // If MFA required, do not set admin yet.
      if ((res as any)?.mfaRequired) {
        toast.info("مطلوب رمز التحقق (2FA)");
        return;
      }
      const ok = res as AuthAPI.LoginOk;
      authStore.syncFromStorage();
      if (ok?.admin) authStore.setAdmin(ok.admin as any);
      toast.success("تم تسجيل الدخول");
    },
    onError: (e) => {
      toast.error("فشل تسجيل الدخول", { description: getApiErrorMessage(e) });
    },
  });

  const mfaFinalizeMutation = useMutation({
    mutationFn: AuthAPI.mfaFinalize,
    onSuccess: (res) => {
      authStore.syncFromStorage();
      if ((res as any)?.admin) authStore.setAdmin((res as any).admin);
      toast.success("تم تأكيد الرمز وتسجيل الدخول");
    },
    onError: (e) => {
      toast.error("فشل تأكيد الرمز", { description: getApiErrorMessage(e) });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: AuthAPI.logout,
    onSuccess: () => {
      authStore.clear();
    },
    onError: () => {
      // even if request fails, clear locally
      authStore.clear();
    },
  });

  const role = admin?.role ?? null;
  const permissions = useMemo(() => getPermissionsForRole(role), [role]);

  return useMemo(
    () => ({
      status,
      admin,
      role,
      permissions,
      isAuthenticated,
      isTokenOnly,
      meQuery,

      login: loginMutation,
      mfaFinalize: mfaFinalizeMutation,
      logout: logoutMutation,

      sync: () => authStore.syncFromStorage(),
      clear: () => authStore.clear(),
      isSuperAdmin: () => authStore.isSuperAdmin(),
      hasPermission: (permission: AdminPermission) => authStore.hasPermission(permission),
    }),
    [status, admin, role, permissions, isAuthenticated, isTokenOnly, meQuery, loginMutation, mfaFinalizeMutation, logoutMutation]
  );
}
