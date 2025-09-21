// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

const base = process.env.PUBLIC_BASE_URL ?? "/flow-test";
const site = process.env.PUBLIC_SITE_URL ?? "https://marcuspmd.github.io/flow-test/";

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
