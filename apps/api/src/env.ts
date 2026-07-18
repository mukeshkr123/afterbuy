export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  APP_KV: KVNamespace;
  EXAMPLE_QUEUE: Queue;
  EXAMPLE_DLQ: Queue;
  ALLOWED_ORIGINS: string;
  APP_STAGE: string;
  EXAMPLE_QUEUE_NAME: string;
  EXAMPLE_DLQ_NAME: string;
  DAILY_CRON_EXPRESSION: string;
  REQUIRED_RUNTIME_TOKEN: string;
  OPTIONAL_WEBHOOK_SECRET: string;
  RATE_LIMIT_ENABLED?: string;
  RATE_LIMIT_WINDOW_SECONDS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
}
