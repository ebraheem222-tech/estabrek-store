// src/config/env.ts
type Env = {
    VITE_API_BASE_URL: string;
    VITE_APP_NAME: string;
    VITE_DEFAULT_LOCALE: "ar" | "en";
    VITE_STOREFRONT_BASE_URL: string;
  };

  function required(key: string, value: string | undefined, fallback: string): string {
    if (!value) {
      // Don't crash the whole app; provide a safe default for local dev.
      console.warn(`[env] Missing ${key}. Falling back to: ${fallback}`);
      return fallback;
    }
    return value;
  }

  /** This machine or its network: spoken to over plain http. */
  const LOCAL = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\]|[^/:]+\.local)(:\d+)?(\/|$)/i;

  /**
   * An address as it was written in a host's settings (Cloudflare Pages, Vercel…), made whole: the
   * quotes and spaces a paste brings off, https:// when it has none (http:// for this machine), and
   * no slash at the end. "x.up.railway.app" would otherwise be taken as a path on the admin's own
   * site, and every call would come back as the admin's own page.
   */
  export function wholeAddress(written: string): string {
    const raw = written.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
    // A path on this same site (served behind one address with the API): as it is.
    if (!raw || raw.startsWith("/")) return raw.replace(/\/+$/, "") || raw;
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `${LOCAL.test(raw) ? "http" : "https"}://${raw}`;
    try {
      const u = new URL(withScheme);
      return `${u.origin}${u.pathname.replace(/\/+$/, "")}`;
    } catch {
      return raw;
    }
  }

  /** The API's address: made whole, and its /v1 added when only the server was written. */
  export function apiAddress(written: string): string {
    const whole = wholeAddress(written);
    if (!/^https?:\/\//i.test(whole)) return whole;
    return new URL(whole).pathname === "/" ? `${whole}/v1` : whole;
  }

  /** The server on this machine, while working on the admin itself. */
  export const LOCAL_API = "http://localhost:4000/v1";

  /**
   * Where the admin's server came from: its build (the host's VITE_API_BASE_URL), this browser (connected
   * on /connect while the build has none), this machine (the admin served from it, for local work), or
   * nowhere: a copy's admin put up on a host before anything else was linked (paintispassion.pages.dev had
   * no VITE_API_BASE_URL and no server yet, and showed a sign-in to nothing). With none, the admin opens
   * on /connect, which links the database, the server and the rest, instead of on the sign-in.
   */
  export type ServerFrom = "build" | "browser" | "local" | "none";
  /** This browser's server, kept by /connect (features/connect/ConnectPage.tsx). */
  export const SERVER_KEY = "admin.server";

  /** A server address that may be kept in a browser: whole, and https unless it is on this machine. */
  export function keptServer(written: string | null | undefined): string | null {
    if (!written?.trim()) return null;
    const api = apiAddress(written);
    try {
      const u = new URL(api);
      if (u.protocol === "https:") return api;
      return u.protocol === "http:" && LOCAL.test(u.host) ? api : null;
    } catch {
      return null;
    }
  }

  /**
   * The server this admin speaks to. The build's address always wins, so a browser's kept one is used only
   * by an admin built without any (no one can point a built store's admin elsewhere).
   */
  export function chooseServer(input: { built?: string | null; kept?: string | null; adminHost: string }): { address: string; from: ServerFrom } {
    if (input.built?.trim()) return { address: apiAddress(input.built), from: "build" };
    const kept = keptServer(input.kept);
    if (kept) return { address: kept, from: "browser" };
    if (!input.adminHost || LOCAL.test(input.adminHost)) {
      console.warn(`[env] Missing VITE_API_BASE_URL. Falling back to: ${LOCAL_API}`);
      return { address: LOCAL_API, from: "local" };
    }
    return { address: LOCAL_API, from: "none" };
  }

  function readKept(): string | null {
    try {
      return typeof localStorage === "undefined" ? null : localStorage.getItem(SERVER_KEY);
    } catch {
      return null;
    }
  }

  export const server = chooseServer({
    built: import.meta.env.VITE_API_BASE_URL,
    kept: readKept(),
    adminHost: typeof window === "undefined" ? "" : window.location.host,
  });

  /**
   * The platform's own server (the one whose press makes client copies: backend lib/siteAsk.ts), asked by an admin
   * with no server of its own to make one. Every copy builds from the same repository, so it is in .env.production.
   */
  export const PLATFORM_API: string | null = keptServer(import.meta.env.VITE_PLATFORM_API_URL);

  export const env: Env = {
    VITE_API_BASE_URL: server.address,

    VITE_STOREFRONT_BASE_URL: wholeAddress(
      required(
        "VITE_STOREFRONT_BASE_URL",
        import.meta.env.VITE_STOREFRONT_BASE_URL,
        "http://localhost:3000"
      ),
    ),

    // optional with defaults
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME ?? "Estabrek Admin",
    VITE_DEFAULT_LOCALE: (import.meta.env.VITE_DEFAULT_LOCALE ?? "ar") as Env["VITE_DEFAULT_LOCALE"],
  };
