import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      '/harf/text-to-speech': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      '/harf/speech-to-text': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      '/r/text-to-speech': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      '/r/speech-to-text': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      '/harf': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      '/r': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})