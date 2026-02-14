import * as path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["./test/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@effect-atom/atom/test": path.join(__dirname, "../atom/test"),
      "@effect-atom/atom": path.join(__dirname, "../atom/src"),
      "@effect-atom/atom-solid/test": path.join(__dirname, "test"),
      "@effect-atom/atom-solid": path.join(__dirname, "src")
    }
  }
})

