import { afterEach, describe, expect, test, vi } from "vitest";
import { getHealth } from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("web API client", () => {
  test("parses health responses with shared schemas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: "ok",
          stage: "test",
          requestId: "req-1",
          checks: {
            database: true,
            storage: true,
            queue: true,
            cors: true,
            optionalWebhookSecret: true,
          },
          degradedReasons: [],
        })
      )
    );

    await expect(getHealth()).resolves.toMatchObject({ status: "ok" });
  });
});
