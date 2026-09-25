import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { supportTicketResponse } from "@khdev/contracts";
import { AppError } from "../lib/errors.js";
import { createSupportTicket } from "../services/support.js";

export const supportRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/support/tickets",
    { preHandler: app.requireRole("customer"), schema: { response: { 201: supportTicketResponse } } },
    async (request, reply) => {
      if (!request.isMultipart()) {
        throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Send the ticket as multipart/form-data");
      }
      const ticket = await createSupportTicket(app.ctx, request.user!, request);
      return reply.status(201).send(ticket);
    },
  );
};
