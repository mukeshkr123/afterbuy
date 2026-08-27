import { eq, and, isNull } from "drizzle-orm";
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
import { z } from "zod";
import type { Env } from "./env";

const queueMessageSchema = z.union([
  z.object({
    type: z.literal("receipts.purge"),
    userId: z.string(),
  }),
  z.object({
    type: z.literal("account.delete"),
    jobId: z.string(),
    userId: z.string(),
    clerkUserId: z.string(),
  }),
  z.object({
    type: z.literal("reminder.send"),
    reminderId: z.string(),
    userId: z.string(),
  }),
  z.object({
    message: z.literal("hello"),
  }),
]);

const expoResponseSchema = z.object({
  data: z.array(
    z.union([
      z.object({
        status: z.literal("ok"),
        id: z.string().optional(),
      }),
      z.object({
        status: z.literal("error"),
        message: z.string().optional(),
        details: z
          .object({
            error: z.string().optional(),
          })
          .optional(),
      }),
    ])
  ),
});

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
      const payload = queueMessageSchema.parse(msg.body);
      if ("type" in payload) {
        if (payload.type === "receipts.purge") {
          await handlePurgeReceipts(env, payload.userId);
        } else if (payload.type === "account.delete") {
          await handleAccountDeletion(
            env,
            payload.jobId,
            payload.userId,
            payload.clerkUserId
          );
        } else if (payload.type === "reminder.send") {
          await handleSendReminder(env, payload.reminderId, payload.userId);
        }
      } else if ("message" in payload && payload.message === "hello") {
        // Allow legacy test message
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

    await db.batch([
      db
        .delete(reminderDeliveries)
        .where(eq(reminderDeliveries.userId, userId)),
      db.delete(idempotencyKeys).where(eq(idempotencyKeys.userId, userId)),
      db.delete(claims).where(eq(claims.userId, userId)),
      db.delete(reminders).where(eq(reminders.userId, userId)),
      db.delete(purchases).where(eq(purchases.userId, userId)),
      db.delete(devices).where(eq(devices.userId, userId)),
      db.delete(users).where(eq(users.id, userId)),
      db.delete(accountDeletionJobs).where(eq(accountDeletionJobs.id, jobId)),
    ]);

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
  const now = new Date().toISOString();

  // Atomically claim the reminder by updating sentAt only if it is currently null
  const updateResult = await db
    .update(reminders)
    .set({ sentAt: now })
    .where(
      and(
        eq(reminders.id, reminderId),
        isNull(reminders.sentAt),
        isNull(reminders.dismissedAt)
      )
    );

  if (updateResult.meta.changes === 0) {
    return;
  }

  const reminderRow = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, reminderId))
    .get();

  if (!reminderRow) {
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
    // Keep the claimed sentAt to avoid reprocessing, as no devices are registered
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

  try {
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

    const rawResult = await res.json();
    const result = expoResponseSchema.parse(rawResult);
    for (let i = 0; i < result.data.length; i++) {
      const ticket = result.data[i];
      const device = userDevices[i];
      if (!device || !ticket) continue;
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
  } catch (err) {
    // Revert sentAt to null to allow retry
    await db
      .update(reminders)
      .set({ sentAt: null })
      .where(eq(reminders.id, reminderId));
    throw err;
  }
}
