import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'FarmaciaApp',
        inlineDynamicImports: true
      }
    }
  },
  server: {
    port: 5188,
    strictPort: false,
    host: true
  }
})
