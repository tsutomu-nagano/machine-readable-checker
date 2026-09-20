import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/static/" : "/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  server: {
    proxy: {
      "/api": process.env.VITE_PROXY_TARGET ?? "http://localhost:8000",
      "/docs": process.env.VITE_PROXY_TARGET ?? "http://localhost:8000"
    }
  },
  build: {
    outDir: "../backend/src/machine_readable_checker/static",
    emptyOutDir: true
  }
}));
