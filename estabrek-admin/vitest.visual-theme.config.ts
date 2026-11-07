import path from "path";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "../estabrek-storefront/src") } },
  test: { environment: "jsdom", include: ["src/test/visualThemeOwnership.visual.ts"] },
});
