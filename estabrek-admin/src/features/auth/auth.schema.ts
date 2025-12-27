// src/features/auth/auth.schema.ts

export type LoginForm = {
    email: string;
    password: string;
  };
  
  export function validateLogin(input: LoginForm): { ok: true } | { ok: false; errors: Partial<Record<keyof LoginForm, string>> } {
    const errors: Partial<Record<keyof LoginForm, string>> = {};
  
    if (!input.email?.trim()) errors.email = "البريد الإلكتروني مطلوب";
    else if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) errors.email = "البريد الإلكتروني غير صحيح";
  
    if (!input.password?.trim()) errors.password = "كلمة المرور مطلوبة";
    else if (input.password.trim().length < 6) errors.password = "كلمة المرور قصيرة";
  
    if (Object.keys(errors).length) return { ok: false, errors };
    return { ok: true };
  }
  
  export type TwoFactorForm = { totp: string };
  
  export function validateTotp(input: TwoFactorForm): { ok: true } | { ok: false; error: string } {
    const code = (input.totp ?? "").trim();
    if (!code) return { ok: false, error: "رمز التحقق مطلوب" };
    if (!/^\d{6}$/.test(code)) return { ok: false, error: "رمز التحقق لازم يكون 6 أرقام" };
    return { ok: true };
  }
  