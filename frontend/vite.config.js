import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8555'
const tunnelDomain = process.env.VITE_TUNNEL_DOMAIN

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // listen on 0.0.0.0 so LAN devices can reach http://<ip>:5555
    port: 5555,
    allowedHosts: true, // allow Cloudflare tunnel and custom domains
    hmr: tunnelDomain
      ? { host: tunnelDomain, protocol: 'wss', clientPort: 443 }
      : undefined,
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
