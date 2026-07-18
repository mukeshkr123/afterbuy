import { describe, expect, test } from "vitest";
import {
  enqueueExampleJobRequestSchema,
  healthCheckResponseSchema,
} from "../src";

describe("shared schemas", () => {
  test("validates enqueue payloads", () => {
    expect(enqueueExampleJobRequestSchema.parse({ message: "hello" })).toEqual({
      message: "hello",
    });
  });

  test("validates degraded health responses", () => {
    const parsed = healthCheckResponseSchema.parse({
      status: "degraded",
      stage: "prod",
      requestId: "req-1",
      checks: {
        database: true,
        storage: true,
        queue: true,
        cors: false,
        optionalWebhookSecret: false,
      },
      degradedReasons: ["ALLOWED_ORIGINS is empty"],
    });

    expect(parsed.status).toBe("degraded");
  });
});
