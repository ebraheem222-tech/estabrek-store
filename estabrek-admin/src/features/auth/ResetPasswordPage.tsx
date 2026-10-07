// src/features/auth/ResetPasswordPage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import * as AuthAPI from "../../api/auth.api";
import { useMutation } from "@tanstack/react-query";

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
      toast.success(out?.joined ? "أهلاً بك بالفريق! سجّل دخول بكلمة المرور الجديدة." : "تم تغيير كلمة المرور");
      nav("/login", { replace: true });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const next: Errors = {};
    if (!token.trim()) next.token = "الرمز مطلوب";
    if (pw1.length < 8) next.pw1 = "كلمة المرور لازم تكون 8 أحرف على الأقل";
    if (pw1 !== pw2) next.pw2 = "كلمات المرور غير متطابقة";

    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setErrors({});
    m.mutate({ token: token.trim(), newPassword: pw1 });
  };

  return (
    <div className="relative w-full max-w-md animate-fade-in-up">
      <div dir="rtl" className="relative glass rounded-3xl p-8 shadow-elevated">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">{invite ? "أهلاً بك بالفريق" : "تعيين كلمة مرور جديدة"}</h1>
          <p className="mt-2 text-sm text-white/50">
            {invite
              ? "اختر كلمة مرور لحسابك بلوحة الإدارة، وبعدها سجّل دخول."
              : fromLink
                ? "اختر كلمة مرور جديدة."
                : "الصق الرمز اللي وصلك، ثم اختر كلمة مرور جديدة."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {fromLink ? null : (
          <Input
            label="الرمز"
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
            label="كلمة المرور الجديدة"
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
            label="تأكيد كلمة المرور"
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
            {invite ? "انضمام" : "حفظ"}
          </Button>

          <Button type="button" variant="ghost" className="w-full h-12" onClick={() => nav("/login", { replace: true })}>
            رجوع
          </Button>
        </form>
      </div>
    </div>
  );
}
