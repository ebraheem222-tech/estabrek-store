// src/features/auth/auth.schema.ts

import { tr } from "@/lib/words";
export type LoginForm = {
    email: string;
    password: string;
  };
  
  export function validateLogin(input: LoginForm): { ok: true } | { ok: false; errors: Partial<Record<keyof LoginForm, string>> } {
    const errors: Partial<Record<keyof LoginForm, string>> = {};
  
    if (!input.email?.trim()) errors.email = tr("البريد الإلكتروني مطلوب", "The email is required");
    else if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) errors.email = tr("البريد الإلكتروني غير صحيح", "That email doesn't look right");
  
    if (!input.password?.trim()) errors.password = tr("كلمة المرور مطلوبة", "The password is required");
    else if (input.password.trim().length < 6) errors.password = tr("كلمة المرور قصيرة", "The password is too short");
  
    if (Object.keys(errors).length) return { ok: false, errors };
    return { ok: true };
  }
  
  export type TwoFactorForm = { totp: string };
  
  export function validateTotp(input: TwoFactorForm): { ok: true } | { ok: false; error: string } {
    const code = (input.totp ?? "").trim();
    if (!code) return { ok: false, error: tr("رمز التحقق مطلوب", "The verification code is required") };
    if (!/^\d{6}$/.test(code)) return { ok: false, error: tr("رمز التحقق لازم يكون 6 أرقام", "The verification code has 6 digits") };
    return { ok: true };
  }
  