import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./db/client.js";
import { createLogMailer, createSmtpMailer, type Mailer } from "./mail/mailer.js";

let config: ReturnType<typeof loadConfig>;
try {
  config = loadConfig(process.env);
} catch (error) {
  console.error(`\n${(error as Error).message}\nLocal setup: cp apps/api/.env.example apps/api/.env\n`);
  process.exit(1);
}
const { db, close } = createDatabase(config.databaseUrl, config.databasePoolMax);
let logMail: Mailer["send"] = async () => {};
const mailer: Mailer =
  config.mailTransport === "log" ? { send: (message) => logMail(message) } : createSmtpMailer(config);
const app = await buildApp({ config, db, mailer });
if (config.mailTransport === "log") logMail = createLogMailer(app.log).send;

app.addHook("onClose", async () => {
  await close();
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

await app.listen({ host: config.host, port: config.port });
if (config.devLoginEnabled) {
  app.log.warn(
    "Dev login is enabled (admin@khdev.by, customer@khdev.by / 123456). Never enable this outside local development.",
  );
}
