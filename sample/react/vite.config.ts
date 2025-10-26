import { defineConfig } from 'vite'
import { fileURLToPath } from "node:url"
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@effect-atom/atom": fileURLToPath(new URL("../../packages/atom/src", import.meta.url)),
      "@effect-atom/atom-react": fileURLToPath(new URL("../../packages/atom-react/src", import.meta.url))
    }
  }
})
