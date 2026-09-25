import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  activationLimitBody,
  adminCustomer,
  adminKey,
  adminKeyQuery,
  customerQuery,
  customerStatusBody,
  idParams,
  paginated,
  statsQuery,
  statsResponse,
} from "@khdev/contracts";
import { eq } from "drizzle-orm";
import { apiKeys } from "../db/schema.js";
import { notFound } from "../lib/errors.js";
import { listCustomers, setCustomerStatus } from "../services/customers.js";
import { getKeyRow, listKeys, toAdminKey } from "../services/keys.js";
import { getStats } from "../services/stats.js";

export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.requireRole("admin"));

  app.get(
    "/admin/keys",
    { schema: { querystring: adminKeyQuery, response: { 200: paginated(adminKey) } } },
    async (request) => {
      const { rows, total } = await listKeys(app.ctx, request.query);
      return { items: rows.map(toAdminKey), total, page: request.query.page, pageSize: request.query.pageSize };
    },
  );

  app.patch(
    "/admin/keys/:id/activation-limit",
    { schema: { params: idParams, body: activationLimitBody, response: { 200: adminKey } } },
    async (request) => {
      const [updated] = await app.ctx.db
        .update(apiKeys)
        .set({ activationLimit: request.body.limit })
        .where(eq(apiKeys.id, request.params.id))
        .returning({ id: apiKeys.id });
      if (!updated) throw notFound("KEY_NOT_FOUND", "Key not found");
      return toAdminKey((await getKeyRow(app.ctx.db, updated.id))!);
    },
  );

  app.get(
    "/admin/customers",
    { schema: { querystring: customerQuery, response: { 200: paginated(adminCustomer) } } },
    async (request) => listCustomers(app.ctx, request.query),
  );

  app.patch(
    "/admin/customers/:id/status",
    { schema: { params: idParams, body: customerStatusBody, response: { 200: adminCustomer } } },
    async (request) => setCustomerStatus(app.ctx, request.params.id, request.body.status),
  );

  app.get(
    "/admin/stats",
    { schema: { querystring: statsQuery, response: { 200: statsResponse } } },
    async (request) => getStats(app.ctx, request.query),
  );
};
