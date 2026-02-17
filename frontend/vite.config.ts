import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-vite-plugin";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    tanstackRouter({
      disableLogging: true,
    }),
    visualizer({
      open: process.env.ANALYZE === "true",
      filename: "bundle-visualization.html",
      gzipSize: true,
      brotliSize: true,
      template: "sunburst",
    }),
  ],

  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
    headers: {
      "Cache-Control": "no-store",
    },
  },

  build: {
    sourcemap: true,
    target: "es2020",
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ["react", "react-dom", "tanstack-router", "tanstack-query"],
  },
});
