export const APP_SLUG = "acme";

export const logicalQueues = {
  example: "example-queue",
  exampleDlq: "example-dlq",
} as const;

export const cronExpressions = {
  dailyMaintenance: "0 2 * * *",
} as const;

export const retryPolicy = {
  maxAttempts: 5,
  baseDelaySeconds: 30,
  maxDelaySeconds: 300,
} as const;
