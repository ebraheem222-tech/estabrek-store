import { prisma } from "./prisma.js";

/**
 * Store features the owner switches on and off from the admin.
 * Read from SiteSettings and kept for a few seconds; a save in the admin
 * forgets the copy right away (forgetFeatures).
 */
const TTL_MS = 10_000;
type Features = { customerAccounts: boolean; stockAlerts: boolean; maintenance: boolean };
let cached: (Features & { at: number }) | null = null;

async function features(): Promise<Features> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached;
  const s = await prisma.siteSettings
    .findFirst({ select: { customerAccountsEnabled: true, stockAlertsEnabled: true, maintenanceMode: true } })
    .catch(() => null);
  cached = {
    customerAccounts: s?.customerAccountsEnabled === true,
    stockAlerts: s?.stockAlertsEnabled === true,
    maintenance: s?.maintenanceMode === true,
    at: Date.now(),
  };
  return cached;
}

/** Shopper accounts (admin → الزبائن). */
export async function customerAccountsOn(): Promise<boolean> {
  return (await features()).customerAccounts;
}

/** "Tell me when it's back" on sold-out sizes (admin → تنبيهات التوفّر). */
export async function stockAlertsOn(): Promise<boolean> {
  return (await features()).stockAlerts;
}

/** Maintenance mode (admin → الميزات / حماية الضغط). */
export async function maintenanceOn(): Promise<boolean> {
  return (await features()).maintenance;
}

export function forgetFeatures() {
  cached = null;
}
