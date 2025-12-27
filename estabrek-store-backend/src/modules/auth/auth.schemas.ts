import { z } from "zod";
import { Email } from "../../schemas/common.js";

export const LoginBody = z.object({
  email: Email,
  password: z.string().min(6),
});

export const RefreshBody = z.object({
  refreshToken: z.string().min(20),
});

export const LogoutBody = z.object({
  refreshToken: z.string().min(20),
});

export const MfaFinalizeBody = z
  .object({
    sessionId: z.string().cuid(),
    adminId: z.string().cuid(),
    // TOTP flow
    totp: z.string().trim().min(6).max(8).optional(),
    // SMS flow
    code: z.string().trim().min(4).max(8).optional(),
    challengeId: z.string().cuid().optional(),
  })
  .refine((v) => !!v.totp || (!!v.code && !!v.challengeId), {
    message: "Provide totp OR code+challengeId",
  });

export const TwoFASetupBody = z.object({
  label: z.string().optional(), // defaults to email
});

// TOTP enable (existing)
export const TwoFAEnableBody = z.object({
  secret: z.string().min(16),
  code: z.string().min(6).max(8),
  label: z.string().optional(),
});

export const TwoFADisableBody = z.object({
  deviceId: z.string().cuid().optional(), // if omitted, uses default device
});

export const RecoveryGenerateBody = z.object({
  count: z.coerce.number().int().min(5).max(20).default(10),
});

export const RecoveryVerifyBody = z.object({
  code: z.string().min(6),
});

export const ForgotBody = z.object({
  email: Email,
});

export const ResetBody = z.object({
  token: z.string().min(16),
  newPassword: z.string().min(8),
});

// ===== phone login (passwordless) =====
export const PhoneStartBody = z.object({
  phone: z.string().trim().min(6).max(32),
});

export const PhoneVerifyBody = z.object({
  challengeId: z.string().cuid(),
  code: z.string().trim().min(4).max(8),
});

// ===== enable SMS 2FA =====
export const TwoFASmsStartBody = z.object({});

export const TwoFASmsConfirmBody = z.object({
  challengeId: z.string().cuid(),
  code: z.string().trim().min(4).max(8),
  label: z.string().optional(),
});
