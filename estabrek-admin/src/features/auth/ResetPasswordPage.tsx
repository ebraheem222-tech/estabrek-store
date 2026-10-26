// src/features/auth/ResetPasswordPage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import * as AuthAPI from "../../api/auth.api";
import { useMutation } from "@tanstack/react-query";
import { tr } from "@/lib/words";

type Errors = { token?: string; pw1?: string; pw2?: string };

export default function ResetPasswordPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const initialToken = useMemo(() => sp.get("token") ?? "", [sp]);
  // Opened from a team invite: the member is choosing their first password.
  const invite = sp.get("invite") === "1";
  const fromLink = Boolean(initialToken);

  const [token, setToken] = useState(initialToken);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const m = useMutation({
    mutationFn: AuthAPI.resetPassword,
    onSuccess: (out: any) => {
      toast.success(out?.joined ? tr("أهلاً وسهلاً بالفريق! تسجيل الدخول صار بكلمة المرور الجديدة.", "Welcome to the team! Sign in with your new password.") : tr("تم تغيير كلمة المرور", "Password changed"));
      nav("/login", { replace: true });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const next: Errors = {};
    if (!token.trim()) next.token = tr("الرمز مطلوب", "The code is required");
    if (pw1.length < 8) next.pw1 = tr("كلمة المرور لازم تكون 8 أحرف على الأقل", "The password needs at least 8 characters");
    if (pw1 !== pw2) next.pw2 = tr("كلمات المرور غير متطابقة", "The passwords don't match");

    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setErrors({});
    m.mutate({ token: token.trim(), newPassword: pw1 });
  };

  return (
    <div className="relative w-full max-w-md animate-fade-in-up">
      <div className="relative glass rounded-3xl p-8 shadow-elevated">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">{invite ? tr("أهلاً وسهلاً بالفريق", "Welcome to the team") : tr("تعيين كلمة مرور جديدة", "Set a new password")}</h1>
          <p className="mt-2 text-sm text-white/50">
            {invite
              ? tr("كلمة مرور للحساب بلوحة الإدارة، وبعدها تسجيل الدخول.", "Choose a password for your admin account, then sign in.")
              : fromLink
                ? tr("كلمة مرور جديدة:", "Choose a new password.")
                : tr("الرمز اللي وصل بالرسالة، وبعدها كلمة مرور جديدة.", "Paste the code you received, then choose a new password.")}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {fromLink ? null : (
          <Input
            label={tr("الرمز", "Code")}
            value={token}
            error={errors.token}
            onChange={(e) => {
              setToken(e.target.value);
              setErrors((p) => ({ ...p, token: undefined }));
            }}
            placeholder="tokenId.secret"
          />
          )}
          <Input
            label={tr("كلمة المرور الجديدة", "New password")}
            value={pw1}
            error={errors.pw1}
            onChange={(e) => {
              setPw1(e.target.value);
              setErrors((p) => ({ ...p, pw1: undefined }));
            }}
            type="password"
            placeholder="••••••••"
          />
          <Input
            label={tr("تأكيد كلمة المرور", "Confirm the password")}
            value={pw2}
            error={errors.pw2}
            onChange={(e) => {
              setPw2(e.target.value);
              setErrors((p) => ({ ...p, pw2: undefined }));
            }}
            type="password"
            placeholder="••••••••"
          />

          <Button type="submit" variant="primary" className="w-full h-12" isLoading={m.isPending}>
            {invite ? tr("انضمام", "Join") : tr("حفظ", "Save")}
          </Button>

          <Button type="button" variant="ghost" className="w-full h-12" onClick={() => nav("/login", { replace: true })}>
            {tr("رجوع", "Back")}
          </Button>
        </form>
      </div>
    </div>
  );
}
