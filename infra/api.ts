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
  const apiToken = new sst.Secret("RuntimeApiToken");

  const worker = new sst.cloudflare.Worker("ApiWorker", {
    handler: "apps/api/src/index.ts",
    url: true,
    link: [
      storage.database,
      storage.bucket,
      storage.kv,
      queues.example,
      queues.exampleDlq,
      apiToken,
    ],
    environment: {
      ALLOWED_ORIGINS: optionalEnv("ALLOWED_ORIGINS"),
      APP_STAGE: $app.stage,
      EXAMPLE_QUEUE_NAME: queues.example.nodes.queue.queueName,
      EXAMPLE_DLQ_NAME: queues.exampleDlq.nodes.queue.queueName,
      DAILY_CRON_EXPRESSION: DAILY_CRON,
      REQUIRED_RUNTIME_TOKEN: apiToken.value,
      OPTIONAL_WEBHOOK_SECRET: optionalEnv("OPTIONAL_WEBHOOK_SECRET"),
      RATE_LIMIT_ENABLED: optionalEnv("RATE_LIMIT_ENABLED", "true"),
      RATE_LIMIT_WINDOW_SECONDS: optionalEnv("RATE_LIMIT_WINDOW_SECONDS", "60"),
      RATE_LIMIT_MAX_REQUESTS: optionalEnv("RATE_LIMIT_MAX_REQUESTS", "60"),
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

  new cloudflare.QueueConsumer("ApiExampleQueueConsumer", {
    accountId: requireEnv("CLOUDFLARE_ACCOUNT_ID"),
    deadLetterQueue: queues.exampleDlq.nodes.queue.queueName,
    queueId: queues.example.nodes.queue.id,
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
