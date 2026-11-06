import { defineConfig } from "@playwright/test";

/** Pure readers and generators do not need the catalog fixture or a Next server. */
export default defineConfig({ testDir: "./tests", testMatch: /\.unit\.spec\.ts$/, outputDir: "../.tmp/storefront-unit-results", workers: 1, reporter: "list" });
