import { readFileSync, statSync } from "node:fs";
import { globSync } from "node:fs";

const files = globSync("{infra,sst.config.ts,apps/**/wrangler.jsonc}", {
  withFileTypes: false,
}).filter((file) => statSync(file).isFile());

const hex32 = /(?<!0)[0-9a-f]{32}(?!0)/i;
const databaseId =
  /database_id"\s*:\s*"(?!00000000-0000-0000-0000-000000000000)[0-9a-f-]{36}/i;

const failures = files.filter((file) => {
  const source = readFileSync(file, "utf8")
    .replaceAll("00000000000000000000000000000000", "")
    .replaceAll("00000000-0000-0000-0000-000000000000", "");
  return hex32.test(source) || databaseId.test(source);
});

if (failures.length > 0) {
  throw new Error(
    `Possible hardcoded Cloudflare IDs found: ${failures.join(", ")}`
  );
}

console.log("No hardcoded Cloudflare IDs found");
