/**
 * Where this store runs, as its own server knows it (admin → الاستضافة): the host the server is on,
 * the database it reads, and the shop's address. Only names and places come out: never a password,
 * a token or the database's own address.
 */
export type DbProvider = "neon" | "railway" | "local" | "other" | "none";
export type HostingView = {
  server: { host: "railway" | "other"; project: string | null; environment: string | null; service: string | null; address: string | null; commit: string | null; startedAt: string };
  /** pending: the database updates the code has and the database hasn't run (lib/pendingMigrations.ts); null = not known. */
  database: { provider: DbProvider; region: string | null; pooled: boolean; ok: boolean; ms: number | null; pending?: string[] | null };
  shop: { address: string | null };
};

type Vars = Record<string, string | undefined>;
const clean = (v: string | undefined, max = 80) => {
  const s = (v ?? "").trim();
  return s ? s.slice(0, max) : null;
};

/** The database's maker and place from its address's host name (the address itself never leaves). */
export function databaseOf(url: string | undefined): { provider: DbProvider; region: string | null; pooled: boolean } {
  let host = "";
  try {
    host = new URL(url ?? "").hostname.toLowerCase();
  } catch {
    return { provider: "none", region: null, pooled: false };
  }
  if (!host) return { provider: "none", region: null, pooled: false };
  if (host.endsWith(".neon.tech")) {
    // ep-cool-name-123456-pooler.us-east-2.aws.neon.tech, ep-….eastus2.azure.neon.tech
    const parts = host.split(".");
    const cloud = parts.findIndex((p) => p === "aws" || p === "azure" || p === "gcp");
    const region = cloud > 1 ? parts[cloud - 1] : null;
    return { provider: "neon", region: region && /^[a-z0-9-]{2,30}$/.test(region) ? region : null, pooled: parts[0].endsWith("-pooler") };
  }
  if (host.endsWith(".railway.internal") || host.endsWith(".rlwy.net") || host.endsWith(".railway.app")) return { provider: "railway", region: null, pooled: false };
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]") return { provider: "local", region: null, pooled: false };
  return { provider: "other", region: null, pooled: false };
}

export function hostingView(vars: Vars, db: { ok: boolean; ms: number | null; pending?: string[] | null }, startedAt: Date): HostingView {
  const onRailway = Boolean(clean(vars.RAILWAY_ENVIRONMENT_NAME) || clean(vars.RAILWAY_PROJECT_ID) || clean(vars.RAILWAY_SERVICE_ID));
  const domain = clean(vars.RAILWAY_PUBLIC_DOMAIN, 200);
  const commit = clean(vars.RAILWAY_GIT_COMMIT_SHA ?? vars.GIT_COMMIT_SHA, 40);
  const shop = clean(vars.STOREFRONT_URL, 300);
  return {
    server: {
      host: onRailway ? "railway" : "other",
      project: clean(vars.RAILWAY_PROJECT_NAME),
      environment: clean(vars.RAILWAY_ENVIRONMENT_NAME),
      service: clean(vars.RAILWAY_SERVICE_NAME),
      address: domain && /^[a-z0-9.-]+$/i.test(domain) ? `https://${domain}` : null,
      commit: commit && /^[0-9a-f]{7,40}$/i.test(commit) ? commit.slice(0, 7).toLowerCase() : null,
      startedAt: startedAt.toISOString(),
    },
    database: { ...databaseOf(vars.DATABASE_URL), ...db },
    shop: { address: shop && /^https?:\/\//i.test(shop) ? shop.replace(/\/+$/, "") : null },
  };
}
