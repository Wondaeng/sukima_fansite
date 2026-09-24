import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: "prompt",
    injectRegister: false,
    manifest: false,
    workbox: {
      globPatterns: ["**/*.{js,css,html,svg,jpg,png}"],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      navigateFallback: "/index.html",
      navigateFallbackDenylist: [/^\/_vercel\//],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
    },
  })],
});
