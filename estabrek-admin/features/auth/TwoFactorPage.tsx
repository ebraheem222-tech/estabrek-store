// src/features/auth/TwoFactorPage.tsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import * as AuthAPI from "../../api/auth.api";

type State = {
  sessionId: string;
  adminId: string;
  email?: string;
  method?: AuthAPI.MfaMethod;
  challengeId?: string | null;
};

type Errors = { totp?: string; smsCode?: string };

export default function TwoFactorPage() {
  const nav = useNavigate();
  const { state } = useLocation() as { state: State | null };

  const [totp, setTotp] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const method = state?.method ?? "TOTP";

  const finalize = useMutation({
    mutationFn: AuthAPI.mfaFinalize,
    onSuccess: () => {
      toast.success("تم تأكيد التحقق");
      nav("/admin/dashboard", { replace: true });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  if (!state?.sessionId || !state?.adminId) {
    nav("/login", { replace: true });
    return null;
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const next: Errors = {};

    if (method === "SMS") {
      if (!state.challengeId) {
        toast.error("مفقود challengeId للـ SMS. ارجع لصفحة الدخول وجرب مرة ثانية.");
        return;
      }
      if (!smsCode.trim()) next.smsCode = "الكود مطلوب";
      if (Object.keys(next).length) {
        setErrors(next);
        return;
      }
      setErrors({});
      finalize.mutate({ sessionId: state.sessionId, adminId: state.adminId, code: smsCode.trim(), challengeId: state.challengeId });
      return;
    }

    if (!totp.trim()) next.totp = "الكود مطلوب";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setErrors({});
    finalize.mutate({ sessionId: state.sessionId, adminId: state.adminId, totp: totp.trim() });
  };

  return (
    <div className="relative w-full max-w-md animate-fade-in-up">
      <div className="absolute -inset-40 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <div dir="rtl" className="relative glass rounded-3xl p-8 shadow-elevated">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">تحقق إضافي</h1>
          <p className="mt-2 text-sm text-white/50">{method === "SMS" ? "دخل الكود اللي وصلك على SMS" : "افتح تطبيق المصادقة وادخل الكود"}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {method === "SMS" ? (
            <Input
              label="كود SMS"
              value={smsCode}
              error={errors.smsCode}
              onChange={(e) => {
                setSmsCode(e.target.value);
                setErrors((p) => ({ ...p, smsCode: undefined }));
              }}
              placeholder="••••••"
            />
          ) : (
            <Input
              label="كود المصادقة"
              value={totp}
              error={errors.totp}
              onChange={(e) => {
                setTotp(e.target.value);
                setErrors((p) => ({ ...p, totp: undefined }));
              }}
              placeholder="••••••"
            />
          )}

          <Button type="submit" variant="primary" className="w-full h-12" isLoading={finalize.isPending}>
            تأكيد
          </Button>

          <Button type="button" variant="ghost" className="w-full h-12" onClick={() => nav("/login", { replace: true })}>
            رجوع
          </Button>
        </form>
      </div>
    </div>
  );
}
