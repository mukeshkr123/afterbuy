export const retryPolicy = {
  maxAttempts: 5,
  baseDelaySeconds: 30,
  maxDelaySeconds: 300,
} as const;
