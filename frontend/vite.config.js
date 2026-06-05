import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // listen on 0.0.0.0 so LAN devices can reach http://<ip>:5555
    port: 5555,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8555',
        changeOrigin: true,
      },
    },
  },
})
