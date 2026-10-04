import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
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
      },
    },
  ],
});
