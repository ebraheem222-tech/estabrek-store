// src/features/auth/ForgotPasswordPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import * as AuthAPI from "../../api/auth.api";
import { useMutation } from "@tanstack/react-query";
import { tr } from "@/lib/words";

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
      toast.success(tr("وصل الطلب", "Request received"));
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e));
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setToken(null);

    const next: Errors = {};
    if (!email.trim()) next.email = tr("الإيميل مطلوب", "The email is required");
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setErrors({});
    m.mutate({ email: email.trim() });
  };

  return (
    <div className="relative w-full max-w-md animate-fade-in-up">
      <div className="relative glass rounded-3xl p-8 shadow-elevated">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">{tr("إعادة تعيين كلمة المرور", "Reset your password")}</h1>
          <p className="mt-2 text-sm text-white/50">
            {tr("إذا الإيميل مربوط بالسيرفر، بيوصل رابط على الإيميل. أو صاحب المتجر بيقدر يعمل رابط جديد من صفحة الفريق والصلاحيات.", "If email is set up on the server, a link is on its way to your inbox. Or the store owner can make a new link on the Team & roles page.")}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <Input
            label={tr("البريد الإلكتروني", "Email")}
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
              <p className="text-xs text-white/60 mb-2">{tr("Token (للتطوير فقط):", "Token (development only):")}</p>
              <div className="text-xs font-mono text-white/80 break-all">{token}</div>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10"
                  onClick={() => {
                    navigator.clipboard?.writeText(token);
                    toast.success(tr("تم النسخ", "Copied"));
                  }}
                >
                  {tr("نسخ", "Copy")}
                </Button>
                <Button type="button" variant="primary" className="h-10 flex-1" onClick={() => nav(`/login/reset?token=${encodeURIComponent(token)}`)}>
                  {tr("متابعة التعيين", "Continue")}
                </Button>
              </div>
            </div>
          )}

          <Button type="submit" variant="primary" className="w-full h-12" isLoading={m.isPending}>
            {tr("إرسال", "Send")}
          </Button>

          <Button type="button" variant="ghost" className="w-full h-12" onClick={() => nav("/login")}> 
            {tr("رجوع", "Back")}
          </Button>
        </form>
      </div>
    </div>
  );
}
