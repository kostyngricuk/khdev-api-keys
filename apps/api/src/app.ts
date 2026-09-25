import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyError } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { SUPPORT_MAX_FILE_BYTES, SUPPORT_MAX_FILES } from "@khdev/contracts";
import type { AppContext } from "./context.js";
import { AppError } from "./lib/errors.js";
import { authPlugin } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { inviteRoutes } from "./routes/invites.js";
import { systemRoutes } from "./routes/system.js";

declare module "fastify" {
  interface FastifyInstance {
    ctx: AppContext;
  }
}

export type AppDeps = Omit<AppContext, "now"> & { now?: () => Date };

export async function buildApp(deps: AppDeps) {
  const ctx: AppContext = { ...deps, now: deps.now ?? (() => new Date()) };
  const { config } = ctx;

  const app = Fastify({
    logger: { level: config.logLevel },
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate("ctx", ctx);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toJSON());
    }
    if (hasZodFastifySchemaValidationErrors(error)) {
      const message = error.validation
        .map((issue) => `${issue.instancePath.slice(1).replaceAll("/", ".") || error.validationContext || "request"}: ${issue.message}`)
        .join("; ");
      return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message } });
    }
    const status = error.statusCode ?? 500;
    if (status >= 500) {
      request.log.error(error);
      return reply.status(500).send({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
    }
    return reply.status(status).send({ error: { code: error.code ?? "BAD_REQUEST", message: error.message } });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: { code: "ROUTE_NOT_FOUND", message: "Route not found" } });
  });

  await app.register(cors, { origin: config.corsOrigin ? config.corsOrigin.split(",") : false });
  if (!config.isTest) {
    await app.register(rateLimit, {
      global: false,
      errorResponseBuilder: (_request, context) =>
        new AppError(429, "RATE_LIMITED", `Too many requests, retry in ${context.after}`),
    });
  }
  await app.register(multipart, {
    limits: { fileSize: SUPPORT_MAX_FILE_BYTES, files: SUPPORT_MAX_FILES + 1, fields: 10 },
  });
  await app.register(authPlugin);

  await app.register(
    async (api) => {
      await api.register(systemRoutes);
      await api.register(authRoutes);
      await api.register(inviteRoutes);
    },
    { prefix: "/api" },
  );

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
