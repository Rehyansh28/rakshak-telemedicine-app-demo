/* global process */ // this file runs in Node (Vite), not in the browser
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8555'
// Live sensor data from the hub (hub/ folder, EXPERIMENTAL): ECG, heart rate, posture, alerts.
const hubTarget = process.env.VITE_HUB_TARGET || 'http://127.0.0.1:8765'

export default defineConfig({
  base: '/',
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
      '/live': {
        target: hubTarget,
        changeOrigin: true,
      },
    },
  },
})
