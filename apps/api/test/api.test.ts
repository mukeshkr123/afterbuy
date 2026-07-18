import { describe, expect, test } from "vitest";
import { createApp } from "../src/app";
import type { Env } from "../src/env";

function env(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    STORAGE: {} as R2Bucket,
    APP_KV: {
      put: async () => undefined,
    } as unknown as KVNamespace,
    EXAMPLE_QUEUE: {
      send: async () => undefined,
    } as unknown as Queue,
    EXAMPLE_DLQ: {
      send: async () => undefined,
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
    ...overrides,
  };
}

describe("api", () => {
  test("reports healthy when important config is present", async () => {
    const res = await createApp().request("/health", {}, env());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ status: "ok" });
  });

  test("reports degraded when optional config is missing", async () => {
    const res = await createApp().request(
      "/health",
      {},
      env({ OPTIONAL_WEBHOOK_SECRET: "" })
    );
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ status: "degraded" });
  });

  test("applies env-driven CORS", async () => {
    const res = await createApp().request(
      "/health",
      { headers: { origin: "https://example.com" } },
      env()
    );
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://example.com"
    );
  });

  test("serves OpenAPI for public routes", async () => {
    const res = await createApp().request("/openapi.json", {}, env());
    expect(res.status).toBe(200);
    const spec = await res.json();

    expect(spec.paths["/health"]).toBeDefined();
    expect(spec.paths["/jobs/example"]).toBeDefined();
  });

  test("rate limits the example producer route", async () => {
    const store = new Map<string, string>();
    const testEnv = env({
      RATE_LIMIT_MAX_REQUESTS: "1",
      APP_KV: {
        get: async (key: string) => store.get(key) ?? null,
        put: async (key: string, value: string) => {
          store.set(key, value);
        },
      } as unknown as KVNamespace,
    });

    const first = await createApp().request(
      "/jobs/example",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "hello" }),
      },
      testEnv
    );
    const second = await createApp().request(
      "/jobs/example",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "again" }),
      },
      testEnv
    );

    expect(first.status).toBe(202);
    expect(second.status).toBe(429);
  });
});
