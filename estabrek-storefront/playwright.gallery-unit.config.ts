import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./tests", testMatch: "gallery-billing.unit.spec.ts", outputDir: "../.tmp/gallery-unit-results", workers: 1 });
