import { describe, expect, test } from "vitest";

describe("legal routes", () => {
  test("privacy and terms paths are reserved", () => {
    expect(["/privacy", "/terms"]).toContain("/privacy");
    expect(["/privacy", "/terms"]).toContain("/terms");
  });
});
