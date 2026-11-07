import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testMatch: ["editor-controls.spec.ts", "motion-toggle.spec.ts", "object-sizing.spec.ts", "object-edges.spec.ts", "page-publishing.spec.ts"],
  outputDir: "../.tmp/editor-controls-browser-results",
  webServer: [
    { command: "node tests/catalog-server.mjs", url: "http://127.0.0.1:4100/v1/storefront/bootstrap", reuseExistingServer: !process.env.CI },
    {
      command: "npm run dev -- --hostname 127.0.0.1",
      url: "http://127.0.0.1:3000", reuseExistingServer: !process.env.CI, timeout: 120000,
      env: { API_BASE_URL: "http://127.0.0.1:4100/v1", NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:4100/v1", ADMIN_ORIGIN: "http://127.0.0.1:4100,http://127.0.0.1:5178", REVALIDATE_SECRET: "fixture-publishing-only" },
    },
    { command: "npm --prefix ../estabrek-admin run dev -- --host 127.0.0.1 --port 5178 --strictPort", url: "http://127.0.0.1:5178/tests/fixtures/editor-controls.html", reuseExistingServer: !process.env.CI, timeout: 60000 },
  ],
});
