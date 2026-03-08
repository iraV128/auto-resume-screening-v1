import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // ✅ Proxy frontend → backend (port 5050)
  server: {
    proxy: {
      "/api": "http://localhost:5050",
    },
  },
});