// src/features/account/EmailChangePage.tsx
import React, { useState } from "react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import * as AccountAPI from "../../api/account.api";
import { toast } from "../../lib/toast";
import { tr } from "@/lib/words";

type Step1Errors = { newEmail?: string };
type Step2Errors = { token?: string };

export default function EmailChangePage() {
  const { meQuery } = useAuth();

  const [newEmail, setNewEmail] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [err1, setErr1] = useState<Step1Errors>({});
  const [err2, setErr2] = useState<Step2Errors>({});

  const requestChange = async () => {
    const next: Step1Errors = {};
    if (!newEmail.trim()) next.newEmail = tr("الإيميل الجديد مطلوب", "The new email is required");
    if (Object.keys(next).length) {
      setErr1(next);
      return;
    }

    setLoading(true);
    try {
      // Backend expects: { newEmail }
      await AccountAPI.requestEmailChange(newEmail.trim());
      setStep(2);
      setErr1({});
      toast.success(tr("تم إرسال كود التحقق إلى الإيميل الجديد", "A verification code was sent to the new email"));
    } catch (e: any) {
      toast.error(e?.message ?? tr("فشل إرسال كود التحقق", "Couldn't send the verification code"));
    } finally {
      setLoading(false);
    }
  };

  const verifyChange = async () => {
    const next: Step2Errors = {};
    if (!token.trim()) next.token = tr("الكود مطلوب", "The code is required");
    if (Object.keys(next).length) {
      setErr2(next);
      return;
    }

    setLoading(true);
    try {
      // Backend expects: { token }
      await AccountAPI.confirmEmailChange(token.trim());
      await meQuery.refetch();
      toast.success(tr("تم تغيير الإيميل بنجاح", "Email changed"));
      setNewEmail("");
      setToken("");
      setStep(1);
      setErr2({});
    } catch (e: any) {
      toast.error(e?.message ?? tr("فشل تأكيد تغيير الإيميل", "Couldn't confirm the email change"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-lg font-semibold">{tr("تغيير البريد الإلكتروني", "Change email")}</h1>
        <p className="mt-2 text-sm opacity-80">{tr("سيتم إرسال كود للإيميل الجديد للتأكيد.", "A code goes to the new email to confirm it.")}</p>

        {step === 1 ? (
          <div className="mt-6 space-y-4">
            <Input
              label={tr("الإيميل الجديد", "New email")}
              value={newEmail}
              error={err1.newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setErr1((p: Step1Errors) => ({ ...p, newEmail: undefined }));
              }}
              placeholder="new@email.com"
            />

            <div className="flex justify-start">
              <Button variant="primary" onClick={requestChange} isLoading={loading}>
                {tr("إرسال كود", "Send code")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <Input
              label={tr("كود التحقق", "Verification code")}
              value={token}
              error={err2.token}
              onChange={(e) => {
                setToken(e.target.value);
                setErr2((p: Step2Errors) => ({ ...p, token: undefined }));
              }}
              placeholder="123456"
            />

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)} disabled={loading}>
                {tr("رجوع", "Back")}
              </Button>
              <Button variant="primary" onClick={verifyChange} isLoading={loading}>
                {tr("تأكيد", "Confirm")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
