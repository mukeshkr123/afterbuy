import { readFileSync, writeFileSync } from "node:fs";
import { reorderD1Export } from "./d1-sql-reorder";
import { createRestoreVerificationPlan } from "./d1-verify";

const input = process.argv[2];

if (!input) {
  throw new Error("Usage: pnpm db:restore-drill <backup.sql>");
}

const output = `${input}.drill.sql`;
const source = readFileSync(input, "utf8");
const verification = createRestoreVerificationPlan(source);
writeFileSync(output, reorderD1Export(source));
writeFileSync(`${input}.verify.sql`, `${verification.verificationSql}\n`);
writeFileSync(
  `${input}.verify.json`,
  `${JSON.stringify(verification, null, 2)}\n`
);
console.log(`Wrote reordered restore drill SQL to ${output}`);
console.log(`Wrote restore verification plan to ${input}.verify.json`);
