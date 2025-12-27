// src/features/account/ProfilePage.tsx
import React, { useEffect, useState } from "react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import * as AccountAPI from "../../api/account.api";
import { toast } from "../../lib/toast";

type ProfileErrors = { name?: string };

export default function ProfilePage() {
  const { admin, meQuery } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState<string>("");
  const [secondEmail, setSecondEmail] = useState<string>("");
  const [secondPhone, setSecondPhone] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ProfileErrors>({});

  useEffect(() => {
    if (!admin) return;
    setName(admin.name ?? "");
    setPhone(admin.phone ?? "");
    setSecondEmail(admin.secondEmail ?? "");
    setSecondPhone(admin.secondPhone ?? "");
    setErrors({});
  }, [admin]);

  const onSave = async () => {
    const next: ProfileErrors = {};
    if (!name.trim()) next.name = "الاسم مطلوب";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setSaving(true);
    try {
      await AccountAPI.updateAdminProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        secondEmail: secondEmail.trim() || null,
        secondPhone: secondPhone.trim() || null,
      });
      await meQuery.refetch();
      toast.success("تم حفظ التغييرات");
    } catch (e: any) {
      toast.error(e?.message ?? "فشل حفظ التغييرات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-lg font-semibold">الملف الشخصي</h1>
        <p className="mt-2 text-sm opacity-80">تحديث معلومات الأدمن.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input
            label="الاسم"
            value={name}
            error={errors.name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((p) => ({ ...p, name: undefined }));
            }}
            placeholder="الاسم"
          />
          <Input label="رقم الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+972..." />

          <Input label="بريد ثانوي" value={secondEmail} onChange={(e) => setSecondEmail(e.target.value)} placeholder="example@email.com" />
          <Input label="هاتف ثانوي" value={secondPhone} onChange={(e) => setSecondPhone(e.target.value)} placeholder="+972..." />
        </div>

        <div className="mt-6 flex justify-start">
          <Button variant="primary" onClick={onSave} isLoading={saving}>
            حفظ
          </Button>
        </div>
      </div>
    </div>
  );
}
