import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
    build: {
    rollupOptions: {
      output: {
        // Place JavaScript files in static/frontend/js
        entryFileNames: `static/admin/js/[name]-[hash].js`,
        chunkFileNames: `static/admin/js/[name]-[hash].js`,
        assetFileNames: `static/admin/assets/[name]-[hash][extname]`,
      },
    },
  }
})
