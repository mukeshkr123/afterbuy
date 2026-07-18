import { describe, expect, test, vi } from "vitest";
import type { Env } from "../src/env";
import { handleQueueBatch } from "../src/queue";

function env(): Env {
  return {
    DB: {} as D1Database,
    STORAGE: {} as R2Bucket,
    APP_KV: {
      put: vi.fn(async () => undefined),
    } as unknown as KVNamespace,
    EXAMPLE_QUEUE: {
      send: vi.fn(async () => undefined),
    } as unknown as Queue,
    EXAMPLE_DLQ: {
      send: vi.fn(async () => undefined),
    } as unknown as Queue,
    ALLOWED_ORIGINS: "https://example.com",
    APP_STAGE: "test",
    EXAMPLE_QUEUE_NAME: "acme-test-example-queue",
    EXAMPLE_DLQ_NAME: "acme-test-example-dlq",
    DAILY_CRON_EXPRESSION: "0 2 * * *",
    REQUIRED_RUNTIME_TOKEN: "set",
    OPTIONAL_WEBHOOK_SECRET: "set",
    RATE_LIMIT_ENABLED: "true",
    RATE_LIMIT_WINDOW_SECONDS: "60",
    RATE_LIMIT_MAX_REQUESTS: "60",
  };
}

describe("queue dispatch", () => {
  test("dispatches by live queue name from env", async () => {
    const ack = vi.fn();
    await handleQueueBatch(env(), {
      queue: "acme-test-example-queue",
      messages: [
        {
          body: {
            id: crypto.randomUUID(),
            message: "hello",
            requestedAt: new Date().toISOString(),
          },
          attempts: 0,
          retry: vi.fn(),
          ack,
        },
      ],
    });

    expect(ack).toHaveBeenCalledOnce();
  });

  test("moves malformed messages to the DLQ after retry ceiling", async () => {
    const testEnv = env();
    const ack = vi.fn();
    await handleQueueBatch(testEnv, {
      queue: "acme-test-example-queue",
      messages: [{ body: { nope: true }, attempts: 5, retry: vi.fn(), ack }],
    });

    expect(testEnv.EXAMPLE_DLQ.send).toHaveBeenCalledWith({ nope: true });
    expect(ack).toHaveBeenCalledOnce();
  });
});
