import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// خروجی بیلد مستقیم به app/admin می‌رود تا همان سرور Express روی /admin سروش کند.
// در حالت توسعه، درخواست‌های /api به سرور لوکال (پورت ۳۰۰۰) پراکسی می‌شود.
export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  build: {
    outDir: '../admin',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
