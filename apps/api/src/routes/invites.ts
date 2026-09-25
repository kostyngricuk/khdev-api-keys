import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { inviteBody, inviteResponse } from "@khdev/contracts";
import { inviteCustomer } from "../services/invites.js";

export const inviteRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/invites",
    { preHandler: app.requireAdminOrService, schema: { body: inviteBody, response: { 201: inviteResponse } } },
    async (request, reply) => {
      const result = await inviteCustomer(app.ctx, request.body);
      return reply.status(201).send(result);
    },
  );
};
