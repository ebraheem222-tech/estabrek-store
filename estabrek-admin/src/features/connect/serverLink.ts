// Linking a copy's admin to its own server when the admin was put up first (config/env.ts: server.from
// "none"): the database (Neon) → the server (Railway) → this admin. What the server is given is what a copy
// made at the press gets (backend lib/press.ts copyVariables), without the shop's: the store's own setup
// makes the shop and links it («متجرك»). Secrets are made here, in the browser, and only shown to be pasted.
import { SERVER_KEY, keptServer } from "../../config/env";

/** The server's folder in the repository (backend lib/press.ts COPY_FOLDERS.api). */
export const SERVER_FOLDER = "estabrek-store-backend";

/** Random letters an address or a header carries as they are: 32 bytes, base64url. */
export function madeSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The setup code's letters (backend lib/firstRun.ts): none read as another (no 0/O, 1/I/L). */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** A one-time setup code like the server's own: 16 letters in four groups (K7QH-9MXP-3TRA-WZ4E). */
export function madeSetupCode(): string {
  let out = "";
  while (out.length < 16) {
    // 248 = 31 × 8: a byte past it would favour the first letters.
    for (const b of crypto.getRandomValues(new Uint8Array(32))) if (b < 248 && out.length < 16) out += ALPHABET[b % ALPHABET.length];
  }
  return out.match(/.{4}/g)!.join("-");
}

/** A database's address out of what was pasted around it (Neon's psql command, quotes); null when it has none. */
export function databaseAddress(pasted: string): string | null {
  const found = pasted.match(/postgres(?:ql)?:\/\/[^\s'"`]+/i)?.[0];
  if (!found) return null;
  try {
    return new URL(found).hostname ? found : null;
  } catch {
    return null;
  }
}

/** The server's secrets, made once for it. */
export type ServerSecrets = { JWT_SECRET: string; WEBHOOK_TOKEN: string; CODES_ENCRYPTION_KEY: string; BACKUP_ENCRYPTION_KEY: string; SETUP_CODE: string };
export const newSecrets = (): ServerSecrets => ({
  JWT_SECRET: madeSecret(),
  WEBHOOK_TOKEN: madeSecret(),
  CODES_ENCRYPTION_KEY: madeSecret(),
  BACKUP_ENCRYPTION_KEY: madeSecret(),
  SETUP_CODE: madeSetupCode(),
});

/** Every variable the new server gets: this admin's own address, the database, and its secrets. */
export function serverVariables(database: string, admin: string, s: ServerSecrets): Array<[string, string]> {
  return [
    ["NODE_ENV", "production"],
    ["DATABASE_URL", database],
    ["JWT_SECRET", s.JWT_SECRET],
    ["WEBHOOK_TOKEN", s.WEBHOOK_TOKEN],
    ["CODES_ENCRYPTION_KEY", s.CODES_ENCRYPTION_KEY],
    ["BACKUP_ENCRYPTION_KEY", s.BACKUP_ENCRYPTION_KEY],
    // Only this admin may call it; the shop the setup makes is added by the server itself.
    ["CORS_ORIGINS", admin],
    ["ADMIN_APP_URL", admin],
    // Opens the owner's first setup (backend lib/firstRun.ts); this page takes it there.
    ["SETUP_CODE", s.SETUP_CODE],
  ];
}
/** As Railway's Raw Editor takes them: one NAME=value a line. */
export const asLines = (vars: Array<[string, string]>) => vars.map(([k, v]) => `${k}=${v}`).join("\n");

/**
 * What an address answered: a store's server (and whether its first setup is still open), nothing at all
 * (down, still building, or refusing this admin: a browser can't tell those apart), or something else.
 */
export type ServerCheck = { kind: "store"; needed: boolean } | { kind: "silent" } | { kind: "other" };
export async function checkServer(api: string, fetcher: typeof fetch = fetch): Promise<ServerCheck> {
  let res: Response;
  try {
    res = await fetcher(`${api}/auth/first-run`, { headers: { Accept: "application/json" } });
  } catch {
    return { kind: "silent" };
  }
  try {
    const data = (await res.json()) as { needed?: unknown };
    return typeof data?.needed === "boolean" ? { kind: "store", needed: data.needed } : { kind: "other" };
  } catch {
    return { kind: "other" };
  }
}

/** This browser's server, until the host is built with it. */
export function keepServer(written: string): string | null {
  const api = keptServer(written);
  if (!api) return null;
  try {
    localStorage.setItem(SERVER_KEY, api);
  } catch {
    return null;
  }
  return api;
}
export function forgetServer() {
  try {
    localStorage.removeItem(SERVER_KEY);
  } catch {
    /* nothing kept */
  }
}

/** The secrets of the server being linked, kept for this tab only: a reload shows the same lines. */
const SECRETS_KEY = "admin.server.secrets";
export function tabSecrets(): ServerSecrets {
  try {
    const kept = JSON.parse(sessionStorage.getItem(SECRETS_KEY) ?? "null") as ServerSecrets | null;
    if (kept?.JWT_SECRET && kept.SETUP_CODE) return kept;
  } catch {
    /* made new below */
  }
  const made = newSecrets();
  try {
    sessionStorage.setItem(SECRETS_KEY, JSON.stringify(made));
  } catch {
    /* this tab only, then */
  }
  return made;
}
export function dropTabSecrets() {
  try {
    sessionStorage.removeItem(SECRETS_KEY);
  } catch {
    /* nothing kept */
  }
}

/** The Pages project this admin is on (name.pages.dev), for a link to its settings; null elsewhere. */
export function pagesProject(host: string): string | null {
  const m = host.toLowerCase().match(/^(?:[a-z0-9-]+\.)?([a-z0-9-]+)\.pages\.dev$/);
  return m ? m[1] : null;
}
