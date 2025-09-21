// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

const base = process.env.PUBLIC_BASE_URL ?? "/flow-test";

export default defineConfig({
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
