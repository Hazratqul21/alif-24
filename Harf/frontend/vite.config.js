import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2018',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/harf/text-to-speech': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/harf/speech-to-text': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/r/text-to-speech': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/r/speech-to-text': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/harf': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/r': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})