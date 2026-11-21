// Where the store runs (backend lib/hostingView.ts, /v1/admin/system/hosting): its server's host, the database it
// reads and the shop's address. Names and places only: never a password, a token or the database's address.
import { api } from "./http";

export type DbProvider = "neon" | "railway" | "local" | "other" | "none";
export type Hosting = {
  server: { host: "railway" | "other"; project: string | null; environment: string | null; service: string | null; address: string | null; commit: string | null; startedAt: string };
  /** pending: the database updates the server's code has and the database hasn't run; null = not known. */
  database: { provider: DbProvider; region: string | null; pooled: boolean; ok: boolean; ms: number | null; pending?: string[] | null };
  shop: { address: string | null };
};

export async function getHosting() {
  return (await api.get("/admin/system/hosting")).data as Hosting;
}
