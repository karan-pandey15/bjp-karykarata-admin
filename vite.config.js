import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_ORIGIN = 'https://api.pracharpost.in'

const apiProxy = {
  '/api': {
    target: API_ORIGIN,
    changeOrigin: true,
    secure: true,
    timeout: 300000,
    proxyTimeout: 300000,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  preview: {
    port: 5173,
    proxy: apiProxy,
  },
})
