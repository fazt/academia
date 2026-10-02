import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

export const sqlClient = postgres(env.DATABASE_URL, { max: 10 });

export const db = drizzle(sqlClient, { schema, casing: "snake_case" });

export type Db = typeof db;
/** Una transacción de Drizzle o el cliente normal */
export type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export { schema };
