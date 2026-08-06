import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8555'
const tunnelDomain = process.env.VITE_TUNNEL_DOMAIN
const useHttps = process.env.VITE_USE_HTTPS === 'true'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(useHttps ? [basicSsl()] : []),
  ],
  resolve: {
    // Keep a single React instance without absolute aliases — those can make
    // Vite serve both optimized and raw copies, which triggers invalid hook calls.
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router-dom',
      'cookie',
    ],
  },
  server: {
    host: true, // listen on 0.0.0.0 so LAN devices can reach http://<ip>:5555
    port: 5555,
    allowedHosts: true, // allow Cloudflare tunnel and custom domains
    // Prevent Cloudflare/browser from mixing stale Vite dep hashes across reloads.
    headers: {
      'Cache-Control': 'no-store',
    },
    hmr: tunnelDomain
      ? { host: tunnelDomain, protocol: 'wss', clientPort: 443 }
      : undefined,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: proxyTarget,
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
