import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "https://polymarket-agent.web3coderman.workers.dev",
      "/ws": { target: "wss://polymarket-agent.web3coderman.workers.dev", ws: true, changeOrigin: true },
    },
  },
});
