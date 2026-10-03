import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  define: {
    // Make VITE_API_URL available in production builds
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || ''),
  }
})
