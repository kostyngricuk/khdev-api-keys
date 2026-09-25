import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { loadConfig } from "../config.js";
import { createDatabase } from "../db/client.js";

const config = loadConfig(process.env);
const { db, close } = createDatabase(config.databaseUrl);
const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the migrator wants the concrete driver type
await migrate(db as any, { migrationsFolder });
console.log("Migrations applied");
await close();
