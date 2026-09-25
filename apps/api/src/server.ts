import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./db/client.js";
import { createSmtpMailer } from "./mail/mailer.js";

const config = loadConfig(process.env);
const { db, close } = createDatabase(config.databaseUrl);
const app = await buildApp({ config, db, mailer: createSmtpMailer(config) });

app.addHook("onClose", async () => {
  await close();
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

await app.listen({ host: config.host, port: config.port });
if (config.devAdminEnabled) {
  app.log.warn("Dev admin login is enabled (admin@khdev.by / 123456). Never enable this outside local development.");
}
