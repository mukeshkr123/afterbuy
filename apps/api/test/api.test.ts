import { describe, expect, test } from "vitest";
import { createApp } from "../src/app";
import type { Env } from "../src/env";
import { checkRateLimit } from "../src/rate-limit";
import { requestApp } from "./test-helpers";

function env(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    STORAGE: {} as R2Bucket,
    APP_KV: {
      put: async () => undefined,
      get: async () => null,
    } as unknown as KVNamespace,
    REMINDER_QUEUE: {
      send: async () => undefined,
    } as unknown as Queue,
    REMINDER_DLQ: {
      send: async () => undefined,
    } as unknown as Queue,
    ALLOWED_ORIGINS: "https://example.com",
    APP_STAGE: "test",
    REMINDER_QUEUE_NAME: "acme-test-example-queue",
    REMINDER_DLQ_NAME: "acme-test-example-dlq",
    DAILY_CRON_EXPRESSION: "0 2 * * *",
    CLERK_ISSUER: "https://clerk.test",
    CLERK_JWKS_URL: "https://clerk.test/.well-known/jwks.json",
    CLERK_ALLOWED_AZP: "",
    CLERK_WEBHOOK_SECRET: "set",
    ...overrides,
  };
}

describe("api", () => {
  test("reports healthy when important config is present", async () => {
    const res = await createApp().request("/health", {}, env());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ status: "ok" });
  });

  test("reports degraded when webhook secret is missing", async () => {
    const res = await createApp().request(
      "/health",
      {},
      env({ CLERK_WEBHOOK_SECRET: "" })
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
    expect(spec.paths["/v1/me"]).toBeDefined();
    expect(spec.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
  });

  test("rate limits with env-driven limits", async () => {
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

    const first = await checkRateLimit(testEnv, "user:test");
    const second = await checkRateLimit(testEnv, "user:test");

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(0);
    expect(second.allowed).toBe(false);
    expect(second.remaining).toBe(0);
  });

  test("returns 401 with envelope shape when /v1/me is hit without auth and Clerk is configured", async () => {
    const res = await createApp().request(
      "/v1/me",
      {},
      env({
        CLERK_ISSUER: "https://clerk.test",
        CLERK_JWKS_URL: "https://clerk.test/jwks",
      })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("unauthenticated");
    expect(body.requestId).toBeTypeOf("string");
  });

  test("returns 503 when Clerk is not configured and /v1/me is hit", async () => {
    const res = await createApp().request(
      "/v1/me",
      {},
      env({ CLERK_ISSUER: "", CLERK_JWKS_URL: "" })
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("auth_not_configured");
  });

  test("replays identical idempotent writes and rejects key reuse for different bodies", async () => {
    const key = "11111111-1111-4111-8111-111111111111";
    const body = {
      title: "Idempotent Purchase",
      merchant: "AfterBuy",
      category: "electronics",
      purchaseDate: "2026-08-02",
      amountMinor: 1299,
      currency: "USD",
    };

    const first = await requestApp("/v1/purchases", "POST", body, {
      "Idempotency-Key": key,
    });
    expect(first.status).toBe(201);
    const firstJson = await first.json();

    const replay = await requestApp("/v1/purchases", "POST", body, {
      "Idempotency-Key": key,
    });
    expect(replay.status).toBe(201);
    await expect(replay.json()).resolves.toMatchObject({ id: firstJson.id });

    const conflict = await requestApp(
      "/v1/purchases",
      "POST",
      { ...body, title: "Different Purchase" },
      { "Idempotency-Key": key }
    );
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({
      error: { code: "conflict" },
    });
  });
});
