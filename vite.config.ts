import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { assetsDir: 'login-assets' },
  server: {
    port: 5173,
    proxy: { '/api/v1/auth': 'http://127.0.0.1:57110' },
  },
})
