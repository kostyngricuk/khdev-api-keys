import type { Config } from "./config.js";
import type { Database } from "./db/client.js";
import type { Mailer } from "./mail/mailer.js";

export type AppContext = {
  config: Config;
  db: Database;
  mailer: Mailer;
  now: () => Date;
  log: { error: (obj: object, msg: string) => void };
};
