import { DEV_ADMIN_CODE, DEV_ADMIN_EMAIL, DEV_CUSTOMER_EMAIL, loadConfig } from "../config.js";
import { createDatabase } from "../db/client.js";
import { seedDevUsers } from "./seed.js";

const config = loadConfig(process.env);
const { db, close } = createDatabase(config.databaseUrl);
try {
  await seedDevUsers(db, config);
  console.log(`Dev users ready: ${DEV_ADMIN_EMAIL} (admin), ${DEV_CUSTOMER_EMAIL} (customer)`);
  console.log(`Sign in with code ${DEV_ADMIN_CODE}`);
} finally {
  await close();
}
