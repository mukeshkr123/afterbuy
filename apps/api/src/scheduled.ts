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
