import { resourceName } from "./env";

export function createQueues() {
  const reminderDlq = new sst.cloudflare.Queue("ReminderDlq", {
    transform: {
      queue(args) {
        args.queueName = resourceName("reminder-dlq");
      },
    },
  });

  const reminder = new sst.cloudflare.Queue("ReminderQueue", {
    transform: {
      queue(args) {
        args.queueName = resourceName("reminder-queue");
      },
    },
  });

  return {
    reminder,
    reminderDlq,
  };
}

export type QueueResources = ReturnType<typeof createQueues>;
