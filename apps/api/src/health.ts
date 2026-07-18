import type { Env } from "./env";

export function getHealth(env: Env, requestId: string) {
  const checks = {
    database: Boolean(env.DB),
    storage: Boolean(env.STORAGE),
    queue: Boolean(env.REMINDER_QUEUE && env.REMINDER_QUEUE_NAME),
    cors: Boolean(env.ALLOWED_ORIGINS),
    optionalWebhookSecret: Boolean(env.CLERK_WEBHOOK_SECRET),
    clerkAuthConfigured: Boolean(env.CLERK_ISSUER && env.CLERK_JWKS_URL),
  };

  const degradedReasons = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => `${name} is not configured`);

  return {
    status:
      degradedReasons.length === 0 ? ("ok" as const) : ("degraded" as const),
    stage: env.APP_STAGE || "unknown",
    requestId,
    checks,
    degradedReasons,
  };
}
