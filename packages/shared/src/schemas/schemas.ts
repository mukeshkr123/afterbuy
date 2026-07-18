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
    clerkAuthConfigured: z.boolean(),
  }),
  degradedReasons: z.array(z.string()),
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;

export const apiErrorCodeSchema = z.enum([
  "unauthenticated",
  "forbidden",
  "not_found",
  "conflict",
  "validation_failed",
  "rate_limited",
  "internal",
  "unavailable",
  "auth_not_configured",
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorObjectSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string(),
  fields: z.record(z.string(), z.string()).optional(),
});

export const apiErrorResponseSchema = z.object({
  error: apiErrorObjectSchema,
  requestId: z.string(),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export const userSchema = z.object({
  id: z.string(),
  clerkUserId: z.string(),
  email: z.string().nullable(),
  reminderLeadDays: z.number().int().min(0).max(365),
  pushEnabled: z.boolean(),
  timezone: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
});

export type User = z.infer<typeof userSchema>;

export const meResponseSchema = userSchema;
export type MeResponse = z.infer<typeof meResponseSchema>;

export const patchMeRequestSchema = z
  .object({
    reminderLeadDays: z.number().int().min(0).max(365).optional(),
    pushEnabled: z.boolean().optional(),
    timezone: z.string().min(1).optional(),
  })
  .strict();

export type PatchMeRequest = z.infer<typeof patchMeRequestSchema>;
