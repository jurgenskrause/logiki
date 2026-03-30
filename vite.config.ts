import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, // or specify a string like '0.0.0.0'
    port: 5173, // optional: specify a port
  },
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
  ],
  base: '/logiki/',
})
