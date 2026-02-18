import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Games Platform - Port 5177, Backend 8004
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5177,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8004',
        changeOrigin: true,
        secure: false
      }
    }
  }
})

/*
// Original alif24 config preserved for reference
export default defineConfig_OLD({
  plugins: [react()],
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
*/