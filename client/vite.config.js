import { defineConfig } from 'vite'
import { createRequire } from 'node:module'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = createRequire(import.meta.url)('./package.json')

export default defineConfig({
  // نسخهٔ اپ داخل باندل قرار می‌گیرد تا بخش «به‌روزرسانی» پروفایل آن را با سرور مقایسه کند
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
