import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@/lib": path.resolve(__dirname, "src/lib-web"),
      "@/server": path.resolve(__dirname, "src/server"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
