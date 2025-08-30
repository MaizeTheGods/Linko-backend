import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      jpg: { quality: 80 },
      webp: { lossless: false },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://linko-backend.onrender.com',
        changeOrigin: true,
        secure: true
      },
      '/auth': {
        target: 'https://linko-backend.onrender.com',
        changeOrigin: true,
        secure: true
      }
    }
  }
})
