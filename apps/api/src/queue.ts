import { eq } from "drizzle-orm";
import { createDbClient, receipts } from "@acme/db";
import { retryPolicy } from "@acme/shared";
import type { Env } from "./env";

interface QueueMessage<T = unknown> {
  id: string;
  body: T;
  attempts: number;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}

interface QueueBatchLike {
  queue: string;
  messages: readonly QueueMessage<any>[];
}

export async function handleQueueBatch(
  env: Env,
  batch: QueueBatchLike
): Promise<void> {
  if (
    batch.queue !== env.REMINDER_QUEUE_NAME &&
    batch.queue !== env.REMINDER_DLQ_NAME
  ) {
    throw new Error(`No queue handler registered for ${batch.queue}`);
  }

  // If it's the DLQ itself, just log and ack
  if (batch.queue === env.REMINDER_DLQ_NAME) {
    for (const msg of batch.messages) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "DLQ message received",
          dlqBody: msg.body,
        })
      );
      msg.ack();
    }
    return;
  }

  for (const msg of batch.messages) {
    try {
      const payload = msg.body;
      if (payload && typeof payload === "object") {
        if ("type" in payload && payload.type === "receipts.purge") {
          const userId = (payload as any).userId;
          if (userId) {
            await handlePurgeReceipts(env, userId);
          }
        } else if (
          "message" in payload &&
          (payload as any).message === "hello"
        ) {
          // Allow legacy test message
        } else {
          throw new Error("Malformed or unknown queue message body");
        }
      } else {
        throw new Error("Invalid queue message payload");
      }
      msg.ack();
    } catch (err) {
      console.error(`Failed to process message ${msg.id}:`, err);

      if (msg.attempts >= retryPolicy.maxAttempts) {
        try {
          await env.REMINDER_DLQ.send(msg.body);
        } catch (dlqErr) {
          console.error("Failed to send message to DLQ:", dlqErr);
        }
        msg.ack();
        continue;
      }

      const delaySeconds = Math.min(
        retryPolicy.baseDelaySeconds * 2 ** msg.attempts,
        retryPolicy.maxDelaySeconds
      );
      msg.retry({ delaySeconds });
    }
  }
}

async function handlePurgeReceipts(env: Env, userId: string): Promise<void> {
  const db = createDbClient(env.DB);

  // 1. Delete all R2 objects for the user.
  const prefix = `receipts/${userId}/`;
  let truncated = true;
  let cursor: string | undefined;

  while (truncated) {
    const options: R2ListOptions = { prefix };
    if (cursor !== undefined) {
      options.cursor = cursor;
    }
    const listResult = await env.STORAGE.list(options);
    for (const obj of listResult.objects) {
      await env.STORAGE.delete(obj.key);
    }
    truncated = listResult.truncated;
    cursor = listResult.truncated ? listResult.cursor : undefined;
  }

  // 2. Delete rows from D1 database
  await db.delete(receipts).where(eq(receipts.userId, userId));
}
