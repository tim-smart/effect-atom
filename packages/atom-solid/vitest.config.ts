import * as path from "path"
import { defineConfig } from "vitest/config"
import solid from "vite-plugin-solid"

export default defineConfig({
  plugins: [solid()],
  test: {
    include: ["./test/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./vitest-setup.ts"],
    transformMode: {
      web: [/\.[jt]sx?$/]
    }
  },
  resolve: {
    alias: {
      "@effect-atom/atom/test": path.join(__dirname, "../atom/test"),
      "@effect-atom/atom": path.join(__dirname, "../atom/src"),
      "@effect-atom/atom-solid/test": path.join(__dirname, "test"),
      "@effect-atom/atom-solid": path.join(__dirname, "src")
    },
    conditions: ["development", "browser"]
  }
})
