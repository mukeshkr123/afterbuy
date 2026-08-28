import { and, eq, isNull, lt, gt, asc } from "drizzle-orm";
import {
  createDbClient,
  reminders,
  users,
  purchases,
  idempotencyKeys,
} from "@acme/db";
import type { Env } from "./env";

type ScheduledEventLike = Pick<ScheduledEvent, "cron" | "scheduledTime">;

export async function handleScheduled(
  env: Env,
  event: ScheduledEventLike
): Promise<void> {
  const phases = [
    {
      name: "daily-maintenance",
      cron: env.DAILY_CRON_EXPRESSION,
      run: () =>
        env.APP_KV.put("last-maintenance", String(event.scheduledTime)),
    },
    {
      name: "heartbeat",
      cron: env.DAILY_CRON_EXPRESSION,
      run: () => env.APP_KV.put("last-heartbeat", new Date().toISOString()),
    },
    {
      name: "prune-idempotency-keys",
      cron: env.DAILY_CRON_EXPRESSION,
      run: async () => {
        const db = createDbClient(env.DB);
        await db
          .delete(idempotencyKeys)
          .where(lt(idempotencyKeys.expiresAt, new Date().toISOString()));
      },
    },
    {
      name: "scan-reminders",
      cron: env.DAILY_CRON_EXPRESSION,
      run: () => scanAndQueueReminders(env),
    },
  ];

  for (const phase of phases) {
    if (event.cron !== phase.cron) {
      continue;
    }

    try {
      await phase.run();
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          phase: phase.name,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
  }
}

async function scanAndQueueReminders(env: Env): Promise<void> {
  const db = createDbClient(env.DB);
  const now = new Date();

  const LIMIT = 100;
  let lastId: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const conditions = [
      isNull(reminders.sentAt),
      isNull(reminders.dismissedAt),
      eq(users.pushEnabled, 1),
      isNull(users.deletedAt),
      isNull(purchases.deletedAt),
    ];
    if (lastId) {
      conditions.push(gt(reminders.id, lastId));
    }

    const activeReminders = await db
      .select({
        reminder: reminders,
        user: users,
      })
      .from(reminders)
      .innerJoin(users, eq(reminders.userId, users.id))
      .innerJoin(purchases, eq(reminders.purchaseId, purchases.id))
      .where(and(...conditions))
      .orderBy(asc(reminders.id))
      .limit(LIMIT);

    if (activeReminders.length === 0) {
      break;
    }

    for (const item of activeReminders) {
      const userTz = item.user.timezone || "UTC";
      let userLocalDateStr: string;

      try {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: userTz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const parts = formatter.formatToParts(now);
        const y = parts.find((p) => p.type === "year")!.value;
        const m = parts.find((p) => p.type === "month")!.value;
        const d = parts.find((p) => p.type === "day")!.value;
        userLocalDateStr = `${y}-${m}-${d}`;
      } catch (err) {
        console.error(
          `Invalid timezone "${userTz}" for user ${item.user.id}, falling back to UTC`,
          err
        );
        userLocalDateStr = now.toISOString().slice(0, 10);
      }

      // Timezone-aware rolling window scan
      if (userLocalDateStr >= item.reminder.fireOn) {
        try {
          await env.REMINDER_QUEUE.send({
            type: "reminder.send",
            reminderId: item.reminder.id,
            userId: item.user.id,
          });
        } catch (queueErr) {
          console.error(
            `Failed to enqueue reminder ${item.reminder.id}:`,
            queueErr
          );
        }
      }
    }

    const lastItem = activeReminders[activeReminders.length - 1];
    if (lastItem) {
      lastId = lastItem.reminder.id;
    }

    if (activeReminders.length < LIMIT) {
      hasMore = false;
    }
  }
}
