import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5178,
    proxy: {
      '/api': {
        target: 'http://localhost:8005',
        changeOrigin: true,
      }
    }
  },
  optimizeDeps: {
    include: ['microsoft-cognitiveservices-speech-sdk']
  },
  build: {
    target: 'es2018',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      include: [/microsoft-cognitiveservices-speech-sdk/, /node_modules/]
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  }
})
