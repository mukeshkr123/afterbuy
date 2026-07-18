import { cpSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { EXPECTED_AGENT_SKILLS } from "./agent-skills-manifest.js";

const root = process.cwd();
const sourceDir = join(root, "agent-skills");
const targetDir =
  process.env.AGENT_SKILLS_DIR ??
  process.env.CODEX_SKILLS_DIR ??
  join(homedir(), ".agents", "skills");

if (!existsSync(sourceDir)) {
  console.error("agent-skills/ is missing. Run from the repository root.");
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });

for (const skill of EXPECTED_AGENT_SKILLS) {
  const source = join(sourceDir, skill);
  const target = join(targetDir, skill);

  if (!existsSync(join(source, "SKILL.md"))) {
    console.error(`Cannot install ${skill}: missing ${source}/SKILL.md`);
    process.exit(1);
  }

  cpSync(source, target, {
    force: true,
    recursive: true,
  });
}

console.log(
  `Installed ${EXPECTED_AGENT_SKILLS.length} agent skills into ${targetDir}`
);
