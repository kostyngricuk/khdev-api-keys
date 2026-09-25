import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { validateBody, validateResponse } from "@khdev/contracts";
import { applyKey, validateKey } from "../services/activation.js";

const pluginRateLimit = { rateLimit: { max: 60, timeWindow: "1 minute" } };

/** Public endpoints called by the plugins installed on customer sites. */
export const pluginRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/keys/validate",
    { config: pluginRateLimit, schema: { body: validateBody, response: { 200: validateResponse } } },
    async (request) => validateKey(app.ctx, request.body),
  );

  app.post(
    "/keys/apply",
    { config: pluginRateLimit, schema: { body: validateBody, response: { 200: validateResponse } } },
    async (request) => applyKey(app.ctx, request.body),
  );
};
