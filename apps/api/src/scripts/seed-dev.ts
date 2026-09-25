import { DEV_ADMIN_CODE, DEV_ADMIN_EMAIL, loadConfig } from "../config.js";
import { createDatabase } from "../db/client.js";
import { seedDevAdmin } from "./seed.js";

const config = loadConfig(process.env);
const { db, close } = createDatabase(config.databaseUrl);
try {
  await seedDevAdmin(db, config);
  console.log(`Dev admin ready: ${DEV_ADMIN_EMAIL}`);
  console.log(
    config.devAdminEnabled
      ? `Sign in with code ${DEV_ADMIN_CODE}`
      : "Set DEV_ADMIN_ENABLED=true in apps/api/.env to sign in with the fixed code",
  );
} finally {
  await close();
}
