import { createRoute } from "@hono/zod-openapi";
import {
  apiErrorResponseSchema,
  enqueueExampleJobRequestSchema,
  enqueueExampleJobResponseSchema,
  healthCheckResponseSchema,
} from "@acme/shared";

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

export const enqueueExampleJobRoute = createRoute({
  method: "post",
  path: "/jobs/example",
  tags: ["Jobs"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: enqueueExampleJobRequestSchema,
        },
      },
    },
  },
  responses: {
    202: {
      description: "The job was accepted for asynchronous processing.",
      content: {
        "application/json": {
          schema: enqueueExampleJobResponseSchema,
        },
      },
    },
    429: {
      description: "The caller exceeded the example route rate limit.",
      content: {
        "application/json": {
          schema: apiErrorResponseSchema,
        },
      },
    },
    503: {
      description: "The queue producer is not configured.",
      content: {
        "application/json": {
          schema: apiErrorResponseSchema,
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
  };
}
