export interface ReorderedSql {
  schema: string[];
  inserts: string[];
  trailing: string[];
}

const transactionControl = /^(BEGIN|COMMIT|SAVEPOINT|RELEASE|ROLLBACK)\b/i;
const createTable = /^CREATE TABLE [`"]?([^`"\s(]+)[`"]?/i;
const insertInto = /^INSERT INTO [`"]?([^`"\s(]+)[`"]?/i;
const references = /REFERENCES\s+[`"]?([^`"\s(]+)[`"]?/gi;

export function reorderD1Export(sql: string): string {
  const parsed = splitSql(sql);
  const orderedTables = orderTablesByForeignKeys(parsed.schema);
  const orderedInserts = orderInserts(parsed.inserts, orderedTables);

  return [...parsed.schema, ...orderedInserts, ...parsed.trailing]
    .filter((statement) => !transactionControl.test(statement.trim()))
    .join("\n\n")
    .concat("\n");
}

export function splitSql(sql: string): ReorderedSql {
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) => `${statement};`);

  const schema: string[] = [];
  const inserts: string[] = [];
  const trailing: string[] = [];

  for (const statement of statements) {
    const trimmed = statement.trim();
    if (transactionControl.test(trimmed)) {
      continue;
    }
    if (createTable.test(trimmed)) {
      schema.push(statement);
    } else if (insertInto.test(trimmed)) {
      inserts.push(statement);
    } else {
      trailing.push(statement);
    }
  }

  return { schema, inserts, trailing };
}

function orderTablesByForeignKeys(schemaStatements: string[]): string[] {
  const deps = new Map<string, Set<string>>();

  for (const statement of schemaStatements) {
    const table = createTable.exec(statement)?.[1];
    if (!table) {
      continue;
    }
    const tableDeps = new Set<string>();
    for (const match of statement.matchAll(references)) {
      if (match[1] && match[1] !== table) {
        tableDeps.add(match[1]);
      }
    }
    deps.set(table, tableDeps);
  }

  const ordered: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(table: string): void {
    if (visited.has(table)) {
      return;
    }
    if (visiting.has(table)) {
      ordered.push(table);
      visited.add(table);
      return;
    }
    visiting.add(table);
    for (const dep of deps.get(table) ?? []) {
      visit(dep);
    }
    visiting.delete(table);
    visited.add(table);
    ordered.push(table);
  }

  for (const table of deps.keys()) {
    visit(table);
  }

  return ordered;
}

function orderInserts(inserts: string[], orderedTables: string[]): string[] {
  const byTable = new Map<string, string[]>();
  const unknown: string[] = [];

  for (const statement of inserts) {
    const table = insertInto.exec(statement)?.[1];
    if (!table) {
      unknown.push(statement);
      continue;
    }
    const statements = byTable.get(table) ?? [];
    statements.push(statement);
    byTable.set(table, statements);
  }

  return [
    ...orderedTables.flatMap((table) => byTable.get(table) ?? []),
    ...unknown,
  ];
}
