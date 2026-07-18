export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  APP_KV: KVNamespace;
  REMINDER_QUEUE: Queue;
  REMINDER_DLQ: Queue;
  ALLOWED_ORIGINS: string;
  APP_STAGE: string;
  REMINDER_QUEUE_NAME: string;
  REMINDER_DLQ_NAME: string;
  DAILY_CRON_EXPRESSION: string;
  CLERK_ISSUER: string;
  CLERK_JWKS_URL: string;
  CLERK_ALLOWED_AZP: string;
  CLERK_WEBHOOK_SECRET: string;
  RATE_LIMIT_ENABLED?: string;
  RATE_LIMIT_WINDOW_SECONDS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
}
