import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { customerKey, idParams, keyQuery, keyStatusBody, paginated } from "@khdev/contracts";
import { extendKey, listKeys, regenerateKey, setKeyStatus, toCustomerKey, type KeyRow } from "../services/keys.js";

export const keyRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/keys",
    { preHandler: app.requireRole("customer"), schema: { querystring: keyQuery, response: { 200: paginated(customerKey) } } },
    async (request) => {
      const { rows, total } = await listKeys(app.ctx, { ...request.query, userId: request.user!.id });
      return { items: rows.map((row) => toCustomerKey(row)), total, page: request.query.page, pageSize: request.query.pageSize };
    },
  );

  // Admins see keys masked everywhere, including in the result of their own actions.
  const present = (row: KeyRow, role: string) => toCustomerKey(row, { mask: role === "admin" });

  app.post(
    "/keys/:id/regenerate",
    { preHandler: app.authenticate, schema: { params: idParams, response: { 200: customerKey } } },
    async (request) => present(await regenerateKey(app.ctx, request.user!, request.params.id), request.user!.role),
  );

  app.post(
    "/keys/:id/extend",
    { preHandler: app.authenticate, schema: { params: idParams, response: { 200: customerKey } } },
    async (request) => present(await extendKey(app.ctx, request.user!, request.params.id), request.user!.role),
  );

  app.patch(
    "/keys/:id/status",
    { preHandler: app.authenticate, schema: { params: idParams, body: keyStatusBody, response: { 200: customerKey } } },
    async (request) =>
      present(await setKeyStatus(app.ctx, request.user!, request.params.id, request.body.status), request.user!.role),
  );
};
