// src/features/auth/ForgotPasswordPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import * as AuthAPI from "../../api/auth.api";
import { useMutation } from "@tanstack/react-query";

type Errors = { email?: string };

export default function ForgotPasswordPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  const m = useMutation({
    mutationFn: AuthAPI.forgotPassword,
    onSuccess: (out) => {
      setToken(out.token ?? null);
      toast.success("تم إرسال طلب إعادة التعيين");
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e));
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setToken(null);

    const next: Errors = {};
    if (!email.trim()) next.email = "الإيميل مطلوب";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setErrors({});
    m.mutate({ email: email.trim() });
  };

  return (
    <div className="relative w-full max-w-md animate-fade-in-up">
      <div dir="rtl" className="relative glass rounded-3xl p-8 shadow-elevated">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">إعادة تعيين كلمة المرور</h1>
          <p className="mt-2 text-sm text-white/50">اكتب ايميل الأدمن. رح يوصلك رابط/كود (حسب إعدادات السيرفر).</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <Input
            label="البريد الإلكتروني"
            value={email}
            error={errors.email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((p) => ({ ...p, email: undefined }));
            }}
            type="email"
            placeholder="admin@example.com"
          />

          {token && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-white/60 mb-2">Token (Dev فقط):</p>
              <div className="text-xs font-mono text-white/80 break-all">{token}</div>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10"
                  onClick={() => {
                    navigator.clipboard?.writeText(token);
                    toast.success("تم النسخ");
                  }}
                >
                  نسخ
                </Button>
                <Button type="button" variant="primary" className="h-10 flex-1" onClick={() => nav(`/login/reset?token=${encodeURIComponent(token)}`)}>
                  متابعة التعيين
                </Button>
              </div>
            </div>
          )}

          <Button type="submit" variant="primary" className="w-full h-12" isLoading={m.isPending}>
            إرسال
          </Button>

          <Button type="button" variant="ghost" className="w-full h-12" onClick={() => nav("/login")}> 
            رجوع
          </Button>
        </form>
      </div>
    </div>
  );
}
