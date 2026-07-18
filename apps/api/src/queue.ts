// Phase 4 reintroduces the reminder queue producer + consumer. Phase 2
// removes the demo example-job queue entirely; see docs/adr/0006.

import type { Env } from "./env";

interface QueueBatchLike {
  queue: string;
  messages: readonly unknown[];
}

export async function handleQueueBatch(
  env: Env,
  batch: QueueBatchLike
): Promise<void> {
  // Acknowledge all messages on the reminder queues by name. Phase 4
  // will route them to a real consumer.
  if (
    batch.queue === env.REMINDER_QUEUE_NAME ||
    batch.queue === env.REMINDER_DLQ_NAME
  ) {
    return;
  }
  throw new Error(`No queue handler registered for ${batch.queue}`);
}
