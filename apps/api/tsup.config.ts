import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/db/migrate.ts", "src/db/seed.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  outDir: "dist",
  clean: true,
  // El paquete compartido se publica como TypeScript: hay que empaquetarlo.
  noExternal: ["@academia/shared"],
});
