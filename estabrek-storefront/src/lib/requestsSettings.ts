/** «اطلبي قطعتكِ» settings from the admin (header.requests); the form shows by them. */
export type RequestsSettings = {
  enabled: boolean;
  kinds: { size: boolean; color: boolean; newPiece: boolean };
  maxPhotos: number;
  photoDays: number;
  perPhoneDay: number;
};

export const REQUESTS_DEFAULTS: RequestsSettings = {
  enabled: false,
  kinds: { size: true, color: true, newPiece: true },
  maxPhotos: 3,
  photoDays: 90,
  perPhoneDay: 5,
};

type Raw = Record<string, unknown>;
const o = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const int = (v: unknown, d: number, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d);

export function normalizeRequests(input: unknown): RequestsSettings {
  const r = o(input);
  const k = o(r.kinds);
  const d = REQUESTS_DEFAULTS;
  return {
    enabled: bool(r.enabled, d.enabled),
    kinds: { size: bool(k.size, d.kinds.size), color: bool(k.color, d.kinds.color), newPiece: bool(k.newPiece, d.kinds.newPiece) },
    maxPhotos: int(r.maxPhotos, d.maxPhotos, 0, 5),
    photoDays: int(r.photoDays, d.photoDays, 7, 365),
    perPhoneDay: int(r.perPhoneDay, d.perPhoneDay, 1, 20),
  };
}
