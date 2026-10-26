// src/features/account/ProfilePage.tsx
import React, { useEffect, useState } from "react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import * as AccountAPI from "../../api/account.api";
import { toast } from "../../lib/toast";
import { tr } from "@/lib/words";

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
    if (!name.trim()) next.name = tr("الاسم مطلوب", "The name is required");
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
      toast.success(tr("تم حفظ التغييرات", "Changes saved"));
    } catch (e: any) {
      toast.error(e?.message ?? tr("فشل حفظ التغييرات", "Couldn't save the changes"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-lg font-semibold">{tr("الملف الشخصي", "Profile")}</h1>
        <p className="mt-2 text-sm opacity-80">{tr("معلومات الحساب بلوحة الإدارة.", "Your admin account details.")}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input
            label={tr("الاسم", "Name")}
            value={name}
            error={errors.name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((p) => ({ ...p, name: undefined }));
            }}
            placeholder={tr("الاسم", "Name")}
          />
          <Input label={tr("رقم الهاتف", "Phone number")} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+972..." />

          <Input label={tr("بريد ثانوي", "Second email")} value={secondEmail} onChange={(e) => setSecondEmail(e.target.value)} placeholder="example@email.com" />
          <Input label={tr("هاتف ثانوي", "Second phone")} value={secondPhone} onChange={(e) => setSecondPhone(e.target.value)} placeholder="+972..." />
        </div>

        <div className="mt-6 flex justify-start">
          <Button variant="primary" onClick={onSave} isLoading={saving}>
            {tr("حفظ", "Save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
