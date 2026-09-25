import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Executor = Database | Transaction;

export function createDatabase(url: string) {
  const client = postgres(url, { max: 10 });
  const db = drizzle(client, { schema }) as unknown as Database;
  return { db, close: () => client.end() };
}

export { schema };
