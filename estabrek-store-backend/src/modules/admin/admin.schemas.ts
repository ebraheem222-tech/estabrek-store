import { z } from "zod";

export const UpdateProfileBody = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  secondEmail: z.string().email().nullable().optional(),
  secondPhone: z.string().nullable().optional(),
});

export const EmailChangeRequestBody = z.object({
  newEmail: z.string().email(),
});

export const EmailChangeConfirmBody = z.object({
  token: z.string().min(16),
});

// ================= Security / Sessions / Audit =================

export const SessionsQuery = z.object({
  take: z.coerce.number().min(1).max(200).optional(),
  skip: z.coerce.number().min(0).max(10_000).optional(),
  status: z.enum(["ACTIVE", "REVOKED", "EXPIRED"]).optional(),
});

export const RevokeSessionParams = z.object({
  id: z.string().min(1),
});

export const RevokeOthersBody = z.object({
  // Provide the current session id so we can keep it.
  currentSessionId: z.string().min(1),
});

export const SecurityEventsQuery = z.object({
  take: z.coerce.number().min(1).max(200).optional(),
  skip: z.coerce.number().min(0).max(10_000).optional(),
  type: z.string().min(1).optional(),
});

export const AuditEventsQuery = z.object({
  take: z.coerce.number().min(1).max(200).optional(),
  skip: z.coerce.number().min(0).max(10_000).optional(),
  type: z.string().min(1).optional(),
});

export const CreateAuditEventBody = z.object({
  type: z.string().trim().min(1).max(120),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
