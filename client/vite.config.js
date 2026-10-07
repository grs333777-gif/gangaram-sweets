import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

const clientRoot = fileURLToPath(new URL('.', import.meta.url))
const razorpayCheckout = fileURLToPath(
  new URL('../server/razorpay-module/client/razorpay-checkout.js', import.meta.url),
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@razorpay-checkout': razorpayCheckout,
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
    fs: {
      allow: [clientRoot, fileURLToPath(new URL('../server/razorpay-module/client', import.meta.url))],
    },
  },
})
