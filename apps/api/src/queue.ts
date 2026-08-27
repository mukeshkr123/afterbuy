import { eq } from "drizzle-orm";
import {
  createDbClient,
  receipts,
  reminders,
  purchases,
  devices,
  claims,
  users,
  accountDeletionJobs,
  reminderDeliveries,
  idempotencyKeys,
} from "@acme/db";
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
        } else if ("type" in payload && payload.type === "account.delete") {
          const jobId = (payload as any).jobId;
          const userId = (payload as any).userId;
          const clerkUserId = (payload as any).clerkUserId;
          if (jobId && userId) {
            await handleAccountDeletion(env, jobId, userId, clerkUserId);
          }
        } else if ("type" in payload && payload.type === "reminder.send") {
          const reminderId = (payload as any).reminderId;
          const userId = (payload as any).userId;
          if (reminderId && userId) {
            await handleSendReminder(env, reminderId, userId);
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
          msg.ack();
        } catch (dlqErr) {
          console.error("Failed to send message to DLQ:", dlqErr);
          msg.retry({ delaySeconds: 60 });
        }
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

async function handleAccountDeletion(
  env: Env,
  jobId: string,
  userId: string,
  clerkUserId: string
): Promise<void> {
  const db = createDbClient(env.DB);
  const now = new Date().toISOString();

  await db
    .update(accountDeletionJobs)
    .set({ status: "processing", updatedAt: now })
    .where(eq(accountDeletionJobs.id, jobId));

  try {
    await handlePurgeReceipts(env, userId);

    await db
      .delete(reminderDeliveries)
      .where(eq(reminderDeliveries.userId, userId));
    await db.delete(idempotencyKeys).where(eq(idempotencyKeys.userId, userId));
    await db.delete(claims).where(eq(claims.userId, userId));
    await db.delete(reminders).where(eq(reminders.userId, userId));
    await db.delete(purchases).where(eq(purchases.userId, userId));
    await db.delete(devices).where(eq(devices.userId, userId));
    if (clerkUserId) {
      await env.APP_KV.delete(`user:by-clerk-id:${clerkUserId}`);
    }

    if (env.CLERK_SECRET_KEY && clerkUserId) {
      try {
        const clerkRes = await fetch(
          `https://api.clerk.com/v1/users/${clerkUserId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${env.CLERK_SECRET_KEY}`,
            },
          }
        );
        if (!clerkRes.ok && clerkRes.status !== 404) {
          console.error(`Clerk user deletion returned ${clerkRes.status}`);
        }
      } catch (clerkErr) {
        console.error("Failed to delete Clerk user identity:", clerkErr);
      }
    }

    await db.delete(users).where(eq(users.id, userId));
    await db
      .delete(accountDeletionJobs)
      .where(eq(accountDeletionJobs.id, jobId));
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await db
      .update(accountDeletionJobs)
      .set({
        status: "failed",
        lastError: errorMsg,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(accountDeletionJobs.id, jobId));
    throw err;
  }
}

async function handleSendReminder(
  env: Env,
  reminderId: string,
  userId: string
): Promise<void> {
  const db = createDbClient(env.DB);

  const reminderRow = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, reminderId))
    .get();

  if (
    !reminderRow ||
    reminderRow.sentAt !== null ||
    reminderRow.dismissedAt !== null
  ) {
    return;
  }

  const purchaseRow = await db
    .select()
    .from(purchases)
    .where(eq(purchases.id, reminderRow.purchaseId))
    .get();

  if (!purchaseRow || purchaseRow.deletedAt !== null) {
    return;
  }

  const userDevices = await db
    .select()
    .from(devices)
    .where(eq(devices.userId, userId));

  if (userDevices.length === 0) {
    // Stamp sent_at even if no devices registered, to avoid stuck reminders
    await db
      .update(reminders)
      .set({ sentAt: new Date().toISOString() })
      .where(eq(reminders.id, reminderId));
    return;
  }

  // Batch tokens up to 100 per Expo request (though typically much fewer per user)
  const expoMessages = userDevices.map((d) => ({
    to: d.expoPushToken,
    title:
      reminderRow.kind === "return_deadline"
        ? "Return deadline approaching!"
        : "Warranty expiring soon!",
    body:
      reminderRow.kind === "return_deadline"
        ? `Your return window for "${purchaseRow.title}" expires on ${purchaseRow.returnDeadlineAt}.`
        : `The warranty for "${purchaseRow.title}" expires on ${purchaseRow.warrantyExpiresAt}.`,
    data: {
      purchaseId: purchaseRow.id,
      reminderId: reminderRow.id,
    },
  }));

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify(expoMessages),
  });

  if (!res.ok) {
    throw new Error(
      `Expo push API returned status ${res.status}: ${await res.text()}`
    );
  }

  const result = (await res.json()) as any;
  if (result && Array.isArray(result.data)) {
    for (let i = 0; i < result.data.length; i++) {
      const ticket = result.data[i];
      const device = userDevices[i];
      if (!device) continue;
      if (ticket.status === "error") {
        console.error(
          `Expo push error for token "${device.expoPushToken}":`,
          ticket.message
        );
        if (ticket.details?.error === "DeviceNotRegistered") {
          // Prune invalid token
          await db.delete(devices).where(eq(devices.id, device.id));
        }
      }
    }
  }

  await db
    .update(reminders)
    .set({ sentAt: new Date().toISOString() })
    .where(eq(reminders.id, reminderId));
}
