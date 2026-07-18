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
    const { createWeb } = await import("./infra/web");

    const storage = createStorage();
    const queues = createQueues();
    const api = createApi({ storage, queues });
    const web = createWeb({ apiUrl: api.url });

    return {
      apiUrl: api.url,
      webUrl: web.url,
      d1DatabaseName: storage.databaseName,
      d1DatabaseId: storage.database.databaseId,
      r2BucketName: storage.bucket.name,
      queueName: queues.example.nodes.queue.queueName,
      dlqName: queues.exampleDlq.nodes.queue.queueName,
    };
  },
});
