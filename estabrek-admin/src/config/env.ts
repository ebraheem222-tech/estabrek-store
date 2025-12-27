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
  
  export const env: Env = {
    VITE_API_BASE_URL: required(
      "VITE_API_BASE_URL",
      import.meta.env.VITE_API_BASE_URL,
      "http://localhost:4000/v1"
    ),
  
    VITE_STOREFRONT_BASE_URL: required(
      "VITE_STOREFRONT_BASE_URL",
      import.meta.env.VITE_STOREFRONT_BASE_URL,
      "http://localhost:3000"
    ),

    // optional with defaults
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME ?? "Estabrek Admin",
    VITE_DEFAULT_LOCALE: (import.meta.env.VITE_DEFAULT_LOCALE ?? "ar") as Env["VITE_DEFAULT_LOCALE"],
  };
  