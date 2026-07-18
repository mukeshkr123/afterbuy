import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export interface TemplateCheckFailure {
  check: string;
  detail: string;
}

export function verifyTemplate(root = process.cwd()): TemplateCheckFailure[] {
  const failures: TemplateCheckFailure[] = [];
  const pkg = JSON.parse(read(root, "package.json")) as {
    devDependencies?: Record<string, string>;
  };
  const sstConfig = read(root, "sst.config.ts");
  const infraEnv = read(root, "infra/env.ts");
  const apiWrangler = read(root, "apps/api/wrangler.jsonc");
  const readme = read(root, "README.md");
  const claude = read(root, "CLAUDE.md");

  const provider = /providers:\s*{[\s\S]*?cloudflare:\s*"([^"]+)"/.exec(
    sstConfig
  )?.[1];
  const pulumi = pkg.devDependencies?.["@pulumi/cloudflare"];
  if (!provider || provider !== pulumi) {
    failures.push({
      check: "provider-pin-sync",
      detail: `sst.config.ts provider ${provider ?? "<missing>"} does not match @pulumi/cloudflare ${pulumi ?? "<missing>"}`,
    });
  }

  const compatibility = /COMPATIBILITY_DATE\s*=\s*"([^"]+)"/.exec(
    infraEnv
  )?.[1];
  const wranglerCompatibility = /"compatibility_date":\s*"([^"]+)"/.exec(
    apiWrangler
  )?.[1];
  if (!compatibility || compatibility !== wranglerCompatibility) {
    failures.push({
      check: "compatibility-date-sync",
      detail: `infra/env.ts ${compatibility ?? "<missing>"} does not match wrangler ${wranglerCompatibility ?? "<missing>"}`,
    });
  }

  if (!/name:\s*"acme"/.test(sstConfig)) {
    failures.push({
      check: "slug",
      detail: 'SST app name must remain exactly "acme".',
    });
  }

  const forbidden = /\b(opts\.import|retainOnDelete|ignoreChanges)\b/;
  const guardedFiles = [
    ...globSync("infra/**/*.{ts,tsx}", { cwd: root, withFileTypes: false }),
    "sst.config.ts",
  ];
  for (const file of guardedFiles) {
    if (forbidden.test(read(root, file))) {
      failures.push({
        check: "state-drift-band-aid",
        detail: `${file} uses import/retain/ignoreChanges drift controls.`,
      });
    }
  }

  if (!apiWrangler.includes("00000000-0000-0000-0000-000000000000")) {
    failures.push({
      check: "wrangler-placeholder-d1",
      detail: "apps/api/wrangler.jsonc must contain only placeholder D1 IDs.",
    });
  }

  for (const section of [
    "Local Development",
    "First Deploy",
    "GitHub Production Values",
    "Moving Cloudflare Accounts",
  ]) {
    if (!readme.includes(section)) {
      failures.push({
        check: "readme-section",
        detail: `README.md is missing ${section}.`,
      });
    }
  }

  for (const phrase of [
    "No Hardcoded Infrastructure IDs",
    "State Drift",
    "Provider Pinning",
    "GitHub Environments",
  ]) {
    if (!claude.includes(phrase)) {
      failures.push({
        check: "claude-guardrail",
        detail: `CLAUDE.md is missing ${phrase}.`,
      });
    }
  }

  return failures;
}

function read(root: string, file: string): string {
  return readFileSync(join(root, file), "utf8");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const failures = verifyTemplate();
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`${failure.check}: ${failure.detail}`);
    }
    process.exit(1);
  }
  console.log("Template verification passed");
}
