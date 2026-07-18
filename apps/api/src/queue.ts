import {
  exampleJobPayloadSchema,
  retryPolicy,
  type ExampleJobPayload,
} from "@acme/shared";
import type { Env } from "./env";

interface MessageLike {
  body: unknown;
  attempts: number;
  retry(options?: { delaySeconds?: number }): void;
  ack(): void;
}

interface QueueBatchLike {
  queue: string;
  messages: readonly MessageLike[];
}

export async function sendExampleJob(
  env: Env,
  message: string
): Promise<ExampleJobPayload> {
  const job = exampleJobPayloadSchema.parse({
    id: crypto.randomUUID(),
    message,
    requestedAt: new Date().toISOString(),
  });
  await env.EXAMPLE_QUEUE.send(job);
  return job;
}

export async function handleQueueBatch(
  env: Env,
  batch: QueueBatchLike
): Promise<void> {
  if (batch.queue === env.EXAMPLE_QUEUE_NAME) {
    await handleExampleQueue(env, batch.messages);
    return;
  }

  if (batch.queue === env.EXAMPLE_DLQ_NAME) {
    for (const message of batch.messages) {
      console.error(JSON.stringify({ level: "error", dlqBody: message.body }));
      message.ack();
    }
    return;
  }

  throw new Error(`No queue handler registered for ${batch.queue}`);
}

async function handleExampleQueue(
  env: Env,
  messages: readonly MessageLike[]
): Promise<void> {
  for (const message of messages) {
    try {
      const job = exampleJobPayloadSchema.parse(message.body);
      await env.APP_KV.put(`example-job:${job.id}`, JSON.stringify(job), {
        expirationTtl: 60 * 60 * 24,
      });
      message.ack();
    } catch (error) {
      if (message.attempts >= retryPolicy.maxAttempts) {
        await env.EXAMPLE_DLQ.send(message.body);
        message.ack();
        continue;
      }

      const delaySeconds = Math.min(
        retryPolicy.baseDelaySeconds * 2 ** message.attempts,
        retryPolicy.maxDelaySeconds
      );
      console.warn(
        JSON.stringify({
          level: "warn",
          message: "Retrying example queue message",
          attempts: message.attempts,
          delaySeconds,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );
      message.retry({ delaySeconds });
    }
  }
}
