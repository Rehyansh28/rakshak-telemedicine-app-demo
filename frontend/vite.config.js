import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8555'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // listen on 0.0.0.0 so LAN devices can reach http://<ip>:5555
    port: 5555,
    allowedHosts: ['demo.hsuya.co.in'],
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/ws': {
        target: proxyTarget,
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
