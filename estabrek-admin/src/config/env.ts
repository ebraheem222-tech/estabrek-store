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

  export const env: Env = {
    VITE_API_BASE_URL: apiAddress(
      required(
        "VITE_API_BASE_URL",
        import.meta.env.VITE_API_BASE_URL,
        "http://localhost:4000/v1"
      ),
    ),

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
