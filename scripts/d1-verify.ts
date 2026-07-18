import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const createTable = /^CREATE TABLE [`"]?([^`"\s(]+)[`"]?/i;
const insertInto = /^INSERT INTO [`"]?([^`"\s(]+)[`"]?/i;

export interface RestoreVerificationPlan {
  tableCounts: Record<string, number>;
  insertChecksums: Record<string, string>;
  verificationSql: string;
}

export function createRestoreVerificationPlan(
  sql: string
): RestoreVerificationPlan {
  const statements = statementsFrom(sql);
  const tables = statements
    .map((statement) => createTable.exec(statement)?.[1])
    .filter((table): table is string => Boolean(table));

  const inserts = new Map<string, string[]>();
  for (const statement of statements) {
    const table = insertInto.exec(statement)?.[1];
    if (!table) {
      continue;
    }
    const current = inserts.get(table) ?? [];
    current.push(statement);
    inserts.set(table, current);
  }

  const tableCounts = Object.fromEntries(
    tables.map((table) => [table, inserts.get(table)?.length ?? 0])
  );

  const insertChecksums = Object.fromEntries(
    tables.map((table) => [
      table,
      checksum([...(inserts.get(table) ?? [])].sort().join("\n")),
    ])
  );

  return {
    tableCounts,
    insertChecksums,
    verificationSql: tables
      .map(
        (table) =>
          `SELECT '${table}' AS table_name, COUNT(*) AS row_count FROM \`${table}\`;`
      )
      .join("\n"),
  };
}

export function compareTableCounts(
  expected: Record<string, number>,
  actual: Record<string, number>
): string[] {
  return Object.entries(expected)
    .filter(([table, count]) => actual[table] !== count)
    .map(
      ([table, count]) =>
        `${table}: expected ${count}, got ${actual[table] ?? "<missing>"}`
    );
}

function statementsFrom(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) => `${statement};`);
}

function checksum(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const input = process.argv[2];
  if (!input) {
    throw new Error("Usage: tsx scripts/d1-verify.ts <backup.sql>");
  }

  const plan = createRestoreVerificationPlan(readFileSync(input, "utf8"));
  writeFileSync(`${input}.verify.sql`, `${plan.verificationSql}\n`);
  writeFileSync(`${input}.verify.json`, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`Wrote ${input}.verify.sql and ${input}.verify.json`);
}
