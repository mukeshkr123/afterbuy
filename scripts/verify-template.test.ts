import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { verifyTemplate } from "./verify-template";

describe("template verifier", () => {
  test("detects production Worker and compatibility mismatches", () => {
    const root = mkdtempSync(join(tmpdir(), "acme-template-"));
    mkdirSync(join(root, "apps/api"), { recursive: true });
    writeFileSync(
      join(root, "wrangler.jsonc"),
      '{ "name": "wrong-worker", "compatibility_date": "2026-01-01" }'
    );
    writeFileSync(
      join(root, "apps/api/wrangler.jsonc"),
      '{ "compatibility_date": "2026-02-02" }'
    );
    const failures = verifyTemplate(root).map((failure) => failure.check);
    expect(failures).toContain("production-worker-name");
    expect(failures).toContain("compatibility-date-sync");
  });
});
