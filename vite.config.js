// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // split obvious heavies so the initial route stays light
          if (/[\\/]node_modules[\\/](react|react-dom)[\\/]/.test(id)) return "react";
          if (id.includes("chart.js")) return "charts";
          if (id.includes("lodash")) return "lodash";
          if (id.includes("html2canvas")) return "html2canvas";
          return "vendor";
        },
      },
    },
    // optional: raise the warning limit so Vite doesn't whine
    chunkSizeWarningLimit: 800,
  },
});
