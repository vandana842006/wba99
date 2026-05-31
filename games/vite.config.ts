import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  // dev: served at localhost:5174/  →  base "/"
  // build: copied to dist/games/  →  base "/games/"
  base: command === "serve" ? "/" : "/games/",
  build: { outDir: "dist" },
  server: { port: 5275 },
}));
