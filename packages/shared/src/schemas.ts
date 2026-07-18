import { z } from "zod";

export const healthStatusSchema = z.enum(["ok", "degraded"]);

export const healthCheckResponseSchema = z.object({
  status: healthStatusSchema,
  stage: z.string(),
  requestId: z.string(),
  checks: z.object({
    database: z.boolean(),
    storage: z.boolean(),
    queue: z.boolean(),
    cors: z.boolean(),
    optionalWebhookSecret: z.boolean(),
  }),
  degradedReasons: z.array(z.string()),
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;

export const exampleJobPayloadSchema = z.object({
  id: z.string().uuid(),
  message: z.string().min(1).max(500),
  requestedAt: z.string().datetime(),
});

export type ExampleJobPayload = z.infer<typeof exampleJobPayloadSchema>;

export const enqueueExampleJobRequestSchema = z.object({
  message: z.string().min(1).max(500),
});

export type EnqueueExampleJobRequest = z.infer<
  typeof enqueueExampleJobRequestSchema
>;

export const enqueueExampleJobResponseSchema = z.object({
  accepted: z.literal(true),
  job: exampleJobPayloadSchema,
});

export type EnqueueExampleJobResponse = z.infer<
  typeof enqueueExampleJobResponseSchema
>;

export const apiErrorResponseSchema = z.object({
  error: z.string(),
  requestId: z.string(),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
