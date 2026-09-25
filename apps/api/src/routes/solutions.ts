import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { solutionsResponse } from "@khdev/contracts";
import { listSolutions } from "../services/solutions.js";

export const solutionRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/solutions",
    { preHandler: app.authenticate, schema: { response: { 200: solutionsResponse } } },
    async () => listSolutions(app.ctx.db),
  );
};
