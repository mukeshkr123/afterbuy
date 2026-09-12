import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export interface TemplateCheckFailure {
  check: string;
  detail: string;
}

export function verifyTemplate(root = process.cwd()): TemplateCheckFailure[] {
  const failures: TemplateCheckFailure[] = [];
  const productionWrangler = read(root, "wrangler.jsonc");
  const localWrangler = read(root, "apps/api/wrangler.jsonc");

  const productionDate = /"compatibility_date"\s*:\s*"([^"]+)"/.exec(
    productionWrangler
  )?.[1];
  const localDate = /"compatibility_date"\s*:\s*"([^"]+)"/.exec(
    localWrangler
  )?.[1];
  if (!productionDate || productionDate !== localDate) {
    failures.push({
      check: "compatibility-date-sync",
      detail: `root wrangler ${productionDate ?? "<missing>"} does not match local wrangler ${localDate ?? "<missing>"}`,
    });
  }

  if (!/"name"\s*:\s*"afterbuy"/.test(productionWrangler)) {
    failures.push({
      check: "production-worker-name",
      detail: 'Production Wrangler config must name the Worker "afterbuy".',
    });
  }

  if (/database_id|"id"\s*:/.test(productionWrangler)) {
    failures.push({
      check: "production-no-hardcoded-ids",
      detail:
        "Production Wrangler config must rely on automatic provisioning and contain no resource IDs.",
    });
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
