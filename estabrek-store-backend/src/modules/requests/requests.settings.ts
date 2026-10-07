/**
 * «اطلبي قطعتكِ» settings (admin → الطلبات الخاصة), kept in
 * SiteSettings.header.requests (public: the storefront shows the form by them).
 */
import { z } from "zod";

export const RequestsSchema = z.object({
  enabled: z.boolean().default(false),
  /** Which kinds shoppers can ask for. */
  kinds: z
    .object({ size: z.boolean().default(true), color: z.boolean().default(true), newPiece: z.boolean().default(true) })
    .prefault({}),
  /** Photos per request (0 = no photos). */
  maxPhotos: z.number().int().min(0).max(5).default(3),
  /** Photos are deleted after this many days (the request itself stays). */
  photoDays: z.number().int().min(7).max(365).default(90),
  /** New requests per phone number per day. */
  perPhoneDay: z.number().int().min(1).max(20).default(5),
});

export type RequestsSettings = z.infer<typeof RequestsSchema>;
export const REQUESTS_DEFAULTS: RequestsSettings = RequestsSchema.parse({});

export function requestsOf(header: unknown): RequestsSettings {
  const raw = header && typeof header === "object" ? (header as Record<string, unknown>).requests : undefined;
  const ok = RequestsSchema.safeParse(raw ?? {});
  if (ok.success) return ok.data;
  // Keep what is valid: parse field by field.
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(RequestsSchema.shape) as Array<keyof typeof RequestsSchema.shape>) {
    const one = RequestsSchema.shape[k].safeParse(r[k]);
    if (one.success) out[k] = one.data;
  }
  return RequestsSchema.parse(out);
}
