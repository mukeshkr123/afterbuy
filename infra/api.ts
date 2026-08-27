import * as cloudflare from "@pulumi/cloudflare";
import { COMPATIBILITY_DATE, optionalEnv, requireEnv } from "./env";
import type { QueueResources } from "./queue";
import type { StorageResources } from "./storage";

const DAILY_CRON = "0 2 * * *";

interface ApiArgs {
  storage: StorageResources;
  queues: QueueResources;
}

export function createApi({ storage, queues }: ApiArgs) {
  const clerkWebhookSecret = new sst.Secret("ClerkWebhookSecret");
  const clerkSecretKey = new sst.Secret("ClerkSecretKey");
  const receiptSigningSecret = new sst.Secret("ReceiptSigningSecret");

  const worker = new sst.cloudflare.Worker("ApiWorker", {
    handler: "apps/api/src/index.ts",
    url: true,
    link: [
      storage.database,
      storage.bucket,
      storage.kv,
      queues.reminder,
      queues.reminderDlq,
      clerkWebhookSecret,
      clerkSecretKey,
      receiptSigningSecret,
    ],
    environment: {
      ALLOWED_ORIGINS: optionalEnv("ALLOWED_ORIGINS"),
      APP_STAGE: $app.stage,
      REMINDER_QUEUE_NAME: queues.reminder.nodes.queue.queueName,
      REMINDER_DLQ_NAME: queues.reminderDlq.nodes.queue.queueName,
      DAILY_CRON_EXPRESSION: DAILY_CRON,
      CLERK_ISSUER: optionalEnv("CLERK_ISSUER"),
      CLERK_JWKS_URL: optionalEnv("CLERK_JWKS_URL"),
      CLERK_ALLOWED_AZP: optionalEnv("CLERK_ALLOWED_AZP"),
      CLERK_WEBHOOK_SECRET: clerkWebhookSecret.value,
      CLERK_SECRET_KEY: clerkSecretKey.value,
      RECEIPT_SIGNING_SECRET: receiptSigningSecret.value,
      RATE_LIMIT_ENABLED: optionalEnv("RATE_LIMIT_ENABLED", "true"),
      RATE_LIMIT_WINDOW_SECONDS: optionalEnv("RATE_LIMIT_WINDOW_SECONDS", "60"),
      RATE_LIMIT_MAX_REQUESTS: optionalEnv("RATE_LIMIT_MAX_REQUESTS", "120"),
    },
    transform: {
      worker(args) {
        // Keep this in sync with apps/api/wrangler.jsonc compatibility_date.
        args.compatibilityDate = COMPATIBILITY_DATE;
        args.compatibilityFlags = ["nodejs_compat"];
        args.observability = {
          enabled: true,
          headSamplingRate: 1,
        };
      },
    },
  });

  new cloudflare.QueueConsumer("ApiReminderQueueConsumer", {
    accountId: requireEnv("CLOUDFLARE_ACCOUNT_ID"),
    deadLetterQueue: queues.reminderDlq.nodes.queue.queueName,
    queueId: queues.reminder.nodes.queue.id,
    scriptName: worker.nodes.worker.scriptName,
    type: "worker",
    settings: {
      batchSize: 10,
      maxConcurrency: 4,
      maxRetries: 5,
      retryDelay: 60,
    },
  });

  new cloudflare.WorkersCronTrigger("ApiDailyCron", {
    accountId: requireEnv("CLOUDFLARE_ACCOUNT_ID"),
    scriptName: worker.nodes.worker.scriptName,
    schedules: [{ cron: DAILY_CRON }],
  });

  return worker;
}

export type ApiResources = ReturnType<typeof createApi>;
