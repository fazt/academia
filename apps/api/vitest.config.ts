import { defineConfig } from "vitest/config";

// Tests unitarios (sin base de datos). Los de integración van en vitest.integration.config.ts.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
