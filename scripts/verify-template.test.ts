import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { verifyTemplate } from "./verify-template";

describe("template verifier", () => {
  test("detects provider and compatibility mismatches", () => {
    const root = mkdtempSync(join(tmpdir(), "acme-template-"));
    mkdirSync(join(root, "infra"));
    mkdirSync(join(root, "apps/api"), { recursive: true });
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ devDependencies: { "@pulumi/cloudflare": "1.0.0" } })
    );
    writeFileSync(
      join(root, "sst.config.ts"),
      'export default { app: { name: "acme", providers: { cloudflare: "2.0.0" } } };'
    );
    writeFileSync(
      join(root, "infra/env.ts"),
      'COMPATIBILITY_DATE = "2026-01-01"'
    );
    writeFileSync(
      join(root, "apps/api/wrangler.jsonc"),
      '"compatibility_date": "2026-02-02"'
    );
    writeFileSync(join(root, "README.md"), "");
    writeFileSync(join(root, "CLAUDE.md"), "");

    const failures = verifyTemplate(root).map((failure) => failure.check);
    expect(failures).toContain("provider-pin-sync");
    expect(failures).toContain("compatibility-date-sync");
  });
});
