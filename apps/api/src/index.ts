import { createApp } from "./app";
import type { Env } from "./env";
import { handleQueueBatch } from "./queue";
import { handleScheduled } from "./scheduled";

const app = createApp();

export default {
  fetch: app.fetch,
  queue(batch, env, ctx) {
    ctx.waitUntil(handleQueueBatch(env, batch));
  },
  scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(env, event));
  },
} satisfies ExportedHandler<Env>;
