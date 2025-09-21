// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

// Detect if running locally via CLI or in development
const isLocalDev = process.env.NODE_ENV === "development" || process.env.FLOW_TEST_PROJECT_DIR;
const base = isLocalDev ? "/" : (process.env.PUBLIC_BASE_URL ?? "/flow-test");
const site = process.env.PUBLIC_SITE_URL ?? "https://marcuspmd.github.io/flow-test/";

console.log(`[Astro Config] Local dev: ${isLocalDev}, Base: ${base}`);

export default defineConfig({
  site,
  base,
  output: "static",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
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
