import { createRoute } from "@hono/zod-openapi";
import { healthCheckResponseSchema } from "@acme/shared";

export const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  responses: {
    200: {
      description: "The API is fully configured.",
      content: {
        "application/json": {
          schema: healthCheckResponseSchema,
        },
      },
    },
    503: {
      description: "The API is reachable but degraded.",
      content: {
        "application/json": {
          schema: healthCheckResponseSchema,
        },
      },
    },
  },
});

export function openApiDocumentConfig() {
  return {
    openapi: "3.0.3",
    info: {
      title: "Acme API",
      version: "0.1.0",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  };
}
