import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/sneak/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          vendor: ['agora-rtc-sdk-ng']
        }
      }
    }
  },
  resolve: {
    alias: {
      'agora-rtc-sdk-ng': resolve(__dirname, 'node_modules/agora-rtc-sdk-ng/AgoraRTC_N-production.js')
    }
  }
}) 