import { defineConfig } from "@playwright/test";
import base from "./playwright.editor-controls.config";
export default defineConfig({ ...base, testMatch: [...(base.testMatch as string[]), "commerce-pages.spec.ts", "cart.spec.ts", "visual-controls.spec.ts"], outputDir: "../.tmp/commerce-browser-results" });
