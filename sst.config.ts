/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "acme",
      home: "cloudflare",
      providers: {
        cloudflare: "6.18.0",
      },
      removal: input?.stage === "prod" ? "retain" : "remove",
    };
  },
  async run() {
    const { createStorage } = await import("./infra/storage");
    const { createQueues } = await import("./infra/queue");
    const { createApi } = await import("./infra/api");

    const storage = createStorage();
    const queues = createQueues();
    const api = createApi({ storage, queues });

    return {
      apiUrl: api.url,
      d1DatabaseName: storage.databaseName,
      d1DatabaseId: storage.database.databaseId,
      r2BucketName: storage.bucket.name,
      queueName: queues.reminder.nodes.queue.queueName,
      dlqName: queues.reminderDlq.nodes.queue.queueName,
    };
  },
});
