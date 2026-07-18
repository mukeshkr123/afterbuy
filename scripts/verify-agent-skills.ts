import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { EXPECTED_AGENT_SKILLS } from "./agent-skills-manifest.js";

const root = process.cwd();
const skillsDir = join(root, "agent-skills");
const failures: string[] = [];

if (!existsSync(skillsDir)) {
  failures.push("agent-skills/ is missing.");
} else {
  const actual = readdirSync(skillsDir)
    .filter((entry) => statSync(join(skillsDir, entry)).isDirectory())
    .sort();

  const expected = [...EXPECTED_AGENT_SKILLS].sort();
  const expectedSet = new Set<string>(expected);
  const missing = expected.filter((skill) => !actual.includes(skill));
  const unexpected = actual.filter((skill) => !expectedSet.has(skill));

  for (const skill of missing) {
    failures.push(`Missing vendored agent skill: ${skill}`);
  }

  for (const skill of unexpected) {
    failures.push(`Unexpected vendored agent skill: ${skill}`);
  }

  for (const skill of actual) {
    const skillFile = join(skillsDir, skill, "SKILL.md");
    if (!existsSync(skillFile)) {
      failures.push(`${skill} is missing SKILL.md`);
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}

console.log(`Vendored agent skills verified (${EXPECTED_AGENT_SKILLS.length})`);
