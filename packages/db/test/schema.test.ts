import { describe, expect, test } from "vitest";
import { purchases } from "../src/schema";

describe("db schema", () => {
  test("keeps purchases table name stable", () => {
    expect(purchases[Symbol.for("drizzle:Name")]).toBe("purchases");
  });
});
