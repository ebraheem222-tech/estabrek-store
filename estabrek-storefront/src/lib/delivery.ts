// Delivery zones and fees set by the owner in the admin (Orders → delivery prices),
// stored in site settings (header.delivery). The same rules as the admin
// (admin/src/lib/orders.ts), so the bag and the order page show the same fee.

export type DeliveryZone = { id: string; name: string; fee: number; cities: string[] };
export type DeliverySettings = { zones: DeliveryZone[]; defaultFee: number | null; freeOver: number | null };

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export function normalizeDelivery(raw: unknown): DeliverySettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const zones = Array.isArray(o.zones) ? o.zones : [];
  return {
    zones: zones
      .map((z, i) => {
        const zz = (z ?? {}) as Record<string, unknown>;
        return {
          id: String(zz.id ?? `z${i}`),
          name: String(zz.name ?? "").trim(),
          fee: num(zz.fee),
          cities: (Array.isArray(zz.cities) ? zz.cities : String(zz.cities ?? "").split(/[,،\n]/)).map((c) => String(c).trim()).filter(Boolean),
        };
      })
      .filter((z) => z.name),
    defaultFee: o.defaultFee == null || o.defaultFee === "" ? null : num(o.defaultFee),
    freeOver: o.freeOver == null || o.freeOver === "" ? null : num(o.freeOver),
  };
}

const norm = (s: string) => s.trim().replace(/^ال/, "").replace(/[أإآ]/g, "ا").replace(/ة$/, "ه").replace(/ى$/, "ي").toLowerCase();

/** Fee for a city. `subtotal` is before discount (as in the admin). */
export function deliveryFor(city: string | null | undefined, subtotal: number, d: DeliverySettings): { fee: number | null; zone: DeliveryZone | null; free: boolean } {
  const c = norm(String(city ?? ""));
  const zone = c ? d.zones.find((z) => z.cities.some((x) => { const n = norm(x); return n && (c === n || c.includes(n) || n.includes(c)); })) ?? null : null;
  const base = zone ? zone.fee : d.defaultFee;
  if (base == null) return { fee: null, zone, free: false };
  if (d.freeOver != null && subtotal >= d.freeOver) return { fee: 0, zone, free: true };
  return { fee: base, zone, free: false };
}

/** Has the owner set any delivery prices? */
export const hasDeliveryPrices = (d: DeliverySettings) => d.zones.length > 0 || d.defaultFee != null || d.freeOver != null;

/** Cities to pick from, grouped by zone, in the owner's order. */
export function deliveryCities(d: DeliverySettings) {
  return d.zones.map((z) => ({ zone: z.name, fee: z.fee, cities: z.cities }));
}

export function lowestFee(d: DeliverySettings): number | null {
  const fees = [...d.zones.map((z) => z.fee), ...(d.defaultFee != null ? [d.defaultFee] : [])];
  return fees.length ? Math.min(...fees) : null;
}
