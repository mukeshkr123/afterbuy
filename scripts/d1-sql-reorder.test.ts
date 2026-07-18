import { describe, expect, test } from "vitest";
import { reorderD1Export } from "./d1-sql-reorder";
import { compareTableCounts, createRestoreVerificationPlan } from "./d1-verify";

describe("D1 SQL restore reordering", () => {
  test("puts schema before inserts and orders inserts by FK dependencies", () => {
    const sql = `
BEGIN TRANSACTION;
CREATE TABLE child (id text primary key, parent_id text REFERENCES parent(id));
INSERT INTO child VALUES ('c1', 'p1');
CREATE TABLE parent (id text primary key);
INSERT INTO parent VALUES ('p1');
COMMIT;
`;

    const output = reorderD1Export(sql);

    expect(output).not.toContain("BEGIN");
    expect(output.indexOf("CREATE TABLE child")).toBeLessThan(
      output.indexOf("INSERT INTO parent")
    );
    expect(output.indexOf("INSERT INTO parent")).toBeLessThan(
      output.indexOf("INSERT INTO child")
    );
  });

  test("preserves original insert text verbatim", () => {
    const insert = "INSERT INTO parent VALUES (unistr('x'));";
    expect(
      reorderD1Export(`CREATE TABLE parent (id text);\n${insert}`)
    ).toContain(insert);
  });

  test("builds table-count verification plans", () => {
    const plan = createRestoreVerificationPlan(`
CREATE TABLE parent (id text);
INSERT INTO parent VALUES ('a');
INSERT INTO parent VALUES ('b');
`);

    expect(plan.tableCounts.parent).toBe(2);
    expect(plan.verificationSql).toContain("COUNT(*)");
    expect(compareTableCounts(plan.tableCounts, { parent: 1 })).toEqual([
      "parent: expected 2, got 1",
    ]);
  });
});
