// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

function pkgNameFromId(id) {
  // turn /node_modules/@scope/pkg/sub/.. into '@scope/pkg'
  const after = id.split("node_modules/")[1];
  if (!after) return null;
  const parts = after.split("/");
  return parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        // shard vendor by real package so initial route doesn't pull everything
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          const pkg = pkgNameFromId(id);
          if (!pkg) return;

          // group some known heavies to stable chunk names
          if (pkg === "react" || pkg === "react-dom") return "react";
          if (pkg === "chart.js") return "charts";
          if (pkg === "html2canvas") return "html2canvas";
          if (pkg === "lucide-react") return "icons";
          if (pkg.startsWith("@radix-ui")) return "radix";
          if (pkg === "@tanstack/react-query") return "react-query";
          if (pkg === "date-fns" || pkg === "dayjs") return "date";
          if (pkg === "zod" || pkg === "yup") return "validation";
          if (pkg === "xlsx") return "xlsx";
          if (pkg === "jspdf") return "jspdf";
          if (pkg === "axios") return "axios";

          // default: a per-package vendor chunk
          return `vendor-${pkg.replace("@", "").replace("/", "-")}`;
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
});
