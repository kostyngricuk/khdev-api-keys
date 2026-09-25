import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { healthResponse, versionsResponse } from "@khdev/contracts";
import { resolveVersions } from "../lib/version.js";

export const systemRoutes: FastifyPluginAsyncZod = async (app) => {
  const versions = resolveVersions(app.ctx.config.version);

  app.get("/health", { schema: { response: { 200: healthResponse } } }, async () => ({ status: "ok" as const }));

  app.get("/versions", { schema: { response: { 200: versionsResponse } } }, async () => versions);
};
