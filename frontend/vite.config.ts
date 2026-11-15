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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom', 'react-router-dom'],
          'redux': ['@reduxjs/toolkit', 'react-redux'],
          'charts': ['recharts', 'chart.js', 'react-chartjs-2'],
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'motion': ['framer-motion'],
          'ui': ['lucide-react', 'react-hot-toast'],
          'query': ['@tanstack/react-query'],
          'utils': ['axios', 'date-fns'],
        }
      }
    }
  },
})
