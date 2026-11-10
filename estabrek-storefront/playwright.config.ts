import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  // GitHub's machines run the 3D on the processor and are several times slower: a test that only lost a race
  // with them gets two more tries there (it shows as "flaky"); one that fails every time still fails.
  retries: process.env.CI ? 2 : 0,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/catalog-server.mjs",
      url: "http://127.0.0.1:4100/v1/storefront/bootstrap",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        API_BASE_URL: "http://127.0.0.1:4100/v1",
        NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:4100/v1",
        // The admin's new editor frames the shop: studio-frame.spec.ts from the test API's page, the editor specs from
        // the admin's test page on :5178.
        ADMIN_ORIGIN: "http://127.0.0.1:4100 http://127.0.0.1:5178",
      },
    },
    // The admin's editor test page (tests/fixtures/editor-controls.html in estabrek-admin), for the editor specs
    // (collections, canvas-feel, visual-controls…); they failed when nobody had started it by hand.
    {
      command: "npx vite --port 5178 --strictPort --host 127.0.0.1",
      cwd: "../estabrek-admin",
      url: "http://127.0.0.1:5178/tests/fixtures/editor-controls.html",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
