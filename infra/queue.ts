import { resourceName } from "./env";

export function createQueues() {
  const exampleDlq = new sst.cloudflare.Queue("ExampleDlq", {
    transform: {
      queue(args) {
        args.queueName = resourceName("example-dlq");
      },
    },
  });

  const example = new sst.cloudflare.Queue("ExampleQueue", {
    transform: {
      queue(args) {
        args.queueName = resourceName("example-queue");
      },
    },
  });

  return {
    example,
    exampleDlq,
  };
}

export type QueueResources = ReturnType<typeof createQueues>;
