// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// Detect if running locally via CLI or in development
const isLocalDev = process.env.NODE_ENV === "development" || process.env.FLOW_TEST_PROJECT_DIR;
const isPreview = process.env.FLOW_TEST_PREVIEW === "true";
const base = (isLocalDev || isPreview) ? "/" : (process.env.PUBLIC_BASE_URL ?? "/flow-test");
const site = process.env.PUBLIC_SITE_URL ?? "https://marcuspmd.github.io/flow-test/";

console.log(`[Astro Config] Local dev: ${isLocalDev}, Preview: ${isPreview}, Base: ${base}`);

export default defineConfig({
  site,
  base,
  output: "static",
  integrations: [react()],
  vite: {
    css: {
      postcss: {
        plugins: [
          tailwindcss,
          autoprefixer,
        ],
      },
    },
    server: {
      fs: {
        allow: [".."],
      },
    },
  },
  build: {
    assets: "assets",
  },
});
