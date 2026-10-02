import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, sqlClient } from "./index";

// pg_trgm alimenta el índice de búsqueda por título; debe existir antes de las migraciones.
await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
// Se ejecuta desde apps/api (pnpm db:migrate), así que la ruta es relativa a esa carpeta.
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migraciones aplicadas");
await sqlClient.end();
