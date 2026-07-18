import { describe, expect, test } from "vitest";
import { exampleJobs } from "../src/schema";

describe("db schema", () => {
  test("keeps example job table name stable", () => {
    expect(exampleJobs[Symbol.for("drizzle:Name")]).toBe("example_jobs");
  });
});
