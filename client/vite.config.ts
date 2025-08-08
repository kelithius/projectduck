import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../public',
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // 將 Ant Design 分離為單獨的 chunk
          'antd-vendor': ['antd'],
          // 將 React 相關庫分離
          'react-vendor': ['react', 'react-dom'],
          // 其他第三方庫
          'third-party': ['i18next', 'react-i18next', 'allotment']
        }
      }
    }
  },
})