import { defineConfig, loadEnv } from 'vite'
import { validateBuildApiUrl } from './src/config/deployment.js'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command, mode }) => {
  let apiBaseUrl;
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    apiBaseUrl = validateBuildApiUrl(process.env.VITE_API_BASE_URL || env.VITE_API_BASE_URL, {
      publicDeployment: process.env.VERCEL === '1',
    });
  }
  return {
  define: apiBaseUrl ? { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl) } : {},
  plugins: [
    react(),
    mkcert() 
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: 'localhost', 
    port: 5173,
    https: true,       // Lệnh bắt buộc để Vite chuyển sang giao thức HTTPS
    headers: {         
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    }
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('axios')) {
              return 'vendor-axios';
            }
          }
        }
      }
    }
  }
  };
})
