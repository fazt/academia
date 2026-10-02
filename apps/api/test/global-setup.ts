import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/** Crea la base de datos de tests si no existe y le aplica las migraciones. */
export default async function setup() {
  const url = process.env.DATABASE_URL!;
  const dbName = new URL(url).pathname.slice(1);
  const admin = postgres(url.replace(`/${dbName}`, "/postgres"), { max: 1, onnotice: () => {} });
  const [exists] = await admin`select 1 from pg_database where datname = ${dbName}`;
  if (!exists) await admin.unsafe(`create database "${dbName}"`);
  await admin.end();

  const client = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(client);
  await db.execute(sql`create extension if not exists pg_trgm`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await client.end();
}
