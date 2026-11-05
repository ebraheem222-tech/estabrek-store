import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./tests", testMatch: /slider-effects.*unit.spec.ts/, outputDir: "../.tmp/slider-unit-results", workers: 1 });
