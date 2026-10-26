import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Leaves onnxruntime's 25.5 MiB .wasm out of the build: Cloudflare refuses files over
 * 25 MiB, and the background worker (src/lib/bgWorker.ts) loads it from jsDelivr instead.
 */
function dropOrtWasm(): Plugin {
  return {
    name: "drop-ort-wasm",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      for (const fileName of Object.keys(bundle)) {
        if (/ort-wasm[^/]*\.wasm$/.test(fileName)) delete bundle[fileName];
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), dropOrtWasm()],
  worker: {
    plugins: () => [dropOrtWasm()],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");

          if (normalizedId.includes("/src/cms/")) {
            const cmsPath = normalizedId.split("/src/cms/")[1] ?? "";
            const cmsGroup = cmsPath.split("/")[0] ?? "core";
            return `cms-${cmsGroup}`;
          }

          if (
            normalizedId.includes("/src/features/pages/PageRenderer") ||
            normalizedId.includes("/src/features/pages/SectionPreview")
          ) {
            return "cms-renderer";
          }

          if (
            normalizedId.includes("/src/features/pages/ComponentsEditor") ||
            normalizedId.includes("/src/features/pages/SectionEditor") ||
            normalizedId.includes("/src/features/pages/SectionStylingPanel")
          ) {
            return "cms-editor-panels";
          }

          if (
            normalizedId.includes("/src/components/ThemePreview") ||
            normalizedId.includes("/src/theme/presets")
          ) {
            return "cms-theme-preview";
          }

          if (normalizedId.includes("/node_modules/")) {
            if (
              normalizedId.includes("/react/") ||
              normalizedId.includes("/react-dom/") ||
              normalizedId.includes("/react-router/") ||
              normalizedId.includes("/react-router-dom/")
            ) {
              return "vendor-react";
            }

            if (normalizedId.includes("/@tanstack/")) {
              return "vendor-query";
            }

            if (normalizedId.includes("/@dnd-kit/")) {
              return "vendor-dnd";
            }

            if (normalizedId.includes("/zod/")) {
              return "vendor-zod";
            }

            return "vendor";
          }

          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      "/v1": "http://localhost:4000",
    },
  },
});
