// src/features/auth/LoginPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { getApiErrorMessage } from "../../api/http";
import { validateLogin } from "./auth.schema";
import { useAuth } from "../../hooks/useAuth";
import { hasTokens } from "../../lib/storage";
import { firstAllowedPath } from "../../layouts/adminNav";
import * as AuthAPI from "../../api/auth.api";
import { useMutation } from "@tanstack/react-query";
import { tr } from "@/lib/words";

type Mode = "email" | "phone";

export default function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { admin, login, hasPermission } = useAuth();

  const [mode, setMode] = useState<Mode>("email");

  // email/password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // phone
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneChallengeId, setPhoneChallengeId] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const from = useMemo(() => {
    const st: any = location.state;
    return st?.from?.pathname ?? "/admin/dashboard";
  }, [location.state]);

  const loginReason = useMemo(() => {
    const qs = new URLSearchParams(location.search);
    return qs.get("reason");
  }, [location.search]);

  useEffect(() => {
    if (!admin) return;
    // A team member without the dashboard goes to the first page they may open.
    const target = from === "/admin/dashboard" && !hasPermission("dashboard:read") ? firstAllowedPath(hasPermission) : from;
    nav(target, { replace: true });
  }, [admin, hasPermission, nav, from]);

  const phoneStart = useMutation({ mutationFn: AuthAPI.phoneStart });
  const phoneVerify = useMutation({ mutationFn: AuthAPI.phoneVerify });

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const v = validateLogin({ email, password });
    if (!v.ok) {
      setFieldErrors(v.errors);
      return;
    }
    setFieldErrors({});

    try {
      const res = await login.mutateAsync({ email: email.trim(), password: password.trim() });

      if ((res as any)?.mfaRequired) {
        const mfa = res as any;
        nav("/login/mfa", {
          replace: true,
          state: {
            sessionId: mfa.sessionId,
            adminId: mfa.adminId,
            email: email.trim(),
            method: mfa.method ?? "TOTP",
            challengeId: mfa.challengeId ?? null,
          },
        });
        return;
      }

      nav("/admin/dashboard", { replace: true });
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const onPhoneStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const out = await phoneStart.mutateAsync({ phone: phone.trim() });
      setPhoneChallengeId(out.challengeId);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const onPhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!phoneChallengeId) return;

    try {
      const res = await phoneVerify.mutateAsync({ challengeId: phoneChallengeId, code: phoneCode.trim() });

      if ((res as any)?.mfaRequired) {
        const mfa = res as any;
        nav("/login/mfa", {
          replace: true,
          state: {
            sessionId: mfa.sessionId,
            adminId: mfa.adminId,
            method: mfa.method ?? "TOTP",
            challengeId: mfa.challengeId ?? null,
          },
        });
        return;
      }

      nav("/admin/dashboard", { replace: true });
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="relative w-full max-w-md animate-fade-in-up">
      {/* Background glow */}
      <div className="absolute -inset-40 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative glass rounded-3xl p-8 shadow-elevated">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-glow">
            <span className="text-white font-bold text-2xl">E</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">{tr("أهلاً من جديد", "Welcome back")}</h1>
          <p className="mt-2 text-sm text-white/50">{tr("تسجيل الدخول للوصول إلى لوحة الإدارة", "Sign in to reach the admin")}</p>
        </div>

        {loginReason === "suspended" && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {tr("هذا الحساب موقوف. يرجى التواصل مع صاحب المتجر.", "This account is suspended. Please contact the store owner.")}
          </div>
        )}

        {loginReason === "expired" && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            {tr("انتهت الجلسة. يرجى تسجيل الدخول من جديد.", "Your session ended. Please sign in again.")}
          </div>
        )}

        {/* Mode tabs */}
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-2">
          <button
            type="button"
            onClick={() => setMode("email")}
            className={`rounded-xl px-3 py-2 text-sm transition ${mode === "email" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"}`}
          >
            {tr("بريد + كلمة مرور", "Email + password")}
          </button>
          <button
            type="button"
            onClick={() => setMode("phone")}
            className={`rounded-xl px-3 py-2 text-sm transition ${mode === "phone" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"}`}
          >
            {tr("رقم هاتف + كود", "Phone + code")}
          </button>
        </div>

        {mode === "email" ? (
          <form onSubmit={onEmailSubmit} className="space-y-5">
            <Input
              label={tr("البريد الإلكتروني", "Email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              type="email"
              error={fieldErrors.email}
            />

            <div className="relative">
              <Input
                label={tr("كلمة المرور", "Password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                error={fieldErrors.password}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-white/40 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? tr("إخفاء", "Hide") : tr("إظهار", "Show")}
                  </button>
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => nav("/login/forgot")}
                className="text-xs text-white/60 hover:text-white"
              >
                {tr("نسيت كلمة المرور؟", "Forgot your password?")}
              </button>

              <div className="text-xs text-white/30">{tr("آمن + سريع", "Safe + quick")}</div>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <span>{formError}</span>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full h-12" isLoading={login.isPending}>
              {tr("تسجيل الدخول", "Sign in")}
            </Button>

            <div className="mt-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-xs text-white/40 text-center">
                {tr("للتجربة:", "For testing:")}
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={phoneChallengeId ? onPhoneVerify : onPhoneStart} className="space-y-5">
            <Input
              label={tr("رقم الهاتف", "Phone number")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+9725xxxxxxxx"
              autoComplete="tel"
              type="tel"
            />

            {phoneChallengeId ? (
              <>
                <Input
                  label={tr("الكود", "Code")}
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  placeholder="••••••"
                  type="text"
                />
                <div className="flex items-center gap-2">
                  <Button type="submit" variant="primary" className="flex-1 h-12" isLoading={phoneVerify.isPending}>
                    {tr("تحقق ودخول", "Verify and sign in")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-12"
                    onClick={() => {
                      setPhoneChallengeId(null);
                      setPhoneCode("");
                    }}
                  >
                    {tr("تغيير الرقم", "Change number")}
                  </Button>
                </div>
              </>
            ) : (
              <Button type="submit" variant="primary" className="w-full h-12" isLoading={phoneStart.isPending}>
                {tr("إرسال كود", "Send code")}
              </Button>
            )}

            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <span>{formError}</span>
              </div>
            )}

            <p className="text-xs text-white/40">
              {tr("رح توصل رسالة SMS فيها كود. إذا التحقق بخطوتين (Authenticator) شغّال، ممكن تنطلب خطوة إضافية.", "A text message with a code is on its way. With two-step sign-in (an authenticator app) on, there may be one more step.")}
            </p>
          </form>
        )}

        {hasTokens() && (
          <p className="mt-4 text-xs text-center text-white/30">
            {tr("في بيانات دخول محفوظة بهالمتصفح. إذا صار في مشكلة، يرجى مسح LocalStorage.", "This browser has saved sign-in data. If something goes wrong, clear its LocalStorage.")}
          </p>
        )}
      </div>
    </div>
  );
}
