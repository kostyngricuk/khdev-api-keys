import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  authUser,
  okResponse,
  requestCodeBody,
  requestCodeResponse,
  verifyCodeBody,
  verifyCodeResponse,
} from "@khdev/contracts";
import { requestLoginCode, verifyLoginCode } from "../services/auth.js";
import { deleteSession } from "../services/sessions.js";

const authRateLimit = { rateLimit: { max: 10, timeWindow: "1 minute" } };

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/auth/request-code",
    { config: authRateLimit, schema: { body: requestCodeBody, response: { 200: requestCodeResponse } } },
    async (request) => requestLoginCode(app.ctx, request.body.email),
  );

  app.post(
    "/auth/verify-code",
    { config: authRateLimit, schema: { body: verifyCodeBody, response: { 200: verifyCodeResponse } } },
    async (request) => verifyLoginCode(app.ctx, request.body.email, request.body.code),
  );

  app.get(
    "/auth/me",
    { preHandler: app.authenticate, schema: { response: { 200: authUser } } },
    async (request) => request.user!,
  );

  app.post(
    "/auth/logout",
    { preHandler: app.authenticate, schema: { response: { 200: okResponse } } },
    async (request) => {
      await deleteSession(app.ctx, request.sessionToken!);
      return { ok: true as const };
    },
  );
};
