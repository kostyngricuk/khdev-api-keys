import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthUser, UserRole } from "@khdev/contracts";
import { forbidden, unauthorized } from "../lib/errors.js";
import { findSessionUser } from "../services/sessions.js";
import { safeEqual } from "../lib/crypto.js";

type PreHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser | null;
    sessionToken: string | null;
    isService: boolean;
  }
  interface FastifyInstance {
    authenticate: PreHandler;
    requireRole: (role: UserRole) => PreHandler;
    requireAdminOrService: PreHandler;
  }
}

function bearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export const authPlugin = fp(async (app) => {
  app.decorateRequest("user", null);
  app.decorateRequest("sessionToken", null);
  app.decorateRequest("isService", false);

  const authenticate: PreHandler = async (request) => {
    const token = bearerToken(request);
    const user = token ? await findSessionUser(app.ctx, token) : null;
    if (!token || !user) throw unauthorized("UNAUTHORIZED", "Sign in to continue");
    request.user = user;
    request.sessionToken = token;
  };

  app.decorate("authenticate", authenticate);

  app.decorate("requireRole", (role: UserRole): PreHandler => {
    return async (request, reply) => {
      await authenticate(request, reply);
      if (request.user?.role !== role) throw forbidden("FORBIDDEN", "You do not have access to this resource");
    };
  });

  app.decorate("requireAdminOrService", async (request: FastifyRequest, reply: FastifyReply) => {
    const serviceToken = request.headers["x-service-token"];
    if (typeof serviceToken === "string" && safeEqual(serviceToken, app.ctx.config.serviceToken)) {
      request.isService = true;
      return;
    }
    await app.requireRole("admin")(request, reply);
  });
});
