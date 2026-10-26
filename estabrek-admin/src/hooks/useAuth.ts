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
import { permissionsOf, type AdminPermission } from "../lib/authz";
import { followAccountLanguage } from "../lib/lang";
import { tr } from "@/lib/words";

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
      // The admin in this member's language (reloads once when it changes).
      followAccountLanguage(adminObj);
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
        toast.info(tr("مطلوب رمز التحقق (2FA)", "Verification code needed (2FA)"));
        return;
      }
      const ok = res as AuthAPI.LoginOk;
      authStore.syncFromStorage();
      if (ok?.admin) authStore.setAdmin(ok.admin as any);
      followAccountLanguage(ok?.admin as AdminUser | undefined);
      toast.success(tr("تم تسجيل الدخول", "Signed in"));
    },
    onError: (e) => {
      toast.error(tr("فشل تسجيل الدخول", "Sign-in failed"), { description: getApiErrorMessage(e) });
    },
  });

  const mfaFinalizeMutation = useMutation({
    mutationFn: AuthAPI.mfaFinalize,
    onSuccess: (res) => {
      authStore.syncFromStorage();
      if ((res as any)?.admin) authStore.setAdmin((res as any).admin);
      followAccountLanguage((res as { admin?: AdminUser } | undefined)?.admin);
      toast.success(tr("تم تأكيد الرمز وتسجيل الدخول", "Code confirmed, signed in"));
    },
    onError: (e) => {
      toast.error(tr("فشل تأكيد الرمز", "Couldn't confirm the code"), { description: getApiErrorMessage(e) });
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
  const permissions = useMemo(() => permissionsOf(admin), [admin]);

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
