import {
  enqueueExampleJobRequestSchema,
  enqueueExampleJobResponseSchema,
  healthCheckResponseSchema,
} from "@acme/shared";
import { OpenAPIHono } from "@hono/zod-openapi";
import { corsMiddleware } from "./cors";
import type { Env } from "./env";
import { getHealth } from "./health";
import {
  getRequestId,
  logError,
  requestIdMiddleware,
  structuredLogger,
} from "./logging";
import {
  enqueueExampleJobRoute,
  healthRoute,
  openApiDocumentConfig,
} from "./openapi";
import { sendExampleJob } from "./queue";
import { rateLimitMiddleware } from "./rate-limit";

export function createApp() {
  const app = new OpenAPIHono<{
    Bindings: Env;
    Variables: { requestId: string };
  }>();

  app.use("*", requestIdMiddleware);
  app.use("*", structuredLogger);
  app.use("*", corsMiddleware());
  app.use("/jobs/example", rateLimitMiddleware);

  app.onError((error, c) => {
    const requestId = getRequestId(c);
    logError(error, requestId);
    return c.json({ error: "Internal Server Error", requestId }, 500);
  });

  app.doc("/openapi.json", openApiDocumentConfig());

  app.openapi(healthRoute, (c) => {
    const body = healthCheckResponseSchema.parse(
      getHealth(c.env, getRequestId(c))
    );
    return c.json(body, body.status === "ok" ? 200 : 503);
  });

  app.openapi(enqueueExampleJobRoute, async (c) => {
    if (!c.env.REQUIRED_RUNTIME_TOKEN) {
      return c.json(
        {
          error: "Queue producer is not configured",
          requestId: getRequestId(c),
        },
        503
      );
    }

    const input = enqueueExampleJobRequestSchema.parse(await c.req.json());
    const job = await sendExampleJob(c.env, input.message);
    return c.json(
      enqueueExampleJobResponseSchema.parse({ accepted: true, job }),
      202
    );
  });

  return app;
}
