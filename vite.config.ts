import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_BASE_URL || 'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: apiBase,
          changeOrigin: true,
          ws: false,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              // Disable response buffering so SSE chunks are forwarded immediately
              proxyRes.headers['x-accel-buffering'] = 'no'
            })
          },
        },
      },
      watch: false,
    },
  }
})
